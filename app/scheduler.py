"""
Celery-based scheduler for Facebook post publishing.

- schedule_facebook_post(db, content_id, meta_page_id, publish_time): creates ScheduledPost and
  enqueues publish_to_facebook_task to run at publish_time.
- publish_to_facebook_task(scheduled_post_id): Celery task that posts content to the page and
  updates status (PROCESSING -> POSTED or FAILED).

Requires Redis running and Celery worker: celery -A app.scheduler worker -l info
"""
from datetime import datetime, timezone

from celery import Celery
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.content import Content
from app.models.scheduled_post import ScheduledPost, ScheduledPostStatus
from app.models.meta_page import MetaPage
from app.services.facebook_pages_service import post_to_page_and_get_id
from app.services.audit_service import AuditService

celery_app = Celery(
    "fb_scheduler",
    broker=settings.celery_broker_url,
    backend=settings.celery_broker_url,
)
celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
)


def schedule_facebook_post(
    db: Session,
    content_id: int,
    meta_page_id: int,
    publish_time: datetime,
    user_id: int,
):
    """
    Create a ScheduledPost and enqueue a Celery task to publish at publish_time.
    Content must be APPROVED; page must belong to user.
    Returns ScheduledPost or None if validation fails.
    """
    from app.models.content import ContentStatus

    content = db.query(Content).filter(Content.id == content_id).first()
    if not content or content.status != ContentStatus.APPROVED:
        return None
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        return None
    sp = ScheduledPost(
        content_id=content_id,
        meta_page_id=meta_page_id,
        scheduled_at=publish_time if publish_time.tzinfo else publish_time.replace(tzinfo=timezone.utc),
        status=ScheduledPostStatus.PENDING,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)
    publish_to_facebook_task.apply_async(
        args=[sp.id],
        eta=publish_time if publish_time.tzinfo else publish_time.replace(tzinfo=timezone.utc),
    )
    return sp


@celery_app.task(
    bind=True, 
    name="app.publish_to_facebook_task",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 5},
    retry_jitter=True
)
def publish_to_facebook_task(self, scheduled_post_id: int):
    """
    Celery task: load ScheduledPost, set PROCESSING, post to Facebook via fb_api service.
    """
    from app.services.fb_api import publish_to_facebook
    
    db = SessionLocal()
    try:
        sp = db.query(ScheduledPost).filter(ScheduledPost.id == scheduled_post_id).first()
        if not sp:
            return {"ok": False, "reason": "ScheduledPost not found"}
        
        # If already posted or failed after retries, skip
        if sp.status in [ScheduledPostStatus.POSTED, ScheduledPostStatus.CANCELLED]:
            return {"ok": True, "status": sp.status.value}

        sp.status = ScheduledPostStatus.PROCESSING
        db.commit()

        try:
            # Use the unified publish_to_facebook service (handles text/media)
            publish_to_facebook(
                db=db,
                content_id=sp.content_id,
                meta_page_id=sp.meta_page_id,
                user_id=sp.meta_page.user_id,
            )
            
            sp.status = ScheduledPostStatus.POSTED
            sp.posted_at = datetime.now(timezone.utc)
            sp.failure_reason = None
            db.commit()
            return {"ok": True, "status": "posted"}
            
        except Exception as e:
            # Check if we should retry or if it's a fatal error
            # For now, let autoretry_for handle it, but update status on final failure
            if self.request.retries >= self.max_retries:
                sp.status = ScheduledPostStatus.FAILED
                sp.failure_reason = str(e)[:512]
                db.commit()
            else:
                # Keep as PROCESSING or PENDING for retry? 
                # Celery retry will re-run the task. Let's mark as PROCESSING for now.
                pass
            raise e # Reraise for celery retry
            
    finally:
        db.close()


@celery_app.task(name="app.token_guard_task")
def token_guard_task():
    """
    Periodic task: Check all MetaUserTokens for expiration and log warnings.
    """
    from app.models.meta_oauth import MetaUserToken
    from app.services.audit_service import AuditService
    from datetime import timedelta
    
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        warning_threshold = now + timedelta(days=7)
        
        tokens = db.query(MetaUserToken).all()
        results = {"checked": len(tokens), "warning": 0, "expired": 0}
        
        for t in tokens:
            if not t.expires_at:
                continue
                
            # Ensure expires_at is timezone-aware for comparison
            expires_at = t.expires_at
            if not expires_at.tzinfo:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
                
            if expires_at < now:
                results["expired"] += 1
                AuditService.log_action(
                    db, "token.expired", "user", t.user_id, t.user_id,
                    f"Meta access token for user {t.user_id} has expired.",
                    {"expires_at": expires_at.isoformat()}
                )
            elif expires_at < warning_threshold:
                results["warning"] += 1
                AuditService.log_action(
                    db, "token.warning", "user", t.user_id, t.user_id,
                    f"Meta access token for user {t.user_id} expires soon.",
                    {"expires_at": expires_at.isoformat()}
                )
        
        db.commit()
        return results
    finally:
        db.close()

# Periodic task schedule
celery_app.conf.beat_schedule = {
    "check-tokens-daily": {
        "task": "app.token_guard_task",
        "schedule": 86400.0, # 24 hours
    },
}

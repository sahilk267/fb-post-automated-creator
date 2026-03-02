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


@celery_app.task(bind=True, name="app.publish_to_facebook_task")
def publish_to_facebook_task(self, scheduled_post_id: int):
    """
    Celery task: load ScheduledPost, set PROCESSING, post to Facebook, set POSTED or FAILED.
    Updates Content.fb_page_id, fb_post_id, fb_status on success.
    """
    db = SessionLocal()
    try:
        sp = db.query(ScheduledPost).filter(ScheduledPost.id == scheduled_post_id).first()
        if not sp:
            return {"ok": False, "reason": "ScheduledPost not found"}
        if sp.status != ScheduledPostStatus.PENDING:
            return {"ok": False, "reason": f"Invalid status {sp.status}"}
        sp.status = ScheduledPostStatus.PROCESSING
        db.commit()

        content = db.query(Content).filter(Content.id == sp.content_id).first()
        page = db.query(MetaPage).filter(MetaPage.id == sp.meta_page_id).first()
        if not content:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = "Content not found"
            db.commit()
            return {"ok": False, "reason": "Content not found"}
        if not page:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = "Page not found"
            db.commit()
            return {"ok": False, "reason": "Page not found"}

        message = f"{content.title}\n\n{content.body}"
        now = datetime.now(timezone.utc)
        try:
            fb_post_id = post_to_page_and_get_id(db, sp.meta_page_id, page.user_id, message)
            sp.status = ScheduledPostStatus.POSTED
            sp.posted_at = now
            sp.failure_reason = None
            content.fb_page_id = page.page_id
            content.fb_post_id = fb_post_id or ""
            content.fb_status = "posted"
            AuditService.log_action(
                db, "scheduled_post.posted", "scheduled_post", sp.id, page.user_id,
                "Post published to Facebook page", {"content_id": content.id, "meta_page_id": sp.meta_page_id},
            )
            db.commit()
            return {"ok": True, "posted_at": now.isoformat()}
        except Exception as e:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = str(e)[:512]
            content.fb_status = "failed"
            content.fb_page_id = page.page_id
            AuditService.log_action(
                db, "scheduled_post.failed", "scheduled_post", sp.id, page.user_id,
                f"Scheduled post failed: {str(e)[:200]}", {"scheduled_post_id": sp.id},
            )
            db.commit()
            return {"ok": False, "reason": str(e)[:200]}
    finally:
        db.close()

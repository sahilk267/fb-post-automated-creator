"""Scheduler service: executes only user-scheduled posts; enforces safety limits."""
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.content import Content, ContentStatus
from app.models.meta_page import MetaPage
from app.models.scheduled_post import ScheduledPost, ScheduledPostStatus
from app.models.posting_preference import PostingPreference
from app.services.facebook_pages_service import post_to_page
from app.services.audit_service import AuditService

DEFAULT_COOLDOWN_MINUTES = 60
DEFAULT_MAX_POSTS_PER_DAY = 10


def create_scheduled_post(
    db: Session,
    content_id: int,
    meta_page_id: int,
    scheduled_at: datetime,
    user_id: int,
) -> Optional[ScheduledPost]:
    """
    Create a scheduled post. Content must be APPROVED; page must belong to user.
    Returns ScheduledPost or None if validation fails.
    """
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content or content.status != ContentStatus.APPROVED:
        return None
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        return None
    sp = ScheduledPost(
        content_id=content_id,
        meta_page_id=meta_page_id,
        scheduled_at=scheduled_at,
        status=ScheduledPostStatus.PENDING,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp


def get_scheduled_post(db: Session, scheduled_post_id: int, user_id: int) -> Optional[ScheduledPost]:
    """Get a scheduled post by id if it belongs to user's page. Returns None if not found/not owned."""
    return (
        db.query(ScheduledPost)
        .join(MetaPage, ScheduledPost.meta_page_id == MetaPage.id)
        .filter(ScheduledPost.id == scheduled_post_id, MetaPage.user_id == user_id)
        .first()
    )


def list_scheduled_posts(
    db: Session,
    user_id: int,
    status: Optional[ScheduledPostStatus] = None,
    meta_page_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[ScheduledPost]:
    """List scheduled posts for user's pages only."""
    q = (
        db.query(ScheduledPost)
        .join(MetaPage, ScheduledPost.meta_page_id == MetaPage.id)
        .filter(MetaPage.user_id == user_id)
    )
    if status is not None:
        q = q.filter(ScheduledPost.status == status)
    if meta_page_id is not None:
        q = q.filter(ScheduledPost.meta_page_id == meta_page_id)
    return q.order_by(ScheduledPost.scheduled_at.desc()).offset(skip).limit(limit).all()


def set_posting_preference(
    db: Session,
    meta_page_id: int,
    user_id: int,
    cooldown_minutes: int = DEFAULT_COOLDOWN_MINUTES,
    max_posts_per_day: int = DEFAULT_MAX_POSTS_PER_DAY,
):
    """Create or update posting preference for a page (safety limits). Page must belong to user."""
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        return None
    pref = db.query(PostingPreference).filter(PostingPreference.meta_page_id == meta_page_id).first()
    if pref:
        pref.cooldown_minutes = cooldown_minutes
        pref.max_posts_per_day = max_posts_per_day
    else:
        pref = PostingPreference(
            meta_page_id=meta_page_id,
            cooldown_minutes=cooldown_minutes,
            max_posts_per_day=max_posts_per_day,
        )
        db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def get_posting_preference(db: Session, meta_page_id: int, user_id: int):
    """Get posting preference for a page if it belongs to user. Returns None if no preference or not owned."""
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        return None
    return db.query(PostingPreference).filter(PostingPreference.meta_page_id == meta_page_id).first()


def cancel_scheduled_post(db: Session, scheduled_post_id: int, user_id: int) -> bool:
    """Cancel a PENDING scheduled post if owned by user. Returns True if cancelled."""
    sp = (
        db.query(ScheduledPost)
        .join(MetaPage, ScheduledPost.meta_page_id == MetaPage.id)
        .filter(ScheduledPost.id == scheduled_post_id, MetaPage.user_id == user_id)
        .first()
    )
    if not sp or sp.status != ScheduledPostStatus.PENDING:
        return False
    sp.status = ScheduledPostStatus.CANCELLED
    db.commit()
    return True


def _get_preference(db: Session, meta_page_id: int) -> tuple[int, int]:
    """Return (cooldown_minutes, max_posts_per_day) for page; defaults if no preference."""
    pref = db.query(PostingPreference).filter(PostingPreference.meta_page_id == meta_page_id).first()
    if pref:
        return pref.cooldown_minutes, pref.max_posts_per_day
    return DEFAULT_COOLDOWN_MINUTES, DEFAULT_MAX_POSTS_PER_DAY


def _check_cooldown(db: Session, meta_page_id: int, now: datetime) -> bool:
    """True if last post on this page was at least cooldown_minutes ago (or no posts)."""
    cooldown_min, _ = _get_preference(db, meta_page_id)
    last = (
        db.query(ScheduledPost)
        .filter(
            ScheduledPost.meta_page_id == meta_page_id,
            ScheduledPost.status == ScheduledPostStatus.POSTED,
            ScheduledPost.posted_at.isnot(None),
        )
        .order_by(ScheduledPost.posted_at.desc())
        .first()
    )
    if not last or not last.posted_at:
        return True
    return (now - last.posted_at.replace(tzinfo=timezone.utc)).total_seconds() >= cooldown_min * 60


def _check_max_per_day(db: Session, meta_page_id: int, day_start: datetime) -> bool:
    """True if posts today on this page are below max_posts_per_day."""
    _, max_per_day = _get_preference(db, meta_page_id)
    day_end = day_start + timedelta(days=1)
    count = (
        db.query(ScheduledPost)
        .filter(
            ScheduledPost.meta_page_id == meta_page_id,
            ScheduledPost.status == ScheduledPostStatus.POSTED,
            ScheduledPost.posted_at >= day_start,
            ScheduledPost.posted_at < day_end,
        )
        .count()
    )
    return count < max_per_day


def process_due_posts(db: Session) -> dict:
    """
    Find PENDING scheduled posts with scheduled_at <= now; enforce cooldown/max per day; post to FB.
    Returns {"posted": n, "failed": n, "skipped": n}.
    """
    now = datetime.now(timezone.utc)
    due = (
        db.query(ScheduledPost)
        .filter(
            ScheduledPost.status == ScheduledPostStatus.PENDING,
            ScheduledPost.scheduled_at <= now,
        )
        .order_by(ScheduledPost.scheduled_at)
        .all()
    )
    posted = 0
    failed = 0
    skipped = 0
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for sp in due:
        if not _check_cooldown(db, sp.meta_page_id, now):
            skipped += 1
            continue
        if not _check_max_per_day(db, sp.meta_page_id, day_start):
            skipped += 1
            continue
        content = db.query(Content).filter(Content.id == sp.content_id).first()
        if not content:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = "Content not found"
            AuditService.log_action(
                db, "scheduled_post.failed", "scheduled_post", sp.id, None,
                "Scheduled post failed: content not found", {"scheduled_post_id": sp.id},
            )
            failed += 1
            db.commit()
            continue
        page = db.query(MetaPage).filter(MetaPage.id == sp.meta_page_id).first()
        if not page:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = "Page not found"
            AuditService.log_action(
                db, "scheduled_post.failed", "scheduled_post", sp.id, None,
                "Scheduled post failed: page not found", {"scheduled_post_id": sp.id},
            )
            failed += 1
            db.commit()
            continue
        try:
            post_to_page(db, sp.meta_page_id, page.user_id, content.body)
            sp.status = ScheduledPostStatus.POSTED
            sp.posted_at = now
            sp.failure_reason = None
            AuditService.log_action(
                db, "scheduled_post.posted", "scheduled_post", sp.id, page.user_id,
                "Post published to Facebook page", {"content_id": content.id, "meta_page_id": sp.meta_page_id},
            )
            posted += 1
        except Exception as e:
            sp.status = ScheduledPostStatus.FAILED
            sp.failure_reason = str(e)[:512]
            AuditService.log_action(
                db, "scheduled_post.failed", "scheduled_post", sp.id, page.user_id,
                f"Scheduled post failed: {str(e)[:200]}", {"scheduled_post_id": sp.id},
            )
            failed += 1
        db.commit()
    return {"posted": posted, "failed": failed, "skipped": skipped}

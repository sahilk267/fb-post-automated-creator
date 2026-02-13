"""Scheduled posts API: create, list, get, cancel. Scheduler executes only these."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.scheduled_post import ScheduledPostStatus
from app.schemas.scheduled_post import (
    ScheduledPostCreate,
    ScheduledPostResponse,
    PostingPreferenceCreate,
    PostingPreferenceResponse,
)
from app.services.scheduler_service import (
    create_scheduled_post,
    get_scheduled_post,
    list_scheduled_posts,
    cancel_scheduled_post,
    set_posting_preference,
    get_posting_preference,
)

router = APIRouter()


@router.post("/", response_model=ScheduledPostResponse, status_code=status.HTTP_201_CREATED)
def schedule_post(
    data: ScheduledPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Schedule approved content to be posted to a page at a given time. User must own the page."""
    sp = create_scheduled_post(
        db,
        content_id=data.content_id,
        meta_page_id=data.meta_page_id,
        scheduled_at=data.scheduled_at,
        user_id=current_user.id,
    )
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content must be APPROVED and page must belong to you",
        )
    return sp


@router.get("/", response_model=List[ScheduledPostResponse])
def list_user_scheduled_posts(
    status_filter: Optional[ScheduledPostStatus] = Query(None, alias="status"),
    meta_page_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List scheduled posts for the current user's pages."""
    posts = list_scheduled_posts(
        db,
        user_id=current_user.id,
        status=status_filter,
        meta_page_id=meta_page_id,
        skip=skip,
        limit=limit,
    )
    return posts


# Posting preferences (safety limits per page) — define before /{id} to avoid path conflict
@router.put("/preferences/{meta_page_id}", response_model=PostingPreferenceResponse)
def update_posting_preference(
    meta_page_id: int,
    data: PostingPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set posting preference (cooldown, max per day) for a page. User must own the page."""
    pref = set_posting_preference(
        db,
        meta_page_id=meta_page_id,
        user_id=current_user.id,
        cooldown_minutes=data.cooldown_minutes,
        max_posts_per_day=data.max_posts_per_day,
    )
    if not pref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return pref


@router.get("/preferences/{meta_page_id}", response_model=PostingPreferenceResponse)
def get_page_posting_preference(
    meta_page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get posting preference for a page. Use PUT to set if none exists."""
    pref = get_posting_preference(db, meta_page_id, current_user.id)
    if pref is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found or no preference")
    return pref


@router.get("/{scheduled_post_id}", response_model=ScheduledPostResponse)
def get_scheduled_post_by_id(
    scheduled_post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a scheduled post by ID if it belongs to the current user's page."""
    sp = get_scheduled_post(db, scheduled_post_id, current_user.id)
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled post not found")
    return sp


@router.patch("/{scheduled_post_id}/cancel")
def cancel_post(
    scheduled_post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a PENDING scheduled post if it belongs to the current user."""
    ok = cancel_scheduled_post(db, scheduled_post_id, current_user.id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled post not found or not PENDING",
        )
    return {"cancelled": True}

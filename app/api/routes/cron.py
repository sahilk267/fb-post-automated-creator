"""Cron endpoint: process due scheduled posts. Protected by CRON_SECRET (server-side only)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.scheduler_service import process_due_posts

router = APIRouter()


@router.post("/run")
def run_cron(
    secret: str = Query(..., description="Cron secret (CRON_SECRET env)"),
    db: Session = Depends(get_db),
):
    """
    Process due scheduled posts: find PENDING posts with scheduled_at <= now,
    enforce cooldown/max per day, post to Facebook. Call from cron job only.
    """
    if not settings.cron_secret or secret != settings.cron_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid cron secret")
    result = process_due_posts(db)
    return result

"""Meta/Facebook Pages API: list and sync pages; no tokens in response."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.meta_page import MetaPageResponse
from app.services.facebook_pages_service import sync_pages, list_pages
from app.services.recommendation_service import get_posting_recommendations

router = APIRouter()


@router.get("/", response_model=list[MetaPageResponse])
def list_user_pages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List Facebook pages connected for the current user. No tokens in response."""
    pages = list_pages(db, current_user.id)
    return pages


@router.post("/sync")
def sync_user_pages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch pages from Meta (/me/accounts) and store encrypted. Returns count synced."""
    try:
        count = sync_pages(db, current_user.id)
        return {"synced": count}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{meta_page_id}/recommendations")
def get_page_recommendations(
    meta_page_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get advisory posting recommendations for a page (time windows, category×time, frequency). All suggestions are advisory only; user decides."""
    result = get_posting_recommendations(db, meta_page_id, current_user.id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return result

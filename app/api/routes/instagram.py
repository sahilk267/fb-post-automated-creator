"""Instagram publishing API route."""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


class InstagramPublishRequest(BaseModel):
    content_id: int
    meta_page_id: int
    image_url: str


class InstagramPublishResponse(BaseModel):
    ig_media_id: str


@router.post("/publish", response_model=InstagramPublishResponse, status_code=status.HTTP_200_OK)
def publish_to_instagram_endpoint(
    body: InstagramPublishRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Publish an image post to the Instagram Business Account linked to a Facebook Page.

    Steps:
      1. Looks up the Facebook Page the user owns.
      2. Fetches the linked Instagram Business Account via Graph API.
      3. Creates an Instagram media container (image_url + caption).
      4. Publishes the container and returns the Instagram media ID.

    Requires the Facebook Page to have a linked Instagram Business Account.
    """
    from app.services.fb_api import publish_to_instagram
    try:
        result = publish_to_instagram(
            db=db,
            content_id=body.content_id,
            meta_page_id=body.meta_page_id,
            user_id=current_user.id,
            image_url=body.image_url,
        )
        return InstagramPublishResponse(ig_media_id=result["ig_media_id"] or "")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

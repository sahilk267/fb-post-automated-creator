"""Content API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.content import ContentStatus
from app.schemas.content import (
    ContentCreate,
    ContentUpdate,
    ContentResponse,
    ContentApprovalRequest,
    PublishToFacebookRequest,
)
from app.services.content_service import ContentService
from app.services.fb_api import publish_to_facebook

router = APIRouter()


@router.post("/", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
def create_content(
    content_data: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new content."""
    service = ContentService(db)
    try:
        content = service.create_content(content_data, current_user.id)
        if content.media:
            from app.services.media_service import MediaService
            media_service = MediaService(db)
            content.media.url = media_service.get_public_url(content.media)
        return content
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=List[ContentResponse])
def list_content(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List content with optional filters."""
    service = ContentService(db)
    
    content_status = None
    if status_filter:
        try:
            # Accept enum value (e.g. "approved") or name (e.g. "APPROVED")
            try:
                content_status = ContentStatus(status_filter)
            except ValueError:
                content_status = ContentStatus[status_filter.upper()]
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    # Non-admins see only their own content; admins see all
    filter_user_id = None if current_user.is_admin else current_user.id
    content_list = service.list_content(
        skip=skip,
        limit=limit,
        status=content_status,
        user_id=filter_user_id,
    )

    # Populate media URLs
    media_service = None
    for content in content_list:
        if content.media:
            if media_service is None:
                from app.services.media_service import MediaService
                media_service = MediaService(db)
            content.media.url = media_service.get_public_url(content.media)
            
    return content_list


@router.get("/{content_id}", response_model=ContentResponse)
def get_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get content by ID."""
    service = ContentService(db)
    content = service.get_content(content_id)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Populate media URL if exists
    if content.media:
        from app.services.media_service import MediaService
        media_service = MediaService(db)
        content.media.url = media_service.get_public_url(content.media)
        
    return content


@router.patch("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    content_data: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update content (only draft content)."""
    service = ContentService(db)
    try:
        content = service.update_content(content_id, content_data, current_user.id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )
        return content
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{content_id}/submit", response_model=ContentResponse)
def submit_for_approval(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit content for approval."""
    service = ContentService(db)
    try:
        content = service.submit_for_approval(content_id, current_user.id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )
        return content
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{content_id}/approve", response_model=ContentResponse)
def approve_content(
    content_id: int,
    approval_data: ContentApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject content (requires admin)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can approve/reject content"
        )
    
    service = ContentService(db)
    try:
        content = service.approve_content(content_id, approval_data, current_user.id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )
        return content
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{content_id}/publish-to-facebook", response_model=ContentResponse)
def publish_content_to_facebook(
    content_id: int,
    body: PublishToFacebookRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publish content to a Facebook Page. Updates content with fb_page_id, fb_post_id, fb_status."""
    try:
        content = publish_to_facebook(db, content_id, body.meta_page_id, current_user.id)
        return content
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete content (only draft content)."""
    service = ContentService(db)
    try:
        success = service.delete_content(content_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


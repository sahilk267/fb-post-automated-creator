"""Media service — handles media DB records and delegates file I/O to StorageProvider."""
import os
import uuid
from typing import Optional, List
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.media import Media
from app.services.storage import get_storage_provider


class MediaService:
    """Service for handling media file uploads and storage."""
    
    def __init__(self, db: Session):
        self.db = db
        self.storage = get_storage_provider()

    def _verify_org_access(self, user_id: int, org_id: Optional[int]):
        """Verify that user has access to the organization if specified."""
        if org_id is None:
            return  # Media without organization remains private to user
        from app.models.organization import OrganizationMember
        exists = self.db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id
        ).first()
        if not exists:
            raise ValueError(f"User does not have access to organization {org_id}")

    def save_upload(self, upload_file: UploadFile, user_id: int, organization_id: Optional[int] = None) -> Media:
        """
        Save an uploaded file via StorageProvider and create a Media record.
        """
        if organization_id:
            self._verify_org_access(user_id, organization_id)
            
        # Create a unique filename to avoid collisions
        ext = os.path.splitext(upload_file.filename or "")[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Delegate file saving to the storage provider
        stored_path = self.storage.save(upload_file, unique_filename)
        
        # Get file size (works for local files; for cloud, size may not be available)
        try:
            file_size = os.path.getsize(stored_path)
        except (OSError, TypeError):
            file_size = 0
        
        # Create DB record
        media = Media(
            filename=upload_file.filename,
            stored_path=stored_path,
            mime_type=upload_file.content_type or "application/octet-stream",
            file_size=file_size,
            user_id=user_id,
            organization_id=organization_id
        )
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        
        return media

    def get_media(self, media_id: int) -> Optional[Media]:
        """Get media by ID."""
        return self.db.query(Media).filter(Media.id == media_id).first()

    def list_media(self, user_id: int, organization_id: Optional[int] = None) -> List[Media]:
        """List media with organization filtering."""
        query = self.db.query(Media)
        if organization_id:
            query = query.filter(Media.organization_id == organization_id)
        else:
            query = query.filter(Media.user_id == user_id)
        return query.all()

    def get_public_url(self, media: Media) -> str:
        """Generate a public URL for the media file via its storage provider."""
        return self.storage.get_public_url(media.stored_path)

"""Media service."""
import os
import shutil
import uuid
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.media import Media

# Media storage directory
MEDIA_DIR = "/app/data/media"


class MediaService:
    """Service for handling media file uploads and storage."""
    
    def __init__(self, db: Session):
        self.db = db
        # Ensure media directory exists
        if not os.path.exists(MEDIA_DIR):
            os.makedirs(MEDIA_DIR, exist_ok=True)

    def save_upload(self, upload_file: UploadFile, user_id: int) -> Media:
        """
        Save an uploaded file to disk and create a Media record.
        """
        # Create a unique filename to avoid collisions
        ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        stored_path = os.path.join(MEDIA_DIR, unique_filename)
        
        # Save to disk
        with open(stored_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(stored_path)
        
        # Create DB record
        media = Media(
            filename=upload_file.filename,
            stored_path=stored_path,
            mime_type=upload_file.content_type or "application/octet-stream",
            file_size=file_size,
            user_id=user_id
        )
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        
        return media

    def get_media(self, media_id: int) -> Optional[Media]:
        """Get media by ID."""
        return self.db.query(Media).filter(Media.id == media_id).first()

    def get_user_media(self, user_id: int) -> list[Media]:
        """Get all media for a specific user."""
        return self.db.query(Media).filter(Media.user_id == user_id).all()

    @staticmethod
    def get_public_url(media: Media) -> str:
        """Generate a relative public URL for the media file."""
        # This assumes /media is mounted as a static directory in FastAPI
        filename = os.path.basename(media.stored_path)
        return f"/media/{filename}"

"""S3-ready storage abstraction for media files.

Provides a StorageProvider interface with two implementations:
  - LocalStorageProvider: saves files to the local filesystem (default).
  - GoogleDriveStorageProvider: saves files to Google Drive (activated via STORAGE_BACKEND=gdrive).

Usage:
    from app.services.storage import get_storage_provider
    provider = get_storage_provider()
    stored_path = provider.save(upload_file, "unique_filename.jpg")
    url = provider.get_public_url("unique_filename.jpg")
"""
import os
import shutil
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings

# Resolve media dir from project root (cross-platform)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = str(_PROJECT_ROOT / settings.media_dir)


class StorageProvider(ABC):
    """Abstract storage provider interface."""

    @abstractmethod
    def save(self, upload_file: UploadFile, unique_filename: str) -> str:
        """Save a file and return the stored path/key."""

    @abstractmethod
    def get_public_url(self, stored_path_or_key: str) -> str:
        """Return the public-facing URL for a stored file."""

    @abstractmethod
    def delete(self, stored_path_or_key: str) -> None:
        """Delete a stored file."""


class LocalStorageProvider(StorageProvider):
    """Saves files to the local filesystem."""

    def __init__(self, media_dir: str = MEDIA_DIR):
        self.media_dir = media_dir
        os.makedirs(self.media_dir, exist_ok=True)

    def save(self, upload_file: UploadFile, unique_filename: str) -> str:
        stored_path = os.path.join(self.media_dir, unique_filename)
        with open(stored_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return stored_path

    def get_public_url(self, stored_path_or_key: str) -> str:
        filename = os.path.basename(stored_path_or_key)
        return f"/media/{filename}"

    def delete(self, stored_path_or_key: str) -> None:
        if os.path.exists(stored_path_or_key):
            os.remove(stored_path_or_key)


class GoogleDriveStorageProvider(StorageProvider):
    """Saves files to Google Drive. Requires google-api-python-client."""

    def __init__(self):
        try:
            import json
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaIoBaseUpload

            self.folder_id = settings.google_drive_folder_id
            creds_data = settings.google_drive_credentials_json
            
            if not creds_data:
                raise ValueError("GOOGLE_DRIVE_CREDENTIALS_JSON must be set for gdrive storage.")

            # Handle both JSON string and file path
            if creds_data.strip().startswith("{"):
                info = json.loads(creds_data)
                self.creds = service_account.Credentials.from_service_account_info(info)
            else:
                self.creds = service_account.Credentials.from_service_account_file(creds_data)

            self.service = build("drive", "v3", credentials=self.creds)
            self.MediaIoBaseUpload = MediaIoBaseUpload
        except ImportError:
            raise RuntimeError("google-api-python-client is required. Run: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")

    def save(self, upload_file: UploadFile, unique_filename: str) -> str:
        file_metadata = {
            "name": unique_filename,
            "parents": [self.folder_id] if self.folder_id else []
        }
        media = self.MediaIoBaseUpload(
            upload_file.file, 
            mimetype=upload_file.content_type or "application/octet-stream",
            resumable=True
        )
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id"
        ).execute()

        file_id = file.get("id")
        
        # Make file public so it can be viewed by anyone with the link
        try:
            self.service.permissions().create(
                fileId=file_id,
                body={"type": "anyone", "role": "reader"}
            ).execute()
        except Exception:
            pass  # Non-critical: preview may not work if not public

        return file_id

    def get_public_url(self, stored_path_or_key: str) -> str:
        return f"https://drive.google.com/uc?id={stored_path_or_key}&export=download"

    def delete(self, stored_path_or_key: str) -> None:
        try:
            self.service.files().delete(fileId=stored_path_or_key).execute()
        except Exception:
            pass


def get_storage_provider() -> StorageProvider:
    """Factory: returns the appropriate storage provider based on STORAGE_BACKEND setting."""
    if settings.storage_backend == "gdrive":
        return GoogleDriveStorageProvider()
    return LocalStorageProvider()

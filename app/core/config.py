"""Application configuration using Pydantic settings."""
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Content Automation Platform"
    app_version: str = "1.0.1"
    debug: bool = False
    
    # Database
    database_url: str = "sqlite:///./content_platform.db"
    
    # API
    api_prefix: str = "/api/v1"
    
    # Meta/Facebook OAuth (single App for entire SaaS; from env only)
    facebook_app_id: Optional[str] = None
    facebook_app_secret: Optional[str] = None
    facebook_redirect_uri: Optional[str] = None
    token_encryption_key: Optional[str] = None  # For encrypting tokens at rest (e.g. 32-byte base64)
    cron_secret: Optional[str] = None  # Secret for cron/run endpoint (server-side only)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

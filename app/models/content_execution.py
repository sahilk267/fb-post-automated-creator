"""Content execution and tracking models."""
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base

class PublishStatusEnum(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    POSTED = "posted"
    FAILED = "failed"

class ContentPublishStatus(Base):
    """Tracks the publishing status of a single piece of content to a specific target (Meta Page, LinkedIn, etc.)."""
    __tablename__ = "content_publish_status"
    
    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(Integer, ForeignKey("content.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Platform targets
    meta_page_id = Column(Integer, ForeignKey("meta_pages.id", ondelete="CASCADE"), nullable=True, index=True)
    linkedin_account_id = Column(Integer, ForeignKey("linkedin_accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    
    status = Column(Enum(PublishStatusEnum), default=PublishStatusEnum.PENDING, nullable=False)
    platform_post_id = Column(String(128), nullable=True) # ID of the post on the external platform
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    content = relationship("Content", back_populates="publish_statuses")
    meta_page = relationship("MetaPage", backref="publish_statuses")
    linkedin_account = relationship("LinkedInAccount", backref="publish_statuses")

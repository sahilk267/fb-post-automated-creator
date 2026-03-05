"""Content model."""
from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class ContentStatus(str, enum.Enum):
    """Content approval status."""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"


class Content(Base):
    """Content model for posts/articles."""
    
    __tablename__ = "content"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    body = Column(Text, nullable=False)
    status = Column(Enum(ContentStatus), default=ContentStatus.DRAFT, nullable=False, index=True)
    
    # Relationships
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Facebook: page and post ids after publishing; fb_status: "scheduled" | "posted" | "failed"
    fb_page_id = Column(String(64), nullable=True, index=True)
    fb_post_id = Column(String(128), nullable=True)
    fb_status = Column(String(32), nullable=True)  # "scheduled", "posted", "failed"

    schedule_at = Column(DateTime(timezone=True), nullable=True)
    schedule_meta_page_id = Column(Integer, ForeignKey("meta_pages.id"), nullable=True, index=True)

    # Media association
    media_id = Column(Integer, ForeignKey("media.id"), nullable=True, index=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by_id], backref="created_content")
    approver = relationship("User", foreign_keys=[approved_by_id], backref="approved_content")
    media = relationship("Media", foreign_keys=[media_id], backref="content_items")


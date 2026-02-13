"""Posting preferences per page: safety limits only (cooldown, max per day)."""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class PostingPreference(Base):
    """Per-page safety limits; user chooses within these. One row per page."""
    __tablename__ = "posting_preferences"

    id = Column(Integer, primary_key=True, index=True)
    meta_page_id = Column(Integer, ForeignKey("meta_pages.id"), nullable=False, unique=True, index=True)
    cooldown_minutes = Column(Integer, default=60, nullable=False)  # Min interval between posts
    max_posts_per_day = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    meta_page = relationship("MetaPage", backref="posting_preference", uselist=False)

"""Pydantic schemas for content."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ContentBase(BaseModel):
    """Base content schema."""
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)


class ContentCreate(ContentBase):
    """Schema for creating content."""
    schedule_at: Optional[datetime] = Field(None, description="Optional: when to publish (UTC); used after approval")
    schedule_meta_page_id: Optional[int] = Field(None, description="Optional: page to publish to when schedule_at is set")
    media_id: Optional[int] = Field(None, description="Optional: associated media file ID")


class ContentUpdate(BaseModel):
    """Schema for updating content."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = Field(None, min_length=1)
    media_id: Optional[int] = Field(None, description="Optional: new media ID")


class ContentResponse(ContentBase):
    """Schema for content response."""
    id: int
    status: str
    created_by_id: int
    approved_by_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    approved_at: Optional[datetime]
    fb_page_id: Optional[str] = None
    fb_post_id: Optional[str] = None
    fb_status: Optional[str] = None  # "scheduled", "posted", "failed"
    schedule_at: Optional[datetime] = None
    schedule_meta_page_id: Optional[int] = None
    media_id: Optional[int] = None

    class Config:
        from_attributes = True


class ContentApprovalRequest(BaseModel):
    """Schema for approval/rejection request."""
    approved: bool
    comment: Optional[str] = None


class PublishToFacebookRequest(BaseModel):
    """Schema for publishing content to a Facebook Page."""
    meta_page_id: int


class InsightsResponse(BaseModel):
    """Schema for post insights response."""
    reach: int
    engagement: int


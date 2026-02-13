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
    pass


class ContentUpdate(BaseModel):
    """Schema for updating content."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = Field(None, min_length=1)


class ContentResponse(ContentBase):
    """Schema for content response."""
    id: int
    status: str
    created_by_id: int
    approved_by_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    approved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ContentApprovalRequest(BaseModel):
    """Schema for approval/rejection request."""
    approved: bool
    comment: Optional[str] = None


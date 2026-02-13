"""Pydantic schemas for audit logs."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    user_id: Optional[int]
    description: Optional[str]
    extra_data: Optional[Dict[str, Any]] = Field(None, serialization_alias="metadata")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


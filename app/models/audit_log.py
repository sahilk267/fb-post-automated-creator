"""Audit log model for tracking all system actions."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    """Audit log for tracking all important actions."""
    
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Action details
    action = Column(String, nullable=False, index=True)  # e.g., "content.created", "content.approved"
    entity_type = Column(String, nullable=False, index=True)  # e.g., "content", "user"
    entity_id = Column(Integer, nullable=True, index=True)
    
    # User who performed the action
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Additional context
    description = Column(Text, nullable=True)
    extra_data = Column("metadata", JSON, nullable=True)  # Store additional structured data (avoid reserved 'metadata')
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationship
    user = relationship("User", backref="audit_logs")


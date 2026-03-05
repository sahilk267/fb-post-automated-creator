"""Media model."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Media(Base):
    """Model for uploaded media files (images/videos)."""
    
    __tablename__ = "media"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    stored_path = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=False)
    file_size = Column(Integer, nullable=False)
    
    # Ownership
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User", backref="media")

    def __repr__(self):
        return f"<Media(id={self.id}, filename='{self.filename}', mime_type='{self.mime_type}')>"

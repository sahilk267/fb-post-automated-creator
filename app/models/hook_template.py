"""Hook-based templates for Viral Content Engine; placeholders {hook}, {body}, {cta} (advisory)."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class HookTemplate(Base):
    """Template with placeholders for hook, body, CTA; optional link to category for suggestion."""
    __tablename__ = "hook_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    body_template = Column(Text, nullable=False)  # e.g. "{hook}\n\n{body}\n\n{cta}"
    default_hook = Column(String(512), nullable=True)
    default_cta = Column(String(256), nullable=True)
    category_id = Column(Integer, ForeignKey("content_categories.id"), nullable=True, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("ContentCategory", backref="templates")

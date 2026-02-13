"""Content management service."""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models.content import Content, ContentStatus
from app.schemas.content import ContentCreate, ContentUpdate, ContentApprovalRequest
from app.services.audit_service import AuditService


class ContentService:
    """Service for content management and approval workflow."""
    
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService()
    
    def create_content(self, content_data: ContentCreate, user_id: int) -> Content:
        """
        Create new content in draft status.
        
        Creates content and audit log in single atomic transaction.
        """
        content = Content(
            title=content_data.title,
            body=content_data.body,
            status=ContentStatus.DRAFT,
            created_by_id=user_id
        )
        self.db.add(content)
        # Flush to get content.id for audit log
        self.db.flush()
        
        # Audit log (added to same transaction)
        self.audit.log_action(
            db=self.db,
            action="content.created",
            entity_type="content",
            entity_id=content.id,
            user_id=user_id,
            description=f"Content '{content.title}' created",
            metadata={"title": content.title, "status": content.status.value}
        )
        
        # Single commit for both content and audit log (atomic transaction)
        self.db.commit()
        self.db.refresh(content)
        
        return content
    
    def get_content(self, content_id: int) -> Optional[Content]:
        """Get content by ID."""
        return self.db.query(Content).filter(Content.id == content_id).first()
    
    def list_content(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ContentStatus] = None,
        user_id: Optional[int] = None
    ) -> List[Content]:
        """List content with optional filters."""
        query = self.db.query(Content)
        
        if status:
            query = query.filter(Content.status == status)
        if user_id:
            query = query.filter(Content.created_by_id == user_id)
        
        return query.offset(skip).limit(limit).all()
    
    def update_content(
        self,
        content_id: int,
        content_data: ContentUpdate,
        user_id: int
    ) -> Optional[Content]:
        """Update content (only if in draft status)."""
        content = self.get_content(content_id)
        if not content:
            return None
        
        # Only allow updates to draft content
        if content.status != ContentStatus.DRAFT:
            raise ValueError("Only draft content can be updated")
        
        update_data = content_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(content, field, value)
        
        # Audit log (added to same transaction)
        self.audit.log_action(
            db=self.db,
            action="content.updated",
            entity_type="content",
            entity_id=content.id,
            user_id=user_id,
            description=f"Content '{content.title}' updated",
            metadata={"updated_fields": list(update_data.keys())}
        )
        
        # Single commit for both content update and audit log (atomic transaction)
        self.db.commit()
        self.db.refresh(content)
        
        return content
    
    def submit_for_approval(self, content_id: int, user_id: int) -> Optional[Content]:
        """Submit content for approval."""
        content = self.get_content(content_id)
        if not content:
            return None
        
        if content.status != ContentStatus.DRAFT:
            raise ValueError("Only draft content can be submitted for approval")
        
        content.status = ContentStatus.PENDING_APPROVAL
        
        # Audit log (added to same transaction)
        self.audit.log_action(
            db=self.db,
            action="content.submitted",
            entity_type="content",
            entity_id=content.id,
            user_id=user_id,
            description=f"Content '{content.title}' submitted for approval"
        )
        
        # Single commit for both status change and audit log (atomic transaction)
        self.db.commit()
        self.db.refresh(content)
        
        return content
    
    def approve_content(
        self,
        content_id: int,
        approval_data: ContentApprovalRequest,
        approver_id: int
    ) -> Optional[Content]:
        """Approve or reject content."""
        content = self.get_content(content_id)
        if not content:
            return None
        
        if content.status != ContentStatus.PENDING_APPROVAL:
            raise ValueError("Only pending content can be approved/rejected")
        
        if approval_data.approved:
            content.status = ContentStatus.APPROVED
            content.approved_by_id = approver_id
            content.approved_at = datetime.utcnow()
            action = "content.approved"
            description = f"Content '{content.title}' approved"
        else:
            content.status = ContentStatus.REJECTED
            content.approved_by_id = approver_id
            action = "content.rejected"
            description = f"Content '{content.title}' rejected"
        
        # Audit log (added to same transaction)
        self.audit.log_action(
            db=self.db,
            action=action,
            entity_type="content",
            entity_id=content.id,
            user_id=approver_id,
            description=description,
            metadata={"comment": approval_data.comment}
        )
        
        # Single commit for both approval/rejection and audit log (atomic transaction)
        self.db.commit()
        self.db.refresh(content)
        
        return content
    
    def delete_content(self, content_id: int, user_id: int) -> bool:
        """Delete content (only if in draft status)."""
        content = self.get_content(content_id)
        if not content:
            return False
        
        if content.status != ContentStatus.DRAFT:
            raise ValueError("Only draft content can be deleted")
        
        # Audit log before deletion (added to same transaction)
        self.audit.log_action(
            db=self.db,
            action="content.deleted",
            entity_type="content",
            entity_id=content.id,
            user_id=user_id,
            description=f"Content '{content.title}' deleted",
            metadata={"title": content.title}
        )
        
        self.db.delete(content)
        # Single commit for both audit log and deletion (atomic transaction)
        self.db.commit()
        return True


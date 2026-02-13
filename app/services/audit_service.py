"""Audit logging service."""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.models.audit_log import AuditLog


class AuditService:
    """Service for creating audit log entries."""
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Note: This method adds the audit log to the session but does NOT commit.
        The calling service must commit the transaction to ensure atomicity.
        
        Args:
            db: Database session
            action: Action performed (e.g., "content.created")
            entity_type: Type of entity (e.g., "content")
            entity_id: ID of the entity
            user_id: ID of user who performed the action
            description: Human-readable description
            metadata: Additional structured data
            
        Returns:
            AuditLog instance (not yet committed)
        """
        audit_log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            description=description,
            extra_data=metadata
        )
        db.add(audit_log)
        # NOTE: Do NOT commit here - let calling service commit for atomic transaction
        return audit_log


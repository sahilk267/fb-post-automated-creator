"""API dependencies."""
from fastapi import Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


def get_current_user(
    user_id: int = Query(1, description="User ID (simplified auth - use JWT in production)"),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user (simplified for now).
    In production, extract from JWT token or session.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    return user


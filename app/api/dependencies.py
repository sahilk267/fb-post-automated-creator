"""API dependencies: authentication, database."""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_prefix}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    """Validate token and return current user."""
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Validate current user is an active admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user


def check_maintenance_mode(
    request: Request,
    db: Session = Depends(get_db),
):
    """Check if site is in maintenance mode and block access to most routes."""
    from app.services.settings_service import SettingsService
    service = SettingsService(db)
    
    if service.is_maintenance_mode():
        path = request.url.path
        # Only allow auth and admin settings (prefix-based, not substring)
        allowed_prefixes = [
            f"{settings.api_prefix}/auth/",
            f"{settings.api_prefix}/admin/settings",
        ]
        if any(path.startswith(p) for p in allowed_prefixes):
            return True
            
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="System is currently undergoing maintenance. Please try again later."
        )
    return True


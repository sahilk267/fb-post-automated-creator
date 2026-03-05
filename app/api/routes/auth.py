"""Authentication routes: login, signup."""
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import dependencies as deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models import user as models
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.services.audit_service import AuditService

router = APIRouter()


@router.post("/signup", response_model=UserResponse)
def signup(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """Create new user."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this username already exists.",
        )
    
    # First user is admin
    is_admin = db.query(User).count() == 0
    
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=security.get_password_hash(user_in.password),
        is_admin=is_admin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    AuditService.log_action(
        db,
        action="user.registered",
        entity_type="user",
        entity_id=new_user.id,
        user_id=new_user.id,
        description=f"User registered: {new_user.username}",
    )
    
    return new_user


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """OAuth2 compatible token login, get an access token for future requests."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    AuditService.log_action(
        db,
        action="user.login",
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
        description=f"User logged in: {user.username}",
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(current_user: models.User = Depends(deps.get_current_user)):
    """Logout current user."""
    return {"msg": "Successfully logged out"}

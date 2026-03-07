"""LinkedIn OAuth routes (login redirect, callback, disconnect)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from pydantic import ValidationError

from app.core.database import get_db
from app.core.config import settings
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import TokenPayload
from app.services.linkedin_oauth_service import get_authorize_url, exchange_code, disconnect_linkedin

router = APIRouter()


@router.get("/login")
def linkedin_login(
    token: str = Query(..., description="JWT Token from frontend since Redirect can't set headers"),
    db: Session = Depends(get_db),
):
    """
    Redirect to LinkedIn OAuth consent.
    Manually decode JWT since `window.location.href` cannot send Authentication headers.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_data = TokenPayload(**payload)
        user = db.query(User).filter(User.id == int(token_data.sub)).first()
        if not user or not user.is_active:
            raise ValueError("Invalid user status")
    except (JWTError, ValidationError, ValueError) as e:
        return RedirectResponse(
            url=f"/?error=authentication_failed&message={e!s}",
            status_code=302,
        )

    try:
        url = get_authorize_url(db, user.id)
        return RedirectResponse(url=url, status_code=302)
    except ValueError as e:
        return RedirectResponse(
            url=f"/?error=linkedin_config&message={e!s}",
            status_code=302,
        )


@router.get("/callback")
def linkedin_callback(
    code: str = Query(..., description="OAuth code from LinkedIn"),
    state: str = Query(..., description="CSRF state"),
    db: Session = Depends(get_db),
):
    """Exchange code for token, store encrypted; redirect to success."""
    try:
        exchange_code(db, code, state)
    except ValueError as e:
        return RedirectResponse(url=f"/?error=linkedin_callback&message={e!s}", status_code=302)
    return RedirectResponse(url="/?linkedin=connected", status_code=302)


@router.post("/disconnect")
def linkedin_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect LinkedIn account."""
    disconnected = disconnect_linkedin(db, current_user.id)
    if not disconnected:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LinkedIn was not connected")
    return {"disconnected": True}

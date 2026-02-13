"""Facebook OAuth routes (login redirect, callback, disconnect); no secrets in responses."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.facebook_oauth_service import get_authorize_url, exchange_code, disconnect_facebook

router = APIRouter()


@router.get("/login")
def facebook_login(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Redirect to Facebook OAuth consent. Requires current user (query param for MVP)."""
    try:
        url = get_authorize_url(db, current_user.id)
        return RedirectResponse(url=url, status_code=302)
    except ValueError as e:
        return RedirectResponse(
            url=f"/?error=facebook_config&message={e!s}",
            status_code=302,
        )


@router.get("/callback")
def facebook_callback(
    code: str = Query(..., description="OAuth code from Facebook"),
    state: str = Query(..., description="CSRF state"),
    db: Session = Depends(get_db),
):
    """Exchange code for token, store encrypted; redirect to success. No secrets in response."""
    try:
        exchange_code(db, code, state)
    except ValueError:
        return RedirectResponse(url="/?error=facebook_callback", status_code=302)
    return RedirectResponse(url="/?facebook=connected", status_code=302)


@router.post("/disconnect")
def facebook_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect Facebook: remove user token and pages. User must re-run login and sync to use again."""
    disconnected = disconnect_facebook(db, current_user.id)
    if not disconnected:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facebook was not connected")
    return {"disconnected": True}

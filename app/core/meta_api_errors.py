"""Meta/Graph API error handling: parse responses, return user-safe messages; no tokens in logs."""
from typing import Optional

import httpx


class TokenInvalidError(ValueError):
    """Raised when Meta returns token expired/invalid (e.g. 190, 102). Caller may clear stored token and prompt re-auth."""

    def __init__(self, message: str, code: Optional[int] = None):
        super().__init__(message)
        self.code = code


def _meta_error_message(data: dict) -> str:
    """Extract user-safe error message from Meta Graph API error response."""
    error = data.get("error") or {}
    code = error.get("code")
    msg = error.get("message") or "Meta API error"
    # Rate limit (4) or too many calls (17)
    if code in (4, 17):
        return "Facebook rate limit reached. Please try again in a few minutes."
    # Invalid/expired token (190, 102)
    if code in (190, 102):
        return "Facebook connection expired or invalid. Please reconnect your account."
    # Permission (10, 200)
    if code in (10, 200):
        return "Permission denied. Please ensure the app has the required Page permissions."
    # Keep message short; avoid leaking internal details
    return msg[:200] if isinstance(msg, str) else "Meta API error"


def _meta_error_code(data: dict) -> Optional[int]:
    """Return Meta error code if present."""
    error = data.get("error") or {}
    return error.get("code")


def handle_meta_response(resp: httpx.Response, context: str = "Meta API") -> None:
    """
    Raise TokenInvalidError (190/102) or ValueError with user-safe message on Meta error response.
    Callers that catch TokenInvalidError may clear stored token and prompt user to reconnect.
    """
    if resp.is_success:
        return
    try:
        data = resp.json()
    except Exception:
        data = {}
    code = _meta_error_code(data)
    msg = _meta_error_message(data)
    if resp.status_code == 429:
        msg = "Facebook rate limit reached. Please try again later."
    full_msg = f"{context}: {msg}"
    if code in (190, 102):
        raise TokenInvalidError(full_msg, code=code)
    raise ValueError(full_msg)


def wrap_meta_request(context: str = "Meta API"):
    """Decorator or use inline: catch httpx errors and Meta error body; raise ValueError with safe message."""
    def wrapper(exc: Exception) -> ValueError:
        if isinstance(exc, httpx.HTTPStatusError):
            try:
                data = exc.response.json()
                msg = _meta_error_message(data)
            except Exception:
                msg = exc.response.text[:200] if exc.response else str(exc)
            return ValueError(f"{context}: {msg}")
        if isinstance(exc, httpx.RequestError):
            return ValueError(f"{context}: Request failed. Please try again.")
        return ValueError(f"{context}: {str(exc)[:200]}")
    return wrapper

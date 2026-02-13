"""Token encryption at rest using env key; no tokens in logs."""
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


def _get_fernet() -> Optional[Fernet]:
    """Return Fernet instance if token_encryption_key is set; else None."""
    key = settings.token_encryption_key
    if not key or not key.strip():
        return None
    try:
        return Fernet(key.strip().encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_token(plain: str) -> str:
    """Encrypt a token for storage. Raises if encryption key not configured."""
    f = _get_fernet()
    if f is None:
        raise ValueError("TOKEN_ENCRYPTION_KEY must be set to store tokens")
    return f.encrypt(plain.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    """Decrypt a stored token. Raises if key missing or token invalid."""
    f = _get_fernet()
    if f is None:
        raise ValueError("TOKEN_ENCRYPTION_KEY must be set to decrypt tokens")
    try:
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise ValueError("Invalid or corrupted stored token")

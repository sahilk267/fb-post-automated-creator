"""
Facebook Graph API integration: publish content to a Page.

OAuth 2.0 flow for Facebook login is handled by:
- app.api.routes.auth_facebook (login, callback, disconnect)
- app.services.facebook_oauth_service (authorize URL, exchange code, store token)

This module provides publish_to_facebook(content) and centralizes error handling
for rate limits and invalid/expired tokens.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.core.meta_api_errors import TokenInvalidError
from app.models.content import Content
from app.models.meta_page import MetaPage
from app.services.facebook_pages_service import post_to_page_and_get_id


def publish_to_facebook(
    db: Session,
    content_id: int,
    meta_page_id: int,
    user_id: int,
) -> Content:
    """
    Publish content to a Facebook Page via Graph API using stored page token.

    - Builds message from content title + body.
    - Posts to Page feed; on success updates content with fb_page_id, fb_post_id, fb_status="posted".
    - On API failure (rate limit, invalid token, etc.) sets fb_status="failed" and re-raises.

    Raises:
        ValueError: Page not found, content not found, or Facebook API error (rate limit, invalid token, etc.).
    """
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise ValueError("Content not found")
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        raise ValueError("Page not found or not owned by user")

    if content.status != "approved":
        raise ValueError("Content must be APPROVED to publish to Facebook")

    message = f"{content.title}\n\n{content.body}"

    try:
        fb_post_id = post_to_page_and_get_id(db, meta_page_id, user_id, message)
    except TokenInvalidError:
        # Token expired/invalid; caller may prompt user to reconnect
        content.fb_status = "failed"
        content.fb_page_id = str(page.page_id)  # Ensure string
        db.commit()
        raise ValueError("Facebook connection expired or invalid. Please reconnect your account.")
    except ValueError as e:
        content.fb_status = "failed"
        content.fb_page_id = str(page.page_id)
        db.commit()
        raise

    content.fb_page_id = str(page.page_id)
    content.fb_post_id = fb_post_id or ""
    content.fb_status = "posted"
    db.commit()
    db.refresh(content)
    return content

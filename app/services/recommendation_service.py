"""Posting Recommendation Engine: advisory only. Suggests time windows, category×time, frequency; user decides."""
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.meta_page import MetaPage


# MVP: static suggestions; later can use page history/engagement
DEFAULT_TIME_WINDOWS = ["09:00-11:00", "14:00-16:00", "18:00-20:00"]
DEFAULT_CATEGORY_TIME = [
    {"category": "motivation", "suggested_period": "mornings", "description": "Higher engagement in morning"},
    {"category": "tips", "suggested_period": "midday", "description": "Good for reach"},
    {"category": "reflection", "suggested_period": "evenings", "description": "Deeper content performs well"},
]
DEFAULT_FREQUENCY = {"min_posts_per_day": 1, "max_posts_per_day": 3, "recommendation": "Start with 1–2 posts/day"}


def get_posting_recommendations(db: Session, meta_page_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Return advisory posting recommendations for a page. User must own the page.
    All suggestions are advisory only; final decision remains with the user.
    Returns None if page not found or not owned.
    """
    page = db.query(MetaPage).filter(MetaPage.id == meta_page_id, MetaPage.user_id == user_id).first()
    if not page:
        return None
    # MVP: return static defaults; later: derive from page insights / posting history
    return {
        "meta_page_id": meta_page_id,
        "advisory_only": True,
        "suggested_time_windows": DEFAULT_TIME_WINDOWS,
        "category_time_suggestions": DEFAULT_CATEGORY_TIME,
        "safe_frequency_range": DEFAULT_FREQUENCY,
    }

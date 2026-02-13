"""Viral Content Engine: category rotation, hook templates. All suggestions advisory; user decides."""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.content_category import ContentCategory
from app.models.hook_template import HookTemplate


def list_categories(db: Session) -> List[ContentCategory]:
    """List all content categories (for rotation and suggestions)."""
    return db.query(ContentCategory).order_by(ContentCategory.sort_order, ContentCategory.name).all()


def get_rotated_category_for_today(db: Session) -> Optional[ContentCategory]:
    """Return category suggested for today by rotation (e.g. by day of week). Advisory only."""
    categories = list_categories(db)
    if not categories:
        return None
    today = datetime.now(timezone.utc)
    # Rotate by day of year so variety over the year
    index = (today.timetuple().tm_yday - 1) % len(categories)
    return categories[index]


def list_templates(
    db: Session,
    category_id: Optional[int] = None,
) -> List[HookTemplate]:
    """List hook templates; optionally filter by category."""
    q = db.query(HookTemplate).order_by(HookTemplate.sort_order, HookTemplate.name)
    if category_id is not None:
        q = q.filter(HookTemplate.category_id == category_id)
    return q.all()


def get_suggested_template_for_today(db: Session) -> Optional[HookTemplate]:
    """Suggest a template for today (by category rotation). Advisory only."""
    category = get_rotated_category_for_today(db)
    if category:
        templates = list_templates(db, category_id=category.id)
        if templates:
            today = datetime.now(timezone.utc)
            index = (today.timetuple().tm_yday - 1) % len(templates)
            return templates[index]
    # Fallback: any template
    all_templates = list_templates(db)
    if all_templates:
        today = datetime.now(timezone.utc)
        index = (today.timetuple().tm_yday - 1) % len(all_templates)
        return all_templates[index]
    return None


def render_template(template: HookTemplate, hook: str = "", body: str = "", cta: str = "") -> str:
    """Fill template placeholders. Uses defaults from template if not provided."""
    h = hook or template.default_hook or ""
    b = body or ""
    c = cta or template.default_cta or ""
    return template.body_template.replace("{hook}", h).replace("{body}", b).replace("{cta}", c)


# Share-psychology: advisory tips for shareability (emotion, utility, clarity). All advisory.
SHARE_PSYCHOLOGY_TIPS = [
    {"id": "emotion", "title": "Emotion", "tip": "Emotional hooks tend to get more engagement; use sparingly and authentically."},
    {"id": "utility", "title": "Utility", "tip": "Clear, actionable tips and how-tos are often shared for later use."},
    {"id": "clarity", "title": "Clarity", "tip": "Short sentences and one main idea per post improve readability and shares."},
    {"id": "timing", "title": "Timing", "tip": "Match content tone to time of day (e.g. motivation in morning, reflection in evening)."},
    {"id": "cta", "title": "Call to action", "tip": "A simple CTA (e.g. 'What would you add?') can encourage comments and shares."},
]


def get_share_psychology_tips() -> list:
    """Return advisory share-psychology tips. All suggestions; user decides."""
    return [dict(t) for t in SHARE_PSYCHOLOGY_TIPS]

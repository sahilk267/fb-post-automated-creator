"""AI theme generation using Google Gemini API. Advisory only; user decides what to post."""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.content_category import ContentCategory


def _get_gemini_model():
    """Lazy import and configure Gemini; returns None if key missing or import fails."""
    if not settings.gemini_api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        return None


def generate_themes(
    db: Session,
    category_id: Optional[int] = None,
    category_name: Optional[str] = None,
    count: int = 5,
    extra_instruction: Optional[str] = None,
) -> List[str]:
    """
    Generate content themes using Gemini. Optional category for context.
    Returns list of theme strings (e.g. one-liner ideas). Advisory only.
    """
    model = _get_gemini_model()
    if not model:
        return []

    # Resolve category label for prompt
    category_label = "general"
    if category_id:
        cat = db.query(ContentCategory).filter(ContentCategory.id == category_id).first()
        if cat:
            category_label = cat.name
    elif category_name:
        category_label = category_name.strip() or "general"

    prompt = f"""You are a creative content strategist for social media (Facebook page posts).
Generate exactly {count} short content theme ideas for the category: "{category_label}".
Each theme should be one line: a hook idea, topic, or angle (e.g. "Why small wins compound" or "One habit that changed my mornings").
Return ONLY the list, one theme per line, no numbering or bullets.
Keep themes concise, engaging, and suitable for a short post."""
    if extra_instruction:
        prompt += f"\nAdditional context: {extra_instruction}"

    try:
        response = model.generate_content(prompt)
        if not response or not response.text:
            return []
        lines = [line.strip() for line in response.text.strip().split("\n") if line.strip()]
        return lines[:count]
    except Exception:
        return []


def is_theme_generation_available() -> bool:
    """Return True if Gemini API key is set and theme generation can be used."""
    return bool(settings.gemini_api_key)

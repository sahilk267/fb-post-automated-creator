"""Viral Content Engine API: category rotation, hook templates. All advisory; user decides."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vce import (
    ContentCategoryResponse,
    HookTemplateResponse,
    SuggestedCategoryResponse,
    SuggestedTemplateResponse,
)
from app.services.vce_service import (
    list_categories,
    get_rotated_category_for_today,
    list_templates,
    get_suggested_template_for_today,
    get_share_psychology_tips,
)

router = APIRouter()


@router.get("/categories", response_model=List[ContentCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """List all content categories (for rotation and variety). Advisory only."""
    return list_categories(db)


@router.get("/categories/today", response_model=SuggestedCategoryResponse)
def get_todays_category(db: Session = Depends(get_db)):
    """Get today's suggested category (rotation). Advisory only; user decides what to post."""
    category = get_rotated_category_for_today(db)
    if not category:
        raise HTTPException(status_code=404, detail="No categories defined; add categories first.")
    return SuggestedCategoryResponse(category=ContentCategoryResponse.model_validate(category))


@router.get("/templates", response_model=List[HookTemplateResponse])
def get_templates(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """List hook-based templates (placeholders: {hook}, {body}, {cta}). Advisory only."""
    return list_templates(db, category_id=category_id)


@router.get("/suggested-template", response_model=SuggestedTemplateResponse)
def get_suggested_template(db: Session = Depends(get_db)):
    """Get suggested template for today (by category rotation). Advisory only."""
    template = get_suggested_template_for_today(db)
    if not template:
        raise HTTPException(status_code=404, detail="No templates defined; add templates first.")
    category = None
    if template.category_id and template.category:
        category = ContentCategoryResponse.model_validate(template.category)
    return SuggestedTemplateResponse(
        template=HookTemplateResponse.model_validate(template),
        suggested_category=category,
    )


@router.get("/share-psychology-tips")
def share_psychology_tips():
    """Get advisory share-psychology tips (emotion, utility, clarity, timing, CTA). All advisory; user decides."""
    return {"advisory_only": True, "tips": get_share_psychology_tips()}

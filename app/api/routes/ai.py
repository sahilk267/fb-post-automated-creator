"""AI integration routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.ai import AIOptimizeRequest, AIOptimizeResponse
from app.services.ai_service import AIService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/optimize", response_model=AIOptimizeResponse)
def optimize_content(
    request: AIOptimizeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Optimize content title and body using Gemini AI.
    Requires authentication.
    """
    try:
        service = AIService()
        result = service.optimize_content(request.title, request.body)
        return AIOptimizeResponse(
            optimized_title=result.get("title", request.title),
            optimized_body=result.get("body", request.body)
        )
    except ValueError as e:
        logger.error(f"AI Service configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI optimization service is currently unavailable."
        )
    except Exception as e:
        logger.error(f"AI optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI suggestions."
        )

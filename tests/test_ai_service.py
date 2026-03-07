import asyncio
import os
import sys
from pathlib import Path

# Add the project root to the path so we can import app modules
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.services.ai_service import AIService

async def test_ai_optimization():
    print("Initializing AI Service...")
    try:
        service = AIService()
        title = "new product launch"
        body = "we are launching a new product tomorrow. buy it."
        
        print(f"Original Title: {title}")
        print(f"Original Body: {body}")
        print("\nOptimizing...")
        
        result = service.optimize_content(title, body)
        
        print("\n=== AI Results ===")
        print(f"Optimized Title: {result.get('title')}")
        print(f"Optimized Body:\n{result.get('body')}")
        print("==================\n")
        
        assert result.get('title') and result.get('title') != title
        assert result.get('body') and result.get('body') != body
        print("PASS AI Optimization Passed!")
        
    except ValueError as e:
        print(f"FAIL AI Optimization Failed: {e}")
        # Note: This might fail if GEMINI_API_KEY is not set in `.env`
    except Exception as e:
        print(f"FAIL Unexpected Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_optimization())

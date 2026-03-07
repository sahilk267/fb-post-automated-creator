import google.generativeai as genai
from typing import Dict
from app.core.config import settings

class AIService:
    """Service for interacting with Google's Gemini API."""
    
    def __init__(self):
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        genai.configure(api_key=settings.gemini_api_key)
        # Using gemini-2.5-flash for text tasks
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def optimize_content(self, title: str, body: str) -> Dict[str, str]:
        """
        Takes a draft title and body, and returns an optimized, professional version
        geared towards high engagement on social media.
        """
        prompt = f"""
You are an expert social media manager and copywriter. Review the following draft post:

Title/Subject: {title}
Body: {body}

Please provide an optimized version of this post designed to maximize engagement, clarity, and professionalism on platforms like Facebook and LinkedIn.
Return ONLY a JSON object with two keys containing your optimized strings: "optimized_title" and "optimized_body".
Do not include markdown formatting like ```json or any other text outside the JSON object.
"""
        
        try:
            response = self.model.generate_content(prompt)
            # The model should return a JSON string, let's parse it manually or via a quick clean
            text = response.text.strip()
            
            # Defensive cleaning in case the model wraps it in markdown blocks
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            import json
            result = json.loads(text)
            
            # Fallback if keys are slightly off
            return {
                "title": result.get("optimized_title", title),
                "body": result.get("optimized_body", body),
            }
        except Exception as e:
            raise ValueError(f"Failed to generate AI response: {str(e)}")

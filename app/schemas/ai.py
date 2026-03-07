from pydantic import BaseModel

class AIOptimizeRequest(BaseModel):
    title: str
    body: str

class AIOptimizeResponse(BaseModel):
    optimized_title: str
    optimized_body: str

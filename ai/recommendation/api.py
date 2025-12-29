from fastapi import FastAPI
from pydantic import BaseModel
from .service import get_recommendations

app = FastAPI()

class Feedback(BaseModel):
    liked: list[str] = []
    disliked: list[str] = []

class RecommendationRequest(BaseModel):
    user_id: int
    user_skills: list[str]
    all_skills: list[str]
    user_exchanges: list[str]
    feedback: Feedback = None

@app.post("/recommend/{user_id}")
def recommend(user_id: int, request: RecommendationRequest):
    recommendations = get_recommendations(
        request.user_skills,
        request.all_skills,
        request.user_exchanges,
        request.feedback.dict() if request.feedback else None
    )
    return recommendations
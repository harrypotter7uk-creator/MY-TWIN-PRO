from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/avatar", tags=["avatar"])

class AvatarRequest(BaseModel):
    user_id: str
    user_name: str = "توأمي"
    style: str = "realistic"
    language: str = "ar"

@router.post("/generate")
async def generate(req: AvatarRequest):
    from app.features.avatar_engine.avatar_engine import avatar_engine
    return await avatar_engine.generate_avatar(req.user_id, req.user_name, req.style, req.language)

@router.get("/get")
async def get(user_id: str = Query(...)):
    from app.features.avatar_engine.avatar_engine import avatar_engine
    return await avatar_engine.get_avatar(user_id) or {"image_url": None, "emotion": "neutral"}

@router.get("/emotion")
async def emotion(user_id: str = Query(...), emotion: str = Query(...)):
    from app.features.avatar_engine.avatar_engine import avatar_engine
    return await avatar_engine.update_emotion(user_id, emotion) or {"status": "not found"}

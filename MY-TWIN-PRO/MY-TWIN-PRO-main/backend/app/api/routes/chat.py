"""
Chat Routes v5.0 – محرك المحادثة المركزي مع Twin Brain
===========================================================
يستخدم Twin Brain الموحد بدلاً من Gemini المباشر.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: List[Dict[str, str]] = Field(default_factory=list)
    lang: str = Field(default="ar")
    user_id: Optional[str] = None
    emotion: Optional[str] = None

@router.post("")
async def chat(request: ChatRequest) -> Dict[str, Any]:
    """نقطة النهاية الرئيسية للمحادثة – عبر Twin Brain"""
    import time
    start = time.time()
    
    try:
        # استخدام Twin Brain الموحد
        from app.twin_brain.brain_orchestrator import twin_brain
        
        result = await twin_brain.process(
            user_id=request.user_id or "anonymous",
            message=request.message,
            history=request.history,
            lang=request.lang,
        )
        
        latency_ms = (time.time() - start) * 1000
        
        return {
            "reply": result["reply"],
            "provider": "twin_brain",
            "emotion": result.get("emotion"),
            "strategy": result.get("strategy", {}).get("goal"),
            "latency_ms": round(latency_ms, 2)
        }
        
    except Exception as e:
        logger.error(f"Twin Brain failed, falling back: {e}")
        # احتياطي: استخدام AIGateway مباشرة
        try:
            from app.infrastructure.ai.ai_gateway import ai_gateway
            reply, provider = await ai_gateway.route(
                prompt=request.message,
                task="general",
                user_id=request.user_id
            )
            return {
                "reply": reply,
                "provider": provider,
                "emotion": None,
                "latency_ms": (time.time() - start) * 1000
            }
        except:
            return {
                "reply": "أنا هنا معك. حدث خطأ بسيط، لكني ما زلت بجانبك 💜",
                "provider": "fallback",
                "emotion": None,
                "latency_ms": (time.time() - start) * 1000
            }

logger.info("✅ Chat Routes v5.0 initialized with Twin Brain")

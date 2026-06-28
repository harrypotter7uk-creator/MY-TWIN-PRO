"""
Chat Routes v8.0 – مع Rate Limiting و Prompt Injection Shield
"""
import logging, time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[Dict[str, str]] = Field(default_factory=list)
    lang: str = Field(default="ar")
    user_id: Optional[str] = None
    emotion: Optional[str] = None

@router.post("")
async def chat(request: ChatRequest) -> Dict[str, Any]:
    start = time.time()
    
    # ✅ Rate Limiting
    if request.user_id:
        try:
            from app.api.dependencies.rate_limiter import check_rate_limit
            allowed = await check_rate_limit(request.user_id, "chat", 30, 60)
            if not allowed:
                raise HTTPException(429, "Too many requests. Please wait.")
        except HTTPException:
            raise
        except:
            pass
    
    # ✅ Prompt Injection Shield
    try:
        from app.safety.response_validator import response_validator
        if response_validator.detect_prompt_injection(request.message):
            return {"reply": "أنا هنا لدعمك، لكن لا يمكنني الرد على هذا. 💜", "provider": "shield", "emotion": None, "latency_ms": 0}
    except:
        pass
    
    try:
        from app.twin_brain.brain_orchestrator import twin_brain
        
        enriched_message = request.message
        if request.user_id:
            try:
                from app.twin_state.working_memory import working_memory
                context = await working_memory.get_context_for_prompt(request.user_id)
                if context: enriched_message = f"{context}\n\n[الآن]\nالمستخدم: {request.message}"
            except: pass
        
        result = await twin_brain.process(user_id=request.user_id or "anonymous", message=enriched_message, history=request.history, lang=request.lang)
        reply = result["reply"]
        detected_emotion = result.get("emotion", "neutral")
        
        try:
            from app.safety.response_validator import response_validator
            validation = await response_validator.validate(reply=reply, user_id=request.user_id, emotion={"primary": detected_emotion})
            if validation.get("repaired"): reply = validation["final_reply"]
        except: pass
        
        if request.user_id:
            try:
                from app.twin_state.twin_kernel import twin_kernel
                await twin_kernel.process_interaction(user_id=request.user_id, message=request.message, reply=reply, emotion=detected_emotion, interaction_depth=0.5)
            except: pass
        
        latency_ms = (time.time() - start) * 1000
        return {"reply": reply, "provider": "twin_brain", "emotion": detected_emotion, "latency_ms": round(latency_ms, 2)}
        
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        try:
            from app.infrastructure.ai.ai_gateway import ai_gateway
            reply, provider = await ai_gateway.route(prompt=request.message, task="general", user_id=request.user_id)
            return {"reply": reply, "provider": provider, "emotion": None, "latency_ms": (time.time() - start) * 1000}
        except:
            return {"reply": "أنا هنا معك 💜", "provider": "fallback", "emotion": None, "latency_ms": (time.time() - start) * 1000}

logger.info("✅ Chat Routes v8.0 with Rate Limiting + Prompt Shield")

"""
Chat Routes v7.0 – محرك المحادثة مع Twin OS Kernel
===========================================================
- يستخدم TwinKernel (النواة الموحدة) بدلاً من الاستدعاءات المنفصلة
- جميع المحركات تُدار من النواة
"""
import logging, time
from fastapi import APIRouter, HTTPException
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
    """نقطة النهاية الرئيسية – عبر Twin OS Kernel"""
    start = time.time()
    
    try:
        # 1. استخدام Twin Brain لتوليد الرد
        from app.twin_brain.brain_orchestrator import twin_brain
        
        # دمج الذاكرة العاملة في الـ prompt
        enriched_message = request.message
        if request.user_id:
            try:
                from app.twin_state.working_memory import working_memory
                context = await working_memory.get_context_for_prompt(request.user_id)
                if context:
                    enriched_message = f"{context}\n\n[الآن]\nالمستخدم: {request.message}"
            except:
                pass
        
        result = await twin_brain.process(
            user_id=request.user_id or "anonymous",
            message=enriched_message,
            history=request.history,
            lang=request.lang,
        )
        
        reply = result["reply"]
        detected_emotion = result.get("emotion", "neutral")
        strategy = result.get("strategy", {}).get("goal", "general")
        
        # 2. فحص الجودة والهلوسة
        try:
            from app.safety.response_validator import response_validator
            validation = await response_validator.validate(
                reply=reply,
                user_id=request.user_id,
                emotion={"primary": detected_emotion},
            )
            if validation.get("repaired"):
                reply = validation["final_reply"]
        except Exception as e:
            logger.warning(f"Validation skipped: {e}")
        
        # 3. ✅ استخدام النواة الموحدة (بدلاً من الاستدعاءات المنفصلة)
        kernel_result = None
        if request.user_id:
            try:
                from app.twin_state.twin_kernel import twin_kernel
                kernel_result = await twin_kernel.process_interaction(
                    user_id=request.user_id,
                    message=request.message,
                    reply=reply,
                    emotion=detected_emotion,
                    interaction_depth=0.5,
                )
            except Exception as e:
                logger.warning(f"Kernel processing skipped: {e}")
        
        latency_ms = (time.time() - start) * 1000
        
        return {
            "reply": reply,
            "provider": "twin_brain",
            "emotion": detected_emotion,
            "strategy": strategy,
            "latency_ms": round(latency_ms, 2),
            "kernel": kernel_result.get("engines_triggered", []) if kernel_result else [],
        }
        
    except Exception as e:
        logger.error(f"Twin Brain failed: {e}")
        try:
            from app.infrastructure.ai.ai_gateway import ai_gateway
            reply, provider = await ai_gateway.route(
                prompt=request.message, task="general", user_id=request.user_id,
            )
            return {"reply": reply, "provider": provider, "emotion": None, "strategy": "fallback", "latency_ms": (time.time() - start) * 1000}
        except:
            return {"reply": "أنا هنا معك 💜", "provider": "fallback", "emotion": None, "strategy": "error_recovery", "latency_ms": (time.time() - start) * 1000}

logger.info("✅ Chat Routes v7.0 initialized with Twin OS Kernel")

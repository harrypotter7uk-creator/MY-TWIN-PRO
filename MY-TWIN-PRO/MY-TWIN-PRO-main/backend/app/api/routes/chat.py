"""
Chat Routes v9.0 – Smart Routing + Energy Awareness
"""
import logging, time
from fastapi import APIRouter, HTTPException
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

# قدرات الكشف عن النية
INTENT_PATTERNS = {
    "coding": {
        "ar": ["كود", "برمجة", "دالة", "كلاس", "بايثون", "جافا", "جافاسكريبت", "صن"],
        "en": ["code", "function", "class", "python", "javascript", "debug", "algorithm"],
    },
    "business": {
        "ar": ["مشروع", "فكرة", "جدوى", "تسويق", "سوق", "استثمار", "أرباح"],
        "en": ["business", "startup", "revenue", "market", "investment", "canvas"],
    },
    "study": {
        "ar": ["ادرس", "تعلم", "شرح", "درس", "فهم", "تلخيص"],
        "en": ["study", "learn", "explain", "summarize", "teach"],
    },
    "dream": {
        "ar": ["حلم", "حلمت", "تفسير", "منام"],
        "en": ["dream", "nightmare", "interpret"],
    },
    "content": {
        "ar": ["اكتب", "مقال", "قصة", "رواية", "سيناريو", "كابشن", "منشور"],
        "en": ["write", "article", "story", "caption", "script", "post"],
    },
}

CAPABILITY_ROUTES = {
    "coding": {"type": "code_lab", "route": "/features/code-lab", "label_ar": "مختبر البرمجة", "label_en": "Code Lab"},
    "business": {"type": "business", "route": "/features/business-analyzer", "label_ar": "تحليل الأعمال", "label_en": "Business Analyzer"},
    "study": {"type": "study", "route": "/features/study-mode", "label_ar": "أثينا", "label_en": "Athena"},
    "dream": {"type": "dream", "route": "/features/dreams", "label_ar": "تفسير الأحلام", "label_en": "Dreams"},
    "content": {"type": "content", "route": "/features/content-creator", "label_ar": "مُحترف الكتابة", "label_en": "Writing Pro"},
}

def detect_capability_intent(message: str, lang: str) -> Optional[Dict]:
    msg_lower = message.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        words = patterns.get(lang, patterns.get("en", []))
        for word in words:
            if word.lower() in msg_lower:
                cap = CAPABILITY_ROUTES.get(intent)
                if cap:
                    return {
                        "suggested_capability": cap,
                        "reply_hint": "suggest_capability",
                    }
    return None

@router.post("")
async def chat(request: ChatRequest) -> Dict[str, Any]:
    start = time.time()
    
    if request.user_id:
        try:
            from app.api.dependencies.rate_limiter import check_rate_limit
            allowed = await check_rate_limit(request.user_id, "chat", 30, 60)
            if not allowed:
                raise HTTPException(429, "Too many requests")
        except HTTPException: raise
        except: pass
    
    try:
        from app.safety.response_validator import response_validator
        if response_validator.detect_prompt_injection(request.message):
            return {"reply": "أنا هنا لدعمك، لكن لا يمكنني الرد على هذا. 💜", "provider": "shield", "emotion": None, "latency_ms": 0}
    except: pass

    # ✅ Smart Routing: كشف النية
    capability_hint = detect_capability_intent(request.message, request.lang)
    
    try:
        from app.twin_brain.brain_orchestrator import twin_brain
        
        enriched_message = request.message
        if request.user_id:
            try:
                from app.twin_state.working_memory import working_memory
                context = await working_memory.get_context_for_prompt(request.user_id)
                if context: enriched_message = f"{context}\n\n[الآن]\nالمستخدم: {request.message}"
            except: pass
        
        result = await twin_brain.process(
            user_id=request.user_id or "anonymous",
            message=enriched_message,
            history=request.history,
            lang=request.lang,
        )
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
                await twin_kernel.process_interaction(
                    user_id=request.user_id, message=request.message,
                    reply=reply, emotion=detected_emotion, interaction_depth=0.5,
                )
            except: pass
        
        latency_ms = (time.time() - start) * 1000
        
        response = {
            "reply": reply,
            "provider": "twin_brain",
            "emotion": detected_emotion,
            "latency_ms": round(latency_ms, 2),
        }
        
        # ✅ إضافة اقتراح القدرة إذا تم اكتشاف النية
        if capability_hint:
            response["suggested_capability"] = capability_hint["suggested_capability"]
        
        return response
        
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        try:
            from app.infrastructure.ai.ai_gateway import ai_gateway
            reply, provider = await ai_gateway.route(prompt=request.message, task="general", user_id=request.user_id)
            return {"reply": reply, "provider": provider, "emotion": None, "latency_ms": (time.time() - start) * 1000}
        except:
            return {"reply": "أنا هنا معك 💜", "provider": "fallback", "emotion": None, "latency_ms": (time.time() - start) * 1000}

logger.info("✅ Chat Routes v9.0 with Smart Routing")

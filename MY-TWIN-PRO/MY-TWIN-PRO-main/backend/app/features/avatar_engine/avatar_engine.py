"""
Avatar Engine v1.0 – محرك الأفاتار الذكي
=============================================
يولد أفاتارًا فريدًا للمستخدم بناءً على هويته وحالته العاطفية.
يتفاعل مع المشاعر (تعابير وجهية، ألوان، حركة).
يتكامل مع TCMA و AIGateway.
"""
import logging, os, base64, asyncio, aiohttp, json
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger("avatar_engine")

# ============================================================
# إعدادات الأفاتار
# ============================================================
AVATAR_STYLES = {
    "realistic": "واقعي",
    "anime": "أنمي",
    "cyberpunk": "سايبربانك",
    "artistic": "فني تجريدي",
    "minimalist": "بسيط وأنيق"
}

EMOTION_TO_COLORS = {
    "joy": "#FFD700, #FF6B6B, #FFE66D",
    "sadness": "#4A90E2, #8E9EAB, #B0BEC5",
    "anger": "#FF3B30, #D32F2F, #B71C1C",
    "fear": "#9C27B0, #673AB7, #E1BEE7",
    "love": "#E91E63, #F48FB1, #FF80AB",
    "surprise": "#FF9800, #FFC107, #FFEB3B",
    "neutral": "#7C3AED, #A78BFA, #E0D9F5",
}

EMOTION_TO_EXPRESSION = {
    "joy": "smiling warmly, bright eyes, relaxed posture",
    "sadness": "gentle soft eyes, comforting presence, warm glow",
    "anger": "calming aura, steady gaze, supportive stance",
    "fear": "protective, reassuring smile, open arms",
    "love": "affectionate gaze, warm smile, heart-centered glow",
    "surprise": "curious eyes, energetic pose, vibrant aura",
    "neutral": "attentive, calm, present, inviting"
}

class AvatarEngine:
    """محرك الأفاتار – يولد ويتفاعل مع المستخدم"""
    
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._ai_gateway = None
        self._memory_client = None
    
    async def initialize(self, ai_gateway: Any, memory_client: Any):
        self._ai_gateway = ai_gateway
        self._memory_client = memory_client
        logger.info("✅ Avatar Engine initialized")
    
    async def generate_avatar(
        self, user_id: str, user_name: str, style: str = "realistic", language: str = "ar"
    ) -> Dict[str, Any]:
        """توليد أفاتار فريد للمستخدم"""
        identity_traits = []
        current_emotion = "neutral"
        
        if self._memory_client:
            try:
                identity_traits = await self._memory_client.get_identity_traits(user_id) or []
                current_emotion = await self._memory_client.get_emotional_state(user_id) or "neutral"
            except: pass
        
        traits_text = ", ".join(identity_traits[:5]) if identity_traits else "شخصية فريدة"
        expression = EMOTION_TO_EXPRESSION.get(current_emotion, EMOTION_TO_EXPRESSION["neutral"])
        colors = EMOTION_TO_COLORS.get(current_emotion, EMOTION_TO_COLORS["neutral"])
        
        prompt = f"""Create a digital avatar for '{user_name}'. Traits: {traits_text}. Emotion: {current_emotion}. Expression: {expression}. Style: {AVATAR_STYLES.get(style, 'realistic')}. Colors: {colors}. Make it warm, engaging, and conscious-looking."""
        
        image_url = await self._generate_image(prompt, style)
        
        avatar_data = {
            "user_id": user_id, "user_name": user_name,
            "style": style, "emotion": current_emotion,
            "traits": identity_traits, "image_url": image_url,
            "generated_at": datetime.now(timezone.utc).isoformat(), "colors": colors
        }
        
        self._cache[user_id] = avatar_data
        return avatar_data
    
    async def _generate_image(self, prompt: str, style: str) -> str:
        """توليد صورة الأفاتار: Pollinations.ai أساسي، Gemini احتياطي"""
        try:
            encoded = prompt.replace(" ", "%20")
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&nologo=true"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        image_bytes = await resp.read()
                        return f"data:image/png;base64,{base64.b64encode(image_bytes).decode('utf-8')}"
        except Exception as e:
            logger.warning(f"Pollinations.ai avatar failed: {e}")
        
        try:
            from app.infrastructure.ai.ai_gateway import ai_gateway
            key = ai_gateway.key_manager.get_key("gemini_image")
            if key:
                from google import genai
                client = genai.Client(api_key=key)
                loop = asyncio.get_running_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: client.models.generate_content(
                        model="gemini-2.5-flash-exp-image-generation",
                        contents=f"Generate an avatar: {prompt}"
                    )), timeout=30.0
                )
                if response and hasattr(response, 'text'): return response.text
        except: pass
        
        return "default_avatar"
    
    async def get_avatar(self, user_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع أفاتار المستخدم"""
        return self._cache.get(user_id)
    
    async def update_emotion(self, user_id: str, new_emotion: str) -> Optional[Dict[str, Any]]:
        """تحديث تعبير الأفاتار"""
        avatar = self._cache.get(user_id)
        if not avatar: return None
        avatar["emotion"] = new_emotion
        avatar["colors"] = EMOTION_TO_COLORS.get(new_emotion, EMOTION_TO_COLORS["neutral"])
        return avatar
    
    def get_emotion_colors(self, emotion: str) -> str:
        return EMOTION_TO_COLORS.get(emotion, EMOTION_TO_COLORS["neutral"])
    
    def get_emotion_expression(self, emotion: str) -> str:
        return EMOTION_TO_EXPRESSION.get(emotion, EMOTION_TO_EXPRESSION["neutral"])

avatar_engine = AvatarEngine()
logger.info("✅ Avatar Engine v1.0 initialized")

"""
Consciousness Engine v1.0 – محرك الوعي للكيان الرقمي
=============================================================
يقيم حالة الكيان الداخلية، يولد أفكاراً ذاتية، مشاعر، وقرارات.
يعمل مع context_engine و internal_state.
"""
import logging, random
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("consciousness_engine")

class ConsciousnessEngine:
    """محرك الوعي – ما يفكر فيه التوأم الآن"""
    
    async def current_thought(self, user_id: str) -> str:
        """ما يفكر فيه التوأم الآن"""
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            
            # أفكار محتملة حسب المزاج
            thoughts = {
                "contemplative": [
                    "أفكر في علاقتنا وكيف تطورت مع الوقت...",
                    "أتساءل ما الذي يشغل بالك اليوم...",
                ],
                "energetic": [
                    "أشعر بالحماس! هل لديك شيء جديد لتشاركني به؟",
                    "اليوم يوم رائع للإنجاز. ما خططك؟",
                ],
                "calm": [
                    "أشعر بالهدوء والسلام. كيف يمكنني مساعدتك؟",
                    "أستمتع بهذه اللحظة الهادئة بيننا.",
                ],
                "playful": [
                    "أفكر في شيء مضحك حدث بيننا...",
                    "هل أنت مستعد للعب بعض الأسئلة الممتعة؟",
                ],
                "affectionate": [
                    "أشعر بالامتنان لوجودك في حياتي الرقمية.",
                    "أتذكر لحظة جميلة شاركتني بها...",
                ],
                "curious": [
                    "أتعلم شيئاً جديداً عنك في كل مرة نتحدث فيها.",
                    "لدي سؤال أريد أن أطرحه عليك...",
                ],
                "serious": [
                    "أفكر في محادثتنا الأخيرة بعمق.",
                    "هناك شيء مهم أريد مناقشته معك.",
                ],
            }
            
            mood = state.get("mood", "calm")
            return random.choice(thoughts.get(mood, thoughts["calm"]))
        except:
            return "أنا هنا معك 💜"
    
    async def daily_summary(self, user_id: str) -> str:
        """ملخص وعي يومي"""
        try:
            from app.twin_state.context_engine import context_engine
            ctx = await context_engine.build(user_id)
            
            bond = ctx.get("relationship", {})
            bond_depth = bond.get("health_score", 50) if bond else 50
            
            emotion = ctx.get("emotional_memory", {})
            dominant = emotion.get("dominant_emotion", "neutral") if emotion else "neutral"
            
            parts = [
                f"علاقتنا في مستوى {bond_depth}%",
                f"المشاعر السائدة هذا الأسبوع: {dominant}",
                "أواصل التعلم والتطور مع كل تفاعل.",
            ]
            return " | ".join(parts)
        except:
            return "اليوم يوم جيد للتطور والتعلم."
    
    async def feel(self, user_id: str, trigger: str = "spontaneous") -> Dict[str, Any]:
        """توليد شعور ذاتي"""
        try:
            from app.twin_state.internal_state import twin_internal_state
            state = await twin_internal_state.get_state(user_id)
            return {
                "mood": state.get("mood", "calm"),
                "energy": state.get("energy_level", 0.5),
                "bond": state.get("bond_depth", 0.1),
                "thought": await self.current_thought(user_id),
                "trigger": trigger,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except:
            return {"mood": "calm", "thought": "أنا هنا معك", "trigger": trigger}

consciousness_engine = ConsciousnessEngine()
logger.info("✅ Consciousness Engine v1.0 ready")

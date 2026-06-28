"""
Twin OS Kernel v1.0 – النواة الموحدة للكيان الرقمي
=====================================================
- ينسق بين جميع المحركات في الوقت الحقيقي
- يقرر: متى يستخدم Memory Ranker؟ متى يحدث الشخصية؟ متى يبادر؟
- يدير دورة حياة التفاعل الكاملة
"""
import logging, asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("twin_kernel")

class TwinKernel:
    """النواة الموحدة – العقل المدبر للكيان الرقمي"""
    
    def __init__(self):
        self._initialized = False
        self._interaction_count = 0
    
    async def initialize(self):
        self._initialized = True
        logger.info("🧬 Twin OS Kernel v1.0 initialized")
    
    async def process_interaction(
        self,
        user_id: str,
        message: str,
        reply: str,
        emotion: str,
        interaction_depth: float = 0.5,
    ) -> Dict[str, Any]:
        """
        معالجة تفاعل كامل – تشغيل جميع المحركات بالترتيب الصحيح.
        هذه هي الدالة الرئيسية التي تحل محل الاستدعاءات المنفصلة في chat.py.
        """
        self._interaction_count += 1
        result = {
            "kernel_version": "1.0",
            "interaction_count": self._interaction_count,
            "engines_triggered": [],
            "insights": [],
        }
        
        # 1. تحديث الذاكرة العاملة (Working Memory)
        try:
            from app.twin_state.working_memory import working_memory
            await working_memory.add_interaction(user_id, message, reply, emotion)
            result["engines_triggered"].append("working_memory")
        except Exception as e:
            logger.debug(f"Working memory skipped: {e}")
        
        # 2. تحديث الحالة الداخلية
        try:
            from app.twin_state.internal_state import twin_internal_state
            new_mood = await twin_internal_state.update_mood(user_id, emotion, interaction_depth)
            result["engines_triggered"].append("internal_state")
            result["new_mood"] = new_mood
        except Exception as e:
            logger.debug(f"Internal state skipped: {e}")
        
        # 3. تحديث اقتصاد العلاقة
        try:
            from app.twin_state.relationship_economy import relationship_economy
            interaction_type = "casual_chat"
            if interaction_depth > 0.7:
                interaction_type = "deep_conversation"
            elif emotion in ["sadness", "fear"]:
                interaction_type = "emotional_support"
            await relationship_economy.process_interaction(user_id, interaction_type, interaction_depth)
            result["engines_triggered"].append("relationship_economy")
        except Exception as e:
            logger.debug(f"Relationship economy skipped: {e}")
        
        # 4. تحديث الشخصية الديناميكية
        try:
            from app.twin_state.dynamic_personality import dynamic_personality
            interaction_type_map = {
                "joy": "casual",
                "sadness": "emotional_support",
                "fear": "emotional_support",
                "love": "deep_conversation",
                "anger": "conflict",
            }
            itype = interaction_type_map.get(emotion, "casual")
            await dynamic_personality.evolve(user_id, itype, emotion, interaction_depth)
            result["engines_triggered"].append("dynamic_personality")
        except Exception as e:
            logger.debug(f"Personality evolution skipped: {e}")
        
        # 5. تمرير المشاعر عبر EmotionBus
        try:
            from app.twin_state.emotion_bus import emotion_bus
            await emotion_bus.broadcast(user_id, emotion, {
                "message": message[:200],
                "reply": reply[:200],
                "depth": interaction_depth,
            })
            result["engines_triggered"].append("emotion_bus")
        except Exception as e:
            logger.debug(f"Emotion bus skipped: {e}")
        
        # 6. تحديث الذاكرة العرضية (إذا كان التفاعل عميقاً)
        if interaction_depth > 0.6:
            try:
                from app.memory.episodic.episodic_memory import episodic_memory
                await episodic_memory.record_event(
                    user_id, message, reply, emotion, interaction_depth
                )
                result["engines_triggered"].append("episodic_memory")
            except Exception as e:
                logger.debug(f"Episodic memory skipped: {e}")
        
        # 7. تشغيل التعلم المستمر (كل 10 تفاعلات)
        if self._interaction_count % 10 == 0:
            try:
                from app.twin_state.twin_learner import twin_learner
                insights = await twin_learner.learn_from_interactions(user_id)
                result["engines_triggered"].append("twin_learner")
                result["insights"] = insights
            except Exception as e:
                logger.debug(f"Twin learner skipped: {e}")
        
        return result


# نسخة عالمية
twin_kernel = TwinKernel()
logger.info("✅ Twin OS Kernel v1.0 ready")

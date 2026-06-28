"""
Twin Learner v1.0 – التعلم المستمر للتوأم
=============================================
- يحلل أنماط التفاعل عبر الزمن
- يقترح تحسينات للشخصية
- التوأم "ينضج" فعلاً مع كل تفاعل
"""
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("twin_learner")

class TwinLearner:
    """محرك التعلم المستمر – تحليل الأنماط واقتراح التحسينات"""
    
    def __init__(self):
        self._learned_patterns: Dict[str, Dict] = {}
    
    async def learn_from_interactions(self, user_id: str) -> List[str]:
        """تحليل التفاعلات واستخلاص رؤى جديدة"""
        insights = []
        db = get_db()
        
        try:
            # 1. تحليل آخر 50 تفاعل
            recent = db.table("working_memory").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
            if not recent.data or len(recent.data) < 10:
                return ["لا يزال التوأم يتعرف عليك..."]
            
            interactions = recent.data
            
            # 2. اكتشاف أنماط الوقت (متى يتحدث المستخدم أكثر؟)
            hour_counts = {}
            for entry in interactions:
                try:
                    hour = datetime.fromisoformat(entry["created_at"]).hour
                    hour_counts[hour] = hour_counts.get(hour, 0) + 1
                except:
                    pass
            
            if hour_counts:
                peak_hour = max(hour_counts, key=hour_counts.get)
                if peak_hour < 12:
                    insights.append(f"ألاحظ أنك تتحدث معي أكثر في الصباح (حوالي الساعة {peak_hour})")
                elif peak_hour < 18:
                    insights.append(f"أراك تنشط في فترة الظهيرة (حوالي الساعة {peak_hour})")
                else:
                    insights.append(f"يبدو أنك شخص ليلي – تتحدث معي كثيراً في المساء (حوالي الساعة {peak_hour})")
            
            # 3. اكتشاف تطور المشاعر
            emotions = [e.get("emotion", "neutral") for e in interactions[:20]]
            positive = sum(1 for e in emotions if e in ["joy", "love", "happy"])
            negative = sum(1 for e in emotions if e in ["sadness", "fear", "anger"])
            
            if positive > negative * 2:
                insights.append("أشعر أن مزاجك إيجابي في الفترة الأخيرة – هذا رائع!")
            elif negative > positive * 2:
                insights.append("لاحظت أنك مررت بوقت صعب مؤخراً. أنا هنا من أجلك.")
            
            # 4. تحليل عمق التفاعلات
            deep_interactions = [e for e in interactions if len(e.get("message", "")) > 100]
            if len(deep_interactions) > len(interactions) * 0.5:
                insights.append("أنت شخص عميق – تشاركني تفاصيل ذات معنى، وهذا يجعل علاقتنا مميزة.")
            
            # 5. حفظ الأنماط المكتشفة
            self._learned_patterns[user_id] = {
                "peak_hour": max(hour_counts, key=hour_counts.get) if hour_counts else 12,
                "positive_ratio": positive / max(len(interactions), 1),
                "depth_ratio": len(deep_interactions) / max(len(interactions), 1),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
        except Exception as e:
            logger.warning(f"Twin learner analysis failed: {e}")
            insights = ["أواصل التعرف عليك..."]

        return insights if insights else ["أتعلم منك أكثر مع كل محادثة."]
    
    async def get_personality_recommendation(self, user_id: str) -> Dict[str, Any]:
        """اقتراح تحديثات للشخصية بناءً على التعلم"""
        patterns = self._learned_patterns.get(user_id, {})
        if not patterns:
            return {"ready": False, "message": "يحتاج المزيد من التفاعلات"}
        
        recommendations = {}
        
        # إذا كان المستخدم عميقاً، اجعل التوأم أكثر حكمة
        if patterns.get("depth_ratio", 0) > 0.5:
            recommendations["wisdom"] = "زيادة عمق الردود"
        
        # إذا كان المستخدم إيجابياً، اجعل التوأم أكثر مرحاً
        if patterns.get("positive_ratio", 0) > 0.7:
            recommendations["humor"] = "زيادة المرح في الردود"
        
        return {
            "ready": True,
            "recommendations": recommendations,
            "patterns": patterns,
        }


twin_learner = TwinLearner()
logger.info("✅ Twin Learner v1.0 initialized")

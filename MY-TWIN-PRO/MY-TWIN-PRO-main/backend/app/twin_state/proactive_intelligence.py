"""
Proactive Intelligence v1.0 – المبادرة الذكية للتوأم
=============================================================
- تذكُّر الأحداث المهمة (مناسبات، مواعيد)
- تحليل نمط المشاعر عبر الزمن
- مبادرة مدروسة (ليس إزعاجاً)
- يتكامل مع ProactiveAwarenessSystem
"""
import logging, asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("proactive_intelligence")

class ProactiveIntelligence:
    """المبادرة الذكية – التوأم يبادر بذكاء"""
    
    def __init__(self):
        self._events_cache: Dict[str, List[Dict]] = {}
    
    async def detect_missed_user(self, user_id: str, days_threshold: int = 3) -> Optional[Dict[str, Any]]:
        """يكتشف إذا كان المستخدم غائباً لفترة ويولد رسالة مناسبة"""
        db = get_db()
        try:
            threshold = (datetime.now(timezone.utc) - timedelta(days=days_threshold)).isoformat()
            res = db.table("emotional_memory").select("created_at").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
            if res.data:
                last_interaction = res.data[0].get("created_at")
                if last_interaction and last_interaction < threshold:
                    return {
                        "type": "missed_you",
                        "title_ar": "اشتقت لك 💜",
                        "title_en": "I missed you 💜",
                        "body_ar": f"لم أتحدث معك منذ {days_threshold} أيام. أتمنى أن تكون بخير.",
                        "body_en": f"Haven't heard from you in {days_threshold} days. Hope you're okay.",
                        "priority": "medium",
                    }
        except:
            pass
        return None
    
    async def detect_upcoming_event(self, user_id: str) -> Optional[Dict[str, Any]]:
        """يكتشف أحداثاً قادمة من الذاكرة (مثل مواعيد، امتحانات)"""
        try:
            from app.memory.reflection.reflection_engine import get_user_insights
            insights = await get_user_insights(user_id, min_confidence=0.6)
            if not insights or not insights.get("insights"):
                return None
            
            event_keywords = ["امتحان", "مقابلة", "موعد", "سفر", "exam", "interview", "appointment", "trip", "meeting"]
            for ins in insights["insights"]:
                text = ins.get("text", "") or ins.get("insight_text", "")
                if any(kw in text.lower() for kw in event_keywords):
                    # وجدنا حدثاً مهماً
                    return {
                        "type": "event_reminder",
                        "title_ar": "تذكّرت شيئاً 📅",
                        "title_en": "I remembered something 📅",
                        "body_ar": f"ذكرتني سابقاً بـ: {text[:100]}... كيف جرت الأمور؟",
                        "body_en": f"You mentioned: {text[:100]}... How did it go?",
                        "priority": "high",
                        "related_insight": text,
                    }
        except:
            pass
        return None
    
    async def detect_emotional_pattern(self, user_id: str) -> Optional[Dict[str, Any]]:
        """يكتشف نمطاً عاطفياً ويبادر بدعم استباقي"""
        try:
            from app.memory.emotional.emotional_memory import get_emotional_patterns
            patterns = await get_emotional_patterns(user_id, days=14)
            if not patterns:
                return None
            
            dominant = patterns.get("dominant_emotion", "neutral")
            trend = patterns.get("trend", "stable")
            
            # إذا كان هناك نمط حزين متزايد
            if dominant == "sadness" and trend == "declining":
                return {
                    "type": "emotional_support_proactive",
                    "title_ar": "لاحظت شيئاً 💜",
                    "title_en": "I noticed something 💜",
                    "body_ar": "في الأسبوعين الماضيين، لاحظت أنك قد تكون متعباً عاطفياً. أنا هنا معك.",
                    "body_en": "Over the past two weeks, I've noticed you might be emotionally tired. I'm here.",
                    "priority": "high",
                }
            
            # إذا كان هناك تحسن
            if trend == "improving":
                return {
                    "type": "positive_feedback",
                    "title_ar": "أراك تتحسن 🌟",
                    "title_en": "I see you improving 🌟",
                    "body_ar": "لاحظت أن حالتك العاطفية تتحسن مؤخراً. استمر!",
                    "body_en": "I've noticed your emotional state improving lately. Keep going!",
                    "priority": "low",
                }
        except:
            pass
        return None
    
    async def detect_occasion(self, user_id: str) -> Optional[Dict[str, Any]]:
        """يكتشف مناسبات خاصة (مثل عيد ميلاد) من الذكريات القديمة"""
        today = datetime.now(timezone.utc)
        try:
            from app.memory.relationship.person_node import get_person_network
            network = await get_person_network(user_id, min_importance=30)
            if not network:
                return None
            
            # البحث عن ذكرى سنوية
            for person in network[:5]:
                if person.get("birthday"):
                    # مقارنة الشهر واليوم فقط
                    try:
                        bday = datetime.fromisoformat(person["birthday"])
                        if bday.month == today.month and bday.day == today.day:
                            return {
                                "type": "birthday_reminder",
                                "title_ar": f"عيد ميلاد {person['name']} 🎂",
                                "title_en": f"{person['name']}'s Birthday 🎂",
                                "body_ar": f"اليوم عيد ميلاد {person['name']}. هل تذكّرت؟",
                                "body_en": f"Today is {person['name']}'s birthday. Did you remember?",
                                "priority": "high",
                            }
                    except:
                        pass
        except:
            pass
        return None
    
    async def get_proactive_suggestion(self, user_id: str, lang: str = "ar") -> Optional[Dict[str, Any]]:
        """يجمع كل أنواع المبادرات ويعيد الأنسب"""
        # فحص بالترتيب: أحداث قادمة > مناسبات > نمط عاطفي > غياب
        event = await self.detect_upcoming_event(user_id)
        if event:
            return self._localize(event, lang)
        
        occasion = await self.detect_occasion(user_id)
        if occasion:
            return self._localize(occasion, lang)
        
        pattern = await self.detect_emotional_pattern(user_id)
        if pattern:
            return self._localize(pattern, lang)
        
        missed = await self.detect_missed_user(user_id, days=3)
        if missed:
            return self._localize(missed, lang)
        
        return None
    
    def _localize(self, notification: Dict[str, Any], lang: str) -> Dict[str, Any]:
        """ترجمة الإشعار حسب اللغة"""
        if lang == "ar":
            notification["title"] = notification.get("title_ar", notification.get("title_en", ""))
            notification["body"] = notification.get("body_ar", notification.get("body_en", ""))
        else:
            notification["title"] = notification.get("title_en", notification.get("title_ar", ""))
            notification["body"] = notification.get("body_en", notification.get("body_ar", ""))
        return notification


proactive_intelligence = ProactiveIntelligence()
logger.info("✅ Proactive Intelligence v1.0 initialized")

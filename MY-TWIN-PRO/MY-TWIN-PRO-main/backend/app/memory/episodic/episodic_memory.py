"""
Episodic Memory v1.0 – الذاكرة العرضية للتوأم
===================================================
- تربط الأحداث في قصص مترابطة
- "رحلة المستخدم مع القلق"، "تطور علاقته بعمله"
- تُمكّن التوأم من قول: "خلال الأشهر الثلاثة الماضية، لاحظت أنك..."
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.infrastructure.database.supabase_client import get_db

logger = logging.getLogger("episodic_memory")

# موضوعات يمكن تتبعها عبر الزمن
EPISODE_THEMES = {
    "work": {"ar": "العمل", "en": "Work", "keywords": ["عمل", "مدير", "اجتماع", "شركة", "راتب", "job", "boss", "meeting", "company", "salary"]},
    "family": {"ar": "الأسرة", "en": "Family", "keywords": ["أمي", "أبي", "أخي", "أختي", "عائلة", "mother", "father", "brother", "sister", "family"]},
    "health": {"ar": "الصحة", "en": "Health", "keywords": ["مرض", "طبيب", "مستشفى", "ألم", "صحة", "sick", "doctor", "hospital", "pain", "health"]},
    "love": {"ar": "العلاقات", "en": "Relationships", "keywords": ["حب", "زوج", "زوجة", "صديق", "علاقة", "love", "husband", "wife", "friend", "relationship"]},
    "dreams": {"ar": "الأحلام", "en": "Dreams", "keywords": ["حلم", "هدف", "طموح", "مستقبل", "أريد", "dream", "goal", "ambition", "future", "want"]},
    "anxiety": {"ar": "القلق", "en": "Anxiety", "keywords": ["قلق", "خوف", "متوتر", "خائف", "توتر", "anxiety", "fear", "worried", "scared", "stress"]},
}

class EpisodicMemory:
    """الذاكرة العرضية – ربط الأحداث في قصص"""
    
    def __init__(self):
        self._episodes: Dict[str, Dict[str, List]] = {}
    
    async def record_event(
        self,
        user_id: str,
        message: str,
        reply: str,
        emotion: str,
        depth: float,
    ):
        """تسجيل حدث في الذاكرة العرضية"""
        message_lower = message.lower()
        
        # اكتشاف الموضوعات
        for theme_id, theme in EPISODE_THEMES.items():
            if any(kw in message_lower for kw in theme["keywords"]):
                if user_id not in self._episodes:
                    self._episodes[user_id] = {}
                if theme_id not in self._episodes[user_id]:
                    self._episodes[user_id][theme_id] = []
                
                self._episodes[user_id][theme_id].append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": message[:300],
                    "reply": reply[:300],
                    "emotion": emotion,
                    "depth": depth,
                })
                
                # حفظ في Supabase
                try:
                    db = get_db()
                    db.table("episodic_memory").insert({
                        "user_id": user_id,
                        "theme": theme_id,
                        "message": message[:300],
                        "reply": reply[:300],
                        "emotion": emotion,
                        "depth": depth,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }).execute()
                except:
                    pass
                
                # الاحتفاظ بآخر 50 حدث لكل موضوع
                if len(self._episodes[user_id][theme_id]) > 50:
                    self._episodes[user_id][theme_id] = self._episodes[user_id][theme_id][-50:]
    
    async def get_episode_summary(self, user_id: str, theme_id: str, lang: str = "ar") -> Optional[str]:
        """استرجاع ملخص قصة موضوع معين"""
        if user_id not in self._episodes or theme_id not in self._episodes.get(user_id, {}):
            # محاولة التحميل من Supabase
            try:
                db = get_db()
                res = db.table("episodic_memory").select("*").eq("user_id", user_id).eq("theme", theme_id).order("created_at", desc=True).limit(20).execute()
                if res.data:
                    if user_id not in self._episodes:
                        self._episodes[user_id] = {}
                    self._episodes[user_id][theme_id] = [
                        {"timestamp": r["created_at"], "message": r["message"], "emotion": r.get("emotion", "neutral")}
                        for r in res.data
                    ]
            except:
                return None
        
        events = self._episodes.get(user_id, {}).get(theme_id, [])
        if not events:
            return None
        
        theme = EPISODE_THEMES.get(theme_id, {"ar": theme_id, "en": theme_id})
        theme_name = theme.get(lang, theme_id)
        
        # تحليل المشاعر عبر الزمن
        emotions = [e.get("emotion", "neutral") for e in events]
        first_emotions = emotions[:5] if len(emotions) >= 5 else emotions
        last_emotions = emotions[-5:] if len(emotions) >= 5 else emotions
        
        first_positive = sum(1 for e in first_emotions if e in ["joy", "love"])
        last_positive = sum(1 for e in last_emotions if e in ["joy", "love"])
        
        trend = "مستقر" if lang == "ar" else "stable"
        if last_positive > first_positive:
            trend = "يتحسن" if lang == "ar" else "improving"
        elif last_positive < first_positive:
            trend = "يتراجع" if lang == "ar" else "declining"
        
        first_date = events[0]["timestamp"][:10] if events else ""
        last_date = events[-1]["timestamp"][:10] if events else ""
        
        if lang == "ar":
            return f"تابعت رحلتك مع {theme_name} من {first_date} إلى {last_date}. خلال هذه الفترة، لاحظت أن حالتك {trend}. لدينا {len(events)} محادثة حول هذا الموضوع."
        else:
            return f"I've followed your journey with {theme_name} from {first_date} to {last_date}. During this time, I noticed your state is {trend}. We've had {len(events)} conversations about this."
    
    async def get_all_summaries(self, user_id: str, lang: str = "ar") -> List[str]:
        """استرجاع ملخصات جميع الموضوعات"""
        summaries = []
        for theme_id in EPISODE_THEMES:
            summary = await self.get_episode_summary(user_id, theme_id, lang)
            if summary:
                summaries.append(summary)
        return summaries


episodic_memory = EpisodicMemory()
logger.info("✅ Episodic Memory v1.0 initialized")

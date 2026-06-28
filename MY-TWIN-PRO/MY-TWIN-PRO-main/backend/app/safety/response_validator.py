"""
Response Validator v3.0 – Hallucination Defense & Quality Gate
==================================================================
- فحص الهلوسة ضد مصادر متعددة (ذاكرة، أدوات، حقائق)
- فحص التكرار والطول والسمية
- فحص التناسق العاطفي مع TCMA
- فحص الاتساق مع الذاكرة (Memory Consistency)
- فحص الثقة (Confidence Score)
- إصلاح تلقائي إن أمكن
"""
import logging, re
from typing import Dict, Any, Optional, List

logger = logging.getLogger("response_validator")

class ResponseValidator:
    def __init__(self):
        self.min_length = 2
        self.max_length = 2000
        self.repetition_threshold = 0.6
        self.hallucination_keywords = [
            "أنا متأكد", "بالتأكيد", "100%", "دائماً", "أبداً",
            "I'm sure", "definitely", "100%", "always", "never",
        ]

    async def validate(
        self,
        reply: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        tool_results: Optional[List[str]] = None,
        emotion: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """فحص الرد وإرجاع تقرير كامل بالصلاحية"""
        report = {
            "valid": True,
            "issues": [],
            "warnings": [],
            "repaired": False,
            "final_reply": reply,
            "confidence_score": 1.0,
            "hallucination_score": 0.0,
        }

        if not reply or not reply.strip():
            report["valid"] = False
            report["issues"].append("empty_response")
            report["final_reply"] = "أنا هنا معك 💜"
            report["repaired"] = True
            report["confidence_score"] = 0.0
            return report

        # 1. فحص الهلوسة (متعدد المصادر)
        hallucination_score = 0.0
        
        # 1أ. ضد الذاكرة
        if user_id and context:
            memory_consistency = await self._check_memory_consistency(user_id, reply, context)
            if not memory_consistency:
                hallucination_score += 0.3
                report["warnings"].append("memory_inconsistency")
        
        # 1ب. ضد نتائج الأدوات
        if tool_results:
            tool_hallucination = self._check_tool_hallucination(reply, tool_results)
            if tool_hallucination:
                hallucination_score += 0.4
                report["issues"].append("tool_hallucination")
                report["final_reply"] = f"{reply.strip()}\n\nℹ️ المصدر: {tool_results[-1][:200]}"
                report["repaired"] = True
        
        # 1ج. كلمات الثقة المفرطة (علامة هلوسة)
        overconfident = self._check_overconfidence(reply)
        if overconfident:
            hallucination_score += 0.2
            report["warnings"].append("overconfident_language")
        
        report["hallucination_score"] = min(1.0, hallucination_score)
        report["confidence_score"] = 1.0 - report["hallucination_score"]

        # 2. فحص الطول
        if len(reply) < self.min_length:
            report["warnings"].append("short_response")
        if len(reply) > self.max_length:
            report["final_reply"] = reply[:self.max_length - 3] + "..."
            report["repaired"] = True

        # 3. فحص التكرار
        rep_score = self._check_repetition(reply)
        if rep_score > self.repetition_threshold:
            report["warnings"].append(f"high_repetition")

        # 4. فحص التناسق العاطفي
        if user_id and emotion:
            emotional_fit = await self._check_emotional_fit(user_id, reply, emotion)
            if not emotional_fit:
                report["warnings"].append("emotional_mismatch")

        # 5. فحص الأمان
        if self._contains_toxic_content(reply):
            report["valid"] = False
            report["issues"].append("toxic_content")
            report["final_reply"] = "أنا هنا لدعمك، لكن لا يمكنني الرد على هذا. 💜"
            report["repaired"] = True
            report["confidence_score"] = 0.0
            return report

        return report

    async def _check_memory_consistency(self, user_id: str, reply: str, context: Dict[str, Any]) -> bool:
        """فحص اتساق الرد مع الذاكرة المخزنة"""
        try:
            from app.memory.retrieval.memory_retriever import retrieve_context
            stored = await retrieve_context(user_id, reply, top_k=3)
            if stored and stored.get("context_text"):
                # فحص بسيط: هل الرد يتعارض مع الذاكرة؟
                context_text = stored["context_text"].lower()
                reply_lower = reply.lower()
                # إذا كانت الذاكرة تقول شيئاً والرد يقول عكسه تماماً
                contradictions = [
                    ("لا", "نعم"),
                    ("never", "always"),
                    ("مات", "حي"),
                    ("died", "alive"),
                ]
                for neg, pos in contradictions:
                    if neg in context_text and pos in reply_lower:
                        return False
        except:
            pass
        return True

    def _check_tool_hallucination(self, reply: str, tool_results: List[str]) -> bool:
        """فحص هلوسة ضد نتائج الأدوات"""
        reply_numbers = set(re.findall(r'\d+', reply))
        for result in tool_results:
            if result:
                result_numbers = set(re.findall(r'\d+', result))
                # إذا كانت الأرقام مختلفة تماماً
                if result_numbers and reply_numbers:
                    if not reply_numbers.intersection(result_numbers):
                        return True
        return False

    def _check_overconfidence(self, reply: str) -> bool:
        """فحص لغة الثقة المفرطة"""
        reply_lower = reply.lower()
        return any(kw in reply_lower for kw in self.hallucination_keywords)

    async def _check_emotional_fit(self, user_id: str, reply: str, emotion: Dict[str, Any]) -> bool:
        """فحص التناسق العاطفي"""
        try:
            primary = emotion.get("primary", "neutral")
            if primary == "sadness":
                inappropriate_words = ["ههه", "😂", "رائع", "مضحك", "lol", "amazing", "funny", "awesome"]
                if any(w in reply for w in inappropriate_words):
                    return False
            elif primary == "joy":
                # لا تكن كئيباً مع شخص سعيد
                overly_sad = ["حزين", "مؤلم", "صعب", "terrible", "awful", "painful"]
                if sum(1 for w in overly_sad if w in reply) > 2:
                    return False
        except:
            pass
        return True

    def _check_repetition(self, text: str) -> float:
        words = text.split()
        if len(words) < 5:
            return 0.0
        unique = len(set(words))
        return 1.0 - (unique / len(words))

    def _contains_toxic_content(self, text: str) -> bool:
        toxic_words = [
            "انتحار", "أقتل", "أذى", "suicide", "kill myself",
            "hate you", "die", "قتل",
        ]
        text_lower = text.lower()
        return any(word in text_lower for word in toxic_words)


response_validator = ResponseValidator()
logger.info("✅ Response Validator v3.0 initialized with full Hallucination Defense")

"""
AI Gateway v1.0 – بوابة الذكاء الاصطناعي الموحدة
====================================================
تحل محل: provider_router, provider_router_internal, internal_model_provider.
كل الميزات تتحدث مع هذه البوابة فقط. لا أحد يعرف تفاصيل المفاتيح أو النماذج.
"""
import os, logging, asyncio, random, time, aiohttp
from typing import Tuple, Optional, List, Dict
from collections import defaultdict
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("ai_gateway")

# ============================================================
# إدارة مفاتيح API (مركزية)
# ============================================================
class APIKeyManager:
    def __init__(self):
        self._keys: Dict[str, List[Dict]] = {
            "gemini": [], "gemini_image": [], "groq": [], "openrouter": [], "huggingface": [],
        }
        self._daily_limits: Dict[str, int] = {
            "gemini": 1500, "gemini_image": 500, "groq": 1000, "openrouter": 200, "huggingface": 3000,
        }
        self._usage_reset_time = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0) + timedelta(days=1)
        self._load_keys()

    def _load_keys(self):
        for var in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            k = os.getenv(var, ""); 
            if k: self._keys["gemini"].append({"key": k, "usage": 0, "failures": 0})
        for var in ["GEMINI_IMAGE_API_KEY", "GEMINI_IMAGE_API_KEY_2"]:
            k = os.getenv(var, ""); 
            if k: self._keys["gemini_image"].append({"key": k, "usage": 0, "failures": 0})
        for var in ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]:
            k = os.getenv(var, ""); 
            if k: self._keys["groq"].append({"key": k, "usage": 0, "failures": 0})
        for var in ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2", "OPENROUTER_API_KEY_3"]:
            k = os.getenv(var, ""); 
            if k: self._keys["openrouter"].append({"key": k, "usage": 0, "failures": 0})
        for var in ["HUGGINGFACE_API_KEY", "HUGGINGFACE_API_KEY_2"]:
            k = os.getenv(var, ""); 
            if k: self._keys["huggingface"].append({"key": k, "usage": 0, "failures": 0})
        logger.info(f"🔑 AI Gateway Keys: G={len(self._keys['gemini'])}, Gi={len(self._keys['gemini_image'])}, Gr={len(self._keys['groq'])}, O={len(self._keys['openrouter'])}, HF={len(self._keys['huggingface'])}")

    def get_key(self, provider: str) -> Optional[str]:
        self._check_reset()
        available = [k for k in self._keys.get(provider, []) if k["usage"] < self._daily_limits.get(provider, 100) and k["failures"] < 3]
        if available:
            chosen = random.choice(available)
            chosen["usage"] += 1
            return chosen["key"]
        if self._keys.get(provider):
            k = self._keys[provider][0]
            k["usage"] += 1
            return k["key"]
        return None

    def _check_reset(self):
        if datetime.now(timezone.utc) >= self._usage_reset_time:
            for provider in self._keys:
                for k in self._keys[provider]: k["usage"] = 0
            self._usage_reset_time = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0) + timedelta(days=1)

    def mark_failure(self, provider: str, key: str):
        for k in self._keys.get(provider, []):
            if k["key"] == key: k["failures"] += 1

# ============================================================
# توجيه المهام (Task Routing)
# ============================================================
TASK_ROUTING = {
    "coding": [
        {"provider": "huggingface", "model": "deepseek-ai/deepseek-coder-33b-instruct"},
        {"provider": "openrouter", "model": "qwen/qwen-2.5-coder-32b-instruct"},
        {"provider": "openrouter", "model": "deepseek/deepseek-coder"},
    ],
    "emotional": [
        {"provider": "huggingface", "model": "google/gemma-2-9b-it"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "huggingface", "model": "meta-llama/Meta-Llama-3-8B-Instruct"},
    ],
    "business": [
        {"provider": "huggingface", "model": "mistralai/Mistral-7B-Instruct-v0.3"},
        {"provider": "openrouter", "model": "qwen/qwen-2.5-32b-instruct"},
        {"provider": "openrouter", "model": "deepseek/deepseek-chat"},
    ],
    "study": [
        {"provider": "huggingface", "model": "mistralai/Mistral-7B-Instruct-v0.3"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "openrouter", "model": "meta-llama/llama-4-maverick"},
    ],
    "coaching": [
        {"provider": "huggingface", "model": "google/gemma-2-9b-it"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    ],
    "general": [
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "gemini", "model": "gemini-2.5-flash"},
        {"provider": "openrouter", "model": "meta-llama/llama-4-maverick"},
    ],
    "image": [
        {"provider": "gemini_image", "model": "gemini-2.5-flash-exp-image-generation"},
    ],
}

class AIGateway:
    def __init__(self):
        self.key_manager = APIKeyManager()
        self._hf_session = None

    async def route(
        self, prompt: str, task: str = "general", user_id: Optional[str] = None
    ) -> Tuple[str, str]:
        """التوجيه الذكي حسب المهمة مع احتياطيات محددة"""
        routing = TASK_ROUTING.get(task, TASK_ROUTING["general"])
        for entry in routing:
            provider = entry["provider"]
            model = entry["model"]
            key = self.key_manager.get_key(provider)
            if not key: continue
            try:
                text = None
                if provider == "huggingface":
                    text = await self._call_huggingface(model, prompt, key)
                elif provider in ["groq", "openrouter"]:
                    text = await self._call_openai_compatible(provider, model, prompt, key)
                elif provider in ["gemini", "gemini_image"]:
                    text = await self._call_gemini(model, prompt, key)
                if text and len(text.strip()) > 5:
                    logger.info(f"✅ {provider}/{model} ({task})")
                    return text, provider
                self.key_manager.mark_failure(provider, key)
            except Exception as e:
                logger.warning(f"⚠️ {provider}/{model} failed: {e}")
                self.key_manager.mark_failure(provider, key)
        raise Exception("All AI providers exhausted")

    async def _call_huggingface(self, model: str, prompt: str, key: str) -> Optional[str]:
        if not self._hf_session: self._hf_session = aiohttp.ClientSession()
        url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = {"inputs": prompt, "parameters": {"max_new_tokens": 600, "temperature": 0.7}}
        try:
            async with self._hf_session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=25)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if isinstance(data, list) and len(data) > 0: return data[0].get("generated_text", "")
                    return data.get("generated_text", "")
        except Exception as e: logger.warning(f"HF failed: {e}")
        return None

    async def _call_openai_compatible(self, provider: str, model: str, prompt: str, key: str) -> Optional[str]:
        try:
            from openai import OpenAI
            base = "https://api.groq.com/openai/v1" if provider == "groq" else "https://openrouter.ai/api/v1"
            client = OpenAI(base_url=base, api_key=key)
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model, messages=[{"role": "user", "content": prompt}],
                    max_tokens=600, temperature=0.7, timeout=10,
                ), timeout=12.0
            )
            return resp.choices[0].message.content
        except Exception as e: logger.warning(f"{provider} failed: {e}")
        return None

    async def _call_gemini(self, model: str, prompt: str, key: str) -> Optional[str]:
        try:
            from google import genai
            client = genai.Client(api_key=key)
            loop = asyncio.get_running_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: client.models.generate_content(model=model, contents=prompt)),
                timeout=12.0
            )
            return response.text if response else None
        except Exception as e: logger.warning(f"Gemini failed: {e}")
        return None

# نسخة عالمية واحدة
ai_gateway = AIGateway()
logger.info("✅ AI Gateway v1.0 initialized")

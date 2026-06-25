"""
Smart Home Orchestrator v5.0 – المنزل الذكي (Plugin)
=============================================================
- يرث من BasePlugin – يسجل نفسه تلقائياً في FeatureRegistry.
"""
import logging, os
from typing import Dict, Any

from app.features.base_plugin import BasePlugin

logger = logging.getLogger(__name__)

HA_URL = os.getenv("HA_URL", "")
HA_TOKEN = os.getenv("HA_TOKEN", "")

class SmartHomeOrchestrator(BasePlugin):
    """منسق المنزل الذكي – مسجل كـ Plugin"""
    
    def __init__(self):
        super().__init__(name="SmartHome", version="5.0.0")
    
    @property
    def plugin_id(self) -> str:
        return "smart_home"
    
    @property
    def plugin_name_ar(self) -> str:
        return "المنزل الذكي"
    
    @property
    def plugin_name_en(self) -> str:
        return "Smart Home"
    
    @property
    def description(self) -> str:
        return "تحكم بالإضاءة، روتين، توصيات ذكية"
    
    async def process_command(self, user_id: str, command: str, lang: str = "ar") -> Dict[str, Any]:
        return {"command": command, "response": "تم استلام الأمر", "executed": False}
    
    async def get_status(self, user_id: str) -> Dict[str, Any]:
        devices = []
        if HA_URL and HA_TOKEN:
            devices.append({"name": "نور الصالة", "state": "unknown"})
        return {"devices": devices, "user_emotion": "neutral", "suggestion": "المنزل جاهز لأوامرك."}
    
    def register_routes(self, app: Any) -> bool:
        try:
            from app.api.routes.smart_home_routes import router
            app.include_router(router)
            logger.info("   ✅ Smart Home routes registered")
            return True
        except Exception as e:
            logger.warning(f"   ⚠️ Smart Home routes not registered: {e}")
            return False

smart_home = SmartHomeOrchestrator()

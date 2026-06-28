"""
MyTwin API v18.0.0 – Living Digital Twin Backend
==================================================
نقطة دخول موحّدة مع Twin OS Kernel وجميع المحركات.
"""
import logging, sys, os, time, importlib
from pathlib import Path
from contextlib import asynccontextmanager

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'app'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(name)-25s | %(levelname)-8s | %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger("mytwin.api")
logger.info("🚀 MyTwin API v18.0.0 starting...")

from dotenv import load_dotenv
load_dotenv(BASE_DIR / '.env')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from app.core.config import config
except:
    class config:
        ALLOWED_ORIGINS = ["*"]
        ENV = "development"
        DEBUG = True

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init AI Gateway
    logger.info("🌟 Initializing AI Gateway...")
    from app.infrastructure.ai.ai_gateway import ai_gateway

    # Init Memory Client
    logger.info("🧠 Initializing Memory Client...")
    memory_client = None
    try:
        from app.infrastructure.database.memory_repo import memory_repo
        memory_client = memory_repo
    except ImportError:
        logger.warning("⚠️ Memory Repo not available")

    # Init Twin Brain
    logger.info("🧠 Initializing Twin Brain...")
    from app.twin_brain.brain_orchestrator import twin_brain
    await twin_brain.initialize()

    # Init Internal State
    logger.info("🧠 Initializing Twin Internal State...")
    from app.twin_state.internal_state import twin_internal_state

    # Init Relationship Economy
    logger.info("💜 Initializing Relationship Economy...")
    from app.twin_state.relationship_economy import relationship_economy

    # Init Dynamic Personality
    logger.info("🎭 Initializing Dynamic Personality...")
    from app.twin_state.dynamic_personality import dynamic_personality

    # Init Twin Goals
    logger.info("🎯 Initializing Twin Goals...")
    from app.twin_state.twin_goals import twin_goals

    # Init Proactive Intelligence
    logger.info("🔮 Initializing Proactive Intelligence...")
    from app.twin_state.proactive_intelligence import proactive_intelligence

    # Init Memory Ranker
    logger.info("📊 Initializing Memory Ranker...")
    from app.memory.importance.memory_ranker import memory_ranker

    # Init Working Memory
    logger.info("🧠 Initializing Working Memory...")
    from app.twin_state.working_memory import working_memory

    # Init Emotion Bus
    logger.info("💫 Initializing Emotion Bus...")
    from app.twin_state.emotion_bus import emotion_bus

    # Init Twin OS Kernel
    logger.info("🧬 Initializing Twin OS Kernel...")
    from app.twin_state.twin_kernel import twin_kernel
    await twin_kernel.initialize()

    # Init Twin Learner
    logger.info("📚 Initializing Twin Learner...")
    from app.twin_state.twin_learner import twin_learner

    # Init Proactive Awareness
    logger.info("🧠 Initializing Proactive Awareness System...")
    from app.features.proactive_awareness import proactive_awareness
    await proactive_awareness.initialize(ai_gateway=ai_gateway, memory_client=memory_client)
    await proactive_awareness.start()

    # Init Avatar Engine
    logger.info("🎨 Initializing Avatar Engine...")
    from app.features.avatar_engine.avatar_engine import avatar_engine
    await avatar_engine.initialize(ai_gateway=ai_gateway, memory_client=memory_client)

    # Init Digital Fingerprint
    logger.info("🆔 Initializing Digital Fingerprint Engine...")
    from app.features.digital_fingerprint import fingerprint_engine
    await fingerprint_engine.initialize(ai_gateway=ai_gateway, memory_client=memory_client)

    # Init Digital Twin Sync
    logger.info("🔄 Initializing Digital Twin Sync...")
    from app.features.digital_twin_sync import digital_twin_sync
    await digital_twin_sync.initialize(ai_gateway=ai_gateway, memory_client=memory_client)

    # Init Consciousness Bridge
    logger.info("🌉 Initializing Consciousness Bridge...")
    from app.core.consciousness_bridge import consciousness_bridge
    await consciousness_bridge.initialize(ai_gateway=ai_gateway, memory_client=memory_client)

    # Init Feature Registry
    logger.info("🔌 Loading Feature Registry...")
    from app.core.feature_registry import feature_registry
    await feature_registry.initialize(ai_gateway=ai_gateway, memory_client=memory_client)
    feature_registry.register_routes(app)

    _register_core_routes(app)

    total = len(feature_registry.get_all_plugins())
    logger.info(f"🌟 MyTwin API v18.0.0 fully started with {total} plugins + Twin OS Kernel + All Engines")

    yield

    logger.info("👋 Shutting down...")
    for pid, plugin in feature_registry.get_all_plugins().items():
        try: await plugin.shutdown()
        except: pass
    logger.info("👋 MyTwin API shut down")

def _register_core_routes(app: FastAPI):
    core_modules = [
        "app.api.routes.chat",
        "app.api.routes.auth",
        "app.api.routes.profile",
        "app.api.routes.memories",
        "app.api.routes.goals",
        "app.api.routes.feedback",
        "app.api.routes.referral",
        "app.api.routes.onboarding",
        "app.api.routes.account",
        "app.api.routes.push",
        "app.api.routes.ads",
        "app.api.routes.stats",
        "app.api.routes.dev",
        "app.api.routes.admin",
        "app.api.routes.billing",
        "app.api.routes.reports",
        "app.api.routes.graph_routes",
        "app.api.routes.recommendations",
        "app.api.routes.meta_routes",
        "app.api.routes.relationship",
        "app.api.routes.ai_trainer_routes",
        "app.infrastructure.integrations.telegram_webhook",
        "app.api.routes.awareness_routes",
        "app.api.routes.avatar_routes",
        "app.api.routes.task_manager_routes",
        "app.api.routes.fingerprint_routes",
        "app.api.routes.image_routes",
        "app.api.routes.sync_routes",
        "app.api.routes.consciousness_routes",
        "app.api.routes.tts",
        "app.api.routes.awareness_score_routes",
        "app.api.routes.twin_state_routes",
        "app.api.routes.relationship_economy_routes",
    ]
    loaded = 0
    for module_path in core_modules:
        try:
            mod = importlib.import_module(module_path)
            app.include_router(mod.router)
            loaded += 1
        except Exception as e:
            logger.warning(f"   ⚠️ Core route '{module_path}' failed: {e}")
    logger.info(f"   ✅ {loaded}/{len(core_modules)} core routes loaded")

app = FastAPI(
    title="MyTwin API", version="18.0.0",
    description="Living Digital Twin – Twin OS Kernel",
    docs_url="/docs" if getattr(config, 'DEBUG', False) else None,
    redoc_url="/redoc" if getattr(config, 'DEBUG', False) else None,
    lifespan=lifespan,
)

allowed = getattr(config, 'ALLOWED_ORIGINS', ["*"])
if isinstance(allowed, str): allowed = [o.strip() for o in allowed.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    if duration > 1.0: logger.warning(f"⏳ Slow: {request.method} {request.url.path} ({duration:.2f}s)")
    return response

@app.get("/")
async def root():
    from app.core.feature_registry import feature_registry
    plugins = feature_registry.list_plugins() if feature_registry.is_initialized else []
    return {"name": "MyTwin API", "version": "18.0.0", "plugins_loaded": len(plugins), "plugins": plugins, "twin_brain": True, "twin_os_kernel": True}

@app.get("/health")
async def health():
    from app.core.feature_registry import feature_registry
    plugins_health = {}
    if feature_registry.is_initialized:
        try: plugins_health = await feature_registry.health_check_all()
        except: pass
    return JSONResponse(content={"api": "healthy", "twin_os_kernel": True, "plugins": plugins_health})

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")

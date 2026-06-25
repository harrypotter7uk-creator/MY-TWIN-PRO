from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/consciousness", tags=["consciousness"])

@router.get("/recommendations")
async def get_recommendations(user_id: str = Query(...)):
    from app.core.consciousness_bridge import consciousness_bridge
    recs = await consciousness_bridge.get_recommendations(user_id)
    return {"recommendations": recs}

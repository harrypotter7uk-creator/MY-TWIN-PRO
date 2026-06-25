"""
MyTwin – External Services v8.0 (متعدد المصادر والاحتياط)
=============================================================
- طقس: Open-Meteo (أساسي مجاني) → OpenWeatherMap (احتياطي بمفتاحين)
- أخبار: NewsAPI (أساسي بمفتاحين) → Wikipedia (احتياطي مجاني)
- يوتيوب: Invidious (أساسي مجاني) → YouTube API (احتياطي بمفتاحين)
- بحث: Google Custom Search → AI Deep Search
- سبوتيفاي: Spotify API
"""
import os, logging, base64, asyncio, random
from typing import Optional, Dict, Any, List
import httpx

logger = logging.getLogger(__name__)

YOUTUBE_API_KEYS = [k for k in [os.getenv("YOUTUBE_API_KEY", ""), os.getenv("YOUTUBE_API_KEY_2", "")] if k]
NEWS_API_KEYS = [k for k in [os.getenv("NEWS_API_KEY", ""), os.getenv("NEWS_API_KEY_2", "")] if k]
OPENWEATHER_API_KEYS = [k for k in [os.getenv("OPENWEATHER_API_KEY", ""), os.getenv("OPENWEATHER_API_KEY_2", "")] if k]
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

logger.info(f"🔑 Services: YT={len(YOUTUBE_API_KEYS)}, News={len(NEWS_API_KEYS)}, OWM={len(OPENWEATHER_API_KEYS)}")

# ========== الطقس (Open-Meteo أساسي + OpenWeatherMap احتياطي) ==========
async def get_weather(city: str = "Cairo", lang: str = "ar") -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            geo = await client.get("https://nominatim.openstreetmap.org/search", params={"q": city, "format": "json", "limit": 1}, headers={"User-Agent": "MyTwin/1.0"})
            if geo.status_code == 200 and geo.json():
                lat, lon = float(geo.json()[0]["lat"]), float(geo.json()[0]["lon"])
                resp = await client.get("https://api.open-meteo.com/v1/forecast", params={"latitude": lat, "longitude": lon, "current_weather": True})
                if resp.status_code == 200:
                    c = resp.json()["current_weather"]
                    return {"city": city, "temperature": c["temperature"], "windspeed": c["windspeed"], "description": _weather_desc(c.get("weathercode", 0)), "source": "open-meteo"}
    except: pass

    for key in OPENWEATHER_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://api.openweathermap.org/data/2.5/weather", params={"q": city, "appid": key, "units": "metric", "lang": "ar" if lang == "ar" else "en"})
                if resp.status_code == 200:
                    d = resp.json()
                    return {"city": city, "temperature": d["main"]["temp"], "windspeed": d.get("wind", {}).get("speed", 0), "description": d["weather"][0]["description"] if d.get("weather") else "غير معروف", "source": "openweathermap"}
        except: continue

    return {"error": "تعذر جلب الطقس", "city": city}

def _weather_desc(code: int) -> str:
    return {0: "سماء صافية", 1: "غائم جزئياً", 2: "غائم", 45: "ضباب", 61: "أمطار خفيفة", 63: "أمطار متوسطة", 65: "أمطار غزيرة", 95: "عاصفة رعدية"}.get(code, "غير معروف")

# ========== الأخبار (NewsAPI بمفتاحين + Wikipedia احتياطي) ==========
async def get_news(country: str = "us", lang: str = "en") -> Dict[str, Any]:
    for key in NEWS_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://newsapi.org/v2/top-headlines", params={"country": country, "apiKey": key, "pageSize": 5})
                if resp.status_code == 200:
                    articles = resp.json().get("articles", [])
                    if articles:
                        return {"articles": [{"title": a["title"], "url": a["url"], "source": a.get("source", {}).get("name", "")} for a in articles[:5]], "source": "newsapi"}
        except: continue

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            endpoint = "بوابة:الأحداث_الجارية" if lang == "ar" else "Portal:Current_events"
            resp = await client.get(f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{endpoint}")
            if resp.status_code == 200:
                data = resp.json()
                return {"articles": [{"title": data.get("title", "آخر الأحداث"), "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""), "source": "wikipedia"}], "source": "wikipedia"}
    except: pass

    return {"articles": [], "source": "none"}

# ========== يوتيوب (Invidious أساسي مجاني + YouTube API احتياطي) ==========
async def search_youtube(query: str, max_results: int = 3, lang: str = "ar") -> Optional[str]:
    for instance in ["https://inv.nadeko.net", "https://yewtu.be"]:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{instance}/api/v1/search", params={"q": query, "type": "video", "sort": "relevance"})
                if resp.status_code == 200 and resp.json():
                    items = resp.json()
                    results = [f"🎬 **{i['title']}**\n   🔗 https://youtube.com/watch?v={i['videoId']}" for i in items[:max_results] if i.get("videoId")]
                    if results: return "\n\n".join(results)
        except: continue

    for key in YOUTUBE_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://www.googleapis.com/youtube/v3/search", params={"key": key, "q": query, "part": "snippet", "type": "video", "maxResults": max_results})
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    if items: return "\n\n".join(f"🎬 **{i['snippet']['title']}**\n   🔗 https://youtube.com/watch?v={i['id']['videoId']}" for i in items[:max_results])
        except: continue
    return None

# ========== سبوتيفاي ==========
class SpotifyClient:
    def __init__(self): self._token = None
    async def _auth(self):
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET: return None
        auth = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post("https://accounts.spotify.com/api/token", headers={"Authorization": f"Basic {auth}"}, data={"grant_type": "client_credentials"})
                if resp.status_code == 200: self._token = resp.json().get("access_token")
        except: pass
    async def search(self, query: str) -> Optional[str]:
        if not self._token: await self._auth()
        if not self._token: return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get("https://api.spotify.com/v1/search", headers={"Authorization": f"Bearer {self._token}"}, params={"q": query, "type": "track", "limit": 1})
                if resp.status_code == 200:
                    tracks = resp.json().get("tracks", {}).get("items", [])
                    if tracks: t = tracks[0]; return f"🎵 **{t['name']}** - {t['artists'][0]['name']}\n   🔗 {t['external_urls']['spotify']}"
        except: pass
        return None
spotify_client = SpotifyClient()

async def search_spotify(query: str) -> Optional[str]:
    return await spotify_client.search(query)

# ========== البحث ==========
async def search_web(query: str, lang: str = "ar") -> Dict[str, Any]:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "") or (YOUTUBE_API_KEYS[0] if YOUTUBE_API_KEYS else "")
    GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")
    if GOOGLE_API_KEY and GOOGLE_CSE_ID:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://www.googleapis.com/customsearch/v1", params={"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": query})
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    return {"results": [{"title": i["title"], "link": i["link"]} for i in items[:5]], "source": "google"}
        except: pass
    try:
        from app.infrastructure.ai.provider_router import provider_router
        response = await provider_router.generate(f"قدم معلومات عن: {query}. اللغة: {lang}.", language=lang)
        return {"results": response, "source": "ai"}
    except: return {"results": None, "source": "none"}

async def deep_search(query: str, lang: str = "ar") -> Dict[str, Any]:
    try:
        from app.infrastructure.ai.provider_router import provider_router
        response = await provider_router.generate(f"بحث عميق: {query}. قدم تعريف شامل. اللغة: {lang}.", language=lang)
        return {"results": response}
    except: return {"results": None}

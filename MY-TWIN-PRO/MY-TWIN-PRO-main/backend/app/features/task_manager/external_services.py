"""
MyTwin – External Services v8.1 (محسّن الطقس العربي والمصري)
=============================================================
- طقس: Open-Meteo (أساسي مجاني) → OpenWeatherMap (احتياطي بمفتاحين)
- أخبار: NewsAPI (أساسي بمفتاحين) → Wikipedia (احتياطي مجاني)
- يوتيوب: Invidious (أساسي مجاني) → YouTube API (احتياطي بمفتاحين)
"""
import os, logging, base64, asyncio
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

YOUTUBE_API_KEYS = [k for k in [os.getenv("YOUTUBE_API_KEY", ""), os.getenv("YOUTUBE_API_KEY_2", "")] if k]
NEWS_API_KEYS = [k for k in [os.getenv("NEWS_API_KEY", ""), os.getenv("NEWS_API_KEY_2", "")] if k]
OPENWEATHER_API_KEYS = [k for k in [os.getenv("OPENWEATHER_API_KEY", ""), os.getenv("OPENWEATHER_API_KEY_2", "")] if k]

logger.info(f"🔑 Services: YT={len(YOUTUBE_API_KEYS)}, News={len(NEWS_API_KEYS)}, OWM={len(OPENWEATHER_API_KEYS)}")

# ========== الطقس (Open-Meteo أساسي + OpenWeatherMap احتياطي) ==========
async def get_weather(city: str = "Cairo", lang: str = "ar") -> Dict[str, Any]:
    """
    يجلب الطقس لمدينة معينة. يدعم أسماء المدن العربية والإنجليزية.
    """
    # محاولة تحديد الإحداثيات عبر Nominatim
    lat, lon = None, None
    
    # تحويل أسماء المدن العربية إلى equivalents إنجليزية لتحسين البحث
    city_map = {
        "القاهرة": "Cairo", "الإسكندرية": "Alexandria", "الجيزة": "Giza",
        "الرياض": "Riyadh", "جدة": "Jeddah", "دبي": "Dubai",
        "أبوظبي": "Abu Dhabi", "الدوحة": "Doha", "المنامة": "Manama",
        "مسقط": "Muscat", "عمان": "Amman", "بيروت": "Beirut",
        "بغداد": "Baghdad", "دمشق": "Damascus", "الخرطوم": "Khartoum",
        "طرابلس": "Tripoli", "تونس": "Tunis", "الجزائر": "Algiers",
        "الرباط": "Rabat", "الدار البيضاء": "Casablanca",
    }
    search_city = city_map.get(city, city)
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            geo = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": search_city, "format": "json", "limit": 1},
                headers={"User-Agent": "MyTwin-AI/1.0 (soulsync@mytwin.ai)"}
            )
            if geo.status_code == 200 and geo.json():
                location = geo.json()[0]
                lat, lon = float(location["lat"]), float(location["lon"])
                logger.info(f"📍 Found {city}: lat={lat}, lon={lon}")
    except Exception as e:
        logger.warning(f"Geocoding failed for {city}: {e}")
    
    # إذا فشل تحديد الإحداثيات، استخدم القاهرة كافتراضي
    if lat is None or lon is None:
        lat, lon = 30.0444, 31.2357  # القاهرة
        logger.info(f"📍 Using default location: Cairo")
    
    # المحاولة عبر Open-Meteo (مجاني، لا يحتاج مفتاح)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current_weather": True,
                }
            )
            if resp.status_code == 200:
                c = resp.json()["current_weather"]
                result = {
                    "city": city,
                    "temperature": c["temperature"],
                    "windspeed": c["windspeed"],
                    "description": _weather_desc(c.get("weathercode", 0), lang),
                    "source": "open-meteo",
                }
                logger.info(f"🌤️ Weather for {city}: {result['temperature']}°C, {result['description']}")
                return result
    except Exception as e:
        logger.warning(f"Open-Meteo failed: {e}")
    
    # المحاولة عبر OpenWeatherMap (احتياطي)
    for key in OPENWEATHER_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "q": search_city,
                        "appid": key,
                        "units": "metric",
                        "lang": "ar" if lang == "ar" else "en",
                    }
                )
                if resp.status_code == 200:
                    d = resp.json()
                    result = {
                        "city": city,
                        "temperature": d["main"]["temp"],
                        "windspeed": d.get("wind", {}).get("speed", 0),
                        "humidity": d["main"].get("humidity", 0),
                        "description": d["weather"][0]["description"] if d.get("weather") else "غير معروف",
                        "source": "openweathermap",
                    }
                    logger.info(f"🌤️ Weather for {city}: {result['temperature']}°C, {result['description']}")
                    return result
        except Exception as e:
            logger.warning(f"OpenWeatherMap failed: {e}")
            continue
    
    return {"error": "تعذر جلب الطقس", "city": city}

def _weather_desc(code: int, lang: str = "ar") -> str:
    """ترجمة رموز الطقس إلى العربية أو الإنجليزية"""
    codes = {
        0: {"ar": "سماء صافية", "en": "Clear sky"},
        1: {"ar": "غائم جزئياً", "en": "Partly cloudy"},
        2: {"ar": "غائم", "en": "Cloudy"},
        3: {"ar": "غائم كلياً", "en": "Overcast"},
        45: {"ar": "ضباب", "en": "Fog"},
        48: {"ar": "ضباب متجمد", "en": "Freezing fog"},
        51: {"ar": "رذاذ خفيف", "en": "Light drizzle"},
        53: {"ar": "رذاذ متوسط", "en": "Moderate drizzle"},
        55: {"ar": "رذاذ كثيف", "en": "Dense drizzle"},
        61: {"ar": "أمطار خفيفة", "en": "Light rain"},
        63: {"ar": "أمطار متوسطة", "en": "Moderate rain"},
        65: {"ar": "أمطار غزيرة", "en": "Heavy rain"},
        71: {"ar": "ثلوج خفيفة", "en": "Light snow"},
        73: {"ar": "ثلوج متوسطة", "en": "Moderate snow"},
        75: {"ar": "ثلوج غزيرة", "en": "Heavy snow"},
        80: {"ar": "زخات مطر", "en": "Rain showers"},
        95: {"ar": "عاصفة رعدية", "en": "Thunderstorm"},
        96: {"ar": "عاصفة رعدية مع برد", "en": "Thunderstorm with hail"},
        99: {"ar": "عاصفة رعدية شديدة", "en": "Severe thunderstorm"},
    }
    info = codes.get(code, {"ar": "غير معروف", "en": "Unknown"})
    return info.get(lang, info["ar"])

# ========== الأخبار ==========
async def get_news(country: str = "us", lang: str = "en") -> Dict[str, Any]:
    for key in NEWS_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://newsapi.org/v2/top-headlines",
                    params={"country": country, "apiKey": key, "pageSize": 5}
                )
                if resp.status_code == 200:
                    articles = resp.json().get("articles", [])
                    if articles:
                        return {
                            "articles": [
                                {"title": a["title"], "url": a["url"], "source": a.get("source", {}).get("name", "")}
                                for a in articles[:5]
                            ],
                            "source": "newsapi",
                        }
        except: continue

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            endpoint = "بوابة:الأحداث_الجارية" if lang == "ar" else "Portal:Current_events"
            resp = await client.get(f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{endpoint}")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "articles": [{"title": data.get("title", "آخر الأحداث"), "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""), "source": "wikipedia"}],
                    "source": "wikipedia",
                }
    except: pass
    return {"articles": [], "source": "none"}

# ========== يوتيوب ==========
async def search_youtube(query: str, max_results: int = 3, lang: str = "ar") -> Optional[str]:
    for instance in ["https://inv.nadeko.net", "https://yewtu.be"]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{instance}/api/v1/search",
                    params={"q": query, "type": "video", "sort": "relevance"}
                )
                if resp.status_code == 200 and resp.json():
                    items = resp.json()
                    results = [
                        f"🎬 **{i['title']}**\n   🔗 https://youtube.com/watch?v={i['videoId']}"
                        for i in items[:max_results] if i.get("videoId")
                    ]
                    if results: return "\n\n".join(results)
        except: continue

    for key in YOUTUBE_API_KEYS:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={"key": key, "q": query, "part": "snippet", "type": "video", "maxResults": max_results}
                )
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    if items:
                        return "\n\n".join(
                            f"🎬 **{i['snippet']['title']}**\n   🔗 https://youtube.com/watch?v={i['id']['videoId']}"
                            for i in items[:max_results]
                        )
        except: continue
    return None

logger.info("✅ External Services v8.1 initialized with enhanced Arabic weather")

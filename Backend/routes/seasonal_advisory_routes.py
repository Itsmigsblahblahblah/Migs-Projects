"""
Seasonal Crop Advisory API endpoint
Provides AI-powered seasonal crop recommendations for Majayjay farmers
Uses Open-Meteo for weather data and Gemini for crop explanations
"""

from fastapi import APIRouter, HTTPException
import os
import httpx
import logging
import json
from datetime import datetime, timedelta
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
app = APIRouter(prefix="/advisories", tags=["advisories"])

# Global cache for seasonal advisory (monthly refresh)
_seasonal_advisory_cache = None
_cache_timestamp = None
CACHE_DURATION_DAYS = 30  # Cache for 30 days (monthly refresh)

# Check environment - disable cache in development for fresh content
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
USE_CACHE = ENVIRONMENT == 'production'  # Only cache in production

# Majayjay coordinates
LATITUDE = 14.1463
LONGITUDE = 121.4729

# Canonical 30 crops from the system (Frontend/src/utils/cropUtils.ts)
CANONICAL_CROPS = [
    # Leafy Vegetables
    {"name": "Pechay", "category": "Leafy Vegetables"},
    {"name": "Mustasa", "category": "Leafy Vegetables"},
    {"name": "Lettuce", "category": "Leafy Vegetables"},
    {"name": "Cabbage", "category": "Leafy Vegetables"},
    {"name": "Spinach", "category": "Leafy Vegetables"},
    {"name": "Pak choi", "category": "Leafy Vegetables"},

    # Lowland Vegetables (Fruiting)
    {"name": "Ampalaya", "category": "Lowland Vegetables"},
    {"name": "Okra", "category": "Lowland Vegetables"},
    {"name": "Tomato", "category": "Lowland Vegetables"},
    {"name": "Upo", "category": "Lowland Vegetables"},
    {"name": "Patola", "category": "Lowland Vegetables"},
    {"name": "Sitaw", "category": "Lowland Vegetables"},
    {"name": "Beans", "category": "Lowland Vegetables"},
    {"name": "Cucumber", "category": "Lowland Vegetables"},
    {"name": "Squash", "category": "Lowland Vegetables"},
    {"name": "Siling Labuyo", "category": "Lowland Vegetables"},
    {"name": "Siling Haba", "category": "Lowland Vegetables"},
    {"name": "Sayote", "category": "Lowland Vegetables"},
    {"name": "Labanos", "category": "Lowland Vegetables"},
    {"name": "Talong", "category": "Lowland Vegetables"},
    {"name": "Pipino", "category": "Lowland Vegetables"},

    # Upland Vegetables (High-Value)
    {"name": "Celery", "category": "Upland Vegetables"},
    {"name": "Kangkong", "category": "Upland Vegetables"},

    # Root Crops
    {"name": "Gabi", "category": "Root Crops"},
    {"name": "Kamote", "category": "Root Crops"},
    {"name": "Cassava", "category": "Root Crops"},
    {"name": "Ube", "category": "Root Crops"},

    # Grains
    {"name": "Rice", "category": "Grains"},

    # Herbs
    {"name": "Ginger", "category": "Herbs"},
    {"name": "Turmeric", "category": "Herbs"}
]

# Season classification by month (Philippine pattern fallback)
WET_SEASON_MONTHS = [6, 7, 8, 9, 10, 11]  # Jun-Nov
DRY_SEASON_MONTHS = [12, 1, 2, 3, 4, 5]   # Dec-May

MONTH_NAMES = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
}


def get_season_from_rainfall(avg_rainfall_mm: float, current_month: int) -> str:
    """
    Determine season based on average rainfall in mm
    """
    if avg_rainfall_mm >= 150:
        return "Wet Season"
    elif avg_rainfall_mm >= 50:
        # Transition period - use month pattern
        return "Wet Season" if current_month in WET_SEASON_MONTHS else "Dry Season"
    else:
        return "Dry Season"


def get_season_timeframe(season: str, current_month: int, current_year: int) -> dict:
    """
    Calculate season timeframe with start and end months
    """
    if season == "Wet Season":
        start_month = 6
        start_year = current_year
        end_month = 11
        end_year = current_year

        # If we're past November, wet season is next year
        if current_month > 11:
            start_year = current_year + 1
            end_year = current_year + 1
    else:  # Dry Season
        start_month = 12
        start_year = current_year - 1 if current_month < 6 else current_year
        end_month = 5
        end_year = current_year if current_month < 6 else current_year + 1

    # Format display string
    if start_year == end_year:
        display = f"{MONTH_NAMES[start_month]} - {MONTH_NAMES[end_month]} {end_year}"
    else:
        display = f"{MONTH_NAMES[start_month]} {start_year} - {MONTH_NAMES[end_month]} {end_year}"

    return {
        "startMonth": MONTH_NAMES[start_month],
        "startYear": start_year,
        "endMonth": MONTH_NAMES[end_month],
        "endYear": end_year,
        "display": display
    }


async def fetch_rainfall_data() -> Optional[float]:
    """
    Fetch average rainfall data from Open-Meteo API
    Returns average rainfall in mm for the current month
    """
    try:
        # Get current month and previous month for average
        now = datetime.now()
        current_month = now.month

        # Open-Meteo API for historical rainfall (past 30 days)
        url = f"https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "daily": "precipitation_sum",
            "past_days": 30,
            "forecast_days": 1
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)

            if response.status_code != 200:
                logger.error(f"Open-Meteo API error: {response.status_code}")
                return None

            data = response.json()

            if "daily" not in data or "precipitation_sum" not in data["daily"]:
                logger.error("Invalid Open-Meteo response format")
                return None

            # Calculate average rainfall from past 30 days
            rainfall_data = data["daily"]["precipitation_sum"]
            valid_rainfall = [
                r for r in rainfall_data if r is not None and r >= 0]

            if not valid_rainfall:
                return 0.0

            avg_rainfall = sum(valid_rainfall) / len(valid_rainfall)
            return avg_rainfall

    except Exception as e:
        logger.error(f"Failed to fetch rainfall data: {e}")
        return None


async def generate_gemini_explanations(season: str, crops_by_category: dict) -> dict:
    """
    Use Gemini to generate explanations for why crops are suitable for the season
    Returns dict with crop explanations
    Uses key rotation to prevent rate limiting and handle compromised keys
    """
    # Get all available Gemini API keys
    gemini_keys = []
    for i in range(1, 7):
        key = os.environ.get(f'GEMINI_API_KEY_{i}')
        if key:
            gemini_keys.append(key)

    if not gemini_keys:
        logger.error("No Gemini API keys configured")
        return None

    logger.info("Gemini API keys loaded (keys hidden for security)")

    # Prepare crops list for prompt
    crops_text = ""
    for category, crops in crops_by_category.items():
        crops_text += f"\n{category}: {', '.join(crops)}"

    prompt = f"""
You are an agricultural expert for Majayjay, Laguna, Philippines. 

IMPORTANT: Respond in NATURAL, CONVERSATIONAL TAGALOG (Filipino). Use simple, everyday words that farmers use. DO NOT use deep, formal, or academic Tagalog. Keep it casual and practical.

Current season: {season}

Provide brief explanations for why these crops are suitable for planting during this season in Majayjay:
{crops_text}

For each crop, provide:
1. Why it belongs to that category (simple explanation)
2. Why it's suitable for the current season in Majayjay - INCLUDE CONDITIONAL LOGIC (e.g., "with irrigation", "needs partial shade", "rain-tolerant", "drought-resistant", etc.)
3. One practical planting tip (easy to follow advice)

Respond ONLY in valid JSON format (no markdown, no explanation):
{{
  "explanations": {{
    "Pechay": {{
      "category_reason": "...",
      "season_suitability": "...with irrigation...",
      "planting_tip": "..."
    }},
    ...for each crop...
  }}
}}

EXAMPLES OF GOOD EXPLANATIONS (natural Tagalog with conditional logic):
- "Ang pechay ay tumutubo nang mabilis sa Dry Season KUNG MAY REGULAR NA DILAG. With irrigation, perfect siya for quick harvest."
- "Ang okra ay heat-tolerant, kaya sa tag-init MAS MARAMI ANG BUNGA. With full sun, sobrang productive niya."
- "Ang lettuce ay gusto ng cool weather pero KUNG MAY PARTIAL SHADE, pwede pa rin sa tag-init."
- "Ang gabi ay thrives sa Wet Season kasi gusto niya ang moist soil. Kung maulan, sobrang laki ng corm."

Keep explanations:
- SHORT (1-2 sentences max per field)
- NATURAL Tagalog (conversational, not formal)
- PRACTICAL (actionable advice farmers can use)
- INCLUDE CONDITIONS (irrigation, shade, drainage, etc.)
- SPECIFIC to Philippine farming conditions
"""

    # Try each key in rotation (skip compromised ones)
    last_error = None
    for idx, gemini_api_key in enumerate(gemini_keys):
        try:
            logger.debug("Attempting Gemini API call")

            # Call Gemini API
            gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

            headers = {"Content-Type": "application/json"}
            request_body = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 4096
                }
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{gemini_url}?key={gemini_api_key}",
                    headers=headers,
                    json=request_body
                )

                if response.status_code != 200:
                    error_msg = f"Gemini API error: {response.status_code}"
                    if 'leaked' in response.text.lower():
                        logger.error(
                            f"{error_msg} - Key COMPROMISED, trying next key...")
                        last_error = Exception("Key compromised")
                        continue  # Try next key
                    else:
                        logger.error(f"{error_msg} - {response.text[:100]}")
                        last_error = Exception(error_msg)
                        continue  # Try next key

                logger.info("Gemini API call successful, parsing response...")
                data = response.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]

                # Extract JSON
                json_start = text_response.find('{')
                json_end = text_response.rfind('}') + 1
                if json_start == -1 or json_end == 0:
                    logger.error("Failed to extract JSON from Gemini response")
                    last_error = Exception("JSON extraction failed")
                    continue  # Try next key

                json_str = text_response[json_start:json_end]
                result = json.loads(json_str)

                explanations = result.get("explanations", {})
                logger.info(
                    f"Gemini generated {len(explanations)} crop explanations")
                return explanations

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            last_error = e
            continue  # Try next key

    # If we get here, all keys failed
    logger.error(f"All Gemini API keys failed. Last error: {last_error}")
    return None


def get_fallback_explanations(crops_by_category: dict, season: str) -> dict:
    """
    Generate UNIQUE explanations for each crop in natural Tagalog
    Each crop gets a specific explanation based on its characteristics
    """
    explanations = {}

    # Crop-specific explanations for uniqueness
    crop_specific_info = {
        # Leafy Vegetables
        "Pechay": {
            "category_reason": "Madali lang ang pechay - maliit na dahon, mabilis tumubo, 30-45 days pwede na anihin.",
            "Wet Season": "Gusto ng pechay ang maraming tubig, sa tag-ulan sobrang bilis ng pagtubo.",
            "Dry Season": "Sa tag-init, dapat araw-araw ang dilag sa pechay para hindi magtuyo ang dahon.",
            "tip": "Magtanim ng pechay every 2 weeks para may continuous harvest."
        },
        "Mustasa": {
            "category_reason": "Ang mustasa ay may maanghang na lasa, perfect sa sinigang at ibang Filipino dishes.",
            "Wet Season": "Sa tag-ulan, mas mabilis lumaki ang mustasa at mas marami ang dahon.",
            "Dry Season": "Sa tagtuyo, medyo mapait ang mustasa kung kulang sa tubig.",
            "tip": "Pwede itanim ang mustasa sa gilid ng ibang crops para natural pest control."
        },
        "Lettuce": {
            "category_reason": "Ang lettuce ay crunchy at fresh, perfect sa salads at sandwiches.",
            "Wet Season": "Sa tag-ulan, medyo madaling mabulok ang lettuce kung masyadong basa ang dahon.",
            "Dry Season": "Gusto ng lettuce ng cool mornings sa tag-init, magtanim ng maaga sa araw.",
            "tip": "Gamitin ang shade net sa lettuce para hindi matuyo sa araw."
        },
        "Cabbage": {
            "category_reason": "Ang repolyo ay may tight head ng leaves, pangmatagalan ang pagtubo ng 2-3 months.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang repolyo pero banta ang fungi sa mga dahon.",
            "Dry Season": "Sa tag-init, kailangan ng regular watering ang repolyo para maging compact ang head.",
            "tip": "Maglagay ng mulch sa repolyo para maging moist ang lupa."
        },
        "Spinach": {
            "category_reason": "Ang spinach ay nutritious na leafy green, rich in iron at vitamins.",
            "Wet Season": "Gusto ng spinach ang cool weather sa tag-ulan, sobrang dali ng pagtubo.",
            "Dry Season": "Sa tag-init, madaling mag-bolt ang spinach (mag-flower) na nagpapait ng lasa.",
            "tip": "Harvest spinach early sa umaga bago pa uminit ang araw."
        },
        "Pak choi": {
            "category_reason": "Ang pak choi ay may malalaking dahon at thick stalks, staple sa Asian cooking.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang pak choi at mas malalaki ang leaves.",
            "Dry Season": "Sa tagtuyo, kailangan ng consistent moisture ang pak choi para hindi maging bitter.",
            "tip": "Pak choi is best planted sa late afternoon para hindi masyadong mainit."
        },
        "Kangkong": {
            "category_reason": "Ang kangkong ay semi-aquatic, pwede sa lupa o sa tubig, sobrang resilient.",
            "Wet Season": "Sa tag-ulan, parang damo lang ang kangkong - kahit saan tumutubo!",
            "Dry Season": "Kahit tag-init, kaya pa rin ng kangkong basta may tubig sa ugat.",
            "tip": "Kangkong can grow in just water - perfect for container gardening."
        },
        "Celery": {
            "category_reason": "Ang celery ay may crisp stalks, matagal ang growing period ng 3-4 months.",
            "Wet Season": "Sa tag-ulan, mas mabilis lumaki ang celery sa cool climate.",
            "Dry Season": "Sa tag-init, kailangan ng partial shade ang celery para hindi maging bitter.",
            "tip": "Harvest celery from the outside stalks first para tumuloy ang pagtubo."
        },

        # Lowland Vegetables
        "Ampalaya": {
            "category_reason": "Ang ampalaya ay climbing vine, kailangan ng trellis o bakod para sumanga.",
            "Wet Season": "Sa tag-ulan, maraming bunga ang ampalaya pero banta ang powdery mildew.",
            "Dry Season": "Sa tag-init, mas matamis ang ampalaya kung may sapat na tubig.",
            "tip": "Magtanim ng ampalaya sa gilid ng bakod para natural na trellis."
        },
        "Okra": {
            "category_reason": "Ang okra ay may green pods, gusto ng mainit na panahon para tumubo.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang okra pero pwedeng mabulok ang roots.",
            "Dry Season": "Gusto ng okra ang tag-init - mas marami ang bunga sa mainit na panahon.",
            "tip": "Harvest okra when 2-3 inches pa para tender pa."
        },
        "Tomato": {
            "category_reason": "Ang kamatis ay fruit vegetable, maraming varieties sa Majayjay.",
            "Wet Season": "Sa tag-ulan, madaling magka-fungus ang tomato kung masyadong basa.",
            "Dry Season": "Sa tag-init, mas matamis ang tomatoes basta regular ang watering.",
            "tip": "Magtanim ng tomato sa may slight slope para maayos ang drainage."
        },
        "Upo": {
            "category_reason": "Ang upo ay gourd na may mahabang vine, pwedeng mag-ugat sa nodes.",
            "Wet Season": "Sa tag-ulan, sobrang bilis ng pag-extend ng vines ng upo.",
            "Dry Season": "Sa tag-init, mas matamis ang upo kung controlled ang watering.",
            "tip": "Upo can be trained to climb trees or structures for vertical growing."
        },
        "Patola": {
            "category_reason": "Ang patola ay ridge gourd, may distinctive ridges sa balat.",
            "Wet Season": "Sa tag-ulan, mabilis ang flowering ng patola at maraming bunga.",
            "Dry Season": "Sa tag-init, regular ang flowers ng patola basta may support.",
            "tip": "Patola is best harvested when young and tender pa."
        },
        "Sitaw": {
            "category_reason": "Ang sitaw ay long bean, climbing vine na pwede sa trellis o sa lupa.",
            "Wet Season": "Sa tag-ulan, mabilis ang growth ng sitaw pero banta ang rust sa dahon.",
            "Dry Season": "Sa tagtuyo, consistent ang flowering ng sitaw every 2-3 days.",
            "tip": "Sitaw ay nitrogen fixer - nakakatulong sa iba pang crops."
        },
        "Beans": {
            "category_reason": "Ang beans ay bush o pole variety, rich in protein at fiber.",
            "Wet Season": "Sa tag-ulan, mas mabilis ang pod development ng beans.",
            "Dry Season": "Sa tag-init, kailangan ng regular watering ang beans para ma-set ang pods.",
            "tip": "Beans don't need much fertilizer kasi sila nagfi-fix ng nitrogen."
        },
        "Cucumber": {
            "category_reason": "Ang pipino ay fast-growing vine, 50-70 days mula itanim hanggang ani.",
            "Wet Season": "Sa tag-ulan, maraming bunga ang pipino pero sensitive sa fungal diseases.",
            "Dry Season": "Sa tag-init, mas crunchy ang pipino kung consistent ang moisture.",
            "tip": "Pipino is best planted near corn para may trellis na."
        },
        "Squash": {
            "category_reason": "Ang kalabasa ay sprawling vine, pwede sa flat ground o sa bakod.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang kalabasa pero banta ang vine borers.",
            "Dry Season": "Sa tag-init, mas matamis ang kalabasa at mas matagal ang shelf life.",
            "tip": "Kalabasa leaves can be used to suppress weeds - natural mulch."
        },
        "Siling Labuyo": {
            "category_reason": "Ang siling labuyo ay small but very hot chili, native sa Pilipinas.",
            "Wet Season": "Sa tag-ulan, medyo mabagal ang growth ng labuyo kung masyadong maulan.",
            "Dry Season": "Sa tag-init, mas marami ang bunga ng labuyo at mas maanghang.",
            "tip": "Labuyo can grow for years - it's a perennial crop."
        },
        "Siling Haba": {
            "category_reason": "Ang siling haba ay long green chili, less hot than labuyo but versatile.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang siling haba at mas mahaba ang bunga.",
            "Dry Season": "Sa tag-init, consistent ang flowering ng siling haba every week.",
            "tip": "Siling haba is perfect for Bicol Express at other Filipino dishes."
        },
        "Sayote": {
            "category_reason": "Ang sayote ay perennial vine, pwedeng ani ng 2-3 years kung maayos.",
            "Wet Season": "Sa tag-ulan, sobrang dami ng bunga ng sayote - overload na!",
            "Dry Season": "Sa tag-init, konti ang bunga ng sayote pero mas malalaki.",
            "tip": "Sayote vines can cover an entire trellis - give it space."
        },
        "Labanos": {
            "category_reason": "Ang labanos ay radish, mabilis ang growth - 25-30 days harvest na.",
            "Wet Season": "Sa tag-ulan, mabilis tumubo ang labanos at mas malaki ang root.",
            "Dry Season": "Sa tag-init, regular ang tanim ng labanos para may fresh harvest.",
            "tip": "Labanos is perfect for intercropping kasi mabilis lang."
        },
        "Talong": {
            "category_reason": "Ang talong ay eggplant, one of the most popular vegetables sa Majayjay.",
            "Wet Season": "Sa tag-ulan, maraming bunga ang talong pero banta ang fruit rot.",
            "Dry Season": "Sa tag-init, mas matagal ang shelf life ng talong at mas firm.",
            "tip": "Talong needs consistent watering para hindi maging bitter."
        },
        "Pipino": {
            "category_reason": "Ang pipino ay cucumber, fast-growing at pwede sa any season.",
            "Wet Season": "Sa tag-ulan, mabilis ang vine growth ng pipino at maraming flowers.",
            "Dry Season": "Sa tag-init, mas crunchy ang pipino kung harvested early morning.",
            "tip": "Pipino ay best eaten fresh sa salads o as garnish."
        },

        # Upland Vegetables

        # Root Crops
        "Gabi": {
            "category_reason": "Ang gabi ay root crop na may edible corm at leaves, staple sa Filipino cooking.",
            "Wet Season": "Sa tag-ulan, sobrang laki ng gabi corm kasi gusto niya ang moist soil.",
            "Dry Season": "Sa tag-init, medyo mabagal ang gabi pero pwede pa rin basta may mulch.",
            "tip": "Gabi leaves (laing) are edible too - double harvest!"
        },
        "Kamote": {
            "category_reason": "Ang kamote ay sweet potato, versatile at pwedeng staple food.",
            "Wet Season": "Sa tag-ulan, mabilis ang vine growth ng kamote pero konti ang tubers.",
            "Dry Season": "Sa tag-init, mas matamis ang kamote at mas maraming tubers.",
            "tip": "Kamote vines can be eaten as vegetables (talbos ng kamote)."
        },
        "Cassava": {
            "category_reason": "Ang kamoteng kahoy ay drought-resistant, pwede sa poor soil.",
            "Wet Season": "Sa tag-ulan, mabilis lumaki ang cassava pero banta ang root rot.",
            "Dry Season": "Sa tag-init, mas mataas ang starch content ng cassava.",
            "tip": "Cassava can be stored in the ground for months - harvest as needed."
        },
        "Ube": {
            "category_reason": "Ang ube ay purple yam, high-value crop na sobrang demand sa holidays.",
            "Wet Season": "Sa tag-ulan, mabilis ang vine growth ng ube at mas malaki ang tubers.",
            "Dry Season": "Sa tag-init, mas purple at matamis ang ube kung controlled ang water.",
            "tip": "Ube needs trellis for vines - 6-8 months growing period."
        },

        # Grains
        "Rice": {
            "category_reason": "Ang palay ay staple grain, pinaka-importante sa Filipino agriculture.",
            "Wet Season": "Sa tag-ulan, perfect ang timing para sa palay - rain-fed ang maraming fields.",
            "Dry Season": "Sa tag-init, kailangan ng irrigation ang palay para ma-produce ng mabuti.",
            "tip": "Rice has different varieties - choose based on your area."
        },

        # Herbs
        "Ginger": {
            "category_reason": "Ang luya ay rhizome, essential sa Filipino cooking at medicine.",
            "Wet Season": "Sa tag-ulan, mabilis ang spread ng ginger sa loose, moist soil.",
            "Dry Season": "Sa tag-init, mas matapang ang flavor ng ginger at mas matagal ang shelf life.",
            "tip": "Ginger can be harvested young (tender) or mature (more pungent)."
        },
        "Turmeric": {
            "category_reason": "Ang kunyawa ay bright orange rhizome, used for cooking at natural dye.",
            "Wet Season": "Sa tag-ulan, sobrang laki ng turmeric rhizomes kasi gusto niya ang warm, moist soil.",
            "Dry Season": "Sa tag-init, mas concentrated ang color at flavor ng turmeric.",
            "tip": "Turmeric needs 7-10 months to mature - patience pays off!"
        }
    }

    # Generate explanations for each crop
    for category, crops in crops_by_category.items():
        for crop in crops:
            crop_info = crop_specific_info.get(crop, {})

            explanations[crop] = {
                "category_reason": crop_info.get("category_reason", f"Ito ay {category} base sa growing characteristics nito."),
                "season_suitability": crop_info.get(season, f"Angkop ito para sa {season} sa Majayjay."),
                "planting_tip": crop_info.get("tip", "Sumangguni sa lokal na agricultural office para sa best practices.")
            }

    return explanations


@app.get("/seasonal-crop-advisory")
async def get_seasonal_crop_advisory():
    """
    Get seasonal crop advisory for Majayjay farmers
    Returns current season, timeframe, and recommended crops with explanations
    """
    global _seasonal_advisory_cache, _cache_timestamp

    now = datetime.now()

    # Check cache validity (only in production)
    if USE_CACHE and _seasonal_advisory_cache is not None and _cache_timestamp is not None:
        days_since_update = (now - _cache_timestamp).days
        if days_since_update < CACHE_DURATION_DAYS:
            logger.info("Returning cached seasonal advisory (production mode)")
            return _seasonal_advisory_cache

    try:
        if USE_CACHE:
            logger.info("Generating new seasonal advisory...")
        else:
            logger.info(
                "Generating new seasonal advisory (development mode - no caching)")

        # Step 1: Get rainfall data from Open-Meteo
        avg_rainfall = await fetch_rainfall_data()

        # Step 2: Determine season
        current_month = now.month
        current_year = now.year

        if avg_rainfall is None:
            # Fallback to month-based pattern
            season = "Wet Season" if current_month in WET_SEASON_MONTHS else "Dry Season"
            avg_rainfall = 0.0
        else:
            season = get_season_from_rainfall(avg_rainfall, current_month)

        # Step 3: Get season timeframe
        timeframe = get_season_timeframe(season, current_month, current_year)

        # Step 4: Select ONLY THE BEST crops for the season (not all crops)
        # Each season has different optimal crops based on climate suitability
        if season == "Wet Season":
            # BEST crops for Wet Season (high rainfall, humid, cooler)
            seasonal_crops = {
                # Love water
                "Leafy Vegetables": ["Pechay", "Mustasa", "Spinach", "Kangkong"],
                # Rain-tolerant
                "Lowland Vegetables": ["Ampalaya", "Sitaw", "Squash", "Siling Labuyo"],
                # Thrive in moist soil
                "Root Crops": ["Gabi", "Kamote", "Cassava"],
                "Grains": ["Rice"],  # Perfect for wet season
                "Herbs": ["Ginger", "Turmeric"]  # Like moisture
            }
        else:  # Dry Season
            # BEST crops for Dry Season (less rainfall, needs irrigation, hotter)
            seasonal_crops = {
                # With irrigation
                "Leafy Vegetables": ["Pechay", "Lettuce", "Cabbage"],
                # Heat-tolerant
                "Lowland Vegetables": ["Ampalaya", "Okra", "Tomato", "Talong", "Siling Haba"],
                # Drought-resistant
                "Root Crops": ["Kamote", "Cassava", "Ube"],
                "Herbs": ["Ginger", "Turmeric"]  # With partial shade
            }

        crops_by_category = seasonal_crops

        # Step 5: Generate explanations with Gemini
        explanations = await generate_gemini_explanations(season, crops_by_category)

        # Fallback if Gemini fails
        if explanations is None:
            explanations = get_fallback_explanations(crops_by_category, season)

        # Step 6: Build response
        categories = []
        for category_name, crops in crops_by_category.items():
            category_crops = []
            for crop in crops:
                explanation = explanations.get(crop, {
                    "category_reason": f"Ito ay {category_name} base sa kung paano ito tumubo.",
                    "season_suitability": f"Angkop ito para sa {season} sa Majayjay.",
                    "planting_tip": "Sumangguni sa lokal na agricultural office para sa tamang pagtatanim."
                })

                category_crops.append({
                    "name": crop,
                    "explanation": explanation.get("season_suitability", ""),
                    "category_reason": explanation.get("category_reason", ""),
                    "planting_tip": explanation.get("planting_tip", "")
                })

            categories.append({
                "name": category_name,
                "crops": category_crops
            })

        advisory = {
            "currentSeason": season,
            "seasonTimeFrame": timeframe,
            "averageRainfallMM": round(avg_rainfall, 2) if avg_rainfall else 0,
            "lastUpdated": now.isoformat(),
            "source": "Open-Meteo + Gemini",
            "categories": categories
        }

        # Update cache
        _seasonal_advisory_cache = advisory
        _cache_timestamp = now

        logger.info(f"Seasonal advisory generated for {season}")
        return advisory

    except Exception as e:
        logger.error(f"Failed to generate seasonal advisory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate seasonal crop advisory: {str(e)}"
        )

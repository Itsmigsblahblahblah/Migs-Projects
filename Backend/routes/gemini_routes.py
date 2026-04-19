"""
Secure Gemini API proxy with server-side key rotation
This endpoint allows the frontend to use Gemini API without exposing API keys
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import httpx
import logging
import random
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
app = APIRouter(prefix="/gemini", tags=["gemini"])

# Load all Gemini API keys from environment variables
GEMINI_API_KEYS = []


def load_gemini_keys():
    """Load Gemini API keys from environment variables"""
    global GEMINI_API_KEYS
    GEMINI_API_KEYS = []

    for i in range(1, 7):  # Support up to 6 keys
        key = os.environ.get(f'GEMINI_API_KEY_{i}')
        if key:
            GEMINI_API_KEYS.append(key)

    if not GEMINI_API_KEYS:
        logger.warning("No Gemini API keys loaded from environment!")
    else:
        logger.info(f"Loaded {len(GEMINI_API_KEYS)} Gemini API keys")


# Load keys on module initialization
load_gemini_keys()

# Current index for key rotation
_current_key_index = 0


def get_next_api_key() -> Optional[str]:
    """Get the next API key in rotation"""
    global _current_key_index

    if not GEMINI_API_KEYS:
        return None

    key = GEMINI_API_KEYS[_current_key_index]
    _current_key_index = (_current_key_index + 1) % len(GEMINI_API_KEYS)
    return key


class GeminiRequest(BaseModel):
    """Request model for Gemini API"""
    contents: list
    generationConfig: Optional[dict] = None
    safetySettings: Optional[list] = None


class GeminiResponse(BaseModel):
    """Response model for Gemini API"""
    candidates: Optional[list] = None
    error: Optional[dict] = None


@app.post("/generate-content")
async def generate_content(request: GeminiRequest):
    """
    Proxy endpoint for Gemini API with server-side key rotation

    This endpoint:
    1. Receives the Gemini API request from frontend
    2. Adds a rotating API key on the server side
    3. Forwards the request to Gemini API
    4. Returns the response to frontend
    """
    global _current_key_index

    try:
        # Get the next API key in rotation
        api_key = get_next_api_key()

        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="No Gemini API keys configured. Please check server environment variables."
            )

        # Forward request to Gemini API
        gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

        headers = {
            "Content-Type": "application/json",
        }

        request_body = {
            "contents": request.contents,
        }

        if request.generationConfig:
            request_body["generationConfig"] = request.generationConfig

        if request.safetySettings:
            request_body["safetySettings"] = request.safetySettings

        # Make request to Gemini API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{gemini_url}?key={api_key}",
                headers=headers,
                json=request_body
            )

            if response.status_code != 200:
                logger.error(
                    f"Gemini API error: {response.status_code} - {response.text}")

                # Return error but don't expose the API key
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Gemini API error: {response.status_code}"
                )

            # Return successful response
            return response.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Gemini proxy: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while calling Gemini API"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint for Gemini proxy"""
    return {
        "status": "healthy",
        "service": "Gemini API Proxy",
        "keys_loaded": len(GEMINI_API_KEYS),
        "current_key_index": _current_key_index
    }


@app.get("/status")
async def api_key_status():
    """
    Get status of API key rotation (for debugging/monitoring)
    Does NOT expose the actual keys
    """
    return {
        "total_keys": len(GEMINI_API_KEYS),
        "current_key_index": _current_key_index,
        "keys_configured": len(GEMINI_API_KEYS) > 0,
        "key_indices": list(range(len(GEMINI_API_KEYS)))
    }

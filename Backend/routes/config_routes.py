"""
Configuration endpoint for frontend
DEPRECATED: Frontend now uses environment variables directly for Firebase config.
This endpoint is kept only for backward compatibility and monitoring purposes.
"""

from fastapi import APIRouter
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
app = APIRouter(prefix="/config", tags=["config"])


@app.get("/firebase")
async def get_firebase_config():
    """
    DEPRECATED: This endpoint is no longer used by the frontend for Firebase initialization.
    Frontend now uses environment variables (VITE_FIREBASE_*) directly.

    This endpoint is kept for backward compatibility and monitoring only.
    Returns a deprecation notice.
    """
    return {
        "success": False,
        "message": "This endpoint is deprecated. Frontend now uses environment variables directly for Firebase configuration.",
        "status": "deprecated"
    }

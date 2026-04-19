"""
Configuration endpoint for frontend
Serves Firebase config (safe to expose - uses server-side security rules)
"""

from fastapi import APIRouter
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
app = APIRouter(prefix="/config", tags=["config"])


@app.get("/firebase")
async def get_firebase_config():
    """
    Return Firebase configuration for frontend use
    These values are needed by Firebase client SDK and are safe to expose
    Firebase uses server-side security rules for protection
    """
    firebase_config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.environ.get("FIREBASE_APP_ID", ""),
        "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", "")
    }
    
    # Verify all values are present
    missing_keys = [key for key, value in firebase_config.items() if not value]
    if missing_keys:
        logger.warning(f"Missing Firebase config values: {missing_keys}")
    
    return {
        "success": True,
        "config": firebase_config
    }

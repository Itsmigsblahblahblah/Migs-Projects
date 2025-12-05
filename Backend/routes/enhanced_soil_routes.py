"""
API routes for enhanced soil analysis and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.enhanced_soil_crop_service import EnhancedSoilCropTransformer
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/enhanced-soil", tags=["enhanced-soil"])

# Global model instance
model = EnhancedSoilCropTransformer()
try:
    model.load_model('models/enhanced_soil_crop_transformer.keras',
                     'models/enhanced_soil_preprocessing_pipeline.pkl')
    logger.info("Enhanced model loaded successfully")
    logger.info(f"Model object: {model}")
    logger.info(f"Model.model object: {model.model}")
    logger.info(f"Model type: {type(model)}")
except Exception as e:
    logger.error(f"Failed to load enhanced model: {e}")
    import traceback
    logger.error(traceback.format_exc())
    model = None


@app.get("/")
async def root():
    return {"message": "Soil Crop Recommendation API",
            "description": "POST /enhanced-recommend to get crop recommendations based on soil, weather, and market data"}


@app.post("/enhanced-recommend")
async def enhanced_recommend_crops(data: dict):
    """
    Get crop recommendations based on soil, weather, and market data

    Expected input format:
    {
        "soil_data": {
            "pH": 6.5,
            "Nitrogen": "M",  # L, M, or H
            "Phosphorus": "L",  # L, M, or H
            "Potassium": "H"   # L, M, or H
        },
        "weather_data": {
            "temperature": 28.5,
            "humidity": 65,
            "precipitation_probability": 20,
            "wind_speed": 10,
            "uv_index": 7
        },
        "market_context": {
            "season": "dry",  # or "wet"
            "month": 6  # 1-12
        }
    }

    Returns:
    {
        "recommended_crops": [
            {
                "crop": "Rice", 
                "confidence": 0.85,
                "market_demand_score": 0.75
            },
            {
                "crop": "Corn", 
                "confidence": 0.12,
                "market_demand_score": 0.60
            },
            {
                "crop": "Vegetable Legumes", 
                "confidence": 0.03,
                "market_demand_score": 0.45
            }
        ]
    }
    """
    logger.info(f"Received request data: {data}")
    try:
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        if 'soil_data' not in data:
            raise HTTPException(
                status_code=400, detail="Missing soil_data in request")

        soil_data = data.get('soil_data', {})
        weather_data = data.get('weather_data', {})
        market_context = data.get('market_context', {})

        # Validate soil data
        required_soil_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        for field in required_soil_fields:
            if field not in soil_data:
                raise HTTPException(
                    status_code=400, detail=f"Missing required soil field: {field}")

        # Validate categorical values
        valid_levels = ['L', 'M', 'H']
        for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
            if soil_data[field] not in valid_levels:
                raise HTTPException(
                    status_code=400, detail=f"Invalid value for soil {field}. Must be L, M, or H")

        # Validate pH range
        if not (0 <= soil_data['pH'] <= 14):
            raise HTTPException(
                status_code=400, detail="pH must be between 0 and 14")

        # Add a timeout to prevent hanging requests
        import asyncio
        try:
            logger.info(
                f"Calling model.predict with soil_data: {soil_data}, weather_data: {weather_data}, market_context: {market_context}")
            # Get predictions with data with a 5-second timeout
            predictions = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, model.predict,
                                                         soil_data, weather_data, market_context),
                timeout=5.0
            )
            logger.info(f"Predictions received: {predictions}")
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=500, detail="Prediction took too long. Please try again.")

        # Format response
        recommended_crops = [
            {
                "crop": crop,
                "confidence": float(confidence),
                "market_demand_score": float(market_score)
            }
            for crop, confidence, market_score in predictions
        ]

        return {"recommended_crops": recommended_crops}

    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/health")
async def health_check():
    logger.info(
        f"Health check - model: {model}, model.model: {getattr(model, 'model', None)}")
    return {"status": "healthy", "model_loaded": model is not None and model.model is not None}

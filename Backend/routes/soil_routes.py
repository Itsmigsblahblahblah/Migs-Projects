"""
API routes for soil analysis and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.soil_crop_service import SoilCropTransformer
import pandas as pd
import logging
import threading

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/soil", tags=["soil"])

# Global cached datasets (lazy-loaded)
_soil_data_cache = None
_soil_data_lock = threading.Lock()


def _get_soil_data_cache(file_path: str = 'Data/brgy_soil_dataset.csv'):
    """Thread-safe lazy loader for soil dataset cache"""
    global _soil_data_cache

    if _soil_data_cache is not None:
        return _soil_data_cache

    with _soil_data_lock:
        if _soil_data_cache is None:
            try:
                logger.info("Loading soil dataset cache (first request)...")
                _soil_data_cache = pd.read_csv(file_path)
                _soil_data_cache = _soil_data_cache.dropna()
                logger.info(
                    f"Soil dataset cached: {_soil_data_cache.shape[0]} rows")
            except Exception as e:
                logger.error(f"Failed to load soil dataset: {e}")
                _soil_data_cache = pd.DataFrame()  # Empty DataFrame on failure

    return _soil_data_cache


# Global model instance (initially None for lazy loading)
model = None
_model_lock = threading.Lock()


def _load_model_if_needed():
    """Lazy load the model on first use (thread-safe with real lock)"""
    global model

    if model is not None:
        return

    with _model_lock:
        if model is None:
            try:
                logger.info("Loading soil model (first request)...")
                loaded_model = SoilCropTransformer()
                loaded_model.load_model('models/soil_crop_transformer.keras',
                                        'models/soil_preprocessing_pipeline.pkl')
                model = loaded_model
                logger.info("Soil model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load soil model: {e}")
                model = None
                raise


@app.get("/")
async def root():
    return {"message": "Soil Crop Recommendation API",
            "description": "POST /recommend to get crop recommendations based on soil data"}


@app.post("/recommend")
async def recommend_crops(soil_data: dict):
    """
    Get crop recommendations based on soil data

    Expected input format:
    {
        "pH": 6.5,
        "Nitrogen": "M",  # L, M, or H
        "Phosphorus": "L",  # L, M, or H
        "Potassium": "H"   # L, M, or H
    }

    Returns:
    {
        "recommended_crops": [
            {"crop": "Rice", "confidence": 0.85},
            {"crop": "Corn", "confidence": 0.12},
            {"crop": "Vegetable Legumes", "confidence": 0.03}
        ]
    }
    """
    try:
        # Lazy load model on first use
        _load_model_if_needed()

        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        required_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        for field in required_fields:
            if field not in soil_data:
                raise HTTPException(
                    status_code=400, detail=f"Missing required field: {field}")

        # Validate categorical values
        valid_levels = ['L', 'M', 'H']
        for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
            if soil_data[field] not in valid_levels:
                raise HTTPException(
                    status_code=400, detail=f"Invalid value for {field}. Must be L, M, or H")

        # Validate pH range
        if not (0 <= soil_data['pH'] <= 14):
            raise HTTPException(
                status_code=400, detail="pH must be between 0 and 14")

        # Get predictions
        predictions = model.predict(soil_data)

        # Format response
        recommended_crops = [
            {"crop": crop, "confidence": float(confidence)}
            for crop, confidence in predictions
        ]

        return {"recommended_crops": recommended_crops}

    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/recommend-with-weather")
async def recommend_crops_with_weather(data: dict):
    """
    Get crop recommendations based on soil and weather data

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
        }
    }

    Returns:
    {
        "recommended_crops": [
            {"crop": "Rice", "confidence": 0.85},
            {"crop": "Corn", "confidence": 0.12},
            {"crop": "Vegetable Legumes", "confidence": 0.03}
        ]
    }
    """
    try:
        # Lazy load model on first use
        _load_model_if_needed()

        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        if 'soil_data' not in data:
            raise HTTPException(
                status_code=400, detail="Missing soil_data in request")

        if 'weather_data' not in data:
            raise HTTPException(
                status_code=400, detail="Missing weather_data in request")

        soil_data = data['soil_data']
        weather_data = data['weather_data']

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

        # Get predictions with weather data
        predictions = model.predict_with_weather(soil_data, weather_data)

        # Format response
        recommended_crops = [
            {"crop": crop, "confidence": float(confidence)}
            for crop, confidence in predictions
        ]

        return {"recommended_crops": recommended_crops}

    except Exception as e:
        logger.error(f"Error in weather-enhanced prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/health")
async def health_check():
    """Lightweight health check - does NOT load models"""
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/soil-data/{barangay}")
async def get_soil_data(barangay: str, soil_file: str = 'Data/brgy_soil_dataset.csv'):
    """
    Get soil data for a specific barangay

    Args:
        barangay (str): Name of the barangay

    Returns:
        dict: Soil data for the barangay or empty dict if not found
    """
    try:
        # Use cached dataset instead of loading from file every time
        soil_df = _get_soil_data_cache(soil_file)

        if soil_df.empty:
            return {"soil_data": {}}

        # Find matching barangay (case insensitive partial match)
        matching_rows = soil_df[soil_df['Address'].str.contains(
            barangay, case=False, na=False)]

        if not matching_rows.empty:
            # Get the first matching row
            row = matching_rows.iloc[0]
            soil_data = {
                "pH": float(row['pH']),
                "Nitrogen": row['Nitrogen(N)'],
                "Phosphorus": row['Phosphorus(P)'],
                "Potassium": row['Potassium(K)']
            }
            return {"soil_data": soil_data}
        else:
            # Return empty data if not found
            return {"soil_data": {}}

    except Exception as e:
        logger.error(f"Error fetching soil data for {barangay}: {str(e)}")
        return {"soil_data": {}}

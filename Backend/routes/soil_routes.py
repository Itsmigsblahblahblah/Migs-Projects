"""
API routes for soil analysis and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.soil_crop_service import SoilCropTransformer
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="", tags=["soil"])

# Global model instance
model = SoilCropTransformer()
try:
    model.load_model('models/fert_soil_transformer.h5', 'models/preprocessing_pipeline.pkl')
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

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
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        # Validate input
        required_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        for field in required_fields:
            if field not in soil_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate categorical values
        valid_levels = ['L', 'M', 'H']
        for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
            if soil_data[field] not in valid_levels:
                raise HTTPException(status_code=400, detail=f"Invalid value for {field}. Must be L, M, or H")
        
        # Validate pH range
        if not (0 <= soil_data['pH'] <= 14):
            raise HTTPException(status_code=400, detail="pH must be between 0 and 14")
        
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
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

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
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        # Validate input
        if 'soil_data' not in data:
            raise HTTPException(status_code=400, detail="Missing soil_data in request")
        
        if 'weather_data' not in data:
            raise HTTPException(status_code=400, detail="Missing weather_data in request")
        
        soil_data = data['soil_data']
        weather_data = data['weather_data']
        
        # Validate soil data
        required_soil_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        for field in required_soil_fields:
            if field not in soil_data:
                raise HTTPException(status_code=400, detail=f"Missing required soil field: {field}")
        
        # Validate categorical values
        valid_levels = ['L', 'M', 'H']
        for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
            if soil_data[field] not in valid_levels:
                raise HTTPException(status_code=400, detail=f"Invalid value for soil {field}. Must be L, M, or H")
        
        # Validate pH range
        if not (0 <= soil_data['pH'] <= 14):
            raise HTTPException(status_code=400, detail="pH must be between 0 and 14")
        
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
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None and model.model is not None}

@app.get("/soil-data/{barangay}")
async def get_soil_data(barangay: str, soil_file: str = 'Data/Soilanaly.csv'):
    """
    Get soil data for a specific barangay
    
    Args:
        barangay (str): Name of the barangay
    
    Returns:
        dict: Soil data for the barangay or empty dict if not found
    """
    try:
        # Load soil analysis data
        try:
            soil_df = pd.read_csv(soil_file, skiprows=2, usecols=range(1, 8))
            soil_df.columns = ['Address', 'Crop', 'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Fertilizer_Recommendation']
        except Exception as e:
            logger.warning(f"Could not load soil data from {soil_file}: {e}")
            return {"soil_data": {}}
        
        # Clean the data
        soil_df = soil_df.dropna()
        
        # Find matching barangay (case insensitive partial match)
        matching_rows = soil_df[soil_df['Address'].str.contains(barangay, case=False, na=False)]
        
        if not matching_rows.empty:
            # Get the first matching row
            row = matching_rows.iloc[0]
            soil_data = {
                "pH": float(row['pH']),
                "Nitrogen": row['Nitrogen'],
                "Phosphorus": row['Phosphorus'],
                "Potassium": row['Potassium']
            }
            return {"soil_data": soil_data}
        else:
            # Return empty data if not found
            return {"soil_data": {}}
            
    except Exception as e:
        logger.error(f"Error fetching soil data for {barangay}: {str(e)}")
        return {"soil_data": {}}
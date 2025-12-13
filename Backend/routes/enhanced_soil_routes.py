"""
API routes for enhanced soil analysis and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.enhanced_soil_crop_service import EnhancedSoilCropTransformer
import pandas as pd
import logging
import asyncio
import threading

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/enhanced-soil", tags=["enhanced-soil"])

# Global model instance
model = EnhancedSoilCropTransformer()
try:
    import time as time_module  # Import time module to avoid conflicts
    model_loading_start = time_module.time()
    logger.info("Starting to load enhanced model...")
    model.load_model('models/enhanced_soil_crop_transformer.keras',
                     'models/enhanced_soil_preprocessing_pipeline.pkl')
    model_loading_time = time_module.time() - model_loading_start
    logger.info(
        f"Enhanced model loaded successfully in {model_loading_time:.4f} seconds")
    logger.info(f"Model object: {model}")
    logger.info(f"Model.model object: {model.model}")

    # Start cache warming in background thread with lower priority
    def warm_cache_background():
        try:
            # Add a small delay to allow the server to start responding to requests first
            import time
            time.sleep(2)

            cache_warming_start = time_module.time()
            logger.info("Starting cache warming...")
            model.warm_cache()
            cache_warming_time = time_module.time() - cache_warming_start
            logger.info(
                f"Cache warming completed in {cache_warming_time:.4f} seconds")
        except Exception as e:
            logger.warning(f"Background cache warming failed: {e}")

    cache_warming_thread = threading.Thread(
        target=warm_cache_background, daemon=True)
    cache_warming_thread.start()

except Exception as e:
    logger.error(f"Failed to load enhanced model: {e}")
    import traceback
    logger.error(traceback.format_exc())
    model = None


@app.get("/")
async def root():
    return {"message": "Soil Crop Recommendation API",
            "description": "POST /enhanced-recommend or /fair-recommend to get crop recommendations based on soil, weather and market data"}


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
    try:
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        if 'soil_data' not in data:
            raise HTTPException(
                status_code=400, detail="Missing soil_data in request")

        soil_data = data['soil_data']
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
            # Get predictions with data with a 15-second timeout to prevent timeouts
            predictions = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, model.predict,
                                                         soil_data, weather_data, market_context),
                timeout=15.0
            )
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


@app.post("/fair-recommend")
async def fair_recommend_crops(data: dict):
    """
    Get FAIR and UNBIASED crop recommendations based on soil, weather, and market data

    This endpoint uses the fair model that treats all crops equally without any boosting.

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
                "final_score": 0.85,
                "market_demand_score": 0.75
            },
            {
                "crop": "Corn", 
                "final_score": 0.12,
                "market_demand_score": 0.60
            },
            {
                "crop": "Vegetable Legumes", 
                "final_score": 0.03,
                "market_demand_score": 0.45
            }
        ]
    }
    """
    import time as time_module  # Import time module to avoid conflicts
    start_time = time_module.time()
    logger.info(f"Received fair-recommend request with data: {data}")

    try:
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        if 'soil_data' not in data:
            raise HTTPException(
                status_code=400, detail="Missing soil_data in request")

        soil_data = data['soil_data']
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

        # Get predictions with data using fair model with optimized timeout
        try:
            # Use a more reasonable timeout for better user experience
            logger.info("Starting model prediction with timeout")
            prediction_start = time_module.time()

            # Log the thread information
            import threading
            logger.info(f"Current thread: {threading.current_thread().name}")
            logger.info(f"Current thread ID: {threading.get_ident()}")

            # Run the prediction in a separate thread with proper error handling
            def run_prediction():
                try:
                    logger.info("Running prediction in executor thread")
                    result = model.predict(
                        soil_data, weather_data, market_context)
                    logger.info(
                        "Prediction completed successfully in executor thread")
                    return result
                except Exception as pred_error:
                    logger.error(
                        f"Error in prediction function: {str(pred_error)}")
                    raise

            # Reduced timeout for faster response - 10 seconds instead of 20
            predictions = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, run_prediction),
                timeout=10.0  # Reduced timeout to 10 seconds for better responsiveness
            )
            prediction_time = time_module.time() - prediction_start
            logger.info(
                f"Model prediction completed in {prediction_time:.4f} seconds")
        except asyncio.TimeoutError:
            logger.error("Prediction timed out after 10 seconds")
            # Even on timeout, return what we have if anything
            raise HTTPException(
                status_code=500, detail="Request is taking longer than expected. This might be due to high server load. Please try again in a moment.")
        except Exception as e:
            logger.error(f"Error during model prediction: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500, detail=f"Error during prediction: {str(e)}")

        # Format response with final_score instead of confidence
        response_formatting_start = time_module.time()
        recommended_crops = [
            {
                "crop": crop,
                "final_score": float(final_score),
                "market_demand_score": float(market_score)
            }
            for crop, final_score, market_score in predictions
        ]
        response_formatting_time = time_module.time() - response_formatting_start
        logger.info(
            f"Response formatting time: {response_formatting_time:.4f} seconds")

        total_time = time_module.time() - start_time
        logger.info(f"Total request processing time: {total_time:.4f} seconds")

        # Limit to 6 results for faster response
        return {"recommended_crops": recommended_crops[:6]}

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in fair prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Fair prediction error: {str(e)}")


@app.get("/health")
async def health_check():
    import time as time_module  # Import time module to avoid conflicts
    health_check_start = time_module.time()
    logger.info("Health check initiated")

    # Check if model is loaded
    model_loaded = model is not None and model.model is not None
    logger.info(f"Model loaded status: {model_loaded}")

    # Skip the sample prediction test for faster health checks
    # Only check if the model object exists

    health_check_time = time_module.time() - health_check_start
    logger.info(f"Health check completed in {health_check_time:.4f} seconds")

    return {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "health_check_time": health_check_time
    }

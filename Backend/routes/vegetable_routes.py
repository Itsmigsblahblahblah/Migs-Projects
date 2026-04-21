"""
API routes for vegetable demand prediction and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.vegetable_demand_service import VegetableDemandTransformer
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/vegetables", tags=["vegetables"])

# Global model instance (initially None for lazy loading)
model = None
_model_loading = False
_model_loaded = False

def _load_model_if_needed():
    """Lazy load the model on first use (thread-safe)"""
    global model, _model_loading, _model_loaded
    
    if _model_loaded or model is not None:
        return
    
    if _model_loading:
        # Another thread is already loading, wait briefly
        import time
        for _ in range(30):  # Wait up to 3 seconds
            time.sleep(0.1)
            if _model_loaded:
                return
        return  # Timeout, proceed anyway
    
    _model_loading = True
    try:
        logger.info("Loading vegetable demand model (first request)...")
        model = VegetableDemandTransformer()
        model.load_model('models/vegetable_demand_transformer.keras',
                         'models/vegetable_preprocessing_pipeline.pkl')
        logger.info("Vegetable demand model loaded successfully")
        _model_loaded = True
    except Exception as e:
        logger.error(f"Failed to load vegetable demand model: {e}")
        model = None
    finally:
        _model_loading = False


@app.get("/")
async def root():
    return {"message": "Vegetable Demand Prediction API",
            "description": "POST /predict-demand or GET /recommend-crops"}


@app.post("/predict-demand")
async def predict_demand(data: dict):
    """
    Predict demand for a specific vegetable based on historical data

    Expected input format:
    {
        "vegetable_name": "CABBAGE (REPOLYO), 1 KG",
        "historical_prices": [73.71, 69.06, 67.27, ...],
        "historical_annual_prices": [80.68, 80.68, 80.68, ...],
        "historical_months": [1, 2, 3, ...]
    }

    Returns:
    {
        "vegetable": "CABBAGE (REPOLYO), 1 KG",
        "predicted_price": 75.23,
        "current_avg_price": 70.02,
        "price_change": 5.21,
        "price_change_percent": 7.44,
        "demand_level": "Moderate"
    }
    """
    try:
        # Lazy load model on first use
        _load_model_if_needed()
        
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate input
        required_fields = ['vegetable_name', 'historical_prices',
                           'historical_annual_prices', 'historical_months']
        for field in required_fields:
            if field not in data:
                raise HTTPException(
                    status_code=400, detail=f"Missing required field: {field}")

        # Get predictions
        prediction = model.predict_demand(
            data['vegetable_name'],
            data['historical_prices'],
            data['historical_annual_prices'],
            data['historical_months']
        )

        return prediction

    except Exception as e:
        logger.error(f"Error in demand prediction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Demand prediction error: {str(e)}")


@app.get("/recommend-crops")
async def recommend_crops(top_n: int = 10, month: int | None = None, year: int | None = None, demand_level: str | None = None):
    """
    Get recommended crops based on predicted demand for a specific month and year

    Args:
        top_n (int): Number of recommendations to return (default: 10)
        month (int | None): Month for which to make predictions (1-12)
        year (int | None): Year for which to make predictions
        demand_level (str | None): Filter by demand level (High, Moderate, Stable, Low)

    Returns:
    {
        "recommended_crops": [
            {
                "vegetable": "CABBAGE (REPOLYO), 1 KG",
                "predicted_price": 75.23,
                "current_avg_price": 70.02,
                "price_change": 5.21,
                "price_change_percent": 7.44,
                "demand_level": "Moderate"
            },
            ...
        ]
    }
    """
    try:
        # Lazy load model on first use
        _load_model_if_needed()
        
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")

        # Validate month parameter if provided
        if month is not None and (month < 1 or month > 12):
            raise HTTPException(
                status_code=400, detail="Month must be between 1 and 12")

        # Validate demand_level parameter if provided
        if demand_level is not None and demand_level.lower() not in ['high', 'moderate', 'stable', 'low']:
            raise HTTPException(
                status_code=400, detail="Demand level must be one of: High, Moderate, Stable, Low")

        # Limit top_n to prevent excessive computation
        if top_n > 100:
            top_n = 100

        # Get recommendations with time-specific filtering
        # Removed timeout for better reliability
        recommendations = model.recommend_crops(
            top_n, month, year, demand_level)
        return {"recommended_crops": recommendations}

    except Exception as e:
        logger.error(f"Error in crop recommendation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Crop recommendation error: {str(e)}")


@app.get("/vegetable-data/{vegetable_name}")
async def get_vegetable_data(vegetable_name: str, vegetable_file: str = 'Data/vegetable_prices.csv'):
    """
    Get historical data for a specific vegetable

    Args:
        vegetable_name (str): Name of the vegetable

    Returns:
        dict: Historical data for the vegetable
    """
    try:
        # Load vegetable price data
        try:
            veg_df = pd.read_csv(vegetable_file)
            # Skip the first row which contains the header description
            veg_df = veg_df.iloc[1:]
            veg_df.columns = ['Vegetable', 'Year', 'Month',
                              'Price', 'Annual_Price', 'MonthNum', 'Date']
        except Exception as e:
            logger.warning(
                f"Could not load vegetable data from {vegetable_file}: {e}")
            return {"vegetable_data": {}}

        # Clean the data
        veg_df = veg_df.dropna()

        # Try exact match first
        matching_rows = veg_df[veg_df['Vegetable'].str.contains(
            vegetable_name, case=False, na=False)]

        # If no exact match, try with simplified name (remove content in parentheses)
        if matching_rows.empty:
            import re
            simplified_name = re.sub(r'\s*\(.*?\)', '', vegetable_name).strip()
            logger.info(
                f"No exact match found for '{vegetable_name}', trying simplified name: '{simplified_name}'")
            matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                simplified_name, case=False, na=False)]

        # If still no match, try partial matching on the first word
        if matching_rows.empty:
            first_word = vegetable_name.split(
            )[0] if vegetable_name.split() else vegetable_name
            logger.info(
                f"No match found for '{simplified_name}', trying first word: '{first_word}'")
            matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                first_word, case=False, na=False)]

        # Additional matching for specific cases like Carrots/Karot
        if matching_rows.empty:
            # Handle special case for carrots - match "Carrots" or "Karot" with "KAROT"
            if "carrot" in vegetable_name.lower() or "karot" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "karot", case=False, na=False)]
            # Handle other common crop name variations
            elif "broccoli" in vegetable_name.lower() or "brokoli" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "brokoli", case=False, na=False)]
            elif "cabbage" in vegetable_name.lower() or "repol" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "repol", case=False, na=False)]
            elif "eggplant" in vegetable_name.lower() or "talong" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "talong", case=False, na=False)]
            elif "tomato" in vegetable_name.lower() or "kamatis" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "kamatis", case=False, na=False)]
            elif "radish" in vegetable_name.lower() or "labanos" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "labanos", case=False, na=False)]
            elif "onion" in vegetable_name.lower() or "sibuyas" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "sibuyas", case=False, na=False)]
            elif "garlic" in vegetable_name.lower() or "bawang" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "bawang", case=False, na=False)]
            elif "ginger" in vegetable_name.lower() or "luya" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "luya", case=False, na=False)]
            elif "chili" in vegetable_name.lower() or "sili" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "sili", case=False, na=False)]
            elif "potato" in vegetable_name.lower() or "patatas" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "patatas", case=False, na=False)]
            elif "squash" in vegetable_name.lower() or "kalabasa" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "kalabasa", case=False, na=False)]
            elif "okra" in vegetable_name.lower() or "lady" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "okra", case=False, na=False)]
            elif "pechay" in vegetable_name.lower() or "bok choy" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "pechay|bok.*choy", case=False, na=False)]
            elif "kangkong" in vegetable_name.lower() or "water spinach" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "kangkong|water.*spinach", case=False, na=False)]
            elif "mustard" in vegetable_name.lower() or "mustasa" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "mustard|mustasa", case=False, na=False)]
            elif "string bean" in vegetable_name.lower() or "sitaw" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "string.*bean|sitaw", case=False, na=False)]
            elif "bitter gourd" in vegetable_name.lower() or "ampalaya" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "bitter.*gourd|ampalaya", case=False, na=False)]
            elif "cauliflower" in vegetable_name.lower() or "koliflower" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "koliflower", case=False, na=False)]
            elif "chayote" in vegetable_name.lower() or "sayote" in vegetable_name.lower():
                matching_rows = veg_df[veg_df['Vegetable'].str.contains(
                    "sayote", case=False, na=False)]

        if not matching_rows.empty:
            # Sort by date
            matching_rows = matching_rows.sort_values(['Year', 'MonthNum'])

            # Convert to list of records
            vegetable_data = matching_rows.to_dict('records')

            # Convert numeric fields
            for record in vegetable_data:
                record['Price'] = float(record['Price'])
                record['Annual_Price'] = float(record['Annual_Price'])
                record['MonthNum'] = int(record['MonthNum'])
                record['Year'] = int(record['Year'])

            logger.info(
                f"Found {len(vegetable_data)} records for '{vegetable_name}'")
            return {"vegetable_data": vegetable_data}
        else:
            # Return empty data if not found
            logger.warning(f"No data found for vegetable: '{vegetable_name}'")
            return {"vegetable_data": []}

    except Exception as e:
        logger.error(
            f"Error fetching vegetable data for {vegetable_name}: {str(e)}")
        return {"vegetable_data": []}


@app.get("/health")
async def health_check():
    # Lazy load model on first use
    _load_model_if_needed()
    
    return {"status": "healthy", "model_loaded": model is not None}

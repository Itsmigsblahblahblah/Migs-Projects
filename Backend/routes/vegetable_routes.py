"""
API routes for vegetable demand prediction and crop recommendation
"""

from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.vegetable_demand_service import VegetableDemandTransformer
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/vegetables", tags=["vegetables"])

# Global model instance
model = VegetableDemandTransformer()
try:
    model.load_model('models/vegetable_demand_transformer.keras', 'models/vegetable_preprocessing_pipeline.pkl')
    logger.info("Vegetable demand model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load vegetable demand model: {e}")
    model = None

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
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        # Validate input
        required_fields = ['vegetable_name', 'historical_prices', 'historical_annual_prices', 'historical_months']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
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
        raise HTTPException(status_code=500, detail=f"Demand prediction error: {str(e)}")

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
        # Check if model is loaded
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        # Validate month parameter if provided
        if month is not None and (month < 1 or month > 12):
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
        
        # Validate demand_level parameter if provided
        if demand_level is not None and demand_level.lower() not in ['high', 'moderate', 'stable', 'low']:
            raise HTTPException(status_code=400, detail="Demand level must be one of: High, Moderate, Stable, Low")
        
        # Get recommendations with time-specific filtering
        recommendations = model.recommend_crops(top_n, month, year, demand_level)
        
        return {"recommended_crops": recommendations}
        
    except Exception as e:
        logger.error(f"Error in crop recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Crop recommendation error: {str(e)}")

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
            veg_df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual_Price', 'MonthNum', 'Date']
        except Exception as e:
            logger.warning(f"Could not load vegetable data from {vegetable_file}: {e}")
            return {"vegetable_data": {}}
        
        # Clean the data
        veg_df = veg_df.dropna()
        
        # Find matching vegetable (case insensitive partial match)
        matching_rows = veg_df[veg_df['Vegetable'].str.contains(vegetable_name, case=False, na=False)]
        
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
            
            return {"vegetable_data": vegetable_data}
        else:
            # Return empty data if not found
            return {"vegetable_data": []}
            
    except Exception as e:
        logger.error(f"Error fetching vegetable data for {vegetable_name}: {str(e)}")
        return {"vegetable_data": []}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None and model.model is not None}
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/data", tags=["data"])


@app.get("/brgy_soil_dataset.csv")
async def get_soil_data():
    """
    Serve the barangay soil dataset CSV file
    """
    try:
        file_path = os.path.join("Data", "brgy_soil_dataset.csv")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type='text/csv', filename='brgy_soil_dataset.csv')
    except Exception as e:
        logger.error(f"Error serving soil data: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error serving file: {str(e)}")


@app.get("/vegetable_prices.csv")
async def get_vegetable_prices():
    """
    Serve the vegetable prices dataset CSV file
    """
    try:
        file_path = os.path.join("Data", "vegetable_prices.csv")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type='text/csv', filename='vegetable_prices.csv')
    except Exception as e:
        logger.error(f"Error serving vegetable prices data: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error serving file: {str(e)}")


@app.get("/seed.csv")
async def get_seed_prices():
    """
    Serve the seed prices dataset CSV file
    """
    try:
        file_path = os.path.join("Data", "seed.csv")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type='text/csv', filename='seed.csv')
    except Exception as e:
        logger.error(f"Error serving seed prices data: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error serving file: {str(e)}")


@app.get("/crop_yield_ranges.csv")
async def get_crop_yield_ranges():
    """
    Serve the crop yield ranges dataset CSV file
    """
    try:
        file_path = os.path.join("Data", "crop yield ranges.csv")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(file_path, media_type='text/csv', filename='crop_yield_ranges.csv')
    except Exception as e:
        logger.error(f"Error serving crop yield ranges data: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error serving file: {str(e)}")


@app.get("/crop-data/{crop_name}")
async def get_crop_data(crop_name: str):
    """
    Get comprehensive data for a specific crop from all datasets

    Args:
        crop_name (str): Name of the crop

    Returns:
        dict: Combined data from all datasets for the crop
    """
    try:
        # Load all datasets
        soil_file = os.path.join("Data", "brgy_soil_dataset.csv")
        vegetable_file = os.path.join("Data", "vegetable_prices.csv")
        seed_file = os.path.join("Data", "seed.csv")

        # Load soil data
        soil_df = pd.read_csv(soil_file)
        soil_matches = soil_df[soil_df['Crop'].str.contains(
            crop_name, case=False, na=False)]

        # Load vegetable price data
        veg_df = pd.read_csv(vegetable_file)
        # Check if this is the new cleaned format (no header description row)
        if veg_df.columns[0] != 'Vegetable':
            # Old format - skip first row and rename
            veg_df = veg_df.iloc[1:]
            veg_df.columns = ['Vegetable', 'Year', 'Month',
                              'Price', 'Annual_Price', 'MonthNum', 'Date']
        veg_matches = veg_df[veg_df['Vegetable'].str.contains(
            crop_name, case=False, na=False)]

        # Load seed price data
        seed_df = pd.read_csv(seed_file)
        seed_matches = seed_df[seed_df['Gulay (Vegetable)'].str.contains(
            crop_name, case=False, na=False)]

        # Prepare response
        response = {
            "crop_name": crop_name,
            "soil_data": soil_matches.to_dict('records') if not soil_matches.empty else [],
            "price_data": veg_matches.to_dict('records') if not veg_matches.empty else [],
            "seed_data": seed_matches.to_dict('records') if not seed_matches.empty else []
        }

        return response

    except Exception as e:
        logger.error(f"Error fetching crop data for {crop_name}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching crop data: {str(e)}")

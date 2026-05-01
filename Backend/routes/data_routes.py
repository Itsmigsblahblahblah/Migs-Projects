from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import logging
import os
import threading

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize APIRouter
app = APIRouter(prefix="/data", tags=["data"])

# Global cached datasets (lazy-loaded)
_data_caches = {
    'soil': None,
    'vegetable': None,
    'seed': None,
    'crop_yield': None
}
_data_locks = {
    'soil': threading.Lock(),
    'vegetable': threading.Lock(),
    'seed': threading.Lock(),
    'crop_yield': threading.Lock()
}


def _get_cached_dataset(cache_key: str, file_path: str, check_vegetable_format: bool = False):
    """Thread-safe lazy loader for dataset caches"""
    if _data_caches[cache_key] is not None:
        return _data_caches[cache_key]

    with _data_locks[cache_key]:
        if _data_caches[cache_key] is None:
            try:
                logger.info(
                    f"Loading {cache_key} dataset cache (first request)...")
                df = pd.read_csv(file_path)

                # Special handling for vegetable prices (check format)
                if check_vegetable_format and df.columns[0] != 'Vegetable':
                    # Old format - skip first row and rename
                    df = df.iloc[1:]
                    df.columns = ['Vegetable', 'Year', 'Month',
                                  'Price', 'Annual_Price', 'MonthNum', 'Date']

                df = df.dropna()
                _data_caches[cache_key] = df
                logger.info(f"{cache_key} dataset cached: {df.shape[0]} rows")
            except Exception as e:
                logger.error(f"Failed to load {cache_key} dataset: {e}")
                _data_caches[cache_key] = pd.DataFrame()

    return _data_caches[cache_key]


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
        # Use cached datasets instead of loading from file every time
        soil_file = os.path.join("Data", "brgy_soil_dataset.csv")
        vegetable_file = os.path.join("Data", "vegetable_prices.csv")
        seed_file = os.path.join("Data", "seed.csv")

        # Load soil data from cache
        soil_df = _get_cached_dataset('soil', soil_file)
        soil_matches = soil_df[soil_df['Crop'].str.contains(
            crop_name, case=False, na=False)]

        # Load vegetable price data from cache
        veg_df = _get_cached_dataset('vegetable', vegetable_file,
                                     check_vegetable_format=True)
        veg_matches = veg_df[veg_df['Vegetable'].str.contains(
            crop_name, case=False, na=False)]

        # Load seed price data from cache
        seed_df = _get_cached_dataset('seed', seed_file)
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

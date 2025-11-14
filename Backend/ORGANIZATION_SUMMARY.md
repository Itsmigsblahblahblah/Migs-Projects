# Backend Organization Summary

This document provides a comprehensive overview of the restructured Backend directory for the Majayjay Farm Resource Management System.

## Final Directory Structure

```
Backend/
├── Data/                      # Data files used by the ML model
│   ├── Soilanaly.csv          # Soil analysis data from different locations
│   └── FertilizerRecomm.csv   # Fertilizer recommendations for crops
├── models/                    # Trained ML models and preprocessing pipelines
│   ├── fert_soil_transformer.h5     # Trained model in Keras HDF5 format
│   └── preprocessing_pipeline.pkl   # Preprocessing pipeline for data transformation
├── services/                  # Business logic and ML model implementation
│   └── soil_crop_service.py         # Main model implementation
├── routes/                    # API route definitions
│   └── soil_routes.py               # FastAPI routes for crop recommendations
├── tests/                     # Test scripts
│   ├── test_model.py                # Test script for the model
│   └── test_soil_endpoint.py        # Test script for API endpoints
├── config/                    # Configuration files
├── training/                  # Training scripts and datasets
├── main.py                    # Main entry point for Uvicorn/FastAPI
├── requirements.txt           # Python dependencies
├── .venv/                     # Python virtual environment (excluded from git)
├── README.md                  # Documentation
└── ORGANIZATION_SUMMARY.md   # This file
```

## Startup Process

### 1. Activate Virtual Environment
```bash
cd Backend
python -m venv .venv
source .venv/Scripts/activate  # On Windows
# or
.venv\Scripts\activate.bat     # On Windows CMD
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Backend Server
```bash
uvicorn main:app --reload
```

The server will start on `http://localhost:8000` by default.

## API Endpoints

- `GET /` - API root endpoint
- `POST /recommend` - Get crop recommendations based on soil data
- `POST /recommend-with-weather` - Get crop recommendations based on soil and weather data
- `GET /soil-data/{barangay}` - Get soil data for a specific barangay
- `GET /health` - Health check endpoint

## Testing

### Test the Model
```bash
python tests/test_model.py
```

### Test API Endpoints
```bash
python tests/test_soil_endpoint.py
```

## Key Improvements

1. **Virtual Environment**: All dependencies are now isolated in a virtual environment
2. **Clean Structure**: Clear separation of concerns with dedicated directories
3. **Standard Entry Point**: Using Uvicorn/FastAPI as the standard way to start the backend
4. **Maintainable**: Easy to understand and modify structure
5. **Reproducible**: Collaborators can easily set up the environment with just `pip install -r requirements.txt`
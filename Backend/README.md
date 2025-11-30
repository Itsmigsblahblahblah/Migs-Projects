# Backend Structure

This directory contains all backend-related components for Harvestify.

## Directory Structure

```
Backend/
├── Data/                      # Data files used by the ML model
│   └── brgy_soil_dataset.csv   # Barangay soil analysis data with crop recommendations
├── models/                    # Trained ML models and preprocessing pipelines
│   ├── soil_crop_transformer.keras     # Trained model in Keras format
│   └── soil_preprocessing_pipeline.pkl   # Preprocessing pipeline for data transformation
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
└── README.md                  # This file
```

## Components

### 1. Machine Learning Model (`services/`)
- **soil_crop_service.py**: Implements a neural network model for crop recommendation based on soil analysis data
- **Features**: pH, Nitrogen, Phosphorus, and Potassium levels
- **Output**: Recommended crops with confidence scores

### 2. Data Files (`Data/`)
- **brgy_soil_dataset.csv**: Contains actual soil analysis results from different barangays with crop recommendations

## Usage

### Setting up the Environment
```bash
cd Backend
python -m venv .venv
source .venv/Scripts/activate  # On Windows
pip install -r requirements.txt
```

### Training the Model
```bash
cd Backend
python -m services.soil_crop_service train
```

### Running the API Server
```bash
cd Backend
uvicorn main:app --reload
```

### Testing the Model
```bash
cd Backend
tests/test_model.py
```

### Testing API Endpoints
```bash
cd Backend
tests/test_soil_endpoint.py
```
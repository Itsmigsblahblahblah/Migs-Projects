# Backend Structure

This directory contains all backend-related components for the Majayjay Farm Resource Management System.

## Directory Structure

```
Backend/
├── Data/                      # Data files used by the ML model
│   ├── Soilanaly.csv          # Soil analysis data from different locations
│   └── FertilizerRecomm.csv   # Fertilizer recommendations for crops
├── ml_model/                  # Machine learning model for crop recommendations
│   ├── fert_soil_transformer.py     # Main model implementation
│   ├── requirements.txt             # Python dependencies
│   ├── test_model.py                # Test script for the model
│   └── test_soil_endpoint.py        # Test script for API endpoints
└── README.md                  # This file
```

## Components

### 1. Machine Learning Model (`ml_model/`)
- **fert_soil_transformer.py**: Implements a neural network model for crop recommendation based on soil analysis data
- **Features**: pH, Nitrogen, Phosphorus, and Potassium levels
- **Output**: Recommended crops with confidence scores
- **API**: FastAPI server with endpoints for crop recommendations and soil data retrieval

### 2. Data Files (`Data/`)
- **Soilanaly.csv**: Contains actual soil analysis results from different barangays
- **FertilizerRecomm.csv**: Contains standardized fertilizer recommendations for crops

## Usage

### Training the Model
```bash
cd Backend/ml_model
python fert_soil_transformer.py train
```

### Running the API Server
```bash
cd Backend/ml_model
python fert_soil_transformer.py serve
```

### Testing the Model
```bash
cd Backend/ml_model
python test_model.py
```

### Testing API Endpoints
```bash
cd Backend/ml_model
python test_soil_endpoint.py
```
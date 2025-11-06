# Soil Crop Recommendation System

## Overview
This system provides crop recommendations based on soil analysis data using a neural network model trained on soil properties (pH, Nitrogen, Phosphorus, Potassium levels).

## Model Files
- `Backend/ml_model/fert_soil_transformer.py` - Main script containing the model implementation
- `Backend/ml_model/fert_soil_transformer.h5` - Trained model (generated after training)
- `Backend/ml_model/preprocessing_pipeline.pkl` - Preprocessing pipeline (generated after training)

## Training the Model
```bash
cd Backend/ml_model
python fert_soil_transformer.py train
```

This will:
1. Load and preprocess data from `../Data/Soilanaly.csv` and `../Data/FertilizerRecomm.csv`
2. Train a neural network model on the soil data
3. Save the trained model as `fert_soil_transformer.h5`
4. Save the preprocessing pipeline as `preprocessing_pipeline.pkl`

## Running the API Server
```bash
cd Backend/ml_model
python fert_soil_transformer.py serve [--port PORT]
```

This starts a FastAPI server that provides crop recommendations via HTTP API.

## API Endpoints

### GET /
Health check endpoint
```bash
curl http://localhost:8000/
```

### POST /recommend
Get crop recommendations based on soil data
```bash
curl -X POST "http://localhost:8000/recommend" \
  -H "Content-Type: application/json" \
  -d '{
    "pH": 6.5,
    "Nitrogen": "M",
    "Phosphorus": "L", 
    "Potassium": "H"
  }'
```

#### Request Format
```json
{
  "pH": 6.5,              // Soil pH level (0-14)
  "Nitrogen": "M",        // Nitrogen level (L, M, or H)
  "Phosphorus": "L",      // Phosphorus level (L, M, or H)
  "Potassium": "H"        // Potassium level (L, M, or H)
}
```

#### Response Format
```json
{
  "recommended_crops": [
    {
      "crop": "Rice",
      "confidence": 0.85
    },
    {
      "crop": "Corn", 
      "confidence": 0.12
    },
    {
      "crop": "Vegetable Legumes",
      "confidence": 0.03
    }
  ]
}
```

## Integration with Frontend

To integrate with the Crop Prescription popup in the Majayjay Farm Resource Management System:

1. Make an HTTP POST request to the `/recommend` endpoint with soil data
2. Parse the JSON response to extract recommended crops and confidence scores
3. Display the recommendations in the UI

Example JavaScript integration:
```javascript
const soilData = {
  pH: 6.5,
  Nitrogen: "M",
  Phosphorus: "L",
  Potassium: "H"
};

fetch('/api/recommend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(soilData)
})
.then(response => response.json())
.then(data => {
  // Display recommendations in the Crop Prescription popup
  displayRecommendations(data.recommended_crops);
});
```

## Requirements
- Python 3.7+
- TensorFlow 2.x
- Pandas
- Scikit-learn
- FastAPI
- Uvicorn

Install dependencies:
```bash
pip install tensorflow pandas scikit-learn fastapi uvicorn
```
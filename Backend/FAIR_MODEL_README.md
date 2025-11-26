# Fair and Unbiased Crop Recommendation System

This document describes the fully unbiased, fair, and equal Crop Prescription System that treats all crops equally without any boosting or favoritism.

## Key Features of the Fair Model

1. **Equal Treatment**: All crops are evaluated using the exact same formulas and weights
2. **No Boosting**: No crop-specific boosting logic in either the algorithm or ML model
3. **Balanced Dataset**: Ensures equal representation of all crops through oversampling/undersampling
4. **Fair Scoring**: Uses equal-weight scoring for all components
5. **Transparency**: Clear and explainable scoring mechanisms

## Fair Scoring Formulas

### Soil Compatibility Score
```
SoilScore = (pH_match + N_match + P_match + K_match + moisture_match + temperature_match) / 6
```

### Weather Compatibility Score
```
WeatherScore = (humidity_match + temperature_match + rain_match + uv_match + wind_match) / 5
```

### Market Demand Score
```
MarketDemandScore = (price_trend_score + volatility_score + seasonal_score) / 3
```

### Final Combined Score
```
FinalScore = (SoilScore + WeatherScore + MarketDemandScore + MLConfidenceScore) / 4
```

## Retraining the Fair Model

To retrain the fair model with balanced dataset and fairness constraints:

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Run the retraining script:
   ```bash
   python retrain_fair_model.py
   ```

This will:
- Load and preprocess data with balanced crop representation
- Train the model with fairness constraints
- Save the fair model as `models/fair_soil_crop_transformer.keras`
- Save the preprocessor as `models/fair_soil_preprocessing_pipeline.pkl`

## API Endpoints

The system provides two API endpoints:

### Fair Recommendation Endpoint (New)
```
POST /api/enhanced-soil/fair-recommend
```

### Backward Compatible Endpoint (Updated)
```
POST /api/enhanced-soil/enhanced-recommend
```

Both endpoints now use the fair model and return unbiased recommendations.

## Model Architecture

The fair model uses:
- Balanced dataset with equal representation of all crops
- Class weights to ensure fair training
- Equal-weight scoring system
- No crop-specific boosting logic

## Verification

To verify the model is truly fair:
1. Check that all crops use the same scoring formulas
2. Confirm no boosting logic exists in the predict method
3. Verify the dataset is balanced
4. Test with various soil profiles to ensure no favoritism

## Expected Output

The fair model produces:
- Truly unbiased recommendations
- Equal treatment of all crops
- Transparent scoring mechanisms
- No hidden boosts or favoritism
- Recommendations sorted naturally based on FAIR scoring
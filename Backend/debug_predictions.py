import numpy as np
import pandas as pd
import logging
from services.enhanced_soil_crop_service import EnhancedSoilCropTransformer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def analyze_training_data():
    """Analyze the training data to understand the distribution"""
    # Load soil analysis data
    soil_df = pd.read_csv('Data/brgy_soil_dataset.csv')
    
    logger.info(f"Total training samples: {len(soil_df)}")
    logger.info(f"Unique crops: {soil_df['Crop'].nunique()}")
    logger.info(f"Crop distribution:\n{soil_df['Crop'].value_counts().head(10)}")
    
    # Analyze soil data distribution
    nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
    phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
    potassium_map = {'L': 0, 'M': 1, 'H': 2}
    
    soil_df['Nitrogen_num'] = soil_df['Nitrogen(N)'].map(nitrogen_map)
    soil_df['Phosphorus_num'] = soil_df['Phosphorus(P)'].map(phosphorus_map)
    soil_df['Potassium_num'] = soil_df['Potassium(K)'].map(potassium_map)
    
    logger.info(f"Nitrogen distribution:\n{soil_df['Nitrogen_num'].value_counts()}")
    logger.info(f"Phosphorus distribution:\n{soil_df['Phosphorus_num'].value_counts()}")
    logger.info(f"Potassium distribution:\n{soil_df['Potassium_num'].value_counts()}")
    
    # Check correlation between soil conditions and crops
    logger.info("Top crops by nitrogen level:")
    for level in [0, 1, 2]:
        level_crops = soil_df[soil_df['Nitrogen_num'] == level]['Crop'].value_counts().head(5)
        logger.info(f"Nitrogen level {level}: {level_crops.to_dict()}")

def test_predictions():
    """Test the model predictions with different soil inputs"""
    # Initialize model
    model = EnhancedSoilCropTransformer()
    model.load_model('models/enhanced_soil_crop_transformer.keras', 
                     'models/enhanced_soil_preprocessing_pipeline.pkl')
    
    logger.info("Model loaded successfully")
    logger.info(f"Model object: {model}")
    
    if model.preprocessor is not None:
        logger.info(f"Preprocessor keys: {model.preprocessor.keys()}")
        logger.info(f"Market scores: {model.preprocessor.get('market_scores', {})}")
    else:
        logger.info("Preprocessor is None")
    
    logger.info(f"Feature columns: {model.feature_columns}")
    
    # Test case 1: Low nitrogen soil
    soil_data_1 = {
        "pH": 5.5,
        "Nitrogen": "L",
        "Phosphorus": "M",
        "Potassium": "H"
    }
    
    # Test case 2: High nitrogen soil
    soil_data_2 = {
        "pH": 7.0,
        "Nitrogen": "H",
        "Phosphorus": "M",
        "Potassium": "L"
    }
    
    # Test case 3: Medium everything
    soil_data_3 = {
        "pH": 6.5,
        "Nitrogen": "M",
        "Phosphorus": "M",
        "Potassium": "M"
    }
    
    # Test case 4: Specific case for Ampalaya
    soil_data_4 = {
        "pH": 5.8,
        "Nitrogen": "M",
        "Phosphorus": "M",
        "Potassium": "M"
    }
    
    weather_data = {
        "temperature": 28.5,
        "humidity": 65,
        "precipitation_probability": 20,
        "wind_speed": 10,
        "uv_index": 7
    }
    
    test_cases = [
        ("Low Nitrogen Soil", soil_data_1),
        ("High Nitrogen Soil", soil_data_2),
        ("Medium Everything Soil", soil_data_3),
        ("Ampalaya Soil Conditions", soil_data_4)
    ]
    
    for name, soil_data in test_cases:
        logger.info(f"\n{'='*50}")
        logger.info(f"Testing {name}")
        logger.info(f"Soil data: {soil_data}")
        
        # Get predictions using the model's predict method
        predictions = model.predict(soil_data, weather_data, {})
        
        logger.info(f"Predictions: {predictions}")
        
        # Check specifically for Ampalaya in predictions
        ampalaya_found = False
        for i, (crop, confidence, market_score) in enumerate(predictions):
            if crop == 'Ampalaya (Bitter Gourd)':
                logger.info(f"Ampalaya found at position {i+1} with confidence {confidence}")
                ampalaya_found = True
                break
        
        if not ampalaya_found:
            logger.info("Ampalaya (Bitter Gourd) not in top predictions")

if __name__ == "__main__":
    analyze_training_data()
    test_predictions()
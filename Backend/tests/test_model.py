"""
Test script to demonstrate the soil crop recommendation model
"""

import json
from services.soil_crop_service import SoilCropTransformer

def main():
    # Initialize the model
    model = SoilCropTransformer()
    
    # Load the trained model and preprocessing pipeline
    model.load_model()
    
    # Test with sample soil data
    test_soil_data = {
        "pH": 6.5,
        "Nitrogen": "M",  # Medium
        "Phosphorus": "L",  # Low
        "Potassium": "H"  # High
    }
    
    print("Soil Analysis Data:")
    print(json.dumps(test_soil_data, indent=2))
    
    # Get predictions
    predictions = model.predict(test_soil_data)
    
    print("\nRecommended Crops:")
    print("-" * 30)
    for i, (crop, confidence) in enumerate(predictions, 1):
        print(f"{i}. {crop}: {confidence:.2%} confidence")

if __name__ == "__main__":
    main()
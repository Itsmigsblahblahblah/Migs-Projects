import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vegetable_demand_service import VegetableDemandTransformer
import numpy as np

def main():
    # Initialize the model
    model = VegetableDemandTransformer()
    
    # Load the trained model and preprocessing pipeline
    try:
        model.load_model('models/vegetable_demand_transformer.keras', 
                        'models/vegetable_preprocessing_pipeline.pkl')
        print("Model loaded successfully")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return
    
    # Test a few specific crops to see their raw predictions
    print("\nTesting raw predictions for specific crops:")
    
    # Load the data
    import pandas as pd
    veg_df = pd.read_csv('Data/vegetable_prices.csv')
    veg_df = veg_df.iloc[1:]
    veg_df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual_Price', 'MonthNum', 'Date']
    veg_df['Price'] = pd.to_numeric(veg_df['Price'], errors='coerce')
    veg_df['Annual_Price'] = pd.to_numeric(veg_df['Annual_Price'], errors='coerce')
    veg_df['MonthNum'] = pd.to_numeric(veg_df['MonthNum'], errors='coerce')
    veg_df['Year'] = pd.to_numeric(veg_df['Year'], errors='coerce')
    veg_df = veg_df.dropna()
    
    # Test a few specific vegetables
    test_vegetables = ["LUYANG DILAW (TURMERIC GINGER), 1 KG", "TOGUE (BEAN SPROUTS), 1 KG", 
                      "SAYOTE (CHAYOTE), 1 KG", "KAMATIS (TOMATO), 1 KG"]
    
    for vegetable in test_vegetables:
        try:
            # Filter data for this vegetable
            veg_data = veg_df[veg_df['Vegetable'] == vegetable].sort_values(['Year', 'MonthNum'])
            historical_data = veg_data.tail(12)
            
            if len(historical_data) >= 3:
                # Extract historical data for prediction
                historical_prices = historical_data['Price'].tolist()
                historical_annual_prices = historical_data['Annual_Price'].tolist()
                historical_months = historical_data['MonthNum'].tolist()
                
                # Make prediction without seasonal adjustments to see raw values
                prediction = model.predict_demand(vegetable, historical_prices, 
                                               historical_annual_prices, historical_months)
                
                print(f"{vegetable}:")
                print(f"  Current avg price: {prediction['current_avg_price']:.2f}")
                print(f"  Predicted price: {prediction['predicted_price']:.2f}")
                print(f"  Price change: {prediction['price_change']:.2f}")
                print(f"  Price change %: {prediction['price_change_percent']:.2f}%")
                print(f"  Demand level: {prediction['demand_level']}")
                print()
        except Exception as e:
            print(f"Error testing {vegetable}: {e}")

if __name__ == "__main__":
    main()
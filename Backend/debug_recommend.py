import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pickle
import tensorflow as tf
from tensorflow import keras

# Load the preprocessing pipeline
with open('models/vegetable_preprocessing_pipeline.pkl', 'rb') as f:
    preprocessor = pickle.load(f)

label_encoder = preprocessor['label_encoder']
scaler = preprocessor['scaler']

print("Available vegetables in label encoder:")
print(label_encoder.classes_)

# Load the model
model = keras.models.load_model('models/vegetable_demand_transformer.keras')
print("Model loaded successfully")

# Load vegetable data
veg_df = pd.read_csv('Data/vegetable_prices.csv')
veg_df = veg_df.iloc[1:]  # Skip header description
veg_df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual_Price', 'MonthNum', 'Date']

# Convert data types
veg_df['Price'] = pd.to_numeric(veg_df['Price'], errors='coerce')
veg_df['Annual_Price'] = pd.to_numeric(veg_df['Annual_Price'], errors='coerce')
veg_df['MonthNum'] = pd.to_numeric(veg_df['MonthNum'], errors='coerce')
veg_df['Year'] = pd.to_numeric(veg_df['Year'], errors='coerce')

# Clean the data
veg_df = veg_df.dropna()

print(f"\nTotal vegetable records: {len(veg_df)}")

# Get unique vegetables from current dataset
current_vegetables = list(veg_df['Vegetable'].unique())
print(f"Unique vegetables in data: {len(current_vegetables)}")

# Filter to only include vegetables that were in the training data
available_vegetables = [v for v in current_vegetables if v in label_encoder.classes_]
print(f"Available vegetables for prediction: {len(available_vegetables)}")

# Test with a specific vegetable
if available_vegetables:
    test_vegetable = available_vegetables[0]
    print(f"\nTesting with vegetable: {test_vegetable}")
    
    # Filter data for this vegetable
    veg_data = veg_df[veg_df['Vegetable'] == test_vegetable].sort_values(['Year', 'MonthNum'])
    print(f"Records for {test_vegetable}: {len(veg_data)}")
    
    # Test filtering for December 2024
    condition = (veg_data['Year'] < 2024) | ((veg_data['Year'] == 2024) & (veg_data['MonthNum'] < 12))
    filtered_data = veg_data[condition]
    print(f"Records before Dec 2024: {len(filtered_data)}")
    
    if not filtered_data.empty:
        historical_data = filtered_data.tail(12)
        print(f"Historical data for prediction: {len(historical_data)}")
        historical_prices = historical_data['Price'].tolist()
        historical_annual_prices = historical_data['Annual_Price'].tolist()
        historical_months = historical_data['MonthNum'].tolist()
        print("Historical prices:", historical_prices)
        
        # Test model prediction with corrected feature engineering
        try:
            # Prepare features
            prices = historical_prices[-12:] if len(historical_prices) >= 12 else historical_prices
            annual_prices = historical_annual_prices[-12:] if len(historical_annual_prices) >= 12 else historical_annual_prices
            months = historical_months[-12:] if len(historical_months) >= 12 else historical_months
            
            # Pad with zeros if less than 12 months
            while len(prices) < 12:
                prices.insert(0, 0)
                annual_prices.insert(0, 0)
                months.insert(0, 0)
            
            # Calculate additional features to match training data
            avg_price = np.mean(prices)
            price_trend = (prices[-1] - prices[0]) / 12 if len(prices) > 1 else 0
            price_volatility = np.std(prices)
            
            # Create feature vector to match training data format
            features = []
            # Add the 12 months of prices, annual prices, and months
            for i in range(len(prices)):
                features.extend([prices[i], annual_prices[i], months[i]])
            
            # Add the additional features
            features.extend([avg_price, price_trend, price_volatility])
            
            # Add vegetable encoding
            try:
                vegetable_encoded = label_encoder.transform([test_vegetable])[0]
            except ValueError:
                # If vegetable not in training data, use the first class
                vegetable_encoded = 0
                print(f"Vegetable '{test_vegetable}' not in training data. Using default encoding.")
            
            features.append(vegetable_encoded)
            
            # Convert to numpy array and reshape
            X = np.array(features).reshape(1, -1)
            print(f"Feature vector shape: {X.shape}")
            
            # Scale features
            X_scaled = scaler.transform(X)
            
            # Make prediction
            prediction = model.predict(X_scaled, verbose=0)[0][0]
            print(f"Prediction result: {prediction}")
            
            # Calculate current average price (last 3 months)
            current_avg_price = np.mean(prices[-3:]) if len(prices) >= 3 else np.mean(prices)
            print(f"Current average price: {current_avg_price}")
            
            # Calculate price change and percentage
            price_change = prediction - current_avg_price
            price_change_percent = (price_change / current_avg_price) * 100 if current_avg_price != 0 else 0
            print(f"Price change: {price_change}")
            print(f"Price change percentage: {price_change_percent}")
            
        except Exception as e:
            print(f"Error in prediction: {e}")
    else:
        print("No data before target date")
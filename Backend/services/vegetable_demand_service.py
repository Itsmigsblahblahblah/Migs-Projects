"""
Transformer-based Vegetable Demand Prediction Model

This script trains a Transformer-based model on vegetable price data to predict 
which vegetables will be in high demand in upcoming days, weeks, or months.

Expected Input:
- vegetable_prices.csv: Contains historical price data for various vegetables

Model Output:
- Predicted demand levels for vegetables in upcoming periods
- Recommended vegetables for farmers to plant based on predicted demand

Usage:
1. Training: python vegetable_demand_service.py train
2. API Server: python vegetable_demand_service.py serve
"""

import os
import json
import pickle
import logging
import argparse
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import tensorflow as tf
from tensorflow.keras.layers import Input, Dense, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Hyperparameters
HYPERPARAMETERS = {
    'batch_size': 32,
    'epochs': 100,
    'learning_rate': 0.001,
    'dropout_rate': 0.2,
    'test_size': 0.2,
    'validation_size': 0.2,
    'random_seed': 42,
    'sequence_length': 12,  # 12 months of historical data
    'prediction_horizon': 3  # Predict 3 months ahead
}

# Set random seed for reproducibility
np.random.seed(HYPERPARAMETERS['random_seed'])
tf.random.set_seed(HYPERPARAMETERS['random_seed'])

class VegetableDemandTransformer:
    """Transformer-based model for vegetable demand prediction based on price trends"""
    
    def __init__(self, hyperparams=None):
        self.hyperparams = hyperparams or HYPERPARAMETERS
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = ['Price', 'Annual_Price', 'MonthNum']
        self.preprocessor = None
        
    def load_and_preprocess_data(self, vegetable_file='Data/vegetable_prices.csv'):
        """
        Load and preprocess the vegetable price data
        
        Args:
            vegetable_file (str): Path to vegetable_prices.csv
            
        Returns:
            tuple: (X, y) preprocessed features and labels
        """
        logger.info("Loading and preprocessing vegetable price data...")
        
        # Load vegetable price data
        try:
            veg_df = pd.read_csv(vegetable_file)
            # Skip the first row which contains the header description
            veg_df = veg_df.iloc[1:]
            veg_df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual_Price', 'MonthNum', 'Date']
        except Exception as e:
            logger.error(f"Could not load vegetable data from {vegetable_file}: {e}")
            raise e
        
        # Convert data types
        veg_df['Price'] = pd.to_numeric(veg_df['Price'], errors='coerce')
        veg_df['Annual_Price'] = pd.to_numeric(veg_df['Annual_Price'], errors='coerce')
        veg_df['MonthNum'] = pd.to_numeric(veg_df['MonthNum'], errors='coerce')
        veg_df['Year'] = pd.to_numeric(veg_df['Year'], errors='coerce')
        
        # Clean the data
        veg_df = veg_df.dropna()
        
        # Create time series features for each vegetable
        processed_data = []
        
        # Get unique vegetables
        vegetables = veg_df['Vegetable'].unique()
        
        for vegetable in vegetables:
            veg_data = veg_df[veg_df['Vegetable'] == vegetable].sort_values(['Year', 'MonthNum'])
            
            # Create sequences for time series prediction
            prices = veg_data['Price'].values
            annual_prices = veg_data['Annual_Price'].values
            months = veg_data['MonthNum'].values
            
            # Create sequences
            seq_length = self.hyperparams['sequence_length']
            pred_horizon = self.hyperparams['prediction_horizon']
            
            for i in range(len(prices) - seq_length - pred_horizon + 1):
                # Input sequence (historical data)
                price_seq = prices[i:i+seq_length]
                annual_seq = annual_prices[i:i+seq_length]
                month_seq = months[i:i+seq_length]
                
                # Target (future prices)
                future_prices = prices[i+seq_length:i+seq_length+pred_horizon]
                
                # Calculate features
                avg_price = np.mean(price_seq)
                price_trend = (price_seq[-1] - price_seq[0]) / seq_length if seq_length > 1 else 0
                price_volatility = np.std(price_seq)
                
                # Combine features
                features = np.concatenate([price_seq, annual_seq, month_seq, 
                                         [avg_price, price_trend, price_volatility]])
                
                # Target is the average of future prices (simplified demand indicator)
                target = np.mean(future_prices)
                
                processed_data.append({
                    'vegetable': vegetable,
                    'features': features,
                    'target': target
                })
        
        if not processed_data:
            logger.warning("No valid sequences generated. Check data quality.")
            return np.array([]), np.array([])
        
        # Convert to arrays
        if processed_data:
            X = np.array([item['features'] for item in processed_data])
            y = np.array([item['target'] for item in processed_data])
            
            # Encode vegetable names
            vegetable_names = [item['vegetable'] for item in processed_data]
            vegetable_encoded = self.label_encoder.fit_transform(vegetable_names)
            
            # Add vegetable encoding as a feature
            X = np.column_stack([X, vegetable_encoded])
        else:
            X = np.array([])
            y = np.array([])
            vegetable_encoded = np.array([])
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Save preprocessing pipeline
        self.preprocessor = {
            'label_encoder': self.label_encoder,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns
        }
        
        logger.info(f"Data preprocessing complete. Shape: {X_scaled.shape}")
        logger.info(f"Number of unique vegetables: {len(np.unique(vegetable_encoded))}")
        
        return X_scaled, y
    
    def build_model(self, input_shape):
        """
        Build a neural network model for vegetable demand prediction
        
        Args:
            input_shape (tuple): Shape of input features
            
        Returns:
            Model: Compiled Keras model
        """
        logger.info("Building neural network model...")
        
        # Input layer
        inputs = Input(shape=input_shape)
        
        # Dense layers
        x = Dense(128, activation='relu')(inputs)
        x = Dropout(self.hyperparams['dropout_rate'])(x)
        x = Dense(64, activation='relu')(x)
        x = Dropout(self.hyperparams['dropout_rate'])(x)
        x = Dense(32, activation='relu')(x)
        x = Dropout(self.hyperparams['dropout_rate'])(x)
        
        # Output layer (predicting future price as demand indicator)
        outputs = Dense(1, activation='linear')(x)
        
        # Create model
        model = Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        self.model = model
        logger.info("Model built successfully")
        return model
    
    def train(self, X, y):
        """
        Train the model
        
        Args:
            X (np.array): Input features
            y (np.array): Target values
        """
        if len(X) == 0 or len(y) == 0:
            logger.error("No training data available")
            return None, None
            
        logger.info("Starting model training...")
        
        # Split data
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=self.hyperparams['test_size'], random_state=self.hyperparams['random_seed']
        )
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=self.hyperparams['validation_size'], random_state=self.hyperparams['random_seed']
        )
        
        logger.info(f"Training samples: {len(X_train)}")
        logger.info(f"Validation samples: {len(X_val)}")
        logger.info(f"Test samples: {len(X_test)}")
        
        # Build model
        self.build_model(X_train.shape[1:])
        
        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True
        )
        
        reduce_lr = ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=10,
            min_lr=1e-7
        )
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            batch_size=self.hyperparams['batch_size'],
            epochs=self.hyperparams['epochs'],
            validation_data=(X_val, y_val),
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        # Evaluate on test set
        test_loss, test_mae = self.model.evaluate(X_test, y_test, verbose=0)
        logger.info(f"Test Loss (MSE): {test_loss:.4f}")
        logger.info(f"Test MAE: {test_mae:.4f}")
        
        # Calculate additional metrics
        y_pred = self.model.predict(X_test, verbose=0).flatten()
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        logger.info(f"MSE: {mse:.4f}")
        logger.info(f"MAE: {mae:.4f}")
        logger.info(f"RMSE: {rmse:.4f}")
        
        logger.info("Training completed")
        return history, {"mse": mse, "mae": mae, "rmse": rmse}
    
    def save_model(self, model_path='models/vegetable_demand_transformer.keras', 
                   preprocessor_path='models/vegetable_preprocessing_pipeline.pkl'):
        """
        Save the trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to save the model
            preprocessor_path (str): Path to save the preprocessing pipeline
        """
        if self.model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        # Save model in the new Keras format
        self.model.save(model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Save preprocessing pipeline
        with open(preprocessor_path, 'wb') as f:
            pickle.dump(self.preprocessor, f)
        logger.info(f"Preprocessing pipeline saved to {preprocessor_path}")
    
    def load_model(self, model_path='models/vegetable_demand_transformer.keras', 
                   preprocessor_path='models/vegetable_preprocessing_pipeline.pkl'):
        """
        Load a trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to the saved model
            preprocessor_path (str): Path to the preprocessing pipeline
        """
        # Load model
        self.model = tf.keras.models.load_model(model_path)
        logger.info(f"Model loaded from {model_path}")
        
        # Load preprocessing pipeline
        with open(preprocessor_path, 'rb') as f:
            self.preprocessor = pickle.load(f)
        self.label_encoder = self.preprocessor['label_encoder']
        self.scaler = self.preprocessor['scaler']
        self.feature_columns = self.preprocessor['feature_columns']
        logger.info(f"Preprocessing pipeline loaded from {preprocessor_path}")
        logger.info(f"Model trained with features: {self.feature_columns}")
    
    def predict_demand(self, vegetable_name, historical_prices, historical_annual_prices, historical_months):
        """
        Predict demand for a specific vegetable based on historical data
        
        Args:
            vegetable_name (str): Name of the vegetable
            historical_prices (list): List of historical prices
            historical_annual_prices (list): List of annual prices
            historical_months (list): List of month numbers
            
        Returns:
            dict: Predicted demand information
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Ensure we have enough historical data
        seq_length = self.hyperparams['sequence_length']
        if len(historical_prices) < seq_length:
            # Pad with average values if not enough data
            pad_length = seq_length - len(historical_prices)
            avg_price = np.mean(historical_prices) if historical_prices else 0
            avg_annual = np.mean(historical_annual_prices) if historical_annual_prices else 0
            avg_month = np.mean(historical_months) if historical_months else 6
            
            historical_prices = [avg_price] * pad_length + list(historical_prices)
            historical_annual_prices = [avg_annual] * pad_length + list(historical_annual_prices)
            historical_months = [avg_month] * pad_length + list(historical_months)
        
        # Take the last sequence_length values
        price_seq = np.array(historical_prices[-seq_length:])
        annual_seq = np.array(historical_annual_prices[-seq_length:])
        month_seq = np.array(historical_months[-seq_length:])
        
        # Calculate features
        avg_price = np.mean(price_seq)
        price_trend = (price_seq[-1] - price_seq[0]) / seq_length if seq_length > 1 else 0
        price_volatility = np.std(price_seq)
        
        # Combine features
        features = np.concatenate([price_seq, annual_seq, month_seq, 
                                 [avg_price, price_trend, price_volatility]])
        
        # Add vegetable encoding
        try:
            vegetable_encoded = self.label_encoder.transform([vegetable_name])[0]
        except ValueError:
            # If vegetable not in training data, use average encoding
            vegetable_encoded = np.mean(self.label_encoder.transform(self.label_encoder.classes_))
        
        features = np.append(features, vegetable_encoded)
        
        # Reshape for prediction
        input_data = features.reshape(1, -1)
        
        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        
        # Make prediction
        predicted_price = self.model.predict(input_scaled, verbose=0)[0][0]
        
        # Determine demand level based on price trend
        current_avg_price = avg_price
        price_change = predicted_price - current_avg_price
        price_change_percent = (price_change / current_avg_price) * 100 if current_avg_price != 0 else 0
        
        # Classify demand level
        if price_change_percent > 10:
            demand_level = "High"
        elif price_change_percent > 5:
            demand_level = "Moderate"
        elif price_change_percent > -5:
            demand_level = "Stable"
        else:
            demand_level = "Low"
        
        return {
            "vegetable": vegetable_name,
            "predicted_price": float(predicted_price),
            "current_avg_price": float(current_avg_price),
            "price_change": float(price_change),
            "price_change_percent": float(price_change_percent),
            "demand_level": demand_level
        }
    
    def recommend_crops(self, top_n=10, target_month=None, target_year=None, demand_level=None):
        """
        Recommend crops based on predicted demand for a specific month and year
        
        Args:
            top_n (int): Number of top recommendations to return
            target_month (int): Target month for predictions (1-12)
            target_year (int): Target year for predictions
            demand_level (str): Filter by demand level (High, Moderate, Stable, Low)
            
        Returns:
            list: List of recommended vegetables with demand predictions
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Load current vegetable data
        try:
            veg_df = pd.read_csv('Data/vegetable_prices.csv')
            # Skip the first row which contains the header description
            veg_df = veg_df.iloc[1:]
            veg_df.columns = ['Vegetable', 'Year', 'Month', 'Price', 'Annual_Price', 'MonthNum', 'Date']
            
            # Convert data types
            veg_df['Price'] = pd.to_numeric(veg_df['Price'], errors='coerce')
            veg_df['Annual_Price'] = pd.to_numeric(veg_df['Annual_Price'], errors='coerce')
            veg_df['MonthNum'] = pd.to_numeric(veg_df['MonthNum'], errors='coerce')
            veg_df['Year'] = pd.to_numeric(veg_df['Year'], errors='coerce')
            
            # Clean the data
            veg_df = veg_df.dropna()
        except Exception as e:
            logger.error(f"Could not load vegetable data: {e}")
            return []
        
        # Get unique vegetables from current dataset
        current_vegetables = list(veg_df['Vegetable'].unique())
        
        # Filter to only include vegetables that were in the training data
        # (to avoid errors with the label encoder)
        available_vegetables = [v for v in current_vegetables if v in self.label_encoder.classes_]
        
        recommendations = []
        
        # For each available vegetable, get historical data and make prediction
        for vegetable in available_vegetables:
            try:
                # Filter data for this vegetable
                veg_data = veg_df[veg_df['Vegetable'] == vegetable].sort_values(['Year', 'MonthNum'])
                
                # If target month/year specified, we'll use data leading up to that timeframe
                if target_month is not None and target_year is not None:
                    # Filter to only include data before the target date
                    # We want to predict for the target month/year based on historical data
                    historical_data = veg_data[
                        (veg_data['Year'] < target_year) | 
                        ((veg_data['Year'] == target_year) & (veg_data['MonthNum'] < target_month))
                    ].tail(12)  # Take the last 12 months of historical data
                else:
                    # Use the most recent 12 months of data
                    historical_data = veg_data.tail(12)
                
                # If we don't have enough data, skip this vegetable
                if len(historical_data) < 3:  # Need at least 3 data points
                    continue
                
                # Extract historical data for prediction
                historical_prices = historical_data['Price'].tolist()
                historical_annual_prices = historical_data['Annual_Price'].tolist()
                historical_months = historical_data['MonthNum'].tolist()
                
                # Make prediction
                prediction = self.predict_demand(vegetable, historical_prices, 
                                               historical_annual_prices, historical_months)
                
                # Filter by demand level if specified
                if demand_level is not None:
                    if prediction['demand_level'].lower() == demand_level.lower():
                        recommendations.append(prediction)
                else:
                    recommendations.append(prediction)
            except Exception as e:
                logger.warning(f"Could not generate prediction for {vegetable}: {e}")
                continue
        
        # Sort by predicted price change (higher change = higher potential demand)
        recommendations.sort(key=lambda x: x['price_change_percent'], reverse=True)
        
        return recommendations[:top_n]

def print_evaluation_metrics(metrics):
    """Print evaluation metrics"""
    logger.info("\n" + "="*50)
    logger.info("MODEL EVALUATION METRICS")
    logger.info("="*50)
    logger.info(f"MSE: {metrics['mse']:.4f}")
    logger.info(f"MAE: {metrics['mae']:.4f}")
    logger.info(f"RMSE: {metrics['rmse']:.4f}")
    logger.info("="*50)

def main():
    """Main function to handle training and serving"""
    parser = argparse.ArgumentParser(description='Vegetable Demand Prediction Transformer Model')
    parser.add_argument('mode', choices=['train', 'serve'], help='Mode: train or serve')
    parser.add_argument('--vegetable-file', default='Data/vegetable_prices.csv', help='Path to vegetable_prices.csv')
    parser.add_argument('--port', type=int, default=8001, help='Port for FastAPI server')
    
    args = parser.parse_args()
    
    if args.mode == 'train':
        # Training mode
        logger.info("Starting training mode...")
        
        # Initialize model
        transformer = VegetableDemandTransformer()
        
        # Load and preprocess data
        try:
            X, y = transformer.load_and_preprocess_data(args.vegetable_file)
            
            if len(X) > 0 and len(y) > 0:
                # Train model
                history, metrics = transformer.train(X, y)
                
                # Save model
                transformer.save_model('models/vegetable_demand_transformer.h5', 
                                     'models/vegetable_preprocessing_pipeline.pkl')
                
                # Print evaluation metrics
                if metrics:
                    print_evaluation_metrics(metrics)
                
                logger.info("Training completed successfully!")
            else:
                logger.error("No valid data for training. Check the dataset.")
                
        except Exception as e:
            logger.error(f"Training failed: {e}")
            raise e
        
    elif args.mode == 'serve':
        # Serving mode
        logger.info("Starting FastAPI server...")
        
        # Import FastAPI here to avoid dependency issues when just training
        try:
            from fastapi import FastAPI, HTTPException
            from fastapi.middleware.cors import CORSMiddleware
            import uvicorn
        except ImportError:
            logger.error("FastAPI dependencies not installed. Install with: pip install fastapi uvicorn")
            return
        
        # Initialize FastAPI app
        app = FastAPI(title="Vegetable Demand Prediction API", 
                     description="Transformer-based vegetable demand prediction based on price trends")
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Global model instance
        model = VegetableDemandTransformer()
        try:
            model.load_model('models/vegetable_demand_transformer.keras', 
                           'models/vegetable_preprocessing_pipeline.pkl')
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
            model = None
        
        @app.get("/")
        async def root():
            return {"message": "Vegetable Demand Prediction API", 
                   "description": "POST /predict-demand or GET /recommend-crops"}
        
        @app.post("/predict-demand")
        async def predict_demand(data: dict):
            """
            Predict demand for a specific vegetable based on historical data
            
            Expected input format:
            {
                "vegetable_name": "CABBAGE (REPOLYO), 1 KG",
                "historical_prices": [73.71, 69.06, 67.27, ...],
                "historical_annual_prices": [80.68, 80.68, 80.68, ...],
                "historical_months": [1, 2, 3, ...]
            }
            
            Returns:
            {
                "vegetable": "CABBAGE (REPOLYO), 1 KG",
                "predicted_price": 75.23,
                "current_avg_price": 70.02,
                "price_change": 5.21,
                "price_change_percent": 7.44,
                "demand_level": "Moderate"
            }
            """
            try:
                if model is None:
                    raise HTTPException(status_code=500, detail="Model not loaded")
                
                # Validate input
                required_fields = ['vegetable_name', 'historical_prices', 'historical_annual_prices', 'historical_months']
                for field in required_fields:
                    if field not in data:
                        raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
                
                # Get predictions
                prediction = model.predict_demand(
                    data['vegetable_name'],
                    data['historical_prices'],
                    data['historical_annual_prices'],
                    data['historical_months']
                )
                
                return prediction
                
            except Exception as e:
                logger.error(f"Error in demand prediction: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Demand prediction error: {str(e)}")
        
        @app.get("/recommend-crops")
        async def recommend_crops(top_n: int = 10):
            """
            Get recommended crops based on predicted demand
            
            Args:
                top_n (int): Number of recommendations to return (default: 10)
                
            Returns:
            {
                "recommended_crops": [
                    {
                        "vegetable": "CABBAGE (REPOLYO), 1 KG",
                        "predicted_price": 75.23,
                        "current_avg_price": 70.02,
                        "price_change": 5.21,
                        "price_change_percent": 7.44,
                        "demand_level": "Moderate"
                    },
                    ...
                ]
            }
            """
            try:
                if model is None:
                    raise HTTPException(status_code=500, detail="Model not loaded")
                
                # Get recommendations
                recommendations = model.recommend_crops(top_n)
                
                return {"recommended_crops": recommendations}
                
            except Exception as e:
                logger.error(f"Error in crop recommendation: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Crop recommendation error: {str(e)}")
        
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "model_loaded": model is not None and model.model is not None}
        
        # Start server
        logger.info(f"Server starting on http://localhost:{args.port}")
        uvicorn.run(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
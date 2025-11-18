"""
Script to train separate models for each demand level
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import tensorflow as tf
from tensorflow.keras.layers import Input, Dense, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import pickle

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

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

class DemandLevelModel:
    """Model for predicting vegetables in a specific demand level"""
    
    def __init__(self, demand_level, hyperparams=None):
        self.demand_level = demand_level
        self.hyperparams = hyperparams or HYPERPARAMETERS
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = ['Price', 'Annual_Price', 'MonthNum']
        self.preprocessor = None
        
    def load_and_preprocess_data(self, vegetable_file='Data/vegetable_prices.csv'):
        """
        Load and preprocess the vegetable price data for a specific demand level
        
        Args:
            vegetable_file (str): Path to vegetable_prices.csv
            
        Returns:
            tuple: (X, y) preprocessed features and labels
        """
        logger.info(f"Loading and preprocessing vegetable price data for {self.demand_level} demand level...")
        
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
                
                # Determine demand level based on price change
                current_avg_price = avg_price
                price_change = target - current_avg_price
                price_change_percent = (price_change / current_avg_price) * 100 if current_avg_price != 0 else 0
                
                # Classify demand level
                if price_change_percent > 10:
                    demand_label = "High"
                elif price_change_percent > 5:
                    demand_label = "Moderate"
                elif price_change_percent > -5:
                    demand_label = "Stable"
                else:
                    demand_label = "Low"
                
                # Only include data that matches our target demand level
                if demand_label == self.demand_level:
                    processed_data.append({
                        'vegetable': vegetable,
                        'features': features,
                        'target': target
                    })
        
        if not processed_data:
            logger.warning(f"No valid sequences generated for {self.demand_level} demand level. Check data quality.")
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
        
        logger.info(f"Data preprocessing complete for {self.demand_level} demand level. Shape: {X_scaled.shape}")
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
        logger.info(f"Building neural network model for {self.demand_level} demand level...")
        
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
        logger.info(f"Model built successfully for {self.demand_level} demand level")
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
            
        logger.info(f"Starting model training for {self.demand_level} demand level...")
        
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
        
        logger.info(f"Training completed for {self.demand_level} demand level")
        return history, {"mse": mse, "mae": mae, "rmse": rmse}
    
    def save_model(self, model_path, preprocessor_path):
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

def train_demand_level_models():
    """Train separate models for each demand level"""
    demand_levels = ["High", "Moderate", "Stable", "Low"]
    
    for demand_level in demand_levels:
        logger.info(f"Training model for {demand_level} demand level...")
        
        # Initialize model
        model = DemandLevelModel(demand_level)
        
        # Load and preprocess data
        try:
            X, y = model.load_and_preprocess_data('Data/vegetable_prices.csv')
            
            if len(X) > 0 and len(y) > 0:
                # Train model
                history, metrics = model.train(X, y)
                
                # Save model
                model_path = f'models/vegetable_demand_{demand_level.lower()}_transformer.keras'
                preprocessor_path = f'models/vegetable_{demand_level.lower()}_preprocessing_pipeline.pkl'
                model.save_model(model_path, preprocessor_path)
                
                logger.info(f"Training completed successfully for {demand_level} demand level!")
            else:
                logger.warning(f"No valid data for training {demand_level} demand level model. Skipping...")
                
        except Exception as e:
            logger.error(f"Training failed for {demand_level} demand level: {e}")
            continue

if __name__ == "__main__":
    train_demand_level_models()
"""
Enhanced Soil Crop Recommendation Model

This script trains an enhanced model that combines:
1. Soil analysis data from barangay datasets
2. Weather data (temperature, humidity, precipitation, etc.)
3. Market demand predictions from vegetable price trends

Expected Input:
- brgy_soil_dataset.csv: Contains soil data for various barangays
- vegetable_prices.csv: Contains historical price data for various vegetables

Model Output:
- Recommended crops based on combined soil, weather, and market data
- Confidence scores for each recommendation
- Market demand predictions for recommended crops

Usage:
1. Training: python enhanced_soil_crop_service.py train
2. API Server: python enhanced_soil_crop_service.py serve
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
from sklearn.metrics import classification_report
import tensorflow as tf
from tensorflow.keras import layers
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
    'dropout_rate': 0.3,
    'test_size': 0.2,
    'validation_size': 0.2,
    'random_seed': 42
}

# Set random seed for reproducibility
np.random.seed(HYPERPARAMETERS['random_seed'])
tf.random.set_seed(HYPERPARAMETERS['random_seed'])

class EnhancedSoilCropTransformer:
    """Enhanced model for crop recommendation based on soil, weather, and market data"""
    
    def __init__(self, hyperparams=None):
        self.hyperparams = hyperparams or HYPERPARAMETERS
        self.model = None
        self.soil_label_encoder = LabelEncoder()
        self.crop_label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium', 
                               'temperature', 'humidity', 'precipitation_probability', 
                               'wind_speed', 'uv_index', 'market_demand_score']
        # For backward compatibility with soil-only data
        self.soil_feature_columns = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        self.preprocessor = None
        
    def load_and_preprocess_data(self, soil_file='Data/brgy_soil_dataset.csv', 
                                vegetable_file='Data/vegetable_prices.csv'):
        """
        Load and preprocess the soil analysis data and vegetable price data
        
        Args:
            soil_file (str): Path to brgy_soil_dataset.csv
            vegetable_file (str): Path to vegetable_prices.csv
            
        Returns:
            tuple: (X, y) preprocessed features and labels
        """
        logger.info("Loading and preprocessing combined data...")
        
        # Load soil analysis data
        try:
            soil_df = pd.read_csv(soil_file)
        except Exception as e:
            logger.warning(f"Could not load soil data from {soil_file}: {e}")
            logger.info("Generating synthetic soil data for demonstration...")
            soil_df = self._generate_synthetic_soil_data()
        
        # Clean the soil data
        soil_df = soil_df.dropna()
        
        # Convert categorical soil properties to numerical values (L=0, M=1, H=2)
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}
        
        soil_df['Nitrogen'] = soil_df['Nitrogen(N)'].map(nitrogen_map)
        soil_df['Phosphorus'] = soil_df['Phosphorus(P)'].map(phosphorus_map)
        soil_df['Potassium'] = soil_df['Potassium(K)'].map(potassium_map)
        
        # Fill NaN values
        soil_df['Nitrogen'] = soil_df['Nitrogen'].fillna(1)
        soil_df['Phosphorus'] = soil_df['Phosphorus'].fillna(1)
        soil_df['Potassium'] = soil_df['Potassium'].fillna(1)
        
        # Load vegetable price data
        try:
            veg_df = pd.read_csv(vegetable_file)
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
            logger.warning(f"Could not load vegetable data from {vegetable_file}: {e}")
            veg_df = self._generate_synthetic_vegetable_data()
        
        # Generate synthetic weather data to match soil data
        np.random.seed(42)
        n_samples = len(soil_df)
        
        # Add weather features to the dataframe
        soil_df['temperature'] = np.random.uniform(20, 35, n_samples)  # Temperature in Celsius
        soil_df['humidity'] = np.random.uniform(40, 80, n_samples)    # Humidity percentage
        soil_df['precipitation_probability'] = np.random.uniform(0, 100, n_samples)  # Precipitation probability %
        soil_df['wind_speed'] = np.random.uniform(0, 20, n_samples)   # Wind speed in km/h
        soil_df['uv_index'] = np.random.uniform(0, 10, n_samples)     # UV index
        
        # Add market demand scores based on vegetable price trends
        # Calculate a more sensitive demand score for each crop
        market_scores = {}
        unique_crops = soil_df['Crop'].unique()
        for vegetable in unique_crops:
            # Find matching vegetable in price data (fuzzy matching)
            matching_veg = veg_df[veg_df['Vegetable'].str.contains(str(vegetable).split('(')[0].strip(), case=False, na=False)]
            if not matching_veg.empty:
                # Calculate price trend as a demand indicator
                recent_prices = matching_veg.tail(12)['Price'].values  # Last 12 months for better trend analysis
                if len(recent_prices) > 1:
                    # Calculate price change percentage
                    price_change_pct = ((recent_prices[-1] - recent_prices[0]) / recent_prices[0]) * 100 if recent_prices[0] != 0 else 0
                    
                    # Calculate price volatility (standard deviation)
                    price_volatility = np.std(recent_prices) / np.mean(recent_prices) if np.mean(recent_prices) != 0 else 0
                    
                    # Calculate demand score: positive trend = higher demand, but high volatility = lower demand
                    # Scale to 0-1 range where higher means higher demand
                    demand_score = (price_change_pct - (price_volatility * 50))  # Adjust volatility impact
                    
                    # Normalize to 0-1 range
                    market_scores[vegetable] = max(0, min(1, (demand_score + 100) / 200))
                else:
                    market_scores[vegetable] = 0.5  # Neutral demand
            else:
                market_scores[vegetable] = 0.5  # Default neutral demand
        
        # Add market demand scores to soil data
        soil_df['market_demand_score'] = soil_df['Crop'].map(market_scores).fillna(0.5)
        
        # Features and labels
        X = soil_df[self.feature_columns].values
        y = soil_df['Crop'].values
        
        # Encode labels
        y_encoded = self.crop_label_encoder.fit_transform(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Save preprocessing pipeline
        self.preprocessor = {
            'soil_label_encoder': self.soil_label_encoder,
            'crop_label_encoder': self.crop_label_encoder,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'market_scores': market_scores
        }
        
        logger.info(f"Data preprocessing complete. Shape: {X_scaled.shape}")
        unique_count = len(np.unique(y_encoded)) if y_encoded is not None and len(y_encoded) > 0 else 0
        logger.info(f"Number of unique crops: {unique_count}")
        
        return X_scaled, y_encoded
    
    def _generate_synthetic_soil_data(self):
        """Generate synthetic soil data for demonstration purposes"""
        logger.info("Generating synthetic soil data...")
        
        # Sample crops
        crops = [
            "Rice", "Corn", "Vegetable Legumes", "Eggplant", "Okra", 
            "String Beans", "Broccoli", "Bitter Gourd", "Carrot", "Tomatoes"
        ]
        
        # Generate synthetic data
        np.random.seed(42)
        n_samples = 200
        
        data = {
            'Address': [f"Brgy. Area{i}" for i in range(n_samples)],
            'Crop': np.random.choice(crops, n_samples),
            'pH': np.random.uniform(5.0, 7.5, n_samples),
            'Nitrogen(N)': np.random.choice(['L', 'M', 'H'], n_samples),
            'Phosphorus(P)': np.random.choice(['L', 'M', 'H'], n_samples),
            'Potassium(K)': np.random.choice(['L', 'M', 'H'], n_samples)
        }
        
        return pd.DataFrame(data)
    
    def _generate_synthetic_vegetable_data(self):
        """Generate synthetic vegetable price data for demonstration purposes"""
        logger.info("Generating synthetic vegetable data...")
        
        # Sample vegetables
        vegetables = [
            "REPOLYO (CABBAGE), 1 KG", "KOLIFLOWER (CAULIFLOWER), 1 KG", 
            "AMPALAYA (BITTER GOURD), 1 KG", "TALONG (EGGPLANT), (NATIVE), 1 KG",
            "OKRA, 1 KG", "SITAW (STRING BEAN), 1 KG", "BROKOLI (BROCCOLI), 1 KG"
        ]
        
        # Generate synthetic data
        np.random.seed(42)
        n_samples = 100
        
        data = {
            'Vegetable': np.random.choice(vegetables, n_samples),
            'Year': np.random.randint(2018, 2023, n_samples),
            'Month': np.random.choice(['January', 'February', 'March', 'April', 'May', 'June', 
                                     'July', 'August', 'September', 'October', 'November', 'December'], n_samples),
            'Price': np.random.uniform(20, 200, n_samples),
            'Annual_Price': np.random.uniform(20, 200, n_samples),
            'MonthNum': np.random.randint(1, 13, n_samples),
            'Date': pd.date_range('2018-01-01', periods=n_samples, freq='M').strftime('%m/%d/%Y')
        }
        
        return pd.DataFrame(data)
    
    def build_model(self, input_shape, num_classes):
        """
        Build a neural network model for crop recommendation
        
        Args:
            input_shape (tuple): Shape of input features
            num_classes (int): Number of output classes (crop types)
            
        Returns:
            Model: Compiled Keras model
        """
        logger.info("Building enhanced neural network model...")
        
        # Input layer
        inputs = layers.Input(shape=input_shape)
        
        # Enhanced architecture with more layers to capture soil variations
        x = layers.Dense(256, activation='relu')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.hyperparams['dropout_rate'])(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.hyperparams['dropout_rate'])(x)
        x = layers.Dense(64, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(self.hyperparams['dropout_rate'])(x)
        x = layers.Dense(32, activation='relu')(x)
        x = layers.Dropout(self.hyperparams['dropout_rate'])(x)
        
        # Output layer
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        # Create model
        model = Model(inputs=inputs, outputs=outputs)
        
        # Compile model with a lower learning rate for better convergence
        optimizer = tf.keras.optimizers.Adam(learning_rate=self.hyperparams['learning_rate'])
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        logger.info("Enhanced model built successfully")
        return model
    
    def train(self, X, y):
        """
        Train the model
        
        Args:
            X (np.array): Input features
            y (np.array): Target labels
        """
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
        unique_classes = np.unique(y) if y is not None and len(y) > 0 else np.array([0])
        num_classes = len(unique_classes) if len(unique_classes) > 0 else 1
        self.build_model((X_train.shape[1],), num_classes)
        
        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=20,
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
        test_loss, test_accuracy = self.model.evaluate(X_test, y_test, verbose=0)
        logger.info(f"Test Accuracy: {test_accuracy:.4f}")
        
        # Generate classification report
        y_pred = np.argmax(self.model.predict(X_test, verbose=0), axis=1)
        # Get unique labels in test set
        unique_labels = np.unique(np.concatenate([y_test, y_pred]))
        
        # Create classification report
        target_names = self.crop_label_encoder.inverse_transform(unique_labels)
        report = classification_report(y_test, y_pred, target_names=target_names, output_dict=True, zero_division="warn")
        
        return history, report
    
    def predict(self, soil_data, weather_data=None, market_context=None):
        """
        Predict suitable crops based on soil data, weather data, and market context
        
        Args:
            soil_data (dict): Dictionary containing soil properties
                {
                    "pH": 6.5,
                    "Nitrogen": "M",  # L, M, or H
                    "Phosphorus": "L",  # L, M, or H
                    "Potassium": "H"   # L, M, or H
                }
            weather_data (dict): Dictionary containing weather data
                {
                    "temperature": 28.5,
                    "humidity": 65,
                    "precipitation_probability": 20,
                    "wind_speed": 10,
                    "uv_index": 7
                }
            market_context (dict): Dictionary containing market context
                {
                    "season": "dry",  # or "wet"
                    "month": 6  # 1-12
                }
                
        Returns:
            list: List of tuples (crop_name, confidence, market_demand_score) sorted by combined score
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Convert categorical values to numerical
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}
        
        # Prepare input data with default values
        input_data = np.array([[
            soil_data['pH'],
            nitrogen_map[soil_data['Nitrogen']],
            phosphorus_map[soil_data['Phosphorus']],
            potassium_map[soil_data['Potassium']],
            weather_data.get('temperature', 25.0) if weather_data else 25.0,
            weather_data.get('humidity', 60.0) if weather_data else 60.0,
            weather_data.get('precipitation_probability', 50.0) if weather_data else 50.0,
            weather_data.get('wind_speed', 10.0) if weather_data else 10.0,
            weather_data.get('uv_index', 5.0) if weather_data else 5.0,
            0.5  # Default market demand score
        ]])
        
        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        
        # Make prediction
        predictions = self.model.predict(input_scaled, verbose=0)[0]
        
        # Apply boosts to crops that are known to grow in similar conditions
        # This helps ensure relevant crops appear in recommendations even if model confidence is low
        all_crops = self.crop_label_encoder.classes_
        
        # Create a mapping of soil conditions to boost certain crops
        soil_conditions = {
            'pH': soil_data['pH'],
            'Nitrogen': soil_data['Nitrogen'],
            'Phosphorus': soil_data['Phosphorus'],
            'Potassium': soil_data['Potassium']
        }
        
        # Apply boosts based on training data patterns
        boosted_predictions = predictions.copy()
        for i, crop in enumerate(all_crops):
            # Boost Ampalaya for pH 5.5-6.5 and Medium nutrients
            if crop == 'Ampalaya (Bitter Gourd)' and 5.5 <= soil_conditions['pH'] <= 6.5:
                # Calculate boost based on how well the conditions match
                ph_boost = 1.0 - abs(soil_conditions['pH'] - 6.0) / 1.0  # Max boost at pH 6.0
                nutrient_boost = 1.0 if soil_conditions['Nitrogen'] == 'M' and soil_conditions['Phosphorus'] == 'M' and soil_conditions['Potassium'] == 'M' else 0.5
                boost_factor = 0.3 * ph_boost * nutrient_boost
                boosted_predictions[i] = min(1.0, boosted_predictions[i] + boost_factor)
                print(f"Boosted Ampalaya prediction from {predictions[i]} to {boosted_predictions[i]}")
            
            # Boost Sayote for similar conditions
            if crop == 'Sayote (Chayote)' and 5.5 <= soil_conditions['pH'] <= 7.0:
                # Calculate boost based on how well the conditions match
                ph_boost = 1.0 - abs(soil_conditions['pH'] - 6.25) / 1.5  # Max boost at pH 6.25
                nutrient_boost = 1.0 if soil_conditions['Nitrogen'] == 'M' and soil_conditions['Phosphorus'] == 'M' and soil_conditions['Potassium'] == 'M' else 0.5
                boost_factor = 0.25 * ph_boost * nutrient_boost
                boosted_predictions[i] = min(1.0, boosted_predictions[i] + boost_factor)
                print(f"Boosted Sayote prediction from {predictions[i]} to {boosted_predictions[i]}")
            
            # Boost Koliflower for a wide range of conditions since it's common
            if crop == 'Koliflower (Cauliflower)' and 5.5 <= soil_conditions['pH'] <= 7.5:
                # Calculate boost based on how well the conditions match
                ph_boost = 1.0 - abs(soil_conditions['pH'] - 6.5) / 2.0  # Max boost at pH 6.5
                nutrient_boost = 1.0 if soil_conditions['Nitrogen'] in ['M', 'H'] else 0.7
                boost_factor = 0.2 * ph_boost * nutrient_boost
                boosted_predictions[i] = min(1.0, boosted_predictions[i] + boost_factor)
                print(f"Boosted Koliflower prediction from {predictions[i]} to {boosted_predictions[i]}")
        
        # Get top predictions
        top_indices = np.argsort(boosted_predictions)[-12:][::-1]  # Get more predictions to ensure variety
        top_crops = self.crop_label_encoder.inverse_transform(top_indices)
        top_confidences = boosted_predictions[top_indices]
        
        # Get market demand scores for top crops
        market_scores = []
        for crop in top_crops:
            score = self.preprocessor.get('market_scores', {}).get(crop, 0.5)
            market_scores.append(score)
        
        # Combine confidence and market demand scores (weighted average)
        # Increase sensitivity to model predictions
        combined_scores = 0.7 * top_confidences + 0.3 * np.array(market_scores)
        
        # Sort by combined score
        sort_indices = np.argsort(combined_scores)[::-1]
        
        # Return as list of tuples with combined scores
        result = []
        for i in sort_indices:
            result.append((
                top_crops[i], 
                float(combined_scores[i]), 
                float(market_scores[i])
            ))
        
        # Limit to top 10 results to match frontend expectations
        return result[:10]
    
    def save_model(self, model_path='models/enhanced_soil_crop_transformer.keras', 
                   preprocessor_path='models/enhanced_soil_preprocessing_pipeline.pkl'):
        """
        Save the trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to save the model
            preprocessor_path (str): Path to save the preprocessing pipeline
        """
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        # Create models directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        # Save model
        self.model.save(model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Save preprocessing pipeline
        with open(preprocessor_path, 'wb') as f:
            pickle.dump(self.preprocessor, f)
        logger.info(f"Preprocessing pipeline saved to {preprocessor_path}")
    
    def load_model(self, model_path='models/enhanced_soil_crop_transformer.keras', 
                   preprocessor_path='models/enhanced_soil_preprocessing_pipeline.pkl'):
        """
        Load a trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to load the model from
            preprocessor_path (str): Path to load the preprocessing pipeline from
        """
        # Load model
        self.model = tf.keras.models.load_model(model_path)
        logger.info(f"Model loaded from {model_path}")
        
        # Load preprocessing pipeline
        with open(preprocessor_path, 'rb') as f:
            self.preprocessor = pickle.load(f)
        
        # Restore components
        self.soil_label_encoder = self.preprocessor['soil_label_encoder']
        self.crop_label_encoder = self.preprocessor['crop_label_encoder']
        self.scaler = self.preprocessor['scaler']
        self.feature_columns = self.preprocessor['feature_columns']
        
        logger.info(f"Preprocessing pipeline loaded from {preprocessor_path}")

def print_evaluation_report(report):
    """Print a formatted evaluation report"""
    print("\n" + "="*50)
    print("MODEL EVALUATION REPORT")
    print("="*50)
    
    # Overall metrics
    print(f"Accuracy: {report['accuracy']:.4f}")
    print("\nPer-class metrics:")
    print("-" * 50)
    
    # Remove 'accuracy' and 'macro avg'/'weighted avg' from report for per-class display
    for class_name, metrics in report.items():
        if class_name not in ['accuracy', 'macro avg', 'weighted avg']:
            print(f"{class_name}:")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall: {metrics['recall']:.4f}")
            print(f"  F1-Score: {metrics['f1-score']:.4f}")
            print(f"  Support: {metrics['support']}")
            print()

def main():
    """Main function to handle training and serving"""
    parser = argparse.ArgumentParser(description='Enhanced Soil Crop Recommendation Model')
    parser.add_argument('mode', choices=['train', 'serve'], help='Mode: train or serve')
    parser.add_argument('--soil-file', default='Data/brgy_soil_dataset.csv', help='Path to brgy_soil_dataset.csv')
    parser.add_argument('--vegetable-file', default='Data/vegetable_prices.csv', help='Path to vegetable_prices.csv')
    parser.add_argument('--port', type=int, default=8002, help='Port for FastAPI server')
    
    args = parser.parse_args()
    
    if args.mode == 'train':
        # Training mode
        logger.info("Starting training mode...")
        
        # Initialize model
        transformer = EnhancedSoilCropTransformer()
        
        # Load and preprocess data
        X, y = transformer.load_and_preprocess_data(args.soil_file, args.vegetable_file)
        
        # Train model
        history, report = transformer.train(X, y)
        
        # Save model
        transformer.save_model('models/enhanced_soil_crop_transformer.keras', 
                             'models/enhanced_soil_preprocessing_pipeline.pkl')
        
        # Print evaluation report
        print_evaluation_report(report)
        
        logger.info("Training completed successfully!")
        
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
        app = FastAPI(title="Enhanced Soil Crop Recommendation API", 
                     description="Enhanced crop recommendation based on soil, weather, and market data")
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Global model instance
        model = EnhancedSoilCropTransformer()
        model.load_model('models/enhanced_soil_crop_transformer.keras', 
                        'models/enhanced_soil_preprocessing_pipeline.pkl')
        
        @app.get("/")
        async def root():
            return {"message": "Soil Crop Recommendation API", 
                   "description": "POST /enhanced-recommend to get crop recommendations based on soil, weather, and market data"}
        
        @app.post("/enhanced-recommend")
        async def enhanced_recommend_crops(data: dict):
            """
            Get crop recommendations based on soil, weather, and market data
            
            Expected input format:
            {
                "soil_data": {
                    "pH": 6.5,
                    "Nitrogen": "M",  # L, M, or H
                    "Phosphorus": "L",  # L, M, or H
                    "Potassium": "H"   # L, M, or H
                },
                "weather_data": {
                    "temperature": 28.5,
                    "humidity": 65,
                    "precipitation_probability": 20,
                    "wind_speed": 10,
                    "uv_index": 7
                },
                "market_context": {
                    "season": "dry",  # or "wet"
                    "month": 6  # 1-12
                }
            }
            
            Returns:
            {
                "recommended_crops": [
                    {
                        "crop": "Rice", 
                        "confidence": 0.85,
                        "market_demand_score": 0.75
                    },
                    {
                        "crop": "Corn", 
                        "confidence": 0.12,
                        "market_demand_score": 0.60
                    },
                    {
                        "crop": "Vegetable Legumes", 
                        "confidence": 0.03,
                        "market_demand_score": 0.45
                    }
                ]
            }
            """
            try:
                # Validate input
                if 'soil_data' not in data:
                    raise HTTPException(status_code=400, detail="Missing soil_data in request")
                
                soil_data = data['soil_data']
                weather_data = data.get('weather_data', {})
                market_context = data.get('market_context', {})
                
                # Validate soil data
                required_soil_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
                for field in required_soil_fields:
                    if field not in soil_data:
                        raise HTTPException(status_code=400, detail=f"Missing required soil field: {field}")
                
                # Validate categorical values
                valid_levels = ['L', 'M', 'H']
                for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
                    if soil_data[field] not in valid_levels:
                        raise HTTPException(status_code=400, detail=f"Invalid value for soil {field}. Must be L, M, or H")
                
                # Validate pH range
                if not (0 <= soil_data['pH'] <= 14):
                    raise HTTPException(status_code=400, detail="pH must be between 0 and 14")
                
                # Get predictions with data
                predictions = model.predict(soil_data, weather_data, market_context)
                
                # Format response
                recommended_crops = [
                    {
                        "crop": crop, 
                        "confidence": float(confidence),
                        "market_demand_score": float(market_score)
                    }
                    for crop, confidence, market_score in predictions
                ]
                
                return {"recommended_crops": recommended_crops}
                
            except Exception as e:
                logger.error(f"Error in prediction: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
        
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "model_loaded": model.model is not None}
        
        # Start server
        logger.info(f"Server starting on http://localhost:{args.port}")
        uvicorn.run(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
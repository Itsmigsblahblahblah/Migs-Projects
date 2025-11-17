"""
Transformer-based Soil Crop Recommendation Model

This script trains a Transformer-based model on soil data to recommend 
suitable crops based on soil properties and optional weather data.

Expected Input:
- brgy_soil_dataset.csv: Contains soil data for various barangays

Model Output:
- Recommended crops based on soil properties
- Confidence scores for each recommendation

Usage:
1. Training: python soil_crop_service.py train --soil-file Data/brgy_soil_dataset.csv
2. API Server: python soil_crop_service.py serve --soil-file Data/brgy_soil_dataset.csv
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
    'random_seed': 42
}

# Set random seed for reproducibility
np.random.seed(HYPERPARAMETERS['random_seed'])
tf.random.set_seed(HYPERPARAMETERS['random_seed'])

class SoilCropTransformer:
    """Transformer-based model for crop recommendation based on soil properties"""
    
    def __init__(self, hyperparams=None):
        self.hyperparams = hyperparams or HYPERPARAMETERS
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium', 
                               'temperature', 'humidity', 'precipitation_probability', 
                               'wind_speed', 'uv_index']
        # For backward compatibility with soil-only data
        self.soil_feature_columns = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        self.preprocessor = None
        
    def load_and_preprocess_data(self, soil_file='Data/brgy_soil_dataset.csv'):
        """
        Load and preprocess the soil analysis data from barangay dataset
        
        Args:
            soil_file (str): Path to brgy_soil_dataset.csv
            
        Returns:
            tuple: (X, y) preprocessed features and labels
        """
        logger.info("Loading and preprocessing barangay soil data...")
        
        # Load soil analysis data
        try:
            soil_df = pd.read_csv(soil_file)
            # No need to skip rows or rename columns as the new file has the correct format
        except Exception as e:
            logger.warning(f"Could not load soil data from {soil_file}: {e}")
            logger.info("Generating synthetic soil data for demonstration...")
            soil_df = self._generate_synthetic_soil_data()
        
        # Clean the data
        soil_df = soil_df.dropna()
        
        # Convert categorical soil properties to numerical values (L=0, M=1, H=2)
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}
        
        soil_df['Nitrogen'] = soil_df['Nitrogen(N)'].replace(nitrogen_map)
        soil_df['Phosphorus'] = soil_df['Phosphorus(P)'].replace(phosphorus_map)
        soil_df['Potassium'] = soil_df['Potassium(K)'].replace(potassium_map)
        
        # Fill NaN values
        soil_df['Nitrogen'] = soil_df['Nitrogen'].fillna(1)
        soil_df['Phosphorus'] = soil_df['Phosphorus'].fillna(1)
        soil_df['Potassium'] = soil_df['Potassium'].fillna(1)
        
        # Generate synthetic weather data to match soil data
        np.random.seed(42)
        n_samples = len(soil_df)
        
        # Add weather features to the dataframe
        soil_df['temperature'] = np.random.uniform(20, 35, n_samples)  # Temperature in Celsius
        soil_df['humidity'] = np.random.uniform(40, 80, n_samples)    # Humidity percentage
        soil_df['precipitation_probability'] = np.random.uniform(0, 100, n_samples)  # Precipitation probability %
        soil_df['wind_speed'] = np.random.uniform(0, 20, n_samples)   # Wind speed in km/h
        soil_df['uv_index'] = np.random.uniform(0, 10, n_samples)     # UV index
        
        # Features and labels
        X = soil_df[self.feature_columns].values
        y = soil_df['Crop'].values
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Save preprocessing pipeline
        self.preprocessor = {
            'label_encoder': self.label_encoder,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns
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
    
    def build_model(self, input_shape, num_classes):
        """
        Build a neural network model for crop recommendation
        
        Args:
            input_shape (tuple): Shape of input features
            num_classes (int): Number of output classes (crop types)
            
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
        
        # Output layer
        outputs = Dense(num_classes, activation='softmax')(x)
        
        # Create model
        model = Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        logger.info("Model built successfully")
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
        self.build_model(X_train.shape[1:], len(unique_classes) if len(unique_classes) > 0 else 1)
        
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
        test_loss, test_accuracy = self.model.evaluate(X_test, y_test, verbose=0)
        logger.info(f"Test Accuracy: {test_accuracy:.4f}")
        
        # Generate classification report
        y_pred = np.argmax(self.model.predict(X_test, verbose=0), axis=1)
        # Get unique labels in test set
        unique_labels = np.unique(np.concatenate([y_test, y_pred]))
        
        # Create classification report
        target_names = self.label_encoder.inverse_transform(unique_labels)
        report = classification_report(y_test, y_pred, target_names=target_names, output_dict=True, zero_division="warn")
        
        return history, report
    
    def predict(self, soil_data):
        """
        Predict suitable crops based on soil data
        
        Args:
            soil_data (dict): Dictionary containing soil properties
                {
                    "pH": 6.5,
                    "Nitrogen": "M",  # L, M, or H
                    "Phosphorus": "L",  # L, M, or H
                    "Potassium": "H"   # L, M, or H
                }
                
        Returns:
            list: List of tuples (crop_name, confidence) sorted by confidence
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Convert categorical values to numerical
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}
        
        # Prepare input data with default weather values
        input_data = np.array([[
            soil_data['pH'],
            nitrogen_map[soil_data['Nitrogen']],
            phosphorus_map[soil_data['Phosphorus']],
            potassium_map[soil_data['Potassium']],
            25.0,  # Default temperature
            60.0,  # Default humidity
            50.0,  # Default precipitation probability
            10.0,  # Default wind speed
            5.0    # Default UV index
        ]])
        
        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        
        # Make prediction
        predictions = self.model.predict(input_scaled, verbose=0)[0]
        
        # Get top 5 predictions
        top_indices = np.argsort(predictions)[-5:][::-1]
        top_crops = self.label_encoder.inverse_transform(top_indices)
        top_confidences = predictions[top_indices]
        
        # Return as list of tuples
        return list(zip(top_crops, top_confidences))
    
    def predict_with_weather(self, soil_data, weather_data):
        """
        Predict suitable crops based on soil and weather data
        
        Args:
            soil_data (dict): Dictionary containing soil properties
            weather_data (dict): Dictionary containing weather data
            
        Returns:
            list: List of tuples (crop_name, confidence) sorted by confidence
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Convert categorical values to numerical
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}
        
        # Prepare input data
        input_data = np.array([[
            soil_data['pH'],
            nitrogen_map[soil_data['Nitrogen']],
            phosphorus_map[soil_data['Phosphorus']],
            potassium_map[soil_data['Potassium']],
            weather_data.get('temperature', 25.0),
            weather_data.get('humidity', 60.0),
            weather_data.get('precipitation_probability', 50.0),
            weather_data.get('wind_speed', 10.0),
            weather_data.get('uv_index', 5.0)
        ]])
        
        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        
        # Make prediction
        predictions = self.model.predict(input_scaled, verbose=0)[0]
        
        # Get top 5 predictions
        top_indices = np.argsort(predictions)[-5:][::-1]
        top_crops = self.label_encoder.inverse_transform(top_indices)
        top_confidences = predictions[top_indices]
        
        # Return as list of tuples
        return list(zip(top_crops, top_confidences))
    
    def save_model(self, model_path='models/soil_crop_transformer.keras', preprocessor_path='models/soil_preprocessing_pipeline.pkl'):
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
    
    def load_model(self, model_path='models/soil_crop_transformer.keras', preprocessor_path='models/soil_preprocessing_pipeline.pkl'):
        """
        Load a trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to load the model from
            preprocessor_path (str): Path to load the preprocessing pipeline from
        """
        from tensorflow.keras.models import load_model
        
        # Load model
        self.model = load_model(model_path)
        logger.info(f"Model loaded from {model_path}")
        
        # Load preprocessing pipeline
        with open(preprocessor_path, 'rb') as f:
            self.preprocessor = pickle.load(f)
        
        # Restore components
        self.label_encoder = self.preprocessor['label_encoder']
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
    parser = argparse.ArgumentParser(description='Soil Crop Recommendation Transformer Model')
    parser.add_argument('mode', choices=['train', 'serve'], help='Mode: train or serve')
    parser.add_argument('--soil-file', default='Data/brgy_soil_dataset.csv', help='Path to brgy_soil_dataset.csv')
    parser.add_argument('--port', type=int, default=8000, help='Port for FastAPI server')
    
    args = parser.parse_args()
    
    if args.mode == 'train':
        # Training mode
        logger.info("Starting training mode...")
        
        # Initialize model
        transformer = SoilCropTransformer()
        
        # Load and preprocess data
        X, y = transformer.load_and_preprocess_data(args.soil_file)
        
        # Train model
        history, report = transformer.train(X, y)
        
        # Save model
        transformer.save_model()
        
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
        app = FastAPI(title="Soil Crop Recommendation API", 
                     description="Transformer-based crop recommendation based on soil analysis")
        
        # Add CORS middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Global model instance
        model = SoilCropTransformer()
        model.load_model()
        
        @app.get("/")
        async def root():
            return {"message": "Soil Crop Recommendation API", 
                   "description": "POST /recommend to get crop recommendations based on soil data"}
        
        @app.post("/recommend")
        async def recommend_crops(soil_data: dict):
            """
            Get crop recommendations based on soil data
            
            Expected input format:
            {
                "pH": 6.5,
                "Nitrogen": "M",  # L, M, or H
                "Phosphorus": "L",  # L, M, or H
                "Potassium": "H"   # L, M, or H
            }
            
            Returns:
            {
                "recommended_crops": [
                    {"crop": "Rice", "confidence": 0.85},
                    {"crop": "Corn", "confidence": 0.12},
                    {"crop": "Vegetable Legumes", "confidence": 0.03}
                ]
            }
            """
            try:
                # Validate input
                required_fields = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
                for field in required_fields:
                    if field not in soil_data:
                        raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
                
                # Validate categorical values
                valid_levels = ['L', 'M', 'H']
                for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
                    if soil_data[field] not in valid_levels:
                        raise HTTPException(status_code=400, detail=f"Invalid value for {field}. Must be L, M, or H")
                
                # Validate pH range
                if not (0 <= soil_data['pH'] <= 14):
                    raise HTTPException(status_code=400, detail="pH must be between 0 and 14")
                
                # Get predictions
                predictions = model.predict(soil_data)
                
                # Format response
                recommended_crops = [
                    {"crop": crop, "confidence": float(confidence)}
                    for crop, confidence in predictions
                ]
                
                return {"recommended_crops": recommended_crops}
                
            except Exception as e:
                logger.error(f"Error in prediction: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
        
        @app.post("/recommend-with-weather")
        async def recommend_crops_with_weather(data: dict):
            """
            Get crop recommendations based on soil and weather data
            
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
                }
            }
            
            Returns:
            {
                "recommended_crops": [
                    {"crop": "Rice", "confidence": 0.85},
                    {"crop": "Corn", "confidence": 0.12},
                    {"crop": "Vegetable Legumes", "confidence": 0.03}
                ]
            }
            """
            try:
                # Validate input
                if 'soil_data' not in data:
                    raise HTTPException(status_code=400, detail="Missing soil_data in request")
                
                if 'weather_data' not in data:
                    raise HTTPException(status_code=400, detail="Missing weather_data in request")
                
                soil_data = data['soil_data']
                weather_data = data['weather_data']
                
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
                
                # Get predictions with weather data
                predictions = model.predict_with_weather(soil_data, weather_data)
                
                # Format response
                recommended_crops = [
                    {"crop": crop, "confidence": float(confidence)}
                    for crop, confidence in predictions
                ]
                
                return {"recommended_crops": recommended_crops}
                
            except Exception as e:
                logger.error(f"Error in weather-enhanced prediction: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
        
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "model_loaded": model.model is not None}
        
        @app.get("/soil-data/{barangay}")
        async def get_soil_data(barangay: str):
            """
            Get soil data for a specific barangay
            
            Args:
                barangay (str): Name of the barangay
            
            Returns:
                dict: Soil data for the barangay or empty dict if not found
            """
            try:
                # Load soil analysis data
                soil_file = args.soil_file
                try:
                    soil_df = pd.read_csv(soil_file)
                except Exception as e:
                    logger.warning(f"Could not load soil data from {soil_file}: {e}")
                    return {"soil_data": {}}
                
                # Clean the data
                soil_df = soil_df.dropna()
                
                # Find matching barangay (case insensitive partial match)
                matching_rows = soil_df[soil_df['Address'].str.contains(barangay, case=False, na=False)]
                
                if not matching_rows.empty:
                    # Get the first matching row
                    row = matching_rows.iloc[0]
                    soil_data = {
                        "pH": float(row['pH']),
                        "Nitrogen": row['Nitrogen(N)'],
                        "Phosphorus": row['Phosphorus(P)'],
                        "Potassium": row['Potassium(K)']
                    }
                    return {"soil_data": soil_data}
                else:
                    # Return empty data if not found
                    return {"soil_data": {}}
                    
            except Exception as e:
                logger.error(f"Error fetching soil data for {barangay}: {str(e)}")
                return {"soil_data": {}}
        
        # Start server
        logger.info(f"Server starting on http://localhost:{args.port}")
        uvicorn.run(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
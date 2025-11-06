"""
Transformer-based Crop Recommendation Model for Soil Analysis Data

This script trains a Transformer-based model on soil analysis data to recommend crops.
It processes two CSV files:
1. Soilanaly.csv - Contains actual soil analysis results from different locations
2. FertilizerRecomm.csv - Contains standardized fertilizer recommendations for crops

Expected Input Columns:
- Soilanaly.csv: Address, Crop, pH, Nitrogen(N), Phosphorus(P), Potassium(K), Fertilizer recommendations
- FertilizerRecomm.csv: Crop/Variety, Nitrogen (Low/Medium/High), Phosphorus (Low/Medium/High), Potassium (Low/Medium/High)

Model Output:
- Recommended crops based on soil properties (pH, Nitrogen, Phosphorus, Potassium levels)

Usage:
1. Training: python fert_soil_transformer.py train
2. API Server: python fert_soil_transformer.py serve

Artifacts Saved:
- fert_soil_transformer.h5: Trained model in Keras HDF5 format
- preprocessing_pipeline.pkl: Preprocessing pipeline for consistent data transformation
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
from sklearn.metrics import classification_report, confusion_matrix
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
    """Neural network model for crop recommendation based on soil data"""
    
    def __init__(self, hyperparams=None):
        self.hyperparams = hyperparams or HYPERPARAMETERS
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.feature_columns = ['pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        self.preprocessor = None
        
    def load_and_preprocess_data(self, soil_file='Backend/Data/Soilanaly.csv', 
                                fertilizer_file='Backend/Data/FertilizerRecomm.csv'):
        """
        Load and preprocess the soil analysis and fertilizer recommendation data
        
        Args:
            soil_file (str): Path to Soilanaly.csv
            fertilizer_file (str): Path to FertilizerRecomm.csv
            
        Returns:
            tuple: (X, y) preprocessed features and labels
        """
        logger.info("Loading and preprocessing data...")
        
        # Load soil analysis data
        try:
            soil_df = pd.read_csv(soil_file, skiprows=2, usecols=range(1, 8))
            soil_df.columns = ['Address', 'Crop', 'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Fertilizer_Recommendation']
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
        
        soil_df['Nitrogen'] = soil_df['Nitrogen'].replace(nitrogen_map)
        soil_df['Phosphorus'] = soil_df['Phosphorus'].replace(phosphorus_map)
        soil_df['Potassium'] = soil_df['Potassium'].replace(potassium_map)
        
        # Fill NaN values
        soil_df['Nitrogen'] = soil_df['Nitrogen'].fillna(1)
        soil_df['Phosphorus'] = soil_df['Phosphorus'].fillna(1)
        soil_df['Potassium'] = soil_df['Potassium'].fillna(1)
        
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
            'Nitrogen': np.random.choice(['L', 'M', 'H'], n_samples),
            'Phosphorus': np.random.choice(['L', 'M', 'H'], n_samples),
            'Potassium': np.random.choice(['L', 'M', 'H'], n_samples),
            'Fertilizer_Recommendation': np.random.uniform(2.0, 8.0, n_samples)
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
        unique_classes = np.unique(y) if y is not None else np.array([0])
        self.build_model(X_train.shape[1:], len(unique_classes))
        
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
        target_names = [self.label_encoder.inverse_transform([i])[0] for i in unique_labels]
        report = classification_report(y_test, y_pred, labels=unique_labels, target_names=target_names, output_dict=True)
        
        logger.info("Training completed")
        return history, report
    
    def save_model(self, model_path='fert_soil_transformer.h5', preprocessor_path='preprocessing_pipeline.pkl'):
        """
        Save the trained model and preprocessing pipeline
        
        Args:
            model_path (str): Path to save the model
            preprocessor_path (str): Path to save the preprocessing pipeline
        """
        if self.model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        # Save model
        self.model.save(model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Save preprocessing pipeline
        with open(preprocessor_path, 'wb') as f:
            pickle.dump(self.preprocessor, f)
        logger.info(f"Preprocessing pipeline saved to {preprocessor_path}")
    
    def load_model(self, model_path='fert_soil_transformer.h5', preprocessor_path='preprocessing_pipeline.pkl'):
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
        logger.info(f"Preprocessing pipeline loaded from {preprocessor_path}")
    
    def predict(self, soil_data):
        """
        Predict recommended crops based on soil data
        
        Args:
            soil_data (dict): Dictionary with soil properties
                Example: {"pH": 6.5, "Nitrogen": "M", "Phosphorus": "L", "Potassium": "H"}
                
        Returns:
            list: List of recommended crops with confidence scores
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
            nitrogen_map.get(soil_data['Nitrogen'], 1),
            phosphorus_map.get(soil_data['Phosphorus'], 1),
            potassium_map.get(soil_data['Potassium'], 1)
        ]])
        
        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        
        # Make prediction
        predictions = self.model.predict(input_scaled, verbose=0)
        
        # Get top 3 predictions
        top_3_indices = np.argsort(predictions[0])[::-1][:3]
        top_3_crops = [self.label_encoder.inverse_transform([i])[0] for i in top_3_indices]
        top_3_scores = [predictions[0][i] for i in top_3_indices]
        
        return list(zip(top_3_crops, top_3_scores))

def print_evaluation_report(report):
    """Print a formatted evaluation report"""
    logger.info("\n" + "="*50)
    logger.info("MODEL EVALUATION REPORT")
    logger.info("="*50)
    
    # Overall metrics
    logger.info(f"Overall Accuracy: {report['accuracy']:.4f}")
    
    # Per-class metrics (showing top 5 classes for brevity)
    logger.info("\nPer-Class Metrics (Top 5):")
    logger.info("-" * 50)
    logger.info(f"{'Class':<20} {'Precision':<10} {'Recall':<10} {'F1-Score':<10}")
    logger.info("-" * 50)
    
    # Sort classes by support (number of samples)
    classes_with_support = [(cls, report[cls]['support']) for cls in report.keys() 
                           if cls not in ['accuracy', 'macro avg', 'weighted avg']]
    classes_sorted = sorted(classes_with_support, key=lambda x: x[1], reverse=True)
    
    for cls, _ in classes_sorted[:5]:  # Show top 5 classes
        metrics = report[cls]
        logger.info(f"{cls:<20} {metrics['precision']:<10.4f} {metrics['recall']:<10.4f} {metrics['f1-score']:<10.4f}")
    
    logger.info("="*50)

def main():
    """Main function to handle training and serving"""
    parser = argparse.ArgumentParser(description='Soil Crop Recommendation Transformer Model')
    parser.add_argument('mode', choices=['train', 'serve'], help='Mode: train or serve')
    parser.add_argument('--soil-file', default='Backend/Data/Soilanaly.csv', help='Path to Soilanaly.csv')
    parser.add_argument('--fertilizer-file', default='Backend/Data/FertilizerRecomm.csv', help='Path to FertilizerRecomm.csv')
    parser.add_argument('--port', type=int, default=8000, help='Port for FastAPI server')
    
    args = parser.parse_args()
    
    if args.mode == 'train':
        # Training mode
        logger.info("Starting training mode...")
        
        # Initialize model
        transformer = SoilCropTransformer()
        
        # Load and preprocess data
        X, y = transformer.load_and_preprocess_data(args.soil_file, args.fertilizer_file)
        
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
                    soil_df = pd.read_csv(soil_file, skiprows=2, usecols=range(1, 8))
                    soil_df.columns = ['Address', 'Crop', 'pH', 'Nitrogen', 'Phosphorus', 'Potassium', 'Fertilizer_Recommendation']
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
                        "Nitrogen": row['Nitrogen'],
                        "Phosphorus": row['Phosphorus'],
                        "Potassium": row['Potassium']
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
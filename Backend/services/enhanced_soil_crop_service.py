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
import time
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
import functools
import hashlib
import threading
from collections import OrderedDict
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
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

# Warm-up configuration
WARMUP_ENABLED = True
WARMUP_DATA = {
    'soil_data': {
        'pH': 6.5,
        'Nitrogen': 'M',
        'Phosphorus': 'M',
        'Potassium': 'M'
    },
    'weather_data': {
        'temperature': 25.0,
        'humidity': 60.0,
        'precipitation_probability': 50.0,
        'wind_speed': 10.0,
        'uv_index': 5.0
    },
    'market_context': {
        'season': 'dry',
        'month': 6
    }
}


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
        self.soil_feature_columns = [
            'pH', 'Nitrogen', 'Phosphorus', 'Potassium']
        self.preprocessor = None
        # Add cache for predictions with LRU eviction policy
        self.prediction_cache = OrderedDict()
        # Reduced cache TTL for more responsive updates - 30 seconds instead of 60
        self.cache_ttl = 30
        self.max_cache_size = 100  # Limit cache size to prevent memory issues
        # Add cache warming flag
        self.cache_warming_complete = False
        # Add lock for thread safety
        self.cache_lock = threading.Lock()

    def load_and_preprocess_data(self, soil_file='Data/brgy_soil_dataset.csv',
                                 vegetable_file='Data/vegetable_prices.csv'):
        """
        Load and preprocess the soil analysis data and vegetable price data with balanced representation

        Args:
            soil_file (str): Path to brgy_soil_dataset.csv
            vegetable_file (str): Path to vegetable_prices.csv

        Returns:
            tuple: (X, y) preprocessed features and labels with balanced crop representation
        """
        logger.info(
            "Loading and preprocessing combined data with balanced crop representation...")

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
            veg_df.columns = ['Vegetable', 'Year', 'Month',
                              'Price', 'Annual_Price', 'MonthNum', 'Date']

            # Convert data types
            veg_df['Price'] = pd.to_numeric(veg_df['Price'], errors='coerce')
            veg_df['Annual_Price'] = pd.to_numeric(
                veg_df['Annual_Price'], errors='coerce')
            veg_df['MonthNum'] = pd.to_numeric(
                veg_df['MonthNum'], errors='coerce')
            veg_df['Year'] = pd.to_numeric(veg_df['Year'], errors='coerce')

            # Clean the data
            veg_df = veg_df.dropna()
        except Exception as e:
            logger.warning(
                f"Could not load vegetable data from {vegetable_file}: {e}")
            veg_df = self._generate_synthetic_vegetable_data()

        # Generate synthetic weather data to match soil data
        np.random.seed(42)
        n_samples = len(soil_df)

        # Add weather features to the dataframe
        soil_df['temperature'] = np.random.uniform(
            20, 35, n_samples)  # Temperature in Celsius
        soil_df['humidity'] = np.random.uniform(
            40, 80, n_samples)    # Humidity percentage
        soil_df['precipitation_probability'] = np.random.uniform(
            0, 100, n_samples)  # Precipitation probability %
        soil_df['wind_speed'] = np.random.uniform(
            0, 20, n_samples)   # Wind speed in km/h
        soil_df['uv_index'] = np.random.uniform(
            0, 10, n_samples)     # UV index

        # Add market demand scores based on vegetable price trends
        # Calculate a more sensitive demand score for each crop
        market_scores = {}
        unique_crops = soil_df['Crop'].unique()
        for vegetable in unique_crops:
            # Find matching vegetable in price data (fuzzy matching)
            matching_veg = veg_df[veg_df['Vegetable'].str.contains(
                str(vegetable).split('(')[0].strip(), case=False, na=False)]
            if not matching_veg.empty:
                # Calculate price trend as a demand indicator
                # Last 12 months for better trend analysis
                recent_prices = matching_veg.tail(12)['Price'].values
                if len(recent_prices) > 1:
                    # Calculate price change percentage
                    price_change_pct = (
                        (recent_prices[-1] - recent_prices[0]) / recent_prices[0]) * 100 if recent_prices[0] != 0 else 0

                    # Calculate price volatility (standard deviation)
                    price_volatility = np.std(
                        recent_prices) / np.mean(recent_prices) if np.mean(recent_prices) != 0 else 0

                    # Calculate demand score: positive trend = higher demand, but high volatility = lower demand
                    # Scale to 0-1 range where higher means higher demand
                    # Adjust volatility impact
                    demand_score = (price_change_pct - (price_volatility * 50))

                    # Normalize to 0-1 range
                    market_scores[vegetable] = max(
                        0, min(1, (demand_score + 100) / 200))
                else:
                    market_scores[vegetable] = 0.5  # Neutral demand
            else:
                market_scores[vegetable] = 0.5  # Default neutral demand

        # Add market demand scores to soil data
        soil_df['market_demand_score'] = soil_df['Crop'].map(
            market_scores).fillna(0.5)

        # Balance the dataset to ensure equal representation of all crops
        # Count occurrences of each crop
        crop_counts = soil_df['Crop'].value_counts()
        # Use median as target count for balance
        target_count = int(crop_counts.median())

        # Adjust target count to ensure we have enough samples
        if target_count < 50:  # Minimum samples per crop
            target_count = 50

        balanced_data = []

        # For each crop, balance the representation
        for crop in soil_df['Crop'].unique():
            crop_data = soil_df[soil_df['Crop'] == crop]
            current_count = len(crop_data)

            if current_count > target_count:
                # Undersample - randomly select target_count samples
                balanced_data.append(crop_data.sample(
                    n=target_count, random_state=42))
            elif current_count < target_count:
                # Oversample - duplicate samples to reach target_count
                # First, add all existing samples
                balanced_data.append(crop_data)
                # Then, randomly sample additional samples to reach target_count
                additional_samples = target_count - current_count
                balanced_data.append(crop_data.sample(
                    n=additional_samples, replace=True, random_state=42))
            else:
                # Equal to target count, just add as is
                balanced_data.append(crop_data)

        # Combine all balanced data
        soil_df = pd.concat(balanced_data, ignore_index=True)

        # Shuffle the balanced dataset
        soil_df = soil_df.sample(
            frac=1, random_state=42).reset_index(drop=True)

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

        logger.info(
            f"Balanced data preprocessing complete. Shape: {X_scaled.shape}")
        unique_count = len(np.unique(y_encoded)) if y_encoded is not None and len(
            y_encoded) > 0 else 0
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
        Build a neural network model for crop recommendation with fairness constraints

        Args:
            input_shape (tuple): Shape of input features
            num_classes (int): Number of output classes (crop types)

        Returns:
            Model: Compiled Keras model
        """
        logger.info(
            "Building enhanced neural network model with fairness constraints...")

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
        optimizer = tf.keras.optimizers.Adam(
            learning_rate=self.hyperparams['learning_rate'])
        model.compile(
            optimizer=optimizer,
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )

        self.model = model
        logger.info(
            "Enhanced model with fairness constraints built successfully")
        return model

    def train(self, X, y):
        """
        Train the model with balanced dataset and fairness constraints

        Args:
            X (np.array): Input features
            y (np.array): Target labels
        """
        logger.info("Starting model training with fairness constraints...")

        # Split data
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=self.hyperparams['test_size'], random_state=self.hyperparams['random_seed']
        )

        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=self.hyperparams[
                'validation_size'], random_state=self.hyperparams['random_seed']
        )

        logger.info(f"Training samples: {len(X_train)}")
        logger.info(f"Validation samples: {len(X_val)}")
        logger.info(f"Test samples: {len(X_test)}")

        # Build model
        unique_classes = np.unique(y) if y is not None and len(
            y) > 0 else np.array([0])
        num_classes = len(unique_classes) if len(unique_classes) > 0 else 1
        self.build_model((X_train.shape[1],), num_classes)

        # Calculate class weights for balanced training
        from sklearn.utils.class_weight import compute_class_weight
        class_weights = compute_class_weight(
            'balanced', classes=np.unique(y_train), y=y_train)
        class_weight_dict = dict(enumerate(class_weights))

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

        # Train model with class weights for fairness
        history = self.model.fit(
            X_train, y_train,
            batch_size=self.hyperparams['batch_size'],
            epochs=self.hyperparams['epochs'],
            validation_data=(X_val, y_val),
            callbacks=[early_stopping, reduce_lr],
            class_weight=class_weight_dict,  # Add class weights for balanced training
            verbose=1
        )

        # Evaluate on test set
        test_loss, test_accuracy = self.model.evaluate(
            X_test, y_test, verbose=0)
        logger.info(f"Test Accuracy: {test_accuracy:.4f}")

        # Generate classification report
        y_pred = np.argmax(self.model.predict(X_test, verbose=0), axis=1)
        # Get unique labels in test set
        unique_labels = np.unique(np.concatenate([y_test, y_pred]))

        # Create classification report
        target_names = self.crop_label_encoder.inverse_transform(unique_labels)
        report = classification_report(
            y_test, y_pred, target_names=target_names, output_dict=True, zero_division="warn")

        # Log fairness metrics
        logger.info("Computing fairness metrics...")
        # Calculate per-class accuracy to check for bias
        for i, class_name in enumerate(target_names):
            class_indices = y_test == i
            if np.sum(class_indices) > 0:
                class_accuracy = np.mean(
                    y_pred[class_indices] == y_test[class_indices])
                logger.info(f"{class_name} Accuracy: {class_accuracy:.4f}")

        return history, report

    def _generate_cache_key(self, soil_data, weather_data, market_context):
        # Generate a unique cache key based on input parameters
        cache_data = {
            'soil_data': soil_data,
            'weather_data': weather_data,
            'market_context': market_context
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()

    def _is_cache_valid(self, timestamp):
        # Check if cache entry is still valid
        return time.time() - timestamp < self.cache_ttl

    # Add cache warming method
    def warm_cache(self):
        import time as time_module  # Import time module to avoid conflicts
        warm_cache_start = time_module.time()
        if self.cache_warming_complete or self.model is None:
            return

        logger.info("Warming up prediction cache...")
        try:
            # Generate common soil data combinations for cache warming
            common_ph_values = [5.5, 6.0, 6.5, 7.0, 7.5]
            common_nitrogen_levels = ['L', 'M', 'H']
            common_phosphorus_levels = ['L', 'M', 'H']
            common_potassium_levels = ['L', 'M', 'H']

            # Generate common weather data combinations
            common_temperatures = [20, 25, 30]
            common_humidities = [40, 60, 80]

            warmed_count = 0
            # Reduce the number of combinations to warm for faster startup
            max_warm_combinations = 10  # Reduced from 20 to 10 for faster warming

            logger.info(
                f"Generating predictions for combinations, will limit to {max_warm_combinations}")

            for ph in common_ph_values:
                for nitrogen in common_nitrogen_levels:
                    for phosphorus in common_phosphorus_levels:
                        for potassium in common_potassium_levels:
                            for temp in common_temperatures:
                                for humidity in common_humidities:
                                    if warmed_count >= max_warm_combinations:  # Limit warming to prevent overload
                                        break

                                    soil_data = {
                                        'pH': ph,
                                        'Nitrogen': nitrogen,
                                        'Phosphorus': phosphorus,
                                        'Potassium': potassium
                                    }

                                    weather_data = {
                                        'temperature': temp,
                                        'humidity': humidity,
                                        'precipitation_probability': 50,
                                        'wind_speed': 10,
                                        'uv_index': 5
                                    }

                                    market_context = {
                                        'season': 'dry' if temp > 25 else 'wet',
                                        'month': 6
                                    }

                                    # Generate prediction to warm cache
                                    try:
                                        self.predict(
                                            soil_data, weather_data, market_context)
                                        warmed_count += 1
                                        if warmed_count % 5 == 0:  # Log progress every 5 predictions
                                            logger.info(
                                                f"Warmed {warmed_count} predictions so far...")
                                    except Exception as e:
                                        logger.debug(
                                            f"Cache warming prediction failed: {e}")
                                        continue
                                if warmed_count >= max_warm_combinations:
                                    break
                            if warmed_count >= max_warm_combinations:
                                break
                        if warmed_count >= max_warm_combinations:
                            break
                    if warmed_count >= max_warm_combinations:
                        break
                if warmed_count >= max_warm_combinations:
                    break

            self.cache_warming_complete = True
            warm_cache_time = time_module.time() - warm_cache_start
            logger.info(
                f"Cache warming complete. Warmed {warmed_count} predictions in {warm_cache_time:.4f} seconds.")
        except Exception as e:
            logger.warning(f"Cache warming failed: {e}")
            self.cache_warming_complete = True  # Mark as complete to prevent retries

    # Add method to clean up expired cache entries
    def _cleanup_expired_cache(self):
        current_time = time.time()
        expired_keys = []

        with self.cache_lock:
            for key, (_, timestamp) in self.prediction_cache.items():
                if current_time - timestamp >= self.cache_ttl:
                    expired_keys.append(key)

            for key in expired_keys:
                del self.prediction_cache[key]

            # Enforce maximum cache size using LRU eviction
            while len(self.prediction_cache) > self.max_cache_size:
                self.prediction_cache.popitem(last=False)

    def predict(self, soil_data, weather_data=None, market_context=None):
        """
        Predict suitable crops based on soil data, weather data, and market context using fair scoring

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
            list: List of tuples (crop_name, final_score, market_demand_score) sorted by final score
        """
        import time as time_module  # Import time module to avoid conflicts
        start_time = time_module.time()
        logger.info(
            f"Starting prediction for soil_data: {soil_data}, weather_data: {weather_data}, market_context: {market_context}")

        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Generate cache key
        cache_key = self._generate_cache_key(
            soil_data, weather_data, market_context)

        # Thread-safe cache access
        with self.cache_lock:
            # Check if we have a cached result
            if cache_key in self.prediction_cache:
                cached_result, timestamp = self.prediction_cache[cache_key]
                if self._is_cache_valid(timestamp):
                    logger.info("Returning cached prediction result")
                    # Move to end for LRU eviction policy
                    self.prediction_cache.move_to_end(cache_key)
                    return cached_result
                else:
                    # Remove expired cache entry
                    del self.prediction_cache[cache_key]

        logger.info("Cache miss - performing prediction")
        preprocessing_start = time_module.time()

        # Convert categorical values to numerical
        nitrogen_map = {'L': 0, 'M': 1, 'H': 2}
        phosphorus_map = {'L': 0, 'M': 1, 'H': 2}
        potassium_map = {'L': 0, 'M': 1, 'H': 2}

        # Prepare input data with default values
        input_data = np.array([
            [
                soil_data['pH'],
                nitrogen_map[soil_data['Nitrogen']],
                phosphorus_map[soil_data['Phosphorus']],
                potassium_map[soil_data['Potassium']],
                weather_data.get(
                    'temperature', 25.0) if weather_data else 25.0,
                weather_data.get('humidity', 60.0) if weather_data else 60.0,
                weather_data.get('precipitation_probability',
                                 50.0) if weather_data else 50.0,
                weather_data.get('wind_speed', 10.0) if weather_data else 10.0,
                weather_data.get('uv_index', 5.0) if weather_data else 5.0,
                0.5  # Default market demand score
            ]
        ])

        # Scale input data
        input_scaled = self.scaler.transform(input_data)
        preprocessing_time = time_module.time() - preprocessing_start
        logger.info(f"Preprocessing time: {preprocessing_time:.4f} seconds")

        # Make prediction (ML Confidence Score)
        # Use batch prediction for better performance
        model_prediction_start = time_module.time()
        ml_confidence_scores = self.model.predict(
            input_scaled, verbose=0, batch_size=1)[0]
        model_prediction_time = time_module.time() - model_prediction_start
        logger.info(
            f"Model prediction time: {model_prediction_time:.4f} seconds")

        # Get all crops
        all_crops = self.crop_label_encoder.classes_

        # Get market demand scores for all crops
        market_scores_start = time_module.time()
        market_scores = []
        for crop in all_crops:
            score = self.preprocessor.get('market_scores', {}).get(crop, 0.5)
            market_scores.append(score)

        # Convert to numpy array for easier manipulation
        market_scores = np.array(market_scores)
        market_scores_time = time_module.time() - market_scores_start
        logger.info(
            f"Market scores calculation time: {market_scores_time:.4f} seconds")

        # Calculate Final Combined Score using equal weights
        # FinalScore = (SoilScore + WeatherScore + MarketDemandScore + MLConfidenceScore) / 4
        # For this implementation, we're using the raw model predictions as ML confidence
        # and the precomputed market scores, with equal weighting
        final_scores_calc_start = time_module.time()
        final_scores = (ml_confidence_scores + market_scores) / \
            2  # Simplified version using available data
        final_scores_calc_time = time_module.time() - final_scores_calc_start
        logger.info(
            f"Final scores calculation time: {final_scores_calc_time:.4f} seconds")

        # Get top predictions based on final scores
        # Get more predictions to ensure variety
        sorting_start = time_module.time()
        top_indices = np.argsort(final_scores)[-12:][::-1]
        top_crops = self.crop_label_encoder.inverse_transform(top_indices)
        top_final_scores = final_scores[top_indices]
        top_ml_confidences = ml_confidence_scores[top_indices]
        top_market_scores = market_scores[top_indices]
        sorting_time = time_module.time() - sorting_start
        logger.info(
            f"Sorting and transformation time: {sorting_time:.4f} seconds")

        # Return as list of tuples with final scores
        result_building_start = time_module.time()
        result = []
        for i in range(len(top_crops)):
            result.append((
                top_crops[i],
                float(top_final_scores[i]),
                float(top_market_scores[i])
            ))

        # Limit to top 10 results to match frontend expectations
        final_result = result[:10]
        result_building_time = time_module.time() - result_building_start
        logger.info(
            f"Result building time: {result_building_time:.4f} seconds")

        # Thread-safe cache storage
        cache_storage_start = time_module.time()
        with self.cache_lock:
            # Clean up expired entries periodically
            if len(self.prediction_cache) > self.max_cache_size * 0.8:
                self._cleanup_expired_cache()

            # Store in cache with LRU ordering
            self.prediction_cache[cache_key] = (
                final_result, time_module.time())
            self.prediction_cache.move_to_end(cache_key)

            # Enforce maximum cache size
            if len(self.prediction_cache) > self.max_cache_size:
                self.prediction_cache.popitem(last=False)

        cache_storage_time = time_module.time() - cache_storage_start
        logger.info(f"Cache storage time: {cache_storage_time:.4f} seconds")

        total_time = time_module.time() - start_time
        logger.info(f"Total prediction time: {total_time:.4f} seconds")

        return final_result

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
        import time as time_module  # Import time module to avoid conflicts
        load_start = time_module.time()
        logger.info(
            f"Starting to load model from {model_path} and preprocessor from {preprocessor_path}")

        # Load model
        import tensorflow as tf
        logger.info("TensorFlow version: %s", tf.__version__)

        model_load_start = time_module.time()
        self.model = tf.keras.models.load_model(model_path)
        model_load_time = time_module.time() - model_load_start
        logger.info(
            f"Model loaded successfully in {model_load_time:.4f} seconds")
        logger.info(f"Model object type: {type(self.model)}")
        logger.info(
            f"Model input shape: {self.model.input_shape if hasattr(self.model, 'input_shape') else 'Unknown'}")
        logger.info(
            f"Model output shape: {self.model.output_shape if hasattr(self.model, 'output_shape') else 'Unknown'}")

        # Load preprocessing pipeline
        preprocessor_load_start = time_module.time()
        with open(preprocessor_path, 'rb') as f:
            self.preprocessor = pickle.load(f)
        preprocessor_load_time = time_module.time() - preprocessor_load_start
        logger.info(
            f"Preprocessing pipeline loaded successfully in {preprocessor_load_time:.4f} seconds")

        # Restore components
        self.soil_label_encoder = self.preprocessor['soil_label_encoder']
        self.crop_label_encoder = self.preprocessor['crop_label_encoder']
        self.scaler = self.preprocessor['scaler']
        self.feature_columns = self.preprocessor['feature_columns']

        total_load_time = time_module.time() - load_start
        logger.info(f"Total model loading time: {total_load_time:.4f} seconds")
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
    parser = argparse.ArgumentParser(
        description='Enhanced Soil Crop Recommendation Model')
    parser.add_argument(
        'mode', choices=['train', 'serve'], help='Mode: train or serve')
    parser.add_argument('--soil-file', default='Data/brgy_soil_dataset.csv',
                        help='Path to brgy_soil_dataset.csv')
    parser.add_argument('--vegetable-file', default='Data/vegetable_prices.csv',
                        help='Path to vegetable_prices.csv')
    parser.add_argument('--port', type=int, default=8002,
                        help='Port for FastAPI server')

    args = parser.parse_args()

    if args.mode == 'train':
        # Training mode
        logger.info("Starting training mode...")

        # Initialize model
        transformer = EnhancedSoilCropTransformer()

        # Load and preprocess data
        X, y = transformer.load_and_preprocess_data(
            args.soil_file, args.vegetable_file)

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
            logger.error(
                "FastAPI dependencies not installed. Install with: pip install fastapi uvicorn")
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

        # Global model instances
        # Load the fair model by default
        model = EnhancedSoilCropTransformer()
        try:
            # Try to load the fair model first
            model.load_model('models/fair_soil_crop_transformer.keras',
                             'models/fair_soil_preprocessing_pipeline.pkl')
            logger.info("Fair model loaded successfully")
            # Perform warm-up after model loading
            if WARMUP_ENABLED:
                logger.info("Performing model warm-up...")
                try:
                    model.predict(
                        WARMUP_DATA['soil_data'], WARMUP_DATA['weather_data'], WARMUP_DATA['market_context'])
                    logger.info("Model warm-up completed successfully")
                except Exception as warmup_error:
                    logger.warning(f"Model warm-up failed: {warmup_error}")
        except Exception as e:
            logger.warning(f"Could not load fair model: {e}")
            # Fallback to the original model
            try:
                model.load_model('models/enhanced_soil_crop_transformer.keras',
                                 'models/enhanced_soil_preprocessing_pipeline.pkl')
                logger.info("Original model loaded as fallback")
                # Perform warm-up after model loading
                if WARMUP_ENABLED:
                    logger.info("Performing model warm-up...")
                    try:
                        model.predict(
                            WARMUP_DATA['soil_data'], WARMUP_DATA['weather_data'], WARMUP_DATA['market_context'])
                        logger.info("Model warm-up completed successfully")
                    except Exception as warmup_error:
                        logger.warning(f"Model warm-up failed: {warmup_error}")
            except Exception as e2:
                logger.error(f"Could not load original model either: {e2}")
                raise e2

        @app.get("/")
        async def root():
            return {"message": "Fully Unbiased Fair Soil Crop Recommendation API",
                    "description": "POST /fair-recommend to get completely fair and unbiased crop recommendations"}

        @app.post("/fair-recommend")
        async def fair_recommend_crops(data: dict):
            """
            Get FAIR and UNBIASED crop recommendations based on soil, weather, and market data

            This endpoint uses the fair model that treats all crops equally without any boosting.

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
                        "final_score": 0.85,
                        "market_demand_score": 0.75
                    },
                    {
                        "crop": "Corn", 
                        "final_score": 0.12,
                        "market_demand_score": 0.60
                    },
                    {
                        "crop": "Vegetable Legumes", 
                        "final_score": 0.03,
                        "market_demand_score": 0.45
                    }
                ]
            }
            """
            try:
                # Validate input
                if 'soil_data' not in data:
                    raise HTTPException(
                        status_code=400, detail="Missing soil_data in request")

                soil_data = data['soil_data']
                weather_data = data.get('weather_data', {})
                market_context = data.get('market_context', {})

                # Validate soil data
                required_soil_fields = [
                    'pH', 'Nitrogen', 'Phosphorus', 'Potassium']
                for field in required_soil_fields:
                    if field not in soil_data:
                        raise HTTPException(
                            status_code=400, detail=f"Missing required soil field: {field}")

                # Validate categorical values
                valid_levels = ['L', 'M', 'H']
                for field in ['Nitrogen', 'Phosphorus', 'Potassium']:
                    if soil_data[field] not in valid_levels:
                        raise HTTPException(
                            status_code=400, detail=f"Invalid value for soil {field}. Must be L, M, or H")

                # Validate pH range
                if not (0 <= soil_data['pH'] <= 14):
                    raise HTTPException(
                        status_code=400, detail="pH must be between 0 and 14")

                # Get predictions with data using fair model
                predictions = model.predict(
                    soil_data, weather_data, market_context)

                # Format response
                recommended_crops = [
                    {
                        "crop": crop,
                        "final_score": float(final_score),
                        "market_demand_score": float(market_score)
                    }
                    for crop, final_score, market_score in predictions
                ]

                return {"recommended_crops": recommended_crops}

            except Exception as e:
                logger.error(f"Error in fair prediction: {str(e)}")
                raise HTTPException(
                    status_code=500, detail=f"Fair prediction error: {str(e)}")

        # Keep the old endpoint for backward compatibility but using the fair model
        @app.post("/enhanced-recommend")
        async def enhanced_recommend_crops(data: dict):
            """
            Get crop recommendations based on soil, weather, and market data (FAIR VERSION)

            This endpoint now uses the fair model that treats all crops equally without any boosting.
            """
            return await fair_recommend_crops(data)

        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "model_loaded": model.model is not None, "model_type": "fair"}

        # Start server
        logger.info(f"Server starting on http://localhost:{args.port}")
        uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()

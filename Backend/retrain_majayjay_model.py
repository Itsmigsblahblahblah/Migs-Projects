#!/usr/bin/env python3
"""
Retrain the vegetable demand model with cleaned Majayjay crop dataset.
"""

from services.vegetable_demand_service import VegetableDemandTransformer
import os
import sys
import logging

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def retrain_model():
    """Retrain the vegetable demand model with cleaned data"""
    logger.info("=" * 60)
    logger.info("RETRAINING VEGETABLE DEMAND MODEL WITH MAJAYJAY CROPS")
    logger.info("=" * 60)

    # Initialize model
    transformer = VegetableDemandTransformer()

    # Load and preprocess data
    logger.info("Loading cleaned vegetable data...")
    X, y = transformer.load_and_preprocess_data('Data/vegetable_prices.csv')

    logger.info(f"Training data shape: X={X.shape}, y={y.shape}")

    if len(X) > 0 and len(y) > 0:
        # Train model
        logger.info("Starting model training...")
        history, metrics = transformer.train(X, y)

        # Save model
        model_path = 'models/vegetable_demand_transformer.keras'
        preprocessor_path = 'models/vegetable_preprocessing_pipeline.pkl'

        # Create models directory if it doesn't exist
        os.makedirs('models', exist_ok=True)

        transformer.save_model(model_path, preprocessor_path)

        logger.info("\n" + "=" * 60)
        logger.info("MODEL TRAINING COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Model saved to: {model_path}")
        logger.info(f"Preprocessor saved to: {preprocessor_path}")

        # Print evaluation metrics
        if metrics:
            logger.info("\nEVALUATION METRICS:")
            logger.info(f"  MSE: {metrics['mse']:.4f}")
            logger.info(f"  MAE: {metrics['mae']:.4f}")
            logger.info(f"  RMSE: {metrics['rmse']:.4f}")

        logger.info("\nModel retrained successfully with Majayjay crop list!")

    else:
        logger.error("No valid training data found!")
        sys.exit(1)


if __name__ == "__main__":
    retrain_model()

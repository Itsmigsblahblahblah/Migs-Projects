"""
Script to train the vegetable demand prediction model
"""

import os
import sys
import logging

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vegetable_demand_service import VegetableDemandTransformer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def train_model():
    """Train the vegetable demand prediction model"""
    logger.info("Starting vegetable demand model training...")
    
    # Initialize model
    transformer = VegetableDemandTransformer()
    
    # Load and preprocess data
    try:
        X, y = transformer.load_and_preprocess_data('Data/vegetable_prices.csv')
        
        if len(X) > 0 and len(y) > 0:
            # Train model
            history, metrics = transformer.train(X, y)
            
            # Save model
            transformer.save_model('models/vegetable_demand_transformer.keras', 
                                 'models/vegetable_preprocessing_pipeline.pkl')
            
            # Print evaluation metrics
            if metrics:
                logger.info("\n" + "="*50)
                logger.info("MODEL EVALUATION METRICS")
                logger.info("="*50)
                logger.info(f"MSE: {metrics['mse']:.4f}")
                logger.info(f"MAE: {metrics['mae']:.4f}")
                logger.info(f"RMSE: {metrics['rmse']:.4f}")
                logger.info("="*50)
            
            logger.info("Training completed successfully!")
            return True
        else:
            logger.error("No valid data for training. Check the dataset.")
            return False
            
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return False

if __name__ == "__main__":
    success = train_model()
    if not success:
        sys.exit(1)
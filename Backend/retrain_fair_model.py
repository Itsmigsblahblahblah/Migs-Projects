#!/usr/bin/env python3
"""
Retrain the fair crop recommendation model with balanced dataset and fairness constraints
"""

import os
import sys
import logging
from services.enhanced_soil_crop_service import EnhancedSoilCropTransformer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Main function to retrain the fair model"""
    try:
        logger.info("Starting fair model retraining...")
        
        # Initialize the transformer with fairness constraints
        transformer = EnhancedSoilCropTransformer()
        
        # Load and preprocess data with balanced representation
        logger.info("Loading and preprocessing data with balanced crop representation...")
        X, y = transformer.load_and_preprocess_data(
            soil_file='Data/brgy_soil_dataset.csv',
            vegetable_file='Data/vegetable_prices.csv'
        )
        
        # Train the model with fairness constraints
        logger.info("Training model with fairness constraints...")
        history, report = transformer.train(X, y)
        
        # Save the fair model
        logger.info("Saving fair model...")
        transformer.save_model(
            model_path='models/fair_soil_crop_transformer.keras',
            preprocessor_path='models/fair_soil_preprocessing_pipeline.pkl'
        )
        
        # Print evaluation report
        print_evaluation_report(report)
        
        logger.info("Fair model retraining completed successfully!")
        logger.info("Model saved as 'models/fair_soil_crop_transformer.keras'")
        logger.info("Preprocessor saved as 'models/fair_soil_preprocessing_pipeline.pkl'")
        
    except Exception as e:
        logger.error(f"Error during model retraining: {e}")
        sys.exit(1)

def print_evaluation_report(report):
    """Print a formatted evaluation report"""
    print("\n" + "="*50)
    print("FAIR MODEL EVALUATION REPORT")
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

if __name__ == "__main__":
    main()
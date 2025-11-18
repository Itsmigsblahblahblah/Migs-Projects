"""
Training script for the enhanced soil crop recommendation model
"""

import os
import sys
import subprocess
from services.enhanced_soil_crop_service import EnhancedSoilCropTransformer

def train_enhanced_model():
    """Train the enhanced soil crop recommendation model"""
    print("Training enhanced soil crop recommendation model...")
    
    try:
        # Initialize model
        transformer = EnhancedSoilCropTransformer()
        
        # Load and preprocess data
        print("Loading and preprocessing data...")
        X, y = transformer.load_and_preprocess_data()
        
        # Train model
        print("Training model...")
        history, report = transformer.train(X, y)
        
        # Save model
        print("Saving model...")
        transformer.save_model('models/enhanced_soil_crop_transformer.keras', 
                             'models/enhanced_soil_preprocessing_pipeline.pkl')
        
        # Print evaluation report
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
        
        print("Enhanced model training completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error training enhanced model: {e}")
        return False

if __name__ == "__main__":
    # Create models directory if it doesn't exist
    os.makedirs("models", exist_ok=True)
    
    # Train the enhanced model
    success = train_enhanced_model()
    
    if success:
        print("Enhanced model trained and saved successfully!")
        sys.exit(0)
    else:
        print("Failed to train enhanced model!")
        sys.exit(1)
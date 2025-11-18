import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vegetable_demand_service import VegetableDemandTransformer

def main():
    # Initialize the model
    model = VegetableDemandTransformer()
    
    # Load the trained model and preprocessing pipeline
    try:
        model.load_model('models/vegetable_demand_transformer.keras', 
                        'models/vegetable_preprocessing_pipeline.pkl')
        print("Model loaded successfully")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return
    
    # Test recommend_crops method with specific parameters
    print("\nTesting recommend_crops method:")
    try:
        recommendations = model.recommend_crops(top_n=10, target_month=1, target_year=2025)
        print(f"Generated {len(recommendations)} recommendations")
        
        # Show demand level distribution
        demand_counts = {}
        for rec in recommendations:
            level = rec['demand_level']
            demand_counts[level] = demand_counts.get(level, 0) + 1
            print(f"{rec['vegetable']}: {rec['price_change_percent']:.2f}% -> {level} Demand")
        
        print("\nDemand Level Distribution:")
        for level, count in demand_counts.items():
            print(f"{level}: {count}")
            
    except Exception as e:
        print(f"Error in recommendation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
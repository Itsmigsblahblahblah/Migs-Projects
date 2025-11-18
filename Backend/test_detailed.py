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
    
    # Test recommend_crops method with specific parameters and get all crops
    print("\nTesting recommend_crops method with all crops:")
    try:
        recommendations = model.recommend_crops(top_n=1000, target_month=1, target_year=2025)
        print(f"Generated {len(recommendations)} recommendations")
        
        # Show the range of predictions
        if recommendations:
            min_percent = min(rec['price_change_percent'] for rec in recommendations)
            max_percent = max(rec['price_change_percent'] for rec in recommendations)
            print(f"Prediction range: {min_percent:.2f}% to {max_percent:.2f}%")
            
            # Show demand level distribution
            demand_counts = {}
            for rec in recommendations:
                level = rec['demand_level']
                demand_counts[level] = demand_counts.get(level, 0) + 1
            
            print("\nDemand Level Distribution:")
            for level, count in demand_counts.items():
                print(f"{level}: {count}")
                
            # Show some examples from each category if they exist
            print("\nSample crops by demand level:")
            levels_found = set()
            for rec in recommendations:
                level = rec['demand_level']
                if level not in levels_found:
                    print(f"{level} Demand: {rec['vegetable']} ({rec['price_change_percent']:.2f}%)")
                    levels_found.add(level)
                    if len(levels_found) == 4:  # All levels found
                        break
                        
    except Exception as e:
        print(f"Error in recommendation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
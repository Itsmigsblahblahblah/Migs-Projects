"""
Main entry point for the Farm Resource Management System Backend

This file serves as the Uvicorn/FastAPI entry point for the application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import routes.soil_routes
import routes.vegetable_routes
import routes.enhanced_soil_routes  # Add the new routes
import routes.data_routes  # Add data routes
import subprocess
import sys
import os

# Create main app
app = FastAPI(title="Farm Resource Management System",
              description="Combined API for soil analysis and vegetable demand prediction")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.soil_routes.app)
app.include_router(routes.vegetable_routes.app)
app.include_router(routes.enhanced_soil_routes.app)  # Add the new routes
app.include_router(routes.data_routes.app)  # Add data routes


@app.on_event("startup")
async def startup_event():
    """Preload models and perform warm-up on startup"""
    print("Starting model preloading and warm-up...")

    # Access the models from the routes modules to trigger their initialization
    try:
        # Trigger model loading for enhanced soil routes
        if hasattr(routes.enhanced_soil_routes, 'model') and routes.enhanced_soil_routes.model:
            print("Enhanced soil model loaded successfully")
            # Perform comprehensive warm-up prediction with multiple scenarios
            try:
                # Standard scenario
                warmup_data_standard = {
                    "soil_data": {
                        "pH": 6.5,
                        "Nitrogen": "M",
                        "Phosphorus": "M",
                        "Potassium": "M"
                    },
                    "weather_data": {
                        "temperature": 25.0,
                        "humidity": 60.0,
                        "precipitation_probability": 50.0,
                        "wind_speed": 10.0,
                        "uv_index": 5.0
                    },
                    "market_context": {
                        "season": "dry",
                        "month": 6
                    }
                }

                # Additional scenarios for better cache warming
                warmup_data_acidic = {
                    "soil_data": {
                        "pH": 5.5,
                        "Nitrogen": "L",
                        "Phosphorus": "L",
                        "Potassium": "L"
                    },
                    "weather_data": {
                        "temperature": 28.0,
                        "humidity": 70.0,
                        "precipitation_probability": 30.0,
                        "wind_speed": 5.0,
                        "uv_index": 7.0
                    },
                    "market_context": {
                        "season": "wet",
                        "month": 12
                    }
                }

                warmup_data_alkaline = {
                    "soil_data": {
                        "pH": 7.5,
                        "Nitrogen": "H",
                        "Phosphorus": "H",
                        "Potassium": "H"
                    },
                    "weather_data": {
                        "temperature": 30.0,
                        "humidity": 50.0,
                        "precipitation_probability": 20.0,
                        "wind_speed": 15.0,
                        "uv_index": 8.0
                    },
                    "market_context": {
                        "season": "dry",
                        "month": 3
                    }
                }

                # Execute warm-up predictions
                routes.enhanced_soil_routes.model.predict(
                    warmup_data_standard["soil_data"],
                    warmup_data_standard["weather_data"],
                    warmup_data_standard["market_context"]
                )
                print("Enhanced soil model standard warm-up completed")

                routes.enhanced_soil_routes.model.predict(
                    warmup_data_acidic["soil_data"],
                    warmup_data_acidic["weather_data"],
                    warmup_data_acidic["market_context"]
                )
                print("Enhanced soil model acidic warm-up completed")

                routes.enhanced_soil_routes.model.predict(
                    warmup_data_alkaline["soil_data"],
                    warmup_data_alkaline["weather_data"],
                    warmup_data_alkaline["market_context"]
                )
                print("Enhanced soil model alkaline warm-up completed")

                print("Enhanced soil model comprehensive warm-up completed")
            except Exception as e:
                print(f"Enhanced soil model warm-up failed: {e}")
        else:
            print("Enhanced soil model not available")

        # Trigger model loading for vegetable routes
        if hasattr(routes.vegetable_routes, 'model') and routes.vegetable_routes.model:
            print("Vegetable demand model loaded successfully")
            # Perform comprehensive warm-up prediction with multiple vegetables
            try:
                # Common vegetables for warm-up
                warmup_vegetables = [
                    ('CABBAGE (REPOLYO), 1 KG', [
                     70.0, 72.0, 68.0, 71.0, 73.0, 69.0, 74.0, 75.0, 72.0, 70.0, 71.0, 73.0]),
                    ('CARROTS (KAROT), 1 KG', [
                     65.0, 67.0, 63.0, 66.0, 68.0, 64.0, 69.0, 70.0, 67.0, 65.0, 66.0, 68.0]),
                    ('TOMATO (KAMATIS), 1 KG', [
                     80.0, 82.0, 78.0, 81.0, 83.0, 79.0, 84.0, 85.0, 82.0, 80.0, 81.0, 83.0]),
                    ('EGGPLANT (TALONG), 1 KG', [
                     55.0, 57.0, 53.0, 56.0, 58.0, 54.0, 59.0, 60.0, 57.0, 55.0, 56.0, 58.0])
                ]

                annual_prices = [80.0, 80.0, 80.0, 80.0, 80.0,
                                 80.0, 80.0, 80.0, 80.0, 80.0, 80.0, 80.0]
                months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

                # Execute warm-up predictions for each vegetable
                for i, (vegetable_name, historical_prices) in enumerate(warmup_vegetables):
                    routes.vegetable_routes.model.predict_demand(
                        vegetable_name,
                        historical_prices,
                        annual_prices,
                        months
                    )
                    print(
                        f"Vegetable demand model warm-up completed for {vegetable_name} ({i+1}/{len(warmup_vegetables)})")

                print("Vegetable demand model comprehensive warm-up completed")
            except Exception as e:
                print(f"Vegetable demand model warm-up failed: {e}")
        else:
            print("Vegetable demand model not available")

        print("Model preloading and comprehensive warm-up completed successfully")
    except Exception as e:
        print(f"Error during model preloading: {e}")


@app.get("/")
async def root():
    return {"message": "Farm Resource Management System API",
            "soil_endpoints": "/docs for soil analysis endpoints",
            "vegetable_endpoints": "/vegetables/docs for vegetable demand prediction endpoints",
            "enhanced_soil_endpoints": "/enhanced-soil/docs for soil analysis endpoints"}


@app.post("/train-demand-level-models")
async def train_demand_level_models():
    """Train separate models for each demand level"""
    try:
        # Run the training script
        script_path = os.path.join(os.path.dirname(
            __file__), "train_demand_level_models.py")
        result = subprocess.run([sys.executable, script_path],
                                capture_output=True, text=True, cwd=".")

        if result.returncode == 0:
            return {"status": "success", "message": "Demand level models trained successfully"}
        else:
            return {"status": "error", "message": f"Training failed: {result.stderr}"}
    except Exception as e:
        return {"status": "error", "message": f"Training failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

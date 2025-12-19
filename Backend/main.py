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
            # Perform warm-up prediction
            try:
                warmup_data = {
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
                routes.enhanced_soil_routes.model.predict(
                    warmup_data["soil_data"],
                    warmup_data["weather_data"],
                    warmup_data["market_context"]
                )
                print("Enhanced soil model warm-up completed")
            except Exception as e:
                print(f"Enhanced soil model warm-up failed: {e}")

        # Trigger model loading for vegetable routes
        if hasattr(routes.vegetable_routes, 'model') and routes.vegetable_routes.model:
            print("Vegetable demand model loaded successfully")
            # Perform warm-up prediction
            try:
                routes.vegetable_routes.model.predict_demand(
                    'CABBAGE (REPOLYO), 1 KG',
                    [70.0, 72.0, 68.0, 71.0, 73.0, 69.0,
                        74.0, 75.0, 72.0, 70.0, 71.0, 73.0],
                    [80.0, 80.0, 80.0, 80.0, 80.0, 80.0,
                        80.0, 80.0, 80.0, 80.0, 80.0, 80.0],
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                )
                print("Vegetable demand model warm-up completed")
            except Exception as e:
                print(f"Vegetable demand model warm-up failed: {e}")

        print("Model preloading and warm-up completed")
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

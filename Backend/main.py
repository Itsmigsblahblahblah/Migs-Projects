"""Main entry point for the Farm Resource Management System Backend

This file serves as the Uvicorn/FastAPI entry point for the application.
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import routes.soil_routes
import routes.vegetable_routes
import routes.enhanced_soil_routes  # Add the new routes
import routes.data_routes  # Add data routes
import routes.auth_routes  # Add authentication routes
import routes.gemini_routes  # Add Gemini API proxy routes
import routes.config_routes  # Add Firebase config routes
import subprocess
import sys
import os
import asyncio
import threading
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Log environment variables status
print("[Backend] Environment variables loaded:")
print(
    f"[Backend] - Firebase API Key: {'SET' if os.environ.get('FIREBASE_API_KEY') else 'NOT SET'}")
print(
    f"[Backend] - Firebase Project ID: {os.environ.get('FIREBASE_PROJECT_ID', 'NOT SET')}")
print(f"[Backend] - Backend will serve Firebase config to frontend")

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
app.include_router(routes.auth_routes.app)  # Add authentication routes
app.include_router(routes.gemini_routes.app)  # Add Gemini API proxy routes
app.include_router(routes.config_routes.app)  # Add Firebase config routes


@app.on_event("startup")
async def startup_event():
    """Lightweight startup - models are loaded during module import.

    Any additional warm-up is deferred to background tasks to ensure
    the server becomes ready quickly for Render deployment.
    """
    print("[Startup] FastAPI app startup complete. Models loaded during import.")

    # Defer heavy warm-up to background task to avoid blocking startup
    async def deferred_warmup():
        """Perform comprehensive warm-up in background after app is ready"""
        try:
            # Small delay to ensure server is fully ready
            await asyncio.sleep(2)

            print("[Background Warmup] Starting comprehensive model warm-up...")
            warmup_results = []

            # Warm up enhanced soil model if available
            if hasattr(routes.enhanced_soil_routes, 'model') and routes.enhanced_soil_routes.model:
                print(
                    "[Background Warmup] Enhanced soil model available, warming up...")
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
                    print(
                        "[Background Warmup] Enhanced soil model standard warm-up completed")

                    routes.enhanced_soil_routes.model.predict(
                        warmup_data_acidic["soil_data"],
                        warmup_data_acidic["weather_data"],
                        warmup_data_acidic["market_context"]
                    )
                    print(
                        "[Background Warmup] Enhanced soil model acidic warm-up completed")

                    routes.enhanced_soil_routes.model.predict(
                        warmup_data_alkaline["soil_data"],
                        warmup_data_alkaline["weather_data"],
                        warmup_data_alkaline["market_context"]
                    )
                    print(
                        "[Background Warmup] Enhanced soil model alkaline warm-up completed")

                    warmup_results.append("enhanced_soil: SUCCESS")
                except Exception as e:
                    print(
                        f"[Background Warmup] Enhanced soil model warm-up failed: {e}")
                    warmup_results.append(f"enhanced_soil: FAILED - {e}")

            # Warm up vegetable demand model if available
            if hasattr(routes.vegetable_routes, 'model') and routes.vegetable_routes.model:
                print(
                    "[Background Warmup] Vegetable demand model available, warming up...")
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
                            f"[Background Warmup] Vegetable demand warm-up completed for {vegetable_name} ({i+1}/{len(warmup_vegetables)})")

                    # Additional warm-up with recommend_crops
                    routes.vegetable_routes.model.recommend_crops(
                        top_n=20, month=6, year=2025)
                    print(
                        "[Background Warmup] Vegetable demand model warm-up for June 2025 completed")

                    routes.vegetable_routes.model.recommend_crops(
                        top_n=20, month=12, year=2025)
                    print(
                        "[Background Warmup] Vegetable demand model warm-up for December 2025 completed")

                    warmup_results.append("vegetable_demand: SUCCESS")
                except Exception as e:
                    print(
                        f"[Background Warmup] Vegetable demand model warm-up failed: {e}")
                    warmup_results.append(f"vegetable_demand: FAILED - {e}")

            print(
                f"[Background Warmup] Comprehensive warm-up completed: {warmup_results}")

        except Exception as e:
            print(f"[Background Warmup] Error during warm-up: {e}")
            import traceback
            print(traceback.format_exc())

    # Schedule warm-up as a background task (non-blocking)
    asyncio.create_task(deferred_warmup())
    print("[Startup] Background warm-up task scheduled")


@app.get("/")
async def root():
    return {"message": "Farm Resource Management System API",
            "soil_endpoints": "/docs for soil analysis endpoints",
            "vegetable_endpoints": "/vegetables/docs for vegetable demand prediction endpoints",
            "enhanced_soil_endpoints": "/enhanced-soil/docs for soil analysis endpoints",
            "auth_endpoints": "/auth/docs for authentication endpoints"}


@app.get("/health")
async def health():
    """Lightweight health check endpoint for Render deployment.

    Returns HTTP 200 immediately to indicate the server is running.
    This endpoint does NOT check model status to ensure fast response.
    """
    return Response(status_code=200, media_type="text/plain")


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

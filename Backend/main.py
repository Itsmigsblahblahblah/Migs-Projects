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
    """Lightweight startup - models are loaded on-demand (lazy loading).

    Models will be loaded when first requested, not at startup.
    This ensures the server becomes ready immediately for Render deployment.
    """
    print("[Startup] FastAPI app startup complete. Models will be loaded on first request.")

    # Start background model warming to improve first-request performance
    # This runs AFTER the server is ready, so it doesn't block deployment
    async def warm_models_in_background():
        """Warm up models in background after server is ready"""
        try:
            # Wait a bit for server to fully stabilize
            await asyncio.sleep(3)

            print("[Background Warmup] Starting model preloading...")

            # Warm up models using thread pool to avoid blocking event loop
            import concurrent.futures

            # Warm up enhanced soil model
            if hasattr(routes.enhanced_soil_routes, '_load_model_if_needed'):
                print("[Background Warmup] Loading enhanced soil model...")
                try:
                    # Run synchronous model loading in thread pool
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            routes.enhanced_soil_routes._load_model_if_needed)
                        future.result(timeout=60)  # 60 second timeout

                    if routes.enhanced_soil_routes.model:
                        print(
                            "[Background Warmup] Enhanced soil model loaded successfully")
                except Exception as e:
                    print(
                        f"[Background Warmup] Enhanced soil model loading failed: {e}")

            # Warm up vegetable demand model
            if hasattr(routes.vegetable_routes, '_load_model_if_needed'):
                print("[Background Warmup] Loading vegetable demand model...")
                try:
                    # Run synchronous model loading in thread pool
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            routes.vegetable_routes._load_model_if_needed)
                        future.result(timeout=60)  # 60 second timeout

                    if routes.vegetable_routes.model:
                        print(
                            "[Background Warmup] Vegetable demand model loaded successfully")
                except Exception as e:
                    print(
                        f"[Background Warmup] Vegetable demand model loading failed: {e}")

            print("[Background Warmup] Model preloading completed")

        except Exception as e:
            print(f"[Background Warmup] Error during warmup: {e}")
            import traceback
            print(traceback.format_exc())

    # Schedule background warming (non-blocking)
    asyncio.create_task(warm_models_in_background())
    print("[Startup] Background model warming scheduled")


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

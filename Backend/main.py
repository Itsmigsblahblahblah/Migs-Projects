"""Main entry point for the Farm Resource Management System Backend

This file serves as the Uvicorn/FastAPI entry point for the application.
Optimized for Render free tier production deployment.
"""

from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Environment configuration
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
ENABLE_MODEL_WARMUP = os.environ.get(
    'ENABLE_MODEL_WARMUP', 'false').lower() == 'true'
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

# Parse CORS origins
if CORS_ORIGINS == '*':
    allowed_origins = ['*']
else:
    allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(',')]

# Log environment status (no secrets)
print(f"[Backend] Environment: {ENVIRONMENT}")
print(
    f"[Backend] Model warmup: {'ENABLED' if ENABLE_MODEL_WARMUP else 'DISABLED'}")
print(f"[Backend] CORS origins: {allowed_origins}")
print(
    f"[Backend] Gemini API keys: {'LOADED' if any(os.environ.get(f'GEMINI_API_KEY_{i}') for i in range(1, 7)) else 'NOT LOADED'}")
print(
    f"[Backend] Training API key: {'CONFIGURED' if os.environ.get('TRAINING_API_KEY') else 'NOT SET'}")

# Create main app
app = FastAPI(title="Farm Resource Management System",
              description="Combined API for soil analysis and vegetable demand prediction")

# Add CORS middleware - environment-driven
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Router registration - routes are registered at startup for FastAPI routing and /docs.
# Heavy resources (ML models, datasets) inside route files are lazy-loaded on first endpoint call.
# This means:
# 1. Routes are registered immediately (needed for /docs and routing)
# 2. ML models/datasets load only when first request hits the endpoint
# 3. Once loaded, models are cached and reused for later requests
# 4. /health and / endpoints do NOT trigger any model loading
_routes_loaded = False


def load_routes():
    """Register all routers with the FastAPI app.

    This is called during startup to register routes for /docs and routing.
    Heavy resources (models, datasets) inside route files are NOT loaded here.
    They load lazily only when their endpoints are called.
    """
    global _routes_loaded
    if _routes_loaded:
        return

    print("[Backend] Registering routers...")
    import routes.soil_routes
    import routes.vegetable_routes
    import routes.enhanced_soil_routes
    import routes.data_routes
    import routes.auth_routes
    import routes.gemini_routes

    app.include_router(routes.soil_routes.app)
    app.include_router(routes.vegetable_routes.app)
    app.include_router(routes.enhanced_soil_routes.app)
    app.include_router(routes.data_routes.app)
    app.include_router(routes.auth_routes.app)
    app.include_router(routes.gemini_routes.app)

    _routes_loaded = True
    print("[Backend] Routers registered successfully")


# Register routers at startup (required for FastAPI routing and /docs)
# Note: This does NOT load ML models - they load lazily on first request
load_routes()


@app.on_event("startup")
async def startup_event():
    """Lightweight startup - immediate response for health checks.

    NO heavy work during startup:
    - No model loading
    - No dataset loading
    - No Gemini calls
    - No Firebase calls
    - No background warmup (unless explicitly enabled)

    Models will be loaded on first request (lazy loading).
    """
    print(
        f"[Startup] FastAPI app startup complete (Environment: {ENVIRONMENT})")

    # Optional model warmup - DISABLED by default for Render free tier
    if ENABLE_MODEL_WARMUP:
        print("[Startup] Background model warmup ENABLED (may take 30-60 seconds)")

        async def warm_models_in_background():
            """Warm up models in background - non-blocking, error-tolerant"""
            try:
                # Wait for server to stabilize
                await asyncio.sleep(5)

                print("[Background Warmup] Starting model preloading...")

                # Import here to avoid top-level import delays
                import routes.enhanced_soil_routes
                import routes.vegetable_routes

                # Warm up models using thread pool
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    futures = []

                    # Enhanced soil model
                    if hasattr(routes.enhanced_soil_routes, '_load_model_if_needed'):
                        futures.append(executor.submit(
                            routes.enhanced_soil_routes._load_model_if_needed))

                    # Vegetable demand model
                    if hasattr(routes.vegetable_routes, '_load_model_if_needed'):
                        futures.append(executor.submit(
                            routes.vegetable_routes._load_model_if_needed))

                    # Wait for all models with timeout
                    for future in concurrent.futures.as_completed(futures, timeout=120):
                        try:
                            future.result()
                        except Exception as e:
                            print(
                                f"[Background Warmup] Model loading failed: {e}")

                print("[Background Warmup] Model preloading completed")

            except Exception as e:
                print(f"[Background Warmup] Error during warmup: {e}")
                import traceback
                print(traceback.format_exc())

        # Schedule warmup (non-blocking)
        asyncio.create_task(warm_models_in_background())
    else:
        print("[Startup] Model warmup DISABLED (models will load on first request)")


@app.get("/")
async def root():
    """Lightweight root endpoint - no heavy work."""
    return {
        "message": "Farm Resource Management System API",
        "environment": ENVIRONMENT,
        "status": "running",
        "docs": "/docs for API documentation"
    }


@app.get("/health")
async def health():
    """CRITICAL: Lightweight health check for Render deployment.

    MUST return immediately (under 5 seconds):
    - NO model loading
    - NO dataset loading
    - NO Gemini calls
    - NO Firebase/Firestore calls
    - NO file checks
    - NO external API calls
    - NO predictions
    - NO warmup
    - NO background tasks
    """
    return Response(status_code=200, media_type="text/plain")


@app.post("/train-demand-level-models")
async def train_demand_level_models(request: Request):
    """Train separate models for each demand level.

    PROTECTED in production:
    - Requires TRAINING_API_KEY environment variable
    - Request must include X-Training-API-Key header
    - Returns 403 if missing or invalid in production
    """
    # Protect training endpoint in production
    if ENVIRONMENT == 'production':
        training_api_key = os.environ.get('TRAINING_API_KEY')
        if not training_api_key:
            raise HTTPException(
                status_code=403,
                detail="Training endpoint disabled in production. Set TRAINING_API_KEY to enable."
            )

        client_key = request.headers.get('X-Training-API-Key', '')
        if client_key != training_api_key:
            raise HTTPException(
                status_code=403,
                detail="Invalid or missing training API key"
            )

    try:
        import subprocess
        import sys

        # Run the training script
        script_path = os.path.join(os.path.dirname(
            __file__), "train_demand_level_models.py")
        result = subprocess.run([sys.executable, script_path],
                                capture_output=True, text=True, cwd=".",
                                timeout=300)  # 5 minute timeout

        if result.returncode == 0:
            return {"status": "success", "message": "Demand level models trained successfully"}
        else:
            return {"status": "error", "message": f"Training failed: {result.stderr}"}
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Training timed out (exceeded 5 minutes)"}
    except Exception as e:
        return {"status": "error", "message": f"Training failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Render compatibility
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

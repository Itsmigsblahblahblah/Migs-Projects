"""
Main entry point for the Farm Resource Management System Backend

This file serves as the Uvicorn/FastAPI entry point for the application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import routes.soil_routes
import routes.vegetable_routes
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

@app.get("/")
async def root():
    return {"message": "Farm Resource Management System API", 
            "soil_endpoints": "/docs for soil analysis endpoints",
            "vegetable_endpoints": "/vegetables/docs for vegetable demand prediction endpoints"}

@app.post("/train-demand-level-models")
async def train_demand_level_models():
    """Train separate models for each demand level"""
    try:
        # Run the training script
        script_path = os.path.join(os.path.dirname(__file__), "train_demand_level_models.py")
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

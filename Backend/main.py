"""
Main entry point for the Farm Resource Management System Backend

This file serves as the Uvicorn/FastAPI entry point for the application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import routes.soil_routes
import routes.vegetable_routes

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
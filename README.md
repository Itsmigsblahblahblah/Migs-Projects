# Majayjay Farm Resource Management System

This is a smart farming web application for Majayjay farmers. The system provides expert crop recommendations, allows farmers to report farming issues, and connects them with agricultural specialists to optimize farm productivity.

## Quick Start

To get the application running locally:

1. **Frontend Setup**:
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

2. **Backend Setup**:
   ```bash
   cd Backend
   python -m venv .venv
   source .venv/Scripts/activate  # bash command
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8000`.

## Project Structure

This repository is organized into several directories:

- **Frontend**: Contains all frontend code (React, TypeScript, Vite)
- **Backend**: Contains machine learning components for crop recommendations, restructured with clean architecture
- **functions**: Firebase Cloud Functions
- **docs**: Documentation organized by domain (firebase, ml, frontend)
- **samples**: Sample API responses and test data

## Frontend

The frontend is built with:
- React with TypeScript
- Vite as the build tool
- Tailwind CSS for styling
- shadcn/ui components
- Firebase for backend services (authentication and database)

### Directory Structure
```
Frontend/
├── src/                       # Source code
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React context providers
│   ├── hooks/                 # Custom hooks
│   ├── pages/                 # Page-level components
│   ├── lib/                   # Utility functions
│   ├── App.tsx                # Main application component
│   └── main.tsx               # Application entry point
├── public/                    # Static assets
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── tailwind.config.ts         # Tailwind CSS configuration
```

### Getting Started

1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Environment Variables

Create a `.env` file in the Frontend directory with your Firebase configuration. See `.env.example` for the required variables.

### Development

- The development server supports hot reloading
- Components are organized by feature and shared utilities
- Firebase authentication and Firestore are integrated
- TypeScript provides type safety throughout the application

## Backend

The backend directory contains machine learning components for crop recommendations, restructured to follow Python best practices:

### Directory Structure
```
Backend/
├── Data/                      # Data files used by the ML model
├── models/                    # Trained ML models and preprocessing pipelines
├── services/                  # Business logic and ML model implementation
├── routes/                    # API route definitions
├── tests/                     # Test scripts
├── config/                    # Configuration files
├── training/                  # Training scripts and datasets
├── main.py                    # Main entry point for Uvicorn/FastAPI
├── requirements.txt           # Python dependencies
├── .venv/                     # Python virtual environment (excluded from git)
├── README.md                  # Documentation
└── ORGANIZATION_SUMMARY.md   # Backend restructuring summary
```

### Setup and Execution

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   ```bash
   # On Windows
   .venv\Scripts\activate.bat
   
   # On macOS/Linux
   source .venv/Scripts/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

The backend server will start on `http://localhost:8000` by default.

### API Endpoints

- `GET /` - API root endpoint
- `POST /recommend` - Get crop recommendations based on soil data
- `POST /recommend-with-weather` - Get crop recommendations based on soil and weather data
- `GET /soil-data/{barangay}` - Get soil data for a specific barangay
- `GET /health` - Health check endpoint

### Testing

- Test the model: `python tests/test_model.py`
- Test API endpoints: `python tests/test_soil_endpoint.py`

## Documentation

Documentation is organized in the `docs/` directory:
- **docs/firebase**: Firebase setup and configuration guides
- **docs/ml**: Machine learning model documentation
- **docs/frontend**: Frontend integration guides

## Contributing

Please follow the established folder structure and coding conventions when contributing to this project.
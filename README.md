# Majayjay Farm Resource Management System

This is a smart farming web application for Majayjay farmers. The system provides expert crop recommendations, allows farmers to report farming issues, and connects them with agricultural specialists to optimize farm productivity.

## Project Structure

This repository is organized into several directories:

- **Frontend**: Contains all frontend code (React, TypeScript, Vite)
- **Backend**: Contains machine learning components for crop recommendations
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

## Backend

The backend directory contains machine learning components for crop recommendations:
- **ml_model**: Transformer-based neural network model for recommending crops based on soil analysis
- **Data**: Soil analysis data and fertilizer recommendations used by the model

The main backend services are still provided by Firebase, with the ML model serving as an additional service for crop recommendations.

## Documentation

Documentation is organized in the `docs/` directory:
- **docs/firebase**: Firebase setup and configuration guides
- **docs/ml**: Machine learning model documentation
- **docs/frontend**: Frontend integration guides

## Contributing

Please follow the established folder structure and coding conventions when contributing to this project.
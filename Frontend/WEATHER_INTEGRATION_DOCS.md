# Weather Integration Documentation

## Overview
This document explains how the Open-Meteo weather API integration works in Harvestify.

## Implementation Details

### 1. Weather Data Fetching
The weather data is fetched from the Open-Meteo API using the following endpoints:

- **Current Weather**: `https://api.open-meteo.com/v1/forecast?latitude=14.1463&longitude=121.4729&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=1`

- **Daily Forecast**: `https://api.open-meteo.com/v1/forecast?latitude=14.1463&longitude=121.4729&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&forecast_days=7`

### 2. Coordinates
The API uses coordinates for Majayjay, Laguna, Philippines:
- Latitude: 14.1463
- Longitude: 121.4729

### 3. Data Processing
The raw data from the API is processed to match the interface expected by the WeatherCard component:

```typescript
interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    rainfall: number;
    forecast: {
        day: string;
        condition: string;
        high: number;
        low: number;
    }[];
}
```

### 4. Components
- **WeatherCard**: Displays the weather information in the Farmer Dashboard
- **useFarmerDashboard hook**: Fetches and processes weather data

### 5. Error Handling
The integration includes error handling for:
- Network issues
- API failures
- Data processing errors

## Usage
The weather data is automatically loaded when the Farmer Dashboard is accessed. The WeatherCard component displays:
- Current temperature
- Weather condition
- Humidity
- Rainfall
- 3-day forecast

## Future Enhancements
Potential future improvements include:
- Adding more detailed weather information
- Implementing weather alerts
- Adding soil temperature and moisture data
- Providing weather-based farming recommendations
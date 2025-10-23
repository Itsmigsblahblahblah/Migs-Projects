// Simple test to verify the weather integration is working
export const testWeatherIntegration = async () => {
  try {
    // Coordinates for Majayjay, Laguna, Philippines
    const LATITUDE = 14.1463;
    const LONGITUDE = 121.4729;
    
    // Test current weather
    const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=1`;
    
    console.log('Testing current weather API...');
    const currentResponse = await fetch(currentUrl);
    const currentData = await currentResponse.json();
    console.log('Current weather data:', currentData);
    
    // Test daily forecast
    const dailyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&forecast_days=7`;
    
    console.log('\nTesting daily forecast API...');
    const dailyResponse = await fetch(dailyUrl);
    const dailyData = await dailyResponse.json();
    console.log('Daily forecast data:', dailyData);
    
    return { current: currentData, daily: dailyData };
  } catch (error) {
    console.error('Error testing weather integration:', error);
    throw error;
  }
};

// Run the test
testWeatherIntegration().then(data => {
  console.log('Weather integration test completed successfully!');
}).catch(error => {
  console.error('Weather integration test failed:', error);
});
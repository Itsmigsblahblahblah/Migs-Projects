import { useState, useEffect } from "react";
import { log } from "@/utils/logger";

// Weather alert interface
interface WeatherAlert {
    type: 'typhoon' | 'monsoon' | 'cyclone' | 'thunderstorm' | 'heavyRain' | 'highWind' | 'extremeHeat' | 'extremeCold';
    severity: 'low' | 'moderate' | 'high' | 'severe';
    description: string;
    icon: string;
    date?: string; // Add date field
}

export const useWeatherAlerts = () => {
    const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch weather alerts from localStorage or API
    const loadWeatherAlerts = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Try to get weather data from localStorage (set by FarmerDashboard)
            const weatherDataStr = localStorage.getItem('weatherData');
            
            if (weatherDataStr) {
                const weatherData = JSON.parse(weatherDataStr);
                log("Weather data from localStorage:", weatherData);
                
                // Extract current alerts
                let currentAlerts = weatherData.currentAlerts || [];
                
                // Add today's date to current alerts
                currentAlerts = currentAlerts.map((alert: WeatherAlert) => ({
                    ...alert,
                    date: new Date().toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                }));
                
                // Extract forecast alerts for the next few days
                let forecastAlerts: WeatherAlert[] = [];
                if (weatherData.extendedForecast && Array.isArray(weatherData.extendedForecast)) {
                    // Get alerts for the next 5 days
                    for (let i = 0; i < Math.min(5, weatherData.extendedForecast.length); i++) {
                        const day = weatherData.extendedForecast[i];
                        if (day.alerts && Array.isArray(day.alerts) && day.alerts.length > 0) {
                            // Add date information to forecast alerts
                            const alertsWIthDate = day.alerts.map((alert: WeatherAlert) => ({
                                ...alert,
                                date: new Date(day.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })
                            }));
                            forecastAlerts.push(...alertsWIthDate);
                        }
                    }
                }
                
                // Combine current and forecast alerts
                const allAlerts = [...currentAlerts, ...forecastAlerts];
                
                // If we still don't have alerts, let's check what's in the weather data
                if (allAlerts.length === 0) {
                    log("No alerts found, checking weather data structure");
                }
                
                // Remove duplicates based on description
                const uniqueAlerts = allAlerts.filter((alert, index, self) => 
                    index === self.findIndex(a => a.description === alert.description)
                );
                
                log("Final alerts to display:", uniqueAlerts);
                setWeatherAlerts(uniqueAlerts);
            } else {
                // If no weather data in localStorage, this shouldn't happen in real usage
                log("No weather data found in localStorage");
                setWeatherAlerts([]);
            }
        } catch (err) {
            console.error('Error loading weather alerts:', err);
            setError('Failed to load weather alerts');
            setWeatherAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWeatherAlerts();
    }, []);

    const getAlertColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return 'text-green-500 bg-green-50 border-green-200';
            case 'moderate':
                return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'high':
                return 'text-orange-500 bg-orange-50 border-orange-200';
            case 'severe':
                return 'text-red-500 bg-red-50 border-red-200';
            default:
                return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    return {
        weatherAlerts,
        loading,
        error,
        loadWeatherAlerts,
        getAlertColor
    };
};
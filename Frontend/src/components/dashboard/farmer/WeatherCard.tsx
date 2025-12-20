import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sun, CloudRain, Cloud, Zap, Snowflake, AlertTriangle, Wind, Thermometer } from "lucide-react";
import { useState } from "react";
import WeatherForecastModal from "./WeatherForecastModal";

// Update interfaces to include alerts
interface WeatherAlert {
    type: 'typhoon' | 'monsoon' | 'cyclone' | 'thunderstorm' | 'heavyRain' | 'highWind' | 'extremeHeat' | 'extremeCold';
    severity: 'low' | 'moderate' | 'high' | 'severe';
    description: string;
    icon: string;
}

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

interface ExtendedWeatherData extends WeatherData {
    extendedForecast?: {
        date: string;
        dayOfWeek: string;
        condition: string;
        high: number;
        low: number;
        humidity?: number;
        alerts?: WeatherAlert[];
    }[];
    currentAlerts?: WeatherAlert[];
}

interface WeatherCardProps {
    weatherData: ExtendedWeatherData;
    forecastView?: 'now' | 'tomorrow' | 'specific' | 'week' | 'sixteen';
    onForecastViewChange?: (view: 'now' | 'tomorrow' | 'specific' | 'week' | 'sixteen') => void;
    selectedDate?: string;
    onDateChange?: (date: string) => void;
    availableDates?: string[];
}

const WeatherCard = ({ 
    weatherData, 
    forecastView = 'now',
    onForecastViewChange,
    selectedDate,
    onDateChange,
    availableDates = []
}: WeatherCardProps) => {
    const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
    const [isSixteenModalOpen, setIsSixteenModalOpen] = useState(false);
    
    const getWeatherIcon = (condition: string) => {
        const conditionLower = condition.toLowerCase();
        if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
            return <Sun className="h-5 w-5 text-yellow-500" />;
        } else if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
            return <CloudRain className="h-5 w-5 text-green-500" />;
        } else if (conditionLower.includes('cloud')) {
            return <Cloud className="h-5 w-5 text-gray-500" />;
        } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
            return <Zap className="h-5 w-5 text-purple-500" />;
        } else if (conditionLower.includes('snow')) {
            return <Snowflake className="h-5 w-5 text-green-200" />;
        } else {
            return <Sun className="h-5 w-5 text-yellow-500" />;
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'thunderstorm':
                return <Zap className="h-4 w-4" />;
            case 'heavyRain':
                return <CloudRain className="h-4 w-4" />;
            case 'highWind':
                return <Wind className="h-4 w-4" />;
            case 'extremeHeat':
                return <Thermometer className="h-4 w-4" />;
            default:
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    const getAlertColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return 'text-green-500 bg-green-50';
            case 'moderate':
                return 'text-yellow-500 bg-yellow-50';
            case 'high':
                return 'text-orange-500 bg-orange-50';
            case 'severe':
                return 'text-red-500 bg-red-50';
            default:
                return 'text-gray-500 bg-gray-50';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const renderAlerts = (alerts: WeatherAlert[] | undefined) => {
        if (!alerts || alerts.length === 0) return null;
        
        return (
            <div className="mt-2 space-y-1">
                {alerts.map((alert, index) => (
                    <div key={index} className={`flex items-center gap-2 text-xs p-2 rounded ${getAlertColor(alert.severity)}`}>
                        <span className="text-lg">{alert.icon}</span>
                        <span className="font-medium">{alert.description}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderForecastView = () => {
        switch (forecastView) {
            case 'now':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {getWeatherIcon(weatherData.condition)}
                                <div>
                                    <p className="text-2xl font-bold">{weatherData.temperature}°C</p>
                                    <p className="text-sm text-muted-foreground">{weatherData.condition}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Humidity</p>
                                <p>{weatherData.humidity}%</p>
                            </div>
                        </div>
                        {renderAlerts(weatherData.currentAlerts)}
                    </div>
                );
            
            case 'tomorrow':
                if (weatherData.extendedForecast && weatherData.extendedForecast.length > 1) {
                    const tomorrow = weatherData.extendedForecast[1];
                    return (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    {getWeatherIcon(tomorrow.condition)}
                                    <div className="min-w-0">
                                        <p className="text-2xl font-bold truncate">{tomorrow.high}°</p>
                                        <p className="text-sm text-muted-foreground truncate">{tomorrow.condition}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Humidity</p>
                                    <p>{Math.round(tomorrow.humidity || 0)}%</p>
                                </div>
                            </div>
                            {renderAlerts(tomorrow.alerts)}
                        </div>
                    );
                }
                return <p>No tomorrow's forecast available</p>;
                
            case 'specific':
                if (selectedDate && weatherData.extendedForecast) {
                    const specificDay = weatherData.extendedForecast.find(
                        day => new Date(day.date).toDateString() === new Date(selectedDate).toDateString()
                    );
                    
                    if (specificDay) {
                        return (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {getWeatherIcon(specificDay.condition)}
                                        <div className="min-w-0">
                                            <p className="text-2xl font-bold truncate">{specificDay.high}°</p>
                                            <p className="text-sm text-muted-foreground truncate">{specificDay.condition}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Humidity</p>
                                        <p>{Math.round(specificDay.humidity || 0)}%</p>
                                    </div>
                                </div>
                                {renderAlerts(specificDay.alerts)}
                            </div>
                        );
                    }
                }
                return <p>Select a date to view forecast</p>;
                
            case 'week':
                return (
                    <div>
                        <h4 className="font-medium mb-2">7-Day Forecast</h4>
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-2 min-w-max">
                                {weatherData.extendedForecast ? (
                                    weatherData.extendedForecast.slice(0, 7).map((day, index) => {
                                        const date = new Date(day.date);
                                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        
                                        return (
                                            <div key={index} className="border rounded-lg p-2 bg-card text-center min-w-0 flex-shrink-0 w-20">
                                                <div className="font-medium text-xs truncate">
                                                    {index === 0 ? 'Today' : 
                                                     index === 1 ? 'Tomorrow' : 
                                                     day.dayOfWeek}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {formattedDate}
                                                </div>
                                                <div className="my-1 flex justify-center">
                                                    {getWeatherIcon(day.condition)}
                                                </div>
                                                <div className="text-sm font-medium min-w-0 truncate">
                                                    {Math.round(day.high)}°/{Math.round(day.low)}°
                                                </div>
                                                {day.alerts && day.alerts.length > 0 && (
                                                    <div className="mt-1 text-red-500 text-xs truncate">
                                                        ⚠️
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p>No weekly forecast available</p>
                                )}
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full mt-3 text-white bg-gradient-primary hover:opacity-90 hover:text-white transition-opacity"
                            onClick={() => setIsWeekModalOpen(true)}
                        >
                            View Detailed Forecast
                        </Button>
                    </div>
                );
                
            case 'sixteen':
                return (
                    <div>
                        <h4 className="font-medium mb-2">16-Day Forecast</h4>
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-2 min-w-max">
                                {weatherData.extendedForecast ? (
                                    weatherData.extendedForecast.map((day, index) => {
                                        const date = new Date(day.date);
                                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        
                                        return (
                                            <div key={index} className="border rounded-lg p-2 bg-card text-center min-w-0 flex-shrink-0 w-20">
                                                <div className="font-medium text-xs truncate">
                                                    {index === 0 ? 'Today' : 
                                                     index === 1 ? 'Tomorrow' : 
                                                     day.dayOfWeek}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {formattedDate}
                                                </div>
                                                <div className="my-1 flex justify-center">
                                                    {getWeatherIcon(day.condition)}
                                                </div>
                                                <div className="text-sm font-medium min-w-0 truncate">
                                                    {Math.round(day.high)}°/{Math.round(day.low)}°
                                                </div>
                                                {day.alerts && day.alerts.length > 0 && (
                                                    <div className="mt-1 text-red-500 text-xs truncate">
                                                        ⚠️
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p>No extended forecast available</p>
                                )}
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full mt-3 text-white bg-gradient-primary hover:opacity-90 hover:text-white transition-opacity"
                            onClick={() => setIsSixteenModalOpen(true)}
                        >
                            View Detailed Forecast
                        </Button>
                    </div>
                );

            default:
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                {getWeatherIcon(weatherData.condition)}
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold truncate">{weatherData.temperature}°C</p>
                                    <p className="text-sm text-muted-foreground truncate">{weatherData.condition}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Humidity</p>
                                <p>{weatherData.humidity}%</p>
                            </div>
                        </div>
                        {renderAlerts(weatherData.currentAlerts)}
                    </div>
                );
        }
    };

    return (
        <>
            <Card className="shadow-card h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5" />
                        Weather & Conditions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-2">
                        <button 
                            className={`px-3 py-1 text-xs rounded-full truncate ${
                                forecastView === 'now' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary hover:bg-primary/90 hover:text-primary-foreground'
                            }`}
                            onClick={() => onForecastViewChange && onForecastViewChange('now')}
                        >
                            Now
                        </button>
                        <button 
                            className={`px-3 py-1 text-xs rounded-full truncate ${
                                forecastView === 'tomorrow' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary hover:bg-primary/90 hover:text-primary-foreground'
                            }`}
                            onClick={() => onForecastViewChange && onForecastViewChange('tomorrow')}
                        >
                            Tomorrow
                        </button>
                        <button 
                            className={`px-3 py-1 text-xs rounded-full truncate ${
                                forecastView === 'specific' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary hover:bg-primary/90 hover:text-primary-foreground'
                            }`}
                            onClick={() => onForecastViewChange && onForecastViewChange('specific')}
                        >
                            Specific Day
                        </button>
                        <button 
                            className={`px-3 py-1 text-xs rounded-full truncate ${
                                forecastView === 'week' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary hover:bg-primary/90 hover:text-primary-foreground'
                            }`}
                            onClick={() => onForecastViewChange && onForecastViewChange('week')}
                        >
                            1-Week
                        </button>
                        <button 
                            className={`px-3 py-1 text-xs rounded-full truncate ${
                                forecastView === 'sixteen' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-secondary hover:bg-primary/90 hover:text-primary-foreground'
                            }`}
                            onClick={() => onForecastViewChange && onForecastViewChange('sixteen')}
                        >
                            16-Day
                        </button>
                    </div>

                    {/* Date Picker for Specific Day */}
                    {forecastView === 'specific' && (
                        <div className="pt-2">
                            <label className="block text-sm font-medium mb-1">Select Date</label>
                            <select 
                                className="w-full p-2 border rounded"
                                value={selectedDate || ''}
                                onChange={(e) => onDateChange && onDateChange(e.target.value)}
                            >
                                <option value="">Choose a date</option>
                                {availableDates.map((date, index) => (
                                    <option key={index} value={date}>
                                        {formatDate(date)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Weather Content */}
                    <Separator />
                    <div className="h-full flex flex-col">
                        {renderForecastView()}
                    </div>
                </CardContent>
            </Card>

            {/* Week Forecast Modal */}
            {weatherData.extendedForecast && (
                <WeatherForecastModal
                    open={isWeekModalOpen}
                    onOpenChange={setIsWeekModalOpen}
                    forecastData={weatherData.extendedForecast.slice(0, 7)}
                    title="7-Day Detailed Forecast"
                    isWeekly={true}
                />
            )}

            {/* Sixteen Day Forecast Modal */}
            {weatherData.extendedForecast && (
                <WeatherForecastModal
                    open={isSixteenModalOpen}
                    onOpenChange={setIsSixteenModalOpen}
                    forecastData={weatherData.extendedForecast}
                    title="16-Day Detailed Forecast"
                />
            )}
        </>
    );
};

export default WeatherCard;
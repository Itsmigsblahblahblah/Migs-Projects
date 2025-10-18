import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sun, CloudRain } from "lucide-react";

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

interface WeatherCardProps {
    weatherData: WeatherData;
}

const WeatherCard = ({ weatherData }: WeatherCardProps) => {
    const getWeatherIcon = (condition: string) => {
        switch (condition.toLowerCase()) {
            case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
            case 'rain': return <CloudRain className="h-5 w-5 text-blue-500" />;
            default: return <Sun className="h-5 w-5 text-yellow-500" />;
        }
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Weather & Conditions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Separator />
                <div>
                    <h4 className="font-medium mb-2">3-Day Forecast</h4>
                    <div className="space-y-2">
                        {weatherData.forecast.map((day, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <span>{day.day}</span>
                                <div className="flex items-center gap-2">
                                    {getWeatherIcon(day.condition)}
                                    <span>{day.high}°/{day.low}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default WeatherCard;
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
    Sun, 
    CloudRain, 
    Cloud, 
    Zap, 
    Snowflake, 
    AlertTriangle, 
    Wind, 
    Thermometer,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

interface WeatherAlert {
    type: 'typhoon' | 'monsoon' | 'cyclone' | 'thunderstorm' | 'heavyRain' | 'highWind' | 'extremeHeat' | 'extremeCold';
    severity: 'low' | 'moderate' | 'high' | 'severe';
    description: string;
    icon: string;
}

interface ForecastDay {
    date: string;
    dayOfWeek: string;
    condition: string;
    high: number;
    low: number;
    alerts?: WeatherAlert[];
}

interface WeatherForecastModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    forecastData: ForecastDay[];
    title: string;
    isWeekly?: boolean;
}

const WeatherForecastModal = ({
    open,
    onOpenChange,
    forecastData,
    title,
    isWeekly = false
}: WeatherForecastModalProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const getWeatherIcon = (condition: string) => {
        const conditionLower = condition.toLowerCase();
        if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
            return <Sun className="h-6 w-6 text-yellow-500" />;
        } else if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
            return <CloudRain className="h-6 w-6 text-blue-500" />;
        } else if (conditionLower.includes('cloud')) {
            return <Cloud className="h-6 w-6 text-gray-500" />;
        } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
            return <Zap className="h-6 w-6 text-purple-500" />;
        } else if (conditionLower.includes('snow')) {
            return <Snowflake className="h-6 w-6 text-blue-200" />;
        } else {
            return <Sun className="h-6 w-6 text-yellow-500" />;
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
            <div className="mt-3 space-y-2">
                <h4 className="font-medium text-sm">Weather Alerts</h4>
                {alerts.map((alert, index) => (
                    <div key={index} className={`flex items-center gap-2 text-xs p-2 rounded ${getAlertColor(alert.severity)}`}>
                        <span className="text-lg">{alert.icon}</span>
                        <span className="font-medium">{alert.description}</span>
                    </div>
                ))}
            </div>
        );
    };

    const navigateToDay = (index: number) => {
        if (index >= 0 && index < forecastData.length) {
            setCurrentIndex(index);
        }
    };

    const currentDay = forecastData[currentIndex];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Detailed weather forecast information
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Horizontal scrollable forecast days */}
                    <div className="mb-6">
                        <h3 className="font-medium mb-2">Forecast Days</h3>
                        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                            <div className="flex p-2">
                                {forecastData.map((day, index) => {
                                    const date = new Date(day.date);
                                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    
                                    return (
                                        <div 
                                            key={index}
                                            className={`inline-flex flex-col items-center p-3 mx-1 rounded-lg cursor-pointer min-w-[80px] ${
                                                index === currentIndex 
                                                    ? 'bg-primary text-primary-foreground' 
                                                    : 'bg-secondary hover:bg-secondary/80'
                                            }`}
                                            onClick={() => navigateToDay(index)}
                                        >
                                            <div className="text-xs font-medium">
                                                {index === 0 ? 'Today' : 
                                                 index === 1 ? 'Tomorrow' : 
                                                 day.dayOfWeek}
                                            </div>
                                            <div className="text-xs opacity-80">
                                                {formattedDate}
                                            </div>
                                            <div className="my-1">
                                                {getWeatherIcon(day.condition)}
                                            </div>
                                            <div className="text-sm font-medium">
                                                {Math.round(day.high)}°/{Math.round(day.low)}°
                                            </div>
                                            {day.alerts && day.alerts.length > 0 && (
                                                <div className="mt-1 text-red-500">
                                                    ⚠️
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                    
                    {/* Current day details */}
                    {currentDay && (
                        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-card">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {currentIndex === 0 ? 'Today' : 
                                         currentIndex === 1 ? 'Tomorrow' : 
                                         currentDay.dayOfWeek}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(currentDay.date)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getWeatherIcon(currentDay.condition)}
                                    <div>
                                        <p className="text-2xl font-bold">{Math.round(currentDay.high)}°</p>
                                        <p className="text-sm text-muted-foreground">High</p>
                                    </div>
                                    <div>
                                        <p className="text-lg">{Math.round(currentDay.low)}°</p>
                                        <p className="text-sm text-muted-foreground">Low</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <h3 className="font-medium mb-2">Condition</h3>
                                <p className="text-sm">{currentDay.condition}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="border rounded-lg p-3">
                                    <p className="text-sm text-muted-foreground">Humidity</p>
                                    <p className="font-medium">75%</p>
                                </div>
                                <div className="border rounded-lg p-3">
                                    <p className="text-sm text-muted-foreground">Wind</p>
                                    <p className="font-medium">12 km/h</p>
                                </div>
                                <div className="border rounded-lg p-3">
                                    <p className="text-sm text-muted-foreground">Rain</p>
                                    <p className="font-medium">20%</p>
                                </div>
                                <div className="border rounded-lg p-3">
                                    <p className="text-sm text-muted-foreground">UV Index</p>
                                    <p className="font-medium">6</p>
                                </div>
                            </div>
                            
                            {renderAlerts(currentDay.alerts)}
                        </div>
                    )}
                    
                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-4">
                        <Button
                            variant="outline"
                            onClick={() => navigateToDay(currentIndex - 1)}
                            disabled={currentIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigateToDay(currentIndex + 1)}
                            disabled={currentIndex === forecastData.length - 1}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WeatherForecastModal;
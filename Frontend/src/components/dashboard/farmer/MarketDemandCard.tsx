import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface MarketDemandData {
  vegetable: string;
  predicted_price: number;
  current_avg_price: number;
  price_change: number;
  price_change_percent: number;
  demand_level: string;
}

const MarketDemandCard = () => {
  const [marketData, setMarketData] = useState<MarketDemandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate] = useState(new Date());

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/vegetables/recommend-crops?top_n=5");
      
      if (!response.ok) {
        throw new Error("Failed to fetch market demand data");
      }
      
      const data = await response.json();
      setMarketData(data.recommended_crops || []);
    } catch (err) {
      setError("Failed to load market demand data. Please try again later.");
      console.error("Error fetching market data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDemandLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high": return "bg-green-100 text-green-800";
      case "moderate": return "bg-blue-100 text-blue-800";
      case "stable": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month - 1];
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Demand Forecast for {getMonthName(currentDate.getMonth() + 1)} {currentDate.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Demand Forecast for {getMonthName(currentDate.getMonth() + 1)} {currentDate.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button onClick={fetchMarketData} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Market Demand Forecast for {getMonthName(currentDate.getMonth() + 1)} {currentDate.getFullYear()}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top recommended crops based on Est. predicted market demand
        </p>
      </CardHeader>
      <CardContent>
        {marketData.length > 0 ? (
          <div className="space-y-4">
            {marketData.map((crop, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex-1">
                  <div className="font-medium">{crop.vegetable}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      ₱{crop.current_avg_price.toFixed(2)} → Est. ₱{crop.predicted_price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      {getPriceChangeIcon(crop.price_change)}
                      <span className={`text-xs ${crop.price_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Est. {crop.price_change_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                <Badge className={getDemandLevelColor(crop.demand_level)}>
                  {crop.demand_level}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No market demand data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketDemandCard;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Search,
  ArrowLeft
} from "lucide-react";

interface MarketDemandData {
  vegetable: string;
  predicted_price: number;
  current_avg_price: number;
  price_change: number;
  price_change_percent: number;
  demand_level: string;
}

const MarketDemand = () => {
  const navigate = useNavigate();
  const [marketData, setMarketData] = useState<MarketDemandData[]>([]);
  const [filteredData, setFilteredData] = useState<MarketDemandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = marketData.filter(crop => 
        crop.vegetable.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(marketData);
    }
  }, [searchTerm, marketData]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/vegetables/recommend-crops?top_n=20");
      
      if (!response.ok) {
        throw new Error("Failed to fetch market demand data");
      }
      
      const data = await response.json();
      setMarketData(data.recommended_crops || []);
      setFilteredData(data.recommended_crops || []);
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

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
          </div>
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Demand Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
          </div>
          
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Demand Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-8">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchMarketData} variant="outline">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search crops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommended Crops
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Based on predicted market demand and price trends
                </p>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <div className="space-y-4">
                    {filteredData.map((crop, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="font-medium">{crop.vegetable}</div>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Current:</span>
                              <span className="font-medium">₱{crop.current_avg_price.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Predicted:</span>
                              <span className="font-medium">₱{crop.predicted_price.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getPriceChangeIcon(crop.price_change)}
                              <span className={`text-sm ${crop.price_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {crop.price_change_percent >= 0 ? '+' : ''}{crop.price_change_percent.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getDemandLevelColor(crop.demand_level)}>
                          {crop.demand_level} Demand
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No crops match your search" : "No market demand data available"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Demand Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <span className="font-medium">High Demand</span>
                  <Badge className="bg-green-800 text-green-100">+10%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg">
                  <span className="font-medium">Moderate Demand</span>
                  <Badge className="bg-blue-800 text-blue-100">+5% to +10%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-100 rounded-lg">
                  <span className="font-medium">Stable Demand</span>
                  <Badge className="bg-yellow-800 text-yellow-100">-5% to +5%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                  <span className="font-medium">Low Demand</span>
                  <Badge className="bg-red-800 text-red-100">-5% or less</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                    <span>AI analyzes historical price trends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                    <span>Predicts future price movements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                    <span>Calculates demand levels based on price changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                    <span>Updates predictions regularly</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDemand;
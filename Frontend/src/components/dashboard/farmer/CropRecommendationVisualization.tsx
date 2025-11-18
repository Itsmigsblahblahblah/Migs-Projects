import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sprout, 
  TrendingUp, 
  Thermometer, 
  Droplets, 
  Sun,
  Calendar,
  MapPin
} from "lucide-react";

interface RecommendationData {
  crop: string;
  confidence: number;
  market_demand_score?: number;
}

interface SoilData {
  pH: number;
  Nitrogen: string;
  Phosphorus: string;
  Potassium: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
}

interface CropRecommendationVisualizationProps {
  recommendations: RecommendationData[];
  soilData: SoilData;
  weatherData?: WeatherData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const CropRecommendationVisualization: React.FC<CropRecommendationVisualizationProps> = ({
  recommendations,
  soilData,
  weatherData
}) => {
  // Prepare data for charts - filter duplicates and limit to 6 items to match the recommendations display
  const filteredRecommendations = recommendations
    .filter((recommendation, index, self) => 
      index === self.findIndex(r => r.crop.trim() === recommendation.crop.trim())
    )
    .slice(0, 6);
    
  const chartData = filteredRecommendations.map(rec => ({
    name: rec.crop,
    confidence: Math.round(rec.confidence * 100),
    marketDemand: rec.market_demand_score ? Math.round(rec.market_demand_score * 100) : 0
  }));

  // Prepare soil data for visualization
  const soilChartData = [
    { name: 'pH', value: soilData.pH },
    { name: 'Nitrogen', value: soilData.Nitrogen === 'L' ? 1 : soilData.Nitrogen === 'M' ? 2 : 3 },
    { name: 'Phosphorus', value: soilData.Phosphorus === 'L' ? 1 : soilData.Phosphorus === 'M' ? 2 : 3 },
    { name: 'Potassium', value: soilData.Potassium === 'L' ? 1 : soilData.Potassium === 'M' ? 2 : 3 }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weatherData?.temperature ? `${Math.round(weatherData.temperature)}°C` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Current conditions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Humidity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weatherData?.humidity ? `${Math.round(weatherData.humidity)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Relative humidity</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Weather
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weatherData?.condition || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Current conditions</p>
          </CardContent>
        </Card>
      </div>

      {/* Soil Analysis Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Soil Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Soil Properties</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>pH Level:</span>
                  <Badge variant={soilData.pH < 6 ? "destructive" : soilData.pH > 7.5 ? "destructive" : "default"}>
                    {soilData.pH}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Nitrogen:</span>
                  <Badge variant={soilData.Nitrogen === 'L' ? "destructive" : "default"}>
                    {soilData.Nitrogen === 'L' ? 'Low' : soilData.Nitrogen === 'M' ? 'Medium' : 'High'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Phosphorus:</span>
                  <Badge variant={soilData.Phosphorus === 'L' ? "destructive" : "default"}>
                    {soilData.Phosphorus === 'L' ? 'Low' : soilData.Phosphorus === 'M' ? 'Medium' : 'High'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Potassium:</span>
                  <Badge variant={soilData.Potassium === 'L' ? "destructive" : "default"}>
                    {soilData.Potassium === 'L' ? 'Low' : soilData.Potassium === 'M' ? 'Medium' : 'High'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={soilChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Visualization */}
      {recommendations.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5" />
                Crop Recommendations Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    labelFormatter={(name) => `Crop: ${name}`}
                  />
                  <Legend />
                  <Bar dataKey="confidence" name="Confidence Score" fill="#8884d8" />
                  {chartData.some(item => item.marketDemand > 0) && (
                    <Bar dataKey="marketDemand" name="Market Demand" fill="#82ca9d" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommendation Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="confidence"
                    nameKey="name"
                    label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Confidence']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Farmer-Friendly Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Farming Tips Based on Your Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent/10 rounded-lg border">
              <h4 className="font-medium mb-2">Soil Management</h4>
              <ul className="text-sm space-y-1">
                {soilData.pH < 6 && <li>• Consider adding lime to raise pH level</li>}
                {soilData.pH > 7.5 && <li>• Consider adding sulfur to lower pH level</li>}
                {soilData.Nitrogen === 'L' && <li>• Add nitrogen-rich fertilizer or compost</li>}
                {soilData.Phosphorus === 'L' && <li>• Apply phosphorus fertilizer</li>}
                {soilData.Potassium === 'L' && <li>• Use potassium-rich fertilizer</li>}
                <li>• Regular soil testing is recommended</li>
              </ul>
            </div>
            
            <div className="p-4 bg-accent/10 rounded-lg border">
              <h4 className="font-medium mb-2">Weather Considerations</h4>
              <ul className="text-sm space-y-1">
                {weatherData?.temperature && weatherData.temperature > 30 && (
                  <li>• High temperature: Ensure adequate irrigation</li>
                )}
                {weatherData?.temperature && weatherData.temperature < 20 && (
                  <li>• Low temperature: Consider cold-resistant crops</li>
                )}
                {weatherData?.humidity && weatherData.humidity > 80 && (
                  <li>• High humidity: Watch for fungal diseases</li>
                )}
                {weatherData?.humidity && weatherData.humidity < 40 && (
                  <li>• Low humidity: Increase watering frequency</li>
                )}
                <li>• Plan planting according to forecast</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CropRecommendationVisualization;
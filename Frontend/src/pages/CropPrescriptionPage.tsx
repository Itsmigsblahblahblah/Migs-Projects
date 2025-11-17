import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sprout, 
  Thermometer, 
  Droplets, 
  Sun, 
  TrendingUp, 
  Leaf,
  Calendar,
  MapPin,
  FlaskConical,
  ArrowLeft
} from "lucide-react";

// Add this interface for the API response
interface CropRecommendation {
  crop: string;
  confidence: number;
}

interface SoilData {
  pH: number;
  Nitrogen: string;  // 'L', 'M', or 'H'
  Phosphorus: string;  // 'L', 'M', or 'H'
  Potassium: string;  // 'L', 'M', or 'H'
}

// Add interface for weather data
interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation_probability: number;
  wind_speed: number;
  uv_index: number;
}

interface PrescriptionDetails {
  id: string;
  crop: string;
  reason: string;
  confidence: number;
  plantingSeason: string;
  expectedYield: string;
  marketTrend: string;
  soilType: string;
  weatherCondition: string;
  recommendations: string[];
  avoid: string[];
  marketDemand?: {
    predicted_price: number;
    current_avg_price: number;
    price_change: number;
    price_change_percent: number;
    demand_level: string;
  };
}

interface FarmerProfile {
  fullName: string;
  email: string;
  contactNumber: string;
  homeAddress: string;
  farmAddress: string;
  farmArea: string;
  photoURL: string;
  createdAt: string;
}

interface CropPrescriptionPageProps {
  farmerProfile?: FarmerProfile;
  weatherData?: any; // Add weather data prop
}

const CropPrescriptionPage = ({ farmerProfile, weatherData }: CropPrescriptionPageProps) => {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState<PrescriptionDetails | null>(null);
  // Add state for loading and recommendations
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for soil data input
  const [inputSoilData, setInputSoilData] = useState<SoilData>({
    pH: 6.5,
    Nitrogen: 'M',
    Phosphorus: 'M',
    Potassium: 'M'
  });
  const [soilDataLoading, setSoilDataLoading] = useState(false);

  // Function to extract barangay name from farm address
  const extractBarangay = (farmAddress: string) => {
    console.log('Extracting barangay from farm address:', farmAddress);
    // Extract barangay name from address like "Brgy. San Roque" or "Barangay San Roque"
    const match = farmAddress.match(/(?:Brgy\.|Barangay)\s+(.+)/i);
    if (match && match[1]) {
      console.log('Matched barangay:', match[1].trim());
      return match[1].trim();
    }
    console.log('No match found, returning farm address:', farmAddress);
    return farmAddress; // fallback to the full address if no match
  };

  // Function to fetch soil data by barangay
  const fetchSoilDataByBarangay = async (barangay: string) => {
    setSoilDataLoading(true);
    setError(null);
    
    try {
      console.log('Fetching soil data for barangay:', barangay);
      const response = await fetch(`/api/soil-data/${encodeURIComponent(barangay)}`);
      
      console.log('Soil data response status:', response.status);
      console.log('Soil data response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Soil data error response:', errorText);
        throw new Error(`Failed to fetch soil data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Soil data response:', data);
      
      if (data.soil_data && Object.keys(data.soil_data).length > 0) {
        // Update input soil data with fetched data
        setInputSoilData({
          pH: data.soil_data.pH,
          Nitrogen: data.soil_data.Nitrogen,
          Phosphorus: data.soil_data.Phosphorus,
          Potassium: data.soil_data.Potassium
        });
        return data.soil_data;
      } else {
        // If no data found, keep current values or use defaults
        console.log(`No soil data found for barangay: ${barangay}`);
        return null;
      }
    } catch (err) {
      console.error('Error fetching soil data:', err);
      setError('Failed to load soil data. Using default values.');
      return null;
    } finally {
      setSoilDataLoading(false);
    }
  };

  // Add function to fetch recommendations
  const fetchRecommendations = async (soilData: SoilData, weatherDataForRecommendation?: WeatherData) => {
    setLoading(true);
    setError(null);
    setRecommendations([]); // Clear previous recommendations
    
    try {
      // Use the weather-enhanced endpoint if weather data is available
      const endpoint = weatherDataForRecommendation ? '/api/recommend-with-weather' : '/api/recommend';
      const requestBody = weatherDataForRecommendation 
        ? { soil_data: soilData, weather_data: weatherDataForRecommendation }
        : soilData;
      
      console.log('Fetching recommendations from:', endpoint);
      console.log('Request body:', requestBody);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch recommendations: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Check if recommended_crops exists and is an array
      if (data.recommended_crops && Array.isArray(data.recommended_crops)) {
        console.log('Setting recommendations:', data.recommended_crops);
        setRecommendations(data.recommended_crops);
      } else {
        console.error('Invalid response format:', data);
        setError('Invalid response format from server');
      }
    } catch (err) {
      setError('Failed to load crop recommendations. Please try again.');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch market demand data for a specific crop
  const fetchMarketDemand = async (cropName: string) => {
    try {
      console.log('Fetching market demand for crop:', cropName);
      const response = await fetch(`/api/vegetables/vegetable-data/${encodeURIComponent(cropName)}`);
      
      console.log('Market demand response status:', response.status);
      console.log('Market demand response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Market demand error response:', errorText);
        return null;
      }
      
      const data = await response.json();
      console.log('Market demand response:', data);
      
      // If we have vegetable data, we can make a demand prediction
      if (data.vegetable_data && data.vegetable_data.length > 0) {
        // Extract historical data for prediction
        const historicalData = data.vegetable_data.slice(-6); // Last 6 data points
        const historicalPrices = historicalData.map((item: any) => parseFloat(item.Price));
        const historicalAnnualPrices = historicalData.map((item: any) => parseFloat(item.Annual_Price));
        const historicalMonths = historicalData.map((item: any) => parseInt(item.MonthNum));
        
        // Make demand prediction
        const predictionResponse = await fetch('/api/vegetables/predict-demand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vegetable_name: cropName,
            historical_prices: historicalPrices,
            historical_annual_prices: historicalAnnualPrices,
            historical_months: historicalMonths
          }),
        });
        
        if (predictionResponse.ok) {
          const predictionData = await predictionResponse.json();
          console.log('Prediction data:', predictionData);
          return predictionData;
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching market demand:', err);
      return null;
    }
  };

  // Fetch soil data when component mounts and farmer profile is available
  useEffect(() => {
    console.log('useEffect triggered - farmerProfile:', farmerProfile);
    const loadSoilData = async () => {
      if (farmerProfile?.farmAddress) {
        console.log('Fetching soil data for farm address:', farmerProfile.farmAddress);
        const barangay = extractBarangay(farmerProfile.farmAddress);
        console.log('Extracted barangay:', barangay);
        const soilData = await fetchSoilDataByBarangay(barangay);
        
        // Prepare weather data if available
        let weatherDataForRecommendation: WeatherData | undefined;
        if (weatherData) {
          weatherDataForRecommendation = {
            temperature: weatherData.temperature || 25,
            humidity: weatherData.humidity || 50,
            precipitation_probability: weatherData.extendedForecast?.[0]?.precipitationProbability || 0,
            wind_speed: weatherData.extendedForecast?.[0]?.windSpeed || 5,
            uv_index: weatherData.extendedForecast?.[0]?.uvIndex || 5
          };
        }
        
        // If we got soil data, use it for recommendations
        if (soilData) {
          console.log('Using fetched soil data for recommendations:', soilData);
          fetchRecommendations({
            pH: soilData.pH,
            Nitrogen: soilData.Nitrogen,
            Phosphorus: soilData.Phosphorus,
            Potassium: soilData.Potassium
          }, weatherDataForRecommendation);
        } else {
          // If no soil data found, use current input values
          console.log('No soil data found, using input soil data:', inputSoilData);
          fetchRecommendations(inputSoilData, weatherDataForRecommendation);
        }
      } else {
        // If no farm address, use default values
        console.log('No farm address, using default input soil data:', inputSoilData);
        fetchRecommendations(inputSoilData);
      }
    };

    loadSoilData();
  }, [farmerProfile]);

  const handleCropSelect = async (crop: PrescriptionDetails) => {
    // Fetch market demand data for the selected crop
    const marketDemand = await fetchMarketDemand(crop.crop);
    
    // Update the crop object with market demand data
    const updatedCrop = {
      ...crop,
      marketDemand: marketDemand || undefined
    };
    
    setSelectedCrop(updatedCrop);
  };

  const handleResetSelection = () => {
    setSelectedCrop(null);
  };

  const handleGetRecommendations = () => {
    console.log('Get Recommendations button clicked');
    console.log('Current input soil data:', inputSoilData);
    console.log('Current weather data:', weatherData);
    
    // Clear any previous error
    setError(null);
    
    // Prepare weather data if available
    let weatherDataForRecommendation: WeatherData | undefined;
    if (weatherData) {
      weatherDataForRecommendation = {
        temperature: weatherData.temperature || 25,
        humidity: weatherData.humidity || 50,
        precipitation_probability: weatherData.extendedForecast?.[0]?.precipitationProbability || 0,
        wind_speed: weatherData.extendedForecast?.[0]?.windSpeed || 5,
        uv_index: weatherData.extendedForecast?.[0]?.uvIndex || 5
      };
      console.log('Prepared weather data for recommendation:', weatherDataForRecommendation);
    }
    
    fetchRecommendations(inputSoilData, weatherDataForRecommendation);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crop Prescription</h1>
            <p className="text-muted-foreground">AI-powered crop recommendations based on current weather, soil conditions, and market trends</p>
          </div>
        </div>

        {!selectedCrop ? (
          <div className="space-y-6">
            {/* Soil Data Input */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Soil Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(soilDataLoading || loading) && (
                  <div className="flex justify-center items-center h-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    <span>Loading soil data...</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ph" className="block text-sm font-medium mb-1">pH Level</label>
                    <input
                      id="ph"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      value={inputSoilData.pH}
                      onChange={(e) => setInputSoilData({...inputSoilData, pH: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={soilDataLoading || loading}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nitrogen</label>
                      <select 
                        value={inputSoilData.Nitrogen} 
                        onChange={(e) => setInputSoilData({...inputSoilData, Nitrogen: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={soilDataLoading || loading}
                      >
                        <option value="L">Low (L)</option>
                        <option value="M">Medium (M)</option>
                        <option value="H">High (H)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phosphorus</label>
                      <select 
                        value={inputSoilData.Phosphorus} 
                        onChange={(e) => setInputSoilData({...inputSoilData, Phosphorus: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={soilDataLoading || loading}
                      >
                        <option value="L">Low (L)</option>
                        <option value="M">Medium (M)</option>
                        <option value="H">High (H)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Potassium</label>
                      <select 
                        value={inputSoilData.Potassium} 
                        onChange={(e) => setInputSoilData({...inputSoilData, Potassium: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={soilDataLoading || loading}
                      >
                        <option value="L">Low (L)</option>
                        <option value="M">Medium (M)</option>
                        <option value="H">High (H)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleGetRecommendations}
                  disabled={loading || soilDataLoading}
                  className="w-full"
                >
                  {loading ? "Analyzing..." : "Get Recommendations"}
                </Button>
              </CardContent>
            </Card>

            {/* Environmental Factors */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Thermometer className="h-5 w-5 text-primary" />
                  Current Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-4 w-4 text-accent" />
                    <span className="font-medium">Temperature</span>
                  </div>
                  <p className="text-2xl font-bold">{weatherData?.temperature ? `${Math.round(weatherData.temperature)}°C` : '28°C'}</p>
                  <p className="text-sm text-muted-foreground">Current temperature</p>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-accent" />
                    <span className="font-medium">Humidity</span>
                  </div>
                  <p className="text-2xl font-bold">{weatherData?.humidity ? `${Math.round(weatherData.humidity)}%` : '65%'}</p>
                  <p className="text-sm text-muted-foreground">Relative humidity</p>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-accent" />
                    <span className="font-medium">Weather</span>
                  </div>
                  <p className="text-2xl font-bold">{weatherData?.condition || 'Sunny'}</p>
                  <p className="text-sm text-muted-foreground">Current conditions</p>
                </div>
              </CardContent>
            </Card>

            {/* 7-Day Forecast */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  7-Day Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weatherData?.extendedForecast && weatherData.extendedForecast.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                    {weatherData.extendedForecast.slice(0, 7).map((day: any, index: number) => (
                      <div key={index} className="p-2 bg-accent/5 rounded-lg border text-center">
                        <p className="text-xs font-medium">{day.dayOfWeek}</p>
                        <p className="text-xs text-muted-foreground">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm mt-1">{day.condition}</p>
                        <div className="flex justify-center gap-1 mt-1">
                          <span className="text-sm font-bold">{Math.round(day.high)}°</span>
                          <span className="text-sm text-muted-foreground">/</span>
                          <span className="text-sm">{Math.round(day.low)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">7-day forecast data not available</p>
                )}
              </CardContent>
            </Card>

            {/* Prescribed Crops */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recommended Crops</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your soil conditions and current weather patterns
              </p>
              
              {loading && (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Analyzing soil and weather data...</span>
                </div>
              )}
              
              {error && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive">
                  {error}
                </div>
              )}
              
              {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendations.length > 0 ? (
                    recommendations.map((recommendation, index) => (
                      <Card 
                        key={index}
                        className="hover:shadow-md transition-shadow cursor-pointer border-primary/20"
                        onClick={() => handleCropSelect({
                          id: index.toString(),
                          crop: recommendation.crop,
                          reason: `Recommended based on your soil analysis and current weather conditions with ${Math.round(recommendation.confidence * 100)}% confidence.`,
                          confidence: Math.round(recommendation.confidence * 100),
                          plantingSeason: "Based on current conditions",
                          expectedYield: "Varies by conditions",
                          marketTrend: "Check local market",
                          soilType: `pH: ${inputSoilData.pH}, N:${inputSoilData.Nitrogen}, P:${inputSoilData.Phosphorus}, K:${inputSoilData.Potassium}`,
                          weatherCondition: "Current weather patterns",
                          recommendations: [
                            "Follow local agricultural guidelines",
                            "Monitor soil moisture levels",
                            "Apply appropriate fertilizers based on soil test"
                          ],
                          avoid: [
                            "Plant in waterlogged areas",
                            "Over-fertilize without soil testing",
                            "Ignore local climate conditions"
                          ]
                        })}
                        >
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{recommendation.crop}</span>
                              <Badge variant="secondary">{Math.round(recommendation.confidence * 100)}%</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-3">
                              Recommended based on your soil analysis and current weather conditions with {Math.round(recommendation.confidence * 100)}% confidence.
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>Planting season varies</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>Check local market trends</span>
                            </div>
                          </CardContent>
                        </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No crop recommendations available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm">
                <strong>Note:</strong> These recommendations are based on real soil analysis data processed by our AI model.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={handleResetSelection}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedCrop.crop} Prescription</h1>
                <p className="text-muted-foreground">Detailed prescription and market analysis</p>
              </div>
            </div>

            {/* Selected Crop Details */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-6 w-6 text-primary" />
                    {selectedCrop.crop} Prescription
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Confidence: {selectedCrop.confidence}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <p className="text-lg">{selectedCrop.reason}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Planting Season
                    </h4>
                    <p>{selectedCrop.plantingSeason}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Market Trend
                    </h4>
                    <p>{selectedCrop.marketTrend}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Soil Type
                    </h4>
                    <p>{selectedCrop.soilType}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Weather Condition
                    </h4>
                    <p>Optimal growth with current temperature and humidity levels</p>
                  </div>
                  
                  {/* Market Demand Information */}
                  {selectedCrop.marketDemand && (
                    <div className="p-4 bg-primary/5 rounded-lg border md:col-span-2">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Market Demand Forecast
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Price</p>
                          <p className="font-medium">₱{selectedCrop.marketDemand.current_avg_price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Predicted Price</p>
                          <p className="font-medium">₱{selectedCrop.marketDemand.predicted_price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Price Change</p>
                          <p className={`font-medium ${selectedCrop.marketDemand.price_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedCrop.marketDemand.price_change >= 0 ? '+' : ''}{selectedCrop.marketDemand.price_change.toFixed(2)} 
                            ({selectedCrop.marketDemand.price_change_percent >= 0 ? '+' : ''}{selectedCrop.marketDemand.price_change_percent.toFixed(2)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Demand Level</p>
                          <p className="font-medium">
                            {selectedCrop.marketDemand.demand_level}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-success" />
                    Planting Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {selectedCrop.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 w-2 h-2 rounded-full bg-success flex-shrink-0"></span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Things to Avoid */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="text-destructive">⚠️</span>
                    Things to Avoid
                  </h4>
                  <ul className="space-y-2">
                    {selectedCrop.avoid.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 w-2 h-2 rounded-full bg-destructive flex-shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1">
                Save Prescription
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleResetSelection}>
                Explore Other Crops
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CropPrescriptionPage;
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  BarChart3,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import CropRecommendationVisualization from "@/components/dashboard/farmer/CropRecommendationVisualization";
import AddCropDialog from "@/components/dashboard/farmer/AddCropDialog";
import { useCropManagement } from "@/hooks/custom/useCropManagement";

// Add this interface for the API response
interface CropRecommendation {
  crop: string;
  confidence: number;
  market_demand_score?: number;
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
  // These props are now optional since we're getting them from location state
  farmerProfile?: FarmerProfile;
  weatherData?: any; // Add weather data prop
}

const CropPrescriptionPage = ({ farmerProfile, weatherData }: CropPrescriptionPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get data from location state if not passed as props
  const locationState: any = location.state || {};
  const effectiveFarmerProfile = farmerProfile || locationState.farmerProfile;
  // Ensure weatherData is properly retrieved from location state or localStorage
  const effectiveWeatherData = weatherData || locationState.weatherData || JSON.parse(localStorage.getItem('weatherData') || 'null');

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
  const [activeTab, setActiveTab] = useState("recommendations");
  // Add state for showing more recommendations
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  // Add state for AddCropDialog
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);

  // State to store the ID of the newly added crop
  const [newlyAddedCropId, setNewlyAddedCropId] = useState<string | null>(null);

  // Use the crop management hook
  const {
    newCrop,
    setNewCrop,
    handleCropInputChange,
    handleSoilTypeChange,
    handleAddCrop
  } = useCropManagement();

  // Wrapper function for handleAddCrop that returns a boolean and captures the crop ID
  const handleAddCropWrapper = async (): Promise<boolean> => {
    const result = await handleAddCrop();
    if (result && typeof result === 'string') {
      // Store the ID of the newly added crop
      setNewlyAddedCropId(result);
      return true;
    }
    return false;
  };

  // Effect to navigate to the Crop Details page when a new crop is added
  useEffect(() => {
    if (newlyAddedCropId) {
      // Navigate to the Crop Details page using the correct route
      navigate(`/crop/${newlyAddedCropId}`);
      // Reset the newlyAddedCropId state
      setNewlyAddedCropId(null);
    }
  }, [newlyAddedCropId, navigate]);

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
      // Use environment variable for backend URL or default to localhost
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND_URL}/soil-data/${encodeURIComponent(barangay)}`);

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

  // Add function to fetch recommendations using enhanced model
  const fetchEnhancedRecommendations = async (soilData: SoilData, weatherDataForRecommendation?: WeatherData) => {
    setLoading(true);
    setError(null);
    setRecommendations([]); // Clear previous recommendations

    try {
      // Prepare request body with all data sources
      const requestBody = {
        soil_data: soilData,
        weather_data: weatherDataForRecommendation || {
          temperature: 25,
          humidity: 60,
          precipitation_probability: 50,
          wind_speed: 10,
          uv_index: 5
        },
        market_context: {
          season: weatherDataForRecommendation ?
            (weatherDataForRecommendation.temperature > 30 ? "dry" : "wet") : "dry",
          month: new Date().getMonth() + 1
        }
      };

      console.log('Fetching enhanced recommendations with request body:', requestBody);

      // Use environment variable for backend URL or default to localhost
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND_URL}/enhanced-soil/enhanced-recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Enhanced recommendation response status:', response.status);
      console.log('Enhanced recommendation response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch enhanced recommendations: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Enhanced recommendation response data:', data);

      // Check if recommended_crops exists and is an array
      if (data.recommended_crops && Array.isArray(data.recommended_crops)) {
        console.log('Setting enhanced recommendations:', data.recommended_crops);
        // Transform the data to match our interface
        const transformedRecommendations = data.recommended_crops.map((item: any) => ({
          crop: item.crop,
          confidence: item.final_score !== undefined ? item.final_score : item.confidence,
          market_demand_score: item.market_demand_score
        }));
        setRecommendations(transformedRecommendations);
      } else {
        console.error('Invalid response format:', data);
        setError('Invalid response format from enhanced recommendation server');
      }
    } catch (err) {
      setError('Failed to load enhanced crop recommendations. Please try again.');
      console.error('Error fetching enhanced recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch market demand data for a specific crop
  const fetchMarketDemand = async (cropName: string) => {
    try {
      console.log('Fetching market demand for crop:', cropName);
      // Use environment variable for backend URL or default to localhost
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND_URL}/vegetables/vegetable-data/${encodeURIComponent(cropName)}`);

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
        // Use environment variable for backend URL or default to localhost
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const predictionResponse = await fetch(`${BACKEND_URL}/vegetables/predict-demand`, {
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
    console.log('useEffect triggered - farmerProfile:', effectiveFarmerProfile);
    const loadSoilData = async () => {
      if (effectiveFarmerProfile?.farmAddress) {
        console.log('Fetching soil data for farm address:', effectiveFarmerProfile.farmAddress);
        const barangay = extractBarangay(effectiveFarmerProfile.farmAddress);
        console.log('Extracted barangay:', barangay);
        const soilData = await fetchSoilDataByBarangay(barangay);

        // Prepare weather data if available
        let weatherDataForRecommendation: WeatherData | undefined;
        if (effectiveWeatherData) {
          weatherDataForRecommendation = {
            temperature: effectiveWeatherData.temperature || 25,
            humidity: effectiveWeatherData.humidity || 50,
            precipitation_probability: effectiveWeatherData.extendedForecast?.[0]?.precipitationProbability || 0,
            wind_speed: effectiveWeatherData.extendedForecast?.[0]?.windSpeed || 5,
            uv_index: effectiveWeatherData.extendedForecast?.[0]?.uvIndex || 5
          };
        }

        // If we got soil data, use it for recommendations
        if (soilData) {
          console.log('Using fetched soil data for enhanced recommendations:', soilData);
          fetchEnhancedRecommendations({
            pH: soilData.pH,
            Nitrogen: soilData.Nitrogen,
            Phosphorus: soilData.Phosphorus,
            Potassium: soilData.Potassium
          }, weatherDataForRecommendation);
        } else {
          // If no soil data found, use current input values
          console.log('No soil data found, using input soil data:', inputSoilData);
          fetchEnhancedRecommendations(inputSoilData, weatherDataForRecommendation);
        }
      } else {
        // If no farm address, use default values
        console.log('No farm address, using default input soil data:', inputSoilData);
        fetchEnhancedRecommendations(inputSoilData);
      }
    };

    loadSoilData();
  }, [effectiveFarmerProfile]);

  const handleCropSelect = async (crop: PrescriptionDetails) => {
    // Fetch market demand data for the selected crop
    const marketDemand = await fetchMarketDemand(crop.crop);

    // Update the crop object with market demand data and dynamic values
    const updatedCrop = {
      ...crop,
      marketDemand: marketDemand || undefined,
      plantingSeason: getPlantingSeason(crop.crop, inputSoilData, effectiveWeatherData),
      marketTrend: getMarketTrend(marketDemand),
      soilType: getSoilType(inputSoilData),
      weatherCondition: getWeatherCondition(effectiveWeatherData),
      recommendations: getCropRecommendations(
        crop.crop,
        inputSoilData,
        effectiveWeatherData,
        marketDemand
      ),
      avoid: getThingsToAvoid(
        crop.crop,
        inputSoilData,
        effectiveWeatherData
      )
    };

    setSelectedCrop(updatedCrop);
  };

  const handleResetSelection = () => {
    setSelectedCrop(null);
    setActiveTab("recommendations");
  };

  const handleGetRecommendations = () => {
    console.log('Get Enhanced Recommendations button clicked');
    console.log('Current input soil data:', inputSoilData);
    console.log('Current weather data:', effectiveWeatherData);

    // Clear any previous error
    setError(null);

    // Prepare weather data if available
    let weatherDataForRecommendation: WeatherData | undefined;
    if (effectiveWeatherData) {
      weatherDataForRecommendation = {
        temperature: effectiveWeatherData.temperature || 25,
        humidity: effectiveWeatherData.humidity || 50,
        precipitation_probability: effectiveWeatherData.extendedForecast?.[0]?.precipitationProbability || 0,
        wind_speed: effectiveWeatherData.extendedForecast?.[0]?.windSpeed || 5,
        uv_index: effectiveWeatherData.extendedForecast?.[0]?.uvIndex || 5
      };
      console.log('Prepared weather data for enhanced recommendation:', weatherDataForRecommendation);
    }

    fetchEnhancedRecommendations(inputSoilData, weatherDataForRecommendation);
  };

  // Function to handle saving prescription
  const handleSavePrescription = () => {
    if (selectedCrop) {
      // Pre-fill the crop name in the newCrop state
      setNewCrop(prev => ({
        ...prev,
        name: selectedCrop.crop
      }));
      // Open the AddCropDialog
      setIsAddCropDialogOpen(true);
    }
  };

  // Function to get confidence level badge variant
  const getConfidenceVariant = (confidence: number) => {
    if (confidence >= 0.8) return "default";
    if (confidence >= 0.6) return "secondary";
    return "outline";
  };

  // Function to get market demand level badge variant
  const getMarketDemandVariant = (marketScore: number | undefined) => {
    if (!marketScore) return "outline";
    if (marketScore >= 0.8) return "default"; // High demand
    if (marketScore >= 0.6) return "secondary"; // Moderate demand
    return "outline"; // Low demand
  };

  // Function to get planting season based on crop and soil/weather data
  const getPlantingSeason = (crop: string, soilData: SoilData, weatherData: any) => {
    // Simple logic based on crop type and weather conditions
    const temp = weatherData?.temperature || 25;
    const humidity = weatherData?.humidity || 60;

    // Crop-specific planting season logic
    if (crop.toLowerCase().includes("rice")) {
      if (temp >= 20 && temp <= 35 && humidity >= 70) {
        return "Wet season (June-October) - Optimal temperature and humidity for rice cultivation";
      } else {
        return "Dry season (November-April) - Irrigated rice cultivation recommended";
      }
    } else if (crop.toLowerCase().includes("corn")) {
      if (temp >= 20 && temp <= 30) {
        return "Two cropping seasons: Wet (June-September) and Dry (March-May)";
      } else {
        return "Optimal planting when temperature is between 20-30°C";
      }
    } else if (crop.toLowerCase().includes("carrot") || crop.toLowerCase().includes("karot")) {
      if (temp >= 10 && temp <= 24) {
        return "Cool season crop - Best planted in early spring or fall";
      } else {
        return "Plant during cooler months when temperature is 10-24°C";
      }
    } else if (crop.toLowerCase().includes("tomato") || crop.toLowerCase().includes("kamatis")) {
      if (temp >= 18 && temp <= 24) {
        return "Plant during dry season when temperature is 18-24°C";
      } else {
        return "Best planted in cooler months to avoid heat stress";
      }
    } else if (crop.toLowerCase().includes("pechay")) {
      if (temp >= 15 && temp <= 25) {
        return "Year-round planting possible with optimal temperature of 15-25°C";
      } else {
        return "Plant during cooler months for best growth";
      }
    } else {
      // Generic logic based on soil and weather
      if (temp >= 20 && temp <= 30 && humidity >= 50 && humidity <= 80) {
        return "Current conditions are favorable for planting";
      } else if (temp < 20) {
        return "Temperature is low - consider warm-season crops or wait for warmer weather";
      } else if (temp > 30) {
        return "Temperature is high - consider cool-season crops or provide shade";
      } else {
        return "Conditions are generally suitable for most crops";
      }
    }
  };

  // Function to get weather condition based on weather data
  const getWeatherCondition = (weatherData: any) => {
    const temp = weatherData?.temperature || 25;
    const humidity = weatherData?.humidity || 60;
    const precipitation = weatherData?.extendedForecast?.[0]?.precipitationProbability || 0;
    const windSpeed = weatherData?.extendedForecast?.[0]?.windSpeed || 5;

    let condition = "";

    if (temp < 15) {
      condition += "Cool conditions - ";
    } else if (temp >= 15 && temp <= 25) {
      condition += "Mild conditions - ";
    } else if (temp > 25 && temp <= 35) {
      condition += "Warm conditions - ";
    } else {
      condition += "Hot conditions - ";
    }

    if (humidity < 40) {
      condition += "Low humidity ";
    } else if (humidity >= 40 && humidity <= 70) {
      condition += "Moderate humidity ";
    } else {
      condition += "High humidity ";
    }

    if (precipitation > 70) {
      condition += "with high chance of rain. ";
    } else if (precipitation > 30) {
      condition += "with moderate chance of rain. ";
    } else {
      condition += "with low chance of rain. ";
    }

    if (windSpeed > 20) {
      condition += "Strong winds expected.";
    } else if (windSpeed > 10) {
      condition += "Moderate winds expected.";
    } else {
      condition += "Light winds expected.";
    }

    return condition;
  };

  // Function to get market trend based on market demand data
  const getMarketTrend = (marketDemand: { predicted_price: number; current_avg_price: number; price_change: number; price_change_percent: number; demand_level: string; } | undefined) => {
    if (!marketDemand) {
      return "Market data not available - Check local market trends";
    }

    const { price_change_percent, demand_level } = marketDemand;

    if (price_change_percent > 5) {
      return `Strong upward trend (+${price_change_percent.toFixed(1)}%) - High demand expected`;
    } else if (price_change_percent > 2) {
      return `Moderate upward trend (+${price_change_percent.toFixed(1)}%) - Good demand`;
    } else if (price_change_percent > 0) {
      return `Stable trend (+${price_change_percent.toFixed(1)}%) - Steady demand`;
    } else if (price_change_percent > -2) {
      return `Slight downward trend (${price_change_percent.toFixed(1)}%) - Stable demand`;
    } else {
      return `Declining trend (${price_change_percent.toFixed(1)}%) - Consider alternative crops`;
    }
  };

  // Function to get soil type description based on soil data
  const getSoilType = (soilData: SoilData) => {
    const { pH, Nitrogen, Phosphorus, Potassium } = soilData;

    let description = `pH: ${pH} (${pH < 6 ? 'Acidic' : pH > 7.5 ? 'Alkaline' : 'Neutral'}), `;

    description += `N: ${Nitrogen === 'L' ? 'Low' : Nitrogen === 'M' ? 'Medium' : 'High'}, `;
    description += `P: ${Phosphorus === 'L' ? 'Low' : Phosphorus === 'M' ? 'Medium' : 'High'}, `;
    description += `K: ${Potassium === 'L' ? 'Low' : Potassium === 'M' ? 'Medium' : 'High'}`;

    // Add fertility assessment
    const nutrientLevels = [Nitrogen, Phosphorus, Potassium];
    const highCount = nutrientLevels.filter(level => level === 'H').length;
    const lowCount = nutrientLevels.filter(level => level === 'L').length;

    if (highCount >= 2) {
      description += " - High fertility soil";
    } else if (lowCount >= 2) {
      description += " - Low fertility soil, consider fertilization";
    } else {
      description += " - Moderate fertility soil";
    }

    return description;
  };

  // Function to get crop-specific recommendations
  const getCropRecommendations = (crop: string, soilData: SoilData, weatherData: any, marketDemand: any) => {
    const recommendations = [];
    const temp = weatherData?.temperature || 25;
    const humidity = weatherData?.humidity || 60;
    const { Nitrogen, Phosphorus, Potassium } = soilData;

    // General recommendations
    recommendations.push("Follow local agricultural guidelines for your region");
    recommendations.push("Monitor soil moisture levels regularly");

    // Crop-specific recommendations
    if (crop.toLowerCase().includes("rice")) {
      recommendations.push("Ensure adequate water supply for paddy cultivation");
      recommendations.push("Apply nitrogen fertilizer in split doses");
    } else if (crop.toLowerCase().includes("corn")) {
      recommendations.push("Plant in rows with proper spacing for optimal growth");
      recommendations.push("Apply balanced fertilizer with higher nitrogen content");
    } else if (crop.toLowerCase().includes("carrot") || crop.toLowerCase().includes("karot")) {
      recommendations.push("Ensure deep, loose soil for proper root development");
      recommendations.push("Thin seedlings to prevent overcrowding");
    } else if (crop.toLowerCase().includes("tomato") || crop.toLowerCase().includes("kamatis")) {
      recommendations.push("Provide support for plants as they grow");
      recommendations.push("Apply mulch to retain soil moisture");
    } else if (crop.toLowerCase().includes("pechay")) {
      recommendations.push("Harvest regularly to encourage new growth");
      recommendations.push("Protect from pests like aphids and caterpillars");
    }

    // Soil-based recommendations
    if (Nitrogen === 'L') recommendations.push("Apply nitrogen-rich fertilizer or compost");
    if (Phosphorus === 'L') recommendations.push("Add bone meal or rock phosphate for phosphorus");
    if (Potassium === 'L') recommendations.push("Use potash or wood ash to increase potassium");

    // Weather-based recommendations
    if (temp > 30) recommendations.push("Provide shade during peak heat hours");
    if (humidity > 80) recommendations.push("Ensure good air circulation to prevent fungal diseases");
    if (humidity < 40) recommendations.push("Increase watering frequency to compensate for low humidity");

    return recommendations;
  };

  // Function to get things to avoid based on crop and conditions
  const getThingsToAvoid = (crop: string, soilData: SoilData, weatherData: any) => {
    const avoid = [];
    const temp = weatherData?.temperature || 25;
    const humidity = weatherData?.humidity || 60;
    const { Nitrogen, Phosphorus, Potassium } = soilData;

    // General things to avoid
    avoid.push("Plant in waterlogged areas as it can cause root rot");
    avoid.push("Over-fertilize without soil testing as it can harm plants");
    avoid.push("Ignore local climate conditions when selecting crops");

    // Crop-specific things to avoid
    if (crop.toLowerCase().includes("rice")) {
      avoid.push("Plant during flooding if drainage is poor");
      avoid.push("Use excessive nitrogen which can cause lodging");
    } else if (crop.toLowerCase().includes("corn")) {
      avoid.push("Plant in poorly drained soils which can cause seed rot");
      avoid.push("Overcrowd plants which reduces yield");
    } else if (crop.toLowerCase().includes("carrot") || crop.toLowerCase().includes("karot")) {
      avoid.push("Plant in heavy clay soils which can cause misshapen roots");
      avoid.push("Overwater as it can cause root cracking");
    } else if (crop.toLowerCase().includes("tomato") || crop.toLowerCase().includes("kamatis")) {
      avoid.push("Overhead watering which can spread fungal diseases");
      avoid.push("Planting too early in cold soil");
    } else if (crop.toLowerCase().includes("pechay")) {
      avoid.push("Allowing plants to bolt by exposing them to high temperatures");
      avoid.push("Harvesting during hot midday hours");
    }

    // Weather-based things to avoid
    if (temp > 35) avoid.push("Plant heat-sensitive crops without shade");
    if (humidity > 85) avoid.push("Grow susceptible crops without proper air circulation");
    if (temp < 10) avoid.push("Plant cold-sensitive crops without protection");

    return avoid;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {!selectedCrop && (
          <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Leaf className="h-6 w-6" />
                  <h1 className="text-2xl font-bold">Crop Prescription</h1>
                </div>
                <p className="text-primary-foreground/90">AI-powered crop recommendations based on soil, weather, and market data</p>
              </div>
            </div>
          </div>
        )}

        {!selectedCrop ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Sprout className="h-4 w-4" />
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Visualization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations">
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
                          onChange={(e) => setInputSoilData({ ...inputSoilData, pH: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={soilDataLoading || loading}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-sm font-medium mb-1">Nitrogen</label>
                          <select
                            value={inputSoilData.Nitrogen}
                            onChange={(e) => setInputSoilData({ ...inputSoilData, Nitrogen: e.target.value })}
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
                            onChange={(e) => setInputSoilData({ ...inputSoilData, Phosphorus: e.target.value })}
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
                            onChange={(e) => setInputSoilData({ ...inputSoilData, Potassium: e.target.value })}
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
                      <p className="text-2xl font-bold">{effectiveWeatherData?.temperature ? `${Math.round(effectiveWeatherData.temperature)}°C` : '28°C'}</p>
                      <p className="text-sm text-muted-foreground">Current temperature</p>
                    </div>

                    <div className="p-4 bg-accent/10 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-accent" />
                        <span className="font-medium">Humidity</span>
                      </div>
                      <p className="text-2xl font-bold">{effectiveWeatherData?.humidity ? `${Math.round(effectiveWeatherData.humidity)}%` : '65%'}</p>
                      <p className="text-sm text-muted-foreground">Relative humidity</p>
                    </div>

                    <div className="p-4 bg-accent/10 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-accent" />
                        <span className="font-medium">Weather</span>
                      </div>
                      <p className="text-2xl font-bold">{effectiveWeatherData?.condition || 'Sunny'}</p>
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
                    {effectiveWeatherData?.extendedForecast && effectiveWeatherData.extendedForecast.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                        {effectiveWeatherData.extendedForecast.slice(0, 7).map((day: any, index: number) => (
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
                  <h3 className="text-lg font-semibold mb-4">Crop Recommendations</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on your soil conditions, current weather patterns, and market demand predictions
                  </p>

                  {loading && (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Analyzing soil, weather, and market data...</span>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive">
                      {error}
                    </div>
                  )}

                  {!loading && !error && (
                    <div className="space-y-4">
                      {recommendations.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Show all 6 recommendations in a 3x2 grid, but filter out duplicates */}
                            {recommendations
                              .filter((recommendation, index, self) =>
                                index === self.findIndex(r => r.crop.trim() === recommendation.crop.trim())
                              )
                              .slice(0, 6)
                              .map((recommendation, index) => (
                                <Card
                                  key={index}
                                  className="hover:shadow-md transition-shadow cursor-pointer border-primary/20"
                                  onClick={() => handleCropSelect({
                                    id: index.toString(),
                                    crop: recommendation.crop,
                                    reason: `Recommended based on your soil analysis, weather conditions, and market demand with ${Math.round(recommendation.confidence * 100)}% confidence.`,
                                    confidence: Math.round(recommendation.confidence * 100),
                                    plantingSeason: getPlantingSeason(recommendation.crop, inputSoilData, effectiveWeatherData),
                                    expectedYield: "Varies by conditions",
                                    marketTrend: getMarketTrend(null), // Will be updated when market data is fetched
                                    soilType: getSoilType(inputSoilData),
                                    weatherCondition: getWeatherCondition(effectiveWeatherData),
                                    recommendations: getCropRecommendations(
                                      recommendation.crop,
                                      inputSoilData,
                                      effectiveWeatherData,
                                      null
                                    ),
                                    avoid: getThingsToAvoid(
                                      recommendation.crop,
                                      inputSoilData,
                                      effectiveWeatherData
                                    )
                                  })}
                                >
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                      <span>{recommendation.crop}</span>
                                      <div className="flex flex-col gap-1">
                                        <Badge variant={getConfidenceVariant(recommendation.confidence)}>
                                          {Math.round(recommendation.confidence * 100)}%
                                        </Badge>
                                        {recommendation.market_demand_score !== undefined && (
                                          <Badge variant={getMarketDemandVariant(recommendation.market_demand_score)} className="text-xs">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            {Math.round(recommendation.market_demand_score * 100)}%
                                          </Badge>
                                        )}
                                      </div>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      Recommended based on your soil analysis, weather conditions, and market demand with {Math.round(recommendation.confidence * 100)}% confidence.
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Calendar className="h-3 w-3" />
                                      <span>Planting season varies</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs mt-1">
                                      <TrendingUp className="h-3 w-3" />
                                      <span>Check local market trends</span>
                                    </div>
                                    {recommendation.market_demand_score !== undefined && (
                                      <div className="flex items-center gap-2 text-xs mt-1">
                                        <BarChart3 className="h-3 w-3" />
                                        <span>Market demand: {Math.round(recommendation.market_demand_score * 100)}%</span>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </>
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
                    <strong>Note:</strong> These recommendations are based on real soil analysis data, weather patterns, and market demand predictions processed by our AI model.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visualization">
              <CropRecommendationVisualization
                recommendations={recommendations.map(rec => ({
                  crop: rec.crop,
                  confidence: rec.confidence,
                  market_demand_score: rec.market_demand_score
                }))}
                soilData={inputSoilData}
                weatherData={{
                  temperature: effectiveWeatherData?.temperature || 25,
                  humidity: effectiveWeatherData?.humidity || 60,
                  condition: effectiveWeatherData?.condition || 'Sunny'
                }}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleResetSelection}
                  className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Leaf className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">{selectedCrop.crop} Prescription</h1>
                  </div>
                  <p className="text-primary-foreground/90">Detailed prescription and market analysis</p>
                </div>
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
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Planting Season
                    </h4>
                    <p>{getPlantingSeason(selectedCrop.crop, inputSoilData, effectiveWeatherData)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Market Trend
                    </h4>
                    <p>{getMarketTrend(selectedCrop.marketDemand)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Soil Type
                    </h4>
                    <p>{getSoilType(inputSoilData)}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Weather Condition
                    </h4>
                    <p>{getWeatherCondition(effectiveWeatherData)}</p>
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
                          <p className="text-sm text-muted-foreground">Est. Predicted Price</p>
                          <p className="font-medium">₱{selectedCrop.marketDemand.predicted_price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Est. Price Change</p>
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
                    {getCropRecommendations(selectedCrop.crop, inputSoilData, effectiveWeatherData, selectedCrop.marketDemand).map((rec, index) => (
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
                    {getThingsToAvoid(selectedCrop.crop, inputSoilData, effectiveWeatherData).map((item, index) => (
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
              <Button className="flex-1" onClick={handleSavePrescription}>
                Save Prescription
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleResetSelection}>
                Explore Other Crops
              </Button>
            </div>
          </div>
        )}

        {/* Add Crop Dialog */}
        <AddCropDialog
          open={isAddCropDialogOpen}
          onOpenChange={setIsAddCropDialogOpen}
          newCrop={newCrop}
          handleCropInputChange={handleCropInputChange}
          handleSoilTypeChange={handleSoilTypeChange}
          handleAddCrop={handleAddCropWrapper}
          lockedCropName={selectedCrop?.crop} // Pass the selected crop name as locked
        />
      </div>
    </Layout>
  );
};

export default CropPrescriptionPage;
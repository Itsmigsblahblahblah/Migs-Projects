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
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortBy, setSortBy] = useState<"predicted_price" | "current_avg_price" | "price_change_percent" | "vegetable">("predicted_price");
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // Default to current month
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to 2025 instead of current year
  const [yearRangeStart, setYearRangeStart] = useState<number>(2025); // Start from 2025 instead of current year
  const [selectedDemandLevel, setSelectedDemandLevel] = useState<string | null>(null); // New state for demand level filtering

  // Generate month options based on selected year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Set the minimum forecastable year to 2025 (the first year after our data ends in 2024)
  const minForecastYear = 2025;
  
  // For the current year, only show months from current month onwards
  // For future years, show all months
  const getAvailableMonths = () => {
    if (selectedYear === currentYear) {
      // Only show current month and future months
      return Array.from({ length: 12 - currentMonth + 1 }, (_, i) => currentMonth + i);
    } else if (selectedYear > currentYear) {
      // For future years, show all months
      return Array.from({ length: 12 }, (_, i) => i + 1);
    } else {
      // For past years (shouldn't happen with our restrictions)
      return [];
    }
  };
  
  const months = getAvailableMonths();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate year options based on range - start from 2025 (first forecastable year)
  const years = Array.from({ length: 6 }, (_, i) => Math.max(minForecastYear, yearRangeStart) + i);

  useEffect(() => {
    fetchMarketData();
  }, [selectedMonth, selectedYear, selectedDemandLevel]);

  useEffect(() => {
    let result = [...marketData];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(crop => 
        crop.vegetable.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply demand level filter
    if (selectedDemandLevel) {
      result = result.filter(crop => crop.demand_level.toLowerCase() === selectedDemandLevel.toLowerCase());
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "predicted_price":
          aValue = a.predicted_price;
          bValue = b.predicted_price;
          break;
        case "current_avg_price":
          aValue = a.current_avg_price;
          bValue = b.current_avg_price;
          break;
        case "price_change_percent":
          aValue = a.price_change_percent;
          bValue = b.price_change_percent;
          break;
        case "vegetable":
          aValue = a.vegetable.toLowerCase();
          bValue = b.vegetable.toLowerCase();
          break;
        default:
          aValue = a.predicted_price;
          bValue = b.predicted_price;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        // String comparison
        if (sortOrder === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        // Numeric comparison
        if (sortOrder === "asc") {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
    });
    
    setFilteredData(result);
  }, [searchTerm, marketData, sortOrder, sortBy, selectedDemandLevel]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      // Include month, year, and demand_level parameters in the API call
      // Request all crops instead of just 20
      let url = `/vegetables/recommend-crops?top_n=1000&month=${selectedMonth}&year=${selectedYear}`;
      if (selectedDemandLevel) {
        url += `&demand_level=${selectedDemandLevel}`;
      }
      
      const response = await fetch(url);
      
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

  const handleSortChange = (criteria: "predicted_price" | "current_avg_price" | "price_change_percent" | "vegetable", order: "asc" | "desc") => {
    setSortBy(criteria);
    setSortOrder(order);
  };

  const handleAccordionChange = (value: string | undefined) => {
    setOpenAccordion(value);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    // Only allow selection of years from 2025 onwards (forecastable future dates)
    if (year >= 2025) {
      setSelectedYear(year);
    }
  };

  const navigateYearRange = (direction: 'prev' | 'next') => {
    const newStart = direction === 'prev' 
      ? Math.max(2025, yearRangeStart - 6) // Minimum year is 2025
      : yearRangeStart + 6;
    setYearRangeStart(newStart);
  };

  const getMonthName = (month: number) => {
    return monthNames[month - 1];
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

  const getSortByLabel = () => {
    switch (sortBy) {
      case "predicted_price": return "Predicted Price";
      case "current_avg_price": return "Current Price";
      case "price_change_percent": return "Price Change %";
      case "vegetable": return "Crop Name";
      default: return "Predicted Price";
    }
  };

  const getOrderLabel = () => {
    return sortOrder === "asc" ? "Ascending" : "Descending";
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Green Container Header */}
          <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-6 w-6" />
                  <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
                </div>
                <p className="text-primary-foreground/90">
                  Predicted market demand and pricing for agricultural products
                </p>
              </div>
            </div>
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
          {/* Green Container Header */}
          <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-6 w-6" />
                  <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
                </div>
                <p className="text-primary-foreground/90">
                  Predicted market demand and pricing for agricultural products
                </p>
              </div>
            </div>
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
        {/* Green Container Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
              </div>
              <p className="text-primary-foreground/90">
                Predicted market demand and pricing for agricultural products in {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Market Demand Forecast</h1>
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {getMonthName(selectedMonth)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="grid grid-cols-3 gap-1 p-2">
                  {months.map((month) => (
                    <DropdownMenuItem
                      key={month}
                      onClick={() => handleMonthChange(month)}
                      className={month === selectedMonth ? "bg-accent" : ""}
                    >
                      {getMonthName(month).substring(0, 3)}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {selectedYear}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center justify-between p-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateYearRange('prev')}
                    disabled={yearRangeStart <= minForecastYear}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {yearRangeStart} - {yearRangeStart + 5}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateYearRange('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <DropdownMenuSeparator />
                <div className="grid grid-cols-3 gap-1 p-2">
                  {years.map((year) => (
                    <DropdownMenuItem
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={year === selectedYear ? "bg-accent" : ""}
                      disabled={year < minForecastYear}
                    >
                      {year}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  Sort: {getSortByLabel()} - {getOrderLabel()}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <Accordion 
                  type="single" 
                  collapsible 
                  value={openAccordion} 
                  onValueChange={handleAccordionChange}
                  className="w-full"
                >
                  <AccordionItem value="predicted-price" className="border-b-0">
                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-accent rounded-sm">
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Predicted Price
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <DropdownMenuItem onClick={() => handleSortChange("predicted_price", "asc")}>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("predicted_price", "desc")}>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Descending
                      </DropdownMenuItem>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <DropdownMenuSeparator />
                  
                  <AccordionItem value="current-price" className="border-b-0">
                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-accent rounded-sm">
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Current Price
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <DropdownMenuItem onClick={() => handleSortChange("current_avg_price", "asc")}>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("current_avg_price", "desc")}>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Descending
                      </DropdownMenuItem>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <DropdownMenuSeparator />
                  
                  <AccordionItem value="price-change" className="border-b-0">
                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-accent rounded-sm">
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Price Change %
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <DropdownMenuItem onClick={() => handleSortChange("price_change_percent", "asc")}>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("price_change_percent", "desc")}>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Descending
                      </DropdownMenuItem>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <DropdownMenuSeparator />
                  
                  <AccordionItem value="crop-name" className="border-b-0">
                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-accent rounded-sm">
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Crop Name
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <DropdownMenuItem onClick={() => handleSortChange("vegetable", "asc")}>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        A to Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange("vegetable", "desc")}>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Z to A
                      </DropdownMenuItem>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-card h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommended Crops for {getMonthName(selectedMonth)} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium mb-2">No market data available</p>
                    <p className="text-sm">
                      Try adjusting your filters or check back later for updated market forecasts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredData.map((crop, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{crop.vegetable}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getDemandLevelColor(crop.demand_level)}>
                                {crop.demand_level} demand
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">₱{crop.predicted_price.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">predicted price</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Current Avg. Price</div>
                            <div className="font-medium">₱{crop.current_avg_price.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Price Change</div>
                            <div className="font-medium flex items-center gap-1">
                              {getPriceChangeIcon(crop.price_change)}
                              {Math.abs(crop.price_change_percent).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Forecast Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-2xl font-bold text-primary">{getMonthName(selectedMonth)} {selectedYear}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Market predictions for this period
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Demand Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>High Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'high').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Moderate Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'moderate').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Stable Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'stable').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Low Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'low').length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Crops Analyzed</div>
                    <div className="text-2xl font-bold">{filteredData.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg. Price Change</div>
                    <div className="text-2xl font-bold">
                      {filteredData.length > 0 
                        ? `${(filteredData.reduce((sum, crop) => sum + crop.price_change_percent, 0) / filteredData.length).toFixed(2)}%` 
                        : '0.00%'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Best Opportunity</div>
                    <div className="font-medium">
                      {filteredData.length > 0 
                        ? filteredData.reduce((max, crop) => crop.price_change_percent > max.price_change_percent ? crop : max, filteredData[0]).vegetable
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDemand;
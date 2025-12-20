import { useState, useEffect, useMemo } from "react";
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
import { getCachedMarketDemandData, setCachedMarketDemandData } from "@/services/marketDemandMultiCacheService";

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
  const [selectedMonth, setSelectedMonth] = useState<number>(12); // Default to December
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to 2025

  // Debugging: Log initial state
  useEffect(() => {
    console.log('Component mounted with selectedMonth:', selectedMonth, 'selectedYear:', selectedYear);
    // Manually trigger fetch on mount to ensure it's called
    fetchMarketData();
  }, []);
  const [yearRangeStart, setYearRangeStart] = useState<number>(2025); // Start from 2025 instead of current year
  const [selectedDemandLevel, setSelectedDemandLevel] = useState<string | null>(null); // New state for demand level filtering
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const cropsPerPage = 10; // Number of crops per page

  // Generate month options based on selected year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  console.log(`Date info - currentMonth: ${currentMonth}, currentYear: ${currentYear}, currentDate: ${currentDate}`);

  // Set the minimum forecastable year to 2025 (the first year after our data ends in 2024)
  const minForecastYear = 2025;

  // For the current year, only show current month and future months
  // For future years, show all months
  // For past years (shouldn't happen with our restrictions), show no months
  const getAvailableMonths = () => {
    console.log(`getAvailableMonths called with selectedYear: ${selectedYear}, currentYear: ${currentYear}, currentMonth: ${currentMonth}`);
    if (selectedYear === currentYear) {
      // Only show current month and future months
      const result = Array.from({ length: 12 - currentMonth + 1 }, (_, i) => currentMonth + i);
      console.log(`Returning months for current year:`, result);
      return result;
    } else if (selectedYear > currentYear) {
      // For future years, show all months
      const result = Array.from({ length: 12 }, (_, i) => i + 1);
      console.log(`Returning months for future year:`, result);
      return result;
    } else {
      // For past years, show no months
      console.log(`Returning empty array for past year`);
      return [];
    }
  };

  // Effect to handle automatic month adjustment when year changes
  // Ensures that when switching to current year, past months are not retained
  useEffect(() => {
    const availableMonths = getAvailableMonths();
    
    // If we're on the current year and the selected month is not in available months
    // (meaning it's a past month), select the first available month (current or next month)
    if (selectedYear === currentYear && !availableMonths.includes(selectedMonth)) {
      // Select the first available month or current month if available
      const newMonth = availableMonths.length > 0 ? availableMonths[0] : currentMonth;
      setSelectedMonth(newMonth);
    }
    // For future years, we keep the selected month as all months are available
    // For past years (shouldn't happen), we don't need to adjust
  }, [selectedYear, currentYear, currentMonth, selectedMonth]);

  const months = useMemo(() => getAvailableMonths(), [selectedYear, currentYear, currentMonth]);
  console.log('months array:', months);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options based on range - start from 2025 (first forecastable year)
  const years = Array.from({ length: 6 }, (_, i) => Math.max(minForecastYear, yearRangeStart) + i);

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Add effect to handle loading timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading) {
      // Extended timeout to 90 seconds - long enough for any legitimate processing
      timeoutId = setTimeout(() => {
        // Only show timeout warning if we truly have no data
        if (marketData.length === 0) {
          setLoadingTimeout(true);
          // Continue loading instead of showing static error message
          // Keep error as null to maintain loading state
          setError(null);
        }
      }, 90000); // Extended to 90 seconds
    } else {
      setLoadingTimeout(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, marketData.length]);

  // Debugging: Log when marketData changes
  useEffect(() => {
    console.log('marketData state changed:', marketData.length, 'items');
  }, [marketData]);

  useEffect(() => {
    console.log('useEffect triggered - fetching market data');
    fetchMarketData();
  }, [selectedMonth, selectedYear, selectedDemandLevel]);

  useEffect(() => {
    console.log('Filtering useEffect triggered with marketData:', marketData.length, 'items');
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

    console.log('Setting filteredData with', result.length, 'items');
    setFilteredData(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, marketData, sortOrder, sortBy, selectedDemandLevel]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      console.log(`Fetching market data for ${selectedMonth}/${selectedYear}`);
      console.log(`Current state - selectedMonth: ${selectedMonth}, selectedYear: ${selectedYear}, selectedDemandLevel: ${selectedDemandLevel}`);

      // Create a unique cache key based on parameters
      const cacheKey = `marketData_${selectedMonth}_${selectedYear}_${selectedDemandLevel || 'all'}`;

      // Check if we have cached data for these parameters
      const cachedData = getCachedMarketDemandData(cacheKey);
      if (cachedData) {
        console.log('Using cached market data');
        // Even for cached data, show loading animation for a short time to maintain consistent UX
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms loading animation
        setMarketData(cachedData.data);
        setLoading(false);
        return;
      }

      // Use environment variable for backend URL or default to localhost
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      // Simplified approach - always fetch fresh data for current month
      // Include month, year, and demand_level parameters in the API call
      // Request all crops instead of just 20
      let url = `${BACKEND_URL}/vegetables/recommend-crops?top_n=1000&month=${selectedMonth}&year=${selectedYear}`;
      if (selectedDemandLevel) {
        url += `&demand_level=${selectedDemandLevel}`;
      }

      console.log(`Making request to: ${url}`);
      // Extended timeout for comprehensive processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log(`Response status: ${response.status}, ok: ${response.ok}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market demand data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      const marketData = data.recommended_crops || [];
      console.log('Processed marketData:', marketData);
      console.log('Processed marketData length:', marketData.length);

      // Cache the data with the specific parameters
      setCachedMarketDemandData({ data: marketData }, cacheKey);

      console.log('About to set marketData state with', marketData.length, 'items');
      setMarketData([...marketData]); // Force a new array reference
      console.log('Set marketData state completed');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Continue loading instead of showing static error message
        // But only if we truly have no data
        if (marketData.length === 0) {
          setError(null);
        }
      } else {
        // Keep showing loading state instead of error for better UX
        if (marketData.length === 0) {
          setError(null);
        }
        console.error("Error fetching market data:", err);
      }
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
    // Allow selection of the current year (2025) and future years
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
      case "high": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "moderate": return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "stable": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "low": return "bg-red-100 text-red-800 hover:bg-red-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mr-4"></div>
                <div>
                  <p className="text-lg font-medium">Analyzing market trends and generating forecasts...</p>
                  <p className="text-sm text-muted-foreground mt-1">Our AI is processing market data. This usually takes just a few seconds.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {loadingTimeout && (
            <Card className="shadow-card border-warning">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Processing market demand forecasts</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Our AI is still analyzing market data to provide accurate forecasts. This may take up to 30 seconds for the first visit.
                </p>
              </CardContent>
            </Card>
          )}
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

          <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 w-full">
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
                  <Button variant="outline" size="sm" className="flex items-center gap-2 w-full">
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
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2 w-full sm:w-auto">
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
              <div className="flex-grow flex flex-col">
                <CardContent className="flex-grow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
                  {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mb-4" />
                      <p className="text-lg font-medium mb-2">No market data available</p>
                      <p className="text-sm">
                        Try adjusting your filters or check back later for updated market forecasts.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-0">
                      {filteredData.slice((currentPage - 1) * cropsPerPage, currentPage * cropsPerPage).map((crop, index) => (
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
                              <div className="text-xs text-muted-foreground mt-1 font-bold">
                                ₱{(crop.predicted_price * 0.9).toFixed(2)} - ₱{(crop.predicted_price * 1.1).toFixed(2)}
                              </div>
                              <div className="text-sm text-muted-foreground">Est. Predicted Price</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Est. Seasonal Avg. Price</div>
                              <div className="font-medium">₱{crop.current_avg_price.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Est. Price Change</div>
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

                {/* Pagination Controls */}
                {filteredData.length > cropsPerPage && (
                  <div className="border-t pt-4 px-4 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="text-sm text-muted-foreground md:text-left text-center">
                        Showing {(currentPage - 1) * cropsPerPage + 1} to {Math.min(currentPage * cropsPerPage, filteredData.length)} of {filteredData.length} crops
                      </div>
                      <div className="flex flex-nowrap justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 px-3 text-sm flex-shrink-0"
                        >
                          <span className="hidden sm:inline">Previous</span>
                          <ChevronLeft className="h-4 w-4 sm:hidden" />
                        </Button>

                        {/* Page Number Buttons */}
                        {(() => {
                          const totalPages = Math.ceil(filteredData.length / cropsPerPage);
                          const pageButtons = [];

                          // Always show first page
                          pageButtons.push(
                            <Button
                              key={1}
                              variant={currentPage === 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              className={`h-8 w-8 p-0 text-sm flex-shrink-0 ${currentPage === 1 ? "bg-primary text-primary-foreground" : ""}`}
                            >
                              1
                            </Button>
                          );

                          // Show ellipsis if there are pages between first and current range
                          if (currentPage > 3) {
                            pageButtons.push(
                              <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm flex-shrink-0">⋯</span>
                            );
                          }

                          // Show pages around current page (max 3 pages)
                          let startPage = Math.max(2, currentPage - 1);
                          let endPage = Math.min(totalPages - 1, currentPage + 1);

                          // Adjust if we're near the beginning or end
                          if (currentPage <= 3) {
                            endPage = Math.min(totalPages - 1, 4);
                          }
                          if (currentPage >= totalPages - 2) {
                            startPage = Math.max(2, totalPages - 3);
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pageButtons.push(
                              <Button
                                key={i}
                                variant={currentPage === i ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(i)}
                                className={`h-8 w-8 p-0 text-sm flex-shrink-0 ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                              >
                                {i}
                              </Button>
                            );
                          }

                          // Show ellipsis if there are pages between current range and last
                          if (currentPage < totalPages - 2) {
                            pageButtons.push(
                              <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm flex-shrink-0">⋯</span>
                            );
                          }

                          // Always show last page if there's more than one page
                          if (totalPages > 1) {
                            pageButtons.push(
                              <Button
                                key={totalPages}
                                variant={currentPage === totalPages ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className={`h-8 w-8 p-0 text-sm flex-shrink-0 ${currentPage === totalPages ? "bg-primary text-primary-foreground" : ""}`}
                              >
                                {totalPages}
                              </Button>
                            );
                          }

                          return pageButtons;
                        })()}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData.length / cropsPerPage)))}
                          disabled={currentPage === Math.ceil(filteredData.length / cropsPerPage)}
                          className="h-8 px-3 text-sm flex-shrink-0"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4 sm:hidden" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                    Est. market predictions for this period
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
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'high').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Moderate Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'moderate').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Stable Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                      {filteredData.filter(crop => crop.demand_level.toLowerCase() === 'stable').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Low Demand</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
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
                    <div className="text-sm text-muted-foreground">Est. Avg. Price Change</div>
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

        {/* Disclaimer */}
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
          <p className="text-sm">
            <strong>Note:</strong> These forecasts are based on crops planted in Majayjay, Laguna, and historical data from previous years, processed by our AI model to generate market demand predictions.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDemand;
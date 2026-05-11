/**
 * Admin Market Demand Management Page
 * Allows admin to view and override crop prices for Market Demand Forecast
 * Crops are fetched from the same API as farmer side, and price overrides sync to farmer accounts
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, DollarSign, Edit3, Save, X, Loader2, Calendar, AlertTriangle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCachedMarketDemandData, setCachedMarketDemandData } from "@/services/marketDemandMultiCacheService";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db, getDbWhenReady, isFirebaseReady } from "@/firebaseConfig";

interface CropPrice {
  vegetable: string;
  predicted_price: number;
  current_avg_price: number;
  price_change: number;
  price_change_percent: number;
  demand_level: string;
  admin_override_price?: number;
}

const AdminMarketDemand = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropPrices, setCropPrices] = useState<CropPrice[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<CropPrice[]>([]);
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Only use current month and year - no selection needed
  const currentDate = new Date();
  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear = currentDate.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    loadCropPrices();
  }, []); // Only load once, no dependencies

  useEffect(() => {
    let result = [...cropPrices];
    if (searchTerm) {
      result = result.filter(crop =>
        crop.vegetable.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result.sort((a, b) => b.predicted_price - a.predicted_price);
    setFilteredCrops(result);
  }, [cropPrices, searchTerm]);

  const loadCropPrices = async () => {
    setLoading(true);
    try {
      // Fetch crops from the same API as farmer side
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      const apiUrl = isDevelopment 
        ? `/vegetables/recommend-crops?top_n=1000&month=${selectedMonth}&year=${selectedYear}`
        : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/vegetables/recommend-crops?top_n=1000&month=${selectedMonth}&year=${selectedYear}`;

      console.log(`[Admin Market Demand] Fetching market data for ${monthNames[selectedMonth - 1]} ${selectedYear}`);
      console.log(`[Admin Market Demand] API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      console.log(`[Admin Market Demand] Response status: ${response.status}, ok: ${response.ok}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch market demand data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Admin Market Demand] Received data:`, data);
      
      const marketData = data.recommended_crops || [];
      console.log(`[Admin Market Demand] Processed marketData length: ${marketData.length}`);
      
      // Log first 3 crops to debug
      if (marketData.length > 0) {
        console.log('[Admin Market Demand] Sample API data (first 3 crops):', marketData.slice(0, 3));
        console.log('[Admin Market Demand] First crop predicted_price (raw):', marketData[0].predicted_price);
        console.log('[Admin Market Demand] First crop predicted_price (toFixed):', marketData[0].predicted_price.toFixed(2));
      }

      if (marketData.length === 0) {
        toast({
          title: "No Data Available",
          description: `No market forecast data available for ${monthNames[selectedMonth - 1]} ${selectedYear}. The AI model may not have predictions for this period yet.`,
          variant: "destructive"
        });
        setCropPrices([]);
        return;
      }

      // Load admin price overrides from Firebase (handle permissions gracefully)
      let overridesMap: Record<string, number> = {};
      
      try {
        let firestoreDb;
        if (!isFirebaseReady()) {
          firestoreDb = await getDbWhenReady();
        } else {
          firestoreDb = db;
        }

        console.log(`[Admin Market Demand] Loading admin price overrides...`);
        
        const priceOverridesRef = collection(firestoreDb, "adminPriceOverrides");
        const q = query(priceOverridesRef, where("month", "==", selectedMonth), where("year", "==", selectedYear));
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          overridesMap[data.vegetable] = data.overridePrice;
        });

        console.log(`[Admin Market Demand] Loaded ${Object.keys(overridesMap).length} price overrides`);
      } catch (firebaseError: any) {
        console.warn(`[Admin Market Demand] Firebase not accessible, using default prices:`, firebaseError.message);
        // Continue with empty overrides - will use API prices
      }

      // Merge API data with admin overrides
      const cropsWithOverrides: CropPrice[] = marketData.map((crop: any) => ({
        vegetable: crop.vegetable,
        predicted_price: overridesMap[crop.vegetable] || crop.predicted_price, // USE override if exists
        current_avg_price: crop.current_avg_price, // Seasonal average (for reference only)
        price_change: crop.price_change,
        price_change_percent: crop.price_change_percent,
        demand_level: crop.demand_level,
        admin_override_price: overridesMap[crop.vegetable] // Override applies to predicted_price
      }));

      console.log(`[Admin Market Demand] Final crops with overrides: ${cropsWithOverrides.length}`);
      
      // IMPORTANT: Cache the ORIGINAL API data (not overrides) for farmer side
      // The farmer side will apply overrides from Firebase separately
      const cacheKey = `marketData_${selectedMonth}_${selectedYear}_all`;
      setCachedMarketDemandData({ data: marketData }, cacheKey);
      console.log(`[Admin Market Demand] Cached API data for farmer side to use`);
      
      setCropPrices(cropsWithOverrides);
      toast({
        title: "Success",
        description: `Loaded ${cropsWithOverrides.length} crops for ${monthNames[selectedMonth - 1]} ${selectedYear}`,
      });
    } catch (error: any) {
      console.error('[Admin Market Demand] Error loading crop prices:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load crop prices. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = (vegetable: string, currentPrice: number) => {
    setEditingCrop(vegetable);
    setEditPrice(currentPrice); // This will edit the predicted_price
  };

  const handleCancelEdit = () => {
    setEditingCrop(null);
    setEditPrice(0);
  };

  const handleSavePrice = async (vegetable: string) => {
    if (editPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      let firestoreDb;
      if (!isFirebaseReady()) {
        firestoreDb = await getDbWhenReady();
      } else {
        firestoreDb = db;
      }

      // Save price override to Firebase (overrides predicted_price)
      const overrideRef = doc(firestoreDb, "adminPriceOverrides", `${vegetable}_${selectedMonth}_${selectedYear}`);
      await setDoc(overrideRef, {
        vegetable,
        month: selectedMonth,
        year: selectedYear,
        overridePrice: editPrice, // Admin override for predicted_price
        originalPredictedPrice: cropPrices.find(c => c.vegetable === vegetable)?.predicted_price || editPrice,
        originalSeasonalAvgPrice: cropPrices.find(c => c.vegetable === vegetable)?.current_avg_price,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      });

      // Update local state (override the predicted_price)
      setCropPrices(prev => prev.map(crop => 
        crop.vegetable === vegetable 
          ? { ...crop, predicted_price: editPrice, admin_override_price: editPrice }
          : crop
      ));

      toast({
        title: "Success",
        description: `Price for ${vegetable} updated to ₱${editPrice.toFixed(2)}/kg`,
      });

      handleCancelEdit();
    } catch (error: any) {
      console.error('[Admin Market Demand] Error saving crop price:', error);
      toast({
        title: "Permission Error",
        description: "Cannot save price override. Please ensure Firebase permissions are configured. Error: " + (error.message || "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getDemandLevelColor = (demand: string) => {
    switch (demand.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-blue-100 text-blue-800';
      case 'stable': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <span className="text-red-500">↓</span>;
    return <span className="text-gray-500">→</span>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading market demand data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="bg-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin#reports')} 
                className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Market Demand Forecast - Admin</h1>
              </div>
              <p className="text-white/90">
                Override crop prices for {monthNames[selectedMonth - 1]} {selectedYear}. Changes sync to farmer accounts.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={loadCropPrices} 
                className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Crops</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cropPrices.length}</div>
              <p className="text-xs text-muted-foreground">Forecasted crops</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Demand</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {cropPrices.filter(c => c.demand_level === 'High').length}
              </div>
              <p className="text-xs text-muted-foreground">High demand crops</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₱{(cropPrices.reduce((sum, c) => sum + c.current_avg_price, 0) / (cropPrices.length || 1)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Per kg average</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium text-muted-foreground">
            Forecast Period: <span className="font-bold text-foreground">{monthNames[selectedMonth - 1]} {selectedYear}</span>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search crops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Crop Prices Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Crop Price Override Management</CardTitle>
            <CardDescription>
              Override AI-predicted prices with admin-adjusted prices. Your changes will automatically sync to all farmer accounts.
              {filteredCrops.some(c => c.admin_override_price) && (
                <span className="block mt-1 text-blue-600 font-medium">
                  * {filteredCrops.filter(c => c.admin_override_price).length} crop(s) have admin price overrides
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCrops.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No crops found for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Crop Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">AI Predicted Price (₱/kg)</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Demand Level</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Price Change</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCrops.map((crop) => (
                      <tr key={crop.vegetable} className={`border-b transition-colors ${crop.admin_override_price ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                        <td className="py-3 px-4 font-medium">{crop.vegetable}</td>
                        <td className="py-3 px-4">
                          {editingCrop === crop.vegetable ? (
                            <Input
                              type="number"
                              value={editPrice.toFixed(2)}
                              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                              className="w-32"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          ) : (
                            <span className={`text-lg font-semibold ${crop.admin_override_price ? 'text-blue-600' : ''}`}>
                              ₱{crop.predicted_price.toFixed(2)}
                              {crop.admin_override_price && (
                                <Badge variant="outline" className="ml-2 text-xs">Override</Badge>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getDemandLevelColor(crop.demand_level)}>
                            {crop.demand_level}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(crop.price_change)}
                            <span className={crop.price_change_percent > 0 ? 'text-green-600' : crop.price_change_percent < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {Math.abs(crop.price_change_percent).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {editingCrop === crop.vegetable ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSavePrice(crop.vegetable)}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPrice(crop.vegetable, crop.predicted_price)}
                              className="hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit Price
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
          <p className="text-sm text-warning">
            <strong>Admin Note:</strong> Price overrides apply only to the selected month and year. The farmer-side Market Demand Forecast will use your overridden prices instead of the AI-predicted current average prices.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminMarketDemand;

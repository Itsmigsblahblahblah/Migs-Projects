import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Leaf,
    MapPin,
    Calendar,
    TrendingUp,
    Scale,
    Sprout,
    Package,
    CheckCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getCropInsights } from "@/services/cropDataService";

interface AdminCropViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    crop: {
        id: string;
        name: string;
        landArea: number;
        soilType: string;
        puhunan: number;
        plantedDate: any;
        status: string;
        adminData?: any;
    } | null;
}

const AdminCropViewDialog = ({ open, onOpenChange, crop }: AdminCropViewDialogProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [salesForecastData, setSalesForecastData] = useState<any[]>([]);
    const [displayData, setDisplayData] = useState({
        marketPrice: 0,
        suggestedCapital: 0,
        estimatedYield: 0,
        potentialRevenue: 0,
        netProfit: 0
    });

    // Format timestamp
    const formatTimestamp = (timestamp: any) => {
        try {
            if (typeof timestamp === 'string') {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            }
            if (timestamp?.toDate) {
                return timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            if (timestamp instanceof Date) {
                return timestamp.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            return 'Unknown date';
        } catch {
            return 'Unknown date';
        }
    };

    // Calculate harvest date
    const calculateHarvestDate = (plantedDate: any, cropName: string) => {
        try {
            let planted: Date;
            if (typeof plantedDate === 'string') {
                planted = new Date(plantedDate);
            } else if (plantedDate?.toDate) {
                planted = plantedDate.toDate();
            } else if (plantedDate instanceof Date) {
                planted = plantedDate;
            } else {
                return 'Unknown date';
            }

            if (isNaN(planted.getTime())) {
                return 'Unknown date';
            }

            let daysToHarvest = 90;
            const name = cropName.toLowerCase();
            if (name.includes("rice")) daysToHarvest = 120;
            else if (name.includes("corn")) daysToHarvest = 100;
            else if (name.includes("tomato")) daysToHarvest = 70;
            else if (name.includes("eggplant") || name.includes("talong")) daysToHarvest = 75;
            else if (name.includes("pechay")) daysToHarvest = 45;
            else if (name.includes("mustard")) daysToHarvest = 40;
            else if (name.includes("kangkong")) daysToHarvest = 30;
            else if (name.includes("squash")) daysToHarvest = 60;
            else if (name.includes("melon")) daysToHarvest = 80;
            else if (name.includes("watermelon")) daysToHarvest = 90;
            else if (name.includes("cucumber")) daysToHarvest = 60;
            else if (name.includes("okra")) daysToHarvest = 60;
            else if (name.includes("sitaw")) daysToHarvest = 60;
            else if (name.includes("patani")) daysToHarvest = 60;
            else if (name.includes("ampalaya")) daysToHarvest = 70;
            else if (name.includes("labanos")) daysToHarvest = 30;

            const harvestDate = new Date(planted);
            harvestDate.setDate(harvestDate.getDate() + daysToHarvest);

            return harvestDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Unknown date';
        }
    };

    // Fetch insights for sales forecast
    useEffect(() => {
        const fetchInsights = async () => {
            if (!crop) return;
            
            try {
                setLoading(true);
                const cropInsights = await getCropInsights(
                    crop.name,
                    crop.soilType,
                    crop.landArea,
                    crop.puhunan
                );

                setInsights(cropInsights);

                // Generate sales forecast data
                // If admin has edited data, use admin values; otherwise use system values
                // This ensures admin edits are reflected in the forecast
                const userInvestment = Number(crop.puhunan) || 0;
                
                // Use admin-edited market price if available, otherwise use system
                const marketPrice = hasAdminData && crop.adminData.marketPrice > 0
                    ? crop.adminData.marketPrice  // Admin-edited value
                    : ((cropInsights?.profit?.averageMarketPrice !== undefined && cropInsights?.profit?.averageMarketPrice > 0)
                        ? cropInsights?.profit?.averageMarketPrice  // System value
                        : (cropInsights?.market?.averagePrice || 0));  // Fallback
                
                // Use admin-edited suggested capital if available, otherwise use system
                const suggestedCapital = hasAdminData && crop.adminData.suggestedCapital > 0
                    ? crop.adminData.suggestedCapital  // Admin-edited value
                    : (cropInsights?.profit?.suggestedCapital || 0);  // System value
                
                // Calculate estimated yield based on investment vs suggested capital
                // SAME LOGIC as farmer side - use different baseYield calculation depending on data source
                let baseYield: number;
                
                if (hasAdminData) {
                    // When admin data exists, use land area * 2000 (same as farmer side)
                    baseYield = crop.landArea * 2000;
                } else {
                    // When no admin data, use system estimated yield
                    baseYield = cropInsights?.profit?.estimatedYield || 0;
                }
                
                const estimatedYield = userInvestment === 0 ? 0 
                    : baseYield * (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 
                        ? 1 
                        : (userInvestment / suggestedCapital));
                
                // Calculate potential revenue
                const potentialRevenue = estimatedYield * marketPrice;
                
                // Calculate net profit
                const netProfitCalc = userInvestment === 0 ? 0 : potentialRevenue - userInvestment;
                
                console.log('Sales Forecast Calculation:', {
                    hasAdminData,
                    userInvestment,
                    marketPrice: { 
                        admin: crop.adminData?.marketPrice, 
                        system: cropInsights?.profit?.averageMarketPrice, 
                        used: marketPrice 
                    },
                    suggestedCapital: { 
                        admin: crop.adminData?.suggestedCapital, 
                        system: cropInsights?.profit?.suggestedCapital, 
                        used: suggestedCapital 
                    },
                    baseYield,
                    estimatedYield,
                    potentialRevenue,
                    netProfit: netProfitCalc
                });
                
                // Update display data with calculated values
                setDisplayData({
                    marketPrice,
                    suggestedCapital,
                    estimatedYield,
                    potentialRevenue,
                    netProfit: netProfitCalc
                });

                const forecastData = [
                    {
                        stage: "Planting",
                        puhunan: userInvestment * 0.40, // 40% of investment in planting stage
                        grossSales: 0,
                        netProfit: -(userInvestment * 0.40) // Loss equal to planting investment
                    },
                    {
                        stage: "Growth",
                        puhunan: userInvestment * 0.45, // 45% of investment in growth stage
                        grossSales: potentialRevenue * 0.5, // 50% of potential revenue
                        netProfit: (potentialRevenue * 0.5) - (userInvestment * 0.85) // Revenue minus cumulative investment (40% + 45%)
                    },
                    {
                        stage: "Harvest",
                        puhunan: userInvestment * 0.15, // 15% of investment in harvest stage
                        grossSales: potentialRevenue, // 100% of potential revenue
                        netProfit: netProfitCalc // Final net profit
                    }
                ];

                setSalesForecastData(forecastData);
            } catch (error) {
                console.error("Error fetching crop insights:", error);
            } finally {
                setLoading(false);
            }
        };

        if (crop && open) {
            fetchInsights();
        }
    }, [crop, open]);

    if (!crop) return null;

    // Debug logging
    console.log('Crop data in View Dialog:', crop);
    console.log('Admin data:', crop.adminData);

    const hasAdminData = crop.adminData && crop.adminData.marketPrice && crop.adminData.marketPrice > 0;
    const userInvestment = Number(crop.puhunan) || 0;
    const roi = userInvestment > 0 ? ((displayData.netProfit / userInvestment) * 100).toFixed(1) : '0.0';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-green-600" />
                        Crop Details - {crop.name}
                    </DialogTitle>
                    <DialogDescription>
                        Read-only view of crop information, fertilizer recommendations, and sales forecast
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Section 1: Crop Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sprout className="h-5 w-5 text-green-600" />
                            Crop Information
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                            <div>
                                <p className="text-sm text-muted-foreground">Crop Name</p>
                                <p className="font-semibold">{crop.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge variant={crop.status === 'post-harvest' ? 'default' : 'secondary'}>
                                    {crop.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Land Area</p>
                                <p className="font-semibold">{crop.landArea} hectares</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Soil Type</p>
                                <p className="font-semibold">{crop.soilType}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Investment (Puhunan)</p>
                                <p className="font-semibold">₱{crop.puhunan.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Planted Date</p>
                                <p className="font-semibold">{formatTimestamp(crop.plantedDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Est. Harvest Date</p>
                                <p className="font-semibold">{calculateHarvestDate(crop.plantedDate, crop.name)}</p>
                            </div>
                        </div>

                        {/* System-Generated Market Data */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-sm text-blue-800 mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                System-Generated Market Data
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-blue-600 mb-1">Est. Market Price (System)</p>
                                    <p className="font-semibold text-blue-900">
                                        {insights?.profit?.averageMarketPrice ? `₱${insights.profit.averageMarketPrice.toFixed(2)} /kg` : 'Calculating...'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 mb-1">Suggested Capital (System)</p>
                                    <p className="font-semibold text-blue-900">
                                        {insights?.profit?.suggestedCapital ? `₱${insights.profit.suggestedCapital.toLocaleString()}` : 'Calculating...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Admin-Entered Data (if available) */}
                        {hasAdminData && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-sm text-green-800 mb-3 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Admin-Entered Data (Overrides System)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-green-600 mb-1">Market Price (Admin)</p>
                                        <p className="font-semibold text-green-900">₱{crop.adminData.marketPrice.toFixed(2)} /kg</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-green-600 mb-1">Suggested Capital (Admin)</p>
                                        <p className="font-semibold text-green-900">₱{crop.adminData.suggestedCapital.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Section 2: Fertilizer Recommendations */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Scale className="h-5 w-5 text-blue-600" />
                            Fertilizer Recommendations
                            {hasAdminData && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Admin Verified
                                </Badge>
                            )}
                        </h3>

                        {hasAdminData && crop.adminData.fertilizerRecommendations ? (
                            // Show admin fertilizer recommendations
                            <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-lg border-2 border-gray-200 overflow-hidden">
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full p-4 hover:bg-white/50 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-base text-gray-800">NPK Fertilizer Summary</h4>
                                        {isExpanded ? (
                                            <ChevronUp className="h-5 w-5 text-gray-600" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-600" />
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Nitrogen */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-green-700 uppercase">Nitrogen (N)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.nitrogen?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.nitrogen?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.nitrogen.amount}
                                                </p>
                                            )}
                                        </div>

                                        {/* Phosphorus */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-blue-700 uppercase">Phosphorus (P)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.phosphorus?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.phosphorus?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.phosphorus.amount}
                                                </p>
                                            )}
                                        </div>

                                        {/* Potassium */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-purple-700 uppercase">Potassium (K)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.potassium?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.potassium?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.potassium.amount}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-4 space-y-4 border-t-2 border-gray-200 bg-white">
                                        {/* Nitrogen Details */}
                                        <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                                            <div className="bg-green-600 text-white px-3 py-2">
                                                <h5 className="font-bold text-sm">Nitrogen (N) - Full Details</h5>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.amount && (
                                                    <div className="bg-green-50 rounded-md p-2 border border-green-200">
                                                        <p className="text-xs font-semibold text-green-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-green-900">{crop.adminData.fertilizerRecommendations.nitrogen.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-green-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.nitrogen.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-green-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.nitrogen.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phosphorus Details */}
                                        <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                                            <div className="bg-blue-600 text-white px-3 py-2">
                                                <h5 className="font-bold text-sm">Phosphorus (P) - Full Details</h5>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.amount && (
                                                    <div className="bg-blue-50 rounded-md p-2 border border-blue-200">
                                                        <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-blue-900">{crop.adminData.fertilizerRecommendations.phosphorus.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.phosphorus.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-blue-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.phosphorus.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Potassium Details */}
                                        <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                                            <div className="bg-purple-600 text-white px-3 py-2">
                                                <h5 className="font-bold text-sm">Potassium (K) - Full Details</h5>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.potassium?.amount && (
                                                    <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
                                                        <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-purple-900">{crop.adminData.fertilizerRecommendations.potassium.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.potassium?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.potassium.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-purple-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.potassium?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.potassium.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Show system-generated AI fertilizer recommendations
                            insights?.fertilizer?.detailedRecommendations ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-700 mb-2">
                                            <strong>System-Generated Recommendations</strong> - These AI-based recommendations will be shown to the farmer until you edit them.
                                        </p>
                                    </div>

                                    {/* Nitrogen */}
                                    <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                                        <div className="bg-green-600 text-white px-3 py-2">
                                            <h5 className="font-bold text-sm">Nitrogen (N) - Level: {insights.fertilizer.detailedRecommendations.nitrogen.level}</h5>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {insights.fertilizer.detailedRecommendations.nitrogen.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                    <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.nitrogen.detailedInfo}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.nitrogen.amount && (
                                                <div className="bg-green-50 rounded-md p-2 border border-green-200">
                                                    <p className="text-xs font-semibold text-green-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                    <p className="text-xs text-green-900">{insights.fertilizer.detailedRecommendations.nitrogen.amount}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.nitrogen.recommendations?.length > 0 && (
                                                <ul className="space-y-1">
                                                    {insights.fertilizer.detailedRecommendations.nitrogen.recommendations.map((rec: string, index: number) => (
                                                        <li key={index} className="flex items-start gap-1 text-xs">
                                                            <span className="text-green-600 font-bold">•</span>
                                                            <span className="text-gray-700">{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Phosphorus */}
                                    <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-600 text-white px-3 py-2">
                                            <h5 className="font-bold text-sm">Phosphorus (P) - Level: {insights.fertilizer.detailedRecommendations.phosphorus.level}</h5>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {insights.fertilizer.detailedRecommendations.phosphorus.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                    <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.phosphorus.detailedInfo}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.phosphorus.amount && (
                                                <div className="bg-blue-50 rounded-md p-2 border border-blue-200">
                                                    <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                    <p className="text-xs text-blue-900">{insights.fertilizer.detailedRecommendations.phosphorus.amount}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.phosphorus.recommendations?.length > 0 && (
                                                <ul className="space-y-1">
                                                    {insights.fertilizer.detailedRecommendations.phosphorus.recommendations.map((rec: string, index: number) => (
                                                        <li key={index} className="flex items-start gap-1 text-xs">
                                                            <span className="text-blue-600 font-bold">•</span>
                                                            <span className="text-gray-700">{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Potassium */}
                                    <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                                        <div className="bg-purple-600 text-white px-3 py-2">
                                            <h5 className="font-bold text-sm">Potassium (K) - Level: {insights.fertilizer.detailedRecommendations.potassium.level}</h5>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {insights.fertilizer.detailedRecommendations.potassium.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                    <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.potassium.detailedInfo}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.potassium.amount && (
                                                <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
                                                    <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                    <p className="text-xs text-purple-900">{insights.fertilizer.detailedRecommendations.potassium.amount}</p>
                                                </div>
                                            )}
                                            {insights.fertilizer.detailedRecommendations.potassium.recommendations?.length > 0 && (
                                                <ul className="space-y-1">
                                                    {insights.fertilizer.detailedRecommendations.potassium.recommendations.map((rec: string, index: number) => (
                                                        <li key={index} className="flex items-start gap-1 text-xs">
                                                            <span className="text-purple-600 font-bold">•</span>
                                                            <span className="text-gray-700">{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* General Recommendations */}
                                    {insights.fertilizer.recommendations && insights.fertilizer.recommendations.length > 0 && (
                                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <h5 className="font-bold text-sm mb-2 text-yellow-800">General Recommendations</h5>
                                            <ul className="space-y-1">
                                                {insights.fertilizer.recommendations.map((rec: string, index: number) => (
                                                    <li key={index} className="flex items-start gap-1 text-xs">
                                                        <span className="text-yellow-600 font-bold">•</span>
                                                        <span className="text-gray-700">{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-muted/50 rounded-lg border">
                                    <p className="text-sm text-muted-foreground text-center">
                                        No fertilizer recommendations available.
                                    </p>
                                </div>
                            )
                        )}
                    </div>

                    <Separator />

                    {/* Section 3: Sales Forecast */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                            Sales Forecast
                        </h3>

                        {loading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-2 text-sm text-muted-foreground">Loading forecast data...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Summary Cards - Same as farmer side */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Total Investment */}
                                    <div className="p-4 bg-red-500/10 rounded-lg border border-red-500">
                                        <p className="text-sm text-muted-foreground mb-1">Est. Investment</p>
                                        <p className="text-xl font-bold text-red-500">₱{userInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs mt-2 text-muted-foreground">This is the money you spend to plant and grow your {crop.name}</p>
                                    </div>

                                    {/* Suggested Capital */}
                                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500">
                                        <p className="text-sm text-muted-foreground mb-1">Est. Suggested Capital</p>
                                        <p className="text-xl font-bold text-yellow-500">₱{displayData.suggestedCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        {userInvestment < displayData.suggestedCapital && (
                                            <p className="text-xs mt-2 text-destructive">
                                                You need ₱{(displayData.suggestedCapital - userInvestment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more for optimal results
                                            </p>
                                        )}
                                        <p className="text-xs mt-2 text-muted-foreground">This is the minimum money needed to successfully grow your {crop.name}</p>
                                    </div>

                                    {/* Est. Yield Harvest */}
                                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500">
                                        <p className="text-sm text-muted-foreground mb-1">Est. Yield Harvest</p>
                                        <p className="text-xl font-bold text-green-500">{displayData.estimatedYield.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</p>
                                        <p className="text-xs mt-2 text-muted-foreground">This is your est. yield harvest</p>
                                    </div>

                                    {/* Est. Profit */}
                                    <div className={`p-4 rounded-lg border ${displayData.netProfit >= 0 ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive'}`}>
                                        <p className="text-sm text-muted-foreground mb-1">Your Est. Profit</p>
                                        <p className={`text-xl font-bold ${displayData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            ₱{displayData.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs mt-2 text-muted-foreground">
                                            {displayData.netProfit >= 0 
                                                ? "This is your est. expected profit after all expenses"
                                                : "You might lose money. Consider adjusting your approach."}
                                        </p>
                                    </div>
                                </div>

                                {/* ROI Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-500/5 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="h-5 w-5 text-green-500" />
                                            <p className="font-bold">What Affects Your Earnings</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-sm">Current Market Price</span>
                                                <span className="font-medium">₱{displayData.marketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-sm">Est. Price Direction</span>
                                                <span className="font-medium capitalize">{insights?.market?.trend || 'Stable'}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-3">
                                                <p>Higher prices mean more earnings. Watch for seasonal changes in prices.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-green-500/5 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sprout className="h-5 w-5 text-green-500" />
                                            <p className="font-bold">Understanding Your Est. Profit</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-sm">
                                                    {displayData.netProfit >= 0 ? "Est. Profit Percentage" : "Est. Loss Percentage"}
                                                </span>
                                                <span className="font-medium">
                                                    {userInvestment > 0 ? Math.min(((displayData.netProfit / userInvestment) * 100), 100).toFixed(1) : '0.0'}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b">
                                                <span className="text-sm">
                                                    {displayData.netProfit >= 0 ? "Est. Profit Status" : "Est. Loss Status"}
                                                </span>
                                                <span className={`font-medium ${displayData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {displayData.netProfit >= 0 ? "Profitable" : "Not Profitable"}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-3">
                                                <p>
                                                    {displayData.netProfit >= 0
                                                        ? "Good! Your crop is expected to make money."
                                                        : "Be careful. You might lose money with current conditions."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stage Breakdown - Investment & Revenue by Stage */}
                                <div className="p-4 bg-muted/30 rounded-lg border">
                                    <h4 className="font-semibold mb-3">Investment & Revenue by Stage</h4>
                                    <div className="space-y-2">
                                        {salesForecastData.map((stage, index) => (
                                            <div key={index} className="p-3 bg-white rounded-md border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm">{stage.stage}</span>
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <p className="text-muted-foreground">Investment</p>
                                                        <p className="font-semibold text-red-600">₱{stage.puhunan.toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Revenue</p>
                                                        <p className="font-semibold text-yellow-600">₱{stage.grossSales.toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Net</p>
                                                        <p className={`font-semibold ${stage.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            ₱{stage.netProfit.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AdminCropViewDialog;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, MapPin, Wheat, Droplets, TrendingUpIcon, Calendar, Sprout, Banknote, Scale, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getCropInsights } from "@/services/cropDataService";
import InfoTooltip from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface EnhancedCropInfoCardProps {
    crop: any;
}

const EnhancedCropInfoCard = ({ crop }: EnhancedCropInfoCardProps) => {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Check if admin data exists
    const hasAdminData = crop.adminData && crop.adminData.marketPrice;

    useEffect(() => {
        // Only fetch insights if there's no admin data
        if (!hasAdminData) {
            const fetchInsights = async () => {
                try {
                    setLoading(true);
                    // The getCropInsights function now handles caching automatically
                    // It checks localStorage cache first (2 hour expiry), then memory cache, then API
                    const cropInsights = await getCropInsights(
                        crop.name,
                        crop.soilType,
                        crop.landArea,
                        crop.puhunan
                    );
                    setInsights(cropInsights);
                } catch (error) {
                    console.error("Error fetching crop insights:", error);
                } finally {
                    setLoading(false);
                }
            };

            if (crop) {
                fetchInsights();
            }
        } else {
            setLoading(false);
        }
    }, [crop.name, crop.soilType, crop.landArea, crop.puhunan, hasAdminData]);

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'decreasing':
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'increasing':
                return 'text-green-500';
            case 'decreasing':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    if (loading) {
        return (
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-primary" />
                        Crop Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center h-32">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    Crop Information
                    {hasAdminData && (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 ml-2">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Admin Verified
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Wheat className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Crop Name</p>
                            <InfoTooltip content="The name of the crop you are growing" />
                        </div>
                        <p className="font-bold text-lg">{crop.name}</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Land Area</p>
                            <InfoTooltip content="The total area of land dedicated to this crop in hectares" />
                        </div>
                        <p className="font-bold text-lg">{crop.landArea} ha</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Droplets className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Soil Type</p>
                            <InfoTooltip content="The type of soil where your crop is planted, affecting nutrient availability and water retention" />
                        </div>
                        <p className="font-bold text-lg">{crop.soilType}</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUpIcon className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capital</p>
                            <InfoTooltip content="The initial investment made for planting and growing this crop" />
                        </div>
                        <p className="font-bold text-lg">₱{Number(crop.puhunan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {hasAdminData && (
                            <p className="text-xs text-green-600 mt-1">Admin suggests: ₱{Number(crop.adminData.suggestedCapital).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planting Date</p>
                            <InfoTooltip content="The date when the crop was planted, used to calculate growth stages and harvest timing" />
                        </div>
                        <p className="font-bold text-lg">
                            {(() => {
                                try {
                                    // Handle string dates (YYYY-MM-DD format)
                                    if (typeof crop.plantedDate === 'string') {
                                        const date = new Date(crop.plantedDate);
                                        if (!isNaN(date.getTime())) {
                                            return date.toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                        }
                                    }

                                    // Handle Firestore Timestamp
                                    if (crop.plantedDate?.toDate) {
                                        return crop.plantedDate.toDate().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        });
                                    }

                                    // Handle JavaScript Date objects
                                    if (crop.plantedDate instanceof Date) {
                                        return crop.plantedDate.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        });
                                    }

                                    return 'Unknown date';
                                } catch (e) {
                                    return 'Unknown date';
                                }
                            })()}
                        </p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Leaf className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Days Growing</p>
                            <InfoTooltip content="The number of days since the crop was planted, indicating its current growth stage" />
                        </div>
                        <p className="font-bold text-lg">
                            {(() => {
                                try {
                                    let plantedDate;

                                    // Handle string dates (YYYY-MM-DD format)
                                    if (typeof crop.plantedDate === 'string') {
                                        // Parse date in local timezone to avoid UTC conversion issues
                                        const [year, month, day] = crop.plantedDate.split('-').map(Number);
                                        plantedDate = new Date(year, month - 1, day); // month is 0-indexed
                                    }
                                    // Handle Firestore Timestamp
                                    else if (crop.plantedDate?.toDate) {
                                        plantedDate = crop.plantedDate.toDate();
                                    }
                                    // Handle JavaScript Date objects
                                    else if (crop.plantedDate instanceof Date) {
                                        plantedDate = crop.plantedDate;
                                    }

                                    if (plantedDate && !isNaN(plantedDate.getTime())) {
                                        const now = new Date();
                                        const diffTime = now.getTime() - plantedDate.getTime();
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                        // Ensure we never show negative days
                                        // On planting date = 0 days, day after = 1 day, etc.
                                        return Math.max(0, diffDays);
                                    }

                                    return 'N/A';
                                } catch (e) {
                                    return 'N/A';
                                }
                            })()} days
                        </p>
                    </div>

                    {insights?.fertilizer && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Sprout className="h-4 w-4 text-primary" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Soil pH</p>
                                <InfoTooltip content="The acidity or alkalinity level of your soil, affecting nutrient availability for the crop" />
                            </div>
                            <p className="font-bold text-lg">{insights.fertilizer.pH}</p>
                        </div>
                    )}

                    {insights?.market && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Banknote className="h-4 w-4 text-primary" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Est. Market Price</p>
                                <InfoTooltip content={hasAdminData ? "Admin-verified market price per kilogram" : "The current estimated market price per kilogram for your crop type"} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                    ₱{Number(hasAdminData 
                                        ? crop.adminData.marketPrice
                                        : ((insights?.profit?.averageMarketPrice !== undefined && insights?.profit?.averageMarketPrice > 0) 
                                          ? insights.profit.averageMarketPrice 
                                          : (insights?.market?.averagePrice || 0))
                                    ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {!hasAdminData && getTrendIcon(insights.market.trend)}
                            </div>
                            {!hasAdminData && (
                                <p className={`text-xs ${getTrendColor(insights.market.trend)}`}>
                                    Est. {insights.market.trend?.charAt(0).toUpperCase() + insights.market.trend?.slice(1)} trend
                                </p>
                            )}
                            {hasAdminData && (
                                <p className="text-xs text-green-600">Admin verified price</p>
                            )}
                        </div>
                    )}
                </div>

                {(insights?.fertilizer?.recommendations && insights.fertilizer.recommendations.length > 0) || hasAdminData ? (
                    <div className="md:col-span-4">
                        <div className="p-4 bg-muted/50 rounded-lg border">
                            <div className="flex items-center gap-2 mb-4">
                                <Scale className="h-5 w-5 text-primary" />
                                <p className="text-base font-semibold">Fertilizer Recommendations</p>
                                {hasAdminData && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Admin Verified
                                    </Badge>
                                )}
                            </div>
                            
                            {hasAdminData ? (
                                // Show admin fertilizer recommendations - Complete N, P, K display
                                <div className="space-y-4">
                                    {/* Nitrogen (N) */}
                                    <div className="bg-white rounded-lg border-2 border-green-200 overflow-hidden">
                                        <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between">
                                            <h3 className="font-bold text-base">Nitrogen (N)</h3>
                                            <Badge className="bg-white text-green-700 hover:bg-green-50">
                                                Level: {crop.adminData.fertilizerRecommendations?.nitrogen?.level || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {/* Amount & Application */}
                                            {crop.adminData.fertilizerRecommendations?.nitrogen?.amount && (
                                                <div className="bg-green-50 rounded-md p-3 border border-green-200">
                                                    <p className="text-xs font-semibold text-green-800 mb-1 uppercase tracking-wide">Amount & Application</p>
                                                    <p className="text-sm text-green-900 font-medium">{crop.adminData.fertilizerRecommendations.nitrogen.amount}</p>
                                                </div>
                                            )}
                                            
                                            {/* Recommendations */}
                                            {crop.adminData.fertilizerRecommendations?.nitrogen?.recommendations && crop.adminData.fertilizerRecommendations.nitrogen.recommendations.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Recommendations</p>
                                                    <ul className="space-y-2">
                                                        {crop.adminData.fertilizerRecommendations.nitrogen.recommendations.map((rec: string, index: number) => (
                                                            <li key={index} className="flex items-start gap-2 text-sm">
                                                                <span className="text-green-600 font-bold mt-0.5">•</span>
                                                                <span className="text-gray-800">{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* Detailed Info */}
                                            {crop.adminData.fertilizerRecommendations?.nitrogen?.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Detailed Info</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.nitrogen.detailedInfo}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Phosphorus (P) */}
                                    <div className="bg-white rounded-lg border-2 border-blue-200 overflow-hidden">
                                        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
                                            <h3 className="font-bold text-base">Phosphorus (P)</h3>
                                            <Badge className="bg-white text-blue-700 hover:bg-blue-50">
                                                Level: {crop.adminData.fertilizerRecommendations?.phosphorus?.level || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {/* Amount & Application */}
                                            {crop.adminData.fertilizerRecommendations?.phosphorus?.amount && (
                                                <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                                                    <p className="text-xs font-semibold text-blue-800 mb-1 uppercase tracking-wide">Amount & Application</p>
                                                    <p className="text-sm text-blue-900 font-medium">{crop.adminData.fertilizerRecommendations.phosphorus.amount}</p>
                                                </div>
                                            )}
                                            
                                            {/* Recommendations */}
                                            {crop.adminData.fertilizerRecommendations?.phosphorus?.recommendations && crop.adminData.fertilizerRecommendations.phosphorus.recommendations.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Recommendations</p>
                                                    <ul className="space-y-2">
                                                        {crop.adminData.fertilizerRecommendations.phosphorus.recommendations.map((rec: string, index: number) => (
                                                            <li key={index} className="flex items-start gap-2 text-sm">
                                                                <span className="text-blue-600 font-bold mt-0.5">•</span>
                                                                <span className="text-gray-800">{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* Detailed Info */}
                                            {crop.adminData.fertilizerRecommendations?.phosphorus?.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Detailed Info</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.phosphorus.detailedInfo}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Potassium (K) */}
                                    <div className="bg-white rounded-lg border-2 border-purple-200 overflow-hidden">
                                        <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between">
                                            <h3 className="font-bold text-base">Potassium (K)</h3>
                                            <Badge className="bg-white text-purple-700 hover:bg-purple-50">
                                                Level: {crop.adminData.fertilizerRecommendations?.potassium?.level || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {/* Amount & Application */}
                                            {crop.adminData.fertilizerRecommendations?.potassium?.amount && (
                                                <div className="bg-purple-50 rounded-md p-3 border border-purple-200">
                                                    <p className="text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wide">Amount & Application</p>
                                                    <p className="text-sm text-purple-900 font-medium">{crop.adminData.fertilizerRecommendations.potassium.amount}</p>
                                                </div>
                                            )}
                                            
                                            {/* Recommendations */}
                                            {crop.adminData.fertilizerRecommendations?.potassium?.recommendations && crop.adminData.fertilizerRecommendations.potassium.recommendations.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Recommendations</p>
                                                    <ul className="space-y-2">
                                                        {crop.adminData.fertilizerRecommendations.potassium.recommendations.map((rec: string, index: number) => (
                                                            <li key={index} className="flex items-start gap-2 text-sm">
                                                                <span className="text-purple-600 font-bold mt-0.5">•</span>
                                                                <span className="text-gray-800">{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* Detailed Info */}
                                            {crop.adminData.fertilizerRecommendations?.potassium?.detailedInfo && (
                                                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Detailed Info</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.potassium.detailedInfo}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Show AI/dataset fertilizer recommendations
                                <ul className="text-sm space-y-1">
                                    {insights.fertilizer.recommendations.slice(0, 2).map((rec: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                    {insights.fertilizer.recommendations.length > 2 && (
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="link" className="h-auto p-0 text-primary underline">
                                                        See more recommendations...
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            <Scale className="h-5 w-5 text-primary" />
                                                            Detailed Fertilizer Recommendations
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Specific fertilizer recommendations based on your soil analysis for {crop.name}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-6">
                                                        {insights.fertilizer.detailedRecommendations && (
                                                            <>
                                                                <div className="space-y-4">
                                                                    <h3 className="font-medium text-lg">Nitrogen (N) - Level: {insights.fertilizer.detailedRecommendations.nitrogen.level}</h3>
                                                                    <div className="p-3 bg-green-50 rounded-lg">
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            {insights.fertilizer.detailedRecommendations.nitrogen.detailedInfo}
                                                                        </p>
                                                                        {insights.fertilizer.detailedRecommendations.nitrogen.amount && (
                                                                            <div className="p-2 bg-white rounded-md border border-green-200 mb-2">
                                                                                <p className="text-sm font-semibold text-green-800">💡 Recommended Amount:</p>
                                                                                <p className="text-sm text-green-700">{insights.fertilizer.detailedRecommendations.nitrogen.amount}</p>
                                                                            </div>
                                                                        )}
                                                                        <ul className="text-sm space-y-1">
                                                                            {insights.fertilizer.detailedRecommendations.nitrogen.recommendations.map((rec: string, index: number) => (
                                                                                <li key={index} className="flex items-start gap-2">
                                                                                    <span className="text-primary">•</span>
                                                                                    <span>{rec}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h3 className="font-medium text-lg">Phosphorus (P) - Level: {insights.fertilizer.detailedRecommendations.phosphorus.level}</h3>
                                                                    <div className="p-3 bg-green-50 rounded-lg">
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            {insights.fertilizer.detailedRecommendations.phosphorus.detailedInfo}
                                                                        </p>
                                                                        {insights.fertilizer.detailedRecommendations.phosphorus.amount && (
                                                                            <div className="p-2 bg-white rounded-md border border-green-200 mb-2">
                                                                                <p className="text-sm font-semibold text-green-800">💡 Recommended Amount:</p>
                                                                                <p className="text-sm text-green-700">{insights.fertilizer.detailedRecommendations.phosphorus.amount}</p>
                                                                            </div>
                                                                        )}
                                                                        <ul className="text-sm space-y-1">
                                                                            {insights.fertilizer.detailedRecommendations.phosphorus.recommendations.map((rec: string, index: number) => (
                                                                                <li key={index} className="flex items-start gap-2">
                                                                                    <span className="text-primary">•</span>
                                                                                    <span>{rec}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h3 className="font-medium text-lg">Potassium (K) - Level: {insights.fertilizer.detailedRecommendations.potassium.level}</h3>
                                                                    <div className="p-3 bg-purple-50 rounded-lg">
                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                            {insights.fertilizer.detailedRecommendations.potassium.detailedInfo}
                                                                        </p>
                                                                        {insights.fertilizer.detailedRecommendations.potassium.amount && (
                                                                            <div className="p-2 bg-white rounded-md border border-purple-200 mb-2">
                                                                                <p className="text-sm font-semibold text-purple-800">💡 Recommended Amount:</p>
                                                                                <p className="text-sm text-purple-700">{insights.fertilizer.detailedRecommendations.potassium.amount}</p>
                                                                            </div>
                                                                        )}
                                                                        <ul className="text-sm space-y-1">
                                                                            {insights.fertilizer.detailedRecommendations.potassium.recommendations.map((rec: string, index: number) => (
                                                                                <li key={index} className="flex items-start gap-2">
                                                                                    <span className="text-primary">•</span>
                                                                                    <span>{rec}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        <div className="space-y-4">
                                                            <h3 className="font-medium text-lg">General Recommendations</h3>
                                                            <div className="p-3 bg-yellow-50 rounded-lg">
                                                                <ul className="text-sm space-y-1">
                                                                    {insights.fertilizer.recommendations.map((rec: string, index: number) => (
                                                                        <li key={index} className="flex items-start gap-2">
                                                                            <span className="text-primary">•</span>
                                                                            <span>{rec}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Removed financial information boxes to avoid duplication with Sales Forecast section */}
            </CardContent>
        </Card>
    );
};

export default EnhancedCropInfoCard;
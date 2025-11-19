import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, MapPin, Wheat, Droplets, TrendingUpIcon, Calendar, Sprout, Banknote, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { getCropInsights } from "@/services/cropDataService";

interface EnhancedCropInfoCardProps {
    crop: any;
}

const EnhancedCropInfoCard = ({ crop }: EnhancedCropInfoCardProps) => {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setLoading(true);
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
    }, [crop]);

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
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Wheat className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Crop Name</p>
                        </div>
                        <p className="font-bold text-lg">{crop.name}</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Land Area</p>
                        </div>
                        <p className="font-bold text-lg">{crop.landArea} ha</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Droplets className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Soil Type</p>
                        </div>
                        <p className="font-bold text-lg">{crop.soilType}</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUpIcon className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capital</p>
                        </div>
                        <p className="font-bold text-lg">₱{Number(crop.puhunan).toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planting Date</p>
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
                        </div>
                        <p className="font-bold text-lg">
                            {(() => {
                                try {
                                    let plantedDate;
                                    
                                    // Handle string dates (YYYY-MM-DD format)
                                    if (typeof crop.plantedDate === 'string') {
                                        plantedDate = new Date(crop.plantedDate);
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
                                        return Math.floor((new Date().getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
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
                            </div>
                            <p className="font-bold text-lg">{insights.fertilizer.pH}</p>
                        </div>
                    )}

                    {insights?.market && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Banknote className="h-4 w-4 text-primary" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Market Price</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                    ₱{insights.market.averagePrice?.toFixed(2) || 'N/A'}
                                </span>
                                {getTrendIcon(insights.market.trend)}
                            </div>
                            <p className={`text-xs ${getTrendColor(insights.market.trend)}`}>
                                {insights.market.trend?.charAt(0).toUpperCase() + insights.market.trend?.slice(1)} trend
                            </p>
                        </div>
                    )}
                </div>

                {insights?.fertilizer?.recommendations && insights.fertilizer.recommendations.length > 0 && (
                    <div className="md:col-span-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Scale className="h-4 w-4 text-primary" />
                                <p className="text-sm font-medium">Fertilizer Recommendations</p>
                            </div>
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
                )}

                {insights?.profit && (
                    <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Est. Yield</p>
                            <p className="font-medium">
                                {insights.profit.estimatedYield?.toLocaleString() || 'N/A'} kg
                            </p>
                        </div>
                        <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Potential Revenue</p>
                            <p className="font-medium">
                                ₱{insights.profit.potentialRevenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg border ${insights.profit.netProfit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                            <p className={`font-medium ${insights.profit.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ₱{insights.profit.netProfit?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Suggested Capital</p>
                            <p className="font-medium">
                                ₱{insights.profit.suggestedCapital?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EnhancedCropInfoCard;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, MapPin, Wheat, Droplets, TrendingUpIcon, Calendar, Sprout, Banknote, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { getCropInsights } from "@/services/cropDataService";
import InfoTooltip from "@/components/ui/info-tooltip";

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
                                <InfoTooltip content="The current estimated market price per kilogram for your crop type" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                    ₱{Number(insights.market.averagePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {getTrendIcon(insights.market.trend)}
                            </div>
                            <p className={`text-xs ${getTrendColor(insights.market.trend)}`}>
                                Est. {insights.market.trend?.charAt(0).toUpperCase() + insights.market.trend?.slice(1)} trend
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

                {/* Removed financial information boxes to avoid duplication with Sales Forecast section */}
            </CardContent>
        </Card>
    );
};

export default EnhancedCropInfoCard;
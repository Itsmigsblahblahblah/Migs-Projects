import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCrops } from "@/contexts/CropContext";
import { TrendingUp } from "lucide-react";
import {
    Leaf,
    Calendar,
    MapPin,
    Wheat,
    TrendingUp as TrendingUpIcon,
    Droplets,
    Sun,
    Bug,
    ArrowLeft,
    BarChart3,
    CheckCircle
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

interface Crop {
    id: string;
    name: string;
    landArea: string;
    quantity: number;
    soilType: string;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    puhunan: number;
    plantedDate: any;
    createdAt: any;
}

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
}

interface PrescribedCrop {
    id: string;
    name: string;
    reason: string;
    recommendations: string[];
    practices: string[];
}

// Chart configuration for ShadCN chart
const salesChartConfig = {
    puhunan: {
        label: "Puhunan",
        color: "hsl(var(--chart-1))",
    },
    grossSales: {
        label: "Estimated Gross Sales",
        color: "hsl(var(--chart-2))",
    },
    netProfit: {
        label: "Projected Net Profit",
        color: "hsl(var(--chart-3))",
    },
} satisfies ChartConfig;

// Chart configuration for productivity chart
const productivityChartConfig = {
    productivity: {
        label: "Productivity (%)",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const CropDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCropById } = useCrops();
    const [crop, setCrop] = useState<Crop | null>(null);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [productivityData, setProductivityData] = useState<{ task: string; productivity: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescribedCrop, setSelectedPrescribedCrop] = useState<PrescribedCrop | null>(null);

    // Mock prescribed crops data based on soil composition, weather forecast, and market demand
    const prescribedCrops: PrescribedCrop[] = useMemo(() => {
        if (!crop) return [];
        
        // Generate recommendations based on crop's soil composition and type
        const soilRecommendations = [
            { 
                id: "1", 
                name: "Squash", 
                reason: "High nitrogen levels in your soil are perfect for squash, which requires nitrogen-rich soil for optimal leaf growth.",
                recommendations: [
                    "Plant seeds 1 inch deep with 3-4 feet spacing",
                    "Water consistently but avoid waterlogging",
                    "Apply mulch to retain moisture"
                ],
                practices: [
                    "Harvest when fruits are 6-8 inches long",
                    "Prune lateral shoots to focus energy on main fruits",
                    "Monitor for squash bugs and cucumber beetles"
                ]
            },
            { 
                id: "2", 
                name: "Eggplant", 
                reason: "Your soil's potassium levels are ideal for eggplant, which requires high potassium for fruit development.",
                recommendations: [
                    "Plant in full sun with well-draining soil",
                    "Space plants 18-24 inches apart",
                    "Stake plants to support fruit weight"
                ],
                practices: [
                    "Harvest when fruits are glossy and firm",
                    "Prune lower leaves to improve air circulation",
                    "Apply compost tea every 2 weeks"
                ]
            },
            { 
                id: "3", 
                name: "Okra", 
                reason: "With your current phosphorus levels and soil type, okra will thrive as it prefers moderately fertile soil with good drainage.",
                recommendations: [
                    "Plant seeds 1 inch deep, 12-18 inches apart",
                    "Okra thrives in warm weather, perfect for current forecast",
                    "Apply balanced fertilizer at planting"
                ],
                practices: [
                    "Harvest pods every 2-3 days for best quality",
                    "Wear gloves when harvesting to avoid spines",
                    "Cut pods with knife to avoid plant damage"
                ]
            },
            { 
                id: "4", 
                name: "Peppers", 
                reason: "Your soil composition and upcoming weather forecast create ideal conditions for peppers, which prefer warm, well-drained soil.",
                recommendations: [
                    "Transplant seedlings after soil warms to 60°F",
                    "Provide consistent moisture without overwatering",
                    "Use row covers for early protection"
                ],
                practices: [
                    "Harvest when peppers reach full color",
                    "Prune suckers to improve air circulation",
                    "Apply calcium-rich fertilizer to prevent blossom end rot"
                ]
            }
        ];
        
        return soilRecommendations;
    }, [crop]);

    // Mock checklist data based on crop type
    const generateChecklist = (cropName: string) => {
        const baseItems = [
            { id: "1", title: "Prepare soil and remove weeds", completed: false, category: "Preparation" },
            { id: "2", title: "Apply organic fertilizer", completed: false, category: "Planting" },
            { id: "3", title: "Plant seeds at proper depth", completed: false, category: "Planting" },
            { id: "4", title: "Water regularly (2-3 times per week)", completed: false, category: "Maintenance" },
            { id: "5", title: "Monitor for pests and diseases", completed: false, category: "Maintenance" },
            { id: "6", title: "Apply additional fertilizer as needed", completed: false, category: "Maintenance" },
            { id: "7", title: "Harvest when crop is mature", completed: false, category: "Harvesting" },
        ];

        // Add crop-specific items
        if (cropName.toLowerCase().includes("rice")) {
            return [
                ...baseItems,
                { id: "8", title: "Flood field to proper depth", completed: false, category: "Irrigation" },
                { id: "9", title: "Monitor water level daily", completed: false, category: "Irrigation" },
            ];
        } else if (cropName.toLowerCase().includes("corn")) {
            return [
                ...baseItems,
                { id: "8", title: "Hill up soil around base of plants", completed: false, category: "Maintenance" },
                { id: "9", title: "Remove suckers to promote growth", completed: false, category: "Maintenance" },
            ];
        } else if (selectedPrescribedCrop) {
            // If a prescribed crop is selected, generate checklist for that crop
            return [
                ...baseItems,
                { id: "8", title: `Apply specific fertilizer for ${selectedPrescribedCrop.name}`, completed: false, category: "Planting" },
                { id: "9", title: `Follow ${selectedPrescribedCrop.name} spacing requirements`, completed: false, category: "Planting" },
            ];
        }

        return baseItems;
    };

    useEffect(() => {
        const fetchCrop = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const cropData = getCropById(id);
                if (cropData) {
                    setCrop(cropData);

                    // Generate checklist based on crop type or selected prescribed crop
                    const generatedChecklist = generateChecklist(cropData.name);
                    setChecklist(generatedChecklist);

                    // Initialize productivity data with 0% at start
                    const initialData = generatedChecklist.map(item => ({
                        task: item.title,
                        productivity: 0
                    }));
                    setProductivityData(initialData);
                }
            } catch (error) {
                console.error("Error fetching crop:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCrop();
    }, [id, getCropById]);

    // Update checklist when prescribed crop is selected
    useEffect(() => {
        if (crop) {
            const generatedChecklist = generateChecklist(crop.name);
            setChecklist(generatedChecklist);
            
            // Update productivity data to match new checklist
            const initialData = generatedChecklist.map(item => ({
                task: item.title,
                productivity: item.completed ? 100 : 0
            }));
            setProductivityData(initialData);
        }
    }, [selectedPrescribedCrop, crop]);

    const toggleChecklistItem = (itemId: string) => {
        setChecklist(prev => {
            const updatedChecklist = prev.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
            );

            // Calculate overall productivity
            const completed = updatedChecklist.filter(item => item.completed).length;
            const total = updatedChecklist.length;
            const overallProductivity = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Update productivity data - one entry per checklist item
            const updatedProductivityData = updatedChecklist.map(item => ({
                task: item.title,
                productivity: item.completed ? 100 : 0
            }));

            // Add overall productivity at the end
            updatedProductivityData.push({
                task: "Overall Progress",
                productivity: overallProductivity
            });

            setProductivityData(updatedProductivityData);

            return updatedChecklist;
        });
    };

    const calculateHarvestDate = (plantedDate: any, cropName: string) => {
        if (!plantedDate || !plantedDate.toDate) return 'Unknown date';

        try {
            const baseDate = plantedDate.toDate();
            let daysToHarvest = 90; // Default

            if (cropName.toLowerCase().includes("rice")) {
                daysToHarvest = 120;
            } else if (cropName.toLowerCase().includes("corn")) {
                daysToHarvest = 100;
            } else if (cropName.toLowerCase().includes("tomato")) {
                daysToHarvest = 80;
            }

            const harvestDate = new Date(baseDate);
            harvestDate.setDate(baseDate.getDate() + daysToHarvest);

            return harvestDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown date';
        }
    };

    const calculateGrowthStage = (plantedDate: any) => {
        if (!plantedDate || !plantedDate.toDate) return 'Unknown';

        try {
            const planted = plantedDate.toDate();
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - planted.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 14) return "Germination";
            if (diffDays < 30) return "Seedling";
            if (diffDays < 60) return "Vegetative";
            if (diffDays < 90) return "Flowering";
            return "Fruiting";
        } catch (e) {
            return 'Unknown';
        }
    };

    const calculateProductivity = (landArea: string, quantity: number) => {
        // Simple calculation based on area and yield
        const areaValue = parseFloat(landArea);
        if (isNaN(areaValue)) return 75;

        const productivity = Math.min(100, Math.max(0, (quantity / areaValue) / 10));
        return Math.round(productivity);
    };

    const calculateEstimatedSales = (quantity: number) => {
        // Mock pricing - in real app this would come from market data
        const pricePerKg = 25; // PHP
        return quantity * pricePerKg;
    };

    const calculateNetProfit = (puhunan: number, estimatedSales: number) => {
        return estimatedSales - puhunan;
    };

    // Calculate productivity based on checklist completion
    const checklistProductivity = useMemo(() => {
        if (checklist.length === 0) return 0;
        const completed = checklist.filter(item => item.completed).length;
        return Math.round((completed / checklist.length) * 100);
    }, [checklist]);

    // Sales forecast data for the line chart
    const salesForecastData = useMemo(() => {
        if (!crop) return [];

        const puhunan = crop.puhunan;
        const estimatedSales = calculateEstimatedSales(crop.quantity);
        const netProfit = calculateNetProfit(crop.puhunan, estimatedSales);

        // Simulate forecast data over time (stages) with more data points for smoother lines
        const stages = [
            'Preparation',
            'Planting',
            'Early Growth',
            'Mid Growth',
            'Late Growth',
            'Flowering',
            'Fruiting',
            'Harvest'
        ];

        return stages.map((stage, index) => ({
            stage,
            puhunan,
            grossSales: estimatedSales * (index + 1) / stages.length,
            netProfit: netProfit * (index + 1) / stages.length,
        }));
    }, [crop]);

    // Handle prescribed crop selection
    const handlePrescribedCropSelect = (prescribedCrop: PrescribedCrop) => {
        setSelectedPrescribedCrop(prescribedCrop);
    };

    // Reset to original crop recommendations
    const resetToOriginal = () => {
        setSelectedPrescribedCrop(null);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    if (!crop) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Crop not found</h2>
                    <p className="text-muted-foreground mb-4">The requested crop could not be found.</p>
                    <Button onClick={() => navigate('/crop-history')}>
                        Back to Crop History
                    </Button>
                </div>
            </Layout>
        );
    }

    const estimatedSales = calculateEstimatedSales(crop.quantity);
    const netProfit = calculateNetProfit(crop.puhunan, estimatedSales);
    const productivity = calculateProductivity(crop.landArea, crop.quantity);

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/crop-history')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{crop.name} Details</h1>
                        <p className="text-muted-foreground">Comprehensive information and management tools</p>
                    </div>
                </div>

                {/* Basic Crop Information */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Leaf className="h-5 w-5" />
                            Basic Crop Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Wheat className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Crop Name</p>
                                    <p className="font-medium">{crop.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Land Area</p>
                                    <p className="font-medium">{crop.landArea}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Wheat className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Quantity</p>
                                    <p className="font-medium">{crop.quantity} kg</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Droplets className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Soil Type</p>
                                    <p className="font-medium">{crop.soilType}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Droplets className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Soil Composition</p>
                                    <p className="font-medium">
                                        N:{crop.nitrogen} P:{crop.phosphorus} K:{crop.potassium}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <TrendingUpIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Puhunan</p>
                                    <p className="font-medium">₱{crop.puhunan.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Growth and Health Insights */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5" />
                            Growth and Health Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-accent/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Growth Stage</p>
                                <p className="font-medium">{calculateGrowthStage(crop.plantedDate)}</p>
                            </div>
                            <div className="p-4 bg-accent/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Harvest Date</p>
                                <p className="font-medium">{calculateHarvestDate(crop.plantedDate, crop.name)}</p>
                            </div>
                            <div className="p-4 bg-accent/10 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Productivity</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-full bg-secondary rounded-full h-2">
                                        <div
                                            className="bg-success h-2 rounded-full"
                                            style={{ width: `${productivity}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{productivity}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Prescribed Crops Section */}
                        <div>
                            <h3 className="font-medium mb-3">Prescribed Crops</h3>
                            {prescribedCrops.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {prescribedCrops.map((prescribedCrop) => (
                                        <Badge
                                            key={prescribedCrop.id}
                                            variant={selectedPrescribedCrop?.id === prescribedCrop.id ? "default" : "secondary"}
                                            className="cursor-pointer hover:bg-primary/80 transition-colors"
                                            onClick={() => handlePrescribedCropSelect(prescribedCrop)}
                                        >
                                            {prescribedCrop.name}
                                        </Badge>
                                    ))}
                                    {selectedPrescribedCrop && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={resetToOriginal}
                                        >
                                            Clear Selection
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No crop prescriptions available at the moment. Please check again later or adjust your soil/forecast settings.
                                </p>
                            )}
                        </div>

                        {/* Common Issues & Solutions */}
                        <div>
                            <h3 className="font-medium mb-3">Common Issues & Solutions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Bug className="h-4 w-4 text-destructive" />
                                        <span className="font-medium text-sm">Pests</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Use neem oil spray and introduce beneficial insects like ladybugs.
                                    </p>
                                </div>
                                <div className="p-3 border rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Droplets className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium text-sm">Diseases</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Ensure proper spacing and apply copper-based fungicides if needed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recommendations moved below Growth and Health Insights */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            {selectedPrescribedCrop ? `${selectedPrescribedCrop.name} Recommendations` : "Recommendations"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedPrescribedCrop ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="p-3 bg-primary/5 rounded-lg border">
                                    <h4 className="font-medium mb-2">Why {selectedPrescribedCrop.name}?</h4>
                                    <p className="text-sm">{selectedPrescribedCrop.reason}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium mb-2">Practical Recommendations</h4>
                                    <ul className="space-y-2 text-sm">
                                        {selectedPrescribedCrop.recommendations.map((rec, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium mb-2">Best Practices</h4>
                                    <ul className="space-y-2 text-sm">
                                        {selectedPrescribedCrop.practices.map((practice, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                                <span>{practice}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                    <span>Water consistently but avoid waterlogging</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                    <span>Apply balanced fertilizer every 3 weeks</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                    <span>Monitor for pests daily, especially in the morning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                    <span>Harvest when grains are golden brown for best yield</span>
                                </li>
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Sales Forecast */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Sales Forecast
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="p-4 bg-primary/5 rounded-lg border">
                                <p className="text-sm text-muted-foreground mb-1">Puhunan</p>
                                <p className="text-2xl font-bold text-primary">₱{crop.puhunan.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-success/5 rounded-lg border">
                                <p className="text-sm text-muted-foreground mb-1">Estimated Gross Sales</p>
                                <p className="text-2xl font-bold text-success">₱{estimatedSales.toLocaleString()}</p>
                            </div>
                            <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
                                <p className="text-sm text-muted-foreground mb-1">Projected Net Profit</p>
                                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    ₱{netProfit.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Sales Forecast Line Chart */}
                        <div className="mt-6">
                            <h3 className="font-medium mb-4">Sales Projection Over Time</h3>
                            <div className="h-80 w-full">
                                <ChartContainer config={salesChartConfig} className="h-full w-full">
                                    <LineChart
                                        accessibilityLayer
                                        data={salesForecastData}
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 12,
                                            bottom: 12,
                                        }}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="stage"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => value.slice(0, 3)}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => `₱${value.toLocaleString()}`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent
                                                formatter={(value) => `₱${Number(value).toLocaleString()}`}
                                                labelFormatter={(value) => `Stage: ${value}`}
                                            />}
                                        />
                                        <Legend />
                                        <Line
                                            dataKey="puhunan"
                                            type="monotone"
                                            stroke="var(--color-puhunan)"
                                            strokeWidth={2}
                                            fill="var(--color-puhunan)"
                                            dot={{ r: 4, fill: "var(--color-puhunan)", strokeWidth: 2, stroke: "var(--color-puhunan)" }}
                                            activeDot={{ r: 6, stroke: "var(--color-puhunan)", strokeWidth: 2 }}
                                            connectNulls={true}
                                        />
                                        <Line
                                            dataKey="grossSales"
                                            type="monotone"
                                            stroke="var(--color-grossSales)"
                                            strokeWidth={2}
                                            fill="var(--color-grossSales)"
                                            dot={{ r: 4, fill: "var(--color-grossSales)", strokeWidth: 2, stroke: "var(--color-grossSales)" }}
                                            activeDot={{ r: 6, stroke: "var(--color-grossSales)", strokeWidth: 2 }}
                                            connectNulls={true}
                                        />
                                        <Line
                                            dataKey="netProfit"
                                            type="monotone"
                                            stroke="var(--color-netProfit)"
                                            strokeWidth={2}
                                            fill="var(--color-netProfit)"
                                            dot={{ r: 4, fill: "var(--color-netProfit)", strokeWidth: 2, stroke: "var(--color-netProfit)" }}
                                            activeDot={{ r: 6, stroke: "var(--color-netProfit)", strokeWidth: 2 }}
                                            connectNulls={true}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Maintenance Checklist */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            {selectedPrescribedCrop ? `${selectedPrescribedCrop.name} Maintenance Checklist` : "Maintenance Checklist"}
                        </CardTitle>
                        <CardDescription>
                            Track your progress through the growing season
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {checklist.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                    <Checkbox
                                        id={item.id}
                                        checked={item.completed}
                                        onCheckedChange={() => toggleChecklistItem(item.id)}
                                    />
                                    <label
                                        htmlFor={item.id}
                                        className={`flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                                    >
                                        {item.title}
                                        <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                                    </label>
                                </div>
                            ))}
                        </div>

                        {/* Productivity Visualization based on checklist completion */}
                        <div className="mt-8">
                            <h3 className="font-medium mb-4">Maintenance Progress</h3>
                            <div className="h-64 w-full">
                                <ChartContainer config={productivityChartConfig} className="h-full w-full">
                                    <LineChart
                                        accessibilityLayer
                                        data={productivityData}
                                        margin={{
                                            left: 12,
                                            right: 12,
                                            top: 12,
                                            bottom: 12,
                                        }}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="task"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => `${value}%`}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent
                                                formatter={(value) => `${Number(value).toFixed(0)}%`}
                                                labelFormatter={(value) => `Task: ${value}`}
                                            />}
                                        />
                                        <Line
                                            dataKey="productivity"
                                            type="monotone"
                                            stroke="var(--color-productivity)"
                                            strokeWidth={2}
                                            fill="var(--color-productivity)"
                                            dot={{ r: 4, fill: "var(--color-productivity)", strokeWidth: 2, stroke: "var(--color-productivity)" }}
                                            activeDot={{ r: 6, stroke: "var(--color-productivity)", strokeWidth: 2 }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                            <div className="mt-4 text-center">
                                <p className="text-sm font-medium">{checklistProductivity}% Complete</p>
                                <p className="text-xs text-muted-foreground">
                                    {checklist.filter(item => item.completed).length} of {checklist.length} tasks completed
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default CropDetails;
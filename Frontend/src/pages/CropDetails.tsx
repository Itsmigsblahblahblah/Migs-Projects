import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowLeft, Sprout, Leaf, Calendar, Droplets, Sun, Activity, AlertTriangle, CheckCircle, XCircle, Wheat, TrendingUp, Package } from "lucide-react";
import { useCrops } from "@/contexts/CropContext";
import { Button } from "@/components/ui/button";
import CropInfoCard from "@/components/dashboard/farmer/CropInfoCard";
import GrowthInsightsCard from "@/components/dashboard/farmer/GrowthInsightsCard";
import RecommendationsCard from "@/components/dashboard/farmer/RecommendationsCard";
import SalesForecastCard from "@/components/dashboard/farmer/SalesForecastCard";
import MaintenanceChecklistCard from "@/components/dashboard/farmer/MaintenanceChecklistCard";

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

const CropDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCropById } = useCrops();
    const [crop, setCrop] = useState<Crop | null>(null);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [productivityData, setProductivityData] = useState<{ task: string; productivity: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescribedCrop, setSelectedPrescribedCrop] = useState<PrescribedCrop | null>(null);

    // Mock prescribed crops data
    const prescribedCrops: PrescribedCrop[] = crop ? [
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
        }
    ] : [];

    // Mock checklist data
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

                    // Generate checklist based on crop type
                    const generatedChecklist = generateChecklist(cropData.name);
                    setChecklist(generatedChecklist);

                    // Initialize productivity data
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

    const toggleChecklistItem = (itemId: string) => {
        setChecklist(prev => {
            const updatedChecklist = prev.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
            );

            // Calculate overall productivity
            const completed = updatedChecklist.filter(item => item.completed).length;
            const total = updatedChecklist.length;
            const overallProductivity = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Update productivity data
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
        // Mock pricing
        const pricePerKg = 25; // PHP
        return quantity * pricePerKg;
    };

    const calculateNetProfit = (puhunan: number, estimatedSales: number) => {
        return estimatedSales - puhunan;
    };

    // Calculate productivity based on checklist completion
    const checklistProductivity = checklist.length > 0
        ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
        : 0;

    // Sales forecast data for the line chart
    const salesForecastData = crop ? [
        { stage: 'Preparation', puhunan: crop.puhunan, grossSales: 0, netProfit: -crop.puhunan },
        { stage: 'Planting', puhunan: crop.puhunan, grossSales: calculateEstimatedSales(crop.quantity) * 0.2, netProfit: calculateEstimatedSales(crop.quantity) * 0.2 - crop.puhunan },
        { stage: 'Growth', puhunan: crop.puhunan, grossSales: calculateEstimatedSales(crop.quantity) * 0.6, netProfit: calculateEstimatedSales(crop.quantity) * 0.6 - crop.puhunan },
        { stage: 'Harvest', puhunan: crop.puhunan, grossSales: calculateEstimatedSales(crop.quantity), netProfit: calculateNetProfit(crop.puhunan, calculateEstimatedSales(crop.quantity)) },
    ] : [];

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
    const growthStage = calculateGrowthStage(crop.plantedDate);
    const harvestDate = calculateHarvestDate(crop.plantedDate, crop.name);

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
                <CropInfoCard crop={crop} />

                {/* Growth and Health Insights */}
                <GrowthInsightsCard
                    growthStage={growthStage}
                    harvestDate={harvestDate}
                    productivity={productivity}
                    prescribedCrops={prescribedCrops}
                    selectedPrescribedCrop={selectedPrescribedCrop}
                    onPrescribedCropSelect={setSelectedPrescribedCrop}
                    onResetSelection={() => setSelectedPrescribedCrop(null)}
                />

                {/* Recommendations */}
                <RecommendationsCard selectedPrescribedCrop={selectedPrescribedCrop} />

                {/* Sales Forecast */}
                <SalesForecastCard
                    puhunan={crop.puhunan}
                    estimatedSales={estimatedSales}
                    netProfit={netProfit}
                    salesForecastData={salesForecastData}
                />

                {/* Maintenance Checklist */}
                <MaintenanceChecklistCard
                    checklist={checklist}
                    productivityData={productivityData}
                    checklistProductivity={checklistProductivity}
                    onToggleItem={toggleChecklistItem}
                    selectedPrescribedCrop={selectedPrescribedCrop}
                />
            </div>
        </Layout>
    );
};

export default CropDetails;

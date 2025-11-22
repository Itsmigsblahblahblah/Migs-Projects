import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowLeft, Sprout, Leaf, Calendar, Droplets, Sun, Activity, AlertTriangle, CheckCircle, XCircle, Wheat, TrendingUp, Package, MapPin } from "lucide-react";
import { useCrops } from "@/contexts/CropContext";
import { Button } from "@/components/ui/button";
import GrowthInsightsCard from "@/components/dashboard/farmer/GrowthInsightsCard";
import MaintenanceChecklistCard from "@/components/dashboard/farmer/MaintenanceChecklistCard";
import EnhancedCropInfoCard from "@/components/dashboard/farmer/EnhancedCropInfoCard";
import EnhancedSalesForecastCard from "@/components/dashboard/farmer/EnhancedSalesForecastCard";
import { getHarvestEstimate } from "@/services/geminiService";
import { getCropInsights } from "@/services/cropDataService";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
    completedAt?: string; // Add timestamp for completion
}

const CropDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCropById, updateCrop, loadCrops } = useCrops();
    const [crop, setCrop] = useState<any | null>(null);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [productivityData, setProductivityData] = useState<{ task: string; productivity: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [harvestData, setHarvestData] = useState<any>(null);
    const [marketData, setMarketData] = useState<any>(null);
    const [cropsLoaded, setCropsLoaded] = useState(false);
    const maintenanceRef = useRef<HTMLDivElement>(null);

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
            { id: "8", title: "Sort and store harvested crops properly", completed: false, category: "Post-Harvest" },
        ];

        return baseItems;
    };

    // Function to ensure all checklist items are present
    const ensureCompleteChecklist = (existingChecklist: ChecklistItem[], cropName: string): ChecklistItem[] => {
        const baseChecklist = generateChecklist(cropName);

        // Check if the new item exists in the existing checklist by title
        const hasPostHarvestItem = existingChecklist.some(item =>
            item.title === "Sort and store harvested crops properly"
        );

        // If the new item doesn't exist, add it
        if (!hasPostHarvestItem) {
            const postHarvestItem = baseChecklist.find(item =>
                item.title === "Sort and store harvested crops properly"
            );
            if (postHarvestItem) {
                return [...existingChecklist, { ...postHarvestItem, completed: false, completedAt: undefined }];
            }
        }

        return existingChecklist;
    };

    useEffect(() => {
        const fetchCrop = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                // Wait for crops to be loaded
                if (!cropsLoaded) {
                    await loadCrops();
                    setCropsLoaded(true);
                }

                const cropData = getCropById(id);
                if (cropData) {
                    setCrop(cropData);

                    // Load checklist from database or generate new one
                    let loadedChecklist: ChecklistItem[] = [];
                    if (cropData.checklist && cropData.checklist.length > 0) {
                        // Use existing checklist from database but ensure it has all items
                        loadedChecklist = ensureCompleteChecklist(cropData.checklist, cropData.name);

                        // If we added new items, save the updated checklist to the database
                        const originalLength = cropData.checklist.length;
                        const newLength = loadedChecklist.length;
                        if (newLength > originalLength) {
                            // Save updated checklist to database
                            try {
                                await updateCrop(cropData.id, { checklist: loadedChecklist });
                            } catch (error) {
                                console.error("Error saving updated checklist to database:", error);
                            }
                        }
                    } else {
                        // Generate new checklist based on crop type
                        loadedChecklist = generateChecklist(cropData.name);
                    }
                    setChecklist(loadedChecklist);

                    // Initialize productivity data
                    const initialData = loadedChecklist.map(item => ({
                        task: item.title,
                        productivity: item.completed ? 100 : 0
                    }));

                    // Add overall productivity at the end
                    const completed = loadedChecklist.filter(item => item.completed).length;
                    const total = loadedChecklist.length;
                    const overallProductivity = total > 0 ? Math.round((completed / total) * 100) : 0;

                    initialData.push({
                        task: "Overall Progress",
                        productivity: overallProductivity
                    });

                    setProductivityData(initialData);

                    // Fetch harvest estimate from Gemini API only if not already saved or if it was reset
                    if (cropData.plantedDate && (!cropData.harvestData || Object.keys(cropData.harvestData).length === 0)) {
                        try {
                            const plantedDate = typeof cropData.plantedDate === 'string'
                                ? new Date(cropData.plantedDate)
                                : cropData.plantedDate.toDate
                                    ? cropData.plantedDate.toDate()
                                    : new Date(cropData.plantedDate);

                            const harvestInfo = await getHarvestEstimate(cropData.name, plantedDate, "Majayjay, Laguna");

                            // Save harvest data to crop record
                            if (cropData.id) {
                                await updateCrop(cropData.id, { harvestData: harvestInfo });
                            }

                            setHarvestData(harvestInfo);
                        } catch (error) {
                            console.error("Error fetching harvest estimate:", error);
                        }
                    } else if (cropData.harvestData) {
                        // Use existing harvest data
                        setHarvestData(cropData.harvestData);
                    } else {
                        // Reset harvest data if no conditions are met
                        setHarvestData(null);
                    }

                    // Fetch market demand data only if not already saved or if it's outdated
                    // Check if we have market data and if it's still valid (same harvest date)
                    if (cropData.marketData) {
                        // Use existing market data
                        setMarketData(cropData.marketData);
                    } else {
                        // Fetch new market data
                        try {
                            const insights = await getCropInsights(
                                cropData.name,
                                cropData.soilType,
                                cropData.landArea,
                                cropData.puhunan
                            );

                            // Save market data to crop record
                            if (cropData.id) {
                                await updateCrop(cropData.id, { marketData: insights });
                            }

                            setMarketData(insights);
                        } catch (error) {
                            console.error("Error fetching market data:", error);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching crop:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCrop();
    }, [id, getCropById, loadCrops, cropsLoaded]);

    const toggleChecklistItem = async (itemId: string) => {
        const updatedChecklist = checklist.map(item => {
            if (item.id === itemId) {
                // If completing the item, add timestamp
                // If unchecking, remove timestamp
                const newCompletedStatus = !item.completed;
                return {
                    ...item,
                    completed: newCompletedStatus,
                    completedAt: newCompletedStatus ? new Date().toISOString() : undefined
                };
            }
            return item;
        });

        // Update local state
        setChecklist(updatedChecklist);

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

        // Save to database
        if (crop && crop.id) {
            try {
                await updateCrop(crop.id, { checklist: updatedChecklist });
            } catch (error) {
                console.error("Error saving checklist to database:", error);
            }
        }
    };

    const calculateHarvestDate = (plantedDate: any, cropName: string) => {
        // Use Gemini API data if available, otherwise fall back to original logic
        if (harvestData && harvestData.formattedHarvestDate) {
            return harvestData.formattedHarvestDate;
        }

        if (!plantedDate || !plantedDate.toDate) return 'Unknown date';

        try {
            const baseDate = plantedDate.toDate();
            let daysToHarvest = 90; // Default

            if (cropName.toLowerCase().includes("rice")) {
                daysToHarvest = 120;
            } else if (cropName.toLowerCase().includes("corn")) {
                daysToHarvest = 100;
            }

            baseDate.setDate(baseDate.getDate() + daysToHarvest);
            return baseDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown date';
        }
    };

    // Calculate growth stage based on planting date
    const calculateGrowthStage = (plantedDate: any) => {
        // Use Gemini API data if available, otherwise fall back to original logic
        if (harvestData && harvestData.growthStage) {
            return harvestData.growthStage;
        }

        if (!plantedDate || !plantedDate.toDate) return 'Unknown';

        try {
            const planted = plantedDate.toDate();
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - planted.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 30) return 'Germination';
            if (diffDays < 60) return 'Vegetative';
            if (diffDays < 90) return 'Flowering';
            return 'Fruiting';
        } catch (e) {
            return 'Unknown';
        }
    };

    // Calculate productivity based on checklist completion
    const calculateProductivity = () => {
        if (checklist.length === 0) return 0;
        const completed = checklist.filter(item => item.completed).length;
        return Math.round((completed / checklist.length) * 100);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (!crop && !loading) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto p-4">
                    <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="text-center py-12">
                        <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Crop Not Found</h2>
                        <p className="text-muted-foreground mb-4">
                            The crop you're looking for doesn't exist or has been removed.
                        </p>
                        <Button onClick={() => navigate('/crop-history')}>
                            View All Crops
                        </Button>
                    </div>
                </div>
            </Layout>
        );
    }

    const growthStage = calculateGrowthStage(crop.plantedDate);
    const harvestDate = calculateHarvestDate(crop.plantedDate, crop.name);
    const productivity = calculateProductivity();
    const checklistProductivity = productivity;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header - Modified to match CropHistory styling */}

                <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Sprout className="h-6 w-6" />
                                    <h1 className="text-2xl font-bold">{crop.name} Details</h1>
                                </div>
                                <p className="text-primary-foreground/90">
                                    Detailed information and management tools for your {crop.name} crop.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Planting Date</p>
                                <p className="font-medium">
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
                        </div>
                    </div>

                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-success/10 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Capital</p>
                                <p className="font-medium">₱{Number(crop.puhunan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Leaf className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Growth Stage</p>
                                <p className="font-medium">{growthStage}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Sun className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Est. Harvest</p>
                                <p className="font-medium">{harvestDate}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-1 gap-6">
                    <EnhancedCropInfoCard crop={crop} />
                </div>

                <div className="grid lg:grid-cols-1 gap-6">
                    <GrowthInsightsCard
                        growthStage={growthStage}
                        harvestDate={harvestDate}
                        productivity={productivity}
                        scrollToMaintenance={() => {
                            if (maintenanceRef.current) {
                                maintenanceRef.current.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    />
                </div>

                <div className="grid lg:grid-cols-1 gap-6">
                    <EnhancedSalesForecastCard crop={crop} marketData={marketData} />
                </div>

                <div ref={maintenanceRef}>
                    <MaintenanceChecklistCard
                        checklist={checklist}
                        productivityData={productivityData}
                        checklistProductivity={checklistProductivity}
                        onToggleItem={toggleChecklistItem}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default CropDetails;
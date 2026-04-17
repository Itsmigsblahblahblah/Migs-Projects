import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowLeft, Sprout, Leaf, Calendar, Droplets, Sun, Activity, AlertTriangle, CheckCircle, XCircle, Wheat, TrendingUp, Package, MapPin, ArrowUp } from "lucide-react";
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
    detailedInstructions?: string[]; // Add detailed instructions property
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
    const [showScrollTop, setShowScrollTop] = useState(false); // Add state for FAB visibility
    const maintenanceRef = useRef<HTMLDivElement>(null);

    // Mock checklist data
    const generateChecklist = (cropName: string): ChecklistItem[] => {
        const baseItems: ChecklistItem[] = [
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
                // Create a clean item without undefined properties
                const newItem: ChecklistItem = {
                    id: postHarvestItem.id,
                    title: postHarvestItem.title,
                    completed: false,
                    category: postHarvestItem.category
                    // completedAt is optional and not included initially
                };
                return [...existingChecklist, newItem];
            }
        }

        return existingChecklist;
    };

    // Add scroll effect to detect when user scrolls down
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Function to update checklist item instructions
    const updateChecklistInstructions = async (itemId: string, instructions: string[]) => {
        const updatedChecklist = checklist.map(item => {
            if (item.id === itemId) {
                // Create a clean object without undefined properties
                const updatedItem: ChecklistItem = { ...item };

                // Only add detailedInstructions if it's not empty
                if (instructions && instructions.length > 0) {
                    updatedItem.detailedInstructions = instructions;
                } else {
                    // Remove the property if it's empty
                    delete updatedItem.detailedInstructions;
                }

                return updatedItem;
            }
            return item;
        });

        setChecklist(updatedChecklist);

        // Save to database
        if (crop && crop.id) {
            try {
                await updateCrop(crop.id, { checklist: updatedChecklist });
            } catch (error) {
                console.error("Error saving checklist instructions to database:", error);
            }
        }
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
                console.log('Crop data loaded:', cropData);
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

                    // Fetch all data in parallel to improve loading speed
                    const [harvestInfo, marketInsights] = await Promise.all([
                        // Fetch harvest estimate from Gemini API only if not already saved or if it was reset
                        (async () => {
                            console.log('Checking harvest data conditions:', {
                                hasPlantedDate: !!cropData.plantedDate,
                                hasHarvestData: !!cropData.harvestData,
                                harvestDataKeys: cropData.harvestData ? Object.keys(cropData.harvestData) : null
                            });
                            
                            if (cropData.plantedDate && (!cropData.harvestData || Object.keys(cropData.harvestData).length === 0)) {
                                try {
                                    const plantedDate = typeof cropData.plantedDate === 'string'
                                        ? new Date(cropData.plantedDate)
                                        : cropData.plantedDate.toDate
                                            ? cropData.plantedDate.toDate()
                                            : new Date(cropData.plantedDate);

                                    console.log('Calling getHarvestEstimate with:', {
                                        cropName: cropData.name,
                                        plantedDate: plantedDate,
                                        location: "Majayjay, Laguna"
                                    });

                                    const harvestInfo = await getHarvestEstimate(cropData.name, plantedDate, "Majayjay, Laguna");
                                    console.log('Harvest info received:', harvestInfo);

                                    // Save harvest data to crop record
                                    if (cropData.id) {
                                        await updateCrop(cropData.id, { harvestData: harvestInfo });
                                    }

                                    return harvestInfo;
                                } catch (error) {
                                    console.error("Error fetching harvest estimate:", error);
                                    return null;
                                }
                            } else if (cropData.harvestData) {
                                // Use existing harvest data
                                console.log('Using existing harvest data:', cropData.harvestData);
                                return cropData.harvestData;
                            } else {
                                // Reset harvest data if no conditions are met
                                console.log('No harvest data conditions met, returning null');
                                return null;
                            }
                        })(),
                        
                        // Fetch market demand data only if not already saved or if it's outdated
                        (async () => {
                            if (cropData.marketData) {
                                // Use existing market data
                                return cropData.marketData;
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

                                    return insights;
                                } catch (error) {
                                    console.error("Error fetching market data:", error);
                                    return null;
                                }
                            }
                        })()
                    ]);

                    // Update state with fetched data
                    console.log('Setting harvest data state:', harvestInfo);
                    setHarvestData(harvestInfo);
                    setMarketData(marketInsights);
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
                const updatedItem = {
                    ...item,
                    completed: newCompletedStatus,
                };

                // Only add completedAt if completing the item, don't add undefined values
                if (newCompletedStatus) {
                    updatedItem.completedAt = new Date().toISOString();
                }

                return updatedItem;
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
        console.log('Calculating harvest date with:', { harvestData, plantedDate, cropName });
        
        // Use Gemini API data if available, otherwise fall back to original logic
        if (harvestData && (harvestData.formattedHarvestDate || harvestData.estimatedHarvestDate)) {
          const harvestDateStr = harvestData.formattedHarvestDate || 
                                (harvestData.estimatedHarvestDate ? 
                                  new Date(harvestData.estimatedHarvestDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) : 
                                  null);
          
          if (harvestDateStr) {
            console.log('Using harvest date from API:', harvestDateStr);
            const harvestDate = new Date(harvestDateStr);
            
            // Handle invalid date
            if (!isNaN(harvestDate.getTime())) {
              return harvestDateStr;
            } else {
              console.log('Invalid harvest date from API, falling back to manual calculation');
            }
          } else {
            console.log('No valid harvest date found in harvestData');
          }
        }
        
        if (!plantedDate || !plantedDate.toDate) {
          console.log('No plantedDate available, returning Unknown date');
          return 'Unknown date';
        }
        
        try {
          const baseDate = plantedDate.toDate ? plantedDate.toDate() : new Date(plantedDate);
          let daysToHarvest = 90; // Default
      
          if (cropName.toLowerCase().includes("rice")) {
            daysToHarvest = 120;
          } else if (cropName.toLowerCase().includes("corn")) {
            daysToHarvest = 100;
          }
      
          baseDate.setDate(baseDate.getDate() + daysToHarvest);
          const result = baseDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
      
          console.log('Calculated harvest date:', result);
          return result;
        } catch (e) {
          console.error('Error calculating harvest date:', e);
          return 'Unknown date';
        }
      };

    // Calculate harvest date range (earlier date - harvest date)
    const calculateHarvestDateRange = (plantedDate: any, cropName: string) => {
        console.log('Calculating harvest date range with:', { harvestData, plantedDate, cropName });
        
        // Use Gemini API data if available, otherwise fall back to original logic
        if (harvestData && (harvestData.formattedHarvestDate || harvestData.estimatedHarvestDate)) {
          // If we have a specific harvest date from API, calculate range based on crop type
          const harvestDateStr = harvestData.formattedHarvestDate || 
                                (harvestData.estimatedHarvestDate ? 
                                  new Date(harvestData.estimatedHarvestDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  }) : 
                                  null);
          
          if (!harvestDateStr) {
            console.log('No valid harvest date found in harvestData');
            // Fall back to manual calculation
          } else {
            console.log('Using harvest date from API:', harvestDateStr);
            const harvestDate = new Date(harvestDateStr);
            
            // Handle invalid date
            if (isNaN(harvestDate.getTime())) {
              console.log('Invalid harvest date from API, falling back to manual calculation');
            } else {
              // Calculate earlier date based on crop type (minimum 30 days before harvest)
              let daysBeforeHarvest = 30; // Minimum 30 days
              
              // For crops with longer growing periods, use a larger range
              if (cropName.toLowerCase().includes("rice")) {
                daysBeforeHarvest = 45; // 1.5 months for rice
              } else if (cropName.toLowerCase().includes("corn")) {
                daysBeforeHarvest = 40; // ~1.3 months for corn
              } else if (cropName.toLowerCase().includes("tomato")) {
                daysBeforeHarvest = 35; // ~1.2 months for tomato
              } else if (cropName.toLowerCase().includes("pechay") || cropName.toLowerCase().includes("lettuce")) {
                daysBeforeHarvest = 30; // Exactly 1 month for leafy vegetables
              }
              
              const earlierDate = new Date(harvestDate);
              earlierDate.setDate(earlierDate.getDate() - daysBeforeHarvest);
              
              // Format both dates
              const earlierDateStr = earlierDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              
              return `${earlierDateStr} – ${harvestDateStr}`;
            }
          }
        }
        
        if (!plantedDate || !plantedDate.toDate) {
          console.log('No plantedDate available, returning Unknown date');
          return 'Unknown date';
        }
        
        try {
          const baseDate = plantedDate.toDate ? plantedDate.toDate() : new Date(plantedDate);
          let daysToHarvest = 90; // Default
          
          // Determine crop-specific harvest time
          if (cropName.toLowerCase().includes("rice")) {
            daysToHarvest = 120;
          } else if (cropName.toLowerCase().includes("corn")) {
            daysToHarvest = 100;
          } else if (cropName.toLowerCase().includes("tomato")) {
            daysToHarvest = 85;
          } else if (cropName.toLowerCase().includes("pechay") || cropName.toLowerCase().includes("lettuce")) {
            daysToHarvest = 45;
          }
          
          // Calculate harvest date
          const harvestDate = new Date(baseDate);
          harvestDate.setDate(harvestDate.getDate() + daysToHarvest);
          
          // Calculate earlier date (minimum 30 days before harvest)
          let daysBeforeHarvest = 30; // Minimum 30 days
          
          // For crops with longer growing periods, use a larger range
          if (cropName.toLowerCase().includes("rice")) {
            daysBeforeHarvest = 45; // 1.5 months for rice
          } else if (cropName.toLowerCase().includes("corn")) {
            daysBeforeHarvest = 40; // ~1.3 months for corn
          } else if (cropName.toLowerCase().includes("tomato")) {
            daysBeforeHarvest = 35; // ~1.2 months for tomato
          } else if (cropName.toLowerCase().includes("pechay") || cropName.toLowerCase().includes("lettuce")) {
            daysBeforeHarvest = 30; // Exactly 1 month for leafy vegetables
          }
          
          const earlierDate = new Date(harvestDate);
          earlierDate.setDate(earlierDate.getDate() - daysBeforeHarvest);
          
          // Format both dates
          const earlierDateStr = earlierDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          const harvestDateStr = harvestDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          console.log('Calculated date range:', `${earlierDateStr} – ${harvestDateStr}`);
          return `${earlierDateStr} – ${harvestDateStr}`;
        } catch (e) {
          console.error('Error calculating harvest date range:', e);
          return 'Unknown date';
        }
      };

    // Calculate growth stage based on checklist completion
    const calculateGrowthStage = (plantedDate: any, checklistItems: ChecklistItem[]) => {
        if (!checklistItems || checklistItems.length === 0) return 'Preparation';

        try {
            // Count completed items per category
            const categories = ['Preparation', 'Planting', 'Maintenance', 'Harvesting', 'Post-Harvest'];
            const categoryProgress = categories.map(category => {
                const itemsInCategory = checklistItems.filter(item => item.category === category);
                const completedItems = itemsInCategory.filter(item => item.completed);
                return {
                    category,
                    total: itemsInCategory.length,
                    completed: completedItems.length,
                    percentage: itemsInCategory.length > 0 ? (completedItems.length / itemsInCategory.length) * 100 : 0
                };
            });

            // Determine current stage based on completion
            // If all Post-Harvest items are completed
            const postHarvest = categoryProgress.find(c => c.category === 'Post-Harvest');
            if (postHarvest && postHarvest.percentage === 100) {
                return 'Post-Harvest';
            }

            // If all Harvesting items are completed
            const harvesting = categoryProgress.find(c => c.category === 'Harvesting');
            if (harvesting && harvesting.percentage === 100) {
                return 'Harvesting';
            }

            // If all Maintenance items are completed
            const maintenance = categoryProgress.find(c => c.category === 'Maintenance');
            if (maintenance && maintenance.percentage === 100) {
                return 'Harvesting';
            }

            // If all Planting items are completed
            const planting = categoryProgress.find(c => c.category === 'Planting');
            if (planting && planting.percentage === 100) {
                return 'Maintenance';
            }

            // If all Preparation items are completed
            const preparation = categoryProgress.find(c => c.category === 'Preparation');
            if (preparation && preparation.percentage === 100) {
                return 'Planting';
            }

            // Default to Preparation if nothing is completed yet
            return 'Preparation';
        } catch (e) {
            return 'Preparation';
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
                    <span className="ml-2">Loading crop details...</span>
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

    const growthStage = calculateGrowthStage(crop.plantedDate, checklist);
    const harvestDate = calculateHarvestDate(crop.plantedDate, crop.name);
    const harvestDateRange = calculateHarvestDateRange(crop.plantedDate, crop.name);
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Leaf className="h-5 w-5 text-green-500" />
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
                                <p className="font-medium">{harvestDateRange}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <EnhancedCropInfoCard crop={crop} />
                </div>

                <div className="w-full">
                    <GrowthInsightsCard
                        growthStage={growthStage}
                        harvestDate={harvestDateRange}
                        productivity={productivity}
                        scrollToMaintenance={() => {
                            if (maintenanceRef.current) {
                                maintenanceRef.current.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    />
                </div>

                <div className="w-full">
                    <EnhancedSalesForecastCard crop={crop} />
                </div>

                <div className="w-full" ref={maintenanceRef}>
                    <MaintenanceChecklistCard
                        checklist={checklist}
                        productivityData={productivityData}
                        checklistProductivity={checklistProductivity}
                        onToggleItem={toggleChecklistItem}
                        onUpdateInstructions={updateChecklistInstructions}
                        cropName={crop.name}
                    />
                </div>

                {/* Floating Action Button for scrolling to top */}
                {showScrollTop && (
                    <Button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-20 right-6 h-12 w-12 rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-all duration-300 ease-in-out transform hover:scale-110 z-50"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp className="h-5 w-5 text-primary-foreground" />
                    </Button>
                )}
            </div>
        </Layout>
    );
};

export default CropDetails;
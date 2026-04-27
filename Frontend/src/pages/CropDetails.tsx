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
    completedAt?: any; // Timestamp for completion (can be string or Firestore Timestamp)
    detailedInstructions?: string[]; // Add detailed instructions property
}

const CropDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCropById, updateCrop, loadCrops, loadSingleCrop } = useCrops();
    const getCropByIdRef = useRef(getCropById);
    const loadCropsRef = useRef(loadCrops);
    const loadSingleCropRef = useRef(loadSingleCrop);
    
    // Keep refs updated
    useEffect(() => {
        getCropByIdRef.current = getCropById;
        loadCropsRef.current = loadCrops;
        loadSingleCropRef.current = loadSingleCrop;
    }, [getCropById, loadCrops, loadSingleCrop]);
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

    // Background API fetch functions (non-blocking)
    const fetchHarvestDataInBackground = async (cropData: any) => {
        if (!cropData.plantedDate) {
            console.log('[CropDetails-Harvest] No planted date, skipping');
            return;
        }
        
        // Use cached data if available
        if (cropData.harvestData && Object.keys(cropData.harvestData).length > 0) {
            console.log('[CropDetails-Harvest] Using cached harvest data');
            setHarvestData(cropData.harvestData);
            return;
        }
        
        // Fetch from API
        console.log('[CropDetails-Harvest] Fetching harvest estimate...');
        try {
            const plantedDate = typeof cropData.plantedDate === 'string'
                ? new Date(cropData.plantedDate)
                : cropData.plantedDate.toDate
                    ? cropData.plantedDate.toDate()
                    : new Date(cropData.plantedDate);
            
            const harvestInfo = await getHarvestEstimate(cropData.name, plantedDate, "Majayjay, Laguna");
            console.log('[CropDetails-Harvest] Data received');
            setHarvestData(harvestInfo);
            
            // Save to Firestore (non-blocking)
            if (cropData.id) {
                updateCrop(cropData.id, { harvestData: harvestInfo })
                    .catch((err: any) => console.error('[CropDetails-Harvest] Save error:', err));
            }
        } catch (error: any) {
            console.error('[CropDetails-Harvest] Error:', error.message || error);
            setHarvestData(null);
        }
    };
    
    const fetchMarketDataInBackground = async (cropData: any) => {
        // Use cached data if available
        if (cropData.marketData) {
            console.log('[CropDetails-Market] Using cached market data');
            setMarketData(cropData.marketData);
            return;
        }
        
        // Fetch from API
        console.log('[CropDetails-Market] Fetching market insights...');
        try {
            const insights = await getCropInsights(
                cropData.name,
                cropData.soilType,
                cropData.landArea,
                cropData.puhunan
            );
            console.log('[CropDetails-Market] Data received');
            setMarketData(insights);
            
            // Save to Firestore (non-blocking)
            if (cropData.id) {
                updateCrop(cropData.id, { marketData: insights })
                    .catch((err: any) => console.error('[CropDetails-Market] Save error:', err));
            }
        } catch (error: any) {
            console.error('[CropDetails-Market] Error:', error.message || error);
            setMarketData(null);
        }
    };

    useEffect(() => {
        console.log('[CropDetails] useEffect triggered, id:', id);
        let isMounted = true; // Track if component is still mounted

        const fetchCrop = async () => {
            console.log('[CropDetails] Starting fetchCrop...');
            
            if (!id) {
                console.log('[CropDetails] No ID provided, setting loading to false');
                if (isMounted) setLoading(false);
                return;
            }

            try {
                // OPTIMIZATION: Try to get crop from cache first for instant loading
                const userId = localStorage.getItem('userId');
                if (userId) {
                    const cacheKey = `crops_${userId}`;
                    const cachedCrops = localStorage.getItem(cacheKey);
                    if (cachedCrops) {
                        try {
                            const parsedCrops = JSON.parse(cachedCrops);
                            const cacheAge = Date.now() - (parsedCrops._timestamp || 0);
                            // Use cache if less than 5 minutes old
                            if (cacheAge < 5 * 60 * 1000) {
                                console.log('[CropDetails] Using cached crops for instant load');
                                const cachedCrop = parsedCrops.crops?.find((c: any) => c.id === id);
                                if (cachedCrop && isMounted) {
                                    console.log('[CropDetails] Found crop in cache, displaying immediately');
                                    setCrop(cachedCrop);
                                    setCropsLoaded(true);
                                    
                                    // Load checklist from cache or generate new one
                                    let loadedChecklist: ChecklistItem[] = [];
                                    if (cachedCrop.checklist && cachedCrop.checklist.length > 0) {
                                        loadedChecklist = ensureCompleteChecklist(cachedCrop.checklist, cachedCrop.name);
                                    } else {
                                        loadedChecklist = generateChecklist(cachedCrop.name);
                                    }
                                    
                                    setChecklist(loadedChecklist);
                                    
                                    // Initialize productivity data
                                    const initialData = loadedChecklist.map(item => ({
                                        task: item.title,
                                        productivity: item.completed ? 100 : 0
                                    }));
                                    
                                    const completed = loadedChecklist.filter(item => item.completed).length;
                                    const total = loadedChecklist.length;
                                    const overallProductivity = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    
                                    initialData.push({
                                        task: "Overall Progress",
                                        productivity: overallProductivity
                                    });
                                    
                                    setProductivityData(initialData);
                                    
                                    // Hide loading immediately - show UI with cached data
                                    console.log('[CropDetails] Setting loading=false after cache load');
                                    setLoading(false);
                                    
                                    // Fetch fresh data in background ONLY ONCE (not on every render)
                                    if (!cropsLoaded) {
                                        console.log('[CropDetails] Loading fresh crop data in background (one-time)...');
                                        loadSingleCropRef.current(id).then((freshCrop) => {
                                            console.log('[CropDetails] Fresh crop loaded in background');
                                            console.log('[CropDetails] Fresh crop adminData:', freshCrop?.adminData);
                                            // After fresh load, update UI
                                            if (isMounted && freshCrop) {
                                                console.log('[CropDetails] Fresh data loaded, updating UI');
                                                setCrop(freshCrop);
                                                
                                                // Update checklist if needed
                                                if (freshCrop.checklist && freshCrop.checklist.length > 0) {
                                                    const updatedChecklist = ensureCompleteChecklist(freshCrop.checklist, freshCrop.name);
                                                    setChecklist(updatedChecklist);
                                                    
                                                    const updatedProductivityData = updatedChecklist.map(item => ({
                                                        task: item.title,
                                                        productivity: item.completed ? 100 : 0
                                                    }));
                                                    
                                                    const updatedCompleted = updatedChecklist.filter(item => item.completed).length;
                                                    const updatedTotal = updatedChecklist.length;
                                                    const updatedOverallProductivity = updatedTotal > 0 ? Math.round((updatedCompleted / updatedTotal) * 100) : 0;
                                                    
                                                    updatedProductivityData.push({
                                                        task: "Overall Progress",
                                                        productivity: updatedOverallProductivity
                                                    });
                                                    
                                                    setProductivityData(updatedProductivityData);
                                                }
                                            }
                                        }).catch(err => console.error('[CropDetails] Error loading fresh crop:', err));
                                        
                                        // Mark as loaded to prevent re-fetching
                                        setCropsLoaded(true);
                                    }
                                    
                                    // Now fetch harvest and market data in background
                                    const cropData = getCropByIdRef.current(id) || cachedCrop;
                                    
                                    const fetchHarvestData = async () => {
                                        if (!isMounted) return;
                                        
                                        console.log('[CropDetails-Harvest] Checking harvest data conditions:', {
                                            hasPlantedDate: !!cropData.plantedDate,
                                            hasHarvestData: !!cropData.harvestData,
                                            harvestDataKeys: cropData.harvestData ? Object.keys(cropData.harvestData) : null
                                        });
                                        
                                        // SKIP API CALL if harvest data already exists in Firestore
                                        if (cropData.harvestData && Object.keys(cropData.harvestData).length > 0) {
                                            console.log('[CropDetails-Harvest] ✅ Using cached harvest data from Firestore - SKIP API CALL');
                                            if (isMounted) setHarvestData(cropData.harvestData);
                                            return;
                                        }
                                        
                                        // Only fetch if NO harvest data exists
                                        if (cropData.plantedDate) {
                                            let timeoutId: any = null;
                                            
                                            try {
                                                console.log('[CropDetails-Harvest] Fetching new harvest estimate (first time only)...');
                                                const plantedDate = typeof cropData.plantedDate === 'string'
                                                    ? new Date(cropData.plantedDate)
                                                    : cropData.plantedDate.toDate
                                                        ? cropData.plantedDate.toDate()
                                                        : new Date(cropData.plantedDate);

                                                const controller = new AbortController();
                                                timeoutId = setTimeout(() => controller.abort(), 15000);
                                                
                                                console.log('[CropDetails-Harvest] Calling getHarvestEstimate with timeout...');
                                                const harvestInfo = await getHarvestEstimate(cropData.name, plantedDate, "Majayjay, Laguna");
                                                clearTimeout(timeoutId);
                                                console.log('[CropDetails-Harvest] Harvest info received');

                                                if (cropData.id && isMounted) {
                                                    console.log('[CropDetails-Harvest] Saving harvest data to Firestore');
                                                    await updateCrop(cropData.id, { harvestData: harvestInfo });
                                                }

                                                if (isMounted) {
                                                    console.log('[CropDetails-Harvest] Setting harvest data state');
                                                    setHarvestData(harvestInfo);
                                                }
                                            } catch (error: any) {
                                                if (timeoutId) clearTimeout(timeoutId);
                                                console.error("[CropDetails-Harvest] Error fetching harvest estimate:", error);
                                                if (isMounted) setHarvestData(null);
                                            }
                                        } else {
                                            console.log('[CropDetails-Harvest] No planted date available');
                                        }
                                    };
                                    
                                    const fetchMarketData = async () => {
                                        if (!isMounted) return;
                                        
                                        if (cropData.marketData) {
                                            console.log('[CropDetails-Market] ✅ Using cached marketData from Firestore - SKIP API CALL');
                                            if (isMounted) setMarketData(cropData.marketData);
                                            return;
                                        }
                                        
                                        console.log('[CropDetails-Market] Fetching fresh market data (first time only)...');
                                        
                                        let timeoutId: any = null;
                                        
                                        try {
                                            const controller = new AbortController();
                                            timeoutId = setTimeout(() => controller.abort(), 15000);
                                            
                                            console.log('[CropDetails-Market] Calling getCropInsights with timeout...');
                                            const insights = await getCropInsights(
                                                cropData.name,
                                                cropData.soilType,
                                                cropData.landArea,
                                                cropData.puhunan
                                            );
                                            clearTimeout(timeoutId);
                                            console.log('[CropDetails-Market] Market data received');

                                            if (cropData.id && isMounted) {
                                                console.log('[CropDetails-Market] Saving market data to Firestore');
                                                await updateCrop(cropData.id, { marketData: insights });
                                            }

                                            if (isMounted) {
                                                console.log('[CropDetails-Market] Setting market data state');
                                                setMarketData(insights);
                                            }
                                        } catch (error: any) {
                                            if (timeoutId) clearTimeout(timeoutId);
                                            console.error("[CropDetails-Market] Error fetching market data:", error);
                                            if (isMounted) setMarketData(null);
                                        }
                                    };
                                    
                                    Promise.allSettled([
                                        fetchHarvestData(),
                                        fetchMarketData()
                                    ]).then(results => {
                                        console.log('[CropDetails] Background data fetching completed:', results);
                                    }).catch(error => {
                                        console.error('[CropDetails] Error in background data fetching:', error);
                                    });
                                    
                                    return; // Exit early - we already loaded from cache
                                }
                            }
                        } catch (e) {
                            console.log('[CropDetails] Cache parse error:', e);
                        }
                    }
                }
                
                // Fallback: If no cache or crop not in cache, load from Firestore
                console.log('[CropDetails] No valid cache, loading from Firestore...');
                
                // Load ONLY THIS CROP from Firestore (not all crops)
                console.log('[CropDetails] Loading single crop directly from Firestore...');
                const freshCrop = await loadSingleCropRef.current(id);
                
                if (!freshCrop) {
                    console.log('[CropDetails] Crop not found in Firestore, exiting');
                    if (isMounted) setLoading(false);
                    return;
                }

                console.log('[CropDetails] Crop data retrieved:', freshCrop.name);
                
                // Display crop data IMMEDIATELY
                if (isMounted) {
                    console.log('[CropDetails] Setting crop data and checklist...');
                    setCrop(freshCrop);

                    let loadedChecklist: ChecklistItem[] = [];
                    if (freshCrop.checklist && freshCrop.checklist.length > 0) {
                        console.log('[CropDetails] Using existing checklist');
                        loadedChecklist = ensureCompleteChecklist(freshCrop.checklist, freshCrop.name);

                        const originalLength = freshCrop.checklist.length;
                        const newLength = loadedChecklist.length;
                        if (newLength > originalLength) {
                            console.log('[CropDetails] Saving updated checklist');
                            try {
                                await updateCrop(freshCrop.id, { checklist: loadedChecklist });
                            } catch (error) {
                                console.error("[CropDetails] Error saving updated checklist:", error);
                            }
                        }
                    } else {
                        console.log('[CropDetails] Generating new checklist');
                        loadedChecklist = generateChecklist(freshCrop.name);
                    }
                    
                    if (isMounted) {
                        setChecklist(loadedChecklist);

                        const initialData = loadedChecklist.map(item => ({
                            task: item.title,
                            productivity: item.completed ? 100 : 0
                        }));

                        const completed = loadedChecklist.filter(item => item.completed).length;
                        const total = loadedChecklist.length;
                        const overallProductivity = total > 0 ? Math.round((completed / total) * 100) : 0;

                        initialData.push({
                            task: "Overall Progress",
                            productivity: overallProductivity
                        });

                        setProductivityData(initialData);
                        
                        // CRITICAL: Hide loading NOW so page renders
                        console.log('[CropDetails] Setting loading=false, page will render immediately');
                        setLoading(false);
                    }

                    // Fetch API data in BACKGROUND (non-blocking)
                    console.log('[CropDetails] Starting background API fetch...');
                    fetchHarvestDataInBackground(freshCrop);
                    fetchMarketDataInBackground(freshCrop);
                }
            } catch (error: any) {
                console.error("[CropDetails] Error fetching crop:", error);
                console.error("[CropDetails] Error details:", {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
            } finally {
                console.log('[CropDetails] FetchCrop completed, setting loading to false');
                if (isMounted) setLoading(false);
            }
        };

        fetchCrop();
        
        return () => {
            console.log('[CropDetails] Cleanup - component unmounting');
            isMounted = false;
        };
    }, [id]); // Only re-run when crop ID changes, not when getCropById or loadCrops change

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
    
    // Check if all Maintenance items are completed
    const maintenanceItems = checklist.filter(item => item.category === 'Maintenance');
    const allMaintenanceCompleted = maintenanceItems.length > 0 && maintenanceItems.every(item => item.completed);
    
    // Get the date of the last completed Maintenance item
    const getLastMaintenanceDate = () => {
        if (!allMaintenanceCompleted || maintenanceItems.length === 0) return null;
        
        // Find all completed maintenance items with dates
        const completedWithDates = maintenanceItems.filter(item => 
            item.completed && item.completedAt
        );
        
        if (completedWithDates.length === 0) return null;
        
        // Get the latest completed date
        const latestDate = completedWithDates.reduce((latest, item) => {
            let itemDate: Date;
            if (typeof item.completedAt === 'string') {
                itemDate = new Date(item.completedAt);
            } else if (item.completedAt?.toDate) {
                itemDate = item.completedAt.toDate();
            } else if (item.completedAt instanceof Date) {
                itemDate = item.completedAt;
            } else {
                itemDate = new Date(0);
            }
            return itemDate > latest ? itemDate : latest;
        }, new Date(0));
        
        return latestDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    
    const lastMaintenanceDate = getLastMaintenanceDate();
    
    // Use actual harvest date if all maintenance is completed, otherwise use estimated
    const harvestDateRange = allMaintenanceCompleted && lastMaintenanceDate 
        ? lastMaintenanceDate 
        : calculateHarvestDateRange(crop.plantedDate, crop.name);
    
    const harvestLabel = allMaintenanceCompleted ? 'Actual Harvest' : 'Est. Harvest';
    
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
                                <p className="text-sm text-muted-foreground">{harvestLabel}</p>
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
                        harvestDate={harvestLabel === 'Actual Harvest' ? `${harvestLabel}: ${harvestDateRange}` : harvestDateRange}
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
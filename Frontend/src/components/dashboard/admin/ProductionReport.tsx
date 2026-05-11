import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ChevronLeft, ChevronRight, Wheat, Calendar, TrendingUp, Filter, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import StatsCard from "@/components/shared/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { getCachedProductionData, setCachedProductionData } from "@/services/productionReportCache";
import { getCachedCropInsights } from "@/services/cropInsightsCache";
import { getCropInsights } from "@/services/cropDataService";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ProductionRecord {
    id: string;
    farmerName: string;
    barangay: string;
    harvestedCrop: string;
    quantity: number;
    unit: string;
    harvestDate: string;
    landArea: number;
    yield: number;
}

interface Farmer {
    uid: string;
    fullName: string;
    homeAddress?: string;
    farmAddress?: string;
}

interface Crop {
    id: string;
    userId: string;
    name: string;
    landArea: number;
    plantedDate: any;
    puhunan: number;
    createdAt: any;
    harvestData?: any;
    status?: string;
}

interface ProductionReportProps {
    onExport: () => void;
}

const ProductionReport = ({ onExport }: ProductionReportProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [productionData, setProductionData] = useState<ProductionRecord[]>([]);
    // Initialize loading state based on whether cached data exists
    const [loading, setLoading] = useState(() => {
        // Check if valid cache exists on mount
        const cachedData = sessionStorage.getItem('production_report_data');
        const cacheTimestamp = sessionStorage.getItem('production_report_timestamp');
        if (cachedData && cacheTimestamp) {
            const age = Date.now() - parseInt(cacheTimestamp);
            if (age < 30 * 60 * 1000) {
                // Valid cache exists - don't show loading
                return false;
            }
        }
        // No valid cache - need to fetch, show loading
        return true;
    });
    const recordsPerPage = 10;

    // Filter states
    const [selectedCrop, setSelectedCrop] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedWeek, setSelectedWeek] = useState<string>('all');

    // Export dialog state
    const [showExportDialog, setShowExportDialog] = useState(false);

    // Local export function for Production Report only
    const handleExportProduction = (exportType: 'page' | 'all') => {
        if (productionData.length === 0) {
            return;
        }

        // Determine which data to export
        const dataToExport = exportType === 'page' 
            ? visibleRecords.map(record => ({
                'Farmer Name': record.farmerName,
                'Farm Address': record.barangay,
                'Harvested Crop': record.harvestedCrop,
                'Land Area (ha)': record.landArea,
                'Est. Yield Harvest (kg)': record.quantity,
                'Harvest Date': new Date(record.harvestDate).toLocaleDateString()
            }))
            : filteredData.map(record => ({
                'Farmer Name': record.farmerName,
                'Farm Address': record.barangay,
                'Harvested Crop': record.harvestedCrop,
                'Land Area (ha)': record.landArea,
                'Est. Yield Harvest (kg)': record.quantity,
                'Harvest Date': new Date(record.harvestDate).toLocaleDateString()
            }));

        if (dataToExport.length === 0) {
            return;
        }

        // Convert to CSV
        const headers = Object.keys(dataToExport[0]);
        const csv = [
            headers.join(','),
            ...dataToExport.map(row =>
                headers.map(header => JSON.stringify(row[header] || '')).join(',')
            )
        ].join('\n');

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = exportType === 'page'
            ? `production_report_page${currentPage}_${new Date().toISOString().split('T')[0]}.csv`
            : `production_report_all_pages_${new Date().toISOString().split('T')[0]}.csv`;
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        // Close dialog
        setShowExportDialog(false);
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCrop, selectedYear, selectedMonth, selectedWeek]);

    // Color palette for crop bar chart (same as Problem Type Distribution)
    const CROP_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

    // Fetch production data from Firestore with session caching
    useEffect(() => {
        const fetchProductionData = async () => {
            // Check if data is already cached in sessionStorage
            const cachedData = sessionStorage.getItem('production_report_data');
            const cacheTimestamp = sessionStorage.getItem('production_report_timestamp');
            
            // Use cached data if less than 30 minutes old (session-based caching)
            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < 30 * 60 * 1000) { // 30 minutes cache
                    console.log('[ProductionReport] ✅ Using cached data (age:', Math.round(age / 1000), 's)');
                    setProductionData(JSON.parse(cachedData));
                    setLoading(false); // Ensure loading is FALSE - data exists
                    
                    // If cache is older than 5 minutes, silently refresh in background
                    if (age > 5 * 60 * 1000) {
                        console.log('[ProductionReport] 🔄 Cache >5min old, will silently refresh...');
                        // Continue to fetch below, but DON'T set loading=true (keep showing cached data)
                    } else {
                        // Fresh cache (<5min), no refresh needed
                        return;
                    }
                } else {
                    // Cache expired - clear it
                    console.log('[ProductionReport] ⚠️ Cache expired, clearing and fetching fresh data...');
                    sessionStorage.removeItem('production_report_data');
                    sessionStorage.removeItem('production_report_timestamp');
                }
            } else {
                // No cache at all
                console.log('[ProductionReport] 🆕 No cache found, fetching data...');
            }
            
            // Fetch fresh data from Firestore
            console.log('[ProductionReport] Fetching from Firestore...');
            
            try {
                // FORCE CLEAR ALL CACHES only on fresh fetch (not on silent refresh)
                // This ensures each farmer gets their own specific yield calculation
                if (!cachedData || !cacheTimestamp || (Date.now() - parseInt(cacheTimestamp) >= 30 * 60 * 1000)) {
                    console.log('[ProductionReport] 🗑️ Clearing ALL caches for fresh calculations...');
                    const { clearAllCropCaches } = await import('@/services/cropDataService');
                    clearAllCropCaches();
                }
                
                // Step 1: Fetch all farmers
                const farmersRef = collection(db, "farmers");
                const farmersSnapshot = await getDocs(farmersRef);
                console.log('[ProductionReport] Total farmers found:', farmersSnapshot.size);
                
                const records: ProductionRecord[] = [];
                
                // Step 2: For EACH farmer, fetch their crops (like Farmer Profile page)
                for (const farmerDoc of farmersSnapshot.docs) {
                    const farmerId = farmerDoc.id;
                    const farmerData = farmerDoc.data();
                    const farmerName = farmerData.fullName || 'Unknown Farmer';
                    
                    // Debug: Log farmer data to see what fields are available
                    console.log(`[ProductionReport] Farmer data for ${farmerName}:`, {
                        farmAddress: farmerData.farmAddress,
                        homeAddress: farmerData.homeAddress
                    });
                    
                    // Use farmAddress first (for location of farm), then homeAddress as fallback
                    const barangay = farmerData.farmAddress || farmerData.homeAddress || 'Unknown Barangay';
                    
                    console.log(`[ProductionReport] Fetching crops for farmer: ${farmerName} (${farmerId})`);
                    
                    // Fetch this farmer's crops (same as FarmerDetailPage)
                    const cropsRef = collection(db, "farmerCrops");
                    const cropsQuery = query(cropsRef, where("userId", "==", farmerId));
                    const cropsSnapshot = await getDocs(cropsQuery);
                    
                    console.log(`[ProductionReport]   Total crops for ${farmerName}:`, cropsSnapshot.size);
                    
                    // Step 3: Check each crop for post-harvest status
                    for (const cropDoc of cropsSnapshot.docs) {
                        const cropData = cropDoc.data();
                        const status = cropData.status;
                        
                        console.log(`[ProductionReport]     Crop: ${cropData.name}`);
                        console.log(`[ProductionReport]       Status in Firestore: "${status}"`);
                        console.log(`[ProductionReport]       Has checklist: ${!!cropData.checklist}`);
                        console.log(`[ProductionReport]       plantedDate:`, cropData.plantedDate);
                        console.log(`[ProductionReport]       landArea:`, cropData.landArea);
                        console.log(`[ProductionReport]       puhunan (investment):`, cropData.puhunan);
                        
                        // Check if crop is post-harvest using dynamic status (from checklist completion)
                        const isPostHarvest = (() => {
                            // If status is explicitly set to post-harvest or harvested in Firestore
                            if (status === 'post-harvest' || status === 'harvested') {
                                return true;
                            }
                            
                            // Check if all Maintenance checklist items are completed
                            const checklist = cropData.checklist;
                            if (checklist && checklist.length > 0) {
                                const maintenanceItems = checklist.filter((item: any) => item.category === 'Maintenance');
                                if (maintenanceItems.length > 0 && maintenanceItems.every((item: any) => item.completed)) {
                                    return true; // All maintenance completed = ready for post-harvest
                                }
                            }
                            
                            return false;
                        })();
                        
                        if (isPostHarvest) {
                            console.log(`[ProductionReport]       ✓ INCLUDING - Crop is post-harvest (status: "${status}", maintenance: complete)`);
                            
                            const landArea = cropData.landArea || 1;
                            const userInvestment = cropData.puhunan || 0;
                            const soilType = cropData.soilType || 'Loam';
                            const userId = cropData.userId || 'unknown';
                            
                            console.log(`[ProductionReport]       ========================================`);
                            console.log(`[ProductionReport]       FARMER: ${farmerName}`);
                            console.log(`[ProductionReport]       Crop: ${cropData.name}`);
                            console.log(`[ProductionReport]       User ID: ${userId}`);
                            console.log(`[ProductionReport]       Land Area: ${landArea} hectares`);
                            console.log(`[ProductionReport]       Investment (Puhunan): ₱${userInvestment.toLocaleString()}`);
                            console.log(`[ProductionReport]       Soil Type: ${soilType}`);
                            console.log(`[ProductionReport]       ========================================`);
                            
                            // PRODUCTION REPORT - Use EXACT SAME calculation as EnhancedSalesForecastCard
                            // Always fetch insights to ensure we get the ACTUAL values (not estimates)
                            // This ensures Admin sees EXACTLY what Farmer sees
                            
                            // ALWAYS calculate fresh for each crop (don't use cache for yield calculation)
                            // This ensures each farmer gets THEIR specific yield based on their investment
                            console.log(`[ProductionReport]       🔄 STARTING fresh calculation for: ${cropData.name} (${farmerName})`);
                            
                            let estimatedYield: number;
                            
                            try {
                                // CRITICAL: First check if crop has actual harvest data from farmer
                                // This ensures Admin sees EXACTLY the same value as Farmer's "Est. Yield Harvest"
                                if (cropData.harvestData && cropData.harvestData.estimatedYield) {
                                    // Use ACTUAL yield from farmer (no calculation needed)
                                    estimatedYield = cropData.harvestData.estimatedYield;
                                    console.log(`[ProductionReport]       ✅ Using ACTUAL farmer yield from harvestData:`, {
                                        farmerName: farmerName,
                                        userId: userId,
                                        cropName: cropData.name,
                                        actualYield: estimatedYield,
                                        unit: 'kg',
                                        note: 'This is the SAME value the farmer sees'
                                    });
                                } else {
                                    // Fallback: Calculate yield only if no harvest data exists
                                    console.log(`[ProductionReport]       ⚠️ No harvestData, calculating yield...`);
                                    
                                    // CRITICAL: Use getCropInsights (same as Farmer) to get consistent calculation
                                    // This ensures Admin sees EXACTLY the same value as Farmer
                                    const cropInsights = await getCropInsights(
                                        cropData.name,
                                        soilType,
                                        landArea,
                                        userInvestment
                                    );
                                    
                                    // Get BASE yield and suggested capital from insights
                                    const baseYield = cropInsights?.profit?.estimatedYield || 0;
                                    const suggestedCapital = cropInsights?.profit?.suggestedCapital || 0;
                                    
                                    // EXACT SAME FORMULA as EnhancedSalesForecastCard (lines 158-160)
                                    // This ensures Production Report matches Farmer's Est. Yield Harvest exactly
                                    const calculatedYield = userInvestment === 0 ? 0 :
                                        baseYield *
                                        (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 
                                            ? 1 
                                            : (userInvestment / suggestedCapital));
                                    
                                    estimatedYield = calculatedYield;
                                    
                                    console.log(`[ProductionReport]       💰 Yield calculation for ${cropData.name} (${farmerName}):`, {
                                        farmerName: farmerName,
                                        userId: userId,
                                        cropName: cropData.name,
                                        landArea: landArea,
                                        userInvestment: userInvestment,
                                        baseYield: baseYield,
                                        suggestedCapital: suggestedCapital,
                                        calculatedYield: calculatedYield,
                                        formula: 'baseYield × (userInvestment / suggestedCapital)',
                                        note: 'This uses EXACT SAME formula as Farmer side'
                                    });
                                }
                            } catch (error) {
                                console.error('[ProductionReport] ❌ Error fetching insights:', error);
                                estimatedYield = 0;
                            }
                            
                            console.log(`[ProductionReport]       🎯 FINAL Yield (MUST match Farmer Est. Yield Harvest):`, {
                                farmer: farmerName,
                                userId: userId,
                                crop: cropData.name,
                                landArea: landArea,
                                userInvestment: userInvestment,
                                estimatedYield: estimatedYield,
                                unit: 'kg',
                                note: 'This value should EXACTLY match what the farmer sees in their Crop Details page'
                            });
                            console.log(`[ProductionReport]       ========================================`);
                            console.log('');
                            
                            // Use estimatedYield (TOTAL kg) to match Farmer's "Est. Yield Harvest"
                            // This ensures Admin sees the SAME total yield as Farmer
                            const quantity = estimatedYield;
                            const yieldPerHectare = landArea > 0 ? estimatedYield / landArea : 0;

                            // Get harvest date - use actual completion date if all maintenance is done
                            let harvestDate = new Date().toISOString().split('T')[0];
                            
                            // First try to get the last maintenance completion date
                            const checklist = cropData.checklist;
                            if (checklist && checklist.length > 0) {
                                const maintenanceItems = checklist.filter((item: any) => item.category === 'Maintenance');
                                const allMaintenanceCompleted = maintenanceItems.length > 0 && maintenanceItems.every((item: any) => item.completed);
                                
                                if (allMaintenanceCompleted) {
                                    // Get the date of the last completed maintenance item
                                    const completedWithDates = maintenanceItems.filter((item: any) => item.completed && item.completedAt);
                                    if (completedWithDates.length > 0) {
                                        const latestDate = completedWithDates.reduce((latest: Date, item: any) => {
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
                                        harvestDate = latestDate.toISOString().split('T')[0];
                                    }
                                }
                            }
                            
                            // Fallback to harvestData or createdAt
                            if (harvestDate === new Date().toISOString().split('T')[0]) {
                                if (cropData.harvestData?.harvestedDate) {
                                    harvestDate = cropData.harvestData.harvestedDate.toDate ? 
                                        cropData.harvestData.harvestedDate.toDate().toISOString().split('T')[0] :
                                        new Date(cropData.harvestData.harvestedDate).toISOString().split('T')[0];
                                } else if (cropData.createdAt?.toDate) {
                                    harvestDate = cropData.createdAt.toDate().toISOString().split('T')[0];
                                } else if (cropData.createdAt) {
                                    harvestDate = new Date(cropData.createdAt).toISOString().split('T')[0];
                                }
                            }

                            records.push({
                                id: cropDoc.id,
                                farmerName,
                                barangay,
                                harvestedCrop: cropData.name || 'Unknown Crop',
                                quantity: quantity,
                                unit: 'kg',
                                harvestDate,
                                landArea,
                                yield: Math.round(yieldPerHectare * 100) / 100
                            });
                        } else {
                            console.log(`[ProductionReport]       ✗ EXCLUDED - Not post-harvest (status: "${status}")`);
                        }
                    }
                }

                console.log('[ProductionReport] ===== FINAL RESULTS =====');
                console.log('[ProductionReport] Total production records:', records.length);
                console.log('[ProductionReport] Records:', records.map(r => `${r.harvestedCrop} (${r.farmerName})`));

                // Sort by harvest date (newest first)
                records.sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());

                // Cache the data in sessionStorage for 30 minutes (session-based)
                sessionStorage.setItem('production_report_data', JSON.stringify(records));
                sessionStorage.setItem('production_report_timestamp', Date.now().toString());
                console.log('[ProductionReport] Data cached in sessionStorage (30 min TTL)');

                setProductionData(records);
            } catch (error) {
                console.error('[ProductionReport] Error fetching production data:', error);
                // Don't overwrite existing data if fetch fails during silent refresh
                if (!productionData.length && !cachedData) {
                    setProductionData([]); // Only set empty if no existing data and no cache
                }
                // If we have existing data, keep it (don't clear on error)
            } finally {
                setLoading(false); // Always hide loading after fetch completes
            }
        };

        fetchProductionData();
        
        // NO auto-refresh polling - only refresh on navigation/tab change
        // This prevents excessive Firestore reads
        // User can manually refresh by navigating away and back
        return () => {}; // Cleanup function (empty - no polling)
    }, []);

    // Calculate analytics data
    const analyticsData = useMemo(() => {
        // Total harvest (count of harvest records)
        const totalHarvest = productionData.length;

        // Monthly harvest (current month - count of harvests)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const monthlyHarvest = productionData
            .filter(record => {
                const harvestDate = new Date(record.harvestDate);
                return harvestDate.getMonth() === currentMonth && harvestDate.getFullYear() === currentYear;
            }).length;

        // Top harvested crops - RANKED BY TOTAL QUANTITY (kg)
        const cropHarvestStats = productionData.reduce((acc, record) => {
            const cropName = record.harvestedCrop.toLowerCase();
            const capitalizedName = cropName.charAt(0).toUpperCase() + cropName.slice(1);
            
            if (acc[cropName]) {
                acc[cropName].count += 1;
                acc[cropName].totalQuantity += record.quantity;
            } else {
                acc[cropName] = {
                    name: capitalizedName,
                    count: 1,
                    totalQuantity: record.quantity
                };
            }
            return acc;
        }, {} as Record<string, { name: string; count: number; totalQuantity: number }>);

        // Get top 3 harvested crops sorted by total quantity (kg) - highest yield first
        // If quantities are equal, use count as tiebreaker (more harvests = higher priority)
        const topHarvestedCrops = Object.values(cropHarvestStats)
            .sort((a, b) => {
                // Primary sort: total quantity (highest first)
                if (b.totalQuantity !== a.totalQuantity) {
                    return b.totalQuantity - a.totalQuantity;
                }
                // Tiebreaker: number of harvests (most first)
                return b.count - a.count;
            })
            .slice(0, 3);

        // Total harvest per crop (count of harvest records per crop)
        const harvestPerCrop = productionData.reduce((acc, record) => {
            const cropName = record.harvestedCrop.toLowerCase();
            if (acc[cropName]) {
                acc[cropName] += 1; // Count the number of harvests, not quantity
            } else {
                acc[cropName] = 1;
            }
            return acc;
        }, {} as Record<string, number>);

        // Convert to array format for chart
        const cropChartData = Object.entries(harvestPerCrop)
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count: count
            }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

        return {
            totalHarvest,
            monthlyHarvest,
            cropChartData,
            topHarvestedCrops
        };
    }, [productionData]);

    // Get unique crops for filter
    const uniqueCrops = useMemo(() => {
        const crops = [...new Set(productionData.map(r => r.harvestedCrop))];
        return crops.sort();
    }, [productionData]);

    // Get unique years for filter
    const uniqueYears = useMemo(() => {
        const years = [...new Set(productionData.map(r => new Date(r.harvestDate).getFullYear()))];
        return years.sort((a, b) => b - a); // Newest first
    }, [productionData]);

    // Filter production data based on selected filters
    const filteredData = useMemo(() => {
        return productionData.filter(record => {
            const harvestDate = new Date(record.harvestDate);
            
            // Crop filter
            if (selectedCrop !== 'all' && record.harvestedCrop !== selectedCrop) return false;
            
            // Year filter
            if (selectedYear !== 'all' && harvestDate.getFullYear() !== parseInt(selectedYear)) return false;
            
            // Month filter (0-11)
            if (selectedMonth !== 'all' && harvestDate.getMonth() !== parseInt(selectedMonth)) return false;
            
            // Week filter
            if (selectedWeek !== 'all') {
                const weekStart = parseInt(selectedWeek.split('-')[0]);
                const weekEnd = parseInt(selectedWeek.split('-')[1]);
                const dayOfMonth = harvestDate.getDate();
                if (dayOfMonth < weekStart || dayOfMonth > weekEnd) return false;
            }
            
            return true;
        });
    }, [productionData, selectedCrop, selectedYear, selectedMonth, selectedWeek]);

    // Calculate filtered analytics data
    const filteredAnalytics = useMemo(() => {
        // Total harvest
        const totalHarvest = filteredData.length;

        // Top harvested crops - RANKED BY TOTAL QUANTITY (kg)
        const cropHarvestStats = filteredData.reduce((acc, record) => {
            const cropName = record.harvestedCrop.toLowerCase();
            const capitalizedName = cropName.charAt(0).toUpperCase() + cropName.slice(1);
            
            if (acc[cropName]) {
                acc[cropName].count += 1;
                acc[cropName].totalQuantity += record.quantity;
            } else {
                acc[cropName] = {
                    name: capitalizedName,
                    count: 1,
                    totalQuantity: record.quantity
                };
            }
            return acc;
        }, {} as Record<string, { name: string; count: number; totalQuantity: number }>);

        const topHarvestedCrops = Object.values(cropHarvestStats)
            .sort((a, b) => {
                if (b.totalQuantity !== a.totalQuantity) {
                    return b.totalQuantity - a.totalQuantity;
                }
                return b.count - a.count;
            })
            .slice(0, 3);

        // Harvest per crop for chart
        const harvestPerCrop = filteredData.reduce((acc, record) => {
            const cropName = record.harvestedCrop.toLowerCase();
            if (acc[cropName]) {
                acc[cropName] += 1;
            } else {
                acc[cropName] = 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const cropChartData = Object.entries(harvestPerCrop)
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count: count
            }))
            .sort((a, b) => b.count - a.count);

        return {
            totalHarvest,
            cropChartData,
            topHarvestedCrops
        };
    }, [filteredData]);

    // Generate week options based on selected month/year
    const getWeekOptions = () => {
        if (selectedMonth === 'all' || selectedYear === 'all') {
            return [];
        }
        
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const weeks = [];
        let weekStart = 1;
        let weekNum = 1;
        
        while (weekStart <= daysInMonth) {
            const weekEnd = Math.min(weekStart + 6, daysInMonth);
            weeks.push({
                value: `${weekStart}-${weekEnd}`,
                label: `Week ${weekNum} (${weekStart}-${weekEnd})`
            });
            weekStart += 7;
            weekNum++;
        }
        
        return weeks;
    };

    // Pagination calculations - use filtered data
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const visibleRecords = filteredData.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    // Clear all filters
    const clearFilters = () => {
        setSelectedCrop('all');
        setSelectedYear('all');
        setSelectedMonth('all');
        setSelectedWeek('all');
    };

    // Check if any filter is active
    const hasActiveFilters = selectedCrop !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || selectedWeek !== 'all';

    return (
        <>
        <div className="space-y-6">
            {/* Show loading ONLY if we have no data at all (first load with no cache) */}
            {loading && productionData.length === 0 ? (
                <Card className="shadow-card">
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading production data...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
            {/* Filters Section */}
            <Card className="shadow-card">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 pt-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Crop Filter */}
                            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select crop" />
                                </SelectTrigger>
                                <SelectContent className="production-filter-dropdown">
                                    <SelectItem value="all" className="cursor-pointer">All Crops</SelectItem>
                                    {uniqueCrops.map((crop) => (
                                        <SelectItem key={crop} value={crop} className="cursor-pointer">
                                            {crop}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Year Filter */}
                            <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setSelectedWeek('all'); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent className="production-filter-dropdown">
                                    <SelectItem value="all" className="cursor-pointer">All Years</SelectItem>
                                    {uniqueYears.map((year) => (
                                        <SelectItem key={year} value={year.toString()} className="cursor-pointer">
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Month Filter */}
                            <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setSelectedWeek('all'); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent className="production-filter-dropdown">
                                    <SelectItem value="all" className="cursor-pointer">All Months</SelectItem>
                                    <SelectItem value="0" className="cursor-pointer">January</SelectItem>
                                    <SelectItem value="1" className="cursor-pointer">February</SelectItem>
                                    <SelectItem value="2" className="cursor-pointer">March</SelectItem>
                                    <SelectItem value="3" className="cursor-pointer">April</SelectItem>
                                    <SelectItem value="4" className="cursor-pointer">May</SelectItem>
                                    <SelectItem value="5" className="cursor-pointer">June</SelectItem>
                                    <SelectItem value="6" className="cursor-pointer">July</SelectItem>
                                    <SelectItem value="7" className="cursor-pointer">August</SelectItem>
                                    <SelectItem value="8" className="cursor-pointer">September</SelectItem>
                                    <SelectItem value="9" className="cursor-pointer">October</SelectItem>
                                    <SelectItem value="10" className="cursor-pointer">November</SelectItem>
                                    <SelectItem value="11" className="cursor-pointer">December</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Week Filter */}
                            <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={selectedMonth === 'all' || selectedYear === 'all'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select week" />
                                </SelectTrigger>
                                <SelectContent className="production-filter-dropdown">
                                    <SelectItem value="all" className="cursor-pointer">All Weeks</SelectItem>
                                    {getWeekOptions().map((week) => (
                                        <SelectItem key={week.value} value={week.value} className="cursor-pointer">
                                            {week.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="hover:bg-red-50 hover:text-red-600"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Analytics Containers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard
                    title="Total Harvest"
                    value={filteredAnalytics.totalHarvest}
                    icon={<Wheat className="h-5 w-5 text-primary" />}
                    description="Total crops harvested across all records"
                />
                <Card className="shadow-card">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-2">Top Harvested</p>
                        <div className="space-y-1">
                            {filteredAnalytics.topHarvestedCrops.length > 0 ? (
                                filteredAnalytics.topHarvestedCrops.slice(0, 3).map((crop, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold ${
                                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="font-medium">{crop.name}</span>
                                        </div>
                                        <span className="font-semibold text-blue-600">
                                            {crop.count}× <span className="text-xs text-muted-foreground">({crop.totalQuantity.toLocaleString()} kg)</span>
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-1">No data</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bar Graph - Total Harvest Per Crop */}
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle>Harvest Distribution by Crop</CardTitle>
                    <CardDescription>Total harvest quantity per crop type {hasActiveFilters && <span className="text-blue-600">(filtered)</span>}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredAnalytics.cropChartData.length > 0 ? filteredAnalytics.cropChartData : [{ name: 'No Data', count: 0 }]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip 
                                formatter={(value) => [`${value} harvests`, 'Count']}
                            />
                            <Legend />
                            <Bar
                                dataKey="count"
                                fill="hsl(var(--primary))"
                                name="Number of Harvests"
                            >
                                {filteredAnalytics.cropChartData.length > 0 ? (
                                    filteredAnalytics.cropChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={CROP_COLORS[index % CROP_COLORS.length]}
                                        />
                                    ))
                                ) : (
                                    <Cell fill="#e5e7eb" />
                                )}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Production Report Table */}
            <Card className="shadow-card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Production Report</CardTitle>
                        <CardDescription>Harvest records from farmers ({filteredData.length} total {hasActiveFilters ? 'filtered' : ''})</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowExportDialog(true)}
                            disabled={filteredData.length === 0}
                            className="hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Production Report
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {filteredData.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farm Address</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Harvested Crop</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Land Area (ha)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Est. Yield Harvest (kg)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Harvest Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRecords.map((record, index) => {
                                            const rowNumber = startIndex + index + 1;
                                            return (
                                                <tr
                                                    key={record.id}
                                                    className="border-b hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <td className="p-3">
                                                        <div className="font-medium text-gray-900">{record.farmerName}</div>
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-700">{record.barangay}</td>
                                                    <td className="p-3 text-sm text-gray-700 capitalize">{record.harvestedCrop}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.landArea}</td>
                                                    <td className="p-3 text-sm font-semibold text-gray-900">{record.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    <td className="p-3 text-sm text-gray-700">
                                                        {new Date(record.harvestDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination Controls */}
                        <div className="border-t pt-4 mt-auto">
                            {/* Desktop layout */}
                            <div className="hidden md:flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                                </div>
                                <div className="flex space-x-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Previous
                                    </Button>

                                    {/* Page Number Buttons */}
                                    {(() => {
                                        const pageButtons = [];
                                        let startPage = Math.max(1, currentPage - 3);
                                        let endPage = Math.min(totalPages, startPage + 6);

                                        if (endPage - startPage < 6) {
                                            startPage = Math.max(1, endPage - 6);
                                        }

                                        if (startPage > 1) {
                                            pageButtons.push(
                                                <Button
                                                    key={1}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(1)}
                                                    className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                >
                                                    1
                                                </Button>
                                            );
                                            if (startPage > 2) {
                                                pageButtons.push(
                                                    <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pageButtons.push(
                                                <Button
                                                    key={i}
                                                    variant={currentPage === i ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(i)}
                                                    className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
                                                >
                                                    {i}
                                                </Button>
                                            );
                                        }

                                        if (endPage < totalPages) {
                                            if (endPage < totalPages - 1) {
                                                pageButtons.push(
                                                    <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                            pageButtons.push(
                                                <Button
                                                    key={totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(totalPages)}
                                                    className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                >
                                                    {totalPages}
                                                </Button>
                                            );
                                        }

                                        return pageButtons;
                                    })()}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>

                            {/* Mobile layout */}
                            <div className="md:hidden space-y-4">
                                <div className="text-sm text-muted-foreground text-center">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                                </div>
                                <div className="flex justify-center space-x-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">No production records available. Production data appears when farmers harvest their crops.</p>
                    </div>
                )}
            </CardContent>
        </Card>
                </>
            )}
        </div>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export Production Report</DialogTitle>
                    <DialogDescription>
                        Choose which data you want to export:
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                         onClick={() => handleExportProduction('page')}>
                        <h4 className="font-semibold mb-2">Export This Page</h4>
                        <p className="text-sm text-muted-foreground">
                            Export {visibleRecords.length} record{visibleRecords.length !== 1 ? 's' : ''} from the current page (Page {currentPage} of {totalPages})
                        </p>
                    </div>
                    <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                         onClick={() => handleExportProduction('all')}>
                        <h4 className="font-semibold mb-2">Export All Pages</h4>
                        <p className="text-sm text-muted-foreground">
                            Export all {filteredData.length} record{filteredData.length !== 1 ? 's' : ''} {hasActiveFilters ? '(with current filters)' : ''}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
};

export default ProductionReport;

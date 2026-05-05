import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Wheat, Calendar, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import StatsCard from "@/components/shared/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { getCachedProductionData, setCachedProductionData } from "@/services/productionReportCache";

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
    const [loading, setLoading] = useState(true);
    const recordsPerPage = 10;

    // Color palette for crop bar chart (same as Problem Type Distribution)
    const CROP_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

    // Fetch real data from Firestore - Farmer Profile approach
    useEffect(() => {
        const fetchProductionData = async () => {
            // Check cache first
            const cachedData = getCachedProductionData();
            if (cachedData && cachedData.data.length > 0) {
                console.log('[ProductionReport] Using cached production data');
                setProductionData(cachedData.data);
                setLoading(false);
                return;
            }

            try {
                console.log('[ProductionReport] Cache miss, fetching from Firestore...');
                setLoading(true);
                console.log('[ProductionReport] Starting to fetch production data...');
                
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
                    const barangay = farmerData.homeAddress || farmerData.farmAddress || 'Unknown Barangay';
                    
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
                            
                            // Calculate yield (quantity per land area)
                            const quantity = cropData.harvestData?.quantity || cropData.puhunan || 0;
                            const landArea = cropData.landArea || 1;
                            const yieldPerHectare = landArea > 0 ? (quantity / landArea) : 0;

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

                // Cache the data
                setCachedProductionData(records);
                console.log('[ProductionReport] Data cached for future navigations');

                setProductionData(records);
            } catch (error) {
                console.error('[ProductionReport] Error fetching production data:', error);
                setProductionData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProductionData();
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

        // Top harvested crops - count how many times each crop was harvested AND total quantity
        const cropHarvestStats = productionData.reduce((acc, record) => {
            const cropName = record.harvestedCrop.toLowerCase();
            const capitalizedName = cropName.charAt(0).toUpperCase() + cropName.slice(1);
            
            if (acc[cropName]) {
                acc[cropName].count += 1; // Count number of harvests
                acc[cropName].totalQuantity += record.quantity; // Sum total quantity
            } else {
                acc[cropName] = {
                    name: capitalizedName,
                    count: 1,
                    totalQuantity: record.quantity
                };
            }
            return acc;
        }, {} as Record<string, { name: string; count: number; totalQuantity: number }>);

        // Get top 3 harvested crops sorted by count (descending)
        const topHarvestedCrops = Object.values(cropHarvestStats)
            .sort((a, b) => b.count - a.count)
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

    // Pagination calculations
    const totalPages = Math.ceil(productionData.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const visibleRecords = productionData.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    return (
        <div className="space-y-6">
            {/* Analytics Containers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard
                    title="Total Harvest"
                    value={analyticsData.totalHarvest}
                    icon={<Wheat className="h-5 w-5 text-primary" />}
                    description="Total crops harvested across all records"
                />
                <Card className="shadow-card">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-2">Top Harvested</p>
                        <div className="space-y-1">
                            {analyticsData.topHarvestedCrops.length > 0 ? (
                                analyticsData.topHarvestedCrops.slice(0, 3).map((crop, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold ${
                                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                            }`}>
                                                {index + 1}
                                            </span>
                                            <span className="font-medium">{crop.name}</span>
                                        </div>
                                        <span className="font-semibold text-blue-600">{crop.count}× <span className="text-xs text-muted-foreground">({crop.totalQuantity} kg)</span></span>
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
                    <CardDescription>Total harvest quantity per crop type</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.cropChartData.length > 0 ? analyticsData.cropChartData : [{ name: 'No Data', count: 0 }]}>
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
                                {analyticsData.cropChartData.length > 0 ? (
                                    analyticsData.cropChartData.map((entry, index) => (
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
                        <CardDescription>Harvest records from farmers ({productionData.length} total)</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onExport}
                            disabled={productionData.length === 0}
                            className="hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading production data...</p>
                        </div>
                    </div>
                ) : productionData.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Harvested Crop</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Quantity (kg)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Land Area (ha)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Yield (kg/ha)</th>
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
                                                    <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                                    <td className="p-3">
                                                        <div className="font-medium text-gray-900">{record.farmerName}</div>
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-700">{record.barangay}</td>
                                                    <td className="p-3 text-sm text-gray-700 capitalize">{record.harvestedCrop}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.quantity} {record.unit}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.landArea}</td>
                                                    <td className="p-3 text-sm text-gray-700">{record.yield}</td>
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
                                    Showing {startIndex + 1} to {Math.min(endIndex, productionData.length)} of {productionData.length} records
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
                                    Showing {startIndex + 1} to {Math.min(endIndex, productionData.length)} of {productionData.length} records
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
        </div>
    );
};

export default ProductionReport;

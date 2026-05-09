import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ChevronLeft, ChevronRight, TrendingUp, Filter, X, DollarSign, Users, MapPin } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import StatsCard from "@/components/shared/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from "recharts";
import { getAllLedgers, calculateLedgerSummary } from "@/services/farmLedgerService";
import { FarmLedger } from "@/services/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface FinancialRecord {
    id: string;
    farmerName: string;
    farmAddress: string;
    crop: string;
    capital: number;
    revenue: number;
    profit: number;
    profitMargin: number;
    plantedDate: string;
    status: string;
}

interface Farmer {
    uid: string;
    fullName: string;
    homeAddress?: string;
}

interface FinancialReportProps {
    onExport: () => void;
    category?: 'all' | 'crop' | 'barangay';
}

const FinancialReport = ({ onExport, category = 'all' }: FinancialReportProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [financialData, setFinancialData] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState(true); // Start with true - show loading on first load
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if data has been loaded
    const recordsPerPage = 10;

    // Filter states
    const [selectedCrop, setSelectedCrop] = useState<string>('all');
    const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    // Export dialog state
    const [showExportDialog, setShowExportDialog] = useState(false);

    // Local export function for Financial Report only
    const handleExportFinancial = (exportType: 'page' | 'all') => {
        if (financialData.length === 0) {
            return;
        }

        // Determine which data to export
        const dataToExport = exportType === 'page' 
            ? visibleRecords.map(record => ({
                'Farmer Name': record.farmerName,
                'Farm Address': record.farmAddress,
                'Crop': record.crop,
                'Capital (₱)': record.capital.toFixed(2),
                'Revenue (₱)': record.revenue.toFixed(2),
                'Profit (₱)': record.profit.toFixed(2),
                'Profit Margin (%)': record.profitMargin.toFixed(2),
                'Planted Date': new Date(record.plantedDate).toLocaleDateString(),
                'Status': record.status
            }))
            : filteredData.map(record => ({
                'Farmer Name': record.farmerName,
                'Farm Address': record.farmAddress,
                'Crop': record.crop,
                'Capital (₱)': record.capital.toFixed(2),
                'Revenue (₱)': record.revenue.toFixed(2),
                'Profit (₱)': record.profit.toFixed(2),
                'Profit Margin (%)': record.profitMargin.toFixed(2),
                'Planted Date': new Date(record.plantedDate).toLocaleDateString(),
                'Status': record.status
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
            ? `financial_report_page${currentPage}_${new Date().toISOString().split('T')[0]}.csv`
            : `financial_report_all_pages_${new Date().toISOString().split('T')[0]}.csv`;
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
    }, [selectedCrop, selectedBarangay, selectedYear, selectedMonth]);

    // Color palette for charts
    const CROP_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
    const STATUS_COLORS = {
        'post-harvest': '#10b981',
        'harvesting': '#f59e0b',
        'maintenance': '#3b82f6',
        'planting': '#8b5cf6',
        'preparation': '#6b7280'
    };

    // Truncate long text for charts (MUST be before all useMemo hooks)
    const truncateText = (text: string, maxLength: number = 15) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Fetch financial data from ledger service WITH CACHING
    useEffect(() => {
        const fetchFinancialData = async () => {
            // Check if data is already cached in sessionStorage
            const cachedData = sessionStorage.getItem('financial_report_data');
            const cacheTimestamp = sessionStorage.getItem('financial_report_timestamp');
            
            // Use cached data if less than 10 minutes old (like Complaints Report)
            if (cachedData && cacheTimestamp) {
                const age = Date.now() - parseInt(cacheTimestamp);
                if (age < 10 * 60 * 1000) { // 10 minutes cache for better efficiency
                    console.log('[FinancialReport] Using cached data (age:', Math.round(age / 1000), 's)');
                    setFinancialData(JSON.parse(cachedData));
                    setLoading(false);
                    setHasLoadedOnce(true); // Mark as loaded
                    return;
                }
            }
            
            // No cache or expired - fetch fresh data
            console.log('[FinancialReport] Cache miss or expired, fetching fresh financial data from ledgers...');
            
            try {
                setLoading(true);
                
                // Get all ledgers using the optimized service
                const allLedgers = await getAllLedgers();
                
                // Transform ledger data to financial records
                const records: FinancialRecord[] = [];
                
                for (const ledger of allLedgers) {
                    // Skip if no financials data
                    if (!ledger.financials) {
                        continue;
                    }
                    
                    const revenue = ledger.financials.actualRevenue || ledger.financials.estimatedRevenue || 0;
                    const profit = ledger.financials.actualProfit || ledger.financials.estimatedProfit || 0;
                    const capital = ledger.financials.capital || 0;
                    
                    // Only include records with financial data
                    if (capital > 0 || revenue > 0) {
                        // Get farm address from farmer data (priority: farmAddress > homeAddress)
                        const farmAddress = ledger.location || 'Unknown Farm Address';
                        
                        records.push({
                            id: ledger.id,
                            farmerName: ledger.username || 'Unknown Farmer',
                            farmAddress: farmAddress,
                            crop: ledger.crop || 'Unknown Crop',
                            capital,
                            revenue,
                            profit,
                            profitMargin: ledger.financials.profitMargin || 0,
                            plantedDate: ledger.plantingDate ? 
                                new Date(ledger.plantingDate).toISOString().split('T')[0] :
                                new Date().toISOString().split('T')[0],
                            status: ledger.status || 'planned'
                        });
                    }
                }
                
                console.log(`[FinancialReport] Total financial records: ${records.length}`);
                setFinancialData(records);
                setHasLoadedOnce(true); // Mark as loaded
                
                // Cache the data in sessionStorage
                sessionStorage.setItem('financial_report_data', JSON.stringify(records));
                sessionStorage.setItem('financial_report_timestamp', Date.now().toString());
                
                setLoading(false);
            } catch (error) {
                console.error('[FinancialReport] Error fetching financial data:', error);
                // Don't overwrite existing data if fetch fails during silent refresh
                if (!financialData.length) {
                    setFinancialData([]); // Only set empty if no existing data
                    setHasLoadedOnce(true); // Mark as loaded even on error
                }
                // If we have existing data, keep it (don't clear on error)
                setLoading(false);
            }
        };

        fetchFinancialData();
    }, []);

    // Get unique values for filters
    const uniqueCrops = useMemo(() => {
        const crops = financialData.map(record => record.crop);
        return [...new Set(crops)].sort();
    }, [financialData]);

    const uniqueBarangays = useMemo(() => {
        const farmAddresses = financialData.map(record => record.farmAddress);
        return [...new Set(farmAddresses)].sort();
    }, [financialData]);

    const uniqueYears = useMemo(() => {
        const years = financialData.map(record => new Date(record.plantedDate).getFullYear().toString());
        return [...new Set(years)].sort().reverse();
    }, [financialData]);

    const uniqueMonths = useMemo(() => {
        const months = financialData.map(record => {
            const date = new Date(record.plantedDate);
            return date.toLocaleString('en-US', { month: 'long' });
        });
        return [...new Set(months)];
    }, [financialData]);

    // Apply filters
    const filteredData = useMemo(() => {
        return financialData.filter(record => {
            const matchesCrop = selectedCrop === 'all' || record.crop === selectedCrop;
            const matchesBarangay = selectedBarangay === 'all' || record.farmAddress === selectedBarangay;
            const matchesYear = selectedYear === 'all' || new Date(record.plantedDate).getFullYear().toString() === selectedYear;
            const matchesMonth = selectedMonth === 'all' || 
                new Date(record.plantedDate).toLocaleString('en-US', { month: 'long' }) === selectedMonth;
            
            return matchesCrop && matchesBarangay && matchesYear && matchesMonth;
        });
    }, [financialData, selectedCrop, selectedBarangay, selectedYear, selectedMonth]);

    // Calculate statistics
    const stats = useMemo(() => {
        console.log('[FinancialReport] Calculating stats from', filteredData.length, 'records');
        
        // Safety check: if no data, return empty stats
        if (filteredData.length === 0) {
            return {
                totalCapital: 0,
                totalRevenue: 0,
                totalProfit: 0,
                averageProfitMargin: 0,
                totalProjects: 0,
                byCrop: {},
                byBarangay: {}
            };
        }
        
        // Calculate totals directly from filteredData
        const totalCapital = filteredData.reduce((sum, record) => sum + record.capital, 0);
        const totalRevenue = filteredData.reduce((sum, record) => sum + record.revenue, 0);
        const totalProfit = filteredData.reduce((sum, record) => sum + record.profit, 0);
        const averageProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        console.log('[FinancialReport] Calculated totals:', {
            totalCapital,
            totalRevenue,
            totalProfit,
            averageProfitMargin
        });
        
        // Additional stats by crop
        const byCrop: Record<string, { totalCapital: number; totalRevenue: number; totalProfit: number; count: number }> = {};
        filteredData.forEach(record => {
            if (!byCrop[record.crop]) {
                byCrop[record.crop] = { totalCapital: 0, totalRevenue: 0, totalProfit: 0, count: 0 };
            }
            byCrop[record.crop].totalCapital += record.capital;
            byCrop[record.crop].totalRevenue += record.revenue;
            byCrop[record.crop].totalProfit += record.profit;
            byCrop[record.crop].count += 1;
        });

        // Additional stats by barangay
        const byBarangay: Record<string, { totalCapital: number; totalRevenue: number; totalProfit: number; count: number }> = {};
        filteredData.forEach(record => {
            if (!byBarangay[record.farmAddress]) {
                byBarangay[record.farmAddress] = { totalCapital: 0, totalRevenue: 0, totalProfit: 0, count: 0 };
            }
            byBarangay[record.farmAddress].totalCapital += record.capital;
            byBarangay[record.farmAddress].totalRevenue += record.revenue;
            byBarangay[record.farmAddress].totalProfit += record.profit;
            byBarangay[record.farmAddress].count += 1;
        });

        return {
            totalCapital,
            totalRevenue,
            totalProfit,
            averageProfitMargin,
            totalProjects: filteredData.length,
            byCrop,
            byBarangay
        };
    }, [filteredData]);

    // Prepare chart data
    const cropRevenueData = useMemo(() => {
        return Object.entries(stats.byCrop)
            .map(([crop, data]) => ({
                name: truncateText(crop, 12),
                fullName: crop, // Keep full name for tooltip
                revenue: data.totalRevenue,
                profit: data.totalProfit,
                capital: data.totalCapital
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [stats.byCrop]);

    const barangayRevenueData = useMemo(() => {
        return Object.entries(stats.byBarangay)
            .map(([barangay, data]) => ({
                name: truncateText(barangay, 15),
                fullName: barangay, // Keep full name for tooltip
                revenue: data.totalRevenue,
                profit: data.totalProfit,
                capital: data.totalCapital
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10); // Top 10 barangays
    }, [stats.byBarangay]);

    const statusDistributionData = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        filteredData.forEach(record => {
            statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
        });
        
        return Object.entries(statusCounts)
            .map(([status, count]) => ({
                name: status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: count,
                color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280'
            }));
    }, [filteredData]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const visibleRecords = filteredData.slice(startIndex, endIndex);

    // Export to CSV (deprecated - now using handleExportFinancial with dialog)
    const handleExport = () => {
        // This function is now deprecated, use handleExportFinancial instead
        setShowExportDialog(true);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Check if any filter is active
    const hasActiveFilters = selectedCrop !== 'all' || selectedBarangay !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all';

    // Clear all filters
    const clearFilters = () => {
        setSelectedCrop('all');
        setSelectedBarangay('all');
        setSelectedYear('all');
        setSelectedMonth('all');
    };

    if (loading && !hasLoadedOnce) {
        return (
            <Card className="shadow-card">
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading financial data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Filters Section - Same as Production Report */}
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
                                <SelectContent>
                                    <SelectItem value="all">All Crops</SelectItem>
                                    {uniqueCrops.map((crop) => (
                                        <SelectItem key={crop} value={crop}>
                                            {crop}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Barangay/Farm Address Filter */}
                            <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select farm address" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Farm Addresses</SelectItem>
                                    {uniqueBarangays.map((farmAddress) => (
                                        <SelectItem key={farmAddress} value={farmAddress}>
                                            {farmAddress}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Year Filter */}
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {uniqueYears.map((year) => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Month Filter */}
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    <SelectItem value="January">January</SelectItem>
                                    <SelectItem value="February">February</SelectItem>
                                    <SelectItem value="March">March</SelectItem>
                                    <SelectItem value="April">April</SelectItem>
                                    <SelectItem value="May">May</SelectItem>
                                    <SelectItem value="June">June</SelectItem>
                                    <SelectItem value="July">July</SelectItem>
                                    <SelectItem value="August">August</SelectItem>
                                    <SelectItem value="September">September</SelectItem>
                                    <SelectItem value="October">October</SelectItem>
                                    <SelectItem value="November">November</SelectItem>
                                    <SelectItem value="December">December</SelectItem>
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

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Capital Invested"
                    value={formatCurrency(stats.totalCapital)}
                    icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                    description={`${stats.totalProjects} project${stats.totalProjects !== 1 ? 's' : ''}`}
                />
                <StatsCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                    description={`${stats.averageProfitMargin.toFixed(1)}% avg margin`}
                />
                <StatsCard
                    title="Total Profit"
                    value={formatCurrency(stats.totalProfit)}
                    icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
                    description={stats.totalProfit >= 0 ? 'Profitable' : 'Loss'}
                />
                <StatsCard
                    title="Active Projects"
                    value={stats.totalProjects.toString()}
                    icon={<Users className="h-4 w-4 text-purple-600" />}
                    description={`${Object.keys(stats.byBarangay).length} barangays`}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Crop */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Revenue by Crop</CardTitle>
                        <CardDescription>Total revenue generated per crop type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {cropRevenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={cropRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                                    <Tooltip 
                                        formatter={(value: number, name: string, props: any) => [
                                            formatCurrency(value), 
                                            name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Capital'
                                        ]}
                                        labelFormatter={(label) => `Crop: ${label}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                                    <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Revenue by Barangay */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Revenue by Barangay</CardTitle>
                        <CardDescription>Top 10 barangays by total revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {barangayRevenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barangayRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                                    <Tooltip 
                                        formatter={(value: number, name: string, props: any) => [
                                            formatCurrency(value), 
                                            name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Capital'
                                        ]}
                                        labelFormatter={(label) => `Barangay: ${label}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#f59e0b" name="Revenue" />
                                    <Bar dataKey="profit" fill="#8b5cf6" name="Profit" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Crop Distribution */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Project Distribution by Crop</CardTitle>
                        <CardDescription>Number of projects per crop type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {cropRevenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={cropRevenueData.map(d => ({ name: d.name, fullName: d.fullName, count: stats.byCrop[d.fullName]?.count || 0 }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip 
                                        formatter={(value: number, name: string, props: any) => [value, 'Projects']}
                                        labelFormatter={(label, payload) => {
                                            const item = payload?.[0]?.payload;
                                            return item?.fullName || label;
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#06b6d4" name="Number of Projects" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Project Status Distribution</CardTitle>
                        <CardDescription>Breakdown of projects by current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statusDistributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Financial Records Table */}
            <Card className="shadow-card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Financial Records</CardTitle>
                        <CardDescription>Detailed financial data for all projects ({filteredData.length} total {hasActiveFilters ? 'filtered' : ''})</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowExportDialog(true)}
                            disabled={filteredData.length === 0}
                            className="hover:bg-blue-50 hover:text-blue-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Financial Report
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading financial data...</p>
                        </div>
                    </div>
                ) : filteredData.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farm Address</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Crop</th>
                                            <th className="text-right p-3 font-semibold text-gray-700 text-sm">Capital (₱)</th>
                                            <th className="text-right p-3 font-semibold text-gray-700 text-sm">Revenue (₱)</th>
                                            <th className="text-right p-3 font-semibold text-gray-700 text-sm">Profit (₱)</th>
                                            <th className="text-right p-3 font-semibold text-gray-700 text-sm">Margin (%)</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Planted Date</th>
                                            <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
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
                                                    <td className="p-3 text-sm text-gray-700">
                                                        {record.farmAddress}
                                                    </td>
                                                    <td className="p-3 text-sm font-medium text-gray-900">{record.crop}</td>
                                                    <td className="p-3 text-sm text-right font-medium text-gray-900">
                                                        {formatCurrency(record.capital)}
                                                    </td>
                                                    <td className="p-3 text-sm text-right font-medium text-gray-900">
                                                        {formatCurrency(record.revenue)}
                                                    </td>
                                                    <td className={`p-3 text-sm text-right font-semibold ${record.profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                                        {formatCurrency(record.profit)}
                                                    </td>
                                                    <td className="p-3 text-sm text-right">
                                                        <Badge
                                                            variant={record.profitMargin >= 0 ? 'default' : 'destructive'}
                                                            className={record.profitMargin >= 0 ? 'bg-green-600' : 'bg-red-600'}
                                                        >
                                                            {record.profitMargin.toFixed(1)}%
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-700">
                                                        {new Date(record.plantedDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Badge
                                                            variant={record.status === 'post-harvest' ? 'default' : 'secondary'}
                                                            className="capitalize text-xs"
                                                        >
                                                            {record.status.replace('-', ' ')}
                                                        </Badge>
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
                                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-green-50"
                                    >
                                        Previous
                                    </Button>

                                    {/* Page Number Buttons */}
                                    {(() => {
                                        const pageButtons = [];
                                        let startPage = Math.max(1, currentPage - 2);
                                        let endPage = Math.min(totalPages, startPage + 4);

                                        if (endPage - startPage < 4) {
                                            startPage = Math.max(1, endPage - 4);
                                        }

                                        if (startPage > 1) {
                                            pageButtons.push(
                                                <Button
                                                    key={1}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(1)}
                                                    className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                >
                                                    1
                                                </Button>
                                            );
                                            if (startPage > 2) {
                                                pageButtons.push(
                                                    <span key="start-ellipsis" className="px-1 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pageButtons.push(
                                                <Button
                                                    key={i}
                                                    variant={currentPage === i ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(i)}
                                                    className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
                                                >
                                                    {i}
                                                </Button>
                                            );
                                        }

                                        if (endPage < totalPages) {
                                            if (endPage < totalPages - 1) {
                                                pageButtons.push(
                                                    <span key="end-ellipsis" className="px-1 text-muted-foreground text-sm">⋯</span>
                                                );
                                            }
                                            pageButtons.push(
                                                <Button
                                                    key={totalPages}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(totalPages)}
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
                                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-3 text-sm hover:bg-green-50"
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
                                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 px-3 text-sm hover:bg-blue-50"
                                    >
                                        Previous
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
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
                    <div className="flex items-center justify-center h-64 text-center">
                        <div>
                            <DollarSign className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
                            <h3 className="text-lg font-semibold mb-2">No Financial Data Available</h3>
                            <p className="text-muted-foreground max-w-md">
                                There are no financial records matching your current filters. Try adjusting the filters or wait for farmers to submit their crop data.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        </div>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export Financial Report</DialogTitle>
                    <DialogDescription>
                        Choose which data you want to export:
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                         onClick={() => handleExportFinancial('page')}>
                        <h4 className="font-semibold mb-2">Export This Page</h4>
                        <p className="text-sm text-muted-foreground">
                            Export {visibleRecords.length} record{visibleRecords.length !== 1 ? 's' : ''} from the current page (Page {currentPage} of {totalPages})
                        </p>
                    </div>
                    <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                         onClick={() => handleExportFinancial('all')}>
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

export default FinancialReport;

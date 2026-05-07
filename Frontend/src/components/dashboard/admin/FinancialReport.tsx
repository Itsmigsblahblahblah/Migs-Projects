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

interface FinancialRecord {
    id: string;
    farmerName: string;
    barangay: string;
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
    const [loading, setLoading] = useState(true);
    const recordsPerPage = 10;

    // Filter states
    const [selectedCrop, setSelectedCrop] = useState<string>('all');
    const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

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

    // Fetch financial data from ledger service
    useEffect(() => {
        const fetchFinancialData = async () => {
            try {
                console.log('[FinancialReport] Fetching financial data from ledgers...');
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
                        records.push({
                            id: ledger.id,
                            farmerName: ledger.username || 'Unknown Farmer',
                            barangay: ledger.location || 'Unknown Barangay',
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
                setLoading(false);
            } catch (error) {
                console.error('[FinancialReport] Error fetching financial data:', error);
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
        const barangays = financialData.map(record => record.barangay);
        return [...new Set(barangays)].sort();
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
            const matchesBarangay = selectedBarangay === 'all' || record.barangay === selectedBarangay;
            const matchesYear = selectedYear === 'all' || new Date(record.plantedDate).getFullYear().toString() === selectedYear;
            const matchesMonth = selectedMonth === 'all' || 
                new Date(record.plantedDate).toLocaleString('en-US', { month: 'long' }) === selectedMonth;
            
            return matchesCrop && matchesBarangay && matchesYear && matchesMonth;
        });
    }, [financialData, selectedCrop, selectedBarangay, selectedYear, selectedMonth]);

    // Calculate statistics
    const stats = useMemo(() => {
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
        
        const summary = calculateLedgerSummary(filteredData as any);
        
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
            if (!byBarangay[record.barangay]) {
                byBarangay[record.barangay] = { totalCapital: 0, totalRevenue: 0, totalProfit: 0, count: 0 };
            }
            byBarangay[record.barangay].totalCapital += record.capital;
            byBarangay[record.barangay].totalRevenue += record.revenue;
            byBarangay[record.barangay].totalProfit += record.profit;
            byBarangay[record.barangay].count += 1;
        });

        return {
            totalCapital: summary.totalInvestment,
            totalRevenue: summary.totalRevenue,
            totalProfit: summary.totalProfit,
            averageProfitMargin: summary.averageProfitMargin,
            totalProjects: filteredData.length,
            byCrop,
            byBarangay
        };
    }, [filteredData]);

    // Prepare chart data
    const cropRevenueData = useMemo(() => {
        return Object.entries(stats.byCrop)
            .map(([crop, data]) => ({
                name: crop,
                revenue: data.totalRevenue,
                profit: data.totalProfit,
                capital: data.totalCapital
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [stats.byCrop]);

    const barangayRevenueData = useMemo(() => {
        return Object.entries(stats.byBarangay)
            .map(([barangay, data]) => ({
                name: barangay,
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

    // Export to CSV
    const handleExport = () => {
        const headers = ['Farmer Name', 'Barangay', 'Crop', 'Capital (₱)', 'Revenue (₱)', 'Profit (₱)', 'Profit Margin (%)', 'Planted Date', 'Status'];
        const csvData = filteredData.map(record => [
            record.farmerName,
            record.barangay,
            record.crop,
            record.capital.toFixed(2),
            record.revenue.toFixed(2),
            record.profit.toFixed(2),
            record.profitMargin.toFixed(2),
            record.plantedDate,
            record.status
        ]);

        const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
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
        <div className="space-y-6">
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

            {/* Filters */}
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Filters</CardTitle>
                            <CardDescription>Filter financial records by crop, location, and time period</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={filteredData.length === 0}
                            className="hover:bg-green-50 hover:text-green-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Crop Type</label>
                            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Crops" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Crops</SelectItem>
                                    {uniqueCrops.map(crop => (
                                        <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Barangay</label>
                            <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Barangays" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Barangays</SelectItem>
                                    {uniqueBarangays.map(barangay => (
                                        <SelectItem key={barangay} value={barangay}>{barangay}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Year</label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Years" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {uniqueYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Months" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {uniqueMonths.map(month => (
                                        <SelectItem key={month} value={month}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Active filters display */}
                    {(selectedCrop !== 'all' || selectedBarangay !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all') && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                            <span className="text-sm text-muted-foreground">Active filters:</span>
                            {selectedCrop !== 'all' && (
                                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSelectedCrop('all')}>
                                    Crop: {selectedCrop} <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedBarangay !== 'all' && (
                                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSelectedBarangay('all')}>
                                    Barangay: {selectedBarangay} <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedYear !== 'all' && (
                                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSelectedYear('all')}>
                                    Year: {selectedYear} <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                            {selectedMonth !== 'all' && (
                                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setSelectedMonth('all')}>
                                    Month: {selectedMonth} <X className="h-3 w-3 ml-1" />
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                                <BarChart data={cropRevenueData.map(d => ({ name: d.name, count: stats.byCrop[d.name]?.count || 0 }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip />
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

            {/* Financial Data Table */}
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Financial Records</CardTitle>
                            <CardDescription>Detailed financial data for all projects ({filteredData.length} records)</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                            <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
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
                                        {visibleRecords.map((record) => (
                                            <tr
                                                key={record.id}
                                                className="border-b hover:bg-green-50/50 transition-colors"
                                            >
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-900">{record.farmerName}</div>
                                                </td>
                                                <td className="p-3 text-sm text-gray-700">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        {record.barangay}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm font-medium text-gray-900">{record.crop}</td>
                                                <td className="p-3 text-sm text-right font-medium text-blue-600">
                                                    {formatCurrency(record.capital)}
                                                </td>
                                                <td className="p-3 text-sm text-right font-medium text-green-600">
                                                    {formatCurrency(record.revenue)}
                                                </td>
                                                <td className={`p-3 text-sm text-right font-semibold ${record.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
                                                        variant="outline"
                                                        className="capitalize text-xs"
                                                    >
                                                        {record.status.replace('-', ' ')}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
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
                                                        className="h-8 w-8 p-0 text-sm hover:bg-green-50"
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
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-green-600 text-white hover:bg-green-700" : "hover:bg-green-50"}`}
                                                    >
                                                        {i}
                                                    </Button>
                                                );
                                            }

                                            if (endPage < totalPages) {
                                                if (endPage < totalPages - 1) {
                                                    pageButtons.push(
                                                        <span key="end-ellipsis" className="px-1 text-muted-foreground text-sm"></span>
                                                    );
                                                }
                                                pageButtons.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="h-8 w-8 p-0 text-sm hover:bg-green-50"
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
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Financial Data Available</h3>
                            <p className="text-muted-foreground max-w-md">
                                There are no financial records matching your current filters. Try adjusting the filters or wait for farmers to submit their crop data.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default FinancialReport;

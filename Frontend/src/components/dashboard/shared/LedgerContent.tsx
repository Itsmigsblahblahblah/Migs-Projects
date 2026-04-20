/**
 * Shared Ledger Content Component
 * Used by both Farmer and Admin to ensure identical data rendering and computations
 */

import { useState, useEffect, useMemo } from 'react';
import { useFarmLedger } from '@/hooks/custom/useFarmLedger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sprout,
  Filter,
  Search,
  BarChart3,
  Calendar,
  Package
} from 'lucide-react';
import { format } from 'date-fns';

interface LedgerContentProps {
  userId: string;
  isAdmin?: boolean;
}

const LedgerContent = ({ userId, isAdmin = false }: LedgerContentProps) => {
  const {
    ledgers,
    summary,
    loading,
    filters,
    updateFilters,
    clearFilters,
  } = useFarmLedger(userId, isAdmin);

  const [uniqueCrops, setUniqueCrops] = useState<string[]>([]);

  // Determine spinner color based on user role
  const spinnerColor = isAdmin ? 'border-blue-600' : 'border-green-600';

  // Calculate monthly values for current month
  const monthlyStats = useMemo(() => {
    if (!ledgers || ledgers.length === 0) return { investmentMonthly: 0, profitMonthly: 0 };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyLedgers = ledgers.filter(l => {
      const date = new Date(l.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const investmentMonthly = monthlyLedgers.reduce((sum, l) => sum + (l.financials.capital || 0), 0);
    const profitMonthly = monthlyLedgers.reduce((sum, l) => sum + (l.financials.actualProfit || l.financials.estimatedProfit || 0), 0);

    return { investmentMonthly, profitMonthly };
  }, [ledgers]);

  // Calculate harvest report statistics
  const harvestStats = useMemo(() => {
    if (!ledgers || ledgers.length === 0) return { 
      totalHarvested: 0, 
      harvestRevenue: 0, 
      harvestProfit: 0,
      harvestInvestment: 0
    };
    
    const harvestedLedgers = ledgers.filter(l => 
      l.status === 'post-harvest'
    );

    const totalHarvested = harvestedLedgers.length;
    const harvestRevenue = harvestedLedgers.reduce((sum, l) => 
      sum + (l.financials.actualRevenue || l.financials.estimatedRevenue || 0), 0
    );
    const harvestProfit = harvestedLedgers.reduce((sum, l) => 
      sum + (l.financials.actualProfit || l.financials.estimatedProfit || 0), 0
    );
    const harvestInvestment = harvestedLedgers.reduce((sum, l) => 
      sum + (l.financials.capital || 0), 0
    );

    return { totalHarvested, harvestRevenue, harvestProfit, harvestInvestment };
  }, [ledgers]);

  useEffect(() => {
    // Extract unique crops for filter
    if (ledgers.length > 0) {
      const crops = [...new Set(ledgers.map(l => l.crop))].sort();
      setUniqueCrops(crops);
    }
  }, [ledgers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparation':
        return 'bg-blue-100 text-blue-800';
      case 'planting':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'harvesting':
        return 'bg-purple-100 text-purple-800';
      case 'post-harvest':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`w-12 h-12 border-4 ${spinnerColor} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
          <p className="text-muted-foreground">Loading ledger data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalInvestment)}</div>
            <p className="text-xs text-muted-foreground">Capital allocated</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Income generated</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            {summary.totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Net earnings</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Crops</CardTitle>
            <Sprout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeLedgers}</div>
            <p className="text-xs text-muted-foreground">Currently growing</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-purple-200 bg-purple-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Harvest Report</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{harvestStats.totalHarvested}</div>
            <p className="text-xs text-muted-foreground">Harvested crops</p>
            <div className="mt-2 pt-2 border-t border-purple-200 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Revenue:</span>
                <span className="font-medium text-purple-700">{formatCurrency(harvestStats.harvestRevenue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Profit:</span>
                <span className={`font-medium ${harvestStats.harvestProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(harvestStats.harvestProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 (Monthly) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Monthly</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyStats.investmentMonthly)}</div>
            <p className="text-xs text-muted-foreground">This month's investments</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Monthly</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyStats.profitMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlyStats.profitMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">This month's profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops, locations..."
                value={filters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="pl-10 shadow-sm border border-gray-300 bg-[#FAF9F6]"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => updateFilters({ status: value as any })}
            >
              <SelectTrigger className="shadow-sm border border-gray-300 bg-[#FAF9F6] hover:bg-primary hover:text-white transition-colors">
                <SelectValue placeholder="Filter by growth stage" />
              </SelectTrigger>
              <SelectContent className="hover:bg-white [&_[data-state=checked]]:bg-primary [&_[data-state=checked]]:text-white">
                <SelectItem value="all" className="hover:!bg-primary hover:!text-white cursor-pointer">All Stages</SelectItem>
                <SelectItem value="preparation" className="hover:!bg-primary hover:!text-white cursor-pointer">Preparation</SelectItem>
                <SelectItem value="planting" className="hover:!bg-primary hover:!text-white cursor-pointer">Planting</SelectItem>
                <SelectItem value="maintenance" className="hover:!bg-primary hover:!text-white cursor-pointer">Maintenance</SelectItem>
                <SelectItem value="harvesting" className="hover:!bg-primary hover:!text-white cursor-pointer">Harvesting</SelectItem>
                <SelectItem value="post-harvest" className="hover:!bg-primary hover:!text-white cursor-pointer">Post-Harvest</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.crop}
              onValueChange={(value) => updateFilters({ crop: value })}
            >
              <SelectTrigger className="shadow-sm border border-gray-300 bg-[#FAF9F6] hover:bg-primary hover:text-white transition-colors">
                <SelectValue placeholder="Filter by crop" />
              </SelectTrigger>
              <SelectContent className="hover:bg-white [&_[data-state=checked]]:bg-primary [&_[data-state=checked]]:text-white">
                <SelectItem value="all" className="hover:!bg-primary hover:!text-white cursor-pointer">All Crops</SelectItem>
                {uniqueCrops.map((crop) => (
                  <SelectItem key={crop} value={crop} className="hover:!bg-primary hover:!text-white cursor-pointer">
                    {crop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full shadow-sm border border-gray-300 bg-[#FAF9F6] hover:bg-primary hover:text-white transition-colors"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Entries Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>
            {ledgers.length} {ledgers.length === 1 ? 'entry' : 'entries'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledgers.length === 0 ? (
            <div className="text-center py-12">
              <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Ledger Entries Yet</h3>
              <p className="text-muted-foreground mb-4">
                Your farm ledger will automatically populate when you add crops.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell>{formatDate(ledger.date)}</TableCell>
                      <TableCell className="font-medium">{ledger.crop}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ledger.status)}>
                          {ledger.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ledger.financials.capital)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(ledger.financials.actualRevenue || ledger.financials.estimatedRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          (ledger.financials.actualProfit || ledger.financials.estimatedProfit) >= 0
                            ? 'text-green-600 font-semibold'
                            : 'text-red-600 font-semibold'
                        }>
                          {formatCurrency(ledger.financials.actualProfit || ledger.financials.estimatedProfit)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerContent;

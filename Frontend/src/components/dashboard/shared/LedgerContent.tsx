/**
 * Shared Ledger Content Component
 * Used by both Farmer and Admin to ensure identical data rendering and computations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MapPin,
  Eye,
  BarChart3,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface LedgerContentProps {
  userId: string;
  isAdmin?: boolean;
  onNavigateToLedgerDetail?: (ledgerId: string) => void;
}

const LedgerContent = ({ userId, isAdmin = false, onNavigateToLedgerDetail }: LedgerContentProps) => {
  const navigate = useNavigate();
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
  const monthlyStats = useState(() => {
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
  });

  useEffect(() => {
    // Extract unique crops for filter
    if (ledgers.length > 0) {
      const crops = [...new Set(ledgers.map(l => l.crop))].sort();
      setUniqueCrops(crops);
    }
  }, [ledgers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'planted':
        return 'bg-green-100 text-green-800';
      case 'growing':
        return 'bg-yellow-100 text-yellow-800';
      case 'harvested':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
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

  const handleViewDetails = (ledgerId: string) => {
    if (onNavigateToLedgerDetail) {
      onNavigateToLedgerDetail(ledgerId);
    } else if (!isAdmin) {
      navigate(`/farmer/ledger/${ledgerId}`);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Summary Cards - Row 2 (Monthly) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Monthly</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyStats[0].investmentMonthly)}</div>
            <p className="text-xs text-muted-foreground">This month's investments</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Monthly</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyStats[0].profitMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(monthlyStats[0].profitMonthly)}
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
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => updateFilters({ status: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="planted">Planted</SelectItem>
                <SelectItem value="growing">Growing</SelectItem>
                <SelectItem value="harvested">Harvested</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.crop}
              onValueChange={(value) => updateFilters({ crop: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by crop" />
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

            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full"
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
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell>{formatDate(ledger.date)}</TableCell>
                      <TableCell className="font-medium">{ledger.crop}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {ledger.location}
                        </div>
                      </TableCell>
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(ledger.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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

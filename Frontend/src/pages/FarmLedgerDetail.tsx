/**
 * Farm Ledger Detail Page
 * View complete ledger information with all details
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { getLedgerById } from '@/services/farmLedgerService';
import { FarmLedger } from '@/services/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Sprout,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  FileText,
  Clock,
  Thermometer,
  Droplets,
  Sun
} from 'lucide-react';
import { format } from 'date-fns';

const FarmLedgerDetail = () => {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<FarmLedger | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ledgerId) {
      navigate('/farmer/ledger');
      return;
    }
    loadLedger(ledgerId);
  }, [ledgerId, navigate]);

  const loadLedger = async (id: string) => {
    setLoading(true);
    try {
      const data = await getLedgerById(id);
      setLedger(data);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
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
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading ledger details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!ledger) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="outline" onClick={() => navigate('/farmer/ledger')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ledger
          </Button>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ledger Not Found</h2>
            <Button onClick={() => navigate('/farmer/ledger')}>
              Return to Ledger
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Button variant="outline" onClick={() => navigate('/farmer/ledger')} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ledger
            </Button>
            <h1 className="text-3xl font-bold">{ledger.crop}</h1>
            <p className="text-muted-foreground mt-1">
              Ledger entry from {formatDate(ledger.date)}
            </p>
          </div>
          <Badge className={`text-lg px-4 py-2 ${getStatusColor(ledger.status)}`}>
            {ledger.status}
          </Badge>
        </div>

        {/* General Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Crop</h3>
                <p className="font-medium text-lg">{ledger.crop}</p>
                {ledger.variety && <p className="text-sm text-muted-foreground">{ledger.variety}</p>}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <p className="font-medium">{ledger.location}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created Date</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <p>{formatDate(ledger.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Planting Date</h3>
                <div className="flex items-center gap-2">
                  <Sprout className="h-4 w-4" />
                  <p>{ledger.plantingDate ? formatDate(ledger.plantingDate) : 'Not set'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Harvest Date</h3>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <p>{ledger.harvestDate ? formatDate(ledger.harvestDate) : 'Not set'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <p>{formatDate(ledger.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Parameters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
            <CardDescription>Soil and weather conditions at time of planting</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Soil Conditions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Soil Type:</span>
                  <span className="font-medium">{ledger.inputParameters.soil.soilType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">pH Level:</span>
                  <span className="font-medium">{ledger.inputParameters.soil.pH}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nitrogen:</span>
                  <Badge variant="outline">{ledger.inputParameters.soil.nitrogen}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phosphorus:</span>
                  <Badge variant="outline">{ledger.inputParameters.soil.phosphorus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potassium:</span>
                  <Badge variant="outline">{ledger.inputParameters.soil.potassium}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Weather Conditions
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temperature:</span>
                  <span className="font-medium">{ledger.inputParameters.weather.temperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Humidity:</span>
                  <span className="font-medium">{ledger.inputParameters.weather.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition:</span>
                  <span className="font-medium">{ledger.inputParameters.weather.condition}</span>
                </div>
              </div>

              <h3 className="font-semibold flex items-center gap-2 mt-4">
                <MapPin className="h-4 w-4" />
                Farm Area
              </h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Area:</span>
                <span className="font-medium">{ledger.inputParameters.location.area} hectares</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Data */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Capital & Expenses</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capital:</span>
                    <span className="font-medium">{formatCurrency(ledger.financials.capital)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Expense Breakdown:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seeds:</span>
                      <span>{formatCurrency(ledger.financials.expenses.seeds)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fertilizer:</span>
                      <span>{formatCurrency(ledger.financials.expenses.fertilizer)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pesticides:</span>
                      <span>{formatCurrency(ledger.financials.expenses.pesticides)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Labor:</span>
                      <span>{formatCurrency(ledger.financials.expenses.labor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Equipment:</span>
                      <span>{formatCurrency(ledger.financials.expenses.equipment)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Irrigation:</span>
                      <span>{formatCurrency(ledger.financials.expenses.irrigation)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transportation:</span>
                      <span>{formatCurrency(ledger.financials.expenses.transportation)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Miscellaneous:</span>
                      <span>{formatCurrency(ledger.financials.expenses.miscellaneous)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Expenses:</span>
                    <span className="font-semibold">{formatCurrency(ledger.financials.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Revenue & Profit</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Revenue:</span>
                    <span className="font-medium">{formatCurrency(ledger.financials.estimatedRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Revenue:</span>
                    <span className="font-medium">{formatCurrency(ledger.financials.actualRevenue || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Profit:</span>
                    <span className={ledger.financials.estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(ledger.financials.estimatedProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Profit:</span>
                    <span className={
                      (ledger.financials.actualProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }>
                      {formatCurrency(ledger.financials.actualProfit || 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Profit Margin:</span>
                    <span className="font-semibold">
                      {ledger.financials.profitMargin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity History */}
        {ledger.activities.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>{ledger.activities.length} activities recorded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ledger.activities.map((activity) => (
                  <div key={activity.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2">{activity.type}</Badge>
                        <p className="font-medium">{activity.description}</p>
                        {activity.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(activity.date)}
                        </p>
                        {activity.cost && (
                          <p className="text-sm font-medium mt-1">
                            {formatCurrency(activity.cost)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations & Notes */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recommendations & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {ledger.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">AI Recommendations</h3>
                <ul className="space-y-2">
                  {ledger.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ledger.generalNotes && (
              <div>
                <h3 className="font-semibold mb-2">General Notes</h3>
                <p className="text-muted-foreground">{ledger.generalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FarmLedgerDetail;

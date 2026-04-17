/**
 * Farm Ledger New/Edit Form
 * Create or edit ledger entries with comprehensive financial tracking
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useFarmLedger } from '@/hooks/custom/useFarmLedger';
import { getLedgerById } from '@/services/farmLedgerService';
import { FarmLedger, ExpenseBreakdown, FinancialData, InputParameters } from '@/services/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  DollarSign,
  Save,
  Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FarmLedgerForm = () => {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createNewLedger, updateExistingLedger } = useFarmLedger(
    localStorage.getItem('userId') || undefined
  );

  const isEditMode = !!ledgerId;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // General
    date: new Date().toISOString().split('T')[0],
    crop: '',
    variety: '',
    location: '',
    status: 'planned',
    
    // Input Parameters
    soilType: '',
    pH: 7.0,
    nitrogen: 'M',
    phosphorus: 'M',
    potassium: 'M',
    temperature: 28,
    humidity: 70,
    weatherCondition: 'Sunny',
    farmArea: 1.0,
    
    // Financials
    capital: 0,
    seeds: 0,
    fertilizer: 0,
    pesticides: 0,
    labor: 0,
    equipment: 0,
    irrigation: 0,
    transportation: 0,
    miscellaneous: 0,
    estimatedRevenue: 0,
    actualRevenue: 0,
    
    // Activities
    plantingDate: '',
    harvestDate: '',
    generalNotes: ''
  });

  useEffect(() => {
    if (isEditMode && ledgerId) {
      loadLedger(ledgerId);
    }
  }, [ledgerId]);

  const loadLedger = async (id: string) => {
    setLoading(true);
    try {
      const ledger = await getLedgerById(id);
      if (ledger) {
        setFormData({
          date: ledger.date.split('T')[0],
          crop: ledger.crop,
          variety: ledger.variety || '',
          location: ledger.location,
          status: ledger.status,
          soilType: ledger.inputParameters.soil.soilType,
          pH: ledger.inputParameters.soil.pH,
          nitrogen: ledger.inputParameters.soil.nitrogen,
          phosphorus: ledger.inputParameters.soil.phosphorus,
          potassium: ledger.inputParameters.soil.potassium,
          temperature: ledger.inputParameters.weather.temperature,
          humidity: ledger.inputParameters.weather.humidity,
          weatherCondition: ledger.inputParameters.weather.condition,
          farmArea: ledger.inputParameters.location.area,
          capital: ledger.financials.capital,
          seeds: ledger.financials.expenses.seeds,
          fertilizer: ledger.financials.expenses.fertilizer,
          pesticides: ledger.financials.expenses.pesticides,
          labor: ledger.financials.expenses.labor,
          equipment: ledger.financials.expenses.equipment,
          irrigation: ledger.financials.expenses.irrigation,
          transportation: ledger.financials.expenses.transportation,
          miscellaneous: ledger.financials.expenses.miscellaneous,
          estimatedRevenue: ledger.financials.estimatedRevenue,
          actualRevenue: ledger.financials.actualRevenue || 0,
          plantingDate: ledger.plantingDate ? ledger.plantingDate.split('T')[0] : '',
          harvestDate: ledger.harvestDate ? ledger.harvestDate.split('T')[0] : '',
          generalNotes: ledger.generalNotes
        });
      }
    } catch (error) {
      console.error('Error loading ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ledger data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalExpenses = (): number => {
    return (
      formData.seeds +
      formData.fertilizer +
      formData.pesticides +
      formData.labor +
      formData.equipment +
      formData.irrigation +
      formData.transportation +
      formData.miscellaneous
    );
  };

  const calculateProfit = (): number => {
    return formData.actualRevenue - calculateTotalExpenses();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expenses: ExpenseBreakdown = {
        seeds: formData.seeds,
        fertilizer: formData.fertilizer,
        pesticides: formData.pesticides,
        labor: formData.labor,
        equipment: formData.equipment,
        irrigation: formData.irrigation,
        transportation: formData.transportation,
        miscellaneous: formData.miscellaneous
      };

      const totalExpenses = calculateTotalExpenses();
      const actualProfit = formData.actualRevenue - totalExpenses;
      const estimatedProfit = formData.estimatedRevenue - totalExpenses;
      const profitMargin = formData.actualRevenue > 0 
        ? (actualProfit / formData.actualRevenue) * 100 
        : 0;

      const financials: FinancialData = {
        capital: formData.capital,
        expenses,
        totalExpenses,
        estimatedRevenue: formData.estimatedRevenue,
        actualRevenue: formData.actualRevenue,
        estimatedProfit,
        actualProfit,
        profitMargin
      };

      const inputParameters: InputParameters = {
        soil: {
          pH: formData.pH,
          nitrogen: formData.nitrogen,
          phosphorus: formData.phosphorus,
          potassium: formData.potassium,
          soilType: formData.soilType
        },
        weather: {
          temperature: formData.temperature,
          humidity: formData.humidity,
          condition: formData.weatherCondition
        },
        location: {
          barangay: formData.location,
          farmAddress: formData.location,
          area: formData.farmArea
        }
      };

      const ledgerData = {
        date: new Date(formData.date).toISOString(),
        crop: formData.crop,
        variety: formData.variety,
        location: formData.location,
        status: formData.status as any,
        inputParameters,
        financials,
        activities: [],
        plantingDate: formData.plantingDate ? new Date(formData.plantingDate).toISOString() : null,
        harvestDate: formData.harvestDate ? new Date(formData.harvestDate).toISOString() : null,
        generalNotes: formData.generalNotes,
        recommendations: [],
        username: localStorage.getItem('username') || 'Unknown'
      };

      let result;
      if (isEditMode && ledgerId) {
        result = await updateExistingLedger(ledgerId, ledgerData);
      } else {
        result = await createNewLedger(ledgerData);
      }

      if (result) {
        navigate('/farmer/ledger');
      }
    } catch (error) {
      console.error('Error saving ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to save ledger entry.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && isEditMode) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading ledger...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Button variant="outline" onClick={() => navigate('/farmer/ledger')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Ledger Entry' : 'New Ledger Entry'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update your farming activity details' : 'Record a new farming activity'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="crop">Crop Name</Label>
                <Input
                  id="crop"
                  value={formData.crop}
                  onChange={(e) => handleInputChange('crop', e.target.value)}
                  placeholder="e.g., Rice, Tomato"
                  required
                />
              </div>

              <div>
                <Label htmlFor="variety">Variety (Optional)</Label>
                <Input
                  id="variety"
                  value={formData.variety}
                  onChange={(e) => handleInputChange('variety', e.target.value)}
                  placeholder="e.g., Jasmine, Cherry"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Barangay or farm location"
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Growth Stage</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select growth stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparation">Preparation</SelectItem>
                    <SelectItem value="planting">Planting</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="harvesting">Harvesting</SelectItem>
                    <SelectItem value="post-harvest">Post-Harvest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="plantingDate">Planting Date (Optional)</Label>
                <Input
                  id="plantingDate"
                  type="date"
                  value={formData.plantingDate}
                  onChange={(e) => handleInputChange('plantingDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="harvestDate">Harvest Date (Optional)</Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={formData.harvestDate}
                  onChange={(e) => handleInputChange('harvestDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Input Parameters */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Input Parameters</CardTitle>
              <CardDescription>Soil and weather conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="soilType">Soil Type</Label>
                  <Input
                    id="soilType"
                    value={formData.soilType}
                    onChange={(e) => handleInputChange('soilType', e.target.value)}
                    placeholder="e.g., Loam, Clay"
                  />
                </div>

                <div>
                  <Label htmlFor="pH">Soil pH</Label>
                  <Input
                    id="pH"
                    type="number"
                    step="0.1"
                    value={formData.pH}
                    onChange={(e) => handleInputChange('pH', parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="nitrogen">Nitrogen Level</Label>
                  <Select
                    value={formData.nitrogen}
                    onValueChange={(value) => handleInputChange('nitrogen', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (L)</SelectItem>
                      <SelectItem value="M">Medium (M)</SelectItem>
                      <SelectItem value="H">High (H)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phosphorus">Phosphorus Level</Label>
                  <Select
                    value={formData.phosphorus}
                    onValueChange={(value) => handleInputChange('phosphorus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (L)</SelectItem>
                      <SelectItem value="M">Medium (M)</SelectItem>
                      <SelectItem value="H">High (H)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="potassium">Potassium Level</Label>
                  <Select
                    value={formData.potassium}
                    onValueChange={(value) => handleInputChange('potassium', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Low (L)</SelectItem>
                      <SelectItem value="M">Medium (M)</SelectItem>
                      <SelectItem value="H">High (H)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="farmArea">Farm Area (hectares)</Label>
                  <Input
                    id="farmArea"
                    type="number"
                    step="0.1"
                    value={formData.farmArea}
                    onChange={(e) => handleInputChange('farmArea', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Data */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Expenses */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Expenses</h3>
                  
                  <div>
                    <Label htmlFor="capital">Capital</Label>
                    <Input
                      id="capital"
                      type="number"
                      value={formData.capital}
                      onChange={(e) => handleInputChange('capital', parseFloat(e.target.value))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {['seeds', 'fertilizer', 'pesticides', 'labor', 'equipment', 'irrigation', 'transportation', 'miscellaneous'].map((expense) => (
                      <div key={expense}>
                        <Label htmlFor={expense} className="capitalize">{expense}</Label>
                        <Input
                          id={expense}
                          type="number"
                          value={formData[expense as keyof typeof formData]}
                          onChange={(e) => handleInputChange(expense, parseFloat(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>

                  <Separator />
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold">Total Expenses:</span>
                    <span className="text-xl font-bold text-blue-600">
                      ₱{calculateTotalExpenses().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Right Column - Revenue */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Revenue & Profit</h3>
                  
                  <div>
                    <Label htmlFor="estimatedRevenue">Estimated Revenue</Label>
                    <Input
                      id="estimatedRevenue"
                      type="number"
                      value={formData.estimatedRevenue}
                      onChange={(e) => handleInputChange('estimatedRevenue', parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="actualRevenue">Actual Revenue (if harvested)</Label>
                    <Input
                      id="actualRevenue"
                      type="number"
                      value={formData.actualRevenue}
                      onChange={(e) => handleInputChange('actualRevenue', parseFloat(e.target.value))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span>Total Expenses:</span>
                      <span className="font-medium">₱{calculateTotalExpenses().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual Revenue:</span>
                      <span className="font-medium">₱{formData.actualRevenue.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Profit:</span>
                      <span className={calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₱{calculateProfit().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="generalNotes"
                value={formData.generalNotes}
                onChange={(e) => handleInputChange('generalNotes', e.target.value)}
                placeholder="Add any observations, challenges, or notes about this crop..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/farmer/ledger')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : isEditMode ? 'Update Ledger' : 'Create Ledger'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default FarmLedgerForm;

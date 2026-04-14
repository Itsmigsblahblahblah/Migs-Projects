/**
 * Farm Ledger System - Type Definitions and Interfaces
 * Comprehensive tracking for crop recommendations, financials, and activities
 */

// Ledger Entry Status
export type LedgerStatus = 'planned' | 'planted' | 'growing' | 'harvested' | 'completed';

// Expense Categories
export interface ExpenseBreakdown {
  seeds: number;
  fertilizer: number;
  pesticides: number;
  labor: number;
  equipment: number;
  irrigation: number;
  transportation: number;
  miscellaneous: number;
}

// Financial Data
export interface FinancialData {
  capital: number;
  expenses: ExpenseBreakdown;
  totalExpenses: number; // Auto-calculated
  estimatedRevenue: number;
  actualRevenue: number;
  estimatedProfit: number; // Auto-calculated
  actualProfit: number; // Auto-calculated
  profitMargin: number; // Auto-calculated percentage
}

// Activity History
export interface ActivityRecord {
  id: string;
  type: 'planting' | 'maintenance' | 'harvesting' | 'note';
  date: string;
  description: string;
  notes?: string;
  cost?: number;
  createdAt: string;
}

// Input Parameters
export interface InputParameters {
  soil: {
    pH: number;
    nitrogen: string; // 'L', 'M', 'H'
    phosphorus: string; // 'L', 'M', 'H'
    potassium: string; // 'L', 'M', 'H'
    soilType: string;
  };
  weather: {
    temperature: number;
    humidity: number;
    condition: string;
    forecast?: string;
  };
  location: {
    barangay: string;
    farmAddress: string;
    area: number; // in hectares
  };
}

// Main Ledger Entry
export interface FarmLedger {
  id: string;
  userId: string;
  username: string;
  
  // General Information
  date: string; // Creation date
  crop: string;
  variety?: string;
  location: string;
  status: LedgerStatus;
  
  // Input Parameters (at time of recommendation/planting)
  inputParameters: InputParameters;
  
  // Financial Data
  financials: FinancialData;
  
  // Activity Tracking
  activities: ActivityRecord[];
  plantingDate: string | null;
  harvestDate: string | null;
  
  // Notes and Observations
  generalNotes: string;
  recommendations: string[]; // From AI recommendation
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  recommendationSessionId?: string; // Link to original recommendation
  
  // Checklist data for harvest tracking
  checklist?: Array<{
    id: string;
    title: string;
    completed: boolean;
    category: string;
    completedAt?: string;
  }>;
}

// Ledger Summary (for quick overview)
export interface LedgerSummary {
  totalInvestment: number;
  totalExpenses: number;
  totalRevenue: number;
  totalProfit: number;
  averageProfitMargin: number;
  activeLedgers: number;
  completedLedgers: number;
  // Monthly harvest tracking
  totalMonthlyHarvests: number;
  mostHarvestedCrop: string;
  mostHarvestedCropCount: number;
}

// Filter Options
export interface LedgerFilters {
  status: 'all' | LedgerStatus;
  crop: 'all' | string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  searchQuery: string;
}

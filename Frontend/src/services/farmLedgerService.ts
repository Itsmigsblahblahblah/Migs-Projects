/**
 * Farm Ledger Service
 * Auto-generates ledger entries from farmerCrops collection
 * Uses INSIGHTS CACHING to match EnhancedSalesForecastCard EXACTLY
 * Only calls API once per crop type, then caches for instant subsequent loads
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { getCropInsights } from '@/services/cropDataService';
import { FarmLedger, ExpenseBreakdown } from './types';

// Cache for FULL crop insights responses (avoids repeated API calls)
// Key: "cropName-soilType", Value: insights object
// Using sessionStorage for persistence across page navigations
const INSIGHTS_CACHE: Record<string, any> = {};

// Track in-flight requests to prevent duplicate calls
const PENDING_REQUESTS: Record<string, Promise<any>> = {};

/**
 * Get crop insights with intelligent caching
 * Calls API only ONCE per unique crop+soil combination
 * Subsequent calls return cached data instantly
 */
const getCachedCropInsights = async (
  cropName: string,
  soilType: string,
  landArea: number,
  puhunan: number
): Promise<any> => {
  const cacheKey = `${cropName.toLowerCase()}-${soilType.toLowerCase()}`;
  
  // Return from cache if available (INSTANT!)
  if (INSIGHTS_CACHE[cacheKey]) {
    return INSIGHTS_CACHE[cacheKey];
  }
  
  // If request is already in-flight, return the same promise (deduplication)
  if (PENDING_REQUESTS[cacheKey]) {
    return PENDING_REQUESTS[cacheKey];
  }
  
  // Call API ONCE and cache the result
  const requestPromise = (async () => {
    try {
      const insights = await getCropInsights(cropName, soilType, landArea, puhunan);
      INSIGHTS_CACHE[cacheKey] = insights;
      return insights;
    } finally {
      // Remove from pending once complete
      delete PENDING_REQUESTS[cacheKey];
    }
  })();
  
  PENDING_REQUESTS[cacheKey] = requestPromise;
  return requestPromise;
};

/**
 * Helper to get crop data and calculate profit/revenue/status
 * Uses CACHED insights to EXACTLY match EnhancedSalesForecastCard calculations
 * Formula (identical to EnhancedSalesForecastCard lines 168-179):
 *   estimatedYield = insights.estimatedYield * (userInvestment / suggestedCapital)
 *   revenue = estimatedYield * market.averagePrice
 *   profit = revenue - userInvestment
 */
const calculateLedgerData = async (
  crop: any
): Promise<Partial<FarmLedger>> => {
  try {
    const cropName = crop.name || 'Unknown';
    const userInvestment = Number(crop.puhunan) || 0;
    
    // Get insights from cache (API called only ONCE per crop type)
    const cropInsights = await getCachedCropInsights(
      cropName,
      crop.soilType || 'default',
      crop.landArea || 0,
      userInvestment
    );
    
    // EXACT calculation matching EnhancedSalesForecastCard lines 160-179
    const suggestedCapital = cropInsights?.profit?.suggestedCapital || 0;
    
    // Calculate estimated yield (SAME formula as EnhancedSalesForecastCard line 168-170)
    const estimatedYield = userInvestment === 0 ? 0 :
      (cropInsights?.profit?.estimatedYield || 0) *
      (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 ? 1 : (userInvestment / suggestedCapital));
    
    // Calculate revenue (SAME as EnhancedSalesForecastCard line 175)
    const marketPrice = cropInsights?.market?.averagePrice || 0;
    const revenue = estimatedYield * marketPrice;
    
    // Calculate profit (SAME as EnhancedSalesForecastCard line 179)
    const profit = userInvestment === 0 ? 0 : revenue - userInvestment;

    console.log(`[Ledger] EXACT match for ${cropName}:`, {
      userInvestment,
      suggestedCapital,
      estimatedYield: cropInsights?.profit?.estimatedYield,
      calculatedEstimatedYield: estimatedYield,
      marketPrice,
      revenue,
      profit
    });

    // Status from crop
    const status = crop.status || 'planned';

    const emptyExpenses: ExpenseBreakdown = {
      seeds: 0, fertilizer: 0, pesticides: 0, labor: 0,
      equipment: 0, irrigation: 0, transportation: 0, miscellaneous: 0
    };

    return {
      crop: crop.name || 'Unknown Crop',
      location: crop.farmAddress || crop.location || 'Unknown Location',
      status: status,
      financials: {
        capital: userInvestment,
        expenses: emptyExpenses,
        totalExpenses: 0,
        estimatedProfit: profit,
        actualProfit: profit,
        estimatedRevenue: revenue,
        actualRevenue: revenue,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      }
    };
  } catch (error) {
    console.error('[Ledger] Error calculating ledger data:', error);
    return {};
  }
};

/**
 * Get user's ledger entries
 * Uses CACHED insights (API called only ONCE per unique crop type)
 */
export const getUserLedgers = async (userId: string, getCropById?: (id: string) => any): Promise<FarmLedger[]> => {
  try {
    const cropsRef = collection(db, 'farmerCrops');
    const cropsQuery = query(cropsRef, where('userId', '==', userId));
    const cropsSnap = await getDocs(cropsQuery);
    
    const ledgers: FarmLedger[] = [];
    
    // Calculate all ledgers in parallel (API called once per crop type, then cached)
    const cropPromises = cropsSnap.docs.map(async (cropDoc) => {
      const cropData = cropDoc.data();
      const cropId = cropDoc.id;
      
      try {
        // Get crop data (from context or use directly)
        const crop = getCropById ? getCropById(cropId) : cropData;
        
        // Calculate using cached insights (API called only once per crop type!)
        const calculatedData = await calculateLedgerData(crop || cropData);
        
        const emptyExpenses: ExpenseBreakdown = {
          seeds: 0, fertilizer: 0, pesticides: 0, labor: 0,
          equipment: 0, irrigation: 0, transportation: 0, miscellaneous: 0
        };
        
        return {
          id: cropId,
          userId: userId,
          username: cropData.username || '',
          // Use plantedDate, fallback to createdAt, then null (no today's date fallback)
          date: cropData.plantedDate?.toDate?.() || cropData.createdAt?.toDate?.() || null,
          crop: calculatedData.crop || cropData.name || 'Unknown',
          variety: cropData.variety || '',
          location: calculatedData.location || cropData.farmAddress || 'Unknown',
          status: (calculatedData.status || 'planned') as any,
          inputParameters: {
            soil: { pH: 0, nitrogen: 'M', phosphorus: 'M', potassium: 'M', soilType: cropData.soilType || '' },
            weather: { temperature: 0, humidity: 0, condition: '' },
            location: { barangay: '', farmAddress: cropData.farmAddress || '', area: cropData.landArea || 0 }
          },
          financials: {
            capital: calculatedData.financials?.capital || 0,
            expenses: emptyExpenses,
            totalExpenses: 0,
            estimatedProfit: calculatedData.financials?.estimatedProfit || 0,
            actualProfit: calculatedData.financials?.actualProfit || 0,
            estimatedRevenue: calculatedData.financials?.estimatedRevenue || 0,
            actualRevenue: calculatedData.financials?.actualRevenue || 0,
            profitMargin: calculatedData.financials?.profitMargin || 0
          },
          activities: [],
          plantingDate: cropData.plantedDate?.toDate?.() || null,
          harvestDate: cropData.harvestDate?.toDate?.() || null,
          generalNotes: cropData.generalNotes || '',
          recommendations: cropData.recommendations || [],
          createdAt: cropData.createdAt?.toDate?.() || new Date().toISOString(),
          updatedAt: cropData.updatedAt?.toDate?.() || new Date().toISOString(),
          checklist: cropData.checklist || [] // Include checklist data
        };
      } catch (error) {
        console.error('[Ledger] Error processing crop:', cropId, error);
        return null;
      }
    });
    
    // Wait for all calculations and filter out nulls
    const results = (await Promise.all(cropPromises)).filter(Boolean) as FarmLedger[];
    ledgers.push(...results);
    
    return ledgers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('[Ledger] Error getting user ledgers:', error);
    return [];
  }
};

/**
 * Get all ledger entries (for admin)
 * Uses CACHED insights (API called only ONCE per unique crop type)
 */
export const getAllLedgers = async (getCropById?: (id: string) => any): Promise<FarmLedger[]> => {
  try {
    const cropsRef = collection(db, 'farmerCrops');
    const cropsSnap = await getDocs(cropsRef);
    
    const ledgers: FarmLedger[] = [];
    
    // Calculate all ledgers in parallel (API called once per crop type, then cached)
    const cropPromises = cropsSnap.docs.map(async (cropDoc) => {
      const cropData = cropDoc.data();
      const cropId = cropDoc.id;
      const userId = cropData.userId;
      
      if (!userId) {
        return null;
      }
      
      try {
        // Get crop data (from context or use directly)
        const crop = getCropById ? getCropById(cropId) : cropData;
        
        // Calculate using cached insights (API called only once per crop type!)
        const calculatedData = await calculateLedgerData(crop || cropData);
        
        const emptyExpenses: ExpenseBreakdown = {
          seeds: 0, fertilizer: 0, pesticides: 0, labor: 0,
          equipment: 0, irrigation: 0, transportation: 0, miscellaneous: 0
        };
        
        return {
          id: cropId,
          userId: userId,
          username: cropData.username || '',
          // Use plantedDate, fallback to createdAt, then null (no today's date fallback)
          date: cropData.plantedDate?.toDate?.() || cropData.createdAt?.toDate?.() || null,
          crop: calculatedData.crop || cropData.name || 'Unknown',
          variety: cropData.variety || '',
          location: calculatedData.location || cropData.farmAddress || 'Unknown',
          status: (calculatedData.status || 'planned') as any,
          inputParameters: {
            soil: { pH: 0, nitrogen: 'M', phosphorus: 'M', potassium: 'M', soilType: cropData.soilType || '' },
            weather: { temperature: 0, humidity: 0, condition: '' },
            location: { barangay: '', farmAddress: cropData.farmAddress || '', area: cropData.landArea || 0 }
          },
          financials: {
            capital: calculatedData.financials?.capital || 0,
            expenses: emptyExpenses,
            totalExpenses: 0,
            estimatedProfit: calculatedData.financials?.estimatedProfit || 0,
            actualProfit: calculatedData.financials?.actualProfit || 0,
            estimatedRevenue: calculatedData.financials?.estimatedRevenue || 0,
            actualRevenue: calculatedData.financials?.actualRevenue || 0,
            profitMargin: calculatedData.financials?.profitMargin || 0
          },
          activities: [],
          plantingDate: cropData.plantedDate?.toDate?.() || null,
          harvestDate: cropData.harvestDate?.toDate?.() || null,
          generalNotes: cropData.generalNotes || '',
          recommendations: cropData.recommendations || [],
          createdAt: cropData.createdAt?.toDate?.() || new Date().toISOString(),
          updatedAt: cropData.updatedAt?.toDate?.() || new Date().toISOString(),
          checklist: cropData.checklist || [] // Include checklist data
        };
      } catch (error) {
        console.error('[Ledger] Error processing crop:', cropId, error);
        return null;
      }
    });
    
    // Wait for all calculations and filter out nulls
    const results = (await Promise.all(cropPromises)).filter(Boolean) as FarmLedger[];
    ledgers.push(...results);
    
    return ledgers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('[Ledger] Error getting all ledgers:', error);
    return [];
  }
};

/**
 * Calculate summary statistics
 */
export const calculateLedgerSummary = (ledgers: FarmLedger[]) => {
  const totalInvestment = ledgers.reduce((sum, l) => sum + (l.financials.capital || 0), 0);
  const totalRevenue = ledgers.reduce((sum, l) => sum + (l.financials.actualRevenue || l.financials.estimatedRevenue || 0), 0);
  const totalProfit = ledgers.reduce((sum, l) => sum + (l.financials.actualProfit || l.financials.estimatedProfit || 0), 0);
  
  const averageProfitMargin = totalRevenue > 0 
    ? (totalProfit / totalRevenue) * 100 
    : 0;

  // Calculate harvests based on completed checklists
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Count ALL crops with 100% completed checklists (for completedLedgers)
  const completedLedgers = ledgers.filter(l => {
    const hasChecklist = l.checklist && l.checklist.length > 0;
    const allCompleted = hasChecklist && l.checklist.every(item => item.completed);
    return allCompleted;
  }).length;

  // Count crops with 100% completed checklists THIS MONTH only
  const harvestedThisMonth = ledgers.filter(l => {
    // Check if the ledger has a date in the current month
    const ledgerDate = new Date(l.date);
    const isCurrentMonth = ledgerDate.getMonth() === currentMonth && ledgerDate.getFullYear() === currentYear;
    
    // Check if checklist is 100% complete
    const hasChecklist = l.checklist && l.checklist.length > 0;
    const allCompleted = hasChecklist && l.checklist.every(item => item.completed);
    
    return isCurrentMonth && allCompleted;
  }).length;

  const totalMonthlyHarvests = harvestedThisMonth;

  // Count active crops (checklist NOT 100% complete)
  const activeLedgers = ledgers.filter(l => {
    const hasChecklist = l.checklist && l.checklist.length > 0;
    const allCompleted = hasChecklist && l.checklist.every(item => item.completed);
    return !allCompleted;
  }).length;

  // Find most harvested crop (based on completed checklists)
  const cropHarvestCount: Record<string, number> = {};
  
  ledgers.forEach(l => {
    const hasChecklist = l.checklist && l.checklist.length > 0;
    const allCompleted = hasChecklist && l.checklist.every(item => item.completed);
    
    if (allCompleted) {
      const cropName = l.crop;
      cropHarvestCount[cropName] = (cropHarvestCount[cropName] || 0) + 1;
    }
  });

  let mostHarvestedCrop = 'N/A';
  let mostHarvestedCropCount = 0;

  Object.entries(cropHarvestCount).forEach(([crop, count]) => {
    if (count > mostHarvestedCropCount) {
      mostHarvestedCrop = crop;
      mostHarvestedCropCount = count;
    }
  });

  return {
    totalInvestment,
    totalExpenses: 0,
    totalRevenue,
    totalProfit,
    averageProfitMargin,
    activeLedgers,
    completedLedgers,
    totalMonthlyHarvests,
    mostHarvestedCrop,
    mostHarvestedCropCount
  };
};

// Placeholder functions
export const createLedger = async (_data: any): Promise<string> => {
  throw new Error('Ledgers are auto-generated from crops.');
};

export const updateLedger = async (_id: string, _updates: any): Promise<void> => {
  throw new Error('Ledgers are auto-generated from crops.');
};

export const deleteLedger = async (_id: string): Promise<void> => {
  throw new Error('Ledgers are auto-generated from crops.');
};

export const updateLedgerStatus = async (_id: string, _status: any, _additionalData?: any): Promise<void> => {
  throw new Error('Ledgers are auto-generated from crops.');
};

export const addActivity = async (_ledgerId: string, _activity: any): Promise<void> => {
  throw new Error('Activities are managed through crop updates.');
};

export const getLedgerById = async (_id: string): Promise<FarmLedger | null> => {
  throw new Error('Ledgers are auto-generated.');
};

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
import { log, error } from '@/utils/logger';

// Cache for FULL crop insights responses (avoids repeated API calls)
// Key: "cropName-soilType", Value: insights object
// Using sessionStorage for persistence across page navigations
const INSIGHTS_CACHE: Record<string, any> = {};

// Track in-flight requests to prevent duplicate calls
const PENDING_REQUESTS: Record<string, Promise<any>> = {};

/**
 * OPTIMIZATION: Pre-fetch all unique crop insights in ONE batch
 * Instead of fetching per-crop, we identify unique crop types first,
 * then fetch all insights in parallel for maximum speed.
 */
const preFetchCropInsights = async (crops: any[]): Promise<void> => {
  // Extract unique crop+soil combinations
  const uniqueCropKeys = new Set<string>();
  const cropsToFetch: Array<{crop: any, cacheKey: string}> = [];
  
  for (const crop of crops) {
    const cropName = (crop.name || 'Unknown').toLowerCase();
    const soilType = (crop.soilType || 'default').toLowerCase();
    const cacheKey = `${cropName}-${soilType}`;
    
    // Only fetch if not already cached or in-flight
    if (!INSIGHTS_CACHE[cacheKey] && !PENDING_REQUESTS[cacheKey]) {
      uniqueCropKeys.add(cacheKey);
      cropsToFetch.push({ crop, cacheKey });
    }
  }
  
  // Fetch all unique crop insights in parallel
  const fetchPromises = cropsToFetch.map(async ({ crop, cacheKey }) => {
    try {
      const cropName = crop.name || 'Unknown';
      const soilType = crop.soilType || 'default';
      const landArea = crop.landArea || 0;
      const puhunan = Number(crop.puhunan) || 0;
      
      const insights = await getCropInsights(cropName, soilType, landArea, puhunan);
      INSIGHTS_CACHE[cacheKey] = insights;
    } catch (error) {
      console.error(`[Ledger] Failed to prefetch insights for ${cacheKey}:`, error);
    }
  });
  
  // Wait for all prefetches to complete
  await Promise.all(fetchPromises);
};

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
 *   estimatedYield = insights.estimatedYield (BASE yield) * (userInvestment / suggestedCapital)
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
    const baseYield = cropInsights?.profit?.estimatedYield || 0; // BASE yield (not investment-adjusted)
    
    // Calculate estimated yield (SAME formula as EnhancedSalesForecastCard line 168-170)
    // Recalculate based on CURRENT investment, even if cache has old investment data
    const estimatedYield = userInvestment === 0 ? 0 :
      baseYield *
      (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 ? 1 : (userInvestment / suggestedCapital));
    
    // Calculate revenue (SAME as EnhancedSalesForecastCard line 175)
    const marketPrice = cropInsights?.market?.averagePrice || 0;
    const revenue = estimatedYield * marketPrice;
    
    // Calculate profit (SAME as EnhancedSalesForecastCard line 179)
    const profit = userInvestment === 0 ? 0 : revenue - userInvestment;

    log(`[Ledger] EXACT match for ${cropName}:`, {
      userInvestment,
      suggestedCapital,
      baseYield: baseYield,
      calculatedEstimatedYield: estimatedYield,
      marketPrice,
      revenue,
      profit
    });

    // Status from crop - calculate based on checklist completion
    let status = 'preparation';
    
    // If crop has checklist, calculate growth stage based on checklist completion
    if (crop.checklist && crop.checklist.length > 0) {
      try {
        const categories = ['Preparation', 'Planting', 'Maintenance', 'Harvesting', 'Post-Harvest'];
        const categoryProgress = categories.map((category: string) => {
          const itemsInCategory = crop.checklist.filter((item: any) => item.category === category);
          const completedItems = itemsInCategory.filter((item: any) => item.completed);
          return {
            category,
            total: itemsInCategory.length,
            completed: completedItems.length,
            percentage: itemsInCategory.length > 0 ? (completedItems.length / itemsInCategory.length) * 100 : 0
          };
        });

        // Determine status based on completion
        const postHarvest = categoryProgress.find((c: any) => c.category === 'Post-Harvest');
        if (postHarvest && postHarvest.percentage === 100) {
          status = 'post-harvest';
        } else {
          const harvesting = categoryProgress.find((c: any) => c.category === 'Harvesting');
          if (harvesting && harvesting.percentage === 100) {
            status = 'harvesting';
          } else {
            const maintenance = categoryProgress.find((c: any) => c.category === 'Maintenance');
            if (maintenance && maintenance.percentage === 100) {
              status = 'harvesting';
            } else {
              const planting = categoryProgress.find((c: any) => c.category === 'Planting');
              if (planting && planting.percentage === 100) {
                status = 'maintenance';
              } else {
                const preparation = categoryProgress.find((c: any) => c.category === 'Preparation');
                if (preparation && preparation.percentage === 100) {
                  status = 'planting';
                } else {
                  status = 'preparation';
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[Ledger] Error determining crop status from checklist:', error);
        status = 'preparation';
      }
    } else if (crop.plantedDate) {
      // Fallback to time-based if no checklist
      try {
        let plantedDate: Date;
        
        // Handle string dates (YYYY-MM-DD format)
        if (typeof crop.plantedDate === 'string') {
          plantedDate = new Date(crop.plantedDate);
        }
        // Handle Firestore Timestamp
        else if (crop.plantedDate?.toDate) {
          plantedDate = crop.plantedDate.toDate();
        }
        // Handle JavaScript Date objects
        else if (crop.plantedDate instanceof Date) {
          plantedDate = crop.plantedDate;
        } else {
          plantedDate = new Date();
        }
        
        if (!isNaN(plantedDate.getTime())) {
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Time-based fallback
          if (daysDiff > 90) {
            status = 'post-harvest';
          } else if (daysDiff > 60) {
            status = 'harvesting';
          } else if (daysDiff > 30) {
            status = 'maintenance';
          } else if (daysDiff > 14) {
            status = 'planting';
          } else {
            status = 'preparation';
          }
        }
      } catch (error) {
        console.error('[Ledger] Error determining crop status:', error);
        status = 'preparation';
      }
    }

    const emptyExpenses: ExpenseBreakdown = {
      seeds: 0, fertilizer: 0, pesticides: 0, labor: 0,
      equipment: 0, irrigation: 0, transportation: 0, miscellaneous: 0
    };

    return {
      crop: crop.name || 'Unknown Crop',
      location: crop.farmAddress || crop.location || 'Unknown Location',
      status: status as any,
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
    error('[Ledger] Error calculating ledger data:', error);
    return {};
  }
};

/**
 * Get user's ledger entries
 * OPTIMIZED: Pre-fetches all unique crop insights first, then processes ledgers instantly from cache
 */
export const getUserLedgers = async (userId: string, getCropById?: (id: string) => any): Promise<FarmLedger[]> => {
  try {
    const cropsRef = collection(db, 'farmerCrops');
    const cropsQuery = query(cropsRef, where('userId', '==', userId));
    const cropsSnap = await getDocs(cropsQuery);
    
    const ledgers: FarmLedger[] = [];
    const cropsData = cropsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    
    // OPTIMIZATION STEP 1: Pre-fetch all unique crop insights in ONE batch
    // This is the KEY performance improvement - fetch all at once instead of one-by-one
    await preFetchCropInsights(cropsData);
    
    // OPTIMIZATION STEP 2: Now process all ledgers (all data is cached, so this is FAST)
    const cropPromises = cropsData.map(async (cropData) => {
      const cropId = cropData.id;
      
      try {
        // Get crop data (from context or use directly)
        const crop = getCropById ? getCropById(cropId) : cropData;
        
        // Calculate using CACHED insights (instant, no API calls!)
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
          updatedAt: cropData.updatedAt?.toDate?.() || new Date().toISOString()
        };
      } catch (error) {
        error('[Ledger] Error processing crop:', cropId, error);
        return null;
      }
    });
    
    // Wait for all calculations and filter out nulls
    const results = (await Promise.all(cropPromises)).filter(Boolean) as FarmLedger[];
    ledgers.push(...results);
    
    return ledgers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    error('[Ledger] Error getting user ledgers:', error);
    return [];
  }
};

/**
 * Get all ledger entries (for admin)
 * OPTIMIZED: Pre-fetches all unique crop insights first, then processes ledgers instantly from cache
 */
export const getAllLedgers = async (getCropById?: (id: string) => any): Promise<FarmLedger[]> => {
  try {
    const cropsRef = collection(db, 'farmerCrops');
    const cropsSnap = await getDocs(cropsRef);
    
    const ledgers: FarmLedger[] = [];
    const cropsData = cropsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    
    // OPTIMIZATION STEP 1: Pre-fetch all unique crop insights in ONE batch
    await preFetchCropInsights(cropsData);
    
    // OPTIMIZATION STEP 2: Now process all ledgers (all data is cached, so this is FAST)
    const cropPromises = cropsData.map(async (cropData) => {
      const cropId = cropData.id;
      const userId = cropData.userId;
      
      if (!userId) {
        return null;
      }
      
      try {
        // Get crop data (from context or use directly)
        const crop = getCropById ? getCropById(cropId) : cropData;
        
        // Calculate using CACHED insights (instant, no API calls!)
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
          updatedAt: cropData.updatedAt?.toDate?.() || new Date().toISOString()
        };
      } catch (error) {
        error('[Ledger] Error processing crop:', cropId, error);
        return null;
      }
    });
    
    // Wait for all calculations and filter out nulls
    const results = (await Promise.all(cropPromises)).filter(Boolean) as FarmLedger[];
    ledgers.push(...results);
    
    return ledgers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    error('[Ledger] Error getting all ledgers:', error);
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
  
  // Active crops: preparation, planting, maintenance, harvesting (not yet post-harvest)
  const activeLedgers = ledgers.filter(l => 
    ['preparation', 'planting', 'maintenance', 'harvesting'].includes(l.status)
  ).length;
  
  // Completed crops: post-harvest only
  const completedLedgers = ledgers.filter(l => 
    l.status === 'post-harvest'
  ).length;
  
  const averageProfitMargin = totalRevenue > 0 
    ? (totalProfit / totalRevenue) * 100 
    : 0;

  return {
    totalInvestment,
    totalExpenses: 0,
    totalRevenue,
    totalProfit,
    averageProfitMargin,
    activeLedgers,
    completedLedgers
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

/**
 * OPTIMIZATION: Clear insights cache (call when crop data changes)
 */
export const clearInsightsCache = () => {
  Object.keys(INSIGHTS_CACHE).forEach(key => delete INSIGHTS_CACHE[key]);
  Object.keys(PENDING_REQUESTS).forEach(key => delete PENDING_REQUESTS[key]);
  console.log('[FarmLedgerService] Insights cache cleared');
};

/**
 * OPTIMIZATION: Get cache statistics for debugging
 */
export const getCacheStats = () => {
  return {
    insights: Object.keys(INSIGHTS_CACHE).length,
    pending: Object.keys(PENDING_REQUESTS).length
  };
};

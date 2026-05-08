/**
 * Service for caching crop insights data to avoid re-fetching during a user session
 * Follows the same pattern as marketDemandMultiCacheService and recommendationSessionCache
 */

// Cache key for localStorage
const CROP_INSIGHTS_CACHE_KEY = 'cropInsightsCache';
// Cache duration - 2 hours (in milliseconds) for better performance
const CACHE_DURATION = 2 * 60 * 60 * 1000;

/**
 * Get cached crop insights data from localStorage if available and valid
 * @param cacheKey Specific cache key to retrieve (e.g., "cropName-soilType")
 * @returns cached data or null if not available/valid
 */
export const getCachedCropInsights = (cacheKey: string): any => {
  try {
    const cachedDataString = localStorage.getItem(CROP_INSIGHTS_CACHE_KEY);
    if (!cachedDataString) return null;
    
    const allCachedData = JSON.parse(cachedDataString);
    const now = Date.now();
    
    const cachedEntry = allCachedData[cacheKey];
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      console.log(`[CropInsightsCache] Using cached data for key: ${cacheKey}`);
      
      // MIGRATION FIX: Check if this is old cached data with estimatedYield = 0
      // If so, clear it so it will be re-fetched with correct base yield
      const data = cachedEntry.data;
      if (data?.profit?.estimatedYield === 0 && data?.profit?.suggestedCapital > 0) {
        console.log(`[CropInsightsCache] Detected old cached data with 0 yield, clearing cache for key: ${cacheKey}`);
        delete allCachedData[cacheKey];
        localStorage.setItem(CROP_INSIGHTS_CACHE_KEY, JSON.stringify(allCachedData));
        return null; // Return null so it will fetch fresh data
      }
      
      // ADDITIONAL CHECK: If estimatedYield is very small (< 1) but suggestedCapital exists, it's likely invalid
      if (data?.profit?.estimatedYield > 0 && data?.profit?.estimatedYield < 1 && data?.profit?.suggestedCapital > 1000) {
        console.log(`[CropInsightsCache] Detected suspicious low yield (${data.profit.estimatedYield}), clearing cache for key: ${cacheKey}`);
        delete allCachedData[cacheKey];
        localStorage.setItem(CROP_INSIGHTS_CACHE_KEY, JSON.stringify(allCachedData));
        return null;
      }
      
      return cachedEntry.data;
    }
    
    // Remove expired entry
    if (cachedEntry) {
      console.log(`[CropInsightsCache] Cache expired for key: ${cacheKey}`);
      delete allCachedData[cacheKey];
      localStorage.setItem(CROP_INSIGHTS_CACHE_KEY, JSON.stringify(allCachedData));
    }
    return null;
  } catch (error) {
    console.error('Error reading crop insights cache:', error);
    return null;
  }
};

/**
 * Set crop insights data in localStorage cache
 * @param cacheKey The specific cache key (e.g., "cropName-soilType")
 * @param data The insights data to cache
 */
export const setCachedCropInsights = (cacheKey: string, data: any): void => {
  try {
    let allCachedData: Record<string, any> = {};
    
    // Get existing cached data
    const cachedDataString = localStorage.getItem(CROP_INSIGHTS_CACHE_KEY);
    if (cachedDataString) {
      try {
        allCachedData = JSON.parse(cachedDataString);
      } catch (e) {
        // If parsing fails, start with empty object
        allCachedData = {};
      }
    }
    
    // Add new cache entry with timestamp
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    };
    
    allCachedData[cacheKey] = cacheEntry;
    
    localStorage.setItem(CROP_INSIGHTS_CACHE_KEY, JSON.stringify(allCachedData));
    console.log(`[CropInsightsCache] Cached data for key: ${cacheKey}`);
  } catch (error) {
    console.error('Error saving crop insights cache:', error);
  }
};

/**
 * Clear the crop insights cache (used when user logs out)
 */
export const clearCropInsightsCache = (): void => {
  try {
    localStorage.removeItem(CROP_INSIGHTS_CACHE_KEY);
    console.log('[CropInsightsCache] Cache cleared');
  } catch (error) {
    console.error('Error clearing crop insights cache:', error);
  }
};

/**
 * Clear cache for a specific crop
 * @param cacheKey The specific cache key to remove
 */
export const clearCropInsightsCacheByKey = (cacheKey: string): void => {
  try {
    const cachedDataString = localStorage.getItem(CROP_INSIGHTS_CACHE_KEY);
    if (cachedDataString) {
      const allCachedData = JSON.parse(cachedDataString);
      if (allCachedData[cacheKey]) {
        delete allCachedData[cacheKey];
        localStorage.setItem(CROP_INSIGHTS_CACHE_KEY, JSON.stringify(allCachedData));
        console.log(`[CropInsightsCache] Cleared cache for key: ${cacheKey}`);
      }
    }
  } catch (error) {
    console.error('Error clearing crop insights cache by key:', error);
  }
};

/**
 * Check if user has logged out by monitoring localStorage changes
 */
export const setupCropInsightsCacheListener = (): void => {
  const handleStorageChange = (e: StorageEvent) => {
    // If userRole or userId is removed, it means user logged out
    if ((e.key === 'userRole' || e.key === 'userId') && !e.newValue) {
      clearCropInsightsCache();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
};

// Set up the logout listener when the service is imported
setupCropInsightsCacheListener();

/**
 * DEBUG: Clear all crop insights cache (can be called from browser console)
 * Usage: import { forceClearAllCropInsightsCache } from '@/services/cropInsightsCache';
 *        forceClearAllCropInsightsCache();
 */
export const forceClearAllCropInsightsCache = (): void => {
  try {
    localStorage.removeItem(CROP_INSIGHTS_CACHE_KEY);
    console.log('[CropInsightsCache] ✅ All cache cleared successfully!');
    console.log('[CropInsightsCache] Please refresh the page to fetch fresh data');
  } catch (error) {
    console.error('[CropInsightsCache] Error clearing cache:', error);
  }
};

// Make it available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).clearCropInsightsCache = forceClearAllCropInsightsCache;
  console.log('[CropInsightsCache] 💡 Tip: Run clearCropInsightsCache() in console to clear all old cache');
}

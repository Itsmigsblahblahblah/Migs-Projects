/**
 * Service for caching market demand data to load only once per session
 * Supports multiple cache entries for different parameters
 */

// Cache key for localStorage
const MARKET_DEMAND_CACHE_KEY = 'marketDemandMultiCache';
// Cache duration - 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Get cached market demand data from localStorage if available and valid
 * @param cacheKey Optional specific cache key to retrieve
 * @returns cached data or null if not available/valid
 */
export const getCachedMarketDemandData = (cacheKey?: string): any => {
  try {
    const cachedDataString = localStorage.getItem(MARKET_DEMAND_CACHE_KEY);
    if (!cachedDataString) return null;
    
    const allCachedData = JSON.parse(cachedDataString);
    const now = Date.now();
    
    // If a specific cache key is requested, return only that data
    if (cacheKey) {
      const cachedEntry = allCachedData[cacheKey];
      if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
        return cachedEntry;
      }
      // Remove expired entry
      if (cachedEntry) {
        delete allCachedData[cacheKey];
        localStorage.setItem(MARKET_DEMAND_CACHE_KEY, JSON.stringify(allCachedData));
      }
      return null;
    }
    
    // Return all valid cached data
    const validCachedData: Record<string, any> = {};
    let hasValidData = false;
    
    Object.keys(allCachedData).forEach(key => {
      const cachedEntry = allCachedData[key];
      if ((now - cachedEntry.timestamp) < CACHE_DURATION) {
        validCachedData[key] = cachedEntry;
        hasValidData = true;
      }
    });
    
    return hasValidData ? validCachedData : null;
  } catch (error) {
    console.error('Error reading market demand cache:', error);
    return null;
  }
};

/**
 * Set market demand data in localStorage cache
 * @param data The market demand data to cache
 * @param cacheKey Specific cache key to use
 */
export const setCachedMarketDemandData = (data: any, cacheKey: string): void => {
  try {
    // Get existing cache data
    let allCachedData: Record<string, any> = {};
    const existingCacheString = localStorage.getItem(MARKET_DEMAND_CACHE_KEY);
    if (existingCacheString) {
      try {
        allCachedData = JSON.parse(existingCacheString);
      } catch (e) {
        // If parsing fails, start with empty object
        allCachedData = {};
      }
    }
    
    // Add new cache entry
    const cacheEntry = {
      ...data,
      timestamp: Date.now()
    };
    
    allCachedData[cacheKey] = cacheEntry;
    
    localStorage.setItem(MARKET_DEMAND_CACHE_KEY, JSON.stringify(allCachedData));
  } catch (error) {
    console.error('Error saving market demand cache:', error);
  }
};

/**
 * Clear the market demand cache (used when user logs out)
 */
export const clearMarketDemandCache = (): void => {
  try {
    localStorage.removeItem(MARKET_DEMAND_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing market demand cache:', error);
  }
};

/**
 * Check if user has logged out by monitoring localStorage changes
 */
export const setupLogoutListener = (): void => {
  const handleStorageChange = (e: StorageEvent) => {
    // If userRole or userId is removed, it means user logged out
    if ((e.key === 'userRole' || e.key === 'userId') && !e.newValue) {
      clearMarketDemandCache();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
};

// Set up the logout listener when the service is imported
setupLogoutListener();
/**
 * Service for caching market demand data to load only once per session
 */

// Cache key for localStorage
const MARKET_DEMAND_CACHE_KEY = 'marketDemandCache';
// Cache duration - 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Get cached market demand data from localStorage if available and valid
 * @returns cached data or null if not available/valid
 */
export const getCachedMarketDemandData = (): any => {
  try {
    const cachedDataString = localStorage.getItem(MARKET_DEMAND_CACHE_KEY);
    if (!cachedDataString) return null;
    
    const cachedData = JSON.parse(cachedDataString);
    const now = Date.now();
    
    // Check if cache is still valid (less than 1 hour old)
    if ((now - cachedData.timestamp) < CACHE_DURATION) {
      return cachedData;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(MARKET_DEMAND_CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading market demand cache:', error);
    return null;
  }
};

/**
 * Set market demand data in localStorage cache
 * @param data The market demand data to cache
 */
export const setCachedMarketDemandData = (data: any): void => {
  try {
    const cacheEntry = {
      ...data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(MARKET_DEMAND_CACHE_KEY, JSON.stringify(cacheEntry));
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
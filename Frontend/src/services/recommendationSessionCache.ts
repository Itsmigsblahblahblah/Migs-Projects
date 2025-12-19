/**
 * Service for caching crop recommendation data to avoid re-fetching during a user session
 */

// Cache key for localStorage (for persistent cache across sessions)
const RECOMMENDATION_CACHE_KEY = 'recommendationSessionCache';
// Cache duration - 15 minutes (in milliseconds) for better performance
const CACHE_DURATION = 15 * 60 * 1000;

/**
 * Get cached recommendation data from localStorage if available and valid
 * @param cacheKey Specific cache key to retrieve
 * @returns cached data or null if not available/valid
 */
export const getCachedRecommendationData = (cacheKey: string): any => {
  try {
    const cachedDataString = localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    if (!cachedDataString) return null;
    
    const allCachedData = JSON.parse(cachedDataString);
    const now = Date.now();
    
    const cachedEntry = allCachedData[cacheKey];
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      return cachedEntry.data;
    }
    
    // Remove expired entry
    if (cachedEntry) {
      delete allCachedData[cacheKey];
      localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(allCachedData));
    }
    return null;
  } catch (error) {
    console.error('Error reading recommendation cache:', error);
    return null;
  }
};

/**
 * Set recommendation data in localStorage cache
 * @param cacheKey The specific cache key
 * @param data The recommendation data to cache
 */
export const setCachedRecommendationData = (cacheKey: string, data: any): void => {
  try {
    let allCachedData: Record<string, any> = {};
    
    // Get existing cached data
    const cachedDataString = localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    if (cachedDataString) {
      try {
        allCachedData = JSON.parse(cachedDataString);
      } catch (e) {
        // If parsing fails, start with empty object
        allCachedData = {};
      }
    }
    
    // Add new cache entry
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    };
    
    allCachedData[cacheKey] = cacheEntry;
    
    localStorage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(allCachedData));
  } catch (error) {
    console.error('Error saving recommendation cache:', error);
  }
};

/**
 * Clear the recommendation cache (used when user logs out)
 */
export const clearRecommendationCache = (): void => {
  try {
    localStorage.removeItem(RECOMMENDATION_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing recommendation cache:', error);
  }
};

/**
 * Check if user has logged out by monitoring localStorage changes
 */
export const setupRecommendationCacheListener = (): void => {
  const handleStorageChange = (e: StorageEvent) => {
    // If userRole or userId is removed, it means user logged out
    if ((e.key === 'userRole' || e.key === 'userId') && !e.newValue) {
      clearRecommendationCache();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
};

// Set up the logout listener when the service is imported
setupRecommendationCacheListener();
// Production Report Cache Service
// Caches production report data to avoid repeated Firestore fetches

interface ProductionCacheData {
    data: any[];
    timestamp: number;
    month: number;
    year: number;
}

const CACHE_KEY = 'productionReportCache';
// Cache expiration: 1 hour (3600000 ms)
const CACHE_EXPIRATION = 3600000;

/**
 * Get cached production report data
 * Returns null if cache doesn't exist or is expired
 */
export const getCachedProductionData = (): ProductionCacheData | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsedCache: ProductionCacheData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is expired
        if (now - parsedCache.timestamp > CACHE_EXPIRATION) {
            console.log('[ProductionCache] Cache expired, clearing...');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        console.log('[ProductionCache] Using cached data, items:', parsedCache.data.length);
        return parsedCache;
    } catch (error) {
        console.error('[ProductionCache] Error reading cache:', error);
        return null;
    }
};

/**
 * Cache production report data
 */
export const setCachedProductionData = (data: any[]): void => {
    try {
        const now = Date.now();
        const currentDate = new Date();
        
        const cacheData: ProductionCacheData = {
            data,
            timestamp: now,
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('[ProductionCache] Cached production data, items:', data.length);
    } catch (error) {
        console.error('[ProductionCache] Error caching data:', error);
    }
};

/**
 * Clear production report cache
 */
export const clearProductionCache = (): void => {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('[ProductionCache] Cache cleared');
    } catch (error) {
        console.error('[ProductionCache] Error clearing cache:', error);
    }
};

/**
 * Check if cache exists and is valid
 */
export const isProductionCacheValid = (): boolean => {
    return getCachedProductionData() !== null;
};

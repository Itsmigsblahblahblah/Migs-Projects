// Soil pH & Crop Prescription Cache Service
// Caches soil pH recommendation data to avoid repeated Firestore fetches

interface SoilPHCacheData {
    data: any[];
    timestamp: number;
}

const CACHE_KEY = 'soilPHRecommendationsCache';
// Cache expiration: 2 hours (7200000 ms) - longer than production since soil data changes less frequently
const CACHE_EXPIRATION = 7200000;

/**
 * Get cached soil pH recommendations data
 * Returns null if cache doesn't exist or is expired
 */
export const getCachedSoilPHData = (): SoilPHCacheData | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsedCache: SoilPHCacheData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is expired
        if (now - parsedCache.timestamp > CACHE_EXPIRATION) {
            console.log('[SoilPHCache] Cache expired, clearing...');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        console.log('[SoilPHCache] Using cached data:', parsedCache.data.length, 'records');
        return parsedCache;
    } catch (error) {
        console.error('[SoilPHCache] Error reading cache:', error);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
};

/**
 * Cache soil pH recommendations data
 */
export const setCachedSoilPHData = (data: any[]): void => {
    try {
        const cacheData: SoilPHCacheData = {
            data,
            timestamp: Date.now()
        };
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('[SoilPHCache] Cached', data.length, 'records successfully');
    } catch (error) {
        console.error('[SoilPHCache] Error caching data:', error);
    }
};

/**
 * Clear cached soil pH data
 */
export const clearCachedSoilPHData = (): void => {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('[SoilPHCache] Cache cleared');
    } catch (error) {
        console.error('[SoilPHCache] Error clearing cache:', error);
    }
};

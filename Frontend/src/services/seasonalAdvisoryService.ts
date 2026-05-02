/**
 * Service for interacting with the seasonal crop advisory API
 */

// API base URL - auto-detect based on environment
const getApiBaseUrl = (): string => {
  // If running on localhost, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Otherwise use environment variable or production backend
  return import.meta.env.VITE_BACKEND_URL || 'https://harvestify-ln4s.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();
// Backend URL is auto-detected based on environment

// Cache for seasonal advisory (monthly refresh)
const SEASONAL_CACHE_KEY = 'seasonal_crop_advisory_cache_v4';
const CACHE_TIMESTAMP_KEY = 'seasonal_crop_advisory_timestamp_v4';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export interface SeasonalCrop {
  name: string;
  explanation: string;
  category_reason: string;
  planting_tip: string;
}

export interface SeasonalCategory {
  name: string;
  crops: SeasonalCrop[];
}

export interface SeasonTimeFrame {
  startMonth: string;
  startYear: number;
  endMonth: string;
  endYear: number;
  display: string;
}

export interface SeasonalAdvisory {
  currentSeason: string;
  seasonTimeFrame: SeasonTimeFrame;
  averageRainfallMM: number;
  lastUpdated: string;
  source: string;
  categories: SeasonalCategory[];
}

/**
 * Get seasonal crop advisory with monthly caching
 * Returns cached data if available and still valid (within same month)
 */
export const getSeasonalAdvisory = async (): Promise<SeasonalAdvisory | null> => {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(SEASONAL_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const timestamp = new Date(cachedTimestamp);
      const now = new Date();
      const daysSinceCache = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

      // Use cache if less than 30 days old
      if (daysSinceCache < 30) {
        return JSON.parse(cachedData);
      }
    }

    // Fetch fresh data from API
    const response = await fetch(`${API_BASE_URL}/advisories/seasonal-crop-advisory`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SeasonalAdvisory] API error response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the data
    localStorage.setItem(SEASONAL_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());

    return data;
  } catch (error) {
    console.error('Error getting seasonal advisory:', error);
    
    // Try to return cached data as fallback
    const cachedData = localStorage.getItem(SEASONAL_CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    return null;
  }
};

/**
 * Clear seasonal advisory cache (force refresh)
 */
export const clearSeasonalAdvisoryCache = (): void => {
  localStorage.removeItem(SEASONAL_CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
};

/**
 * Check if cache is valid
 */
export const isSeasonalCacheValid = (): boolean => {
  const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!cachedTimestamp) return false;

  const timestamp = new Date(cachedTimestamp);
  const now = new Date();
  const daysSinceCache = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceCache < 30;
};

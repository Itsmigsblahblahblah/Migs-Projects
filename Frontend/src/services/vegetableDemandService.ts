/**
 * Service for interacting with the vegetable demand prediction API
 */

// API base URL - use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Cache for vegetable data to prevent repeated API calls
const VEGETABLE_CACHE: Record<string, any> = {};
const PENDING_VEGETABLE_REQUESTS: Record<string, Promise<any>> = {};

/**
 * Get vegetable demand prediction for a specific crop
 * @param vegetableName Name of the vegetable
 * @param historicalPrices Array of historical prices
 * @param historicalAnnualPrices Array of historical annual prices
 * @param historicalMonths Array of historical months (1-12)
 * @param signal Optional AbortController signal for timeout support
 * @returns Promise with demand prediction data
 */
export const getVegetableDemandPrediction = async (
  vegetableName: string,
  historicalPrices: number[],
  historicalAnnualPrices: number[],
  historicalMonths: number[],
  signal?: AbortSignal
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/vegetables/predict-demand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vegetable_name: vegetableName,
        historical_prices: historicalPrices,
        historical_annual_prices: historicalAnnualPrices,
        historical_months: historicalMonths
      }),
      signal // Support for abort/timeout
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting vegetable demand prediction:', error);
    throw error;
  }
};

/**
 * Get recommended crops based on demand predictions
 * @param topN Number of recommendations to return
 * @param month Target month (1-12, optional)
 * @param year Target year (optional)
 * @param demandLevel Filter by demand level (High, Moderate, Stable, Low, optional)
 * @returns Promise with recommended crops
 */
export const getRecommendedCrops = async (
  topN: number = 10,
  month?: number,
  year?: number,
  demandLevel?: string
) => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('top_n', topN.toString());

    if (month !== undefined) {
      params.append('month', month.toString());
    }

    if (year !== undefined) {
      params.append('year', year.toString());
    }

    if (demandLevel !== undefined) {
      params.append('demand_level', demandLevel);
    }

    const response = await fetch(`${API_BASE_URL}/vegetables/recommend-crops?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.recommended_crops;
  } catch (error) {
    console.error('Error getting recommended crops:', error);
    throw error;
  }
};

/**
 * Get historical data for a specific vegetable
 * @param vegetableName Name of the vegetable
 * @returns Promise with historical data
 */
export const getVegetableHistoricalData = async (vegetableName: string) => {
  const cacheKey = `historical-${vegetableName.toLowerCase()}`;
  
  // Return from cache if available (instant)
  if (VEGETABLE_CACHE[cacheKey]) {
    return VEGETABLE_CACHE[cacheKey];
  }
  
  // If request is already in-flight, return the same promise (deduplication)
  if (PENDING_VEGETABLE_REQUESTS[cacheKey]) {
    return PENDING_VEGETABLE_REQUESTS[cacheKey];
  }
  
  const requestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vegetables/vegetable-data/${encodeURIComponent(vegetableName)}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.vegetable_data;
      
      // Cache the result
      VEGETABLE_CACHE[cacheKey] = result;
      return result;
    } catch (error) {
      console.error('Error getting vegetable historical data for:', vegetableName, error);
      
      // Return empty array instead of trying fallback to prevent CORS errors
      console.log(`[VegetableService] Returning empty data for ${vegetableName} due to API failure`);
      const emptyData: any[] = [];
      VEGETABLE_CACHE[cacheKey] = emptyData;
      return emptyData;
    } finally {
      // Remove from pending once complete
      delete PENDING_VEGETABLE_REQUESTS[cacheKey];
    }
  })();
  
  PENDING_VEGETABLE_REQUESTS[cacheKey] = requestPromise;
  return requestPromise;
};
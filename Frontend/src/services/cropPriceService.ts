/**
 * Service for fetching individual crop prices from the vegetable_prices.csv dataset
 */
import { parseCSV } from '@/utils/csvParser';
import { getCropPriceEstimate } from '@/services/geminiService'; // Import Gemini service

// API endpoint for vegetable prices
const VEGETABLE_PRICES_ENDPOINT = '/data/vegetable_prices.csv';

/**
 * Get the most recent price for a specific crop
 * @param cropName Name of the crop
 * @returns The most recent price for the crop or null if not found
 */
export const getLatestCropPrice = async (cropName: string) => {
  try {
    // Fetch the vegetable prices data
    const priceData = await parseCSV(VEGETABLE_PRICES_ENDPOINT);
    
    // Find records matching the crop name (case insensitive partial match)
    const matchingRecords = priceData.filter(record => 
      record['Vegetable'] && record['Vegetable'].toLowerCase().includes(cropName.toLowerCase())
    );
    
    if (matchingRecords.length === 0) {
      return null;
    }
    
    // Sort by date to get the most recent record
    const sortedRecords = matchingRecords.sort((a, b) => {
      // Convert date strings to Date objects for comparison
      const dateA = new Date(a['Date']);
      const dateB = new Date(b['Date']);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
    
    // Return the most recent price
    const latestRecord = sortedRecords[0];
    return {
      price: parseFloat(latestRecord['Price']),
      date: latestRecord['Date'],
      month: latestRecord['Month'],
      year: parseInt(latestRecord['Year']),
      annualPrice: parseFloat(latestRecord['Annual_Price'])
    };
  } catch (error) {
    console.error('Error getting latest crop price:', error);
    return null;
  }
};

/**
 * Get the most recent prices for all crops
 * @returns A map of crop names to their most recent prices
 */
export const getAllLatestCropPrices = async () => {
  try {
    // Fetch the vegetable prices data
    const priceData = await parseCSV(VEGETABLE_PRICES_ENDPOINT);
    
    // Group records by crop name
    const cropRecords: { [key: string]: any[] } = {};
    
    priceData.forEach(record => {
      if (record['Vegetable']) {
        const cropName = record['Vegetable'];
        if (!cropRecords[cropName]) {
          cropRecords[cropName] = [];
        }
        cropRecords[cropName].push(record);
      }
    });
    
    // For each crop, find the most recent record
    const latestPrices: { [key: string]: any } = {};
    
    for (const [cropName, records] of Object.entries(cropRecords)) {
      // Sort by date to get the most recent record
      const sortedRecords = records.sort((a, b) => {
        const dateA = new Date(a['Date']);
        const dateB = new Date(b['Date']);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      });
      
      // Get the most recent record
      const latestRecord = sortedRecords[0];
      latestPrices[cropName] = {
        price: parseFloat(latestRecord['Price']),
        date: latestRecord['Date'],
        month: latestRecord['Month'],
        year: parseInt(latestRecord['Year']),
        annualPrice: parseFloat(latestRecord['Annual_Price'])
      };
    }
    
    return latestPrices;
  } catch (error) {
    console.error('Error getting all latest crop prices:', error);
    return {};
  }
};

/**
 * Get crop prices for a specific month and year
 * @param month The month (1-12)
 * @param year The year
 * @returns A map of crop names to their prices for the specified month and year
 */
export const getCropPricesForMonth = async (month: number, year: number) => {
  try {
    // Fetch the vegetable prices data
    const priceData = await parseCSV(VEGETABLE_PRICES_ENDPOINT);
    
    // Filter records for the specified month and year
    const matchingRecords = priceData.filter(record => 
      record['MonthNum'] && 
      parseInt(record['MonthNum']) === month && 
      record['Year'] && 
      parseInt(record['Year']) === year
    );
    
    // Create a map of crop names to prices
    const prices: { [key: string]: any } = {};
    
    matchingRecords.forEach(record => {
      if (record['Vegetable']) {
        prices[record['Vegetable']] = {
          price: parseFloat(record['Price']),
          annualPrice: parseFloat(record['Annual_Price']),
          date: record['Date']
        };
      }
    });
    
    return prices;
  } catch (error) {
    console.error(`Error getting crop prices for ${month}/${year}:`, error);
    return {};
  }
};

/**
 * Get real-time price estimation for a specific crop using Gemini API
 * @param cropName Name of the crop
 * @param currentPrice Current market price of the crop
 * @param location Farm location (optional)
 * @returns Estimated price trend and insights
 */
export const getRealTimePriceEstimate = async (
  cropName: string,
  currentPrice: number,
  location?: string
) => {
  try {
    // Use the Gemini API to get price estimation
    const priceEstimate = await getCropPriceEstimate(cropName, currentPrice, location);
    return priceEstimate;
  } catch (error) {
    console.error(`Error getting real-time price estimate for ${cropName}:`, error);
    return null;
  }
};
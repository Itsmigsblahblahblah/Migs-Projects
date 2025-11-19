/**
 * Service for enhancing crop data with information from datasets
 */
import { parseCSV, findMatchingRecords, loadCSV } from '@/utils/csvParser';

// API endpoints
const SOIL_DATA_ENDPOINT = '/data/brgy_soil_dataset.csv';
const VEGETABLE_PRICES_ENDPOINT = '/data/vegetable_prices.csv';
const SEED_PRICES_ENDPOINT = '/data/seed.csv';
const CROP_DATA_ENDPOINT = '/data/crop-data';

/**
 * Get fertilizer recommendations based on soil data
 * @param cropName Name of the crop
 * @param soilType Type of soil
 * @returns Fertilizer recommendations
 */
export const getFertilizerRecommendations = async (cropName: string, soilType: string) => {
  try {
    // Fetch from the backend API
    const soilData = await loadCSV(SOIL_DATA_ENDPOINT);
    
    // Find matching records for the crop
    const matchingRecords = findMatchingRecords(soilData, 'Crop', cropName);
    
    if (matchingRecords.length > 0) {
      // Get the first matching record for simplicity
      const record = matchingRecords[0];
      
      // Generate fertilizer recommendation based on NPK levels
      const recommendations = [];
      
      if (record['Nitrogen(N)'] === 'L') {
        recommendations.push('Add nitrogen-rich fertilizer (e.g., ammonium nitrate)');
      } else if (record['Nitrogen(N)'] === 'H') {
        recommendations.push('Reduce nitrogen application to prevent excessive foliage growth');
      }
      
      if (record['Phosphorus(P)'] === 'L') {
        recommendations.push('Add phosphorus-rich fertilizer (e.g., superphosphate)');
      } else if (record['Phosphorus(P)'] === 'H') {
        recommendations.push('Reduce phosphorus application');
      }
      
      if (record['Potassium(K)'] === 'L') {
        recommendations.push('Add potassium-rich fertilizer (e.g., potassium chloride)');
      } else if (record['Potassium(K)'] === 'H') {
        recommendations.push('Reduce potassium application');
      }
      
      return {
        pH: record.pH,
        nitrogen: record['Nitrogen(N)'],
        phosphorus: record['Phosphorus(P)'],
        potassium: record['Potassium(K)'],
        recommendations
      };
    }
    
    // Default recommendations if no data found
    return {
      pH: 6.5,
      nitrogen: 'M',
      phosphorus: 'M',
      potassium: 'M',
      recommendations: [
        'Apply balanced NPK fertilizer',
        'Test soil pH and adjust if necessary',
        'Add organic compost to improve soil structure'
      ]
    };
  } catch (error) {
    console.error('Error getting fertilizer recommendations:', error);
    return {
      pH: 6.5,
      nitrogen: 'M',
      phosphorus: 'M',
      potassium: 'M',
      recommendations: [
        'Apply balanced NPK fertilizer',
        'Test soil pH and adjust if necessary',
        'Add organic compost to improve soil structure'
      ]
    };
  }
};

/**
 * Get market price information for a crop
 * @param cropName Name of the crop
 * @returns Market price information
 */
export const getMarketPriceInfo = async (cropName: string) => {
  try {
    // Fetch from the backend API
    const priceData = await loadCSV(VEGETABLE_PRICES_ENDPOINT);
    
    // Find matching records for the crop
    const matchingRecords = findMatchingRecords(priceData, 'Vegetable', cropName);
    
    if (matchingRecords.length > 0) {
      // Calculate average price and trend
      const prices = matchingRecords.map(record => record.Price);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      // Simple trend calculation (in a real implementation, this would be more sophisticated)
      const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
      const secondHalf = prices.slice(Math.floor(prices.length / 2));
      const firstAvg = firstHalf.reduce((sum, price) => sum + price, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, price) => sum + price, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';
      
      return {
        averagePrice,
        trend,
        priceHistory: matchingRecords.map(record => ({
          date: record.Date,
          price: record.Price,
          month: record.Month,
          year: record.Year
        }))
      };
    }
    
    // Default values if no data found
    return {
      averagePrice: 50,
      trend: 'stable',
      priceHistory: []
    };
  } catch (error) {
    console.error('Error getting market price info:', error);
    return {
      averagePrice: 50,
      trend: 'stable',
      priceHistory: []
    };
  }
};

/**
 * Get seed price information for a crop
 * @param cropName Name of the crop
 * @returns Seed price information
 */
export const getSeedPriceInfo = async (cropName: string) => {
  try {
    // Fetch from the backend API
    const seedData = await loadCSV(SEED_PRICES_ENDPOINT);
    
    // Find matching records for the crop
    const matchingRecords = findMatchingRecords(seedData, 'Gulay (Vegetable)', cropName);
    
    if (matchingRecords.length > 0) {
      // Clean the price string (remove commas and convert to number)
      const priceString = matchingRecords[0]['Presyo ng Pagbebenta (PHP/Kilo)'];
      const cleanPrice = parseFloat(priceString.replace(/,/g, ''));
      
      return {
        seedPricePerKilo: cleanPrice,
        currency: 'PHP'
      };
    }
    
    // Default values if no data found
    return {
      seedPricePerKilo: 1000,
      currency: 'PHP'
    };
  } catch (error) {
    console.error('Error getting seed price info:', error);
    return {
      seedPricePerKilo: 1000,
      currency: 'PHP'
    };
  }
};

/**
 * Calculate profit projection for a crop
 * @param cropName Name of the crop
 * @param landArea Area of land in hectares
 * @param puhunan Capital investment
 * @returns Profit projection information
 */
export const calculateProfitProjection = async (
  cropName: string, 
  landArea: number, 
  puhunan: number
) => {
  try {
    // Get market price information
    const marketInfo = await getMarketPriceInfo(cropName);
    const seedInfo = await getSeedPriceInfo(cropName);
    
    // Estimate yield (this would be more sophisticated in a real implementation)
    // Assuming 10 tons per hectare average yield
    const estimatedYieldPerHectare = 10000; // kg per hectare
    const totalEstimatedYield = landArea * estimatedYieldPerHectare;
    
    // Calculate potential revenue
    const potentialRevenue = totalEstimatedYield * (marketInfo.averagePrice / 1000); // Price is per kg
    
    // Calculate seed cost (assuming 5kg of seeds needed per hectare)
    const seedCostPerHectare = seedInfo.seedPricePerKilo * 5;
    const totalSeedCost = landArea * seedCostPerHectare;
    
    // Estimate other costs (fertilizer, labor, etc.) as 30% of capital
    const otherCosts = puhunan * 0.3;
    
    // Calculate total costs
    const totalCosts = totalSeedCost + otherCosts;
    
    // Calculate profit
    const netProfit = potentialRevenue - totalCosts;
    const profitMargin = (netProfit / potentialRevenue) * 100;
    
    return {
      estimatedYield: totalEstimatedYield,
      potentialRevenue,
      totalCosts,
      netProfit,
      profitMargin,
      marketTrend: marketInfo.trend,
      averageMarketPrice: marketInfo.averagePrice
    };
  } catch (error) {
    console.error('Error calculating profit projection:', error);
    return {
      estimatedYield: 0,
      potentialRevenue: 0,
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      marketTrend: 'unknown',
      averageMarketPrice: 0
    };
  }
};

/**
 * Get comprehensive crop insights
 * @param cropName Name of the crop
 * @param soilType Type of soil
 * @param landArea Area of land in hectares
 * @param puhunan Capital investment
 * @returns Comprehensive crop insights
 */
export const getCropInsights = async (
  cropName: string,
  soilType: string,
  landArea: number,
  puhunan: number
) => {
  // Get all insights in parallel
  const [fertilizerInfo, marketInfo, profitProjection] = await Promise.all([
    getFertilizerRecommendations(cropName, soilType),
    getMarketPriceInfo(cropName),
    calculateProfitProjection(cropName, landArea, puhunan)
  ]);
  
  return {
    fertilizer: fertilizerInfo,
    market: marketInfo,
    profit: profitProjection
  };
};
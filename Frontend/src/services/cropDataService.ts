/**
 * Service for enhancing crop data with information from datasets
 */
import { parseCSV, findMatchingRecords, loadCSV } from '@/utils/csvParser';
import { getVegetableDemandPrediction, getVegetableHistoricalData } from '@/services/vegetableDemandService';

// API endpoints
const SOIL_DATA_ENDPOINT = '/data/brgy_soil_dataset.csv';
const VEGETABLE_PRICES_ENDPOINT = '/data/vegetable_prices.csv';
const SEED_PRICES_ENDPOINT = '/data/seed.csv';
const CROP_DATA_ENDPOINT = '/data/crop-data';

// Define interfaces for type safety
interface SoilDataRecord {
  pH: number;
  Nitrogen: string;
  Phosphorus: string;
  Potassium: string;
}

interface FertilizerRecommendation {
  level: string;
  recommendations: string[];
  detailedInfo: string;
}

interface DetailedFertilizerRecommendations {
  nitrogen: FertilizerRecommendation;
  phosphorus: FertilizerRecommendation;
  potassium: FertilizerRecommendation;
}

interface FertilizerInfo {
  pH: number;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  recommendations: string[];
  detailedRecommendations: DetailedFertilizerRecommendations;
}

interface MarketPriceInfo {
  averagePrice: number;
  trend: string;
  priceHistory: Array<{
    date: string;
    price: number;
    month: string;
    year: string;
  }>;
}

interface SeedPriceInfo {
  seedPricePerKilo: number;
  currency: string;
}

interface ProfitProjection {
  estimatedYield: number;
  potentialRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  marketTrend: string;
  averageMarketPrice: number;
  suggestedCapital: number;
}

interface CropInsights {
  fertilizer: FertilizerInfo;
  market: MarketPriceInfo;
  profit: ProfitProjection;
}

/**
 * Get fertilizer recommendations based on soil data
 * @param cropName Name of the crop
 * @param soilType Type of soil
 * @returns Fertilizer recommendations
 */
export const getFertilizerRecommendations = async (cropName: string, soilType: string): Promise<FertilizerInfo> => {
  try {
    // Fetch from the backend API
    const soilData = await loadCSV(SOIL_DATA_ENDPOINT);
    
    // Find matching records for the crop
    const matchingRecords = findMatchingRecords(soilData, 'Crop', cropName);
    
    if (matchingRecords.length > 0) {
      // Get the first matching record for simplicity
      const record = matchingRecords[0];
      
      // Generate detailed fertilizer recommendation based on NPK levels
      const recommendations: string[] = [];
      const detailedRecommendations: DetailedFertilizerRecommendations = {
        nitrogen: {
          level: record['Nitrogen(N)'],
          recommendations: [],
          detailedInfo: ""
        },
        phosphorus: {
          level: record['Phosphorus(P)'],
          recommendations: [],
          detailedInfo: ""
        },
        potassium: {
          level: record['Potassium(K)'],
          recommendations: [],
          detailedInfo: ""
        }
      };
      
      // Nitrogen recommendations
      if (record['Nitrogen(N)'] === 'L') {
        detailedRecommendations.nitrogen.recommendations.push('Add nitrogen-rich fertilizer (e.g., ammonium nitrate)');
        detailedRecommendations.nitrogen.detailedInfo = "Nitrogen deficiency can cause stunted growth and yellowing of leaves. Apply nitrogen fertilizer in split doses to avoid leaching.";
      } else if (record['Nitrogen(N)'] === 'H') {
        detailedRecommendations.nitrogen.recommendations.push('Reduce nitrogen application to prevent excessive foliage growth');
        detailedRecommendations.nitrogen.detailedInfo = "Excessive nitrogen can lead to lush foliage at the expense of fruit/flower development. Reduce nitrogen application and increase phosphorus and potassium.";
      } else {
        detailedRecommendations.nitrogen.recommendations.push('Maintain current nitrogen levels');
        detailedRecommendations.nitrogen.detailedInfo = "Nitrogen levels are optimal. Continue with balanced fertilization program.";
      }
      
      // Phosphorus recommendations
      if (record['Phosphorus(P)'] === 'L') {
        detailedRecommendations.phosphorus.recommendations.push('Add phosphorus-rich fertilizer (e.g., superphosphate)');
        detailedRecommendations.phosphorus.detailedInfo = "Phosphorus deficiency can delay maturity and reduce flowering/fruiting. Apply phosphorus fertilizer near the root zone for better uptake.";
      } else if (record['Phosphorus(P)'] === 'H') {
        detailedRecommendations.phosphorus.recommendations.push('Reduce phosphorus application');
        detailedRecommendations.phosphorus.detailedInfo = "Excessive phosphorus can interfere with micronutrient uptake, particularly zinc and iron. Reduce phosphorus application and consider soil testing.";
      } else {
        detailedRecommendations.phosphorus.recommendations.push('Maintain current phosphorus levels');
        detailedRecommendations.phosphorus.detailedInfo = "Phosphorus levels are optimal. Continue with balanced fertilization program.";
      }
      
      // Potassium recommendations
      if (record['Potassium(K)'] === 'L') {
        detailedRecommendations.potassium.recommendations.push('Add potassium-rich fertilizer (e.g., potassium chloride)');
        detailedRecommendations.potassium.detailedInfo = "Potassium deficiency can weaken plant resistance to diseases and reduce fruit quality. Apply potassium fertilizer in multiple applications.";
      } else if (record['Potassium(K)'] === 'H') {
        detailedRecommendations.potassium.recommendations.push('Reduce potassium application');
        detailedRecommendations.potassium.detailedInfo = "Excessive potassium can interfere with magnesium and calcium uptake. Reduce potassium application and monitor other nutrients.";
      } else {
        detailedRecommendations.potassium.recommendations.push('Maintain current potassium levels');
        detailedRecommendations.potassium.detailedInfo = "Potassium levels are optimal. Continue with balanced fertilization program.";
      }
      
      // Combine all recommendations for backward compatibility
      recommendations.push(...detailedRecommendations.nitrogen.recommendations);
      recommendations.push(...detailedRecommendations.phosphorus.recommendations);
      recommendations.push(...detailedRecommendations.potassium.recommendations);
      
      // Add general recommendations
      if (record.pH < 6.0) {
        recommendations.push('Consider adding lime to raise soil pH');
      } else if (record.pH > 7.5) {
        recommendations.push('Consider adding sulfur to lower soil pH');
      }
      
      return {
        pH: record.pH,
        nitrogen: record['Nitrogen(N)'],
        phosphorus: record['Phosphorus(P)'],
        potassium: record['Potassium(K)'],
        recommendations,
        detailedRecommendations
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
      ],
      detailedRecommendations: {
        nitrogen: {
          level: 'M',
          recommendations: ['Apply balanced nitrogen fertilizer'],
          detailedInfo: "General recommendation for nitrogen management. Consider soil testing for precise requirements."
        },
        phosphorus: {
          level: 'M',
          recommendations: ['Apply balanced phosphorus fertilizer'],
          detailedInfo: "General recommendation for phosphorus management. Consider soil testing for precise requirements."
        },
        potassium: {
          level: 'M',
          recommendations: ['Apply balanced potassium fertilizer'],
          detailedInfo: "General recommendation for potassium management. Consider soil testing for precise requirements."
        }
      }
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
      ],
      detailedRecommendations: {
        nitrogen: {
          level: 'M',
          recommendations: ['Apply balanced nitrogen fertilizer'],
          detailedInfo: "General recommendation for nitrogen management. Consider soil testing for precise requirements."
        },
        phosphorus: {
          level: 'M',
          recommendations: ['Apply balanced phosphorus fertilizer'],
          detailedInfo: "General recommendation for phosphorus management. Consider soil testing for precise requirements."
        },
        potassium: {
          level: 'M',
          recommendations: ['Apply balanced potassium fertilizer'],
          detailedInfo: "General recommendation for potassium management. Consider soil testing for precise requirements."
        }
      }
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
    // Get historical data from the backend API
    const historicalData = await getVegetableHistoricalData(cropName);
    
    if (historicalData && historicalData.length > 0) {
      // Extract price information
      const prices = historicalData.map((record: any) => parseFloat(record.Price));
      const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
      
      // Simple trend calculation (in a real implementation, this would be more sophisticated)
      const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
      const secondHalf = prices.slice(Math.floor(prices.length / 2));
      const firstAvg = firstHalf.reduce((sum: number, price: number) => sum + price, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum: number, price: number) => sum + price, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';
      
      return {
        averagePrice,
        trend,
        priceHistory: historicalData.map((record: any) => ({
          date: record.Date,
          price: parseFloat(record.Price),
          month: record.Month,
          year: record.Year
        }))
      };
    }
    
    // If no data found, try with a more flexible crop name matching
    // Remove common suffixes and try again
    const simplifiedCropName = cropName.replace(/\s*\(.*?\)/g, '').trim();
    const historicalData2 = await getVegetableHistoricalData(simplifiedCropName);
    
    if (historicalData2 && historicalData2.length > 0) {
      // Extract price information
      const prices = historicalData2.map((record: any) => parseFloat(record.Price));
      const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
      
      // Simple trend calculation
      const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
      const secondHalf = prices.slice(Math.floor(prices.length / 2));
      const firstAvg = firstHalf.reduce((sum: number, price: number) => sum + price, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum: number, price: number) => sum + price, 0) / secondHalf.length;
      
      const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';
      
      return {
        averagePrice,
        trend,
        priceHistory: historicalData2.map((record: any) => ({
          date: record.Date,
          price: parseFloat(record.Price),
          month: record.Month,
          year: record.Year
        }))
      };
    }
    
    // Default values if no data found
    console.warn(`No market data found for crop: ${cropName}. Using default values.`);
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
    console.log('calculateProfitProjection called with:', { cropName, landArea, puhunan });
    
    // Validate inputs
    if (!landArea || landArea <= 0) {
      console.warn('Invalid landArea provided:', landArea);
      return {
        estimatedYield: 0,
        potentialRevenue: 0,
        totalCosts: 0,
        netProfit: 0,
        profitMargin: 0,
        marketTrend: 'unknown',
        averageMarketPrice: 0,
        suggestedCapital: 0
      };
    }
    
    // Get market price information from the backend API
    const marketInfo = await getMarketPriceInfo(cropName);
    console.log('Market info:', marketInfo);
    
    // Get demand prediction for more accurate pricing
    const historicalData = await getVegetableHistoricalData(cropName);
    console.log('Historical data length:', historicalData?.length);
    
    let predictedPrice = marketInfo.averagePrice;
    if (historicalData && historicalData.length > 0) {
      // Prepare data for demand prediction
      const prices = historicalData.map((record: any) => parseFloat(record.Price));
      const annualPrices = historicalData.map((record: any) => parseFloat(record.Annual_Price));
      const months = historicalData.map((record: any) => parseInt(record.MonthNum));
      
      try {
        // Get demand prediction from the backend API
        const demandPrediction = await getVegetableDemandPrediction(
          cropName,
          prices,
          annualPrices,
          months
        );
        console.log('Demand prediction:', demandPrediction);
        
        // Use predicted price if available
        if (demandPrediction && demandPrediction.predicted_price) {
          predictedPrice = demandPrediction.predicted_price;
        }
      } catch (predictionError) {
        console.warn('Could not get demand prediction, using average price:', predictionError);
        // Fall back to average price if prediction fails
      }
    }
    
    const seedInfo = await getSeedPriceInfo(cropName);
    console.log('Seed info:', seedInfo);
    
    // Estimate yield (this would be more sophisticated in a real implementation)
    // Assuming 10 tons per hectare average yield
    const estimatedYieldPerHectare = 10000; // kg per hectare
    const totalEstimatedYield = landArea * estimatedYieldPerHectare;
    console.log('Total estimated yield:', totalEstimatedYield);
    
    // Calculate suggested capital to avoid shortage
    // This ensures at least 20% buffer over the minimum required capital
    console.log('Calculating capital - landArea:', landArea, 'seedInfo.seedPricePerKilo:', seedInfo.seedPricePerKilo);
    const seedCostPerHectare = seedInfo.seedPricePerKilo * 5;
    const totalSeedCost = landArea * seedCostPerHectare;
    const minimumRequiredCapital = totalSeedCost / 0.3; // If 30% goes to seed costs, then 70% is other costs
    const suggestedCapital = minimumRequiredCapital * 1.2; // Add 20% buffer
    console.log('Calculated capital - seedCostPerHectare:', seedCostPerHectare, 'totalSeedCost:', totalSeedCost, 'minimumRequiredCapital:', minimumRequiredCapital, 'suggestedCapital:', suggestedCapital);
    
    // Calculate values based on user's investment
    // If investment is 0, yield and profit should also be 0
    const userInvestment = Number(puhunan) || 0;
    const estimatedYield = userInvestment === 0 ? 0 : 
        totalEstimatedYield * 
        (userInvestment >= suggestedCapital ? 1 : (userInvestment / suggestedCapital));
    
    // Calculate potential revenue using predicted price
    const potentialRevenue = estimatedYield * predictedPrice; // Revenue = yield (kg) * price (PHP/kg)
    console.log('Potential revenue:', potentialRevenue);
    
    // Calculate net profit based on user's investment
    // If investment is 0, profit should also be 0
    const netProfit = userInvestment === 0 ? 0 : potentialRevenue - userInvestment;
    console.log('Net profit:', netProfit);
    
    const profitMargin = potentialRevenue > 0 ? (netProfit / potentialRevenue) * 100 : 0;
    console.log('Profit margin:', profitMargin);
    
    const result = {
      estimatedYield: estimatedYield,
      potentialRevenue,
      totalCosts: userInvestment, // Total costs equal user's investment
      netProfit,
      profitMargin,
      marketTrend: marketInfo.trend,
      averageMarketPrice: predictedPrice, // Use predicted price instead of average
      suggestedCapital: suggestedCapital
    };
    
    console.log('Returning profit projection result:', result);
    return result;
  } catch (error) {
    console.error('Error calculating profit projection:', error);
    return {
      estimatedYield: 0,
      potentialRevenue: 0,
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      marketTrend: 'unknown',
      averageMarketPrice: 0,
      suggestedCapital: 0
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
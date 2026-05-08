/**
 * Service for enhancing crop data with information from datasets
 */
import { parseCSV, findMatchingRecords, loadCSV } from '@/utils/csvParser';
import { getVegetableDemandPrediction, getVegetableHistoricalData } from '@/services/vegetableDemandService';
import { calculateEstimatedYield, getCropYieldRanges } from '@/services/cropYieldService';
import { getCachedCropInsights, setCachedCropInsights } from '@/services/cropInsightsCache';

// API endpoints
const SOIL_DATA_ENDPOINT = '/data/brgy_soil_dataset.csv';
const VEGETABLE_PRICES_ENDPOINT = '/data/vegetable_prices.csv';
const SEED_PRICES_ENDPOINT = '/data/seed.csv';
const CROP_DATA_ENDPOINT = '/data/crop-data';

// Global cache for crop insights to speed up repeated requests
const CROP_INSIGHTS_CACHE: Record<string, any> = {};
const PENDING_INSIGHTS_REQUESTS: Record<string, Promise<any>> = {};

// OPTIMIZATION: Global CSV data cache to prevent repeated fetches
const CSV_DATA_CACHE: Record<string, any[]> = {};
const PENDING_CSV_REQUESTS: Record<string, Promise<any[]>> = {};

/**
 * OPTIMIZED: Load CSV with caching to prevent repeated network requests
 * This is the #1 performance bottleneck - CSVs are fetched on EVERY crop calculation
 */
const loadCachedCSV = async (endpoint: string): Promise<any[]> => {
  // Return from cache if available (INSTANT!)
  if (CSV_DATA_CACHE[endpoint]) {
    return CSV_DATA_CACHE[endpoint];
  }
  
  // If request is already in-flight, return the same promise (deduplication)
  if (PENDING_CSV_REQUESTS[endpoint]) {
    return PENDING_CSV_REQUESTS[endpoint];
  }
  
  // Fetch once and cache forever (CSV data is static)
  const requestPromise = (async () => {
    try {
      const data = await loadCSV(endpoint);
      CSV_DATA_CACHE[endpoint] = data;
      return data;
    } finally {
      delete PENDING_CSV_REQUESTS[endpoint];
    }
  })();
  
  PENDING_CSV_REQUESTS[endpoint] = requestPromise;
  return requestPromise;
};

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
  amount: string; // Amount of fertilizer to apply
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
    // OPTIMIZED: Use cached CSV loading
    const soilData = await loadCachedCSV(SOIL_DATA_ENDPOINT);
    
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
          detailedInfo: "",
          amount: ""
        },
        phosphorus: {
          level: record['Phosphorus(P)'],
          recommendations: [],
          detailedInfo: "",
          amount: ""
        },
        potassium: {
          level: record['Potassium(K)'],
          recommendations: [],
          detailedInfo: "",
          amount: ""
        }
      };
      
      // Nitrogen recommendations
      if (record['Nitrogen(N)'] === 'L') {
        detailedRecommendations.nitrogen.recommendations.push('Add nitrogen-rich fertilizer (e.g., ammonium nitrate, urea)');
        detailedRecommendations.nitrogen.detailedInfo = "Nitrogen deficiency can cause stunted growth and yellowing of leaves. Apply nitrogen fertilizer in split doses to avoid leaching.";
        detailedRecommendations.nitrogen.amount = "Apply 40-60 kg/ha of Urea (46-0-0) or 50-70 kg/ha of Ammonium Nitrate (34-0-0). Split into 2-3 applications: 50% at planting, 30% at 30 days, 20% at 60 days.";
      } else if (record['Nitrogen(N)'] === 'H') {
        detailedRecommendations.nitrogen.recommendations.push('Reduce nitrogen application to prevent excessive foliage growth');
        detailedRecommendations.nitrogen.detailedInfo = "Excessive nitrogen can lead to lush foliage at the expense of fruit/flower development. Reduce nitrogen application and increase phosphorus and potassium.";
        detailedRecommendations.nitrogen.amount = "Reduce to 10-20 kg/ha of Urea (46-0-0). Focus on phosphorus and potassium instead. Avoid additional nitrogen until levels normalize.";
      } else {
        detailedRecommendations.nitrogen.recommendations.push('Maintain current nitrogen levels');
        detailedRecommendations.nitrogen.detailedInfo = "Nitrogen levels are optimal. Continue with balanced fertilization program.";
        detailedRecommendations.nitrogen.amount = "Maintain with 20-30 kg/ha of Urea (46-0-0) as topdressing during vegetative stage only.";
      }
      
      // Phosphorus recommendations
      if (record['Phosphorus(P)'] === 'L') {
        detailedRecommendations.phosphorus.recommendations.push('Add phosphorus-rich fertilizer (e.g., superphosphate, diammonium phosphate)');
        detailedRecommendations.phosphorus.detailedInfo = "Phosphorus deficiency can delay maturity and reduce flowering/fruiting. Apply phosphorus fertilizer near the root zone for better uptake.";
        detailedRecommendations.phosphorus.amount = "Apply 30-50 kg/ha of Single Superphosphate (0-20-0) or 25-40 kg/ha of Diammonium Phosphate (18-46-0). Apply at planting time, placed 5-10 cm below seeds.";
      } else if (record['Phosphorus(P)'] === 'H') {
        detailedRecommendations.phosphorus.recommendations.push('Reduce phosphorus application');
        detailedRecommendations.phosphorus.detailedInfo = "Excessive phosphorus can interfere with micronutrient uptake, particularly zinc and iron. Reduce phosphorus application and consider soil testing.";
        detailedRecommendations.phosphorus.amount = "Avoid additional phosphorus fertilizers for this season. Monitor plant growth and retest soil after harvest.";
      } else {
        detailedRecommendations.phosphorus.recommendations.push('Maintain current phosphorus levels');
        detailedRecommendations.phosphorus.detailedInfo = "Phosphorus levels are optimal. Continue with balanced fertilization program.";
        detailedRecommendations.phosphorus.amount = "Maintain with 15-25 kg/ha of Single Superphosphate (0-20-0) applied at planting time.";
      }
      
      // Potassium recommendations
      if (record['Potassium(K)'] === 'L') {
        detailedRecommendations.potassium.recommendations.push('Add potassium-rich fertilizer (e.g., potassium chloride, potassium sulfate)');
        detailedRecommendations.potassium.detailedInfo = "Potassium deficiency can weaken plant resistance to diseases and reduce fruit quality. Apply potassium fertilizer in multiple applications.";
        detailedRecommendations.potassium.amount = "Apply 40-60 kg/ha of Muriate of Potash (0-0-60) or 50-70 kg/ha of Potassium Sulfate (0-0-50). Split into 2 applications: 60% at planting, 40% at flowering stage.";
      } else if (record['Potassium(K)'] === 'H') {
        detailedRecommendations.potassium.recommendations.push('Reduce potassium application');
        detailedRecommendations.potassium.detailedInfo = "Excessive potassium can interfere with magnesium and calcium uptake. Reduce potassium application and monitor other nutrients.";
        detailedRecommendations.potassium.amount = "Reduce to 10-15 kg/ha of Muriate of Potash (0-0-60). Monitor for magnesium and calcium deficiency symptoms.";
      } else {
        detailedRecommendations.potassium.recommendations.push('Maintain current potassium levels');
        detailedRecommendations.potassium.detailedInfo = "Potassium levels are optimal. Continue with balanced fertilization program.";
        detailedRecommendations.potassium.amount = "Maintain with 20-30 kg/ha of Muriate of Potash (0-0-60) applied during flowering and fruit development.";
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
          detailedInfo: "General recommendation for nitrogen management. Consider soil testing for precise requirements.",
          amount: "Apply 20-30 kg/ha of Urea (46-0-0) during vegetative stage. Adjust based on crop response and soil test results."
        },
        phosphorus: {
          level: 'M',
          recommendations: ['Apply balanced phosphorus fertilizer'],
          detailedInfo: "General recommendation for phosphorus management. Consider soil testing for precise requirements.",
          amount: "Apply 15-25 kg/ha of Single Superphosphate (0-20-0) at planting time. Place fertilizer 5-10 cm below seed level."
        },
        potassium: {
          level: 'M',
          recommendations: ['Apply balanced potassium fertilizer'],
          detailedInfo: "General recommendation for potassium management. Consider soil testing for precise requirements.",
          amount: "Apply 20-30 kg/ha of Muriate of Potash (0-0-60). Split application: 60% at planting, 40% at flowering stage."
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
          detailedInfo: "General recommendation for nitrogen management. Consider soil testing for precise requirements.",
          amount: "Apply 20-30 kg/ha of Urea (46-0-0) during vegetative stage. Adjust based on crop response and soil test results."
        },
        phosphorus: {
          level: 'M',
          recommendations: ['Apply balanced phosphorus fertilizer'],
          detailedInfo: "General recommendation for phosphorus management. Consider soil testing for precise requirements.",
          amount: "Apply 15-25 kg/ha of Single Superphosphate (0-20-0) at planting time. Place fertilizer 5-10 cm below seed level."
        },
        potassium: {
          level: 'M',
          recommendations: ['Apply balanced potassium fertilizer'],
          detailedInfo: "General recommendation for potassium management. Consider soil testing for precise requirements.",
          amount: "Apply 20-30 kg/ha of Muriate of Potash (0-0-60). Split application: 60% at planting, 40% at flowering stage."
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
    // OPTIMIZED: Use cached CSV loading
    const seedData = await loadCachedCSV(SEED_PRICES_ENDPOINT);
    
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
    // For vegetatively propagated crops (cassava, ginger, garlic, etc.) that don't use seeds
    // Use PHP 50 as a minimal planting material cost
    return {
      seedPricePerKilo: 50,
      currency: 'PHP'
    };
  } catch (error) {
    console.error('Error getting seed price info:', error);
    // For vegetatively propagated crops or errors, use PHP 50 as minimal cost
    return {
      seedPricePerKilo: 50,
      currency: 'PHP'
    };
  }
};

/**
 * Calculate profit projection for a crop
 * @param cropName Name of the crop
 * @param landArea Area of land in hectares
 * @param puhunan Capital investment
 * @param marketInfo Optional pre-fetched market data to avoid duplicate API calls
 * @param historicalData Optional pre-fetched historical data to avoid duplicate API calls
 * @returns Profit projection information
 */
export const calculateProfitProjection = async (
  cropName: string, 
  landArea: number, 
  puhunan: number,
  marketInfo?: any,
  historicalData?: any
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
    
    // OPTIMIZED: Use pre-fetched market data if provided, otherwise fetch it
    const marketData = marketInfo || await getMarketPriceInfo(cropName);
    console.log('Market info:', marketData);
    
    // OPTIMIZED: Use pre-fetched historical data if provided, otherwise fetch it
    const histData = historicalData || await getVegetableHistoricalData(cropName);
    console.log('Historical data length:', histData?.length);
    
    let predictedPrice = marketData.averagePrice;
    if (histData && histData.length > 0) {
      // Prepare data for demand prediction
      const prices = histData.map((record: any) => parseFloat(record.Price));
      const annualPrices = histData.map((record: any) => parseFloat(record.Annual_Price));
      const months = histData.map((record: any) => parseInt(record.MonthNum));
      
      // OPTIMIZED: Add timeout to demand prediction to prevent blocking
      const controller = new AbortController();
      let timeoutId: any = null;
      
      try {
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Get demand prediction from the backend API with timeout support
        const demandPrediction = await getVegetableDemandPrediction(
          cropName,
          prices,
          annualPrices,
          months,
          controller.signal
        );
        clearTimeout(timeoutId);
        console.log('Demand prediction:', demandPrediction);
        
        // Use predicted price if available
        if (demandPrediction && demandPrediction.predicted_price) {
          predictedPrice = demandPrediction.predicted_price;
        }
      } catch (predictionError) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('Could not get demand prediction, using average price:', predictionError);
        // Fall back to average price if prediction fails or times out
      }
    } else {
      console.log(`[CropDataService] No historical data available for ${cropName}, using market average price`);
    }
    
    const seedInfo = await getSeedPriceInfo(cropName);
    console.log('Seed info:', seedInfo);
    
    // Estimate yield based on crop-specific yield ranges
    const totalEstimatedYield = await calculateEstimatedYield(cropName, landArea);
    console.log('Total estimated yield:', totalEstimatedYield);
    
    // Calculate suggested capital based on realistic farming costs
    // First, get the max yield range for this crop
    const yieldRanges = await getCropYieldRanges(cropName);
    const maxYieldPer0_1Ha = yieldRanges.maxKGPer0_1Ha;
    
    // Calculate realistic farming costs per hectare
    // Based on Philippine agricultural data and crop-specific requirements
    
    // Define crop-specific cost multipliers based on crop type
    // Different crops have different requirements for fertilizer, labor, pest control, etc.
    const cropType = cropName.toLowerCase();
    
    // Determine crop category and apply appropriate multipliers
    let fertilizerMultiplier = 1.0;
    let laborMultiplier = 1.0;
    let pestControlMultiplier = 1.0;
    let irrigationMultiplier = 1.0;
    let seedingRatePerHectare = 3; // Default: 3 kg per hectare
    
    // Fruiting vegetables (tomatoes, eggplant, peppers, squash, etc.)
    // Need more fertilizer, pest control, and longer growing period
    if (cropType.includes('tomato') || cropType.includes('kamatis') ||
        cropType.includes('eggplant') || cropType.includes('talong') ||
        cropType.includes('pepper') || cropType.includes('sili') || cropType.includes('bell') ||
        cropType.includes('squash') || cropType.includes('kalabasa') ||
        cropType.includes('ampalaya') || cropType.includes('bitter') ||
        cropType.includes('cucumber') || cropType.includes('pipino') ||
        cropType.includes('patola') || cropType.includes('upo') ||
        cropType.includes('okra')) {
      fertilizerMultiplier = 1.3;      // Need more fertilizer for fruiting
      laborMultiplier = 1.2;           // Longer growing period, more maintenance
      pestControlMultiplier = 1.4;     // Fruit-bearing crops are more susceptible to pests
      irrigationMultiplier = 1.1;      // Moderate water needs
      seedingRatePerHectare = 2.5;     // Larger seeds, spaced planting
    }
    // Leafy vegetables (pechay, lettuce, kangkong, mustard)
    // Need less fertilizer but more frequent watering and shorter growing cycle
    else if (cropType.includes('pechay') || cropType.includes('bok choy') ||
             cropType.includes('lettuce') || cropType.includes('litsugas') ||
             cropType.includes('mustard') || cropType.includes('mustasa')) {
      fertilizerMultiplier = 0.8;      // Less fertilizer needed
      laborMultiplier = 0.9;           // Shorter growing cycle (30-45 days)
      pestControlMultiplier = 0.9;     // Less pest issues
      irrigationMultiplier = 1.3;      // Need frequent watering
      seedingRatePerHectare = 2;       // Small seeds, dense planting
    }
    // Legumes/Beans (sitao, peas, beans)
    // Need less nitrogen (fix their own) but more phosphorus/potassium
    else if (cropType.includes('beans') || cropType.includes('bagiw') ||
             cropType.includes('peas') || cropType.includes('kadyos') || cropType.includes('chicharo') ||
             cropType.includes('sitao') || cropType.includes('yardlong')) {
      fertilizerMultiplier = 0.9;      // Less fertilizer (nitrogen-fixing)
      laborMultiplier = 1.1;           // Trellis setup, multiple harvests
      pestControlMultiplier = 1.1;     // Some pest issues
      irrigationMultiplier = 1.0;      // Moderate water needs
      seedingRatePerHectare = 4;       // More seeds needed
    }
    // Cabbage family (cabbage, cauliflower, broccoli)
    // Heavy feeders, need lots of fertilizer and pest control
    else if (cropType.includes('cabbage') || cropType.includes('repolyo') ||
             cropType.includes('cauliflower') || cropType.includes('koliflower') ||
             cropType.includes('broccoli')) {
      fertilizerMultiplier = 1.4;      // Heavy feeders
      laborMultiplier = 1.1;           // Careful handling required
      pestControlMultiplier = 1.5;     // Very susceptible to pests
      irrigationMultiplier = 1.1;      // Moderate to high water needs
      seedingRatePerHectare = 1.5;     // Transplanted, fewer seeds needed
    }
    // Onion/Garlic
    // Long growing period, specialized care
    else if (cropType.includes('onion') || cropType.includes('sibuyas') ||
             cropType.includes('garlic') || cropType.includes('bawang')) {
      fertilizerMultiplier = 1.2;      // Moderate to high fertilizer
      laborMultiplier = 1.3;           // Long growing period, careful harvesting
      pestControlMultiplier = 1.2;     // Moderate pest control
      irrigationMultiplier = 0.9;      // Less water needed as they mature
      seedingRatePerHectare = 5;       // High seeding rate (sets/bulbs)
    }
    // Root crops & tubers (sweet potato, taro, cassava, yam, ginger, turmeric)
    // Need more fertilizer for root development and specialized soil preparation
    else if (cropType.includes('kamote') || cropType.includes('sweet potato') ||
             cropType.includes('gabi') || cropType.includes('taro') ||
             cropType.includes('ube') || cropType.includes('yam') ||
             cropType.includes('cassava') || cropType.includes('kamoteng') ||
             cropType.includes('ginger') || cropType.includes('luya') ||
             cropType.includes('turmeric') || cropType.includes('luyang') ||
             cropType.includes('arrowroot') || cropType.includes('araru') ||
             cropType.includes('singkamas') || cropType.includes('jicama') ||
             cropType.includes('potato') || cropType.includes('patatas') ||
             cropType.includes('carrot') || cropType.includes('karot') ||
             cropType.includes('radish') || cropType.includes('labanos')) {
      fertilizerMultiplier = 1.3;      // More fertilizer for root/tuber growth
      laborMultiplier = 1.2;           // Soil prep, hilling, careful harvesting
      pestControlMultiplier = 1.1;     // Soil pests are common
      irrigationMultiplier = 1.0;      // Moderate water needs
      seedingRatePerHectare = 5;       // High seeding rate (tubers/cuttings)
    }
    // Herbs & spices (lemongrass, chives, chili)
    // Lower input costs, easier to maintain
    else if (cropType.includes('tanglad') || cropType.includes('lemongrass') ||
             cropType.includes('chives') || cropType.includes('kutsay') ||
             cropType.includes('chili') || cropType.includes('sili') ||
             cropType.includes('labuyo')) {
      fertilizerMultiplier = 0.9;      // Moderate fertilizer
      laborMultiplier = 0.9;           // Low maintenance once established
      pestControlMultiplier = 0.9;     // Natural pest resistance
      irrigationMultiplier = 0.9;      // Drought tolerant
      seedingRatePerHectare = 2;       // Low seeding rate
    }
    // Leafy greens & salad vegetables (spinach, amaranth, jute mallow, water spinach)
    // Fast growing, need frequent watering
    else if (cropType.includes('spinach') || cropType.includes('alugbati') ||
             cropType.includes('amaranth') || cropType.includes('kolitis') || cropType.includes('uray') ||
             cropType.includes('saluyot') || cropType.includes('jute') ||
             cropType.includes('kangkong') || cropType.includes('water spinach') ||
             cropType.includes('moringa') || cropType.includes('malunggay') ||
             cropType.includes('fern') || cropType.includes('pako') ||
             cropType.includes('camote tops') || cropType.includes('talbos') ||
             cropType.includes('chayote leaves') || cropType.includes('dahon ng sayote') ||
             cropType.includes('gabi leaves') || cropType.includes('dahon ng gabi') ||
             cropType.includes('onion leaves') || cropType.includes('dahon ng sibuyas')) {
      fertilizerMultiplier = 0.8;      // Less fertilizer for leafy crops
      laborMultiplier = 0.9;           // Short growing cycle
      pestControlMultiplier = 0.9;     // Fewer pest issues
      irrigationMultiplier = 1.3;      // Need frequent watering
      seedingRatePerHectare = 2;       // Small seeds, dense planting
    }
    // Specialty vegetables (mushroom, bamboo shoot, bean sprouts, banana blossom, squash blossom)
    // Unique growing requirements
    else if (cropType.includes('mushroom') ||
             cropType.includes('bamboo') || cropType.includes('labong') ||
             cropType.includes('sprout') || cropType.includes('togue') ||
             cropType.includes('banana blossom') || cropType.includes('puso ng saging') ||
             cropType.includes('squash blossom') || cropType.includes('bulaklak ng kalabasa') ||
             cropType.includes('tamarind') || cropType.includes('sampaloc')) {
      fertilizerMultiplier = 0.9;      // Varied requirements
      laborMultiplier = 1.0;           // Moderate labor
      pestControlMultiplier = 0.8;     // Controlled environment
      irrigationMultiplier = 1.0;      // Moderate water
      seedingRatePerHectare = 2;       // Low to moderate
    }
    // Rice varieties
    // Different from vegetables - paddy field cultivation
    else if (cropType.includes('rice') || cropType.includes('bigas')) {
      fertilizerMultiplier = 1.1;      // Moderate fertilizer
      laborMultiplier = 1.2;           // Transplanting, harvesting
      pestControlMultiplier = 1.1;     // Common rice pests
      irrigationMultiplier = 1.5;      // High water needs (paddy)
      seedingRatePerHectare = 40;      // Very high seeding rate (kg/hectare for rice)
    }
    
    // 1. Seed/Planting Material Costs (based on actual seeding rates)
    const seedCostPerHectare = seedInfo.seedPricePerKilo * seedingRatePerHectare;
    
    // 2. Fertilizer Costs (NPK + organic) - crop-specific
    // Base: PHP 12,000 per hectare
    const fertilizerCostPerHectare = 12000 * fertilizerMultiplier;
    
    // 3. Labor Costs (planting, maintenance, harvesting) - crop-specific
    // Base: PHP 20,000 per hectare
    const laborCostPerHectare = 20000 * laborMultiplier;
    
    // 4. Pest Control & Chemicals - crop-specific
    // Base: PHP 7,500 per hectare
    const pestControlCostPerHectare = 7500 * pestControlMultiplier;
    
    // 5. Irrigation & Water - crop-specific
    // Base: PHP 4,500 per hectare
    const irrigationCostPerHectare = 4500 * irrigationMultiplier;
    
    // 6. Equipment & Tools (amortized)
    // PHP 3,500 per hectare (relatively constant)
    const equipmentCostPerHectare = 3500;
    
    // 7. Miscellaneous & Contingency (10% of total)
    const subtotalPerHectare = seedCostPerHectare + fertilizerCostPerHectare + 
                              laborCostPerHectare + pestControlCostPerHectare + 
                              irrigationCostPerHectare + equipmentCostPerHectare;
    const miscellaneousCostPerHectare = subtotalPerHectare * 0.10;
    
    // Total realistic cost per hectare
    const totalCostPerHectare = subtotalPerHectare + miscellaneousCostPerHectare;
    
    // Calculate suggested capital for the given land area
    const suggestedCapital = totalCostPerHectare * landArea;
    
    // Apply a small buffer (5%) for unexpected costs
    const suggestedCapitalWithBuffer = suggestedCapital * 1.05;
    
    console.log('Realistic capital calculation -', {
      cropName,
      seedCostPerHectare,
      fertilizerCostPerHectare,
      laborCostPerHectare,
      pestControlCostPerHectare,
      irrigationCostPerHectare,
      equipmentCostPerHectare,
      miscellaneousCostPerHectare,
      totalCostPerHectare,
      landArea,
      suggestedCapital: suggestedCapitalWithBuffer
    });
    
    // Calculate values based on user's investment
    // If investment is 0, yield and profit should also be 0
    const userInvestment = Number(puhunan) || 0;
    const estimatedYield = userInvestment === 0 ? 0 : 
        totalEstimatedYield * 
        (Math.abs(userInvestment - suggestedCapitalWithBuffer) < 0.01 || userInvestment > suggestedCapitalWithBuffer ? 1 : (userInvestment / suggestedCapitalWithBuffer));
    
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
      estimatedYield: totalEstimatedYield, // Cache the BASE yield (not investment-adjusted)
      estimatedYieldAdjusted: estimatedYield, // Also store the adjusted yield for this specific investment
      potentialRevenue,
      totalCosts: userInvestment, // Total costs equal user's investment
      netProfit,
      profitMargin,
      marketTrend: marketData.trend,
      averageMarketPrice: predictedPrice, // Use predicted price instead of average
      suggestedCapital: suggestedCapitalWithBuffer
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
  // CRITICAL FIX: Include puhunan (investment) in cache key!
  // Different farmers have different investments, so they need different calculations
  // This ensures each farmer gets THEIR specific yield based on their investment
  const cacheKey = `${cropName.toLowerCase()}-${soilType.toLowerCase()}-${landArea}-${puhunan}`;
  
  console.log(`[getCropInsights] Cache key: ${cacheKey} (includes investment: ₱${puhunan})`);
  
  // OPTIMIZATION: Check localStorage cache first (like MarketDemand & CropPrescription)
  const cachedData = getCachedCropInsights(cacheKey);
  if (cachedData) {
    console.log('[getCropInsights] Using cached insights from localStorage');
    return cachedData;
  }
  
  // Return from memory cache if available (instant)
  if (CROP_INSIGHTS_CACHE[cacheKey]) {
    console.log('[getCropInsights] Using in-memory cache');
    return CROP_INSIGHTS_CACHE[cacheKey];
  }
  
  // If request is already in-flight, return the same promise (deduplication)
  if (PENDING_INSIGHTS_REQUESTS[cacheKey]) {
    console.log('[getCropInsights] Request already in-flight, waiting...');
    return PENDING_INSIGHTS_REQUESTS[cacheKey];
  }
  
  // Create the request promise
  const requestPromise = (async () => {
    try {
      console.log('[getCropInsights] Fetching fresh data from API');
      // OPTIMIZED: Fetch market data ONCE and reuse it
      const marketInfo = await getMarketPriceInfo(cropName);
      
      // Get historical data ONCE and pass it to profit calculation
      const historicalData = await getVegetableHistoricalData(cropName);
      
      // Get all insights in parallel, reusing already-fetched data
      const [fertilizerInfo, profitProjection] = await Promise.all([
        getFertilizerRecommendations(cropName, soilType),
        calculateProfitProjection(cropName, landArea, puhunan, marketInfo, historicalData)
      ]);
      
      const result = {
        fertilizer: fertilizerInfo,
        market: marketInfo,
        profit: profitProjection
      };
      
      // Cache the result in memory
      CROP_INSIGHTS_CACHE[cacheKey] = result;
      
      // Cache the result in localStorage (like MarketDemand & CropPrescription)
      setCachedCropInsights(cacheKey, result);
      
      return result;
    } finally {
      // Remove from pending once complete
      delete PENDING_INSIGHTS_REQUESTS[cacheKey];
    }
  })();
  
  PENDING_INSIGHTS_REQUESTS[cacheKey] = requestPromise;
  return requestPromise;
};

/**
 * OPTIMIZATION: Clear all caches (useful when data is updated)
 */
export const clearAllCropCaches = () => {
  Object.keys(CROP_INSIGHTS_CACHE).forEach(key => delete CROP_INSIGHTS_CACHE[key]);
  Object.keys(PENDING_INSIGHTS_REQUESTS).forEach(key => delete PENDING_INSIGHTS_REQUESTS[key]);
  Object.keys(CSV_DATA_CACHE).forEach(key => delete CSV_DATA_CACHE[key]);
  Object.keys(PENDING_CSV_REQUESTS).forEach(key => delete PENDING_CSV_REQUESTS[key]);
  console.log('[CropDataService] All caches cleared');
};

/**
 * OPTIMIZATION: Get cache statistics for debugging
 */
export const getCacheStats = () => {
  return {
    cropInsights: Object.keys(CROP_INSIGHTS_CACHE).length,
    csvData: Object.keys(CSV_DATA_CACHE).length,
    pendingInsights: Object.keys(PENDING_INSIGHTS_REQUESTS).length,
    pendingCSV: Object.keys(PENDING_CSV_REQUESTS).length
  };
};
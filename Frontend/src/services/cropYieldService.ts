/**
 * Service for handling crop yield range data
 */
import { loadCSV, findMatchingRecords } from '@/utils/csvParser';

// API endpoint for crop yield ranges
const CROP_YIELD_RANGES_ENDPOINT = '/data/crop_yield_ranges.csv';

/**
 * Get crop yield ranges based on crop name
 * @param cropName Name of the crop
 * @returns Min and max yield per 0.1 hectare
 */
export const getCropYieldRanges = async (cropName: string) => {
  try {
    // Load crop yield ranges data
    const yieldData = await loadCSV(CROP_YIELD_RANGES_ENDPOINT);
    
    // Normalize crop name for better matching
    const normalizedCropName = cropName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Find matching records for the crop with improved matching
    let matchingRecords = findMatchingRecords(yieldData, 'Crop', cropName);
    
    // If no exact match, try with more flexible matching
    if (matchingRecords.length === 0) {
      // Try case-insensitive exact match first
      matchingRecords = yieldData.filter(record => 
        record['Crop'] && record['Crop'].toLowerCase() === normalizedCropName
      );
    }
    
    // If still no match, try partial matching with normalized names
    if (matchingRecords.length === 0) {
      matchingRecords = yieldData.filter(record => {
        if (!record['Crop']) return false;
        const recordCropName = record['Crop'].toLowerCase().replace(/\s+/g, ' ').trim();
        // Check if either name contains the other
        return recordCropName.includes(normalizedCropName) || normalizedCropName.includes(recordCropName);
      });
    }
    
    // If still no match, try word-based matching
    if (matchingRecords.length === 0) {
      const cropWords = normalizedCropName.split(/[() ,]+/).filter(word => word.length > 2);
      if (cropWords.length > 0) {
        matchingRecords = yieldData.filter(record => {
          if (!record['Crop']) return false;
          const recordCropName = record['Crop'].toLowerCase().replace(/\s+/g, ' ').trim();
          const recordWords = recordCropName.split(/[() ,]+/).filter(word => word.length > 2);
          
          // Check if there's significant overlap in words
          const commonWords = cropWords.filter(word => 
            recordWords.some(recordWord => 
              recordWord.includes(word) || word.includes(recordWord)
            )
          );
          
          return commonWords.length >= Math.min(cropWords.length, recordWords.length) * 0.5;
        });
      }
    }
    
    if (matchingRecords.length > 0) {
      // Get the first matching record
      const record = matchingRecords[0];
      return {
        minKGPer0_1Ha: record['MinKG_0.1ha'],
        maxKGPer0_1Ha: record['MaxKG_0.1ha']
      };
    }
    
    // Default values if no data found
    console.warn(`No yield data found for crop: ${cropName}. Using default values.`);
    return {
      minKGPer0_1Ha: 500,
      maxKGPer0_1Ha: 1500
    };
  } catch (error) {
    console.error('Error getting crop yield ranges:', error);
    return {
      minKGPer0_1Ha: 500,
      maxKGPer0_1Ha: 1500
    };
  }
};

/**
 * Calculate estimated yield based on crop yield ranges and land area
 * @param cropName Name of the crop
 * @param landArea Land area in hectares
 * @returns Estimated yield in kilograms
 */
export const calculateEstimatedYield = async (cropName: string, landArea: number) => {
  // Get yield ranges for the crop
  const yieldRanges = await getCropYieldRanges(cropName);
  
  // Calculate average yield per 0.1 hectare
  const avgYieldPer0_1Ha = (yieldRanges.minKGPer0_1Ha + yieldRanges.maxKGPer0_1Ha) / 2;
  
  // Calculate total estimated yield for the given land area
  // Convert land area to 0.1 hectare units (multiply by 10)
  const landAreaIn0_1Ha = landArea * 10;
  const totalEstimatedYield = landAreaIn0_1Ha * avgYieldPer0_1Ha;
  
  return totalEstimatedYield;
};
import { calculateEstimatedYield } from './services/cropYieldService';

// Test the crop yield calculation
async function testCropYield() {
  try {
    // Test with a few different crops
    const testCrops = [
      'CABBAGE (REPOLYO)',
      'KANGKONG (WATER SPINACH)',
      'KAMATIS (TOMATO)',
      'NON-EXISTENT CROP'
    ];
    
    const landArea = 1.0; // 1 hectare
    
    for (const crop of testCrops) {
      console.log(`\nTesting crop: ${crop}`);
      const estimatedYield = await calculateEstimatedYield(crop, landArea);
      console.log(`Estimated yield for ${landArea} hectare(s): ${estimatedYield} kg`);
    }
  } catch (error) {
    console.error('Error testing crop yield calculation:', error);
  }
}

testCropYield();
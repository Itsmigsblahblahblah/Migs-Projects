// Test the crop yield service after fixing the API URL
import { getCropYieldRanges, calculateEstimatedYield } from './Frontend/src/services/cropYieldService.js';

async function testCropYieldFix() {
  try {
    console.log('Testing crop yield service after URL fix');
    
    // Test with Cabbage (Repolyo)
    console.log('\n--- Testing CABBAGE (REPOLYO) ---');
    const repolyoRanges = await getCropYieldRanges('CABBAGE (REPOLYO)');
    console.log('Cabbage yield ranges:', repolyoRanges);
    
    const repolyoYield = await calculateEstimatedYield('CABBAGE (REPOLYO)', 0.1);
    console.log('Cabbage yield for 0.1 hectare:', repolyoYield, 'kg');
    
    // Test with another crop
    console.log('\n--- Testing KANGKONG (WATER SPINACH) ---');
    const kangkongRanges = await getCropYieldRanges('KANGKONG (WATER SPINACH)');
    console.log('Kangkong yield ranges:', kangkongRanges);
    
    const kangkongYield = await calculateEstimatedYield('KANGKONG (WATER SPINACH)', 0.1);
    console.log('Kangkong yield for 0.1 hectare:', kangkongYield, 'kg');
    
    // Test with a crop that doesn't exist (should use defaults)
    console.log('\n--- Testing NON-EXISTENT CROP ---');
    const defaultRanges = await getCropYieldRanges('NON-EXISTENT CROP');
    console.log('Default yield ranges:', defaultRanges);
    
    const defaultYield = await calculateEstimatedYield('NON-EXISTENT CROP', 0.1);
    console.log('Default yield for 0.1 hectare:', defaultYield, 'kg');
    
  } catch (error) {
    console.error('Error testing crop yield service:', error);
  }
}

testCropYieldFix();
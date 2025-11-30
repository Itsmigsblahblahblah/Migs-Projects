// Test the actual service functions
import { getCropYieldRanges, calculateEstimatedYield } from './Frontend/src/services/cropYieldService.js';

async function testRepolyo() {
  try {
    console.log('Testing CABBAGE (REPOLYO)');
    
    // Test getCropYieldRanges
    const yieldRanges = await getCropYieldRanges('CABBAGE (REPOLYO)');
    console.log('Yield ranges:', yieldRanges);
    
    // Test calculateEstimatedYield for 0.1 hectare
    const estimatedYield = await calculateEstimatedYield('CABBAGE (REPOLYO)', 0.1);
    console.log('Estimated yield for 0.1 hectare:', estimatedYield, 'kg');
    
    // Test calculateEstimatedYield for 1 hectare
    const estimatedYield1Ha = await calculateEstimatedYield('CABBAGE (REPOLYO)', 1.0);
    console.log('Estimated yield for 1 hectare:', estimatedYield1Ha, 'kg');
  } catch (error) {
    console.error('Error:', error);
  }
}

testRepolyo();
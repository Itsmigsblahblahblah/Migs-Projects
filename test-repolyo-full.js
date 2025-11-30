// Test the full profit projection calculation
import { calculateProfitProjection } from './Frontend/src/services/cropDataService.js';

async function testRepolyoFull() {
  try {
    console.log('Testing full profit projection for CABBAGE (REPOLYO) with 0.1 hectare');
    
    // Test with 0.1 hectare and a reasonable investment
    const profitProjection = await calculateProfitProjection(
      'CABBAGE (REPOLYO)', 
      0.1, 
      10000 // Investment
    );
    
    console.log('Profit projection results:');
    console.log('- Estimated Yield:', profitProjection.estimatedYield, 'kg');
    console.log('- Potential Revenue:', profitProjection.potentialRevenue, 'PHP');
    console.log('- Net Profit:', profitProjection.netProfit, 'PHP');
    console.log('- Suggested Capital:', profitProjection.suggestedCapital, 'PHP');
  } catch (error) {
    console.error('Error:', error);
  }
}

testRepolyoFull();
import { calculateProfitProjection } from './services/cropDataService';

// Test the profit projection with the new crop-specific yield calculation
async function testProfitProjection() {
  try {
    // Test with a few different crops
    const testCrops = [
      { name: 'CABBAGE (REPOLYO)', landArea: 1.0, puhunan: 50000 },
      { name: 'KANGKONG (WATER SPINACH)', landArea: 0.5, puhunan: 25000 },
      { name: 'KAMATIS (TOMATO)', landArea: 2.0, puhunan: 100000 }
    ];
    
    for (const crop of testCrops) {
      console.log(`\nTesting profit projection for: ${crop.name}`);
      console.log(`Land area: ${crop.landArea} hectare(s)`);
      console.log(`Investment: ₱${crop.puhunan}`);
      
      const profitProjection = await calculateProfitProjection(
        crop.name,
        crop.landArea,
        crop.puhunan
      );
      
      console.log('Profit Projection Results:');
      console.log(`- Estimated Yield: ${profitProjection.estimatedYield.toFixed(2)} kg`);
      console.log(`- Potential Revenue: ₱${profitProjection.potentialRevenue.toFixed(2)}`);
      console.log(`- Net Profit: ₱${profitProjection.netProfit.toFixed(2)}`);
      console.log(`- Profit Margin: ${profitProjection.profitMargin.toFixed(2)}%`);
      console.log(`- Suggested Capital: ₱${profitProjection.suggestedCapital.toFixed(2)}`);
    }
  } catch (error) {
    console.error('Error testing profit projection:', error);
  }
}

testProfitProjection();
// Simulate the calculation for repolyo
const minKGPer0_1Ha = 1500;
const maxKGPer0_1Ha = 2500;
const landArea = 0.1; // 0.1 hectare

// Calculate average yield per 0.1 hectare
const avgYieldPer0_1Ha = (minKGPer0_1Ha + maxKGPer0_1Ha) / 2;
console.log('Average yield per 0.1 hectare:', avgYieldPer0_1Ha);

// Convert land area to 0.1 hectare units
const landAreaIn0_1Ha = landArea * 10;
console.log('Land area in 0.1 hectare units:', landAreaIn0_1Ha);

// Calculate total estimated yield
const totalEstimatedYield = landAreaIn0_1Ha * avgYieldPer0_1Ha;
console.log('Total estimated yield:', totalEstimatedYield, 'kg');
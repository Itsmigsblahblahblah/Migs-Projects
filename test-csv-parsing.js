// Test CSV parsing
import { loadCSV, findMatchingRecords } from './Frontend/src/utils/csvParser.js';

async function testCSVParsing() {
  try {
    console.log('Testing CSV parsing for crop yield ranges');
    
    // Load the crop yield ranges CSV
    const yieldData = await loadCSV('/data/crop_yield_ranges.csv');
    console.log('Total records loaded:', yieldData.length);
    
    // Find repolyo data
    const matchingRecords = findMatchingRecords(yieldData, 'Crop', 'CABBAGE (REPOLYO)');
    console.log('Matching records for CABBAGE (REPOLYO):', matchingRecords);
    
    if (matchingRecords.length > 0) {
      const record = matchingRecords[0];
      console.log('Record data:');
      console.log('- Crop:', record.Crop);
      console.log('- MinKG_0.1ha:', record.MinKG_0_1ha);
      console.log('- MaxKG_0.1ha:', record.MaxKG_0_1ha);
      console.log('- Type of MinKG_0.1ha:', typeof record.MinKG_0_1ha);
      console.log('- Type of MaxKG_0.1ha:', typeof record.MaxKG_0_1ha);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCSVParsing();
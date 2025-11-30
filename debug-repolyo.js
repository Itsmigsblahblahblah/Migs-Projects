// Debug the repolyo calculation
async function debugRepolyo() {
  try {
    // Simulate the fetch call to get the CSV data
    const response = await fetch('http://localhost:8000/data/crop_yield_ranges.csv');
    const csvText = await response.text();
    
    // Simple CSV parsing
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find the repolyo row
    let repolyoData = null;
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(',');
      if (currentLine.length === headers.length) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          let value = currentLine[j].trim();
          if (!isNaN(Number(value)) && value !== '') {
            obj[headers[j]] = Number(value);
          } else {
            obj[headers[j]] = value;
          }
        }
        if (obj.Crop && obj.Crop.includes('CABBAGE (REPOLYO)')) {
          repolyoData = obj;
          break;
        }
      }
    }
    
    console.log('Repolyo data:', repolyoData);
    
    if (repolyoData) {
      // Calculate yield for 0.1 hectare
      const min = repolyoData['MinKG_0.1ha'];
      const max = repolyoData['MaxKG_0.1ha'];
      const avg = (min + max) / 2;
      
      console.log(`Min: ${min} kg per 0.1 ha`);
      console.log(`Max: ${max} kg per 0.1 ha`);
      console.log(`Average: ${avg} kg per 0.1 ha`);
      
      // For 0.1 hectare, we have exactly 1 unit of 0.1 ha
      const landArea = 0.1;
      const landAreaIn0_1Ha = landArea * 10; // = 1
      const totalEstimatedYield = landAreaIn0_1Ha * avg;
      
      console.log(`Land area: ${landArea} ha`);
      console.log(`Land area in 0.1 ha units: ${landAreaIn0_1Ha}`);
      console.log(`Total estimated yield: ${totalEstimatedYield} kg`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugRepolyo();
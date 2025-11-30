# Frontend Crop Yield Integration Guide

## Overview
This guide explains how to integrate and use the new crop-specific yield calculation functionality in the frontend application.

## New Service

A new service has been created at `src/services/cropYieldService.ts` with two main functions:

### 1. getCropYieldRanges(cropName: string)

Fetches the minimum and maximum yield ranges for a specific crop from the backend CSV data.

**Parameters:**
- `cropName`: Name of the crop to get yield ranges for

**Returns:**
```typescript
{
  minKGPer0_1Ha: number,  // Minimum yield in kg per 0.1 hectare
  maxKGPer0_1Ha: number   // Maximum yield in kg per 0.1 hectare
}
```

**Example:**
```typescript
import { getCropYieldRanges } from '@/services/cropYieldService';

const yieldRanges = await getCropYieldRanges('CABBAGE (REPOLYO)');
console.log(yieldRanges); 
// Output: { minKGPer0_1Ha: 1500, maxKGPer0_1Ha: 2500 }
```

### 2. calculateEstimatedYield(cropName: string, landArea: number)

Calculates the estimated yield for a specific crop based on the land area.

**Parameters:**
- `cropName`: Name of the crop
- `landArea`: Land area in hectares

**Returns:**
- `number`: Estimated yield in kilograms

**Example:**
```typescript
import { calculateEstimatedYield } from '@/services/cropYieldService';

const estimatedYield = await calculateEstimatedYield('CABBAGE (REPOLYO)', 1.0);
console.log(`Estimated yield: ${estimatedYield} kg`);
// Output: Estimated yield: 20000 kg (for 1 hectare using 1500-2500 kg per 0.1 ha)
```

## Integration with Existing Services

The `calculateProfitProjection` function in `src/services/cropDataService.ts` has been updated to use the new crop-specific yield calculation instead of the previous fixed 10 tons per hectare assumption.

No changes are needed to call this function - it automatically uses the new calculation method.

**Example:**
```typescript
import { calculateProfitProjection } from '@/services/cropDataService';

const profitProjection = await calculateProfitProjection(
  'CABBAGE (REPOLYO)',  // cropName
  1.0,                  // landArea in hectares
  50000                 // puhunan (investment)
);

console.log(profitProjection.estimatedYield); // Now crop-specific!
```

## Data Source

The crop yield data is sourced from `crop yield ranges.csv` which contains:
- Crop names (including Tagalog names)
- Minimum yield per 0.1 hectare
- Maximum yield per 0.1 hectare

This data is served by the backend at `GET /data/crop_yield_ranges.csv`.

## Error Handling

The service includes proper error handling:
- If a crop is not found in the CSV, it falls back to default values (500-1500 kg per 0.1 hectare)
- Network errors are caught and logged
- All functions return sensible default values in error cases

## Testing

To test the new functionality:

1. **Run the backend server:**
   ```bash
   cd Backend
   python -m uvicorn main:app --reload
   ```

2. **Run the frontend development server:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test the functions directly:**
   - Open `test-crop-yield.html` in your browser
   - Or run `test-crop-yield.ts` and `test-profit-projection.ts` with Node.js

## Benefits

1. **Accuracy**: Each crop now has its own yield characteristics
2. **Realism**: Based on actual agricultural data rather than assumptions
3. **Scalability**: Easy to update yield data by modifying the CSV file
4. **Maintainability**: Clean separation of concerns in the service architecture

## Usage in Components

To use the new functionality in React components:

```typescript
import { calculateProfitProjection } from '@/services/cropDataService';
import { calculateEstimatedYield } from '@/services/cropYieldService';

// In your component or hook
const getProfitProjection = async (cropName: string, landArea: number, investment: number) => {
  const projection = await calculateProfitProjection(cropName, landArea, investment);
  return projection;
};

const getEstimatedYield = async (cropName: string, landArea: number) => {
  const yield = await calculateEstimatedYield(cropName, landArea);
  return yield;
};
```

## Backend Requirements

The backend must be running and accessible at the configured API base URL. The new endpoint `GET /data/crop_yield_ranges.csv` must be available.

## Troubleshooting

1. **CORS Issues**: Ensure the backend has proper CORS configuration (already implemented)
2. **Network Errors**: Check that both frontend and backend servers are running
3. **Missing Data**: If a crop isn't found, check the spelling and the CSV file contents
4. **Incorrect Calculations**: Verify the land area is in hectares (not acres or other units)
# Fix: Crop Edit Not Updating Harvest Automatically

## Problem (In Tagalog)
> "Sinubukan ko pag nag-add ng new crop tapos 0 capital then syempre 0 kg of harvest ang lalabas which is correct naman, pero pag in-edit ko at binago ko na yung capital base sa suggested capital, 0 padin yung naka-show sa harvest pero pag ni-refresh ko lumalabas naman na yung est. harvest base on capital or investment. The only problem here is bakit need ko pa i-refresh para mabago yung harvest diba dapat kusa na siya na nagbabago."

## English Translation
When adding a new crop with 0 capital, it correctly shows 0 kg harvest. But when editing the crop and changing the capital to the suggested amount, the harvest still shows 0. Only after refreshing the page does the correct estimated harvest appear based on the new capital/investment.

## Root Cause

The issue was **incomplete cache invalidation** when updating a crop:

### What Happened Before:
1. ✅ User edits crop and changes `puhunan` (capital) from 0 to 50,000
2. ✅ Firestore database is updated with new capital
3. ✅ CropContext local state is updated
4. ✅ localStorage crop cache is invalidated
5. ❌ **INSIGHTS_CACHE is NOT cleared** ← THIS WAS THE BUG!
6. ❌ Ledger still uses OLD cached calculations (with 0 capital)
7. ❌ Shows 0 kg harvest even though capital is now 50,000

### Why Refresh Fixed It:
- Page refresh clears ALL in-memory caches
- Fresh load recalculates everything with new capital value
- That's why the correct harvest appeared after refresh

## Solution

Added automatic cache clearing when crops are updated/added/deleted:

### Modified File: `CropContext.tsx`

**Added imports:**
```typescript
import { clearInsightsCache } from "@/services/farmLedgerService";
import { clearAllCropCaches } from "@/services/cropDataService";
```

**Updated `updateCrop()` function:**
```typescript
// CRITICAL: Clear insights cache when puhunan/capital changes
// This ensures ledger recalculates with new investment values
if (cropData.puhunan !== undefined || 
    cropData.landArea !== undefined || 
    cropData.soilType !== undefined || 
    cropData.name !== undefined) {
    console.log('[CropContext] Clearing insights cache due to crop data change');
    clearInsightsCache();
    clearAllCropCaches();
}
```

**Also updated `addCrop()` and `deleteCrop()` to clear caches.**

## What Happens Now:

1. ✅ User edits crop and changes `puhunan` from 0 to 50,000
2. ✅ Firestore database is updated
3. ✅ CropContext local state is updated
4. ✅ localStorage crop cache is invalidated
5. ✅ **INSIGHTS_CACHE is cleared** ← FIXED!
6. ✅ Ledger recalculates with NEW capital (50,000)
7. ✅ Shows correct harvest immediately - **NO REFRESH NEEDED!**

## Testing Steps

### Test Case 1: Edit Capital
1. Add new crop with 0 capital
2. Verify it shows 0 kg harvest ✅
3. Edit the crop and change capital to suggested amount (e.g., 50,000)
4. Save the changes
5. **Expected**: Harvest amount updates immediately without refresh ✅
6. **Before fix**: Had to refresh page to see updated harvest ❌

### Test Case 2: Edit Other Fields
1. Edit a crop and change:
   - Land area
   - Soil type
   - Crop name
2. Save the changes
3. **Expected**: All calculations update immediately ✅

### Test Case 3: Add New Crop
1. Add a completely new crop type
2. Fill in all details including capital
3. Save
4. **Expected**: Shows correct calculations immediately ✅

### Test Case 4: Delete Crop
1. Delete a crop
2. Navigate to ledger
3. **Expected**: Deleted crop no longer appears ✅

## Cache Invalidation Strategy

### When Caches ARE Cleared:
- ✅ Adding a new crop
- ✅ Updating crop capital (puhunan)
- ✅ Updating crop land area
- ✅ Updating crop soil type
- ✅ Updating crop name
- ✅ Deleting a crop
- ✅ Cache age > 5 minutes (localStorage only)

### When Caches are NOT Cleared:
- ❌ Just viewing/refreshing the page
- ❌ Navigating between pages
- ❌ Logging out and back in (within 5 minutes)

## Performance Impact

**Minimal impact** - cache clearing only happens when data actually changes:

| Action | Cache Cleared? | Performance Impact |
|--------|---------------|-------------------|
| View ledger | No | Instant (uses cache) |
| Edit crop capital | Yes | Next load recalculates (2-5 sec) |
| Refresh page | No | Instant (uses localStorage cache) |
| Add new crop | Yes | First load slower, then cached |

## Technical Details

### Caches Being Cleared:
1. **INSIGHTS_CACHE** (farmLedgerService)
   - Stores calculated crop insights (yield, profit, revenue)
   - Key format: `cropname-soiltype`
   - Example: `rice-clay-loam`

2. **CROP_INSIGHTS_CACHE** (cropDataService)
   - Stores API responses for crop data
   - Key format: `cropname-soiltype`

3. **CSV_DATA_CACHE** (cropDataService)
   - Stores CSV file data (soil, seed, yield data)
   - Key format: endpoint URL

4. **localStorage crops cache**
   - Stores crop list for instant page loads
   - Key format: `crops_{userId}`
   - TTL: 5 minutes

### Why This Fix Works:
By clearing the insights cache when crop data changes, we force the system to:
1. Fetch fresh data from APIs
2. Recalculate yield/revenue/profit with new values
3. Display accurate results immediately
4. Cache the NEW calculations for future fast access

## Console Logs

When editing a crop, you'll now see in the browser console:
```
[CropContext] Clearing insights cache due to crop data change
[FarmLedgerService] Insights cache cleared
[CropDataService] All caches cleared
```

This helps with debugging if needed.

## Summary

**Before Fix**: 
- Edit crop → Save → Still shows old values → Must refresh page ❌

**After Fix**:
- Edit crop → Save → Shows new values immediately → No refresh needed ✅

The fix maintains all performance optimizations while ensuring data accuracy when crops are modified.

# Soil Data Auto-Population Feature

## Overview
This feature automatically populates the Soil Analysis section in the Crop Prescription dialog based on the farmer's selected farm address. When a farmer opens the Crop Prescription dialog, the system automatically fetches and displays the corresponding soil data from the Soilanaly.csv file.

## Implementation Details

### Backend Changes

#### New Endpoint: `/soil-data/{barangay}`
- **File**: `fert_soil_transformer.py`
- **Method**: GET
- **Description**: Fetches soil data for a specific barangay from the Soilanaly.csv file
- **Response Format**:
  ```json
  {
    "soil_data": {
      "pH": 6.0,
      "Nitrogen": "L",
      "Phosphorus": "H", 
      "Potassium": "L"
    }
  }
  ```
- **Error Handling**: Returns empty `soil_data` object if barangay not found

### Frontend Changes

#### CropPrescriptionDialog Component
- **File**: `Frontend/src/components/dashboard/farmer/CropPrescriptionDialog.tsx`
- **Enhancements**:
  - Accepts `farmerProfile` prop
  - Automatically extracts barangay name from farm address
  - Fetches soil data when dialog opens
  - Populates input fields with fetched data
  - Shows loading state during data fetch
  - Handles cases where no soil data is found

#### QuickActions Component
- **File**: `Frontend/src/components/dashboard/farmer/QuickActions.tsx`
- **Enhancements**:
  - Passes farmer profile to CropPrescriptionDialog

#### FarmerDashboard Component
- **File**: `Frontend/src/pages/FarmerDashboard.tsx`
- **Enhancements**:
  - Passes farmer profile to QuickActions component

#### Vite Configuration
- **File**: `Frontend/vite.config.ts`
- **Enhancements**:
  - Updated proxy target to point to the correct API port

## How It Works

1. When a farmer opens the Crop Prescription dialog, the system:
   - Extracts the barangay name from the farm address in the farmer's profile
   - Makes an API call to `/soil-data/{barangay}` to fetch soil data
   - Populates the Soil Analysis input fields with the fetched data
   - Automatically generates crop recommendations based on the soil data

2. If no soil data is found for the barangay:
   - The system uses default values for soil analysis
   - The farmer can manually adjust the values if needed

3. The soil data is automatically synchronized with the farmer's latest farm address:
   - When the farmer updates their farm address in the Edit Profile dialog
   - The next time they open the Crop Prescription dialog, it will fetch data for the new address

## Testing

The feature has been tested with:
- Existing barangays in the Soilanaly.csv file (e.g., "San Roque")
- Non-existent barangays (returns empty data)
- Manual input when no data is available

## API Endpoint Testing

```bash
# Test with existing barangay
curl http://localhost:8002/soil-data/San%20Roque

# Test with non-existent barangay  
curl http://localhost:8002/soil-data/NonExistentBarangay
```

## Future Enhancements

1. **Caching**: Implement client-side caching to reduce API calls for frequently accessed barangays
2. **Fallback Values**: Provide more realistic placeholder values when no soil data is found
3. **User Feedback**: Add visual indicators when soil data is being fetched or when no data is available
4. **Error Handling**: Improve error handling for network issues or server errors
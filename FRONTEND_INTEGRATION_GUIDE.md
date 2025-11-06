# Frontend Integration Guide: Soil Crop Recommendation System

## Overview
This guide explains how to integrate the soil-based crop recommendation system with the existing CropPrescriptionDialog component in the Majayjay Farm Resource Management System.

## Current Implementation
The existing CropPrescriptionDialog uses placeholder data. We'll modify it to fetch real recommendations from our trained model via the FastAPI endpoint.

## Integration Steps

### 1. Update CropPrescriptionDialog Component

Modify `Frontend/src/components/dashboard/farmer/CropPrescriptionDialog.tsx` to fetch recommendations from the backend:

```typescript
// Add this interface for the API response
interface CropRecommendation {
  crop: string;
  confidence: number;
}

interface SoilData {
  pH: number;
  Nitrogen: string;  // 'L', 'M', or 'H'
  Phosphorus: string;  // 'L', 'M', or 'H'
  Potassium: string;  // 'L', 'M', or 'H'
}

interface FarmerProfile {
  fullName: string;
  email: string;
  contactNumber: string;
  homeAddress: string;
  farmAddress: string;
  farmArea: string;
  photoURL: string;
  createdAt: string;
}

// Add state for loading and recommendations
const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [soilDataLoading, setSoilDataLoading] = useState(false);

// Add function to fetch soil data by barangay
const fetchSoilDataByBarangay = async (barangay: string) => {
  setSoilDataLoading(true);
  setError(null);
  
  try {
    const response = await fetch(`/api/soil-data/${encodeURIComponent(barangay)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch soil data');
    }
    
    const data = await response.json();
    
    if (data.soil_data && Object.keys(data.soil_data).length > 0) {
      // Update input soil data with fetched data
      setInputSoilData({
        pH: data.soil_data.pH,
        Nitrogen: data.soil_data.Nitrogen,
        Phosphorus: data.soil_data.Phosphorus,
        Potassium: data.soil_data.Potassium
      });
      return data.soil_data;
    } else {
      // If no data found, keep current values or use defaults
      console.log(`No soil data found for barangay: ${barangay}`);
      return null;
    }
  } catch (err) {
    console.error('Error fetching soil data:', err);
    setError('Failed to load soil data. Using default values.');
    return null;
  } finally {
    setSoilDataLoading(false);
  }
};

// Add function to fetch recommendations
const fetchRecommendations = async (soilData: SoilData) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(soilData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    
    const data = await response.json();
    setRecommendations(data.recommended_crops);
  } catch (err) {
    setError('Failed to load crop recommendations. Please try again.');
    console.error('Error fetching recommendations:', err);
  } finally {
    setLoading(false);
  }
};

// Modify the component to accept farmer profile as props
interface CropPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerProfile?: FarmerProfile; // Optional farmer profile for automatic soil data population
}
```

### 2. Update the Recommendations Display

Replace the placeholder prescriptions with the fetched recommendations:

```tsx
{/* Prescribed Crops */}
<div>
  <h3 className="text-lg font-semibold mb-4">Recommended Crops</h3>
  
  {loading && (
    <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2">Analyzing soil data...</span>
    </div>
  )}
  
  {error && (
    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive">
      {error}
    </div>
  )}
  
  {!loading && !error && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {recommendations.map((recommendation, index) => (
        <Card 
          key={index}
          className="hover:shadow-md transition-shadow cursor-pointer border-primary/20"
          onClick={() => handleCropSelect({
            id: index.toString(),
            crop: recommendation.crop,
            reason: `Recommended based on your soil analysis with ${Math.round(recommendation.confidence * 100)}% confidence.`,
            confidence: Math.round(recommendation.confidence * 100),
            plantingSeason: "Based on current conditions",
            expectedYield: "Varies by conditions",
            marketTrend: "Check local market",
            soilType: `pH: ${inputSoilData.pH}, N:${inputSoilData.Nitrogen}, P:${inputSoilData.Phosphorus}, K:${inputSoilData.Potassium}`,
            weatherCondition: "Current weather patterns",
            recommendations: [
              "Follow local agricultural guidelines",
              "Monitor soil moisture levels",
              "Apply appropriate fertilizers based on soil test"
            ],
            avoid: [
              "Plant in waterlogged areas",
              "Over-fertilize without soil testing",
              "Ignore local climate conditions"
            ]
          })}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{recommendation.crop}</span>
              <Badge variant="secondary">{Math.round(recommendation.confidence * 100)}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Recommended based on your soil analysis with {Math.round(recommendation.confidence * 100)}% confidence.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              <span>Planting season varies</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Check local market trends</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</div>
```

### 3. Update Component Usage

Update the components that use CropPrescriptionDialog to pass the farmer profile:

```tsx
// In QuickActions.tsx
<CropPrescriptionDialog 
  open={isPrescriptionDialogOpen} 
  onOpenChange={setIsPrescriptionDialogOpen} 
  farmerProfile={farmerProfile}
/>

// In FarmerDashboard.tsx
<QuickActions
  onAddCrop={() => setIsAddCropDialogOpen(true)}
  onUpdateCrop={() => setIsUpdateCropDialogOpen(true)}
  farmerProfile={farmerProfile}
/>
```

### 4. Backend API Setup

Ensure the FastAPI server is running and accessible from the frontend. You may need to configure CORS settings in the FastAPI application:

```python
# In fert_soil_transformer.py, the CORS middleware is already configured:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. Environment Configuration

Make sure the frontend can reach the backend API. You might need to configure proxy settings in your Vite configuration:

```javascript
// In vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // FastAPI server address
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // ... other configuration
});
```

## Usage Flow

1. User opens the Crop Prescription dialog
2. If farmer profile is provided and contains a farm address, the system automatically fetches soil data
3. If soil data is found, it populates the input fields and generates recommendations
4. If no soil data is found, default values are used
5. User can manually adjust soil data if needed
6. Component calls the backend API with soil data
7. Backend returns crop recommendations with confidence scores
8. Recommendations are displayed in the UI with detailed information

## Example API Call

```javascript
// Fetch soil data by barangay
const response = await fetch('/api/soil-data/San Roque');
const data = await response.json();
// data = { soil_data: { pH: 6.0, Nitrogen: 'L', Phosphorus: 'H', Potassium: 'L' } }

// Fetch crop recommendations
const response = await fetch('/api/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pH: 6.0,
    Nitrogen: 'L',
    Phosphorus: 'H',
    Potassium: 'L'
  })
});
const data = await response.json();
// data = { recommended_crops: [{ crop: 'Rice', confidence: 0.85 }, ...] }
```

## Performance Considerations

- The model is loaded once when the FastAPI server starts
- Predictions are fast (typically < 100ms)
- Results are cached in the frontend state
- Loading indicators provide user feedback during API calls
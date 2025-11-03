import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sprout, 
  Thermometer, 
  Droplets, 
  Sun, 
  TrendingUp, 
  Leaf,
  Calendar,
  MapPin
} from "lucide-react";

interface CropPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Placeholder data for crop prescriptions
const placeholderPrescriptions = [
  {
    id: "1",
    crop: "Rice",
    reason: "Current soil moisture levels and weather patterns are optimal for rice cultivation.",
    confidence: 92,
    plantingSeason: "Wet Season (June - October)",
    expectedYield: "4-5 tons/hectare",
    marketTrend: "Stable prices with increasing demand",
    soilType: "Clayey loam",
    weatherCondition: "High rainfall expected",
    recommendations: [
      "Plant during the upcoming wet season for optimal growth",
      "Use nitrogen-rich fertilizer for better yield",
      "Ensure proper water management and drainage"
    ],
    avoid: [
      "Avoid planting during dry season without irrigation",
      "Do not over-fertilize with nitrogen late in season"
    ]
  },
  {
    id: "2",
    crop: "Corn",
    reason: "Moderate temperatures and adequate rainfall support healthy corn growth.",
    confidence: 85,
    plantingSeason: "Dry Season (November - April)",
    expectedYield: "2-3 tons/hectare",
    marketTrend: "Good market prices expected next quarter",
    soilType: "Sandy loam",
    weatherCondition: "Moderate temperatures",
    recommendations: [
      "Plant in well-drained soil with good sunlight exposure",
      "Apply balanced fertilizer (NPK) at recommended rates",
      "Monitor for corn borer pests during growing season"
    ],
    avoid: [
      "Avoid waterlogged areas that can cause root rot",
      "Do not plant too close to previous corn crop (rotation needed)"
    ]
  },
  {
    id: "3",
    crop: "Vegetable Legumes",
    reason: "Current nitrogen levels in soil support legume growth, and market demand is high.",
    confidence: 78,
    plantingSeason: "Year-round with proper irrigation",
    expectedYield: "1-2 tons/hectare",
    marketTrend: "High demand with premium prices",
    soilType: "Well-drained loam",
    weatherCondition: "Stable temperatures",
    recommendations: [
      "Plant in rotation with other crops to improve soil fertility",
      "Harvest regularly to encourage continuous production",
      "Use organic mulch to retain soil moisture"
    ],
    avoid: [
      "Avoid planting during extreme heat without shade",
      "Do not overwater as this can cause root diseases"
    ]
  }
];

const CropPrescriptionDialog = ({ open, onOpenChange }: CropPrescriptionDialogProps) => {
  const [selectedCrop, setSelectedCrop] = useState<typeof placeholderPrescriptions[0] | null>(null);

  const handleCropSelect = (crop: typeof placeholderPrescriptions[0]) => {
    setSelectedCrop(crop);
  };

  const handleResetSelection = () => {
    setSelectedCrop(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            Crop Prescription
          </DialogTitle>
          <DialogDescription>
            AI-powered crop recommendations based on current weather, soil conditions, and market trends
          </DialogDescription>
        </DialogHeader>

        {!selectedCrop ? (
          <div className="space-y-6">
            {/* Environmental Factors */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Thermometer className="h-5 w-5 text-primary" />
                  Current Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="h-4 w-4 text-accent" />
                    <span className="font-medium">Temperature</span>
                  </div>
                  <p className="text-2xl font-bold">28°C</p>
                  <p className="text-sm text-muted-foreground">Optimal for most crops</p>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-accent" />
                    <span className="font-medium">Soil Moisture</span>
                  </div>
                  <p className="text-2xl font-bold">65%</p>
                  <p className="text-sm text-muted-foreground">Adequate for planting</p>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-accent" />
                    <span className="font-medium">Weather Forecast</span>
                  </div>
                  <p className="text-2xl font-bold">Sunny</p>
                  <p className="text-sm text-muted-foreground">7-day forecast favorable</p>
                </div>
              </CardContent>
            </Card>

            {/* Prescribed Crops */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recommended Crops</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {placeholderPrescriptions.map((prescription) => (
                  <Card 
                    key={prescription.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer border-primary/20"
                    onClick={() => handleCropSelect(prescription)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{prescription.crop}</span>
                        <Badge variant="secondary">{prescription.confidence}%</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{prescription.reason}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        <span>{prescription.plantingSeason}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{prescription.marketTrend}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm">
                <strong>Note:</strong> These recommendations are based on simulated data. 
                In the future, this feature will use real-time weather data, soil analysis, 
                and market trends to provide personalized crop prescriptions.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back Button */}
            <Button variant="outline" onClick={handleResetSelection} className="w-fit">
              ← Back to all crops
            </Button>

            {/* Selected Crop Details */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-6 w-6 text-primary" />
                    {selectedCrop.crop} Prescription
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Confidence: {selectedCrop.confidence}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-accent/10 rounded-lg border">
                  <p className="text-lg">{selectedCrop.reason}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Planting Season
                    </h4>
                    <p>{selectedCrop.plantingSeason}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Market Trend
                    </h4>
                    <p>{selectedCrop.marketTrend}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Soil Type
                    </h4>
                    <p>{selectedCrop.soilType}</p>
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Weather Condition
                    </h4>
                    <p>{selectedCrop.weatherCondition}</p>
                  </div>
                </div>

                <Separator />

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-success" />
                    Planting Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {selectedCrop.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 w-2 h-2 rounded-full bg-success flex-shrink-0"></span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Things to Avoid */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="text-destructive">⚠️</span>
                    Things to Avoid
                  </h4>
                  <ul className="space-y-2">
                    {selectedCrop.avoid.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 w-2 h-2 rounded-full bg-destructive flex-shrink-0"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1">
                Save Prescription
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleResetSelection}>
                Explore Other Crops
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CropPrescriptionDialog;
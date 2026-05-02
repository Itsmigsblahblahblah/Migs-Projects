import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Calendar, CloudRain, Sprout, ChevronDown, ChevronUp, X } from "lucide-react";
import { getSeasonalAdvisory, SeasonalAdvisory, SeasonalCategory, SeasonalCrop } from "@/services/seasonalAdvisoryService";
import { useToast } from "@/hooks/use-toast";

const SeasonalCropAdvisory = () => {
  const { toast } = useToast();
  const [advisory, setAdvisory] = useState<SeasonalAdvisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCrop, setSelectedCrop] = useState<{ crop: SeasonalCrop; category: string } | null>(null);

  // Load seasonal advisory
  useEffect(() => {
    loadAdvisory();
  }, []);

  const loadAdvisory = async () => {
    try {
      setLoading(true);
      const data = await getSeasonalAdvisory();
      setAdvisory(data);
    } catch (error) {
      console.error('Error loading seasonal advisory:', error);
      toast({
        title: "Warning",
        description: "Unable to load seasonal advisory. Using fallback data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const getSeasonColor = (season: string) => {
    if (season === "Wet Season") {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Leafy Vegetables": "bg-green-100 text-green-800",
      "Lowland Vegetables": "bg-emerald-100 text-emerald-800",
      "Upland Vegetables": "bg-teal-100 text-teal-800",
      "Root Crops": "bg-orange-100 text-orange-800",
      "Grains": "bg-yellow-100 text-yellow-800",
      "Herbs": "bg-purple-100 text-purple-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded animate-pulse w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!advisory) {
    return (
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Seasonal Crop Advisory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700">
            Unable to load seasonal advisory. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Seasonal Crop Advisory
            </CardTitle>
            <Badge className={`${getSeasonColor(advisory.currentSeason)} font-semibold px-3 py-1`}>
              {advisory.currentSeason}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{advisory.seasonTimeFrame.display}</span>
            </div>
            <div className="flex items-center gap-1">
              <CloudRain className="h-4 w-4" />
              <span>{advisory.averageRainfallMM.toFixed(1)} mm avg</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {advisory.categories.map((category) => (
            <div key={category.name} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category.name)}
                className="w-full p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Badge className={`${getCategoryColor(category.name)} text-xs`}>
                    {category.crops.length}
                  </Badge>
                  <span className="font-semibold text-sm">{category.name}</span>
                </div>
                {expandedCategories.has(category.name) ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </Button>
              
              {expandedCategories.has(category.name) && (
                <div className="px-3 pb-3 flex flex-wrap gap-2">
                  {category.crops.map((crop) => (
                    <button
                      key={crop.name}
                      onClick={() => setSelectedCrop({ crop, category: category.name })}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200 transition-colors cursor-pointer"
                    >
                      {crop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Crop Details Modal */}
      <Dialog open={!!selectedCrop} onOpenChange={() => setSelectedCrop(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                {selectedCrop?.crop.name}
              </DialogTitle>
              <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </DialogHeader>
          
          {selectedCrop && (
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Badge className={getCategoryColor(selectedCrop.category)}>
                  {selectedCrop.category}
                </Badge>
                <Badge className={getSeasonColor(advisory!.currentSeason)}>
                  {advisory!.currentSeason}
                </Badge>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Category Classification</h4>
                  <p className="text-sm text-gray-600">{selectedCrop.crop.category_reason}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Season Suitability</h4>
                  <p className="text-sm text-gray-600">{selectedCrop.crop.explanation}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-1">Planting Tip</h4>
                  <p className="text-sm text-gray-600">{selectedCrop.crop.planting_tip}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SeasonalCropAdvisory;

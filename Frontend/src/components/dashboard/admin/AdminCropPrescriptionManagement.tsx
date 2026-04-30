import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getDb } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Leaf,
  FlaskConical,
  TrendingUp,
  DollarSign,
  Sprout,
  AlertTriangle,
} from "lucide-react";
import { HARDCODED_CROPS, formatCropName } from "@/utils/cropUtils";

interface AdminRecommendation {
  id: string;
  cropName: string;
  soilAnalysis: {
    pH: number;
    nitrogen: "Low" | "Medium" | "High";
    phosphorus: "Low" | "Medium" | "High";
    potassium: "Low" | "Medium" | "High";
  };
  plantingSeason: string;
  marketTrend: string;
  weatherCondition: string;
  marketDemandForecast: {
    seasonalAvgPrice: number;
    predictedPrice: number;
    priceChange: number;
    priceChangePercent: number;
    demandLevel: "Low" | "Moderate" | "High";
  };
  plantingRecommendations: string[];
  thingsToAvoid: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

const AdminCropPrescriptionManagement = () => {
  const [recommendations, setRecommendations] = useState<AdminRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<AdminRecommendation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecommendation, setDeletingRecommendation] = useState<AdminRecommendation | null>(null);
  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const cropDropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    cropName: "",
    pH: 6.5,
    nitrogen: "Medium" as "Low" | "Medium" | "High",
    phosphorus: "Medium" as "Low" | "Medium" | "High",
    potassium: "Medium" as "Low" | "Medium" | "High",
    plantingSeason: "",
    marketTrend: "",
    weatherCondition: "",
    seasonalAvgPrice: 0,
    predictedPrice: 0,
    demandLevel: "Moderate" as "Low" | "Moderate" | "High",
    plantingRecommendations: "",
    thingsToAvoid: "",
    isActive: true,
  });

  // Filter crops based on search term
  const filteredCrops = HARDCODED_CROPS.filter(crop =>
    crop.toLowerCase().includes(cropSearchTerm.toLowerCase())
  );

  // Handle crop selection
  const handleCropSelect = (value: string) => {
    setFormData({ ...formData, cropName: value });
    setCropSearchTerm(value);
    setShowCropDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cropDropdownRef.current && !cropDropdownRef.current.contains(event.target as Node)) {
        setShowCropDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load recommendations
  const loadRecommendations = async () => {
    try {
      const db = await getDb();
      const recommendationsRef = collection(db, "adminRecommendations");
      const q = query(recommendationsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminRecommendation[];

      setRecommendations(data);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to load recommendations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  // Calculate price change
  const priceChange = formData.predictedPrice - formData.seasonalAvgPrice;
  const priceChangePercent =
    formData.seasonalAvgPrice > 0
      ? (priceChange / formData.seasonalAvgPrice) * 100
      : 0;

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const db = await getDb();
      const userId = localStorage.getItem("userId") || "admin";

      const recommendationData = {
        cropName: formData.cropName,
        soilAnalysis: {
          pH: formData.pH,
          nitrogen: formData.nitrogen,
          phosphorus: formData.phosphorus,
          potassium: formData.potassium,
        },
        plantingSeason: formData.plantingSeason,
        marketTrend: formData.marketTrend,
        weatherCondition: formData.weatherCondition,
        marketDemandForecast: {
          seasonalAvgPrice: formData.seasonalAvgPrice,
          predictedPrice: formData.predictedPrice,
          priceChange,
          priceChangePercent,
          demandLevel: formData.demandLevel,
        },
        plantingRecommendations: formData.plantingRecommendations
          .split("\n")
          .filter((r) => r.trim()),
        thingsToAvoid: formData.thingsToAvoid
          .split("\n")
          .filter((r) => r.trim()),
        createdBy: userId,
        isActive: formData.isActive,
        updatedAt: Timestamp.now(),
      };

      if (editingRecommendation) {
        // Update existing
        const docRef = doc(db, "adminRecommendations", editingRecommendation.id);
        await updateDoc(docRef, {
          ...recommendationData,
          createdAt: editingRecommendation.createdAt,
        });
        toast({
          title: "Success",
          description: "Recommendation updated successfully.",
        });
      } else {
        // Create new
        await addDoc(collection(db, "adminRecommendations"), {
          ...recommendationData,
          createdAt: Timestamp.now(),
        });
        toast({
          title: "Success",
          description: "Recommendation created successfully.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadRecommendations();
    } catch (error) {
      console.error("Error saving recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to save recommendation.",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingRecommendation) return;

    try {
      const db = await getDb();
      const docRef = doc(db, "adminRecommendations", deletingRecommendation.id);
      await deleteDoc(docRef);

      toast({
        title: "Success",
        description: "Recommendation deleted successfully.",
      });

      setIsDeleteDialogOpen(false);
      setDeletingRecommendation(null);
      loadRecommendations();
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to delete recommendation.",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      cropName: "",
      pH: 6.5,
      nitrogen: "Medium",
      phosphorus: "Medium",
      potassium: "Medium",
      plantingSeason: "",
      marketTrend: "",
      weatherCondition: "",
      seasonalAvgPrice: 0,
      predictedPrice: 0,
      demandLevel: "Moderate",
      plantingRecommendations: "",
      thingsToAvoid: "",
      isActive: true,
    });
    setCropSearchTerm("");
    setEditingRecommendation(null);
  };

  // Open edit dialog
  const openEditDialog = (rec: AdminRecommendation) => {
    setEditingRecommendation(rec);
    setFormData({
      cropName: rec.cropName,
      pH: rec.soilAnalysis.pH,
      nitrogen: rec.soilAnalysis.nitrogen,
      phosphorus: rec.soilAnalysis.phosphorus,
      potassium: rec.soilAnalysis.potassium,
      plantingSeason: rec.plantingSeason,
      marketTrend: rec.marketTrend,
      weatherCondition: rec.weatherCondition,
      seasonalAvgPrice: rec.marketDemandForecast.seasonalAvgPrice,
      predictedPrice: rec.marketDemandForecast.predictedPrice,
      demandLevel: rec.marketDemandForecast.demandLevel,
      plantingRecommendations: rec.plantingRecommendations.join("\n"),
      thingsToAvoid: rec.thingsToAvoid.join("\n"),
      isActive: rec.isActive,
    });
    setCropSearchTerm(rec.cropName);
    setIsDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Filter recommendations
  const filteredRecommendations = recommendations.filter((rec) =>
    rec.cropName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by crop name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Recommendation
        </Button>
      </div>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Admin Crop Recommendations ({filteredRecommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recommendations found. Click "Add Recommendation" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crop Name</TableHead>
                  <TableHead>Soil pH</TableHead>
                  <TableHead>NPK</TableHead>
                  <TableHead>Demand Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.cropName}</TableCell>
                    <TableCell>{rec.soilAnalysis.pH}</TableCell>
                    <TableCell>
                      {rec.soilAnalysis.nitrogen[0]}/
                      {rec.soilAnalysis.phosphorus[0]}/
                      {rec.soilAnalysis.potassium[0]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rec.marketDemandForecast.demandLevel === "High"
                            ? "default"
                            : rec.marketDemandForecast.demandLevel === "Moderate"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {rec.marketDemandForecast.demandLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.isActive ? "default" : "outline"} className={rec.isActive ? "bg-blue-600" : ""}>
                        {rec.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(rec)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingRecommendation(rec);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecommendation ? "Edit" : "Add"} Crop Recommendation
            </DialogTitle>
            <DialogDescription>
              {editingRecommendation
                ? "Update the admin-verified crop recommendation."
                : "Create a new admin-verified crop recommendation."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Crop Name */}
            <div className="space-y-2">
              <Label htmlFor="cropName">Crop Name *</Label>
              <div className="relative" ref={cropDropdownRef}>
                <Input
                  id="cropName"
                  value={cropSearchTerm}
                  onChange={(e) => {
                    setCropSearchTerm(e.target.value);
                    setFormData({ ...formData, cropName: e.target.value });
                    setShowCropDropdown(true);
                  }}
                  onFocus={() => setShowCropDropdown(true)}
                  placeholder="Search and select a crop..."
                />
                {showCropDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCrops.length > 0 ? (
                      <div className="py-1">
                        {filteredCrops.map((crop) => (
                          <div
                            key={crop}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => handleCropSelect(crop)}
                          >
                            {formatCropName(crop)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-gray-500">No crops found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Soil Analysis */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Soil Analysis
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pH">pH Level (0-14)</Label>
                  <Input
                    id="pH"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={formData.pH === 0 ? "" : formData.pH}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pH: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nitrogen</Label>
                  <Select
                    value={formData.nitrogen}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, nitrogen: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phosphorus</Label>
                  <Select
                    value={formData.phosphorus}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, phosphorus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Potassium</Label>
                  <Select
                    value={formData.potassium}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, potassium: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Planting Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plantingSeason">Planting Season</Label>
                <Input
                  id="plantingSeason"
                  value={formData.plantingSeason}
                  onChange={(e) =>
                    setFormData({ ...formData, plantingSeason: e.target.value })
                  }
                  placeholder="e.g., Wet season (June-October)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketTrend">Market Trend</Label>
                <Select
                  value={formData.marketTrend}
                  onValueChange={(value) =>
                    setFormData({ ...formData, marketTrend: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select market trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upward trend">Upward trend</SelectItem>
                    <SelectItem value="Downward trend">Downward trend</SelectItem>
                    <SelectItem value="Stable">Stable</SelectItem>
                    <SelectItem value="Volatile">Volatile</SelectItem>
                    <SelectItem value="Seasonal peak">Seasonal peak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weatherCondition">Weather Condition</Label>
                <Select
                  value={formData.weatherCondition}
                  onValueChange={(value) =>
                    setFormData({ ...formData, weatherCondition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select weather condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warm and dry">Warm and dry</SelectItem>
                    <SelectItem value="Warm and humid">Warm and humid</SelectItem>
                    <SelectItem value="Cool and dry">Cool and dry</SelectItem>
                    <SelectItem value="Cool and humid">Cool and humid</SelectItem>
                    <SelectItem value="Moderate temperature">Moderate temperature</SelectItem>
                    <SelectItem value="Heavy rainfall">Heavy rainfall</SelectItem>
                    <SelectItem value="Drought conditions">Drought conditions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Market Demand Forecast */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Market Demand Forecast
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seasonalAvgPrice" className="whitespace-nowrap">Market Demand (₱)</Label>
                  <Input
                    id="seasonalAvgPrice"
                    type="number"
                    step="0.01"
                    value={formData.seasonalAvgPrice === 0 ? "" : formData.seasonalAvgPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seasonalAvgPrice: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter current market price"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demand Level</Label>
                  <Select
                    value={formData.demandLevel}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, demandLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Planting Recommendations */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sprout className="h-4 w-4" />
                Planting Recommendations (one per line)
              </Label>
              <Textarea
                value={formData.plantingRecommendations}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    plantingRecommendations: e.target.value,
                  })
                }
                placeholder="Ensure adequate water supply&#10;Apply nitrogen fertilizer in split doses&#10;Monitor soil moisture regularly"
                rows={5}
              />
            </div>

            {/* Things to Avoid */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Things to Avoid (one per line)
              </Label>
              <Textarea
                value={formData.thingsToAvoid}
                onChange={(e) =>
                  setFormData({ ...formData, thingsToAvoid: e.target.value })
                }
                placeholder="Plant in waterlogged areas&#10;Over-fertilize without soil testing&#10;Ignore local climate conditions"
                rows={5}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active (visible to farmers)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingRecommendation ? "Update" : "Create"} Recommendation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recommendation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the recommendation for "
              {deletingRecommendation?.cropName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCropPrescriptionManagement;

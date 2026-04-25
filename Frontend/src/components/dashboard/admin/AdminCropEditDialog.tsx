import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AdminCropEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    crop: {
        id: string;
        name: string;
        landArea: number;
        soilType: string;
        puhunan: number;
        adminData?: any;
    } | null;
    onSave: (cropId: string, adminData: any) => Promise<void>;
}

const AdminCropEditDialog = ({ open, onOpenChange, crop, onSave }: AdminCropEditDialogProps) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [marketPrice, setMarketPrice] = useState<string>("");
    const [suggestedCapital, setSuggestedCapital] = useState<string>("");
    
    // Fertilizer recommendations state
    const [nitrogenLevel, setNitrogenLevel] = useState<string>("M");
    const [nitrogenRecommendations, setNitrogenRecommendations] = useState<string>("");
    const [nitrogenDetailedInfo, setNitrogenDetailedInfo] = useState<string>("");
    const [nitrogenAmount, setNitrogenAmount] = useState<string>("");
    
    const [phosphorusLevel, setPhosphorusLevel] = useState<string>("M");
    const [phosphorusRecommendations, setPhosphorusRecommendations] = useState<string>("");
    const [phosphorusDetailedInfo, setPhosphorusDetailedInfo] = useState<string>("");
    const [phosphorusAmount, setPhosphorusAmount] = useState<string>("");
    
    const [potassiumLevel, setPotassiumLevel] = useState<string>("M");
    const [potassiumRecommendations, setPotassiumRecommendations] = useState<string>("");
    const [potassiumDetailedInfo, setPotassiumDetailedInfo] = useState<string>("");
    const [potassiumAmount, setPotassiumAmount] = useState<string>("");

    // Initialize form when crop changes
    useEffect(() => {
        if (crop) {
            if (crop.adminData) {
                // Pre-fill with existing admin data
                setMarketPrice(crop.adminData.marketPrice?.toString() || "");
                setSuggestedCapital(crop.adminData.suggestedCapital?.toString() || "");
                
                if (crop.adminData.fertilizerRecommendations) {
                    const fert = crop.adminData.fertilizerRecommendations;
                    setNitrogenLevel(fert.nitrogen?.level || "M");
                    setNitrogenRecommendations(fert.nitrogen?.recommendations?.join("\n") || "");
                    setNitrogenDetailedInfo(fert.nitrogen?.detailedInfo || "");
                    setNitrogenAmount(fert.nitrogen?.amount || "");
                    
                    setPhosphorusLevel(fert.phosphorus?.level || "M");
                    setPhosphorusRecommendations(fert.phosphorus?.recommendations?.join("\n") || "");
                    setPhosphorusDetailedInfo(fert.phosphorus?.detailedInfo || "");
                    setPhosphorusAmount(fert.phosphorus?.amount || "");
                    
                    setPotassiumLevel(fert.potassium?.level || "M");
                    setPotassiumRecommendations(fert.potassium?.recommendations?.join("\n") || "");
                    setPotassiumDetailedInfo(fert.potassium?.detailedInfo || "");
                    setPotassiumAmount(fert.potassium?.amount || "");
                }
            } else {
                // Reset form
                resetForm();
            }
        }
    }, [crop, open]);

    const resetForm = () => {
        setMarketPrice("");
        setSuggestedCapital("");
        setNitrogenLevel("M");
        setNitrogenRecommendations("");
        setNitrogenDetailedInfo("");
        setNitrogenAmount("");
        setPhosphorusLevel("M");
        setPhosphorusRecommendations("");
        setPhosphorusDetailedInfo("");
        setPhosphorusAmount("");
        setPotassiumLevel("M");
        setPotassiumRecommendations("");
        setPotassiumDetailedInfo("");
        setPotassiumAmount("");
    };

    const handleSave = async () => {
        if (!crop) return;

        // Validation
        if (!marketPrice || parseFloat(marketPrice) <= 0) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid market price greater than 0",
                variant: "destructive",
            });
            return;
        }

        if (!suggestedCapital || parseFloat(suggestedCapital) <= 0) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid suggested capital greater than 0",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);

        try {
            const adminData = {
                marketPrice: parseFloat(marketPrice),
                suggestedCapital: parseFloat(suggestedCapital),
                fertilizerRecommendations: {
                    nitrogen: {
                        level: nitrogenLevel,
                        recommendations: nitrogenRecommendations.split("\n").filter(r => r.trim()),
                        detailedInfo: nitrogenDetailedInfo,
                        amount: nitrogenAmount,
                    },
                    phosphorus: {
                        level: phosphorusLevel,
                        recommendations: phosphorusRecommendations.split("\n").filter(r => r.trim()),
                        detailedInfo: phosphorusDetailedInfo,
                        amount: phosphorusAmount,
                    },
                    potassium: {
                        level: potassiumLevel,
                        recommendations: potassiumRecommendations.split("\n").filter(r => r.trim()),
                        detailedInfo: potassiumDetailedInfo,
                        amount: potassiumAmount,
                    },
                },
            };

            await onSave(crop.id, adminData);
        } catch (error) {
            console.error("Error saving admin data:", error);
            toast({
                title: "Error",
                description: "Failed to save crop data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!crop) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Crop Data - {crop.name}</DialogTitle>
                    <DialogDescription>
                        Enter market price, suggested capital, and fertilizer recommendations for this crop.
                        These values will override automatic calculations.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Market Price */}
                    <div className="space-y-2">
                        <Label htmlFor="marketPrice">Est. Market Price (PHP per kg) *</Label>
                        <Input
                            id="marketPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 50.00"
                            value={marketPrice}
                            onChange={(e) => setMarketPrice(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Current market price per kilogram in Philippine Pesos
                        </p>
                    </div>

                    {/* Suggested Capital */}
                    <div className="space-y-2">
                        <Label htmlFor="suggestedCapital">Suggested Capital (PHP) *</Label>
                        <Input
                            id="suggestedCapital"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 10000.00"
                            value={suggestedCapital}
                            onChange={(e) => setSuggestedCapital(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Recommended investment amount for {crop.landArea} hectare(s) of {crop.name}
                        </p>
                    </div>

                    {/* Fertilizer Recommendations */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Detailed Fertilizer Recommendations</h3>

                        {/* Nitrogen */}
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-medium">Nitrogen (N)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Level</Label>
                                    <Select value={nitrogenLevel} onValueChange={setNitrogenLevel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">Low</SelectItem>
                                            <SelectItem value="M">Medium</SelectItem>
                                            <SelectItem value="H">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount & Application</Label>
                                    <Textarea
                                        placeholder="e.g., Apply 20-30 kg/ha of Urea (46-0-0)..."
                                        value={nitrogenAmount}
                                        onChange={(e) => setNitrogenAmount(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Recommendations (one per line)</Label>
                                <Textarea
                                    placeholder="Apply balanced nitrogen fertilizer&#10;Monitor crop response"
                                    value={nitrogenRecommendations}
                                    onChange={(e) => setNitrogenRecommendations(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Detailed Info</Label>
                                <Textarea
                                    placeholder="General recommendation for nitrogen management..."
                                    value={nitrogenDetailedInfo}
                                    onChange={(e) => setNitrogenDetailedInfo(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Phosphorus */}
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-medium">Phosphorus (P)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Level</Label>
                                    <Select value={phosphorusLevel} onValueChange={setPhosphorusLevel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">Low</SelectItem>
                                            <SelectItem value="M">Medium</SelectItem>
                                            <SelectItem value="H">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount & Application</Label>
                                    <Textarea
                                        placeholder="e.g., Apply 15-25 kg/ha of Single Superphosphate..."
                                        value={phosphorusAmount}
                                        onChange={(e) => setPhosphorusAmount(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Recommendations (one per line)</Label>
                                <Textarea
                                    placeholder="Apply phosphorus at planting time&#10;Place fertilizer below seed level"
                                    value={phosphorusRecommendations}
                                    onChange={(e) => setPhosphorusRecommendations(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Detailed Info</Label>
                                <Textarea
                                    placeholder="General recommendation for phosphorus management..."
                                    value={phosphorusDetailedInfo}
                                    onChange={(e) => setPhosphorusDetailedInfo(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Potassium */}
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-medium">Potassium (K)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Level</Label>
                                    <Select value={potassiumLevel} onValueChange={setPotassiumLevel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">Low</SelectItem>
                                            <SelectItem value="M">Medium</SelectItem>
                                            <SelectItem value="H">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount & Application</Label>
                                    <Textarea
                                        placeholder="e.g., Apply 20-30 kg/ha of Muriate of Potash..."
                                        value={potassiumAmount}
                                        onChange={(e) => setPotassiumAmount(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Recommendations (one per line)</Label>
                                <Textarea
                                    placeholder="Split application recommended&#10;60% at planting, 40% at flowering"
                                    value={potassiumRecommendations}
                                    onChange={(e) => setPotassiumRecommendations(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Detailed Info</Label>
                                <Textarea
                                    placeholder="General recommendation for potassium management..."
                                    value={potassiumDetailedInfo}
                                    onChange={(e) => setPotassiumDetailedInfo(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminCropEditDialog;

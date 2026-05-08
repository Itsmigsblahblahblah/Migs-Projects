import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit2, Sprout, Leaf, Scale, TrendingUp, CheckCircle, Package, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { getCropInsights } from "@/services/cropDataService";

interface AdminCropEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    crop: {
        id: string;
        name: string;
        landArea: number;
        soilType: string;
        puhunan: number;
        plantedDate: any;
        status: string;
        adminData?: any;
        checklist?: any[];
    } | null;
    onSave: (cropId: string, adminData: any) => Promise<void>;
}

const AdminCropEditDialog = ({ open, onOpenChange, crop, onSave }: AdminCropEditDialogProps) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [status, setStatus] = useState<string>("preparation");
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    
    // Section edit mode state
    const [marketPriceEditing, setMarketPriceEditing] = useState(false);
    const [suggestedCapitalEditing, setSuggestedCapitalEditing] = useState(false);
    const [nitrogenEditing, setNitrogenEditing] = useState(false);
    const [phosphorusEditing, setPhosphorusEditing] = useState(false);
    const [potassiumEditing, setPotassiumEditing] = useState(false);
    
    // Initialize form state with AI data when dialog opens
    const initializeFormState = () => {
        // Set status from current crop
        setStatus(crop.status || "preparation");
        
        // Initialize with admin data if exists, otherwise use AI-generated data
        const mp = crop.adminData?.marketPrice || insights?.profit?.averageMarketPrice || 0;
        const sc = crop.adminData?.suggestedCapital || insights?.profit?.suggestedCapital || 0;
        
        // Format to 2 decimal places for input fields
        setMarketPrice(mp.toFixed(2));
        setSuggestedCapital(sc.toFixed(2));
        
        // Fertilizer recommendations
        if (crop.adminData?.fertilizerRecommendations) {
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
        } else if (insights?.fertilizer?.detailedRecommendations) {
            // Use AI-generated recommendations
            const aiFert = insights.fertilizer.detailedRecommendations;
            setNitrogenLevel(aiFert.nitrogen?.level || "M");
            setNitrogenRecommendations(aiFert.nitrogen?.recommendations?.join("\n") || "");
            setNitrogenDetailedInfo(aiFert.nitrogen?.detailedInfo || "");
            setNitrogenAmount(aiFert.nitrogen?.amount || "");
            
            setPhosphorusLevel(aiFert.phosphorus?.level || "M");
            setPhosphorusRecommendations(aiFert.phosphorus?.recommendations?.join("\n") || "");
            setPhosphorusDetailedInfo(aiFert.phosphorus?.detailedInfo || "");
            setPhosphorusAmount(aiFert.phosphorus?.amount || "");
            
            setPotassiumLevel(aiFert.potassium?.level || "M");
            setPotassiumRecommendations(aiFert.potassium?.recommendations?.join("\n") || "");
            setPotassiumDetailedInfo(aiFert.potassium?.detailedInfo || "");
            setPotassiumAmount(aiFert.potassium?.amount || "");
        }
    };
    
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

    // Initialize form when crop changes and fetch insights
    useEffect(() => {
        const fetchInsights = async () => {
            if (!crop || !open) return;
            
            try {
                setLoading(true);
                const cropInsights = await getCropInsights(
                    crop.name,
                    crop.soilType,
                    crop.landArea,
                    crop.puhunan
                );
                setInsights(cropInsights);
                
                // Initialize form state immediately after getting insights
                initializeFormStateWithInsights(cropInsights);
            } catch (error) {
                console.error("Error fetching crop insights:", error);
            } finally {
                setLoading(false);
            }
        };
        
        if (crop) {
            // Reset all edit modes
            setMarketPriceEditing(false);
            setSuggestedCapitalEditing(false);
            setNitrogenEditing(false);
            setPhosphorusEditing(false);
            setPotassiumEditing(false);
            setIsExpanded(false);
            
            fetchInsights();
        }
    }, [crop, open]);

    // Separate function to initialize form with specific insights data
    const initializeFormStateWithInsights = (cropInsights: any) => {
        console.log('[AdminCropEditDialog] Initializing form with insights:', cropInsights);
        console.log('[AdminCropEditDialog] Crop admin data:', crop.adminData);
        
        // Set status from current crop
        setStatus(crop.status || "preparation");
        
        // Initialize with admin data if exists, otherwise use AI-generated data
        const mp = crop.adminData?.marketPrice || cropInsights?.profit?.averageMarketPrice || 0;
        const sc = crop.adminData?.suggestedCapital || cropInsights?.profit?.suggestedCapital || 0;
        
        console.log('[AdminCropEditDialog] Market Price:', mp, 'Suggested Capital:', sc);
        
        // Format to 2 decimal places for input fields
        setMarketPrice(mp.toFixed(2));
        setSuggestedCapital(sc.toFixed(2));
        
        // Fertilizer recommendations
        if (crop.adminData?.fertilizerRecommendations) {
            console.log('[AdminCropEditDialog] Using admin fertilizer recommendations');
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
        } else if (cropInsights?.fertilizer?.detailedRecommendations) {
            console.log('[AdminCropEditDialog] Using AI fertilizer recommendations');
            // Use AI-generated recommendations
            const aiFert = cropInsights.fertilizer.detailedRecommendations;
            setNitrogenLevel(aiFert.nitrogen?.level || "M");
            setNitrogenRecommendations(aiFert.nitrogen?.recommendations?.join("\n") || "");
            setNitrogenDetailedInfo(aiFert.nitrogen?.detailedInfo || "");
            setNitrogenAmount(aiFert.nitrogen?.amount || "");
            
            setPhosphorusLevel(aiFert.phosphorus?.level || "M");
            setPhosphorusRecommendations(aiFert.phosphorus?.recommendations?.join("\n") || "");
            setPhosphorusDetailedInfo(aiFert.phosphorus?.detailedInfo || "");
            setPhosphorusAmount(aiFert.phosphorus?.amount || "");
            
            setPotassiumLevel(aiFert.potassium?.level || "M");
            setPotassiumRecommendations(aiFert.potassium?.recommendations?.join("\n") || "");
            setPotassiumDetailedInfo(aiFert.potassium?.detailedInfo || "");
            setPotassiumAmount(aiFert.potassium?.amount || "");
        } else {
            console.warn('[AdminCropEditDialog] No fertilizer recommendations available');
        }
    };

    const resetForm = () => {
        setStatus("preparation");
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
                status: status,
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
            
            // Reset all edit modes after successful save
            setMarketPriceEditing(false);
            setSuggestedCapitalEditing(false);
            setNitrogenEditing(false);
            setPhosphorusEditing(false);
            setPotassiumEditing(false);
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

    const handleOpenChange = (open: boolean) => {
        if (!open && (marketPriceEditing || suggestedCapitalEditing || nitrogenEditing || phosphorusEditing || potassiumEditing)) {
            // Show custom confirmation dialog instead of browser alert
            setShowDiscardConfirm(true);
        } else {
            onOpenChange(open);
        }
    };

    const handleDiscardChanges = () => {
        // Reset all edit modes
        setMarketPriceEditing(false);
        setSuggestedCapitalEditing(false);
        setNitrogenEditing(false);
        setPhosphorusEditing(false);
        setPotassiumEditing(false);
        setShowDiscardConfirm(false);
        onOpenChange(false);
    };

    const handleContinueEditing = () => {
        setShowDiscardConfirm(false);
    };

    if (!crop) return null;

    const hasAdminData = crop.adminData && crop.adminData.marketPrice && crop.adminData.marketPrice > 0;
    const userInvestment = Number(crop.puhunan) || 0;

    // Format timestamp helper
    const formatTimestamp = (timestamp: any) => {
        try {
            if (typeof timestamp === 'string') {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            }
            if (timestamp?.toDate) {
                return timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            if (timestamp instanceof Date) {
                return timestamp.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            return 'Unknown date';
        } catch {
            return 'Unknown date';
        }
    };

    // Calculate crop status based on checklist completion
    const calculateCropStatus = () => {
        const checklist = crop.checklist;
        if (!checklist || checklist.length === 0) {
            return crop.status || 'preparation';
        }

        try {
            const categories = ['Preparation', 'Planting', 'Maintenance', 'Harvesting', 'Post-Harvest'];
            const categoryProgress = categories.map(category => {
                const itemsInCategory = checklist.filter((item: any) => item.category === category);
                const completedItems = itemsInCategory.filter((item: any) => item.completed);
                return {
                    category,
                    total: itemsInCategory.length,
                    completed: completedItems.length,
                    percentage: itemsInCategory.length > 0 ? (completedItems.length / itemsInCategory.length) * 100 : 0
                };
            });

            // Determine status based on completion
            const postHarvest = categoryProgress.find(c => c.category === 'Post-Harvest');
            if (postHarvest && postHarvest.percentage === 100) {
                return 'post-harvest';
            }

            const harvesting = categoryProgress.find(c => c.category === 'Harvesting');
            if (harvesting && harvesting.percentage === 100) {
                return 'harvesting';
            }

            const maintenance = categoryProgress.find(c => c.category === 'Maintenance');
            if (maintenance && maintenance.percentage === 100) {
                return 'harvesting';
            }

            const planting = categoryProgress.find(c => c.category === 'Planting');
            if (planting && planting.percentage === 100) {
                return 'maintenance';
            }

            const preparation = categoryProgress.find(c => c.category === 'Preparation');
            if (preparation && preparation.percentage === 100) {
                return 'planting';
            }

            return 'preparation';
        } catch {
            return crop.status || 'preparation';
        }
    };

    // Calculate harvest date helper - MUST be before other functions that use it
    const calculateHarvestDate = (plantedDate: any, cropName: string) => {
        try {
            let planted: Date;
            if (typeof plantedDate === 'string') {
                planted = new Date(plantedDate);
            } else if (plantedDate?.toDate) {
                planted = plantedDate.toDate();
            } else if (plantedDate instanceof Date) {
                planted = plantedDate;
            } else {
                return 'Unknown date';
            }

            if (isNaN(planted.getTime())) {
                return 'Unknown date';
            }

            let daysToHarvest = 90;
            const name = cropName.toLowerCase();
            if (name.includes("rice")) daysToHarvest = 120;
            else if (name.includes("corn")) daysToHarvest = 100;
            else if (name.includes("tomato")) daysToHarvest = 70;
            else if (name.includes("eggplant") || name.includes("talong")) daysToHarvest = 75;
            else if (name.includes("pechay")) daysToHarvest = 45;
            else if (name.includes("mustard")) daysToHarvest = 40;
            else if (name.includes("kangkong")) daysToHarvest = 30;
            else if (name.includes("squash")) daysToHarvest = 60;
            else if (name.includes("melon")) daysToHarvest = 80;
            else if (name.includes("watermelon")) daysToHarvest = 90;
            else if (name.includes("cucumber")) daysToHarvest = 60;
            else if (name.includes("okra")) daysToHarvest = 60;
            else if (name.includes("sitaw")) daysToHarvest = 60;
            else if (name.includes("patani")) daysToHarvest = 60;
            else if (name.includes("ampalaya")) daysToHarvest = 70;
            else if (name.includes("labanos")) daysToHarvest = 30;

            const harvestDate = new Date(planted);
            harvestDate.setDate(harvestDate.getDate() + daysToHarvest);

            return harvestDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Unknown date';
        }
    };

    // Calculate harvest date based on checklist completion
    const calculateHarvestDateWithChecklist = () => {
        const checklist = crop.checklist;
        
        // Check if all Maintenance items are completed
        const maintenanceItems = checklist?.filter((item: any) => item.category === 'Maintenance') || [];
        const allMaintenanceCompleted = maintenanceItems.length > 0 && maintenanceItems.every((item: any) => item.completed);
        
        // If all maintenance is completed, get the date of the last completed item
        if (allMaintenanceCompleted) {
            const completedWithDates = maintenanceItems.filter((item: any) => 
                item.completed && item.completedAt
            );
            
            if (completedWithDates.length > 0) {
                const latestDate = completedWithDates.reduce((latest: Date, item: any) => {
                    let itemDate: Date;
                    if (typeof item.completedAt === 'string') {
                        itemDate = new Date(item.completedAt);
                    } else if (item.completedAt?.toDate) {
                        itemDate = item.completedAt.toDate();
                    } else if (item.completedAt instanceof Date) {
                        itemDate = item.completedAt;
                    } else {
                        itemDate = new Date(0);
                    }
                    return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                
                return {
                    date: latestDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }),
                    label: 'Actual Harvest Date'
                };
            }
        }
        
        // Otherwise, return the calculated estimated date
        return {
            date: calculateHarvestDate(crop.plantedDate, crop.name),
            label: 'Est. Harvest Date'
        };
    };
    
    const currentStatus = calculateCropStatus();
    const harvestDateInfo = calculateHarvestDateWithChecklist();

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-green-600" />
                        Edit Crop - {crop.name}
                    </DialogTitle>
                    <DialogDescription>
                        View crop details and click edit icons to modify specific sections. AI-generated data is loaded for context.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Section 1: Crop Information (Read-only) */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sprout className="h-5 w-5 text-green-600" />
                            Crop Information
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                            <div>
                                <p className="text-sm text-muted-foreground">Crop Name</p>
                                <p className="font-semibold">{crop.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge variant={currentStatus === 'post-harvest' ? 'default' : 'secondary'}>
                                    {currentStatus}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Land Area</p>
                                <p className="font-semibold">{crop.landArea} hectares</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Soil Type</p>
                                <p className="font-semibold">{crop.soilType}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Investment (Puhunan)</p>
                                <p className="font-semibold">₱{Number(crop.puhunan).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Planted Date</p>
                                <p className="font-semibold">{formatTimestamp(crop.plantedDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{harvestDateInfo.label}</p>
                                <p className="font-semibold">{harvestDateInfo.date}</p>
                            </div>
                        </div>

                        {/* System-Generated Market Data with Edit */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    System-Generated Market Data
                                    {hasAdminData && (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Admin Verified
                                        </Badge>
                                    )}
                                </h4>
                                {!marketPriceEditing || !suggestedCapitalEditing ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setMarketPriceEditing(true);
                                            setSuggestedCapitalEditing(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        <Edit2 className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-blue-600 mb-1">Est. Market Price</p>
                                    {marketPriceEditing ? (
                                        <Input
                                            type="text"
                                            value={marketPrice}
                                            onChange={(e) => {
                                                // Allow free-form numeric input without auto-formatting
                                                const raw = e.target.value.replace(/[^\d.]/g, '');
                                                // Prevent multiple decimal points
                                                const parts = raw.split('.');
                                                if (parts.length <= 2) {
                                                    setMarketPrice(raw);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Clean up trailing decimal point if empty
                                                if (e.target.value.endsWith('.')) {
                                                    setMarketPrice(e.target.value.slice(0, -1));
                                                }
                                            }}
                                            className="mt-1"
                                            placeholder="Enter market price"
                                        />
                                    ) : (
                                        <p className="font-semibold text-blue-900">
                                            {crop.adminData?.marketPrice 
                                                ? `₱${crop.adminData.marketPrice.toFixed(2)} /kg` 
                                                : insights?.profit?.averageMarketPrice 
                                                ? `₱${insights.profit.averageMarketPrice.toFixed(2)} /kg` 
                                                : 'Calculating...'}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 mb-1">Suggested Capital</p>
                                    {suggestedCapitalEditing ? (
                                        <Input
                                            type="text"
                                            value={suggestedCapital}
                                            onChange={(e) => {
                                                // Allow free-form numeric input without auto-formatting
                                                const raw = e.target.value.replace(/[^\d.]/g, '');
                                                // Prevent multiple decimal points
                                                const parts = raw.split('.');
                                                if (parts.length <= 2) {
                                                    setSuggestedCapital(raw);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Clean up trailing decimal point if empty
                                                if (e.target.value.endsWith('.')) {
                                                    setSuggestedCapital(e.target.value.slice(0, -1));
                                                }
                                            }}
                                            className="mt-1"
                                            placeholder="Enter suggested capital"
                                        />
                                    ) : (
                                        <p className="font-semibold text-blue-900">
                                            {crop.adminData?.suggestedCapital 
                                                ? `₱${crop.adminData.suggestedCapital.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                                                : insights?.profit?.suggestedCapital 
                                                ? `₱${insights.profit.suggestedCapital.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                                                : 'Calculating...'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Section 2: Fertilizer Recommendations */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Scale className="h-5 w-5 text-blue-600" />
                                Fertilizer Recommendations
                                {hasAdminData && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Admin Set
                                    </Badge>
                                )}
                            </h3>
                            {!nitrogenEditing || !phosphorusEditing || !potassiumEditing ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setNitrogenEditing(true);
                                        setPhosphorusEditing(true);
                                        setPotassiumEditing(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    <Edit2 className="h-4 w-4 mr-1" />
                                    Edit All
                                </Button>
                            ) : null}
                        </div>

                        {hasAdminData && crop.adminData.fertilizerRecommendations && !nitrogenEditing && !phosphorusEditing && !potassiumEditing ? (
                            // Show admin fertilizer recommendations (view mode)
                            <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-lg border-2 border-gray-200 overflow-hidden">
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full p-4 hover:bg-white/50 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-base text-gray-800">NPK Fertilizer Summary</h4>
                                        {isExpanded ? (
                                            <ChevronUp className="h-5 w-5 text-gray-600" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-600" />
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Nitrogen */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-green-700 uppercase">Nitrogen (N)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.nitrogen?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.nitrogen?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.nitrogen.amount}
                                                </p>
                                            )}
                                        </div>

                                        {/* Phosphorus */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-blue-700 uppercase">Phosphorus (P)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.phosphorus?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.phosphorus?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.phosphorus.amount}
                                                </p>
                                            )}
                                        </div>

                                        {/* Potassium */}
                                        <div className="bg-white rounded-lg p-3 border-2 border-purple-300">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-purple-700 uppercase">Potassium (K)</span>
                                                <Badge variant="outline" className="text-xs">
                                                    Level: {crop.adminData.fertilizerRecommendations.potassium?.level || 'M'}
                                                </Badge>
                                            </div>
                                            {crop.adminData.fertilizerRecommendations.potassium?.amount && (
                                                <p className="text-xs text-gray-700 line-clamp-2">
                                                    {crop.adminData.fertilizerRecommendations.potassium.amount}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-4 space-y-4 border-t-2 border-gray-200 bg-white">
                                        {/* Nitrogen Details */}
                                        <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                                            <div className="bg-green-600 text-white px-3 py-2 flex justify-between items-center">
                                                <h5 className="font-bold text-sm">Nitrogen (N) - Full Details</h5>
                                                <Button variant="ghost" size="sm" onClick={() => setNitrogenEditing(true)} className="text-white hover:bg-green-700 h-6 w-6 p-0">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.amount && (
                                                    <div className="bg-green-50 rounded-md p-2 border border-green-200">
                                                        <p className="text-xs font-semibold text-green-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-green-900">{crop.adminData.fertilizerRecommendations.nitrogen.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-green-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.nitrogen.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-green-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.nitrogen?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.nitrogen.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Phosphorus Details */}
                                        <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                                            <div className="bg-blue-600 text-white px-3 py-2 flex justify-between items-center">
                                                <h5 className="font-bold text-sm">Phosphorus (P) - Full Details</h5>
                                                <Button variant="ghost" size="sm" onClick={() => setPhosphorusEditing(true)} className="text-white hover:bg-blue-700 h-6 w-6 p-0">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.amount && (
                                                    <div className="bg-blue-50 rounded-md p-2 border border-blue-200">
                                                        <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-blue-900">{crop.adminData.fertilizerRecommendations.phosphorus.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.phosphorus.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-blue-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.phosphorus?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.phosphorus.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Potassium Details */}
                                        <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                                            <div className="bg-purple-600 text-white px-3 py-2 flex justify-between items-center">
                                                <h5 className="font-bold text-sm">Potassium (K) - Full Details</h5>
                                                <Button variant="ghost" size="sm" onClick={() => setPotassiumEditing(true)} className="text-white hover:bg-purple-700 h-6 w-6 p-0">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {crop.adminData.fertilizerRecommendations.potassium?.amount && (
                                                    <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
                                                        <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">Amount & Application</p>
                                                        <p className="text-xs text-purple-900">{crop.adminData.fertilizerRecommendations.potassium.amount}</p>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.potassium?.recommendations?.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">Recommendations</p>
                                                        <ul className="space-y-1">
                                                            {crop.adminData.fertilizerRecommendations.potassium.recommendations.map((rec: string, index: number) => (
                                                                <li key={index} className="flex items-start gap-1 text-xs">
                                                                    <span className="text-purple-600 font-bold">•</span>
                                                                    <span className="text-gray-700">{rec}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {crop.adminData.fertilizerRecommendations.potassium?.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{crop.adminData.fertilizerRecommendations.potassium.detailedInfo}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-2 text-sm text-muted-foreground">Loading AI recommendations...</span>
                            </div>
                        ) : (
                            // Show system-generated AI fertilizer recommendations
                            insights?.fertilizer?.detailedRecommendations ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-700 mb-2">
                                            <strong>System-Generated Recommendations</strong> - These AI-based recommendations will be shown to the farmer until you edit them.
                                        </p>
                                    </div>
                                    {/* Edit buttons for each nutrient */}
                                    {/* Nitrogen */}
                                    <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                                        <div className="bg-green-600 text-white px-3 py-2 flex justify-between items-center">
                                            <h5 className="font-bold text-sm">Nitrogen (N) - Level: {insights.fertilizer.detailedRecommendations.nitrogen.level}</h5>
                                            <Button variant="ghost" size="sm" onClick={() => setNitrogenEditing(true)} className="text-white hover:bg-green-700 h-6 w-6 p-0">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {nitrogenEditing ? (
                                            <div className="p-3 space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Level</Label>
                                                        <Select value={nitrogenLevel} onValueChange={setNitrogenLevel}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="L">Low</SelectItem>
                                                                <SelectItem value="M">Medium</SelectItem>
                                                                <SelectItem value="H">High</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Amount & Application</Label>
                                                        <Textarea value={nitrogenAmount} onChange={(e) => setNitrogenAmount(e.target.value)} rows={3} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Recommendations (one per line)</Label>
                                                    <Textarea value={nitrogenRecommendations} onChange={(e) => setNitrogenRecommendations(e.target.value)} rows={3} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Detailed Info</Label>
                                                    <Textarea value={nitrogenDetailedInfo} onChange={(e) => setNitrogenDetailedInfo(e.target.value)} rows={2} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 space-y-2">
                                                {insights.fertilizer.detailedRecommendations.nitrogen.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.nitrogen.detailedInfo}</p>
                                                    </div>
                                                )}
                                                {insights.fertilizer.detailedRecommendations.nitrogen.amount && (
                                                    <div className="bg-green-50 rounded-md p-2 border border-green-200">
                                                        <p className="text-xs font-semibold text-green-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                        <p className="text-xs text-green-900">{insights.fertilizer.detailedRecommendations.nitrogen.amount}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phosphorus */}
                                    <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                                        <div className="bg-blue-600 text-white px-3 py-2 flex justify-between items-center">
                                            <h5 className="font-bold text-sm">Phosphorus (P) - Level: {insights.fertilizer.detailedRecommendations.phosphorus.level}</h5>
                                            <Button variant="ghost" size="sm" onClick={() => setPhosphorusEditing(true)} className="text-white hover:bg-blue-700 h-6 w-6 p-0">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {phosphorusEditing ? (
                                            <div className="p-3 space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Level</Label>
                                                        <Select value={phosphorusLevel} onValueChange={setPhosphorusLevel}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="L">Low</SelectItem>
                                                                <SelectItem value="M">Medium</SelectItem>
                                                                <SelectItem value="H">High</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Amount & Application</Label>
                                                        <Textarea value={phosphorusAmount} onChange={(e) => setPhosphorusAmount(e.target.value)} rows={3} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Recommendations (one per line)</Label>
                                                    <Textarea value={phosphorusRecommendations} onChange={(e) => setPhosphorusRecommendations(e.target.value)} rows={3} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Detailed Info</Label>
                                                    <Textarea value={phosphorusDetailedInfo} onChange={(e) => setPhosphorusDetailedInfo(e.target.value)} rows={2} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 space-y-2">
                                                {insights.fertilizer.detailedRecommendations.phosphorus.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.phosphorus.detailedInfo}</p>
                                                    </div>
                                                )}
                                                {insights.fertilizer.detailedRecommendations.phosphorus.amount && (
                                                    <div className="bg-blue-50 rounded-md p-2 border border-blue-200">
                                                        <p className="text-xs font-semibold text-blue-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                        <p className="text-xs text-blue-900">{insights.fertilizer.detailedRecommendations.phosphorus.amount}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Potassium */}
                                    <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                                        <div className="bg-purple-600 text-white px-3 py-2 flex justify-between items-center">
                                            <h5 className="font-bold text-sm">Potassium (K) - Level: {insights.fertilizer.detailedRecommendations.potassium.level}</h5>
                                            <Button variant="ghost" size="sm" onClick={() => setPotassiumEditing(true)} className="text-white hover:bg-purple-700 h-6 w-6 p-0">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {potassiumEditing ? (
                                            <div className="p-3 space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Level</Label>
                                                        <Select value={potassiumLevel} onValueChange={setPotassiumLevel}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="L">Low</SelectItem>
                                                                <SelectItem value="M">Medium</SelectItem>
                                                                <SelectItem value="H">High</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Amount & Application</Label>
                                                        <Textarea value={potassiumAmount} onChange={(e) => setPotassiumAmount(e.target.value)} rows={3} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Recommendations (one per line)</Label>
                                                    <Textarea value={potassiumRecommendations} onChange={(e) => setPotassiumRecommendations(e.target.value)} rows={3} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Detailed Info</Label>
                                                    <Textarea value={potassiumDetailedInfo} onChange={(e) => setPotassiumDetailedInfo(e.target.value)} rows={2} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 space-y-2">
                                                {insights.fertilizer.detailedRecommendations.potassium.detailedInfo && (
                                                    <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                                        <p className="text-xs text-gray-700 leading-relaxed">{insights.fertilizer.detailedRecommendations.potassium.detailedInfo}</p>
                                                    </div>
                                                )}
                                                {insights.fertilizer.detailedRecommendations.potassium.amount && (
                                                    <div className="bg-purple-50 rounded-md p-2 border border-purple-200">
                                                        <p className="text-xs font-semibold text-purple-800 mb-1 uppercase">💡 Recommended Amount</p>
                                                        <p className="text-xs text-purple-900">{insights.fertilizer.detailedRecommendations.potassium.amount}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-muted/50 rounded-lg border">
                                    <p className="text-sm text-muted-foreground text-center">
                                        No fertilizer recommendations available.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <DialogFooter>
                    {(marketPriceEditing || suggestedCapitalEditing || nitrogenEditing || phosphorusEditing || potassiumEditing) && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setMarketPriceEditing(false);
                                    setSuggestedCapitalEditing(false);
                                    setNitrogenEditing(false);
                                    setPhosphorusEditing(false);
                                    setPotassiumEditing(false);
                                }}
                                disabled={isSaving}
                            >
                                Cancel Edits
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
                                    "Save All Changes"
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Custom Confirmation Dialog for Unsaved Changes */}
        <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Unsaved Changes
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                        You have unsaved changes. Are you sure you want to discard them and close the editor?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleContinueEditing} className="min-w-[140px]">
                        Continue Editing
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDiscardChanges}
                        className="min-w-[140px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Discard Changes
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

export default AdminCropEditDialog;

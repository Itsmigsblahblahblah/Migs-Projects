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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { HARDCODED_CROPS } from "@/utils/cropUtils";
import { ChevronDown, AlertCircle } from "lucide-react";

interface EditCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editCrop: {
        name: string;
        soilType: string;
        landArea: string;
        plantedDate: string;
        puhunan: string;
    };
    handleEditCropInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEditSoilTypeChange: (value: string) => void;
    handleEditCropSubmit: () => Promise<boolean>;
}

const EditCropDialog = ({
    open,
    onOpenChange,
    editCrop,
    handleEditCropInputChange,
    handleEditSoilTypeChange,
    handleEditCropSubmit
}: EditCropDialogProps) => {
    const [cropSearchTerm, setCropSearchTerm] = useState(editCrop.name || "");
    const [showCropDropdown, setShowCropDropdown] = useState(false);
    const [isValidCrop, setIsValidCrop] = useState(true);
    const cropDropdownRef = useRef<HTMLDivElement>(null);

    // Filter crops based on search term
    const filteredCrops = HARDCODED_CROPS.filter(crop =>
        crop.toLowerCase().includes(cropSearchTerm.toLowerCase())
    );

    // Sync crop search term with editCrop.name when it changes
    useEffect(() => {
        setCropSearchTerm(editCrop.name || "");
        // Validate if the current crop name exists in the options
        if (editCrop.name) {
            const isValid = HARDCODED_CROPS.some(
                crop => crop.toLowerCase() === editCrop.name.toLowerCase()
            );
            setIsValidCrop(isValid);
        } else {
            setIsValidCrop(true); // Reset when empty
        }
    }, [editCrop.name]);

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

    // Handle crop selection
    const handleCropSelect = (value: string) => {
        setCropSearchTerm(value);
        handleEditCropInputChange({
            target: { name: "name", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowCropDropdown(false);
    };

    // Handle input change for crop name
    const handleCropInputChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCropSearchTerm(value);
        handleEditCropInputChange({
            target: { name: "name", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowCropDropdown(true);
    };

    const handleEditCropSubmitWrapper = async () => {
        // Validate that the crop name matches an option in the dropdown
        if (editCrop.name && !isValidCrop) {
            return; // Don't submit if crop name is invalid
        }
        
        const success = await handleEditCropSubmit();
        if (success) {
            onOpenChange(false);
        }
    };

    const soilTypes = [
        "Clay", "Loam", "Sandy", "Silty", "Peaty", "Chalky", 
        "Sandy Loam", "Clay Loam", "Silty Loam", "Sandy Clay", 
        "Silty Clay", "Organic Soil"
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Crop Details</DialogTitle>
                    <DialogDescription>
                        Update the details of your selected crop.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="editCropName">Crop Name *</Label>
                        <div className="relative" ref={cropDropdownRef}>
                            <Input
                                id="editCropName"
                                name="name"
                                value={cropSearchTerm}
                                onChange={handleCropInputChangeLocal}
                                onFocus={() => setShowCropDropdown(true)}
                                placeholder="Select or type a crop"
                                className={`pr-10 ${!isValidCrop && cropSearchTerm ? 'border-destructive' : ''}`}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCropDropdown(!showCropDropdown)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {showCropDropdown && (
                                <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                                    {filteredCrops.length > 0 ? (
                                        filteredCrops.map((crop) => (
                                            <div
                                                key={crop}
                                                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => handleCropSelect(crop)}
                                            >
                                                {crop}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No crop found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {!isValidCrop && cropSearchTerm && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>No crop found. Please select from the dropdown list.</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="editSoilType">Soil Type *</Label>
                        <Select onValueChange={handleEditSoilTypeChange} value={editCrop.soilType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select soil type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-32">
                                {soilTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="editLandArea">Land Area (hectares) *</Label>
                        <Input
                            id="editLandArea"
                            name="landArea"
                            type="number"
                            value={editCrop.landArea}
                            onChange={handleEditCropInputChange}
                            placeholder="e.g., 2.5"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="editPlantedDate">Date of Planting *</Label>
                        <Input
                            id="editPlantedDate"
                            name="plantedDate"
                            type="date"
                            value={editCrop.plantedDate}
                            readOnly
                            className="cursor-not-allowed bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Planting date cannot be modified once set.
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="editPuhunan">Capital (PHP) *</Label>
                        <Input
                            id="editPuhunan"
                            name="puhunan"
                            type="number"
                            value={editCrop.puhunan}
                            onChange={handleEditCropInputChange}
                            placeholder="e.g., 5000"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleEditCropSubmitWrapper}>
                        Update Crop
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditCropDialog;
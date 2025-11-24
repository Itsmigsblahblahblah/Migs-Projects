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
import { HARDCODED_CROPS, formatCropName } from "@/utils/cropUtils";
import { ChevronDown } from "lucide-react";

interface AddCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newCrop: {
        name: string;
        soilType: string;
        landArea: string;
        plantedDate: string;
        puhunan: string;
    };
    handleCropInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSoilTypeChange: (value: string) => void;
    handleAddCrop: () => Promise<boolean>;
    userRole?: string; // Added user role to determine if user is admin
    lockedCropName?: string; // Added prop for locking crop name
}

const AddCropDialog = ({
    open,
    onOpenChange,
    newCrop,
    handleCropInputChange,
    handleSoilTypeChange,
    handleAddCrop,
    userRole = "farmer", // Default to farmer role
    lockedCropName // Add lockedCropName prop
}: AddCropDialogProps) => {
    const [cropOptions, setCropOptions] = useState<string[]>(HARDCODED_CROPS);
    const [newCropName, setNewCropName] = useState(""); // For admin to add new crops
    const [showAddCropInput, setShowAddCropInput] = useState(false); // Toggle for admin to add new crops
    const [showCropDropdown, setShowCropDropdown] = useState(false); // For showing crop dropdown
    const [cropSearchTerm, setCropSearchTerm] = useState(newCrop.name || ""); // For filtering crops in dropdown
    const cropDropdownRef = useRef<HTMLDivElement>(null);

    // Filter crops based on search term
    const filteredCrops = cropOptions.filter(crop =>
        crop.toLowerCase().includes(cropSearchTerm.toLowerCase())
    );

    // Sync crop search term with newCrop.name when it changes
    useEffect(() => {
        setCropSearchTerm(newCrop.name || "");
    }, [newCrop.name]);

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

    const handleAddCropSubmit = async () => {
        const success = await handleAddCrop();
        if (success) {
            onOpenChange(false);
        }
    };

    // Handle crop selection
    const handleCropSelect = (value: string) => {
        setCropSearchTerm(value);
        handleCropInputChange({
            target: { name: "name", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowCropDropdown(false);
    };

    // Handle input change for crop name
    const handleCropInputChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCropSearchTerm(value);
        handleCropInputChange({
            target: { name: "name", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowCropDropdown(true);
    };

    // Handle when admin adds a new crop to the dropdown
    const handleAddNewCrop = () => {
        if (newCropName.trim() && !cropOptions.includes(newCropName.trim())) {
            const formattedName = formatCropName(newCropName.trim());
            setCropOptions(prev => [...prev, formattedName]);
            setNewCropName("");
            setShowAddCropInput(false);
        }
    };

    const soilTypes = [
        "Clay", "Loam", "Sandy", "Silty", "Peaty", "Chalky",
        "Sandy Loam", "Clay Loam", "Silty Loam", "Sandy Clay",
        "Silty Clay", "Organic Soil"
    ];

    // Update crop name if lockedCropName is provided
    useEffect(() => {
        if (lockedCropName) {
            handleCropInputChange({
                target: { name: "name", value: lockedCropName }
            } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [lockedCropName]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Crop</DialogTitle>
                    <DialogDescription>
                        Enter the details of your new crop.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cropName">Crop Name *</Label>
                        {userRole === "admin" && !lockedCropName ? (
                            // Admin view - dropdown with option to add new crops (only when not locked)
                            <div className="space-y-2">
                                <div className="relative" ref={cropDropdownRef}>
                                    <Input
                                        id="cropName"
                                        name="name"
                                        value={cropSearchTerm}
                                        onChange={handleCropInputChangeLocal}
                                        onFocus={() => setShowCropDropdown(true)}
                                        placeholder="Select or type a crop"
                                        className="pr-10"
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
                                                    No matching crops found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {showAddCropInput ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newCropName}
                                            onChange={(e) => setNewCropName(e.target.value)}
                                            placeholder="Enter new crop name"
                                        />
                                        <Button onClick={handleAddNewCrop} size="sm">Add</Button>
                                        <Button onClick={() => setShowAddCropInput(false)} variant="outline" size="sm">Cancel</Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => setShowAddCropInput(true)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                    >
                                        Add New Crop to List
                                    </Button>
                                )}
                            </div>
                        ) : (
                            // Farmer view or locked view - searchable dropdown or locked input
                            <div className="space-y-2">
                                {lockedCropName ? (
                                    // Locked crop name input
                                    <Input
                                        id="cropName"
                                        name="name"
                                        value={lockedCropName}
                                        disabled={true}
                                        className="bg-muted"
                                    />
                                ) : (
                                    // Farmer view - searchable dropdown
                                    <div className="relative" ref={cropDropdownRef}>
                                        <Input
                                            id="cropName"
                                            name="name"
                                            value={cropSearchTerm}
                                            onChange={handleCropInputChangeLocal}
                                            onFocus={() => setShowCropDropdown(true)}
                                            placeholder="Select or type a crop"
                                            className="pr-10"
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
                                                        No matching crops found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="soilType">Soil Type *</Label>
                        <Select onValueChange={handleSoilTypeChange} value={newCrop.soilType}>
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
                        <Label htmlFor="landArea">Land Area (hectares) *</Label>
                        <Input
                            id="landArea"
                            name="landArea"
                            type="number"
                            value={newCrop.landArea}
                            onChange={handleCropInputChange}
                            placeholder="e.g., 2.5"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="plantedDate">Date of Planting *</Label>
                        <Input
                            id="plantedDate"
                            name="plantedDate"
                            type="date"
                            value={newCrop.plantedDate}
                            onChange={handleCropInputChange}
                            min={new Date().toLocaleDateString('en-CA')} // Prevent past dates (using local date)
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="puhunan">Capital (PHP) *</Label>
                        <Input
                            id="puhunan"
                            name="puhunan"
                            type="number"
                            value={newCrop.puhunan}
                            onChange={handleCropInputChange}
                            placeholder="e.g., 5000"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddCropSubmit}>
                        Add Crop
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddCropDialog;
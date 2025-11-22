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
import { useState, useEffect } from "react";
import { HARDCODED_CROPS, formatCropName } from "@/utils/cropUtils";

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
}

const AddCropDialog = ({
    open,
    onOpenChange,
    newCrop,
    handleCropInputChange,
    handleSoilTypeChange,
    handleAddCrop,
    userRole = "farmer" // Default to farmer role
}: AddCropDialogProps) => {
    const [cropOptions, setCropOptions] = useState<string[]>(HARDCODED_CROPS);
    const [newCropName, setNewCropName] = useState(""); // For admin to add new crops
    const [showAddCropInput, setShowAddCropInput] = useState(false); // Toggle for admin to add new crops

    const handleAddCropSubmit = async () => {
        const success = await handleAddCrop();
        if (success) {
            onOpenChange(false);
        }
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
                        {userRole === "admin" ? (
                            // Admin view - dropdown with option to add new crops
                            <div className="space-y-2">
                                <Select
                                    value={newCrop.name}
                                    onValueChange={(value) => handleCropInputChange({ target: { name: "name", value } } as React.ChangeEvent<HTMLInputElement>)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a crop" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-48">
                                        {cropOptions.map((crop) => (
                                            <SelectItem key={crop} value={crop}>
                                                {crop}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

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
                            // Farmer view - regular dropdown
                            <Select
                                value={newCrop.name}
                                onValueChange={(value) => handleCropInputChange({ target: { name: "name", value } } as React.ChangeEvent<HTMLInputElement>)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a crop" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48">
                                    {cropOptions.map((crop) => (
                                        <SelectItem key={crop} value={crop}>
                                            {crop}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
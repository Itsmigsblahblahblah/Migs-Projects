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
}

const AddCropDialog = ({
    open,
    onOpenChange,
    newCrop,
    handleCropInputChange,
    handleSoilTypeChange,
    handleAddCrop
}: AddCropDialogProps) => {
    const handleAddCropSubmit = async () => {
        const success = await handleAddCrop();
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
                    <DialogTitle>Add New Crop</DialogTitle>
                    <DialogDescription>
                        Enter the details of your new crop.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cropName">Crop Name *</Label>
                        <Input
                            id="cropName"
                            name="name"
                            value={newCrop.name}
                            onChange={handleCropInputChange}
                            placeholder="e.g., Rice, Corn"
                        />
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
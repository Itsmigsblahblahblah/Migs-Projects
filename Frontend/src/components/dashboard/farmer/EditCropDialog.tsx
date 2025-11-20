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
    const handleEditCropSubmitWrapper = async () => {
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
                        <Input
                            id="editCropName"
                            name="name"
                            value={editCrop.name}
                            onChange={handleEditCropInputChange}
                            placeholder="e.g., Rice, Corn"
                        />
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
                            onChange={handleEditCropInputChange}
                            min={new Date().toLocaleDateString('en-CA')} // Prevent past dates (using local date)
                        />
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
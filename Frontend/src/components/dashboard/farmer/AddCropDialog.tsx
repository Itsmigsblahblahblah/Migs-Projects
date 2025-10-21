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

interface AddCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newCrop: {
        name: string;
        landArea: string;
        quantity: string;
        soilType: string;
        nitrogen: string;
        phosphorus: string;
        potassium: string;
        puhunan: string;
    };
    handleCropInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddCrop: () => Promise<boolean>;
}

const AddCropDialog = ({
    open,
    onOpenChange,
    newCrop,
    handleCropInputChange,
    handleAddCrop
}: AddCropDialogProps) => {
    const handleAddCropSubmit = async () => {
        const success = await handleAddCrop();
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
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
                        <Label htmlFor="quantity">Quantity (kg) *</Label>
                        <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            value={newCrop.quantity}
                            onChange={handleCropInputChange}
                            placeholder="e.g., 1000"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="soilType">Soil Type *</Label>
                        <Input
                            id="soilType"
                            name="soilType"
                            value={newCrop.soilType}
                            onChange={handleCropInputChange}
                            placeholder="e.g., Clay, Sandy"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="nitrogen">Nitrogen (N)</Label>
                            <Input
                                id="nitrogen"
                                name="nitrogen"
                                type="number"
                                value={newCrop.nitrogen}
                                onChange={handleCropInputChange}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phosphorus">Phosphorus (P)</Label>
                            <Input
                                id="phosphorus"
                                name="phosphorus"
                                type="number"
                                value={newCrop.phosphorus}
                                onChange={handleCropInputChange}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="potassium">Potassium (K)</Label>
                            <Input
                                id="potassium"
                                name="potassium"
                                type="number"
                                value={newCrop.potassium}
                                onChange={handleCropInputChange}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="puhunan">Puhunan (PHP) *</Label>
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
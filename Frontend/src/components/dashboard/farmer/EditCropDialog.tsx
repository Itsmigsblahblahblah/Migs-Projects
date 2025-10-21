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

interface EditCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editCrop: {
        name: string;
        landArea: string;
        quantity: string;
        soilType: string;
        nitrogen: string;
        phosphorus: string;
        potassium: string;
        puhunan: string;
    };
    handleEditCropInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEditCropSubmit: () => Promise<boolean>;
}

const EditCropDialog = ({
    open,
    onOpenChange,
    editCrop,
    handleEditCropInputChange,
    handleEditCropSubmit
}: EditCropDialogProps) => {
    const handleEditCropSubmitWrapper = async () => {
        const success = await handleEditCropSubmit();
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
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
                        <Label htmlFor="editQuantity">Quantity (kg) *</Label>
                        <Input
                            id="editQuantity"
                            name="quantity"
                            type="number"
                            value={editCrop.quantity}
                            onChange={handleEditCropInputChange}
                            placeholder="e.g., 1000"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editSoilType">Soil Type *</Label>
                        <Input
                            id="editSoilType"
                            name="soilType"
                            value={editCrop.soilType}
                            onChange={handleEditCropInputChange}
                            placeholder="e.g., Clay, Sandy"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="editNitrogen">Nitrogen (N)</Label>
                            <Input
                                id="editNitrogen"
                                name="nitrogen"
                                type="number"
                                value={editCrop.nitrogen}
                                onChange={handleEditCropInputChange}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editPhosphorus">Phosphorus (P)</Label>
                            <Input
                                id="editPhosphorus"
                                name="phosphorus"
                                type="number"
                                value={editCrop.phosphorus}
                                onChange={handleEditCropInputChange}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editPotassium">Potassium (K)</Label>
                            <Input
                                id="editPotassium"
                                name="potassium"
                                type="number"
                                value={editCrop.potassium}
                                onChange={handleEditCropInputChange}
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editPuhunan">Puhunan (PHP) *</Label>
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCrops } from "@/contexts/CropContext";

interface UpdateCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectCropForEditing: (crop: any) => void;
    setIsEditCropDialogOpen: (open: boolean) => void;
}

const UpdateCropDialog = ({
    open,
    onOpenChange,
    selectCropForEditing,
    setIsEditCropDialogOpen
}: UpdateCropDialogProps) => {
    const { crops } = useCrops();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Crop</DialogTitle>
                    <DialogDescription>
                        Select a crop to update its details.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {crops.length > 0 ? (
                        <div className="space-y-2">
                            <Label>Select Crop to Update</Label>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {crops.map((crop) => (
                                    <div
                                        key={crop.id}
                                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                                        onClick={() => {
                                            selectCropForEditing(crop);
                                            onOpenChange(false);
                                            setIsEditCropDialogOpen(true);
                                        }}
                                    >
                                        <div className="font-medium">{crop.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {crop.landArea} hectares • ₱{crop.puhunan.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            No crops available. Add crops first.
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateCropDialog;
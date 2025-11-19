import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCrops } from "@/contexts/CropContext";

export const useCropManagement = () => {
    const [newCrop, setNewCrop] = useState({
        name: "",
        soilType: "",
        landArea: "",
        plantedDate: "",
        puhunan: ""
    });

    const [editCrop, setEditCrop] = useState({
        name: "",
        soilType: "",
        landArea: "",
        plantedDate: "",
        puhunan: ""
    });

    const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
    const { addCrop, updateCrop, deleteCrop } = useCrops(); // Added deleteCrop
    const { toast } = useToast();

    // Handle crop input changes
    const handleCropInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCrop(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle soil type change
    const handleSoilTypeChange = (value: string) => {
        setNewCrop(prev => ({
            ...prev,
            soilType: value
        }));
    };

    // Handle edit crop input changes
    const handleEditCropInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditCrop(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle edit soil type change
    const handleEditSoilTypeChange = (value: string) => {
        setEditCrop(prev => ({
            ...prev,
            soilType: value
        }));
    };

    // Handle crop submission
    const handleAddCrop = async () => {
        // Validate inputs
        if (!newCrop.name || !newCrop.soilType || !newCrop.landArea ||
            !newCrop.plantedDate || !newCrop.puhunan) {
            toast({
                title: "Incomplete Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Prepare crop data (userId is added automatically in CropContext)
            const cropData = {
                name: newCrop.name,
                soilType: newCrop.soilType,
                landArea: parseFloat(newCrop.landArea),
                plantedDate: newCrop.plantedDate,
                puhunan: parseFloat(newCrop.puhunan),
            };

            // Save to Firestore via context
            await addCrop(cropData);

            toast({
                title: "Crop Added Successfully",
                description: `${newCrop.name} has been saved to the database.`,
            });

            // Reset form
            setNewCrop({
                name: "",
                soilType: "",
                landArea: "",
                plantedDate: "",
                puhunan: ""
            });

            return true;
        } catch (error) {
            console.error("Error saving crop:", error);
            toast({
                title: "Error",
                description: "Failed to add crop to database. Please try again.",
                variant: "destructive",
            });
            return false;
        }
    };

    // Handle edit crop submission
    const handleEditCropSubmit = async () => {
        // Validate inputs
        if (!editCrop.name || !editCrop.soilType || !editCrop.landArea ||
            !editCrop.plantedDate || !editCrop.puhunan) {
            toast({
                title: "Incomplete Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        try {
            if (!selectedCropId) {
                toast({
                    title: "Error",
                    description: "No crop selected for update.",
                    variant: "destructive",
                });
                return;
            }

            // Prepare crop data
            const cropData = {
                name: editCrop.name,
                soilType: editCrop.soilType,
                landArea: parseFloat(editCrop.landArea),
                plantedDate: editCrop.plantedDate,
                puhunan: parseFloat(editCrop.puhunan),
            };

            // Update crop in Firestore via context
            await updateCrop(selectedCropId, cropData);

            toast({
                title: "Crop Updated Successfully",
                description: `${editCrop.name} has been updated in the database.`,
            });

            // Reset form
            setEditCrop({
                name: "",
                soilType: "",
                landArea: "",
                plantedDate: "",
                puhunan: ""
            });

            return true;
        } catch (error) {
            console.error("Error updating crop:", error);
            toast({
                title: "Error",
                description: "Failed to update crop in database. Please try again.",
                variant: "destructive",
            });
            return false;
        }
    };

    // Handle crop deletion
    const handleDeleteCrop = async (id: string, name: string) => {
        try {
            await deleteCrop(id);
            toast({
                title: "Crop Deleted Successfully",
                description: `${name} has been removed from the database.`,
            });
            return true;
        } catch (error) {
            console.error("Error deleting crop:", error);
            toast({
                title: "Error",
                description: "Failed to delete crop from database. Please try again.",
                variant: "destructive",
            });
            return false;
        }
    };

    const selectCropForEditing = (crop: any) => {
        setSelectedCropId(crop.id);
        setEditCrop({
            name: crop.name,
            soilType: crop.soilType,
            landArea: crop.landArea.toString(),
            plantedDate: crop.plantedDate || "",
            puhunan: crop.puhunan.toString()
        });
    };

    return {
        newCrop,
        editCrop,
        selectedCropId,
        setNewCrop,
        setEditCrop,
        setSelectedCropId,
        handleCropInputChange,
        handleSoilTypeChange,
        handleEditCropInputChange,
        handleEditSoilTypeChange,
        handleAddCrop,
        handleEditCropSubmit,
        handleDeleteCrop, // Added delete function
        selectCropForEditing
    };
};
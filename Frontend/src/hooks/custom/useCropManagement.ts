import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCrops } from "@/contexts/CropContext";

export const useCropManagement = () => {
    const [newCrop, setNewCrop] = useState({
        name: "",
        landArea: "",
        quantity: "",
        soilType: "",
        nitrogen: "",
        phosphorus: "",
        potassium: "",
        puhunan: ""
    });

    const [editCrop, setEditCrop] = useState({
        name: "",
        landArea: "",
        quantity: "",
        soilType: "",
        nitrogen: "",
        phosphorus: "",
        potassium: "",
        puhunan: ""
    });

    const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
    const { addCrop, updateCrop } = useCrops();
    const { toast } = useToast();

    // Handle crop input changes
    const handleCropInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCrop(prev => ({
            ...prev,
            [name]: value
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

    // Handle crop submission
    const handleAddCrop = async () => {
        // Validate inputs
        if (!newCrop.name || !newCrop.landArea || !newCrop.quantity ||
            !newCrop.soilType || !newCrop.puhunan) {
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
                landArea: newCrop.landArea,
                quantity: parseFloat(newCrop.quantity),
                soilType: newCrop.soilType,
                nitrogen: parseFloat(newCrop.nitrogen) || 0,
                phosphorus: parseFloat(newCrop.phosphorus) || 0,
                potassium: parseFloat(newCrop.potassium) || 0,
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
                landArea: "",
                quantity: "",
                soilType: "",
                nitrogen: "",
                phosphorus: "",
                potassium: "",
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
        if (!editCrop.name || !editCrop.landArea || !editCrop.quantity ||
            !editCrop.soilType || !editCrop.puhunan) {
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
                landArea: editCrop.landArea,
                quantity: parseFloat(editCrop.quantity),
                soilType: editCrop.soilType,
                nitrogen: parseFloat(editCrop.nitrogen) || 0,
                phosphorus: parseFloat(editCrop.phosphorus) || 0,
                potassium: parseFloat(editCrop.potassium) || 0,
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
                landArea: "",
                quantity: "",
                soilType: "",
                nitrogen: "",
                phosphorus: "",
                potassium: "",
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

    const selectCropForEditing = (crop: any) => {
        setSelectedCropId(crop.id);
        setEditCrop({
            name: crop.name,
            landArea: crop.landArea,
            quantity: crop.quantity.toString(),
            soilType: crop.soilType,
            nitrogen: crop.nitrogen.toString(),
            phosphorus: crop.phosphorus.toString(),
            potassium: crop.potassium.toString(),
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
        handleEditCropInputChange,
        handleAddCrop,
        handleEditCropSubmit,
        selectCropForEditing
    };
};
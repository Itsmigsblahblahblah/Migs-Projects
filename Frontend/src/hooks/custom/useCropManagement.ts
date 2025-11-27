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
    const { crops, addCrop, updateCrop, deleteCrop } = useCrops(); // Added deleteCrop
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
            return false;
        }

        // Validate planting date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for comparison
        const plantedDate = new Date(newCrop.plantedDate);
        if (plantedDate < today) {
            toast({
                title: "Invalid Planting Date",
                description: "Planting date cannot be in the past. Please select today or a future date.",
                variant: "destructive",
            });
            return false;
        }

        try {
            // Check if there's an existing crop of the same type with detailed instructions
            let checklistToCopy: any[] | undefined = undefined;

            // Find the first crop of the same name that has checklist items with detailed instructions
            const existingCropWithInstructions = crops.find(crop =>
                crop.name.toLowerCase() === newCrop.name.toLowerCase() &&
                crop.checklist &&
                crop.checklist.some(item => item.detailedInstructions && item.detailedInstructions.length > 0)
            );

            if (existingCropWithInstructions && existingCropWithInstructions.checklist) {
                // Copy the checklist with detailed instructions
                checklistToCopy = existingCropWithInstructions.checklist.map(item => {
                    // Create a new object without undefined properties
                    const copiedItem: any = {
                        id: item.id,
                        title: item.title,
                        category: item.category,
                        completed: false, // Reset completion status
                        // Only include detailedInstructions if it exists
                        ...(item.detailedInstructions && { detailedInstructions: item.detailedInstructions })
                    };

                    return copiedItem;
                });
            }

            // Prepare crop data (userId is added automatically in CropContext)
            const cropData = {
                name: newCrop.name,
                soilType: newCrop.soilType,
                landArea: parseFloat(newCrop.landArea),
                plantedDate: newCrop.plantedDate, // This is already a string in YYYY-MM-DD format
                puhunan: parseFloat(newCrop.puhunan),
                ...(checklistToCopy && { checklist: checklistToCopy })
            };

            // Save to Firestore via context and get the crop ID
            const cropId = await addCrop(cropData);

            toast({
                title: "Crop Added Successfully",
                description: `${newCrop.name} has been saved to the database.` +
                    (checklistToCopy ? " Maintenance instructions copied from existing crop." : ""),
            });

            // Reset form
            setNewCrop({
                name: "",
                soilType: "",
                landArea: "",
                plantedDate: "",
                puhunan: ""
            });

            // Return the ID of the newly added crop
            return cropId;
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

        // Note: Planting date validation is removed for editing since the field is now read-only

        try {
            if (!selectedCropId) {
                toast({
                    title: "Error",
                    description: "No crop selected for update.",
                    variant: "destructive",
                });
                return;
            }

            // Get the current crop data to check if plantedDate changed
            const currentCrop = crops.find(crop => crop.id === selectedCropId);
            const plantedDateChanged = currentCrop?.plantedDate !== editCrop.plantedDate;

            // Prepare crop data
            const cropData = {
                name: editCrop.name,
                soilType: editCrop.soilType,
                landArea: parseFloat(editCrop.landArea),
                plantedDate: editCrop.plantedDate, // This is already a string in YYYY-MM-DD format
                puhunan: parseFloat(editCrop.puhunan),
            };

            // If planted date changed, we need to recalculate harvest data
            if (plantedDateChanged) {
                // Remove old harvest data so it can be recalculated
                // @ts-ignore - we need to add harvestData to the type
                cropData.harvestData = null;
            }

            // Update crop in Firestore via context
            await updateCrop(selectedCropId, cropData);

            toast({
                title: "Crop Updated Successfully",
                description: `${editCrop.name} has been updated in the database.`,
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

        // Format the plantedDate for the input field
        let plantedDate = "";
        if (crop.plantedDate) {
            if (typeof crop.plantedDate === 'string') {
                // If it's already a string in YYYY-MM-DD format, use it directly
                plantedDate = crop.plantedDate;
            } else if (crop.plantedDate.toDate) {
                // If it's a Firestore Timestamp, convert it to YYYY-MM-DD format
                const date = crop.plantedDate.toDate();
                plantedDate = date.toISOString().split('T')[0];
            } else if (crop.plantedDate instanceof Date) {
                // If it's a JavaScript Date object, convert it to YYYY-MM-DD format
                plantedDate = crop.plantedDate.toISOString().split('T')[0];
            }
        }

        setEditCrop({
            name: crop.name,
            soilType: crop.soilType,
            landArea: crop.landArea.toString(),
            plantedDate: plantedDate,
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
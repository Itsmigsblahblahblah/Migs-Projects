import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCrops } from "@/contexts/CropContext";
import { Leaf, Calendar, MapPin, Wheat, TrendingUp, Plus, Sprout, Trash2, Edit, ArrowLeft } from "lucide-react"; // Added ArrowLeft icon
import AddCropDialog from "@/components/dashboard/farmer/AddCropDialog";
import UpdateCropDialog from "@/components/dashboard/farmer/UpdateCropDialog";
import EditCropDialog from "@/components/dashboard/farmer/EditCropDialog";
import { useCropManagement } from "@/hooks/custom/useCropManagement"; // Import the hook

const CropHistory = () => {
    const { crops, loadCrops, deleteCrop } = useCrops();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [cropsLoaded, setCropsLoaded] = useState(false); // Add state to track if crops are loaded
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [cropToDelete, setCropToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false); // Add state for add crop dialog
    const [isUpdateCropDialogOpen, setIsUpdateCropDialogOpen] = useState(false); // Add state for update crop dialog
    const [isEditCropDialogOpen, setIsEditCropDialogOpen] = useState(false); // Add state for edit crop dialog
    const navigate = useNavigate();

    // Use the crop management hook
    const {
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
        selectCropForEditing
    } = useCropManagement();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const user = localStorage.getItem('username');

        if (role !== 'farmer') {
            navigate('/');
            return;
        }

        setUsername(user || 'Farmer');

        // Load crops when component mounts
        const loadCropsData = async () => {
            try {
                // Wait for crops to be loaded
                if (!cropsLoaded) {
                    await loadCrops();
                    setCropsLoaded(true);
                }
            } catch (error) {
                console.error("Error loading crops:", error);
            } finally {
                setLoading(false);
            }
        };

        loadCropsData();
    }, [navigate, loadCrops, cropsLoaded]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown date';

        try {
            // Handle string dates (YYYY-MM-DD format)
            if (typeof timestamp === 'string') {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            }

            // Handle Firestore Timestamp
            if (timestamp.toDate) {
                return timestamp.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }

            // Handle JavaScript Date objects
            if (timestamp instanceof Date) {
                return timestamp.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }

            return 'Unknown date';
        } catch (e) {
            return 'Unknown date';
        }
    };

    // Added delete crop handler
    const handleDeleteCrop = (id: string, name: string) => {
        setCropToDelete({ id, name });
        setShowDeleteDialog(true);
    };

    // Added confirm delete function
    const confirmDeleteCrop = async () => {
        if (cropToDelete) {
            try {
                await deleteCrop(cropToDelete.id);
                setShowDeleteDialog(false);
                setCropToDelete(null);
            } catch (error) {
                console.error("Error deleting crop:", error);
                // You might want to show an error message to the user here
            }
        }
    };

    // Added cancel delete function
    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setCropToDelete(null);
    };

    if (loading) {
        return (
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                        <div className="flex items-center gap-3 mb-2">
                            <Leaf className="h-6 w-6" />
                            <h1 className="text-2xl font-bold">Crop History</h1>
                        </div>
                        <p className="text-primary-foreground/90">
                            View and manage all your crop plantings
                        </p>
                    </div>

                    {/* Loading State */}
                    <Card className="shadow-card">
                        <CardContent className="py-12 text-center">
                            <div className="flex justify-center items-center h-24">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-muted-foreground">Loading crop history...</p>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header - Added Add Crop Button */}
                <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Leaf className="h-6 w-6" />
                                    <h1 className="text-2xl font-bold">Crop History</h1>
                                </div>
                                <p className="text-primary-foreground/90">
                                    View and manage all your crop plantings
                                </p>
                            </div>
                        </div>
                        {/* Add Crop Button - Moved to the right side with improved contrast */}
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsAddCropDialogOpen(true)}
                                className="bg-white text-primary hover:bg-white/90"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Crop
                            </Button>
                            {crops.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsUpdateCropDialogOpen(true)}
                                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Crop
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {crops.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Sprout className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Crops</p>
                                        <p className="text-2xl font-bold">{crops.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-success/10 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Investment</p>
                                        <p className="text-2xl font-bold">
                                            ₱{(crops.reduce((sum, crop) => sum + (Number(crop.puhunan) || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <MapPin className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Area</p>
                                        <p className="text-2xl font-bold">
                                            {(crops.reduce((sum, crop) => sum + (Number(crop.landArea) || 0), 0)).toFixed(1)} ha
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Crops List */}
                {crops.length === 0 ? (
                    <Card className="shadow-card">
                        <CardContent className="py-12 text-center">
                            <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No crops found</h3>
                            <p className="text-muted-foreground mb-4">
                                You haven't added any crops yet. Start by adding your first crop.
                            </p>
                            <Button onClick={() => setIsAddCropDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Crop
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Your Crops</h2>
                            <p className="text-muted-foreground">{crops.length} crops</p>
                        </div>

                        {crops.map((crop) => (
                            <Card
                                key={crop.id}
                                className="shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
                                onClick={() => navigate(`/crop/${crop.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Wheat className="h-5 w-5 text-primary" />
                                                {crop.name}
                                            </CardTitle>
                                            <CardDescription>
                                                Planted on {formatDate(crop.plantedDate)}
                                            </CardDescription>
                                        </div>
                                        {/* Removed View Details button and kept only Delete button */}
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCrop(crop.id, crop.name);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Land Area</p>
                                                <p className="font-medium">{Number(crop.landArea)} hectares</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Capital</p>
                                                <p className="font-medium">₱{Number(crop.puhunan).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Leaf className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Soil Type</p>
                                                <p className="font-medium">{crop.soilType}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Planting Date</p>
                                                <p className="font-medium">{formatDate(crop.plantedDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                {showDeleteDialog && cropToDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-2">Delete Crop</h3>
                            <p className="text-muted-foreground mb-4">
                                Are you sure you want to delete <strong>{cropToDelete.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={cancelDelete}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={confirmDeleteCrop}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Crop Dialog */}
                <AddCropDialog
                    open={isAddCropDialogOpen}
                    onOpenChange={setIsAddCropDialogOpen}
                    newCrop={newCrop}
                    handleCropInputChange={handleCropInputChange}
                    handleSoilTypeChange={handleSoilTypeChange}
                    handleAddCrop={handleAddCrop}
                />

                <UpdateCropDialog
                    open={isUpdateCropDialogOpen}
                    onOpenChange={setIsUpdateCropDialogOpen}
                    selectCropForEditing={selectCropForEditing}
                    setIsEditCropDialogOpen={setIsEditCropDialogOpen}
                />

                <EditCropDialog
                    open={isEditCropDialogOpen}
                    onOpenChange={setIsEditCropDialogOpen}
                    editCrop={editCrop}
                    handleEditCropInputChange={handleEditCropInputChange}
                    handleEditSoilTypeChange={handleEditSoilTypeChange}
                    handleEditCropSubmit={handleEditCropSubmit}
                />
            </div>
        </Layout>
    );
};

export default CropHistory;
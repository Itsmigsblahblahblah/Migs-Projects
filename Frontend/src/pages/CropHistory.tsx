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
    const [currentPage, setCurrentPage] = useState(1); // Pagination state
    const cropsPerPage = 10; // Number of crops per page
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
        handleDeleteCrop, // Import the delete function with toast notification
        selectCropForEditing
    } = useCropManagement();

    // State to store the ID of the newly added crop
    const [newlyAddedCropId, setNewlyAddedCropId] = useState<string | null>(null);

    // Wrapper function for handleAddCrop that returns a boolean and captures the crop ID
    const handleAddCropWrapper = async () => {
        const result = await handleAddCrop();
        if (result && typeof result === 'string') {
            // Store the ID of the newly added crop
            setNewlyAddedCropId(result);
            return true;
        }
        return false;
    };

    // Effect to navigate to the Crop Details page when a new crop is added
    useEffect(() => {
        if (newlyAddedCropId) {
            // Navigate to the Crop Details page using the correct route
            navigate(`/crop/${newlyAddedCropId}`);
            // Reset the newlyAddedCropId state
            setNewlyAddedCropId(null);
        }
    }, [newlyAddedCropId, navigate]);

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

    // Reset to first page when crops change
    useEffect(() => {
        setCurrentPage(1);
    }, [crops]);

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
    const handleDeleteCropClick = (id: string, name: string) => {
        setCropToDelete({ id, name });
        setShowDeleteDialog(true);
    };

    // Added confirm delete function - now using the hook's handleDeleteCrop function
    const confirmDeleteCrop = async () => {
        if (cropToDelete) {
            try {
                // Use the hook's handleDeleteCrop function which includes toast notification
                await handleDeleteCrop(cropToDelete.id, cropToDelete.name);
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
                    {/* Desktop layout - buttons on the right */}
                    <div className="hidden md:flex items-center justify-between">
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
                        <div className="flex flex-row gap-2">
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

                    {/* Mobile layout - buttons below description but side by side */}
                    <div className="md:hidden">
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
                        <div className="flex flex-row gap-2 mt-4">
                            <Button
                                onClick={() => setIsAddCropDialogOpen(true)}
                                className="bg-white text-primary hover:bg-white/90 flex-1"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Crop
                            </Button>
                            {crops.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsUpdateCropDialogOpen(true)}
                                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 flex-1"
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
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => setIsAddCropDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Crop
                                </Button>
                                {crops.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsUpdateCropDialogOpen(true)}
                                        className="mt-2"
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Crop
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Your Crops</h2>
                            <p className="text-muted-foreground">{crops.length} crops</p>
                        </div>

                        <div className="flex-grow">
                            {crops.slice((currentPage - 1) * cropsPerPage, currentPage * cropsPerPage).map((crop) => (
                                <Card
                                    key={crop.id}
                                    className="shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary mb-4"
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
                                                    handleDeleteCropClick(crop.id, crop.name);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {/* 
                                        Mobile: 2 rows with 2 items each (Land+Capital, Soil+Planting)
                                        Desktop (sm+): Original 2x2 grid layout
                                        */}
                                        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                        {/* Mobile-only layout: 2 rows with 2 items each */}
                                        <div className="sm:hidden grid grid-cols-1 gap-4">
                                            {/* Row 1: Land Area and Capital side by side */}
                                            <div className="grid grid-cols-2 gap-4">
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
                                            </div>

                                            {/* Row 2: Soil Type and Planting Date side by side */}
                                            <div className="grid grid-cols-2 gap-4">
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
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {crops.length > 0 && (
                            <div className="border-t pt-4 mt-auto">
                                {/* Desktop layout - text on left, pagination on right */}
                                <div className="hidden md:flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {(currentPage - 1) * cropsPerPage + 1} to {Math.min(currentPage * cropsPerPage, crops.length)} of {crops.length} crops
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Previous
                                        </Button>

                                        {/* Page Number Buttons */}
                                        {(() => {
                                            const totalPages = Math.ceil(crops.length / cropsPerPage);
                                            const pageButtons = [];
                                            // Show more pages (7 instead of 5) to reduce ellipsis
                                            let startPage = Math.max(1, currentPage - 3);
                                            let endPage = Math.min(totalPages, startPage + 6);

                                            // Adjust startPage if we're near the end
                                            if (endPage - startPage < 6) {
                                                startPage = Math.max(1, endPage - 6);
                                            }

                                            // First page button
                                            if (startPage > 1) {
                                                pageButtons.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(1)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        1
                                                    </Button>
                                                );
                                                // Only show ellipsis if there's a significant gap
                                                if (startPage > 2) {
                                                    pageButtons.push(
                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                    );
                                                }
                                            }

                                            // Page number buttons
                                            for (let i = startPage; i <= endPage; i++) {
                                                pageButtons.push(
                                                    <Button
                                                        key={i}
                                                        variant={currentPage === i ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(i)}
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                                                    >
                                                        {i}
                                                    </Button>
                                                );
                                            }

                                            // Last page button
                                            if (endPage < totalPages) {
                                                // Only show ellipsis if there's a significant gap
                                                if (endPage < totalPages - 1) {
                                                    pageButtons.push(
                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                    );
                                                }
                                                pageButtons.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        {totalPages}
                                                    </Button>
                                                );
                                            }

                                            return pageButtons;
                                        })()}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(crops.length / cropsPerPage)))}
                                            disabled={currentPage === Math.ceil(crops.length / cropsPerPage)}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>

                                {/* Mobile layout - text and pagination both centered, pagination below text */}
                                <div className="md:hidden">
                                    <div className="text-sm text-muted-foreground text-center mb-2">
                                        Showing {(currentPage - 1) * cropsPerPage + 1} to {Math.min(currentPage * cropsPerPage, crops.length)} of {crops.length} crops
                                    </div>
                                    <div className="flex justify-center space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Previous
                                        </Button>

                                        {/* Page Number Buttons */}
                                        {(() => {
                                            const totalPages = Math.ceil(crops.length / cropsPerPage);
                                            const pageButtons = [];
                                            // Show fewer pages on mobile to prevent overflow
                                            let startPage = Math.max(1, currentPage - 1);
                                            let endPage = Math.min(totalPages, startPage + 2);

                                            // Adjust startPage if we're near the end
                                            if (endPage - startPage < 2) {
                                                startPage = Math.max(1, endPage - 2);
                                            }

                                            // First page button
                                            if (startPage > 1) {
                                                pageButtons.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(1)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        1
                                                    </Button>
                                                );
                                                // Only show ellipsis if there's a significant gap
                                                if (startPage > 2) {
                                                    pageButtons.push(
                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
                                                    );
                                                }
                                            }

                                            // Page number buttons
                                            for (let i = startPage; i <= endPage; i++) {
                                                pageButtons.push(
                                                    <Button
                                                        key={i}
                                                        variant={currentPage === i ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(i)}
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                                                    >
                                                        {i}
                                                    </Button>
                                                );
                                            }

                                            // Last page button
                                            if (endPage < totalPages) {
                                                // Only show ellipsis if there's a significant gap
                                                if (endPage < totalPages - 1) {
                                                    pageButtons.push(
                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
                                                    );
                                                }
                                                pageButtons.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        {totalPages}
                                                    </Button>
                                                );
                                            }

                                            return pageButtons;
                                        })()}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(crops.length / cropsPerPage)))}
                                            disabled={currentPage === Math.ceil(crops.length / cropsPerPage)}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
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
                    handleAddCrop={handleAddCropWrapper}
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
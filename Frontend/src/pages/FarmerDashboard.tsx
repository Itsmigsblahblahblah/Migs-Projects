import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Sprout, Leaf, X, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import ProfileCard from "@/components/dashboard/farmer/ProfileCard";
import WeatherCard from "@/components/dashboard/farmer/WeatherCard";
import CropStatusCard from "@/components/dashboard/farmer/CropStatusCard";
import QuickActions from "@/components/dashboard/farmer/QuickActions";
import ReportForm from "@/components/dashboard/farmer/ReportForm";
import RecommendationResults from "@/components/dashboard/farmer/RecommendationResults";
import QuickStats from "@/components/dashboard/farmer/QuickStats";
import MarketDemandCard from "@/components/dashboard/farmer/MarketDemandCard";
import EditProfileDialog from "@/components/dashboard/farmer/EditProfileDialog";
import AddCropDialog from "@/components/dashboard/farmer/AddCropDialog";
import UpdateCropDialog from "@/components/dashboard/farmer/UpdateCropDialog";
import EditCropDialog from "@/components/dashboard/farmer/EditCropDialog";
import RequestAccountDeletionDialog from "@/components/dashboard/farmer/RequestAccountDeletionDialog";
import DeleteAccountDialog from "@/components/dashboard/farmer/DeleteAccountDialog";
import DeleteConfirmationDialog from "@/components/dashboard/farmer/DeleteConfirmationDialog";
import AdminMessages from "@/components/dashboard/farmer/AdminMessages";
import { useFarmerDashboard } from "@/hooks/custom/useFarmerDashboard";
import { useCropManagement } from "@/hooks/custom/useCropManagement";
import { useReportManagement } from "@/hooks/custom/useReportManagement";
import { useCrops } from "@/contexts/CropContext"; // Added import
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MaintenanceChecklistCard from "@/components/dashboard/farmer/MaintenanceChecklistCard";

// Removed mock data

// Mock checklist data - copied from CropDetails.tsx
const generateChecklist = (cropName: string) => {
  const baseItems = [
    { id: "1", title: "Prepare soil and remove weeds", completed: false, category: "Preparation" },
    { id: "2", title: "Apply organic fertilizer", completed: false, category: "Planting" },
    { id: "3", title: "Plant seeds at proper depth", completed: false, category: "Planting" },
    { id: "4", title: "Water regularly (2-3 times per week)", completed: false, category: "Maintenance" },
    { id: "5", title: "Monitor for pests and diseases", completed: false, category: "Maintenance" },
    { id: "6", title: "Apply additional fertilizer as needed", completed: false, category: "Maintenance" },
    { id: "7", title: "Harvest when crop is mature", completed: false, category: "Harvesting" },
    { id: "8", title: "Sort and store harvested crops properly", completed: false, category: "Post-Harvest" },
  ];

  return baseItems;
};

// Function to ensure all checklist items are present - copied from CropDetails.tsx
const ensureCompleteChecklist = (existingChecklist: any[], cropName: string): any[] => {
  const baseChecklist = generateChecklist(cropName);

  // If there's no existing checklist, return the base checklist
  if (!existingChecklist || existingChecklist.length === 0) {
    return baseChecklist;
  }

  // Check if the new item exists in the existing checklist by title
  const hasPostHarvestItem = existingChecklist.some(item =>
    item.title === "Sort and store harvested crops properly"
  );

  // If the new item doesn't exist, add it
  if (!hasPostHarvestItem) {
    const postHarvestItem = baseChecklist.find(item =>
      item.title === "Sort and store harvested crops properly"
    );
    if (postHarvestItem) {
      return [...existingChecklist, { ...postHarvestItem, completed: false, completedAt: undefined }];
    }
  }

  return existingChecklist;
};

const FarmerDashboard = () => {
  const navigate = useNavigate(); // Add navigate hook
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [isUpdateCropDialogOpen, setIsUpdateCropDialogOpen] = useState(false);
  const [isEditCropDialogOpen, setIsEditCropDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isRequestDeleteDialogOpen, setIsRequestDeleteDialogOpen] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [showDeletionNotification, setShowDeletionNotification] = useState(true);
  const [currentCropIndex, setCurrentCropIndex] = useState(0); // Added state for crop navigation
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false); // State for checklist dialog
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null); // State for selected crop ID

  const {
    username,
    userId,
    monthlyReports,
    deletionRequest,
    farmerProfile,
    editProfileData,
    profileImageFile,
    weatherData,
    weatherLoading,
    weatherError,
    crops,
    setUsername,
    setProfileImageFile,
    handleProfileInputChange,
    handleProfileImageUpload,
    handleUpdateProfile,
    handleRequestAccountDeletion,
    handleDeleteAccount,
    resetEditProfileData,
    // Weather forecast view properties
    forecastView,
    setForecastView,
    selectedDate,
    setSelectedDate,
    getAvailableDates
  } = useFarmerDashboard();

  // Added useCrops hook
  const { crops: cropHistory, updateCrop } = useCrops();

  const {
    newCrop,
    editCrop,
    selectedCropId: cropManagementSelectedCropId,
    setNewCrop,
    setEditCrop,
    setSelectedCropId: setCropManagementSelectedCropId,
    handleCropInputChange,
    handleSoilTypeChange,
    handleEditCropInputChange,
    handleEditSoilTypeChange,
    handleAddCrop,
    handleEditCropSubmit,
    selectCropForEditing
  } = useCropManagement();

  const {
    reportText,
    isProcessing,
    recommendation,
    setReportText,
    setSelectedImage,
    setIsProcessing,
    setRecommendation,
    handleSubmitReport,
    handleImageUpload
  } = useReportManagement(userId, username, () => { }, monthlyReports);

  // Auto-hide denied deletion notifications after 3 minutes
  useEffect(() => {
    if (deletionRequest && deletionRequest.status === 'denied') {
      setShowDeletionNotification(true);
      const timer = setTimeout(() => {
        setShowDeletionNotification(false);
      }, 180000); // 3 minutes in milliseconds

      return () => clearTimeout(timer);
    }
  }, [deletionRequest]);

  const handleAddCropSubmit = async () => {
    const success = await handleAddCrop();
    if (success) {
      setIsAddCropDialogOpen(false);
    }
  };

  const handleEditCropSubmitWrapper = async () => {
    const success = await handleEditCropSubmit();
    if (success) {
      setIsEditCropDialogOpen(false);
      setIsUpdateCropDialogOpen(false);
    }
  };

  const handleRequestAccountDeletionWrapper = async (reason: string) => {
    setIsRequestingDeletion(true);
    try {
      await handleRequestAccountDeletion(reason);
      // Close the dialog after successful submission
      setIsRequestDeleteDialogOpen(false);
    } finally {
      setIsRequestingDeletion(false);
    }
  };

  // Determine the text and action for the deletion button based on request status
  const getDeletionButtonText = () => {
    if (!deletionRequest) {
      return "Request Account Deletion";
    }

    switch (deletionRequest.status) {
      case 'pending':
        return "Deletion Request Pending";
      case 'approved':
        return "Account Deletion Scheduled";
      case 'denied':
        return "Deletion Request Denied - Request Again";
      default:
        return "Request Account Deletion";
    }
  };

  // Determine if the deletion button should be disabled
  const isDeletionButtonDisabled = () => {
    if (!deletionRequest) return false;
    return deletionRequest.status === 'pending' || deletionRequest.status === 'approved';
  };

  // Handle deletion button click
  const handleDeletionButtonClick = () => {
    if (deletionRequest && deletionRequest.status === 'denied') {
      // If the request was denied, allow the user to request again
      setIsRequestDeleteDialogOpen(true);
    } else if (!deletionRequest || deletionRequest.status !== 'pending') {
      // If there's no request or the request is not pending, allow a new request
      setIsRequestDeleteDialogOpen(true);
    }
    // If the request is pending or approved, the button will be disabled anyway
  };

  // Function to manually close the deletion notification
  const closeDeletionNotification = () => {
    setShowDeletionNotification(false);
  };

  const handleRefresh = () => {
    setRecommendation(null);
  };

  // Function to get crop data for the CropStatusCard
  const getCropData = () => {
    if (cropHistory.length === 0) {
      return {
        currentCrop: "No crops available",
        plantedArea: "0 hectares",
        nextHarvest: "N/A",
        growthStage: "N/A",
        productivityIndex: 0
      };
    }

    const currentCrop = cropHistory[currentCropIndex];

    // Calculate harvest date (similar to CropDetails page)
    let harvestDate = "Unknown date";
    // Use Gemini API data if available, otherwise fall back to original logic
    if (currentCrop.harvestData && currentCrop.harvestData.formattedHarvestDate) {
      harvestDate = currentCrop.harvestData.formattedHarvestDate;
    } else if (currentCrop.plantedDate) {
      try {
        const planted = currentCrop.plantedDate.toDate ? currentCrop.plantedDate.toDate() : new Date(currentCrop.plantedDate);
        const baseDate = new Date(planted);
        let daysToHarvest = 90; // Default

        if (currentCrop.name.toLowerCase().includes("rice")) {
          daysToHarvest = 120;
        } else if (currentCrop.name.toLowerCase().includes("corn")) {
          daysToHarvest = 100;
        }

        baseDate.setDate(baseDate.getDate() + daysToHarvest);
        harvestDate = baseDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch (e) {
        harvestDate = "Unknown date";
      }
    }

    // Calculate growth stage (similar to CropDetails page)
    let growthStage = "Unknown";
    // Use Gemini API data if available, otherwise fall back to original logic
    if (currentCrop.harvestData && currentCrop.harvestData.growthStage) {
      growthStage = currentCrop.harvestData.growthStage;
    } else if (currentCrop.plantedDate) {
      try {
        const planted = currentCrop.plantedDate.toDate ? currentCrop.plantedDate.toDate() : new Date(currentCrop.plantedDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - planted.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) growthStage = 'Germination';
        else if (diffDays < 60) growthStage = 'Vegetative';
        else if (diffDays < 90) growthStage = 'Flowering';
        else growthStage = 'Fruiting';
      } catch (e) {
        growthStage = "Unknown";
      }
    }

    // Calculate productivity based on checklist completion (similar to CropDetails)
    let productivityIndex = 0;
    if (currentCrop.checklist && currentCrop.checklist.length > 0) {
      const completed = currentCrop.checklist.filter((item: any) => item.completed).length;
      productivityIndex = Math.round((completed / currentCrop.checklist.length) * 100);
    }

    return {
      currentCrop: currentCrop.name,
      plantedArea: `${currentCrop.landArea} hectares`,
      nextHarvest: harvestDate,
      growthStage: growthStage,
      productivityIndex: productivityIndex
    };
  };

  // Navigation functions
  const goToPreviousCrop = () => {
    if (cropHistory.length > 1) {
      setCurrentCropIndex(prev => (prev === 0 ? cropHistory.length - 1 : prev - 1));
    }
  };

  const goToNextCrop = () => {
    if (cropHistory.length > 1) {
      setCurrentCropIndex(prev => (prev === cropHistory.length - 1 ? 0 : prev + 1));
    }
  };

  // Function to handle crop card click - opens checklist dialog
  const handleCropCardClick = () => {
    if (cropHistory.length > 0) {
      const currentCrop = cropHistory[currentCropIndex];

      // Set selected crop ID
      if (currentCrop.id) {
        setSelectedCropId(currentCrop.id);
        // Open dialog
        setIsChecklistDialogOpen(true);
      }
    }
  };

  // Function to handle checklist item toggle
  const handleToggleChecklistItem = async (itemId: string) => {
    if (!selectedCropId) return;

    // Get the current crop
    const currentCrop = cropHistory.find(crop => crop.id === selectedCropId);
    if (!currentCrop) return;

    // Ensure we have a complete checklist
    const completeChecklist = ensureCompleteChecklist(currentCrop.checklist || [], currentCrop.name);

    // Update the checklist item
    const updatedChecklist = completeChecklist.map(item => {
      if (item.id === itemId) {
        const newCompletedStatus = !item.completed;
        return {
          ...item,
          completed: newCompletedStatus,
          completedAt: newCompletedStatus ? new Date().toISOString() : undefined
        };
      }
      return item;
    });

    // Update in Firestore and local state
    try {
      await updateCrop(selectedCropId, { checklist: updatedChecklist });
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  // Get the crop data for display
  const cropData = getCropData();

  // Reset current crop index when crop history changes
  useEffect(() => {
    setCurrentCropIndex(0);
  }, [cropHistory]);

  // Get the selected crop for the checklist dialog
  const selectedCrop = selectedCropId ? cropHistory.find(crop => crop.id === selectedCropId) : null;

  // Ensure we have a complete checklist for the selected crop
  let selectedCropChecklist: any[] = [];
  if (selectedCrop) {
    selectedCropChecklist = ensureCompleteChecklist(selectedCrop.checklist || [], selectedCrop.name);
  }

  // Calculate productivity for the selected crop
  let checklistProductivity = 0;
  if (selectedCropChecklist.length > 0) {
    const completed = selectedCropChecklist.filter((item: any) => item.completed).length;
    checklistProductivity = Math.round((completed / selectedCropChecklist.length) * 100);
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Mabuhay, {username}!</h1>
          </div>
          <p className="text-primary-foreground/90">
            I-type ang inyong problema sa sakahan para makakuha ng crop recommendations.
          </p>
        </div>

        {/* Deletion Request Status Banner */}
        {deletionRequest && showDeletionNotification && (
          <Card className="border-l-4 p-4 rounded-r-lg relative">
            <button
              onClick={closeDeletionNotification}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {deletionRequest.status === 'pending' && (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <h3 className="font-medium">Deletion Request Pending</h3>
                      <p className="text-sm text-muted-foreground">
                        Your request is awaiting admin approval
                      </p>
                    </div>
                  </>
                )}
                {deletionRequest.status === 'approved' && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <h3 className="font-medium">Deletion Request Approved</h3>
                      <p className="text-sm text-muted-foreground">
                        You can now delete your account
                      </p>
                    </div>
                  </>
                )}
                {deletionRequest.status === 'denied' && (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <h3 className="font-medium">Deletion Request Denied</h3>
                      <p className="text-sm text-muted-foreground">
                        Your request was denied by admin. You can request again.
                      </p>
                    </div>
                  </>
                )}
              </div>
              {deletionRequest.status === 'approved' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteAccountDialogOpen(true)}
                >
                  Delete Account
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Profile Card and Weather Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          <ProfileCard
            username={username}
            farmerProfile={farmerProfile}
            onEditProfile={() => setIsEditProfileDialogOpen(true)}
          />
          <WeatherCard
            weatherData={weatherData || {
              temperature: 0,
              condition: "Loading...",
              humidity: 0,
              rainfall: 0,
              forecast: [],
              extendedForecast: []
            }}
            forecastView={forecastView}
            onForecastViewChange={setForecastView}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={getAvailableDates()}
          />
          {/* Updated CropStatusCard with navigation buttons */}
          <div className="relative">
            {cropHistory.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-4 left-4 h-8 w-8 p-0 z-10"
                  onClick={goToPreviousCrop}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-4 right-4 h-8 w-8 p-0 z-10"
                  onClick={goToNextCrop}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <CropStatusCard cropData={cropData} onClick={handleCropCardClick} />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions
          onAddCrop={() => setIsAddCropDialogOpen(true)}
          onUpdateCrop={() => setIsUpdateCropDialogOpen(true)}
          farmerProfile={farmerProfile}
          weatherData={weatherData}
          userId={userId} // Pass userId to QuickActions
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Report Input Form */}
          <ReportForm
            reportText={reportText}
            onReportTextChange={setReportText}
            onSubmitReport={handleSubmitReport}
            isProcessing={isProcessing}
          />

          {/* Recommendation Results */}
          <div className="relative">
            <RecommendationResults recommendation={recommendation} />
            {recommendation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="absolute top-4 right-4 h-8 w-8 p-0"
                title="Clear recommendations"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Market Demand Card */}
        <MarketDemandCard />

        {/* Dialogs */}
        <EditProfileDialog
          open={isEditProfileDialogOpen}
          onOpenChange={(open) => {
            setIsEditProfileDialogOpen(open);
            // Reset the edit profile data when the dialog is closed
            if (!open) {
              resetEditProfileData();
            }
          }}
          farmerProfile={editProfileData}
          profileImageFile={profileImageFile}
          handleProfileInputChange={handleProfileInputChange}
          handleProfileImageUpload={handleProfileImageUpload}
          handleUpdateProfile={handleUpdateProfile}
          onRequestAccountDeletion={handleDeletionButtonClick}
          username={username}
          deletionRequest={deletionRequest}
          isDeletionButtonDisabled={isDeletionButtonDisabled()}
          getDeletionButtonText={getDeletionButtonText}
        />

        <AddCropDialog
          open={isAddCropDialogOpen}
          onOpenChange={setIsAddCropDialogOpen}
          newCrop={newCrop}
          handleCropInputChange={handleCropInputChange}
          handleSoilTypeChange={handleSoilTypeChange}
          handleAddCrop={handleAddCrop}
          userRole="farmer" // Pass user role to AddCropDialog
        />

        <UpdateCropDialog
          open={isUpdateCropDialogOpen}
          onOpenChange={setIsUpdateCropDialogOpen}
          selectCropForEditing={selectCropForEditing}
          setIsEditCropDialogOpen={setIsEditCropDialogOpen}
        />
        {/* crops prop removed from UpdateCropDialog - now using CropContext internally */}

        <EditCropDialog
          open={isEditCropDialogOpen}
          onOpenChange={setIsEditCropDialogOpen}
          editCrop={editCrop}
          handleEditCropInputChange={handleEditCropInputChange}
          handleEditSoilTypeChange={handleEditSoilTypeChange}
          handleEditCropSubmit={handleEditCropSubmit}
        />

        <RequestAccountDeletionDialog
          open={isRequestDeleteDialogOpen}
          onOpenChange={setIsRequestDeleteDialogOpen}
          isRequestingDeletion={isRequestingDeletion}
          handleRequestAccountDeletion={handleRequestAccountDeletionWrapper}
        />

        <DeleteAccountDialog
          open={isDeleteAccountDialogOpen}
          onOpenChange={setIsDeleteAccountDialogOpen}
          handleDeleteAccount={handleDeleteAccount}
        />

        {/* Maintenance Checklist Dialog */}
        <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Maintenance Checklist</DialogTitle>
            </DialogHeader>
            {selectedCrop && (
              <MaintenanceChecklistCard
                checklist={selectedCropChecklist}
                productivityData={[]} // This would need to be calculated properly in a full implementation
                checklistProductivity={checklistProductivity}
                onToggleItem={handleToggleChecklistItem}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FarmerDashboard;
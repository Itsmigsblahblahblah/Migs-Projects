import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Sprout, Leaf } from "lucide-react";
import ProfileCard from "@/components/dashboard/farmer/ProfileCard";
import WeatherCard from "@/components/dashboard/farmer/WeatherCard";
import CropStatusCard from "@/components/dashboard/farmer/CropStatusCard";
import QuickActions from "@/components/dashboard/farmer/QuickActions";
import ReportForm from "@/components/dashboard/farmer/ReportForm";
import RecommendationResults from "@/components/dashboard/farmer/RecommendationResults";
import TaskReminders from "@/components/dashboard/farmer/TaskReminders";
import QuickStats from "@/components/dashboard/farmer/QuickStats";
import EditProfileDialog from "@/components/dashboard/farmer/EditProfileDialog";
import AddCropDialog from "@/components/dashboard/farmer/AddCropDialog";
import UpdateCropDialog from "@/components/dashboard/farmer/UpdateCropDialog";
import EditCropDialog from "@/components/dashboard/farmer/EditCropDialog";
import RequestAccountDeletionDialog from "@/components/dashboard/farmer/RequestAccountDeletionDialog";
import DeleteAccountDialog from "@/components/dashboard/farmer/DeleteAccountDialog";
import { useFarmerDashboard } from "@/hooks/custom/useFarmerDashboard";
import { useCropManagement } from "@/hooks/custom/useCropManagement";
import { useReportManagement } from "@/hooks/custom/useReportManagement";

// Mock data
const mockWeatherData = {
  temperature: 28,
  condition: "Sunny",
  humidity: 65,
  rainfall: 0,
  forecast: [
    { day: "Today", condition: "Sunny", high: 30, low: 24 },
    { day: "Tomorrow", condition: "Partly Cloudy", high: 29, low: 23 },
    { day: "Wednesday", condition: "Rain", high: 26, low: 22 }
  ]
};

const mockCropData = {
  currentCrop: "Rice",
  plantedArea: "2 hectares",
  nextHarvest: "Nov 15, 2025",
  growthStage: "Flowering",
  productivityIndex: 85
};

const mockTasks = [
  { id: 1, title: "Fertilize rice field", dueDate: "2025-10-15", priority: "high" as const },
  { id: 2, title: "Check irrigation system", dueDate: "2025-10-18", priority: "medium" as const },
  { id: 3, title: "Pest inspection", dueDate: "2025-10-20", priority: "low" as const }
];

const FarmerDashboard = () => {
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [isUpdateCropDialogOpen, setIsUpdateCropDialogOpen] = useState(false);
  const [isEditCropDialogOpen, setIsEditCropDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isRequestDeleteDialogOpen, setIsRequestDeleteDialogOpen] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  const {
    username,
    userId,
    monthlyReports,
    deletionRequest,
    farmerProfile,
    profileImageFile,
    crops,
    setUsername,
    setProfileImageFile,
    handleProfileInputChange,
    handleProfileImageUpload,
    handleUpdateProfile,
    handleRequestAccountDeletion,
    handleDeleteAccount,
  } = useFarmerDashboard();

  const {
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

  const handleRequestAccountDeletionWrapper = async () => {
    setIsRequestingDeletion(true);
    try {
      await handleRequestAccountDeletion();
    } finally {
      setIsRequestingDeletion(false);
    }
  };

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

        {/* Profile Card and Weather Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          <ProfileCard
            username={username}
            farmerProfile={farmerProfile}
            onEditProfile={() => setIsEditProfileDialogOpen(true)}
          />
          <WeatherCard weatherData={mockWeatherData} />
          <CropStatusCard cropData={mockCropData} />
        </div>

        {/* Quick Actions */}
        <QuickActions
          onAddCrop={() => setIsAddCropDialogOpen(true)}
          onUpdateCrop={() => setIsUpdateCropDialogOpen(true)}
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
          <RecommendationResults recommendation={recommendation} />
        </div>

        {/* Task Reminders */}
        <TaskReminders tasks={mockTasks} />

        {/* Quick Stats */}
        <QuickStats
          monthlyReports={monthlyReports}
          successRate={85}
          activeFields={3}
        />

        {/* Dialogs */}
        <EditProfileDialog
          open={isEditProfileDialogOpen}
          onOpenChange={setIsEditProfileDialogOpen}
          farmerProfile={farmerProfile}
          profileImageFile={profileImageFile}
          handleProfileInputChange={handleProfileInputChange}
          handleProfileImageUpload={handleProfileImageUpload}
          handleUpdateProfile={handleUpdateProfile}
          onRequestAccountDeletion={() => {
            setIsEditProfileDialogOpen(false);
            setIsRequestDeleteDialogOpen(true);
          }}
          username={username}
        />

        <AddCropDialog
          open={isAddCropDialogOpen}
          onOpenChange={setIsAddCropDialogOpen}
          newCrop={newCrop}
          handleCropInputChange={handleCropInputChange}
          handleAddCrop={handleAddCrop}
        />

        <UpdateCropDialog
          open={isUpdateCropDialogOpen}
          onOpenChange={setIsUpdateCropDialogOpen}
          crops={crops}
          selectCropForEditing={selectCropForEditing}
          setIsEditCropDialogOpen={setIsEditCropDialogOpen}
        />

        <EditCropDialog
          open={isEditCropDialogOpen}
          onOpenChange={setIsEditCropDialogOpen}
          editCrop={editCrop}
          handleEditCropInputChange={handleEditCropInputChange}
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
      </div>
    </Layout>
  );
};

export default FarmerDashboard;
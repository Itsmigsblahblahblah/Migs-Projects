import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Sprout, Leaf, User, Upload, Trash2, Clock, AlertTriangle } from "lucide-react";
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
import ProfileCard from "@/components/dashboard/farmer/ProfileCard";
import WeatherCard from "@/components/dashboard/farmer/WeatherCard";
import CropStatusCard from "@/components/dashboard/farmer/CropStatusCard";
import QuickActions from "@/components/dashboard/farmer/QuickActions";
import ReportForm from "@/components/dashboard/farmer/ReportForm";
import RecommendationResults from "@/components/dashboard/farmer/RecommendationResults";
import TaskReminders from "@/components/dashboard/farmer/TaskReminders";
import QuickStats from "@/components/dashboard/farmer/QuickStats";
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
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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

        {/* Edit Profile Dialog */}
        <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your profile information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="space-y-2">
                <Label htmlFor="profile-image">Profile Picture</Label>
                <div className="flex items-center gap-4">
                  {farmerProfile.photoURL ? (
                    <img
                      src={farmerProfile.photoURL}
                      alt={username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-secondary rounded-full p-4">
                      <User className="h-8 w-8 text-secondary-foreground" />
                    </div>
                  )}
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('profile-image')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {profileImageFile ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </div>
              </div>

              {/* Full Name and Contact Number - Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-fullName">Full Name</Label>
                  <Input
                    id="profile-fullName"
                    name="fullName"
                    value={farmerProfile.fullName}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-contactNumber">Contact Number</Label>
                  <Input
                    id="profile-contactNumber"
                    name="contactNumber"
                    value={farmerProfile.contactNumber}
                    onChange={handleProfileInputChange}
                    placeholder="e.g., 09123456789"
                  />
                </div>
              </div>

              {/* Email (Disabled) - Full width */}
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email (Cannot be edited)</Label>
                <Input
                  id="profile-email"
                  name="email"
                  value={farmerProfile.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              {/* Home Address and Farm Address - Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-homeAddress">Home Address</Label>
                  <Input
                    id="profile-homeAddress"
                    name="homeAddress"
                    value={farmerProfile.homeAddress}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your home address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-farmAddress">Farm Address</Label>
                  <Input
                    id="profile-farmAddress"
                    name="farmAddress"
                    value={farmerProfile.farmAddress}
                    onChange={handleProfileInputChange}
                    placeholder="Enter your farm location"
                  />
                </div>
              </div>

              {/* Farm Area - Full width */}
              <div className="space-y-2">
                <Label htmlFor="profile-farmArea">Farm Area (hectares)</Label>
                <Input
                  id="profile-farmArea"
                  name="farmArea"
                  value={farmerProfile.farmArea}
                  onChange={handleProfileInputChange}
                  placeholder="e.g., 2.5 hectares"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsEditProfileDialogOpen(false);
                  setIsRequestDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsEditProfileDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    await handleUpdateProfile();
                    setIsEditProfileDialogOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Crop Dialog */}
        <Dialog open={isAddCropDialogOpen} onOpenChange={setIsAddCropDialogOpen}>
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
              <Button variant="outline" onClick={() => setIsAddCropDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCropSubmit}>
                Add Crop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Crop Dialog */}
        <Dialog open={isUpdateCropDialogOpen} onOpenChange={setIsUpdateCropDialogOpen}>
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
                          setIsUpdateCropDialogOpen(false);
                          setIsEditCropDialogOpen(true);
                        }}
                      >
                        <div className="font-medium">{crop.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {crop.landArea} hectares • {crop.quantity} kg
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
              <Button variant="outline" onClick={() => setIsUpdateCropDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Crop Dialog */}
        <Dialog open={isEditCropDialogOpen} onOpenChange={setIsEditCropDialogOpen}>
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
              <Button variant="outline" onClick={() => setIsEditCropDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditCropSubmitWrapper}>
                Update Crop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Account Deletion Dialog */}
        <Dialog open={isRequestDeleteDialogOpen} onOpenChange={setIsRequestDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Request Account Deletion
              </DialogTitle>
              <DialogDescription>
                Submit a request to delete your account. An admin will review your request before you can proceed with deletion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-warning/10 border border-warning/20 rounded-md p-4 space-y-2">
                <p className="text-sm font-medium text-warning">Next Steps:</p>
                <ul className="text-sm text-warning/90 list-disc list-inside space-y-1">
                  <li>Your request will be sent to the admin for review</li>
                  <li>Wait for admin approval</li>
                  <li>Once approved, you can delete your account permanently</li>
                  <li>All your data will be removed from the system</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRequestDeleteDialogOpen(false)}
                disabled={isRequestingDeletion}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestAccountDeletion}
                disabled={isRequestingDeletion}
              >
                {isRequestingDeletion ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  "Submit Deletion Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Confirmation Dialog */}
        <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Account Deletion</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-lg bg-destructive/10 p-4">
                <h4 className="font-medium text-destructive mb-2">Warning</h4>
                <p className="text-sm text-destructive">
                  All your data including profile, crops, reports, and history will be permanently deleted.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">
                  Type "DELETE" to confirm
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Type DELETE"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteAccountDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await handleDeleteAccount(deleteConfirmPassword);
                  if (!document.querySelector('.toast-destructive')) { // Only close if no error toast
                    setIsDeleteAccountDialogOpen(false);
                    setDeleteConfirmPassword("");
                  }
                }}
                disabled={deleteConfirmPassword !== 'DELETE'}
              >
                Permanently Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default FarmerDashboard;
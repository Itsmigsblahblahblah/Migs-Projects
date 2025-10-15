import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCrops } from "@/contexts/CropContext";
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import {
  Sprout,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Camera,
  Send,
  TrendingUp,
  Calendar,
  MapPin,
  User,
  Wheat,
  Sun,
  CloudRain,
  Clock,
  Bell,
  Plus,
  Eye,
  Edit,
  Leaf,
  Edit2,
  Upload,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Mock NLP and DSS System
const processReport = (text: string) => {
  const problems = {
    flood: ['baha', 'flood', 'tubig', 'ulan', 'nalubog'],
    pest: ['insekto', 'pest', 'uod', 'peste', 'damage'],
    drought: ['tuyo', 'dry', 'walang tubig', 'drought', 'init'],
    disease: ['sakit', 'disease', 'bulok', 'rot', 'fungus']
  };

  const crops = {
    corn: ['mais', 'corn'],
    rice: ['bigas', 'rice', 'palay'],
    tomato: ['kamatis', 'tomato'],
    cabbage: ['repolyo', 'cabbage'],
    eggplant: ['talong', 'eggplant']
  };

  let detectedProblem = 'general';
  let affectedCrop = 'unknown';

  // Simple NLP simulation
  const lowerText = text.toLowerCase();

  for (const [problem, keywords] of Object.entries(problems)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      detectedProblem = problem;
      break;
    }
  }

  for (const [crop, keywords] of Object.entries(crops)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      affectedCrop = crop;
      break;
    }
  }

  // DSS Logic
  const recommendations = {
    flood: {
      avoid: ['Corn', 'Tomato', 'Eggplant'],
      recommend: ['Kangkong', 'Gabi', 'Rice (flood-tolerant variety)'],
      advice: 'Consider raised bed planting and improved drainage systems. Plant flood-tolerant crops during rainy season.'
    },
    pest: {
      avoid: ['Cabbage', 'Tomato'],
      recommend: ['Corn', 'Root vegetables', 'Herbs'],
      advice: 'Implement integrated pest management. Use organic pesticides and companion planting techniques.'
    },
    drought: {
      avoid: ['Rice', 'Leafy vegetables'],
      recommend: ['Cassava', 'Sweet potato', 'Drought-resistant corn varieties'],
      advice: 'Install drip irrigation systems. Mulch around plants to retain moisture.'
    },
    disease: {
      avoid: ['Tomato', 'Eggplant'],
      recommend: ['Root crops', 'Legumes'],
      advice: 'Ensure proper crop rotation and soil sterilization. Remove infected plants immediately.'
    },
    general: {
      avoid: [],
      recommend: ['Seasonal vegetables', 'Local varieties'],
      advice: 'Consult with local agricultural officer for specific recommendations.'
    }
  };

  return {
    problem: detectedProblem,
    crop: affectedCrop,
    ...recommendations[detectedProblem as keyof typeof recommendations]
  };
};

// Mock weather data
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

// Mock crop data
const mockCropData = {
  currentCrop: "Rice",
  plantedArea: "2 hectares",
  nextHarvest: "Nov 15, 2025",
  growthStage: "Flowering",
  productivityIndex: 85
};

// Mock tasks data
const mockTasks = [
  { id: 1, title: "Fertilize rice field", dueDate: "2025-10-15", priority: "high" },
  { id: 2, title: "Check irrigation system", dueDate: "2025-10-18", priority: "medium" },
  { id: 3, title: "Pest inspection", dueDate: "2025-10-20", priority: "low" }
];

// Mock notifications
const mockNotifications = [
  { id: 1, title: "Weather Alert", message: "Heavy rain expected tomorrow", time: "2 hours ago", type: "warning" },
  { id: 2, title: "Task Reminder", message: "Fertilize rice field due today", time: "5 hours ago", type: "info" },
  { id: 3, title: "System Update", message: "New crop recommendations available", time: "1 day ago", type: "success" }
];

const FarmerDashboard = () => {
  const [reportText, setReportText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [monthlyReports, setMonthlyReports] = useState(0);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [isUpdateCropDialogOpen, setIsUpdateCropDialogOpen] = useState(false);
  const [isEditCropDialogOpen, setIsEditCropDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
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
  const [farmerProfile, setFarmerProfile] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    homeAddress: "",
    farmAddress: "",
    farmArea: "",
    photoURL: ""
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const { addCrop, crops, getCropById, updateCrop } = useCrops();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize user data
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');
    const uid = localStorage.getItem('userId') || user || 'default-user';

    if (role !== 'farmer') {
      navigate('/');
      return;
    }

    setUsername(user || 'Farmer');
    setUserId(uid);

    // Load monthly report count
    loadMonthlyReportCount(uid);
    
    // Load farmer profile
    loadFarmerProfile(uid);
  }, [navigate]);

  const loadFarmerProfile = async (uid: string) => {
    try {
      const farmerDoc = await getDoc(doc(db, "farmers", uid));
      if (farmerDoc.exists()) {
        const data = farmerDoc.data();
        setFarmerProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          contactNumber: data.contactNumber || "",
          homeAddress: data.homeAddress || "",
          farmAddress: data.farmAddress || "",
          farmArea: data.farmArea || "2.5 hectares",
          photoURL: data.photoURL || ""
        });
      }
    } catch (error) {
      console.error("Error loading farmer profile:", error);
    }
  };

  const loadMonthlyReportCount = async (uid: string) => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const reportsRef = collection(db, "farmReports");
      const q = query(
        reportsRef,
        where("userId", "==", uid),
        where("createdAt", ">=", Timestamp.fromDate(firstDayOfMonth))
      );

      const querySnapshot = await getDocs(q);
      setMonthlyReports(querySnapshot.size);
    } catch (error) {
      console.error("Error loading monthly report count:", error);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      toast({
        title: "Walang input",
        description: "Pakitype ang inyong problema sa sakahan.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = processReport(reportText);
      setRecommendation(result);

      // Save to Firestore
      const reportData = {
        userId: userId,
        username: username,
        reportText: reportText,
        problem: result.problem,
        affectedCrop: result.crop,
        recommendedCrops: result.recommend,
        cropsToAvoid: result.avoid,
        advice: result.advice,
        hasImage: selectedImage !== null,
        imageName: selectedImage?.name || null,
        createdAt: Timestamp.now(),
        status: 'processed'
      };

      await addDoc(collection(db, "farmReports"), reportData);

      toast({
        title: "Recommendation Ready",
        description: "Nakuha na namin ang inyong crop recommendation at nai-save na sa database!",
      });

      // Update monthly count
      setMonthlyReports(prev => prev + 1);

      // Clear form
      setReportText("");
      setSelectedImage(null);

    } catch (error) {
      console.error("Error saving report:", error);
      toast({
        title: "Error",
        description: "May problema sa pag-save ng report sa database. Subukan ulit.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      toast({
        title: "Image uploaded",
        description: "Larawan ay nai-upload na para sa analysis.",
      });
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFarmerProfile(prev => ({
          ...prev,
          photoURL: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
      toast({
        title: "Image Selected",
        description: "Profile picture selected. Click Submit to save.",
      });
    }
  };

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFarmerProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async () => {
    try {
      const updates: any = {
        fullName: farmerProfile.fullName,
        contactNumber: farmerProfile.contactNumber,
        homeAddress: farmerProfile.homeAddress,
        farmAddress: farmerProfile.farmAddress,
        farmArea: farmerProfile.farmArea
      };

      // If there's a new profile image, save it (for now just save the data URL)
      // In production, you'd upload to Firebase Storage
      if (profileImageFile) {
        updates.photoURL = farmerProfile.photoURL;
      }

      await updateDoc(doc(db, "farmers", userId), updates);

      // Update username in localStorage if name changed
      if (farmerProfile.fullName !== username) {
        localStorage.setItem('username', farmerProfile.fullName);
        setUsername(farmerProfile.fullName);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setIsEditProfileDialogOpen(false);
      setProfileImageFile(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No authenticated user found");
      }

      // Re-authenticate user before deletion (required by Firebase)
      const credential = EmailAuthProvider.credential(user.email, deleteConfirmPassword);
      await reauthenticateWithCredential(user, credential);

      // Delete all user data from Firestore using batch
      const batch = writeBatch(db);

      // Delete farmer document
      batch.delete(doc(db, "farmers", userId));

      // Delete all farmer crops
      const cropsQuery = query(collection(db, "farmerCrops"), where("userId", "==", userId));
      const cropsSnapshot = await getDocs(cropsQuery);
      cropsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete all farm reports
      const reportsQuery = query(collection(db, "farmReports"), where("userId", "==", userId));
      const reportsSnapshot = await getDocs(reportsQuery);
      reportsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Commit all Firestore deletions
      await batch.commit();

      // Delete Firebase Auth account (must be last)
      await deleteUser(user);

      // Clear local storage
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Redirect to login page
      navigate('/login');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      
      let errorMessage = "Failed to delete account. Please try again.";
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log in again before deleting your account.";
      }

      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmPassword("");
    }
  };

  // Handle crop input changes
  const handleCropInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCrop(prev => ({
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

      // Reset form and close dialog
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
      setIsAddCropDialogOpen(false);
    } catch (error) {
      console.error("Error saving crop:", error);
      toast({
        title: "Error",
        description: "Failed to add crop to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle edit crop input changes
  const handleEditCropInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditCrop(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit crop submission
  const handleEditCrop = async () => {
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

      // Reset form and close dialog
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
      setIsEditCropDialogOpen(false);
      setIsUpdateCropDialogOpen(false);
    } catch (error) {
      console.error("Error updating crop:", error);
      toast({
        title: "Error",
        description: "Failed to update crop in database. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'rain': return <CloudRain className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5 text-yellow-500" />;
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
          {/* Profile Card */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Farmer Profile
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditProfileDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {farmerProfile.photoURL ? (
                  <img
                    src={farmerProfile.photoURL}
                    alt={username}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-secondary rounded-full p-3">
                    <User className="h-6 w-6 text-secondary-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{farmerProfile.fullName || username}</h3>
                  <p className="text-sm text-muted-foreground">Majayjay, Batangas</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Farm Area:</span>
                  <span>{farmerProfile.farmArea || '2.5 hectares'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{farmerProfile.farmAddress || 'Barangay 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span>Jan 2025</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Section */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Weather & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getWeatherIcon(mockWeatherData.condition)}
                  <div>
                    <p className="text-2xl font-bold">{mockWeatherData.temperature}°C</p>
                    <p className="text-sm text-muted-foreground">{mockWeatherData.condition}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Humidity</p>
                  <p>{mockWeatherData.humidity}%</p>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">3-Day Forecast</h4>
                <div className="space-y-2">
                  {mockWeatherData.forecast.map((day, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{day.day}</span>
                      <div className="flex items-center gap-2">
                        {getWeatherIcon(day.condition)}
                        <span>{day.high}°/{day.low}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crop Status Overview */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="h-5 w-5" />
                Crop Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-success/10 p-2 rounded-full">
                  <Wheat className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">{mockCropData.currentCrop}</h3>
                  <p className="text-sm text-muted-foreground">{mockCropData.plantedArea}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Harvest:</span>
                  <span className="font-medium">{mockCropData.nextHarvest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Growth Stage:</span>
                  <Badge variant="outline">{mockCropData.growthStage}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Productivity:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-secondary rounded-full h-2">
                      <div
                        className="bg-success h-2 rounded-full"
                        style={{ width: `${mockCropData.productivityIndex}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{mockCropData.productivityIndex}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isAddCropDialogOpen} onOpenChange={setIsAddCropDialogOpen}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/history')}>
                  <Eye className="h-5 w-5" />
                  <span>View Reports</span>
                </Button>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-20 flex flex-col gap-2">
                    <Plus className="h-5 w-5" />
                    <span>Add Crop</span>
                  </Button>
                </DialogTrigger>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setIsUpdateCropDialogOpen(true)}>
                  <Edit className="h-5 w-5" />
                  <span>Update Crop</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/crop-history')}>
                  <Leaf className="h-5 w-5" />
                  <span>Crop History</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/alerts')}>
                  <Bell className="h-5 w-5" />
                  <span>Alerts</span>
                </Button>
              </div>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Crop</DialogTitle>
                  <DialogDescription>
                    Enter the details of your new crop planting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Crop Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newCrop.name}
                      onChange={handleCropInputChange}
                      placeholder="e.g., Rice, Tomato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="landArea">Crop Land Area *</Label>
                    <Input
                      id="landArea"
                      name="landArea"
                      value={newCrop.landArea}
                      onChange={handleCropInputChange}
                      placeholder="e.g., 2 hectares"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Crop Quantity (kg) *</Label>
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
                    <Label htmlFor="soilType">Soil Type (General) *</Label>
                    <Input
                      id="soilType"
                      name="soilType"
                      value={newCrop.soilType}
                      onChange={handleCropInputChange}
                      placeholder="e.g., Loam Soil"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="nitrogen">Nitrogen</Label>
                      <Input
                        id="nitrogen"
                        name="nitrogen"
                        type="number"
                        value={newCrop.nitrogen}
                        onChange={handleCropInputChange}
                        placeholder="N"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phosphorus">Phosphorus</Label>
                      <Input
                        id="phosphorus"
                        name="phosphorus"
                        type="number"
                        value={newCrop.phosphorus}
                        onChange={handleCropInputChange}
                        placeholder="P"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="potassium">Potassium</Label>
                      <Input
                        id="potassium"
                        name="potassium"
                        type="number"
                        value={newCrop.potassium}
                        onChange={handleCropInputChange}
                        placeholder="K"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="puhunan">Puhunan (₱) *</Label>
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
                  <Button onClick={handleAddCrop}>
                    Submit Crop
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isUpdateCropDialogOpen} onOpenChange={setIsUpdateCropDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Select Crop to Update</DialogTitle>
                  <DialogDescription>
                    Choose a crop from your history to update its details.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {crops.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Leaf className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No crops found in your history.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {crops.map((crop) => (
                        <div
                          key={crop.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
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
                            setIsEditCropDialogOpen(true);
                          }}
                        >
                          <div>
                            <h4 className="font-medium">{crop.name}</h4>
                            <p className="text-sm text-muted-foreground">{crop.landArea} • {crop.quantity} kg</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
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
                              setIsEditCropDialogOpen(true);
                            }}
                          >
                            Update Crop
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUpdateCropDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isEditCropDialogOpen} onOpenChange={setIsEditCropDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Update Crop Details</DialogTitle>
                  <DialogDescription>
                    Edit the details of your crop planting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Crop Name *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      value={editCrop.name}
                      onChange={handleEditCropInputChange}
                      placeholder="e.g., Rice, Tomato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-landArea">Crop Land Area *</Label>
                    <Input
                      id="edit-landArea"
                      name="landArea"
                      value={editCrop.landArea}
                      onChange={handleEditCropInputChange}
                      placeholder="e.g., 2 hectares"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-quantity">Crop Quantity (kg) *</Label>
                    <Input
                      id="edit-quantity"
                      name="quantity"
                      type="number"
                      value={editCrop.quantity}
                      onChange={handleEditCropInputChange}
                      placeholder="e.g., 1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-soilType">Soil Type (General) *</Label>
                    <Input
                      id="edit-soilType"
                      name="soilType"
                      value={editCrop.soilType}
                      onChange={handleEditCropInputChange}
                      placeholder="e.g., Loam Soil"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nitrogen">Nitrogen</Label>
                      <Input
                        id="edit-nitrogen"
                        name="nitrogen"
                        type="number"
                        value={editCrop.nitrogen}
                        onChange={handleEditCropInputChange}
                        placeholder="N"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phosphorus">Phosphorus</Label>
                      <Input
                        id="edit-phosphorus"
                        name="phosphorus"
                        type="number"
                        value={editCrop.phosphorus}
                        onChange={handleEditCropInputChange}
                        placeholder="P"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-potassium">Potassium</Label>
                      <Input
                        id="edit-potassium"
                        name="potassium"
                        type="number"
                        value={editCrop.potassium}
                        onChange={handleEditCropInputChange}
                        placeholder="K"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-puhunan">Puhunan (₱) *</Label>
                    <Input
                      id="edit-puhunan"
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
                  <Button onClick={handleEditCrop}>
                    Update Crop
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Profile Dialog */}
            <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
              <DialogContent className="max-w-md">
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
                          alt="Profile Preview"
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

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="profile-fullName">Full Name *</Label>
                    <Input
                      id="profile-fullName"
                      name="fullName"
                      value={farmerProfile.fullName}
                      onChange={handleProfileInputChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-2">
                    <Label htmlFor="profile-contactNumber">Contact Number *</Label>
                    <Input
                      id="profile-contactNumber"
                      name="contactNumber"
                      value={farmerProfile.contactNumber}
                      onChange={handleProfileInputChange}
                      placeholder="e.g., 09123456789"
                    />
                  </div>

                  {/* Email (Disabled) */}
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

                  {/* Home Address */}
                  <div className="space-y-2">
                    <Label htmlFor="profile-homeAddress">Home Address *</Label>
                    <Input
                      id="profile-homeAddress"
                      name="homeAddress"
                      value={farmerProfile.homeAddress}
                      onChange={handleProfileInputChange}
                      placeholder="Enter your home address"
                    />
                  </div>

                  {/* Farm Address */}
                  <div className="space-y-2">
                    <Label htmlFor="profile-farmAddress">Farm Address *</Label>
                    <Input
                      id="profile-farmAddress"
                      name="farmAddress"
                      value={farmerProfile.farmAddress}
                      onChange={handleProfileInputChange}
                      placeholder="Enter your farm location"
                    />
                  </div>

                  {/* Farm Area */}
                  <div className="space-y-2">
                    <Label htmlFor="profile-farmArea">Farm Area *</Label>
                    <Input
                      id="profile-farmArea"
                      name="farmArea"
                      value={farmerProfile.farmArea}
                      onChange={handleProfileInputChange}
                      placeholder="e.g., 2.5 hectares"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setIsEditProfileDialogOpen(false);
                      setIsDeleteAccountDialogOpen(true);
                    }}
                    className="flex items-center gap-2 sm:mr-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditProfileDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile}>
                      Submit
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Account Confirmation Dialog */}
            <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-2">
                    <p className="text-sm font-medium text-destructive">Warning: This will delete:</p>
                    <ul className="text-sm text-destructive/90 list-disc list-inside space-y-1">
                      <li>Your profile and personal information</li>
                      <li>All your crop records</li>
                      <li>All your farm reports and history</li>
                      <li>Your authentication account</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delete-password" className="text-destructive">
                      Enter your password to confirm *
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isDeletingAccount}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDeleteAccountDialogOpen(false);
                      setDeleteConfirmPassword("");
                    }}
                    disabled={isDeletingAccount}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </div>
                    ) : (
                      "Delete My Account Permanently"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Report Input Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Report Farm Problem
              </CardTitle>
              <CardDescription>
                Describe your farming issue in detail to get personalized recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problem">Problema sa Sakahan</Label>
                <Textarea
                  id="problem"
                  placeholder="Halimbawa: 'Nalubog sa baha ang tanim kong mais sa nakaraang linggo...'"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="min-h-32 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Upload Larawan (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('image')?.click()}
                    className="flex w-full items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {selectedImage ? 'Change Photo' : 'Add Photo'}
                  </Button>
                  {selectedImage && (
                    <span className="text-sm text-muted-foreground">
                      {selectedImage.name}
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitReport}
                disabled={isProcessing}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Get Recommendation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recommendation Results */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-accent" />
                AI Recommendation
              </CardTitle>
              <CardDescription>
                Smart farming guidance based on your reported issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recommendation ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sprout className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Submit your farming problem to get personalized recommendations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Problem Detection */}
                  <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium">Detected Problem</span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {recommendation.problem.replace('_', ' ')}
                    </Badge>
                    {recommendation.crop !== 'unknown' && (
                      <Badge variant="outline" className="ml-2 capitalize">
                        Affected: {recommendation.crop}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Recommendations */}
                  <div className="space-y-4">
                    {recommendation.recommend.length > 0 && (
                      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">Recommended Crops</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.recommend.map((crop: string, index: number) => (
                            <Badge key={index} className="bg-success text-success-foreground">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendation.avoid.length > 0 && (
                      <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Avoid These Crops</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.avoid.map((crop: string, index: number) => (
                            <Badge key={index} variant="destructive">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expert Advice */}
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        <span className="font-medium">Expert Advice</span>
                      </div>
                      <p className="text-sm text-foreground/80">
                        {recommendation.advice}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Task Reminders */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">{task.dueDate}</p>
                  </div>
                  <Badge
                    variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports This Month</p>
                <p className="text-lg font-bold">{monthlyReports}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-lg font-bold">85%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Fields</p>
                <p className="text-lg font-bold">3</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FarmerDashboard;
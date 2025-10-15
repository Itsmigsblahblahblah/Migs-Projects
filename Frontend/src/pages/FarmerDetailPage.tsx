import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  Home,
  Calendar,
  Leaf,
  TrendingUp,
  Package,
  Sprout
} from "lucide-react";

interface Farmer {
  uid: string;
  email: string;
  fullName: string;
  farmName: string;
  role: string;
  createdAt: string;
  photoURL?: string | null;
  homeAddress?: string;
  farmAddress?: string;
}

interface Crop {
  id: string;
  userId: string;
  name: string;
  landArea: string;
  quantity: number;
  soilType: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  puhunan: number;
  plantedDate: any;
  createdAt: any;
  status?: string;
}

const FarmerDetailPage = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    if (farmerId) {
      loadFarmerDetails(farmerId);
    }
  }, [farmerId, navigate]);

  const loadFarmerDetails = async (uid: string) => {
    setLoading(true);
    try {
      // Load farmer profile
      const farmerDoc = await getDoc(doc(db, "farmers", uid));
      
      if (!farmerDoc.exists()) {
        toast({
          title: "Error",
          description: "Farmer not found.",
          variant: "destructive",
        });
        navigate('/admin');
        return;
      }

      const farmerData = farmerDoc.data() as Farmer;
      setFarmer(farmerData);

      // Load farmer's crops
      const cropsRef = collection(db, "farmerCrops");
      const cropsQuery = query(cropsRef, where("userId", "==", uid));
      const cropsSnapshot = await getDocs(cropsQuery);

      const farmerCrops: Crop[] = [];
      cropsSnapshot.forEach((doc) => {
        const data = doc.data();
        farmerCrops.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          landArea: data.landArea,
          quantity: data.quantity,
          soilType: data.soilType,
          nitrogen: data.nitrogen || 0,
          phosphorus: data.phosphorus || 0,
          potassium: data.potassium || 0,
          puhunan: data.puhunan,
          plantedDate: data.plantedDate,
          createdAt: data.createdAt,
          status: data.status || determineCropStatus(data.plantedDate)
        });
      });

      // Sort crops by createdAt (newest first)
      farmerCrops.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setCrops(farmerCrops);
    } catch (error) {
      console.error("Error loading farmer details:", error);
      toast({
        title: "Error",
        description: "Failed to load farmer details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const determineCropStatus = (plantedDate: any): string => {
    if (!plantedDate?.toDate) return "In Progress";
    
    const planted = plantedDate.toDate();
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
    
    // Simple logic: crops harvested after 90 days
    if (daysDiff > 90) return "Harvested";
    return "In Progress";
  };

  const getCropsByStatus = (status: string) => {
    return crops.filter(crop => crop.status === status);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown date';
    try {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading farmer details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!farmer) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Farmer not found</p>
        </div>
      </Layout>
    );
  }

  const inProgressCrops = getCropsByStatus("In Progress");
  const harvestedCrops = getCropsByStatus("Harvested");

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Button>

        {/* Farmer Profile Header */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Farmer Profile</CardTitle>
            <CardDescription>Detailed information and crop history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Image */}
              <div className="flex justify-center md:justify-start">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={farmer.photoURL || undefined} alt={farmer.fullName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(farmer.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Information */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{farmer.fullName}</h2>
                  <p className="text-muted-foreground">{farmer.farmName}</p>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{farmer.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Registered</p>
                      <p className="font-medium">{formatDate(farmer.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Home Address</p>
                      <p className="font-medium">{farmer.homeAddress || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Farm Address</p>
                      <p className="font-medium">{farmer.farmAddress || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Farm Land Area</p>
                    <p className="font-medium">
                      {crops.reduce((sum, crop) => {
                        const area = parseFloat(crop.landArea) || 0;
                        return sum + area;
                      }, 0).toFixed(2)} hectares
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crop Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Crops</p>
                  <p className="text-2xl font-bold">{crops.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Sprout className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressCrops.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Harvested</p>
                  <p className="text-2xl font-bold">{harvestedCrops.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* In Progress Crops */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5" />
              In Progress Crops
            </CardTitle>
            <CardDescription>{inProgressCrops.length} crops currently growing</CardDescription>
          </CardHeader>
          <CardContent>
            {inProgressCrops.length > 0 ? (
              <div className="space-y-4">
                {inProgressCrops.map((crop) => (
                  <div
                    key={crop.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Leaf className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{crop.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Planted: {formatTimestamp(crop.plantedDate)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">In Progress</Badge>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Land Area</p>
                        <p className="font-medium">{crop.landArea} hectares</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">{crop.quantity} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Soil Type</p>
                        <p className="font-medium capitalize">{crop.soilType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investment</p>
                        <p className="font-medium">₱{crop.puhunan.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>N: {crop.nitrogen}</span>
                      <span>P: {crop.phosphorus}</span>
                      <span>K: {crop.potassium}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sprout className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No crops in progress</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Harvested Crops */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Harvested Crops
            </CardTitle>
            <CardDescription>{harvestedCrops.length} crops successfully harvested</CardDescription>
          </CardHeader>
          <CardContent>
            {harvestedCrops.length > 0 ? (
              <div className="space-y-4">
                {harvestedCrops.map((crop) => (
                  <div
                    key={crop.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors opacity-75"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg">
                          <Package className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{crop.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Planted: {formatTimestamp(crop.plantedDate)}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-success text-success-foreground">Harvested</Badge>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Land Area</p>
                        <p className="font-medium">{crop.landArea} hectares</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">{crop.quantity} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Soil Type</p>
                        <p className="font-medium capitalize">{crop.soilType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investment</p>
                        <p className="font-medium">₱{crop.puhunan.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>N: {crop.nitrogen}</span>
                      <span>P: {crop.phosphorus}</span>
                      <span>K: {crop.potassium}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No harvested crops yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FarmerDetailPage;

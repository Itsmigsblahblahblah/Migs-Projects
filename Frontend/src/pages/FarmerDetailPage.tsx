import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp } from "firebase/firestore";
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
  Sprout,
  Send,
  MessageSquare
} from "lucide-react";

interface Farmer {
  uid: string;
  email: string;
  fullName: string;
  farmName: string;
  contactNumber: string;
  role: string;
  createdAt: string;
  photoURL?: string | null;
  homeAddress?: string;
  farmAddress?: string;
  farmArea?: string; // Added farmArea field
}

// Helper function to get paginated crops
function getPaginatedCrops(cropsArray: any[], currentPage: number, cropsPerPage: number) {
  const startIndex = (currentPage - 1) * cropsPerPage;
  const endIndex = startIndex + cropsPerPage;
  return cropsArray.slice(startIndex, endIndex);
}

// Helper function to generate page numbers for pagination
function generatePageNumbers(totalItems: number, cropsPerPage: number) {
  const totalPages = Math.ceil(totalItems / cropsPerPage);
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

const FarmerDetailPage = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [crops, setCrops] = useState<any[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);
  // Add pagination state
  const [inProgressCurrentPage, setInProgressCurrentPage] = useState(1);
  const [harvestedCurrentPage, setHarvestedCurrentPage] = useState(1);
  const cropsPerPage = 6; // Show 6 crops per page

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

      const data = farmerDoc.data();
      const farmerData: Farmer = {
        uid: farmerDoc.id,
        email: data.email || '',
        fullName: data.fullName || '',
        farmName: data.farmName || '',
        contactNumber: data.contactNumber || '',
        role: data.role || 'farmer',
        createdAt: data.createdAt || '',
        photoURL: data.photoURL || null,
        homeAddress: data.homeAddress || '',
        farmAddress: data.farmAddress || '',
        farmArea: data.farmArea || '' // Added farmArea field
      };
      setFarmer(farmerData);

      // Load farmer's crops
      const cropsRef = collection(db, "farmerCrops");
      const cropsQuery = query(cropsRef, where("userId", "==", uid));
      const cropsSnapshot = await getDocs(cropsQuery);

      const farmerCrops: any[] = [];
      cropsSnapshot.forEach((doc) => {
        const data = doc.data();
        farmerCrops.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          landArea: data.landArea,
          soilType: data.soilType,
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
        try {
            let planted: Date;
            
            // Handle string dates (YYYY-MM-DD format)
            if (typeof plantedDate === 'string') {
                planted = new Date(plantedDate);
            }
            // Handle Firestore Timestamp
            else if (plantedDate?.toDate) {
                planted = plantedDate.toDate();
            }
            // Handle JavaScript Date objects
            else if (plantedDate instanceof Date) {
                planted = plantedDate;
            } else {
                return "In Progress";
            }
            
            if (isNaN(planted.getTime())) {
                return "In Progress";
            }
            
            const now = new Date();
            const daysDiff = Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
            
            // Simple logic: crops harvested after 90 days
            if (daysDiff > 90) return "Harvested";
            return "In Progress";
        } catch {
            return "In Progress";
        }
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
      if (timestamp?.toDate) {
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
        <div className="max-w-4xl mx-auto p-6">
          <Button variant="outline" onClick={() => navigate('/admin')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Farmer Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The farmer you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/admin')}>
              Return to Admin Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const inProgressCrops = getCropsByStatus("In Progress");
  const harvestedCrops = getCropsByStatus("Harvested");
  const totalInvestment = crops.reduce((sum, crop) => sum + (crop.puhunan || 0), 0);
  const totalCrops = crops.length;
  
  // Get paginated crops
  const paginatedInProgressCrops = getPaginatedCrops(inProgressCrops, inProgressCurrentPage, cropsPerPage);
  const paginatedHarvestedCrops = getPaginatedCrops(harvestedCrops, harvestedCurrentPage, cropsPerPage);
  
  // Generate page numbers
  const inProgressPageNumbers = generatePageNumbers(inProgressCrops.length, cropsPerPage);
  const harvestedPageNumbers = generatePageNumbers(harvestedCrops.length, cropsPerPage);

  const handleSendMessage = async () => {
    if (!farmer || !customMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      // Save message to Firestore
      await addDoc(collection(db, "adminMessages"), {
        reportId: null, // No specific report associated with this message
        senderId: "admin", // In a real app, this would be the actual admin ID
        receiverId: farmer.uid, // Send to the farmer
        message: customMessage.trim(),
        timestamp: Timestamp.now(),
        read: false
      });
      
      // Show success feedback using toast notification
      toast({
        title: "Message Sent",
        description: `Your message has been sent to farmer ${farmer.fullName}.`,
      });
      
      // Clear the message input
      setCustomMessage("");
      // Hide the form after sending
      setShowMessageForm(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Button variant="outline" onClick={() => navigate('/admin')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Farmer Header */}
        <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary-foreground/20">
              {farmer.photoURL ? (
                <AvatarImage src={farmer.photoURL} alt={farmer.fullName} />
              ) : (
                <AvatarFallback className="text-2xl bg-primary/20">
                  {getInitials(farmer.fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{farmer.fullName}</h1>
              <p className="text-primary-foreground/90 mb-4">
                {farmer.contactNumber || "No contact number provided"}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{farmer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(farmer.createdAt)}</span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg py-2 px-4">
              {totalCrops} Crops
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱{totalInvestment.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all crops</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Crops</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCrops.length}</div>
              <p className="text-xs text-muted-foreground">Currently growing</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Harvested</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{harvestedCrops.length}</div>
              <p className="text-xs text-muted-foreground">Successfully grown</p>
            </CardContent>
          </Card>
        </div>

        {/* Farmer Information */}
        <Card className="shadow-card relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Farmer Information
            </CardTitle>
            <CardDescription>Contact and location details</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h3>
                <p className="font-medium">{farmer.fullName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                <p className="font-medium">{farmer.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Member Since</h3>
                <p className="font-medium">{formatDate(farmer.createdAt)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact Number</h3>
                <p className="font-medium">{farmer.contactNumber || "Not provided"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Home Address</h3>
                <p className="font-medium">{farmer.homeAddress || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Farm Address</h3>
                <p className="font-medium">{farmer.farmAddress || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Farm Area</h3>
                <p className="font-medium">{farmer.farmArea || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
          
          {/* Request Contact Button - Only show if contact number is missing */}
          {!farmer.contactNumber && !showMessageForm && (
            <div className="p-6 border-t">
              <Button 
                onClick={() => setShowMessageForm(true)}
                className="flex items-center gap-2"
                variant="outline"
              >
                <MessageSquare className="h-4 w-4" />
                Request Information from Farmer
              </Button>
            </div>
          )}
          
          {/* Message Form - Only show when showMessageForm is true */}
          {!farmer.contactNumber && showMessageForm && (
            <div className="p-6 border-t">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-message" className="text-sm font-medium">
                    Request Information from Farmer
                  </Label>
                </div>
                <Textarea
                  id="custom-message"
                  placeholder="e.g., Please provide your contact number for better communication..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowMessageForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !customMessage.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSendingMessage ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Crops Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sprout className="h-6 w-6" />
              Crop Management
            </h2>
            <Badge variant="outline">{totalCrops} total crops</Badge>
          </div>

          {/* In Progress Crops */}
          {inProgressCrops.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-500" />
                  In Progress ({inProgressCrops.length})
                </CardTitle>
                <CardDescription>Currently growing crops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedInProgressCrops.map((crop) => (
                    <Card key={crop.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold">{crop.name}</h3>
                          <Badge variant="secondary">{crop.status}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Land Area:</span>
                            <span>{crop.landArea} hectares</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Soil Type:</span>
                            <span>{crop.soilType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Investment:</span>
                            <span>₱{crop.puhunan?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Planted:</span>
                            <span>{formatTimestamp(crop.plantedDate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination for In Progress Crops */}
                {inProgressPageNumbers.length > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInProgressCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={inProgressCurrentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      {inProgressPageNumbers.map(pageNumber => (
                        <Button
                          key={pageNumber}
                          variant={inProgressCurrentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setInProgressCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInProgressCurrentPage(prev => Math.min(prev + 1, inProgressPageNumbers.length))}
                        disabled={inProgressCurrentPage === inProgressPageNumbers.length}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Harvested Crops */}
          {harvestedCrops.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Harvested ({harvestedCrops.length})
                </CardTitle>
                <CardDescription>Successfully grown crops</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedHarvestedCrops.map((crop) => (
                    <Card key={crop.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold">{crop.name}</h3>
                          <Badge variant="default">{crop.status}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Land Area:</span>
                            <span>{crop.landArea} hectares</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Soil Type:</span>
                            <span>{crop.soilType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Investment:</span>
                            <span>₱{crop.puhunan?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Planted:</span>
                            <span>{formatTimestamp(crop.plantedDate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination for Harvested Crops */}
                {harvestedPageNumbers.length > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHarvestedCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={harvestedCurrentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      {harvestedPageNumbers.map(pageNumber => (
                        <Button
                          key={pageNumber}
                          variant={harvestedCurrentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHarvestedCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHarvestedCurrentPage(prev => Math.min(prev + 1, harvestedPageNumbers.length))}
                        disabled={harvestedCurrentPage === harvestedPageNumbers.length}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Crops Message */}
          {totalCrops === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Crops Found</h3>
                <p className="text-muted-foreground mb-4">
                  This farmer hasn't added any crops yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FarmerDetailPage;
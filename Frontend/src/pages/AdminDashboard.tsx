import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  MapPin,
  Calendar,
  Download,
  Settings,
  Eye,
  CheckCircle,
  Mail,
  Home,
  Trash2,
  User,
  X
} from "lucide-react";
import { collection, query, getDocs, orderBy, Timestamp, updateDoc, doc, deleteDoc, writeBatch, where } from "firebase/firestore";
import { db, functions } from "@/firebaseConfig";
import { httpsCallable } from "firebase/functions";

interface Report {
  id: string;
  userId: string;
  username: string;
  reportText: string;
  problem: string;
  affectedCrop: string;
  recommendedCrops: string[];
  cropsToAvoid: string[];
  advice: string;
  hasImage: boolean;
  imageName: string | null;
  createdAt: any;
  status: string;
}

interface ProblemData {
  name: string;
  count: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  reports: number;
  resolved: number;
}

interface CropRecommendation {
  crop: string;
  frequency: number;
}

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

interface DeletionRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

const AdminDashboard = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [problemsData, setProblemsData] = useState<ProblemData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [cropRecommendations, setCropRecommendations] = useState<CropRecommendation[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [stats, setStats] = useState({
    activeFarmers: 0,
    pendingReports: 0,
    resolvedThisMonth: 0,
    successRate: 0
  });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const user = localStorage.getItem('username');
    
    // Removed navigation check since it's now handled by ProtectedRoute
    
    setUsername(user || 'Admin');
    loadDashboardData();
  }, [navigate]);

  // Update stats when farmers array changes
  useEffect(() => {
    setStats(prevStats => ({
      ...prevStats,
      activeFarmers: farmers.length
    }));
  }, [farmers]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      console.log("Loading dashboard data...");
      
      // Load all reports - Query without orderBy to get ALL data including old records
      const reportsRef = collection(db, "farmReports");
      const reportsQuery = query(reportsRef);
      const reportsSnapshot = await getDocs(reportsQuery);
      
      const reportsData: Report[] = [];
      reportsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Report found:", doc.id, data);
        reportsData.push({
          id: doc.id,
          userId: data.userId || '',
          username: data.username || 'Unknown',
          reportText: data.reportText || '',
          problem: data.problem || 'general',
          affectedCrop: data.affectedCrop || 'unknown',
          recommendedCrops: data.recommendedCrops || [],
          cropsToAvoid: data.cropsToAvoid || [],
          advice: data.advice || '',
          hasImage: data.hasImage || false,
          imageName: data.imageName || null,
          createdAt: data.createdAt,
          status: data.status || 'pending'
        });
      });
      
      // Sort in memory by createdAt (newest first), put items without createdAt at the end
      reportsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log("Total reports loaded:", reportsData.length);
      setReports(reportsData);
      
      // Calculate statistics with reports data only first
      calculateStatistics(reportsData);
      calculateProblemsDistribution(reportsData);
      calculateMonthlyTrends(reportsData);
      calculateCropRecommendations(reportsData);
      
      // Load farmers
      await loadFarmers();
      
      // Load deletion requests
      await loadDeletionRequests();
      
      toast({
        title: "Dashboard Loaded",
        description: `Successfully loaded ${reportsData.length} reports.`,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (reportsData: Report[]) => {
    // Count unique farmers who have submitted reports
    const uniqueFarmers = new Set(reportsData.map(r => r.userId)).size;
    
    // Count pending reports
    const pending = reportsData.filter(r => r.status === 'pending' || r.status === 'processed').length;
    
    // Count resolved this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const resolved = reportsData.filter(r => {
      const reportDate = r.createdAt?.toDate();
      return r.status === 'resolved' && reportDate >= firstDayOfMonth;
    }).length;
    
    // Calculate success rate
    const totalReports = reportsData.length;
    const resolvedReports = reportsData.filter(r => r.status === 'resolved').length;
    const successRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;
    
    setStats({
      activeFarmers: uniqueFarmers,
      pendingReports: pending,
      resolvedThisMonth: resolved,
      successRate
    });
  };

  const calculateProblemsDistribution = (reportsData: Report[]) => {
    const problemCounts: { [key: string]: number } = {};
    
    reportsData.forEach(report => {
      const problem = report.problem || 'general';
      problemCounts[problem] = (problemCounts[problem] || 0) + 1;
    });
    
    const colors: { [key: string]: string } = {
      flood: '#3b82f6',
      pest: '#ef4444',
      drought: '#f97316',
      disease: '#8b5cf6',
      general: '#10b981'
    };
    
    const data: ProblemData[] = Object.entries(problemCounts)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        color: colors[name] || '#64748b'
      }))
      .sort((a, b) => b.count - a.count);
    
    setProblemsData(data);
  };

  const calculateMonthlyTrends = (reportsData: Report[]) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const trends: MonthlyTrend[] = [];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthReports = reportsData.filter(r => {
        const reportDate = r.createdAt?.toDate();
        return reportDate >= monthStart && reportDate <= monthEnd;
      });
      
      trends.push({
        month: monthNames[date.getMonth()],
        reports: monthReports.length,
        resolved: monthReports.filter(r => r.status === 'resolved').length
      });
    }
    
    setMonthlyTrends(trends);
  };

  const calculateCropRecommendations = (reportsData: Report[]) => {
    const cropCounts: { [key: string]: number } = {};
    
    reportsData.forEach(report => {
      report.recommendedCrops?.forEach(crop => {
        cropCounts[crop] = (cropCounts[crop] || 0) + 1;
      });
    });
    
    const recommendations: CropRecommendation[] = Object.entries(cropCounts)
      .map(([crop, frequency]) => ({ crop, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    setCropRecommendations(recommendations);
  };

  const loadFarmers = async () => {
    try {
      const farmersRef = collection(db, "farmers");
      const farmersSnapshot = await getDocs(farmersRef);
      
      const farmersData: Farmer[] = [];
      farmersSnapshot.forEach((doc) => {
        const data = doc.data();
        farmersData.push({
          uid: data.uid || doc.id,
          email: data.email || '',
          fullName: data.fullName || 'Unknown',
          farmName: data.farmName || 'Unknown Farm',
          role: data.role || 'farmer',
          createdAt: data.createdAt || '',
          photoURL: data.photoURL || null,
          homeAddress: data.homeAddress || '',
          farmAddress: data.farmAddress || ''
        });
      });
      
      // Sort by registration date (newest first)
      farmersData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setFarmers(farmersData);
    } catch (error) {
      console.error("Error loading farmers:", error);
      toast({
        title: "Error",
        description: "Failed to load farmers data.",
        variant: "destructive",
      });
    }
  };

  const loadDeletionRequests = async () => {
    try {
      console.log("[Admin] Loading deletion requests...");
      const requestsRef = collection(db, "deletionRequests");
      const requestsSnapshot = await getDocs(requestsRef);
      
      console.log("[Admin] Found", requestsSnapshot.size, "deletion request(s)");
      
      const requestsData: DeletionRequest[] = [];
      requestsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("[Admin] Deletion request:", doc.id, data);
        requestsData.push({
          id: doc.id,
          userId: data.userId || '',
          username: data.username || 'Unknown',
          email: data.email || '',
          fullName: data.fullName || 'Unknown',
          status: data.status || 'pending',
          requestedAt: data.requestedAt,
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy
        });
      });
      
      // Sort by request date (newest first)
      requestsData.sort((a, b) => {
        const dateA = a.requestedAt?.toDate?.() || new Date(0);
        const dateB = b.requestedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log("[Admin] Total deletion requests loaded:", requestsData.length);
      console.log("[Admin] Deletion requests data:", requestsData);
      setDeletionRequests(requestsData);
    } catch (error) {
      console.error("[Admin] Error loading deletion requests:", error);
      toast({
        title: "Error",
        description: "Failed to load deletion requests.",
        variant: "destructive",
      });
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

  const handleDeletionRequestAction = async (requestId: string, action: 'approved' | 'denied') => {
    try {
      const requestRef = doc(db, "deletionRequests", requestId);
      await updateDoc(requestRef, {
        status: action,
        reviewedAt: Timestamp.now(),
        reviewedBy: username
      });

      // Reload deletion requests
      await loadDeletionRequests();

      toast({
        title: action === 'approved' ? "Request Approved" : "Request Denied",
        description: action === 'approved' 
          ? "The farmer can now delete their account."
          : "The deletion request has been denied.",
      });
    } catch (error) {
      console.error("Error updating deletion request:", error);
      toast({
        title: "Error",
        description: "Failed to update deletion request.",
        variant: "destructive",
      });
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedRequests([]);
  };

  const toggleRequestSelection = (requestId: string) => {
    setSelectedRequests(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one request to delete.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("[Admin] Deleting requests:", selectedRequests);
      const batch = writeBatch(db);
      
      selectedRequests.forEach(requestId => {
        const requestRef = doc(db, "deletionRequests", requestId);
        batch.delete(requestRef);
      });

      await batch.commit();
      
      // Reload deletion requests
      await loadDeletionRequests();
      
      // Reset delete mode and selections
      setDeleteMode(false);
      setSelectedRequests([]);

      toast({
        title: "Requests Deleted",
        description: `Successfully deleted ${selectedRequests.length} deletion request(s).`,
      });
    } catch (error) {
      console.error("[Admin] Error deleting requests:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected requests.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
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

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const reportRef = doc(db, "farmReports", reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update local state instead of reloading everything
      const updatedReports = reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus } 
          : report
      );
      
      setReports(updatedReports);
      
      // Recalculate stats with updated data
      calculateStatistics(updatedReports);
      calculateProblemsDistribution(updatedReports);
      calculateMonthlyTrends(updatedReports);
      
      toast({
        title: "Status Updated",
        description: `Report status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating report status:", error);
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    }
  };

  const exportData = (type: string) => {
    let dataToExport: any[] = [];
    let filename = '';
    
    if (type === 'reports') {
      dataToExport = reports.map(r => ({
        'Farmer': r.username,
        'Problem': r.problem,
        'Affected Crop': r.affectedCrop,
        'Date': r.createdAt?.toDate().toLocaleDateString(),
        'Status': r.status,
        'Recommendations': r.recommendedCrops?.join(', ')
      }));
      filename = 'farm_reports.csv';
    } else if (type === 'crops') {
      dataToExport = cropRecommendations;
      filename = 'crop_recommendations.csv';
    }
    
    // Convert to CSV
    if (dataToExport.length > 0) {
      const headers = Object.keys(dataToExport[0]);
      const csv = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => JSON.stringify(row[header] || '')).join(',')
        )
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `${filename} has been downloaded.`,
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-primary-foreground/90">
                Welcome back, {username}. Here's your farm management overview.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/admin/rules')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Rules
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Farmers</p>
                  <p className="text-2xl font-bold">{stats.activeFarmers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolved This Month</p>
                  <p className="text-2xl font-bold">{stats.resolvedThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
            <TabsTrigger 
              value="farmers" 
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Registered Farmers
            </TabsTrigger>
            <TabsTrigger 
              value="deletion-requests" 
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Deletion Requests
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="flex-1 min-w-[120px] text-center whitespace-nowrap"
            >
              Location Map
            </TabsTrigger>
          </TabsList>

          {/* Registered Farmers Tab */}
          <TabsContent value="farmers" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Registered Farmers</CardTitle>
                    <CardDescription>List of all farmers registered in the system ({farmers.length} total)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {farmers.length > 0 ? (
                  <div className="space-y-4">
                    {farmers.map((farmer) => (
                      <div
                        key={farmer.uid}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* Circular Profile Image */}
                          <Avatar className="h-16 w-16 cursor-pointer" onClick={() => navigate(`/admin/farmer/${farmer.uid}`)}>
                            <AvatarImage src={farmer.photoURL || undefined} alt={farmer.fullName} />
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                              {getInitials(farmer.fullName)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Farmer Information */}
                          <div className="flex-1 cursor-pointer" onClick={() => navigate(`/admin/farmer/${farmer.uid}`)}>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{farmer.fullName}</h3>
                                <p className="text-sm text-muted-foreground">{farmer.farmName}</p>
                              </div>
                              <Badge variant="secondary">Farmer</Badge>
                            </div>

                            <div className="grid md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground truncate">{farmer.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Home: </span>
                                  <span>{farmer.homeAddress || "Not provided"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Farm: </span>
                                  <span>{farmer.farmAddress || "Not provided"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Registered: {formatDate(farmer.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No registered farmers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deletion Requests Tab */}
          <TabsContent value="deletion-requests" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Deletion Requests</CardTitle>
                    <CardDescription>
                      Manage farmer account deletion requests ({deletionRequests.filter(r => r.status === 'pending').length} pending, {deletionRequests.length} total)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {deleteMode ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={toggleDeleteMode}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={selectedRequests.length === 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ({selectedRequests.length})
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={loadDeletionRequests}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={toggleDeleteMode}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {deletionRequests.length > 0 ? (
                  <div className="space-y-4">
                    {deletionRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox for delete mode */}
                          {deleteMode && (
                            <Checkbox
                              checked={selectedRequests.includes(request.id)}
                              onCheckedChange={() => toggleRequestSelection(request.id)}
                              className="h-5 w-5"
                            />
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="bg-secondary rounded-full p-2">
                                <User className="h-5 w-5 text-secondary-foreground" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{request.fullName}</h3>
                                <p className="text-sm text-muted-foreground">{request.email}</p>
                              </div>
                              <Badge 
                                variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}
                                className={request.status === 'approved' ? 'bg-success text-success-foreground' : ''}
                              >
                                {request.status.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Requested: </span>
                                  <span>{request.requestedAt?.toDate().toLocaleDateString()}</span>
                                </div>
                              </div>
                              {request.reviewedAt && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <span className="text-muted-foreground">Reviewed: </span>
                                    <span>{request.reviewedAt?.toDate().toLocaleDateString()}</span>
                                    {request.reviewedBy && <span className="ml-1">by {request.reviewedBy}</span>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons - Only for pending requests and not in delete mode */}
                          {!deleteMode && request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletionRequestAction(request.id, 'denied')}
                                className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <AlertTriangle className="h-4 w-4" />
                                Deny
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDeletionRequestAction(request.id, 'approved')}
                                className="flex items-center gap-2 bg-success hover:bg-success/90"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No deletion requests yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Problem Types Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Most Common Problems</CardTitle>
                  <CardDescription>Distribution of farming issues this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {problemsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={problemsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Reports vs resolved issues over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="reports" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="hsl(var(--success))" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Crop Recommendations */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top Crop Recommendations</CardTitle>
                    <CardDescription>Most frequently suggested crops</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportData('crops')}
                    disabled={cropRecommendations.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cropRecommendations.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cropRecommendations} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="crop" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="frequency" fill="hsl(var(--success))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No recommendations data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Farmer Reports</CardTitle>
                    <CardDescription>Latest submissions from farmers ({reports.length} total)</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => exportData('reports')}
                    disabled={reports.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.slice(0, 10).map((report) => (
                      <div 
                        key={report.id} 
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">{report.username}</div>
                            <Badge 
                              variant={report.status === 'resolved' ? 'default' : 'secondary'}
                              className={report.status === 'resolved' ? 'bg-success text-success-foreground' : ''}
                            >
                              {report.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {report.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Problem: </span>
                            <span className="capitalize">{report.problem}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Affected Crop: </span>
                            <span className="capitalize">{report.affectedCrop}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Recommended: </span>
                            {report.recommendedCrops?.slice(0, 2).join(', ')}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {report.reportText}
                          </p>
                          <div className="flex gap-2">
                            {report.status !== 'resolved' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateReportStatus(report.id, 'resolved')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Resolved
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No reports submitted yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Barangay Problem Distribution</CardTitle>
                <CardDescription>Geographic distribution of farming issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Interactive Map Coming Soon</h3>
                  <p className="text-muted-foreground">
                    This will show the geographic distribution of farming problems across different barangays in Majayjay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
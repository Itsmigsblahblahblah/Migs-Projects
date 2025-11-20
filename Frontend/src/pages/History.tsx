import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { 
  Calendar, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Filter,
  Download,
  Eye,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";

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

const History = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [reportHistory, setReportHistory] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();
  const userRole = localStorage.getItem('userRole');
  const currentUserId = localStorage.getItem('userId') || 'default-user';

  useEffect(() => {
    if (!userRole) {
      navigate('/');
      return;
    }

    loadReportHistory();
  }, [navigate, userRole]);

  const loadReportHistory = async () => {
    setLoading(true);
    try {
      console.log("Loading report history for role:", userRole, "userId:", currentUserId);
      
      const reportsRef = collection(db, "farmReports");
      
      let reports: Report[] = [];
      
      // If farmer, show only their reports. If admin, show all reports
      if (userRole === 'farmer') {
        // For farmer: Query without orderBy to get ALL data including old records
        const farmerQuery = query(
          reportsRef,
          where("userId", "==", currentUserId)
        );
        const querySnapshot = await getDocs(farmerQuery);
        
        console.log("Farmer reports found:", querySnapshot.size);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Report data:", doc.id, data);
          reports.push({
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
        
        // Sort by date in memory (newest first), put items without createdAt at the end
        reports.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
      } else {
        // Admin sees all reports - Query without orderBy to get ALL data
        const adminQuery = query(reportsRef);
        const querySnapshot = await getDocs(adminQuery);
        
        console.log("Admin reports found:", querySnapshot.size);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Report data:", doc.id, data);
          reports.push({
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
        
        // Sort by date in memory (newest first), put items without createdAt at the end
        reports.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      console.log("Total reports loaded:", reports.length);
      setReportHistory(reports);

      if (reports.length === 0) {
        toast({
          title: "No Reports Found",
          description: userRole === 'farmer' ? "You haven't submitted any reports yet." : "No reports have been submitted yet.",
        });
      }
    } catch (error: any) {
      console.error("Error loading report history:", error);
      toast({
        title: "Error Loading Reports",
        description: error.message || "Failed to load report history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = reportHistory.filter(report => {
    const matchesSearch = 
      report.reportText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" || 
      report.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredHistory.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredHistory.length / reportsPerPage);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Handle page change with scroll to top
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of page
    window.scrollTo(0, 0);
  };

  const getProblemColor = (problem: string) => {
    const colors = {
      flood: 'bg-blue-500/10 text-blue-700 border-blue-200',
      pest: 'bg-red-500/10 text-red-700 border-red-200',
      drought: 'bg-orange-500/10 text-orange-700 border-orange-200',
      disease: 'bg-purple-500/10 text-purple-700 border-purple-200',
      general: 'bg-gray-500/10 text-gray-700 border-gray-200'
    };
    return colors[problem as keyof typeof colors] || colors.general;
  };

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no reports to export.",
        variant: "destructive",
      });
      return;
    }

    const csvData = filteredHistory.map(report => ({
      'Date': report.createdAt?.toDate().toLocaleDateString(),
      'Farmer': report.username,
      'Problem Type': report.problem,
      'Affected Crop': report.affectedCrop,
      'Report': report.reportText,
      'Recommended Crops': report.recommendedCrops?.join('; '),
      'Crops to Avoid': report.cropsToAvoid?.join('; '),
      'Advice': report.advice,
      'Status': report.status
    }));

    const headers = Object.keys(csvData[0]);
    const csv = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => JSON.stringify(row[header as keyof typeof row] || '')).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farm-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Report history has been exported to CSV.",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reports...</p>
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
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  {userRole === 'farmer' ? <Calendar className="h-7 w-7" /> : <Users className="h-7 w-7" />}
                  {userRole === 'farmer' ? 'My Report History' : 'All Community Reports'}
                </h1>
                <p className="text-primary-foreground/90">
                  {userRole === 'farmer' 
                    ? "View your farm problem reports and recommendations" 
                    : "Complete history of all farmer reports and system responses"
                  }
                </p>
                {/* Total reports indicator */}
                <p className="text-sm mt-2">
                  Showing {Math.min(indexOfLastReport, filteredHistory.length)} of {filteredHistory.length} reports
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder={userRole === 'farmer' 
                    ? "Search your reports by problem description or issue type..." 
                    : "Search by problem description, issue type, or farmer name..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="processed">Processed</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
                {userRole !== 'farmer' && (
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">No reports found</p>
                <p className="text-sm">
                  {searchTerm 
                    ? "Try adjusting your search or filter criteria." 
                    : userRole === 'farmer' 
                      ? "You haven't submitted any reports yet. Go to dashboard to report a problem." 
                      : "No reports have been submitted yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {currentReports.map((report) => {
                return (
                  <Card key={report.id} className="shadow-soft hover:shadow-card transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {userRole === 'admin' && (
                            <Badge variant="outline" className="font-medium">
                              {report.username}
                            </Badge>
                          )}
                          <Badge 
                            className={`${getProblemColor(report.problem)} border capitalize`}
                          >
                            {report.problem.replace('_', ' ')}
                          </Badge>
                          {report.affectedCrop !== 'unknown' && report.affectedCrop !== 'general' && (
                            <Badge variant="outline" className="capitalize">
                              {report.affectedCrop}
                            </Badge>
                          )}
                          <Badge 
                            variant={report.status === 'resolved' ? 'default' : 'secondary'}
                            className={report.status === 'resolved' ? 'bg-success text-success-foreground' : ''}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {report.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {report.createdAt?.toDate().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Original Problem */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Problem Reported:</h4>
                        <p className="text-foreground bg-muted/50 p-3 rounded-lg">
                          "{report.reportText}"
                        </p>
                        {report.hasImage && (
                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Image attached: {report.imageName}
                          </div>
                        )}
                      </div>

                      {/* Recommendations Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {report.recommendedCrops && report.recommendedCrops.length > 0 && (
                          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                            <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Recommended Crops
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {report.recommendedCrops.map((crop: string, index: number) => (
                                <Badge key={index} className="bg-success text-success-foreground text-xs">
                                  {crop}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.cropsToAvoid && report.cropsToAvoid.length > 0 && (
                          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                            <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Crops to Avoid
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {report.cropsToAvoid.map((crop: string, index: number) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {crop}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Advice */}
                      {report.advice && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <h4 className="text-sm font-medium text-primary mb-2">AI Recommendations:</h4>
                          <p className="text-sm">{report.advice}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Pagination Controls - Updated to match admin design */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Calculate start index for pagination window
                      let start = 1;
                      if (totalPages > 5) {
                        if (currentPage <= 3) {
                          start = 1;
                        } else if (currentPage >= totalPages - 2) {
                          start = totalPages - 4;
                        } else {
                          start = currentPage - 2;
                        }
                      }
                      
                      const pageNum = start + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {totalPages > 5 && (
                      <>
                        {currentPage < totalPages - 2 && (
                          <>
                            <span className="px-1">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              className="w-8 h-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;
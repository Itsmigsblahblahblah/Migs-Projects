import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { formatAiGuidance } from "@/utils/aiGuidanceFormatter";
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
  ChevronRight,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { collection, query, getDocs, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
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
  const [reportHistory, setReportHistory] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProblem, setFilterProblem] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null); // Track expanded report
  const reportsPerPage = 10;
  const navigate = useNavigate();
  const { toast } = useToast();
  const userRole = localStorage.getItem('userRole');
  const currentUserId = localStorage.getItem('userId') || 'default-user';
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Normalize problem categories to only use the 5 standard ones
  const normalizeProblemCategory = (problem: string): string => {
    const standardCategories = ['flood', 'pest', 'drought', 'disease', 'general'];
    const normalized = problem.toLowerCase().trim();
    
    // If it's already a standard category, return as is
    if (standardCategories.includes(normalized)) {
      return normalized;
    }
    
    // Map common variations to standard categories
    const categoryMap: Record<string, string> = {
      'floods': 'flood',
      'flooding': 'flood',
      'waterlogging': 'flood',
      'pests': 'pest',
      'insects': 'pest',
      'bugs': 'pest',
      'diseases': 'disease',
      'illness': 'disease',
      'sickness': 'disease',
      'dry': 'drought',
      'dryness': 'drought',
      'water shortage': 'drought',
      'seedling failure': 'general',
      'unclear': 'general',
      'unclear report': 'general',
      'vague': 'general'
    };
    
    return categoryMap[normalized] || 'general';
  };

  useEffect(() => {    if (!userRole) {
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
    const matchesStatusFilter =
      filterStatus === "all" ||
      report.status === filterStatus;

    const matchesProblemFilter =
      filterProblem === "all" ||
      report.problem === filterProblem;

    return matchesStatusFilter && matchesProblemFilter;
  });

  // Get unique problem types for dropdown (normalized)
  const uniqueProblems = [...new Set(reportHistory.map(report => normalizeProblemCategory(report.problem)))];

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
      flood: 'bg-green-500/10 text-green-700 border-green-200',
      pest: 'bg-red-500/10 text-red-700 border-red-200',
      drought: 'bg-orange-500/10 text-orange-700 border-orange-200',
      disease: 'bg-purple-500/10 text-purple-700 border-purple-200',
      general: 'bg-gray-500/10 text-gray-700 border-gray-200'
    };
    return colors[problem as keyof typeof colors] || colors.general;
  };

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {      toast({
        title: "No Data to Export",
        description: "There are no reports to export.",
        variant: "destructive",
      });
      return;
    }

    const csvData = filteredHistory.map(report => ({
      'Date': report.createdAt?.toDate().toLocaleDateString(),
      'Farmer': report.username,
      'Problem Type': normalizeProblemCategory(report.problem),
      'Affected Crop': report.affectedCrop,
      'Report': report.reportText,
      'Best Practices': report.recommendedCrops?.join('; '),
      'Caution / Things to Avoid': report.cropsToAvoid?.join('; '),
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

  // Handle delete report
  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, "farmReports", reportId));

      // Remove the deleted report from the local state
      setReportHistory(prevReports =>
        prevReports.filter(report => report.id !== reportId)
      );

      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete request (opens confirmation dialog)
  const handleDeleteRequest = (report: Report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  // Confirm delete (called from dialog)
  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteDoc(doc(db, "farmReports", reportToDelete.id));

      // Remove the deleted report from the local state
      setReportHistory(prevReports =>
        prevReports.filter(report => report.id !== reportToDelete.id)
      );

      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error: any) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete the report. Please try again.",
        variant: "destructive",
      });

      // Close dialog even on error
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
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
              </div>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns with Report Count */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Reports
              </CardTitle>
              {/* Report Count Indicator */}
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(indexOfLastReport, filteredHistory.length)} of {filteredHistory.length} reports
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter Dropdown - Narrower */}
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1 text-sm border rounded-md bg-background w-32"
                >
                  <option value="all">All Status</option>
                  <option value="processed">Processed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Problem Type Filter Dropdown - Narrower */}
              <div>
                <label className="text-sm font-medium mb-1 block">Problem Type</label>
                <select
                  value={filterProblem}
                  onChange={(e) => setFilterProblem(e.target.value)}
                  className="px-2 py-1 text-sm border rounded-md bg-background w-32"
                >
                  <option value="all">All Problems</option>
                  {uniqueProblems.map(problem => (
                    <option key={problem} value={problem}>
                      {problem.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                {(filterStatus !== "all" || filterProblem !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterProblem("all");
                    }}
                    className="h-8 text-sm px-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {userRole !== 'farmer' && (
                <div className="flex items-end">
                  <Button variant="outline" onClick={exportToCSV} className="h-8 text-sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="flex flex-col h-full">
          {filteredHistory.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">No reports found</p>
                <p className="text-sm">
                  {(filterStatus !== "all" || filterProblem !== "all")
                    ? "Try adjusting your filter criteria."
                    : userRole === 'farmer'
                      ? "You haven't submitted any reports yet. Go to dashboard to report a problem."
                      : "No reports have been submitted yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-grow">
              <div className="space-y-4 pb-4">
                {currentReports.map((report) => {
                  const isExpanded = expandedReportId === report.id;
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
                              className={`${getProblemColor(normalizeProblemCategory(report.problem))} border capitalize`}
                            >
                              {normalizeProblemCategory(report.problem).replace('_', ' ')}
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

                        {/* Show full content only when expanded */}
                        {isExpanded && (
                          <>
                            {/* Recommendations Grid */}
                            <div className="grid md:grid-cols-2 gap-4">
                              {report.recommendedCrops && report.recommendedCrops.length > 0 && (
                                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                                  <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Best Practices
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
                                    Caution / Things to Avoid
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
                                <p className="text-sm">{formatAiGuidance(report.advice)}</p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>

                      {/* See More / See Less Button */}
                      <div className="px-6 pb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                          className="w-full text-white bg-gradient-primary hover:opacity-90 hover:text-white transition-opacity"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              See Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              See More
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Delete Button for Farmers (only shown when not expanded or at the bottom when expanded) */}
                      {userRole === 'farmer' && !isExpanded && (
                        <div className="px-6 pb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRequest(report)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Report
                          </Button>
                        </div>
                      )}

                      {userRole === 'farmer' && isExpanded && (
                        <div className="px-6 pb-4 flex justify-between">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRequest(report)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Report
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}

                {/* Pagination Controls - Updated to match Market Demand design */}
                {filteredHistory.length > 0 && (
                  <div className="border-t pt-1 px-4" style={{ paddingBottom: '15px', marginTop: '15px' }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground" style={{ margin: '1px 0' }}>
                        Showing {(currentPage - 1) * reportsPerPage + 1} to {Math.min(currentPage * reportsPerPage, filteredHistory.length)} of {filteredHistory.length} reports
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
                          const totalPages = Math.ceil(filteredHistory.length / reportsPerPage);
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
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredHistory.length / reportsPerPage)))}
                          disabled={currentPage === Math.ceil(filteredHistory.length / reportsPerPage)}
                          className="h-8 px-3 text-sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
              {reportToDelete && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{reportToDelete.username}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{reportToDelete.reportText}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default History;
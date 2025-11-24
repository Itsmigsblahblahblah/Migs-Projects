import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Eye, Download, FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";

import ReportDetailView from "./ReportDetailView";
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
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useToast } from "@/hooks/use-toast";

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

interface ReportsListProps {
    reports: Report[];
    farmers: Farmer[]; // Add farmers prop to get barangay information
    onExport: () => void;
    onUpdateStatus: (reportId: string, status: string) => void;
}

const ReportsList = ({ reports, farmers, onExport, onUpdateStatus }: ReportsListProps) => {
    const [localReports, setLocalReports] = useState<Report[]>(reports);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'barangay'>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBarangay, setSelectedBarangay] = useState<string>('all'); // For barangay filtering
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
    const reportsPerPage = 3; // Show 3 reports per page
    const contentRef = useRef<HTMLDivElement>(null); // Ref for scrollable content area
    const { toast } = useToast();

    // Create a map of userId to homeAddress for quick lookup
    const farmerAddressMap = useMemo(() => {
        const map: Record<string, string> = {};
        farmers.forEach(farmer => {
            if (farmer.uid && farmer.homeAddress) {
                map[farmer.uid] = farmer.homeAddress;
            }
        });
        return map;
    }, [farmers]);

    // Get unique barangays for dropdown
    const uniqueBarangays = useMemo(() => {
        const barangays = new Set<string>();
        localReports.forEach(report => {
            const barangay = farmerAddressMap[report.userId] || 'Unknown Barangay';
            barangays.add(barangay);
        });
        return Array.from(barangays).sort();
    }, [localReports, farmerAddressMap]);

    // Update local reports when props change
    useEffect(() => {
        setLocalReports(reports);
    }, [reports]);

    // Sort and filter reports based on selected option
    const sortedReports = useMemo(() => {
        let sorted = [...localReports];
        
        if (sortOption === 'newest') {
            sorted.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
        } else if (sortOption === 'oldest') {
            sorted.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateA.getTime() - dateB.getTime();
            });
        } else if (sortOption === 'barangay') {
            sorted.sort((a, b) => {
                const barangayA = farmerAddressMap[a.userId] || '';
                const barangayB = farmerAddressMap[b.userId] || '';
                return barangayA.localeCompare(barangayB);
            });
        }
        
        // Filter by selected barangay if not 'all'
        if (sortOption === 'barangay' && selectedBarangay !== 'all') {
            sorted = sorted.filter(report => {
                const barangay = farmerAddressMap[report.userId] || 'Unknown Barangay';
                return barangay === selectedBarangay;
            });
        }
        
        return sorted;
    }, [localReports, sortOption, farmerAddressMap, selectedBarangay]);

    // Get unique barangays for grouping display
    const groupedByBarangay = useMemo(() => {
        const groups: Record<string, Report[]> = {};
        sortedReports.forEach(report => {
            const barangay = farmerAddressMap[report.userId] || 'Unknown Barangay';
            if (!groups[barangay]) {
                groups[barangay] = [];
            }
            groups[barangay].push(report);
        });
        return groups;
    }, [sortedReports, farmerAddressMap]);

    // Calculate statistics for the selected barangay
    const barangayStats = useMemo(() => {
        if (sortOption !== 'barangay' || selectedBarangay === 'all') return null;
        
        const reportsInBarangay = sortedReports;
        const totalReports = reportsInBarangay.length;
        
        // Count problems by type
        const problemCounts: Record<string, number> = {};
        reportsInBarangay.forEach(report => {
            const problem = report.problem || 'general';
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        });
        
        return {
            totalReports,
            problemCounts
        };
    }, [sortedReports, sortOption, selectedBarangay]);

    // Pagination calculations
    const totalPages = Math.ceil(sortedReports.length / reportsPerPage);
    const startIndex = (currentPage - 1) * reportsPerPage;
    const visibleReports = sortedReports.slice(startIndex, startIndex + reportsPerPage);

    // Pagination calculations for grouped view
    const groupedReports = Object.entries(groupedByBarangay).flatMap(([barangay, reports]) => 
        reports.map(report => ({ ...report, barangay }))
    );
    
    const totalGroupedPages = Math.ceil(groupedReports.length / reportsPerPage);
    const startGroupedIndex = (currentPage - 1) * reportsPerPage;
    const visibleGroupedReports = groupedReports.slice(startGroupedIndex, startGroupedIndex + reportsPerPage);

    // Group the visible reports by barangay for display
    const visibleGroupedByBarangay = visibleGroupedReports.reduce((acc, report) => {
        if (!acc[report.barangay]) {
            acc[report.barangay] = [];
        }
        acc[report.barangay].push(report);
        return acc;
    }, {} as Record<string, (Report & { barangay: string })[]>);

    const openReportDetail = (report: Report) => {
        setSelectedReport(report);
    };

    const closeReportDetail = () => {
        setSelectedReport(null);
    };

    // Scroll to top when page changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [currentPage, sortOption, selectedBarangay]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [sortOption, selectedBarangay, localReports]);

    // Handle page change with scroll to top
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        // Scroll to top of content area
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    // Handle delete request
    const handleDeleteRequest = (report: Report) => {
        setReportToDelete(report);
        setDeleteDialogOpen(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!reportToDelete) return;
        
        try {
            // Remove from local state immediately for instant UI update
            setLocalReports(prevReports => 
                prevReports.filter(report => report.id !== reportToDelete.id)
            );
            
            // Delete from Firestore
            await deleteDoc(doc(db, "farmReports", reportToDelete.id));
            
            // Show success toast
            toast({
                title: "Report Deleted",
                description: "The report has been successfully deleted.",
            });
            
            // Close dialog and reset state
            setDeleteDialogOpen(false);
            setReportToDelete(null);
        } catch (error) {
            console.error("Error deleting report:", error);
            // Restore the report in case of error
            setLocalReports(prevReports => {
                if (!prevReports.some(report => report.id === reportToDelete.id)) {
                    return [...prevReports, reportToDelete];
                }
                return prevReports;
            });
            toast({
                title: "Error",
                description: "Failed to delete the report. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Farmer Reports</CardTitle>
                            <CardDescription>Latest submissions from farmers ({localReports.length} total)</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onExport}
                            disabled={localReports.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export All
                        </Button>
                    </div>
                    
                    {/* Sorting Options */}
                    <div className="flex flex-wrap gap-2 pt-4">
                        <Button
                            variant={sortOption === 'newest' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortOption('newest')}
                        >
                            Newest First
                        </Button>
                        <Button
                            variant={sortOption === 'oldest' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortOption('oldest')}
                        >
                            Oldest First
                        </Button>
                        <Button
                            variant={sortOption === 'barangay' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortOption('barangay')}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                            Group by Barangay
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Barangay dropdown and stats when grouping is active */}
                    {sortOption === 'barangay' && (
                        <div className="pt-4 space-y-4">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-medium">Filter by Barangay:</span>
                                <select
                                    value={selectedBarangay}
                                    onChange={(e) => setSelectedBarangay(e.target.value)}
                                    className="border rounded-md px-3 py-1 text-sm"
                                >
                                    <option value="all">All Barangays</option>
                                    {uniqueBarangays.map(barangay => (
                                        <option key={barangay} value={barangay}>
                                            {barangay}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Stats display for selected barangay */}
                            {selectedBarangay !== 'all' && barangayStats && (
                                <div className="bg-muted p-3 rounded-md">
                                    <h3 className="font-semibold">
                                        {selectedBarangay} has {barangayStats.totalReports} report{barangayStats.totalReports !== 1 ? 's' : ''}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 mt-2">
                                        {Object.entries(barangayStats.problemCounts).map(([problem, count]) => (
                                            <div key={problem} className="flex items-center gap-1">
                                                <span className="text-sm capitalize">{problem}:</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {localReports.length > 0 ? (
                        <div ref={contentRef} className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {sortOption === 'barangay' && selectedBarangay === 'all' ? (
                                // Grouped by barangay view with pagination
                                <>
                                    {Object.entries(visibleGroupedByBarangay).map(([barangay, reports]) => (
                                        <div key={barangay} className="border-b pb-4 last:border-b-0">
                                            <h3 className="font-semibold text-lg mb-2">{barangay}</h3>
                                            <div className="space-y-3">
                                                {reports.map((report) => (
                                                    <div
                                                        key={report.id}
                                                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
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
                                                                        onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                                        Mark Resolved
                                                                    </Button>
                                                                )}
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm"
                                                                    onClick={() => openReportDetail(report)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    View Details
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteRequest(report)}
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Pagination Controls for Grouped View - Updated to match crop management design */}
                                    {totalGroupedPages > 1 && (
                                        <div className="flex justify-center mt-6">
                                            <div className="flex items-center space-x-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </Button>
                                                
                                                {Array.from({ length: Math.min(5, totalGroupedPages) }, (_, i) => {
                                                    // Calculate start index for pagination window
                                                    let start = 1;
                                                    if (totalGroupedPages > 5) {
                                                        if (currentPage <= 3) {
                                                            start = 1;
                                                        } else if (currentPage >= totalGroupedPages - 2) {
                                                            start = totalGroupedPages - 4;
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
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                                
                                                {totalGroupedPages > 5 && (
                                                    <>
                                                        {currentPage < totalGroupedPages - 2 && (
                                                            <>
                                                                <span className="px-1">...</span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handlePageChange(totalGroupedPages)}
                                                                >
                                                                    {totalGroupedPages}
                                                                </Button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalGroupedPages))}
                                                    disabled={currentPage === totalGroupedPages}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // Regular list view or filtered barangay view
                                <>
                                    {visibleReports.map((report) => (
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
                                                    {/* Display home address next to user info */}
                                                    <span className="text-sm text-muted-foreground">
                                                        {farmerAddressMap[report.userId] || 'Unknown Barangay'}
                                                    </span>
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
                                                            onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Mark Resolved
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => openReportDetail(report)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View Details
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteRequest(report)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination Controls - Updated to match crop management design */}
                                    {(sortOption !== 'barangay' || selectedBarangay !== 'all') && totalPages > 1 && (
                                        <div className="flex justify-center mt-6">
                                            <div className="flex items-center space-x-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </Button>
                                                
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
                                                                >
                                                                    {totalPages}
                                                                </Button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p>No reports submitted yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Detail Modal */}
            {selectedReport && (
                <ReportDetailView 
                    report={selectedReport} 
                    onClose={closeReportDetail}
                    onUpdateStatus={onUpdateStatus}
                    isAdminView={true} // Set to true for admin view
                />
            )}

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
        </>
    );
};

export default ReportsList;
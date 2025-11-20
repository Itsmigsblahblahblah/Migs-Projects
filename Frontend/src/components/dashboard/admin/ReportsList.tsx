import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Eye, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import ReportDetailView from "./ReportDetailView";

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
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'barangay'>('newest');
    const [showAll, setShowAll] = useState(false);
    const [selectedBarangay, setSelectedBarangay] = useState<string>('all'); // For barangay filtering

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
        reports.forEach(report => {
            const barangay = farmerAddressMap[report.userId] || 'Unknown Barangay';
            barangays.add(barangay);
        });
        return Array.from(barangays).sort();
    }, [reports, farmerAddressMap]);

    // Sort and filter reports based on selected option
    const sortedReports = useMemo(() => {
        let sorted = [...reports];
        
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
    }, [reports, sortOption, farmerAddressMap, selectedBarangay]);

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

    const openReportDetail = (report: Report) => {
        setSelectedReport(report);
    };

    const closeReportDetail = () => {
        setSelectedReport(null);
    };

    // Show only first 3 reports by default, or all if showAll is true
    const visibleReports = showAll ? sortedReports : sortedReports.slice(0, 3);

    return (
        <>
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Farmer Reports</CardTitle>
                            <CardDescription>Latest submissions from farmers ({reports.length} total)</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onExport}
                            disabled={reports.length === 0}
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
                            className="flex items-center gap-2"
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
                    {reports.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {sortOption === 'barangay' && selectedBarangay === 'all' ? (
                                // Grouped by barangay view
                                Object.entries(groupedByBarangay).map(([barangay, reports]) => (
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
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Regular list view or filtered barangay view
                                visibleReports.map((report) => (
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
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            
                            {/* Show more/less button when not grouping by barangay or when viewing a specific barangay */}
                            {(sortOption !== 'barangay' || selectedBarangay !== 'all') && reports.length > 3 && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAll(!showAll)}
                                    >
                                        {showAll ? (
                                            <>
                                                <ChevronUp className="h-4 w-4 mr-2" />
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4 mr-2" />
                                                Show All ({reports.length} total)
                                            </>
                                        )}
                                    </Button>
                                </div>
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
        </>
    );
};

export default ReportsList;
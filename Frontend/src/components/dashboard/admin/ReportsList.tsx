import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Eye, Download, FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // For dropdown sorting
    const [sortBy, setSortBy] = useState<'date' | 'status' | 'problem'>('date'); // For dropdown sorting
    const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined); // For dropdown accordion
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [problemFilter, setProblemFilter] = useState('all');
    const [barangayFilter, setBarangayFilter] = useState('all');
    const [selectedBarangay, setSelectedBarangay] = useState('all');
    const contentRef = useRef<HTMLDivElement>(null);
    const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const { toast } = useToast();
    const reportsPerPage = 10;

    // Sync localReports with parent reports when they change (e.g., when status is updated)
    useEffect(() => {
        setLocalReports(reports);
    }, [reports]);

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

    // Create a map of farmer IDs to their addresses
    const farmerAddressMap = useMemo(() => {
        const map: Record<string, string> = {};
        farmers.forEach(farmer => {
            map[farmer.uid] = farmer.homeAddress || 'Unknown';
        });
        return map;
    }, [farmers]);

    // Get unique barangays from actual reports (not all farmers)
    const uniqueBarangays = useMemo(() => {
        const barangays = localReports
            .map(report => farmerAddressMap[report.userId] || 'Unknown')
            .filter(Boolean);
        return [...new Set(barangays)].sort();
    }, [localReports, farmerAddressMap]);

    // Filter and sort reports
    const { sortedReports, stats } = useMemo(() => {
        // Apply filters
        let filteredReports = localReports.filter(report => {
            const matchesSearch = searchQuery === '' || 
                report.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                report.reportText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (report.affectedCrop && report.affectedCrop.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
            const matchesProblem = problemFilter === 'all' || normalizeProblemCategory(report.problem) === problemFilter;
            
            // Fix: Use farmerAddressMap to get barangay and filter correctly
            const reportBarangay = farmerAddressMap[report.userId] || 'Unknown Barangay';
            const matchesBarangay = selectedBarangay === 'all' || reportBarangay === selectedBarangay;
            
            return matchesSearch && matchesStatus && matchesProblem && matchesBarangay;
        });

        // Apply sorting
        filteredReports.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'date':
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    comparison = dateA.getTime() - dateB.getTime();
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                default:
                    const defaultDateA = a.createdAt?.toDate?.() || new Date(0);
                    const defaultDateB = b.createdAt?.toDate?.() || new Date(0);
                    comparison = defaultDateA.getTime() - defaultDateB.getTime();
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Calculate stats
        const totalReports = filteredReports.length;
        
        // Count problems by type (normalized)
        const problemCounts: Record<string, number> = {};
        filteredReports.forEach(report => {
            const problem = normalizeProblemCategory(report.problem) || 'general';
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        });

        return {
            sortedReports: filteredReports,
            stats: {
                totalReports,
                problemCounts
            }
        };
    }, [localReports, searchQuery, statusFilter, problemFilter, selectedBarangay, sortBy, sortOrder, farmerAddressMap]);

    // Pagination calculations
    const totalPages = Math.ceil(sortedReports.length / reportsPerPage);
    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const visibleReports = sortedReports.slice(startIndex, endIndex);

    const openReportDetail = (report: Report) => {
        setSelectedReport(report);
    };

    const closeReportDetail = () => {
        setSelectedReport(null);
    };

    // Handle sort change from dropdown
    const handleSortChange = (criteria: 'date' | 'status' | 'problem', order: 'asc' | 'desc') => {
        setSortBy(criteria);
        setSortOrder(order);
        // Reset to first page when sorting changes
        setCurrentPage(1);
    };
    // Handle accordion change in dropdown
    const handleAccordionChange = (value: string | undefined) => {
        setOpenAccordion(value);
    };

    // Get label for current sort criteria
    const getSortByLabel = () => {
        switch (sortBy) {
            case 'date': return 'Date';
            case 'status': return 'Status';
            case 'problem': return 'Problem Category';
            default: return 'Date';
        }
    };    // Get label for current sort order
    const getOrderLabel = () => {
        return sortOrder === 'asc' ? 'Ascending' : 'Descending';
    };

    // Scroll to top when page changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [currentPage]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, problemFilter, selectedBarangay, sortBy, sortOrder]);

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

    // Batch delete functions
    const toggleDeleteMode = () => {
        setDeleteMode(!deleteMode);
        setSelectedReports([]); // Clear selections when toggling mode
    };

    const toggleReportSelection = (reportId: string) => {
        setSelectedReports(prev => 
            prev.includes(reportId) 
                ? prev.filter(id => id !== reportId)
                : [...prev, reportId]
        );
    };

    const selectAllReports = () => {
        if (selectedReports.length === visibleReports.length) {
            setSelectedReports([]); // Deselect all if all are selected
        } else {
            setSelectedReports(visibleReports.map(report => report.id));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedReports.length === 0) {
            toast({
                title: "No Reports Selected",
                description: "Please select reports to delete.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Remove from local state immediately for instant UI update
            setLocalReports(prevReports =>
                prevReports.filter(report => !selectedReports.includes(report.id))
            );

            // Delete all selected reports from Firestore
            const deletePromises = selectedReports.map(reportId => 
                deleteDoc(doc(db, "farmReports", reportId))
            );
            await Promise.all(deletePromises);

            // Show success toast
            toast({
                title: "Reports Deleted",
                description: `Successfully deleted ${selectedReports.length} report(s).`,
            });

            // Exit delete mode and clear selections
            setDeleteMode(false);
            setSelectedReports([]);
        } catch (error) {
            console.error("Error deleting reports:", error);
            toast({
                title: "Error",
                description: "Failed to delete reports. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <Card className="shadow-card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Farmer Reports</CardTitle>
                            <CardDescription>Latest submissions from farmers ({localReports.length} total)</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {deleteMode && (
                                <Button
                                    variant="destructive"
                                    onClick={handleBatchDelete}
                                    disabled={selectedReports.length === 0}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Selected ({selectedReports.length})
                                </Button>
                            )}
                            <Button
                                variant={deleteMode ? "default" : "outline"}
                                onClick={toggleDeleteMode}
                                className={deleteMode ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-blue-50 hover:text-blue-700"}
                            >
                                {deleteMode ? (
                                    <>Cancel</>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Batch Delete
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={onExport}
                                disabled={localReports.length === 0}
                                className="hover:bg-blue-50 hover:text-blue-700"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export All
                            </Button>
                        </div>
                    </div>

                    {/* Sorting Options - Replace buttons with dropdown */}
                    <div className="flex flex-wrap gap-2 pt-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    Sort: {getSortByLabel()} - {getOrderLabel()}
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <Accordion
                                    type="single"
                                    collapsible
                                    value={openAccordion}
                                    onValueChange={handleAccordionChange}
                                    className="w-full"
                                >
                                    <AccordionItem value="date" className="border-b-0">
                                        <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                            <span className="flex items-center">
                                                <ChevronRight className="h-4 w-4 mr-2" />
                                                Date
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-0">
                                            <DropdownMenuItem onClick={() => handleSortChange("date", "desc")} className="hover:bg-blue-50 hover:text-blue-700" style={{ '--tw-bg-opacity': '1' } as React.CSSProperties} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                <ArrowDown className="h-4 w-4 mr-2" />
                                                Newest
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSortChange("date", "asc")} className="hover:bg-blue-50 hover:text-blue-700" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                <ArrowUp className="h-4 w-4 mr-2" />
                                                Oldest
                                            </DropdownMenuItem>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <DropdownMenuSeparator />

                                    <AccordionItem value="status" className="border-b-0">
                                        <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                            <span className="flex items-center">
                                                <ChevronRight className="h-4 w-4 mr-2" />
                                                Group by
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-0">
                                            <DropdownMenuItem onClick={() => handleSortChange("status", "desc")} className="hover:bg-blue-50 hover:text-blue-700" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                <ArrowDown className="h-4 w-4 mr-2" />
                                                Resolved
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSortChange("status", "asc")} className="hover:bg-blue-50 hover:text-blue-700" onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                <ArrowUp className="h-4 w-4 mr-2" />
                                                Processed
                                            </DropdownMenuItem>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Add Problem Category as dropdown like Date and Group by */}
                                    <DropdownMenuSeparator />
                                    
                                    <AccordionItem value="problem" className="border-b-0">
                                        <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                            <span className="flex items-center">
                                                <ChevronRight className="h-4 w-4 mr-2" />
                                                Problem Category
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-0">
                                            <DropdownMenuItem onClick={() => setProblemFilter('general')} className="hover:bg-blue-50 hover:text-blue-700">
                                                General
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setProblemFilter('flood')} className="hover:bg-blue-50 hover:text-blue-700">
                                                Flood
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setProblemFilter('pest')} className="hover:bg-blue-50 hover:text-blue-700">
                                                Pest
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setProblemFilter('disease')} className="hover:bg-blue-50 hover:text-blue-700">
                                                Disease
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setProblemFilter('drought')} className="hover:bg-blue-50 hover:text-blue-700">
                                                Drought
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setProblemFilter('all')} className="hover:bg-blue-50 hover:text-blue-700">
                                                All Problems
                                            </DropdownMenuItem>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant={sortOption === 'barangay' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                if (sortOption === 'barangay') {
                                    // Reset to default view when closing
                                    setSortOption('newest');
                                    setSelectedBarangay('all');
                                } else {
                                    setSortOption('barangay');
                                    // Auto-select first barangay if available
                                    if (uniqueBarangays.length > 0) {
                                        setSelectedBarangay(uniqueBarangays[0]);
                                    }
                                }
                            }}
                            className={`text-blue-600 hover:text-white ${sortOption === 'barangay' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                        >
                            Group by Barangay
                        </Button>

                        {/* Filter by Barangay dropdown - shown to the right when grouping is active */}
                        {sortOption === 'barangay' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium whitespace-nowrap">Filter by Barangay:</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            {selectedBarangay || 'Select Barangay'}
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 max-h-60 overflow-y-auto">
                                        {uniqueBarangays.map(barangay => (
                                            <DropdownMenuItem
                                                key={barangay}
                                                onClick={() => setSelectedBarangay(barangay)}
                                                className={`cursor-pointer ${selectedBarangay === barangay ? "bg-blue-50 text-blue-700" : ""}`}
                                                style={{ cursor: 'pointer', '--tw-bg-opacity': '1' } as React.CSSProperties}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#eff6ff';
                                                    e.currentTarget.style.color = '#1d4ed8';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedBarangay !== barangay) {
                                                        e.currentTarget.style.backgroundColor = '';
                                                        e.currentTarget.style.color = '';
                                                    }
                                                }}
                                            >
                                                {barangay}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>

                    {/* Stats display for selected barangay - shown below */}
                    {sortOption === 'barangay' && selectedBarangay && (
                        <div className="pt-4">
                            <div className="bg-muted p-3 rounded-md">
                                <h3 className="font-semibold">
                                    {selectedBarangay} has {stats.totalReports} report{stats.totalReports !== 1 ? 's' : ''}
                                </h3>
                                <div className="flex flex-wrap gap-4 mt-2">
                                    {Object.entries(stats.problemCounts).map(([problem, count]) => (
                                        <div key={problem} className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-2 py-1 transition-colors" style={{ cursor: 'pointer' }}>
                                            <span className="text-sm capitalize">{problem}:</span>
                                            <Badge variant="secondary">{count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    {localReports.length > 0 ? (
                        <div className="flex flex-col h-full">
                            <div className="space-y-4 flex-grow">
                                {sortOption === 'barangay' ? (
                                    // Grouped by barangay view with pagination - TABLE FORMAT
                                    <>
                                        <div className="overflow-x-auto rounded-lg border">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                                        {deleteMode && (
                                                            <th className="text-center p-3 font-semibold text-gray-700 text-sm w-16">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedReports.length === visibleReports.length && visibleReports.length > 0}
                                                                    onChange={selectAllReports}
                                                                    className="w-4 h-4 cursor-pointer"
                                                                />
                                                            </th>
                                                        )}
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleReports.map((report, index) => {
                                                        const rowNumber = startIndex + index + 1;
                                                        return (
                                                            <tr
                                                                key={report.id}
                                                                className={`border-b transition-colors ${
                                                                    deleteMode 
                                                                        ? selectedReports.includes(report.id)
                                                                            ? 'bg-blue-100 hover:bg-blue-200'
                                                                            : 'hover:bg-gray-50'
                                                                        : 'hover:bg-blue-50/50'
                                                                }`}
                                                            >
                                                                {deleteMode && (
                                                                    <td className="p-3 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedReports.includes(report.id)}
                                                                            onChange={() => toggleReportSelection(report.id)}
                                                                            className="w-4 h-4 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                )}
                                                                <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                                                <td className="p-3">
                                                                    <div className="font-medium text-gray-900">{report.username}</div>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {farmerAddressMap[report.userId] || 'Unknown Barangay'}
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge variant="outline" className="capitalize text-xs">
                                                                        {normalizeProblemCategory(report.problem)}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700 capitalize">{report.affectedCrop || 'N/A'}</td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {report.createdAt?.toDate().toLocaleDateString()}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <Badge
                                                                        variant={report.status === 'resolved' ? 'default' : 'secondary'}
                                                                        className={
                                                                            report.status === 'resolved' ? 'bg-green-600 text-white' :
                                                                            report.status === 'processed' ? 'bg-yellow-500 text-white' :
                                                                            'bg-gray-400 text-white'
                                                                        }
                                                                    >
                                                                        {report.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        {report.status !== 'resolved' && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                                                                title="Mark Resolved"
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openReportDetail(report)}
                                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteRequest(report)}
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Controls - Match FarmersList design */}
                                        <div className="border-t pt-4 mt-auto">
                                                {/* Desktop layout - text on left, pagination on right */}
                                                <div className="hidden md:flex items-center justify-between">
                                                    <div className="text-sm text-muted-foreground">
                                                        Showing {startIndex + 1} to {Math.min(endIndex, sortedReports.length)} of {sortedReports.length} reports
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Previous
                                                        </Button>

                                                        {/* Page Number Buttons */}
                                                        {(() => {
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
                                                                        onClick={() => handlePageChange(1)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                                        onClick={() => handlePageChange(i)}
                                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                                        onClick={() => handlePageChange(totalPages)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Mobile layout - text and pagination both centered, pagination below text */}
                                                <div className="md:hidden space-y-4">
                                                    <div className="text-sm text-muted-foreground text-center">
                                                        Showing {startIndex + 1} to {Math.min(endIndex, sortedReports.length)} of {sortedReports.length} reports
                                                    </div>
                                                    <div className="flex justify-center space-x-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Previous
                                                        </Button>

                                                        {/* Page Number Buttons */}
                                                        {(() => {
                                                            const pageButtons = [];
                                                            // Show fewer pages on mobile to prevent overflow
                                                            let startPage = Math.max(1, currentPage - 1);
                                                            let endPage = Math.min(totalPages, startPage + 2);

                                                            // Adjust startPage if we're near the end
                                                            if (endPage - startPage < 2) {
                                                                startPage = Math.max(1, endPage - 2);
                                                            }

                                                            // First page button
                                                            if (startPage > 1) {
                                                                pageButtons.push(
                                                                    <Button
                                                                        key={1}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handlePageChange(1)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                                    >
                                                                        1
                                                                    </Button>
                                                                );
                                                                // Only show ellipsis if there's a significant gap
                                                                if (startPage > 2) {
                                                                    pageButtons.push(
                                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
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
                                                                        onClick={() => handlePageChange(i)}
                                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
                                                                    );
                                                                }
                                                                pageButtons.push(
                                                                    <Button
                                                                        key={totalPages}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handlePageChange(totalPages)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                    </>
                                ) : (
                                    // Regular list view or filtered barangay view - TABLE FORMAT
                                    <>
                                        <div className="overflow-x-auto rounded-lg border">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                                        {deleteMode && (
                                                            <th className="text-center p-3 font-semibold text-gray-700 text-sm w-16">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedReports.length === visibleReports.length && visibleReports.length > 0}
                                                                    onChange={selectAllReports}
                                                                    className="w-4 h-4 cursor-pointer"
                                                                />
                                                            </th>
                                                        )}
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">#</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Barangay</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleReports.map((report, index) => {
                                                        const rowNumber = startIndex + index + 1;
                                                        return (
                                                            <tr
                                                                key={report.id}
                                                                className={`border-b transition-colors ${
                                                                    deleteMode 
                                                                        ? selectedReports.includes(report.id)
                                                                            ? 'bg-blue-100 hover:bg-blue-200'
                                                                            : 'hover:bg-gray-50'
                                                                        : 'hover:bg-blue-50/50'
                                                                }`}
                                                            >
                                                                {deleteMode && (
                                                                    <td className="p-3 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedReports.includes(report.id)}
                                                                            onChange={() => toggleReportSelection(report.id)}
                                                                            className="w-4 h-4 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                )}
                                                                <td className="p-3 text-sm text-gray-600 font-medium">{rowNumber}</td>
                                                                <td className="p-3">
                                                                    <div className="font-medium text-gray-900">{report.username}</div>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {farmerAddressMap[report.userId] || 'Unknown Barangay'}
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge variant="outline" className="capitalize text-xs">
                                                                        {normalizeProblemCategory(report.problem)}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700 capitalize">{report.affectedCrop || 'N/A'}</td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {report.createdAt?.toDate().toLocaleDateString()}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <Badge
                                                                        variant={report.status === 'resolved' ? 'default' : 'secondary'}
                                                                        className={
                                                                            report.status === 'resolved' ? 'bg-green-600 text-white' :
                                                                            report.status === 'processed' ? 'bg-yellow-500 text-white' :
                                                                            'bg-gray-400 text-white'
                                                                        }
                                                                    >
                                                                        {report.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        {report.status !== 'resolved' && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => onUpdateStatus(report.id, 'resolved')}
                                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                                                                title="Mark Resolved"
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openReportDetail(report)}
                                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteRequest(report)}
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Controls - Match FarmersList design */}
                                        <div className="border-t pt-4 mt-auto">
                                                {/* Desktop layout - text on left, pagination on right */}
                                                <div className="hidden md:flex items-center justify-between">
                                                    <div className="text-sm text-muted-foreground">
                                                        Showing {startIndex + 1} to {Math.min(endIndex, sortedReports.length)} of {sortedReports.length} reports
                                                    </div>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Previous
                                                        </Button>

                                                        {/* Page Number Buttons */}
                                                        {(() => {
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
                                                                        onClick={() => handlePageChange(1)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                                        onClick={() => handlePageChange(i)}
                                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                                        onClick={() => handlePageChange(totalPages)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Mobile layout - text and pagination both centered, pagination below text */}
                                                <div className="md:hidden space-y-4">
                                                    <div className="text-sm text-muted-foreground text-center">
                                                        Showing {startIndex + 1} to {Math.min(endIndex, sortedReports.length)} of {sortedReports.length} reports
                                                    </div>
                                                    <div className="flex justify-center space-x-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Previous
                                                        </Button>

                                                        {/* Page Number Buttons */}
                                                        {(() => {
                                                            const pageButtons = [];
                                                            // Show fewer pages on mobile to prevent overflow
                                                            let startPage = Math.max(1, currentPage - 1);
                                                            let endPage = Math.min(totalPages, startPage + 2);

                                                            // Adjust startPage if we're near the end
                                                            if (endPage - startPage < 2) {
                                                                startPage = Math.max(1, endPage - 2);
                                                            }

                                                            // First page button
                                                            if (startPage > 1) {
                                                                pageButtons.push(
                                                                    <Button
                                                                        key={1}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handlePageChange(1)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                                    >
                                                                        1
                                                                    </Button>
                                                                );
                                                                // Only show ellipsis if there's a significant gap
                                                                if (startPage > 2) {
                                                                    pageButtons.push(
                                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
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
                                                                        onClick={() => handlePageChange(i)}
                                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
                                                                    );
                                                                }
                                                                pageButtons.push(
                                                                    <Button
                                                                        key={totalPages}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handlePageChange(totalPages)}
                                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                            onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                                        >
                                                            Next
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                    </>
                                )}
                            </div>
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
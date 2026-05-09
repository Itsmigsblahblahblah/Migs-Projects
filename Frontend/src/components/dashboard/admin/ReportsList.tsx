import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Eye, Download, FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trash2, Search } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import ProductionReport from "./ProductionReport";
import FinancialReport from "./FinancialReport";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    const [selectionFilter, setSelectionFilter] = useState<'all' | 'processed' | 'resolved'>('all'); // For selection dropdown
    const [activeTab, setActiveTab] = useState<'financial' | 'production' | 'complaints'>(() => {
        // Load saved tab from localStorage, default to 'complaints' if not found
        const savedTab = localStorage.getItem('reportsActiveTab');
        if (savedTab === 'financial' || savedTab === 'production' || savedTab === 'complaints') {
            return savedTab;
        }
        return 'complaints';
    });
    const { toast } = useToast();
    const reportsPerPage = 10;

    // Export dialog state
    const [showExportDialog, setShowExportDialog] = useState(false);

    // Sync localReports with parent reports when they change (e.g., when status is updated)
    useEffect(() => {
        setLocalReports(reports);
    }, [reports]);

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('reportsActiveTab', activeTab);
    }, [activeTab]);

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

    // Create a map of farmer IDs to their current profile data (name, farm address)
    const farmerProfileMap = useMemo(() => {
        const map: Record<string, { fullName: string; address: string }> = {};
        farmers.forEach(farmer => {
            // Use farmAddress first, fallback to homeAddress, then 'Unknown'
            map[farmer.uid] = {
                fullName: farmer.fullName || 'Unknown Farmer',
                address: farmer.farmAddress || farmer.homeAddress || 'Unknown'
            };
        });
        return map;
    }, [farmers]);

    // Get unique farm addresses from actual reports (not all farmers)
    const uniqueFarmAddresses = useMemo(() => {
        const addresses = localReports
            .map(report => farmerProfileMap[report.userId]?.address || 'Unknown')
            .filter(Boolean);
        return [...new Set(addresses)].sort();
    }, [localReports, farmerProfileMap]);

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
            
            // Fix: Use farmerProfileMap to get farm address and filter correctly
            const reportFarmAddress = farmerProfileMap[report.userId]?.address || 'Unknown';
            const matchesBarangay = selectedBarangay === 'all' || reportFarmAddress === selectedBarangay;
            
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
    }, [localReports, searchQuery, statusFilter, problemFilter, selectedBarangay, sortBy, sortOrder, farmerProfileMap]);

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

    // Select reports by status filter
    const selectReportsByStatus = (status: 'all' | 'processed' | 'resolved') => {
        setSelectionFilter(status);
        if (status === 'all') {
            setSelectedReports(visibleReports.map(report => report.id));
        } else {
            setSelectedReports(
                visibleReports
                    .filter(report => report.status === status)
                    .map(report => report.id)
            );
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

    // Export complaints report
    const handleExportComplaints = (exportType: 'page' | 'all') => {
        const dataToExport = exportType === 'page'
            ? visibleReports.map(r => ({
                'Farmer': r.username,
                'Problem': r.problem,
                'Affected Crop': r.affectedCrop,
                'Date': r.createdAt?.toDate().toLocaleDateString(),
                'Status': r.status,
                'Recommendations': r.recommendedCrops?.join(', '),
                'Barangay': getFarmerBarangay(r.userId)
            }))
            : sortedReports.map(r => ({
                'Farmer': r.username,
                'Problem': r.problem,
                'Affected Crop': r.affectedCrop,
                'Date': r.createdAt?.toDate().toLocaleDateString(),
                'Status': r.status,
                'Recommendations': r.recommendedCrops?.join(', '),
                'Barangay': getFarmerBarangay(r.userId)
            }));

        if (dataToExport.length === 0) {
            return;
        }

        // Convert to CSV
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
        const filename = exportType === 'page'
            ? `complaints_report_page${currentPage}_${new Date().toISOString().split('T')[0]}.csv`
            : `complaints_report_all_pages_${new Date().toISOString().split('T')[0]}.csv`;
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        setShowExportDialog(false);
    };

    // Helper function to get farmer's barangay
    const getFarmerBarangay = (userId: string) => {
        const farmer = farmers.find(f => f.uid === userId);
        return farmer?.homeAddress || 'Unknown';
    };

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'financial' | 'production' | 'complaints')} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="financial">Financial Report</TabsTrigger>
                <TabsTrigger value="production">Production Report</TabsTrigger>
                <TabsTrigger value="complaints">Complaints Report</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="mt-0">
                <FinancialReport onExport={onExport} />
            </TabsContent>

            <TabsContent value="production" className="mt-0">
                <ProductionReport onExport={onExport} />
            </TabsContent>

            <TabsContent value="complaints" className="space-y-6">
                <Card className="shadow-card h-full flex flex-col">
                    <CardHeader>
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <CardTitle>Complaints Report</CardTitle>
                                <CardDescription>Latest submissions from farmers ({localReports.length} total)</CardDescription>
                            </div>

                            {/* Top Controls - Horizontal Layout */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                {/* Search Bar */}
                                <div className="relative flex-1 md:flex-none md:w-80">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by farmer name, report text, or crop..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {/* Sort Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full md:w-auto flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            Sort: {getSortByLabel()} - {getOrderLabel()}
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-64">
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
                                                    <DropdownMenuItem onClick={() => handleSortChange("date", "desc")} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        <ArrowDown className="h-4 w-4 mr-2" />
                                                        Newest
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSortChange("date", "asc")} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
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
                                                    <DropdownMenuItem onClick={() => handleSortChange("status", "desc")} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        <ArrowDown className="h-4 w-4 mr-2" />
                                                        Resolved
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSortChange("status", "asc")} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        <ArrowUp className="h-4 w-4 mr-2" />
                                                        Processed
                                                    </DropdownMenuItem>
                                                </AccordionContent>
                                            </AccordionItem>

                                            <DropdownMenuSeparator />
                                            
                                            <AccordionItem value="problem" className="border-b-0">
                                                <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                                    <span className="flex items-center">
                                                        <ChevronRight className="h-4 w-4 mr-2" />
                                                        Problem Category
                                                    </span>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-0">
                                                    <DropdownMenuItem onClick={() => setProblemFilter('general')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        General
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProblemFilter('flood')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        Flood
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProblemFilter('pest')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        Pest
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProblemFilter('disease')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        Disease
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProblemFilter('drought')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        Drought
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProblemFilter('all')} className="hover:bg-blue-50 hover:text-blue-700" style={{ cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                                                        All Problems
                                                    </DropdownMenuItem>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Group by Barangay Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full md:w-auto flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            Group by Barangay
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-64 max-h-60 overflow-y-auto">
                                        {uniqueFarmAddresses.length > 0 ? (
                                            uniqueFarmAddresses.map(address => (
                                                <DropdownMenuItem
                                                    key={address}
                                                    onClick={() => {
                                                        setSelectedBarangay(address);
                                                        setSortOption('barangay');
                                                    }}
                                                    className={`cursor-pointer ${selectedBarangay === address ? "bg-blue-50 text-blue-700" : ""}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#eff6ff';
                                                        e.currentTarget.style.color = '#1d4ed8';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedBarangay !== address) {
                                                            e.currentTarget.style.backgroundColor = '';
                                                            e.currentTarget.style.color = '';
                                                        }
                                                    }}
                                                >
                                                    {address}
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled className="text-muted-foreground">
                                                No barangays available
                                            </DropdownMenuItem>
                                        )}
                                        {selectedBarangay !== 'all' && sortOption === 'barangay' && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setSelectedBarangay('all');
                                                        setSortOption('newest');
                                                    }}
                                                    className="cursor-pointer text-red-600 hover:bg-red-50"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fef2f2';
                                                        e.currentTarget.style.color = '#dc2626';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = '';
                                                        e.currentTarget.style.color = '';
                                                    }}
                                                >
                                                    Clear Filter
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Export Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowExportDialog(true)}
                                    disabled={localReports.length === 0}
                                    className="w-full md:w-auto hover:bg-blue-50 hover:text-blue-700"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>

                            {/* Batch Delete Controls - Shows when items selected */}
                            {selectedReports.length > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Trash2 className="h-5 w-5 text-red-600" />
                                        <span className="text-sm font-medium text-red-700">
                                            {selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected
                                        </span>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setReportToDelete(null);
                                            setDeleteDialogOpen(true);
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Selected
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedReports([])}
                                        className="text-red-700 hover:bg-red-100"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}

                            {/* Stats display for selected barangay */}
                            {sortOption === 'barangay' && selectedBarangay && (
                                <div className="pt-2">
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
                        </div>
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
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm w-48">
                                                            {/* Gmail-Style Split Button - Integrated in Header */}
                                                            {localReports.length > 0 && (
                                                                <div className="flex items-center gap-2">
                                                                    {/* Split Button Container */}
                                                                    <div className="inline-flex items-center border rounded-md hover:bg-gray-50 transition-colors duration-150 group">
                                                                        {/* Checkbox Portion - Left Side */}
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedReports.length === visibleReports.length && visibleReports.length > 0}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    selectReportsByStatus(selectionFilter);
                                                                                } else {
                                                                                    setSelectedReports([]);
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 cursor-pointer m-1.5"
                                                                        />
                                                                        
                                                                        {/* Vertical Divider */}
                                                                        <div className="w-px h-4 bg-border mx-0.5" />
                                                                        
                                                                        {/* Dropdown Arrow Portion - Right Side */}
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button className="inline-flex items-center justify-center h-6 w-6 cursor-pointer hover:bg-gray-200 rounded-r-md transition-colors duration-150 focus:outline-none" title="Filter selection">
                                                                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="start" className="bg-white">
                                                                                <DropdownMenuItem onClick={() => selectReportsByStatus('all')}>
                                                                                    All
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => selectReportsByStatus('processed')}>
                                                                                    Processed
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => selectReportsByStatus('resolved')}>
                                                                                    Resolved
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>

                                                                    {/* Delete Icon - Shows when items selected */}
                                                                    {selectedReports.length > 0 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setReportToDelete(null);
                                                                                setDeleteDialogOpen(true);
                                                                            }}
                                                                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}

                                                                    {/* Selected count */}
                                                                    {selectedReports.length > 0 && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {selectedReports.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farm Address</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleReports.map((report, index) => {
                                                        return (
                                                            <tr
                                                                key={report.id}
                                                                className={`border-b transition-colors ${
                                                                    selectedReports.includes(report.id)
                                                                        ? 'bg-blue-100 hover:bg-blue-200'
                                                                        : 'hover:bg-blue-50/50'
                                                                }`}
                                                            >
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedReports.includes(report.id)}
                                                                            onChange={() => toggleReportSelection(report.id)}
                                                                            className="w-4 h-4 cursor-pointer"
                                                                        />
                                                                        <div className="font-medium text-gray-900">{farmerProfileMap[report.userId]?.fullName || report.username}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {farmerProfileMap[report.userId]?.address || 'Unknown'}
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge variant="outline" className="capitalize text-xs">
                                                                        {normalizeProblemCategory(report.problem)}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700 capitalize">
                                                                    {report.affectedCrop && 
                                                                     report.affectedCrop.trim() !== '' && 
                                                                     report.affectedCrop.trim().toLowerCase() !== 'unknown' 
                                                                        ? report.affectedCrop 
                                                                        : 'N/A'}
                                                                </td>
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
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm w-16">
                                                            {/* Gmail-Style Checkbox Split Button - Independent Column */}
                                                            {localReports.length > 0 && (
                                                                <div className="flex items-center justify-center">
                                                                    {/* Split Button Container */}
                                                                    <div className="inline-flex items-center border rounded-md hover:bg-blue-50/70 transition-colors duration-150 group cursor-pointer" style={{ padding: '2px' }}>
                                                                        {/* Checkbox Portion - Left Side */}
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedReports.length === visibleReports.length && visibleReports.length > 0}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    selectReportsByStatus(selectionFilter);
                                                                                } else {
                                                                                    setSelectedReports([]);
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 cursor-pointer m-1"
                                                                            style={{ flexShrink: 0 }}
                                                                        />
                                                                        
                                                                        {/* Vertical Divider */}
                                                                        <div className="w-px h-4 bg-border mx-1" />
                                                                        
                                                                        {/* Dropdown Arrow Portion - Right Side */}
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <button 
                                                                                    className="inline-flex items-center justify-center h-5 w-5 cursor-pointer hover:bg-blue-100/50 rounded-r-md transition-colors duration-150 focus:outline-none" 
                                                                                    title="Filter selection"
                                                                                    style={{ flexShrink: 0 }}
                                                                                >
                                                                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                                </button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="start" className="bg-white shadow-md">
                                                                                <DropdownMenuItem 
                                                                                    onClick={() => selectReportsByStatus('all')}
                                                                                    className="cursor-pointer hover:bg-blue-50"
                                                                                >
                                                                                    All
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem 
                                                                                    onClick={() => selectReportsByStatus('processed')}
                                                                                    className="cursor-pointer hover:bg-blue-50"
                                                                                >
                                                                                    Processed
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem 
                                                                                    onClick={() => selectReportsByStatus('resolved')}
                                                                                    className="cursor-pointer hover:bg-blue-50"
                                                                                >
                                                                                    Resolved
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farmer Name</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Farm Address</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Problem</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Affected Crop</th>
                                                        <th className="text-left p-3 font-semibold text-gray-700 text-sm">Date</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Status</th>
                                                        <th className="text-center p-3 font-semibold text-gray-700 text-sm">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleReports.map((report, index) => {
                                                        return (
                                                            <tr
                                                                key={report.id}
                                                                className={`border-b transition-colors ${
                                                                    selectedReports.includes(report.id)
                                                                        ? 'bg-blue-100 hover:bg-blue-200'
                                                                        : 'hover:bg-blue-50/50'
                                                                }`}
                                                            >
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedReports.includes(report.id)}
                                                                        onChange={() => toggleReportSelection(report.id)}
                                                                        className="w-4 h-4 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="font-medium text-gray-900">{farmerProfileMap[report.userId]?.fullName || report.username}</div>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700">
                                                                    {farmerProfileMap[report.userId]?.address || 'Unknown'}
                                                                </td>
                                                                <td className="p-3">
                                                                    <Badge variant="outline" className="capitalize text-xs">
                                                                        {normalizeProblemCategory(report.problem)}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-sm text-gray-700 capitalize">
                                                                    {report.affectedCrop && 
                                                                     report.affectedCrop.trim() !== '' && 
                                                                     report.affectedCrop.trim().toLowerCase() !== 'unknown' 
                                                                        ? report.affectedCrop 
                                                                        : 'N/A'}
                                                                </td>
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
                            {reportToDelete ? (
                                <>
                                    Are you sure you want to delete this report? This action cannot be undone.
                                    <div className="mt-2 p-2 bg-muted rounded">
                                        <p className="font-medium">{reportToDelete.username}</p>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{reportToDelete.reportText}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    Are you sure you want to delete <strong>{selectedReports.length} selected report(s)</strong>? This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (reportToDelete) {
                                    confirmDelete();
                                } else {
                                    handleBatchDelete();
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Export Dialog for Complaints */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Export Complaints Report</DialogTitle>
                        <DialogDescription>
                            Choose which data you want to export:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                             onClick={() => handleExportComplaints('page')}>
                            <h4 className="font-semibold mb-2">Export This Page</h4>
                            <p className="text-sm text-muted-foreground">
                                Export {visibleReports.length} record{visibleReports.length !== 1 ? 's' : ''} from the current page (Page {currentPage} of {totalPages})
                            </p>
                        </div>
                        <div className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                             onClick={() => handleExportComplaints('all')}>
                            <h4 className="font-semibold mb-2">Export All Pages</h4>
                            <p className="text-sm text-muted-foreground">
                                Export all {sortedReports.length} record{sortedReports.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </TabsContent>
        </Tabs>
    );
};

export default ReportsList;
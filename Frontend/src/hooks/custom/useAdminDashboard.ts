import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, getDocs, orderBy, Timestamp, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db, getDb } from "@/firebaseConfig";
import { HARDCODED_CROPS } from "@/utils/cropUtils";
import { log } from "@/utils/logger";

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
    contactNumber: string;
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
    reason?: string; // Add reason field
}

export const useAdminDashboard = () => {
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

    const { toast } = useToast();

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
            // Wait for Firebase to be ready
            const firestoreDb = await getDb();
            
            if (!firestoreDb) {
                console.error("Firebase db could not be initialized");
                throw new Error("Firebase database not initialized");
            }

            log("Loading dashboard data...");

            // Load all reports - Query without orderBy to get ALL data including old records
            const reportsRef = collection(firestoreDb, "farmReports");
            const reportsQuery = query(reportsRef);
            const reportsSnapshot = await getDocs(reportsQuery);

            const reportsData: Report[] = [];
            reportsSnapshot.forEach((doc) => {
                const data = doc.data();
                log("Report found:", doc.id, data);
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

            log("Total reports loaded:", reportsData.length);
            setReports(reportsData);

            // Calculate statistics with reports data only first
            calculateStatistics(reportsData);
            calculateProblemsDistribution(reportsData);
            calculateMonthlyTrends(reportsData);
            await calculateCropRecommendations(reportsData);

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

        // Get 2 past months, 1 present month, and 2 future months (total 5 months)
        for (let i = 2; i >= -2; i--) {
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

    const calculateCropRecommendations = async (reportsData: Report[]) => {
        try {
            // Load farmer crops data to count actual crops planted
            const firestoreDb = await getDb();
            
            if (!firestoreDb) {
                console.error("Firebase db could not be initialized");
                return;
            }
            
            const cropsRef = collection(firestoreDb, "farmerCrops");
            const cropsSnapshot = await getDocs(cropsRef);
            
            // Create a frequency map for the hardcoded crops
            const cropCounts: { [key: string]: number } = {};
            
            // Initialize all hardcoded crops with 0 frequency
            HARDCODED_CROPS.forEach(crop => {
                cropCounts[crop] = 0;
            });
            
            // Count how many times each crop has been planted by farmers
            cropsSnapshot.forEach((doc) => {
                const data = doc.data();
                const cropName = data.name;
                
                // Only count crops that exist in our hardcoded list
                if (cropCounts.hasOwnProperty(cropName)) {
                    cropCounts[cropName] = (cropCounts[cropName] || 0) + 1;
                }
            });
            
            // Convert to array and sort by frequency
            const recommendations: CropRecommendation[] = Object.entries(cropCounts)
                .map(([crop, frequency]) => ({ crop, frequency }))
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5); // Top 5 crops planted by farmers
                
            setCropRecommendations(recommendations);
        } catch (error) {
            console.error("Error calculating crop recommendations:", error);
            // Fallback to the previous method if there's an error
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Filter reports for the current month
            const currentMonthReports = reportsData.filter(report => {
                const reportDate = report.createdAt?.toDate();
                return reportDate && 
                       reportDate.getMonth() === currentMonth && 
                       reportDate.getFullYear() === currentYear;
            });
            
            // Create a frequency map for the hardcoded crops
            const cropCounts: { [key: string]: number } = {};
            
            // Initialize all hardcoded crops with 0 frequency
            HARDCODED_CROPS.forEach(crop => {
                cropCounts[crop] = 0;
            });
            
            // Count how many times each crop appears in current month reports
            currentMonthReports.forEach(report => {
                report.recommendedCrops?.forEach(crop => {
                    // Only count crops that exist in our hardcoded list
                    if (cropCounts.hasOwnProperty(crop)) {
                        cropCounts[crop] = (cropCounts[crop] || 0) + 1;
                    }
                });
            });
            
            // Convert to array and sort by frequency
            const recommendations: CropRecommendation[] = Object.entries(cropCounts)
                .map(([crop, frequency]) => ({ crop, frequency }))
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5); // Top 5 crops for the current month
                
            setCropRecommendations(recommendations);
        }
    };

    const loadFarmers = async () => {
        try {
            const firestoreDb = await getDb();
            
            if (!firestoreDb) {
                console.error("Firebase db could not be initialized");
                return;
            }
            
            const farmersRef = collection(firestoreDb, "farmers");
            const farmersSnapshot = await getDocs(farmersRef);

            const farmersData: Farmer[] = [];
            farmersSnapshot.forEach((doc) => {
                const data = doc.data();
                farmersData.push({
                    uid: data.uid || doc.id,
                    email: data.email || '',
                    fullName: data.fullName || 'Unknown',
                    farmName: data.farmName || 'Unknown Farm',
                    contactNumber: data.contactNumber || '',
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
            const firestoreDb = await getDb();
            
            if (!firestoreDb) {
                console.error("Firebase db could not be initialized");
                return;
            }
            
            log("[Admin] Loading deletion requests...");
            const requestsRef = collection(firestoreDb, "deletionRequests");
            const requestsSnapshot = await getDocs(requestsRef);

            log("[Admin] Found", requestsSnapshot.size, "deletion request(s)");

            const requestsData: DeletionRequest[] = [];
            requestsSnapshot.forEach((doc) => {
                const data = doc.data();
                log("[Admin] Deletion request:", doc.id, data);
                requestsData.push({
                    id: doc.id,
                    userId: data.userId || '',
                    username: data.username || 'Unknown',
                    email: data.email || '',
                    fullName: data.fullName || 'Unknown',
                    status: data.status || 'pending',
                    requestedAt: data.requestedAt,
                    reviewedAt: data.reviewedAt,
                    reviewedBy: data.reviewedBy,
                    reason: data.reason || '' // Add reason field
                });
            });

            // Sort by request date (newest first)
            requestsData.sort((a, b) => {
                const dateA = a.requestedAt?.toDate?.() || new Date(0);
                const dateB = b.requestedAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            log("[Admin] Total deletion requests loaded:", requestsData.length);
            log("[Admin] Deletion requests data:", requestsData);
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

    const handleDeletionRequestAction = async (requestId: string, action: 'approved' | 'denied') => {
        try {
            const firestoreDb = await getDb();
            if (!firestoreDb) throw new Error("Firebase not initialized");
            
            const requestRef = doc(firestoreDb, "deletionRequests", requestId);
            await updateDoc(requestRef, {
                status: action,
                reviewedAt: Timestamp.now(),
                reviewedBy: "Admin"
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
            log("[Admin] Deleting requests:", selectedRequests);
            const firestoreDb = await getDb();
            if (!firestoreDb) throw new Error("Firebase not initialized");
            
            const batch = writeBatch(firestoreDb);

            selectedRequests.forEach(requestId => {
                const requestRef = doc(firestoreDb, "deletionRequests", requestId);
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

    const updateReportStatus = async (reportId: string, newStatus: string) => {
        try {
            const firestoreDb = await getDb();
            if (!firestoreDb) throw new Error("Firebase not initialized");
            
            const reportRef = doc(firestoreDb, "farmReports", reportId);
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
            await calculateCropRecommendations(updatedReports);

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
                'Recommendations': r.recommendedCrops?.join(', '),
                'Barangay': getFarmerBarangay(r.userId) // Add barangay information
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

    // Helper function to get farmer's barangay
    const getFarmerBarangay = (userId: string) => {
        const farmer = farmers.find(f => f.uid === userId);
        return farmer?.homeAddress || 'Unknown';
    };

    return {
        // State
        loading,
        reports,
        problemsData,
        monthlyTrends,
        cropRecommendations,
        farmers,
        deletionRequests,
        stats,
        deleteMode,
        selectedRequests,

        // Functions
        loadDashboardData,
        handleDeletionRequestAction,
        toggleDeleteMode,
        toggleRequestSelection,
        handleBulkDelete,
        updateReportStatus,
        exportData
    };
};
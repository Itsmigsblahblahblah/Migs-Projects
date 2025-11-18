import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "@/firebaseConfig";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import ReportDetailView from "@/components/dashboard/admin/ReportDetailView";

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

const FarmerReportDetail = () => {
    const { reportId } = useParams<{ reportId: string }>();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            if (!reportId) return;

            try {
                setLoading(true);
                // Fetch the report document
                const reportDoc = await getDoc(doc(db, "farmReports", reportId));
                
                if (reportDoc.exists()) {
                    const data = reportDoc.data();
                    setReport({
                        id: reportDoc.id,
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
                } else {
                    setError("Report not found");
                }
            } catch (err) {
                console.error("Error fetching report:", err);
                setError("Failed to load report");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [reportId]);

    // Mark all messages for this report as read when the component mounts
    useEffect(() => {
        if (!reportId) return;

        const markMessagesAsRead = async () => {
            try {
                // Query for all unread messages for this report
                const messagesQuery = query(
                    collection(db, "adminMessages"),
                    where("reportId", "==", reportId),
                    where("read", "==", false)
                );

                const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
                    // Update all unread messages to read
                    snapshot.forEach((doc) => {
                        updateDoc(doc.ref, {
                            read: true,
                            readAt: Timestamp.now()
                        }).catch((error) => {
                            console.error("Error marking message as read:", error);
                        });
                    });
                });

                // Clean up the listener
                return () => unsubscribe();
            } catch (error) {
                console.error("Error setting up message read listener:", error);
            }
        };

        markMessagesAsRead();
    }, [reportId]);

    const handleUpdateStatus = () => {
        // Farmers can't update status, this is just a placeholder
        console.log("Farmers cannot update report status");
    };

    const handleClose = () => {
        window.history.back();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4">Loading report details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
                    <h2 className="text-xl font-bold text-destructive mb-2">Error</h2>
                    <p className="text-destructive">{error}</p>
                    <button 
                        onClick={handleClose}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-muted rounded-lg max-w-md">
                    <h2 className="text-xl font-bold mb-2">Report Not Found</h2>
                    <p>The requested report could not be found.</p>
                    <button 
                        onClick={handleClose}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <ReportDetailView 
                report={report} 
                onClose={handleClose}
                onUpdateStatus={handleUpdateStatus}
                isAdminView={false}
            />
        </div>
    );
};

export default FarmerReportDetail;
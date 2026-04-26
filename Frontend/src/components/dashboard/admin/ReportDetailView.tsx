import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle, XCircle, Clock, Leaf, AlertTriangle, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/firebaseConfig";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { createPortal } from "react-dom";
import { formatAiGuidance } from "@/utils/aiGuidanceFormatter";

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

interface AdminMessage {
    id: string;
    reportId: string;
    senderId: string;
    receiverId: string;
    message: string;
    timestamp: any;
    read: boolean;
}

interface ReportDetailViewProps {
    report: Report;
    onClose: () => void;
    onUpdateStatus: (reportId: string, status: string) => void;
    isAdminView?: boolean; // New prop to distinguish between admin and farmer views
}

const ReportDetailView = ({ report, onClose, onUpdateStatus, isAdminView = true }: ReportDetailViewProps) => {
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
    const { toast } = useToast();

    // Fetch admin messages for this report
    useEffect(() => {
        // Query without orderBy to avoid index issues
        // We'll sort manually instead
        const messagesQuery = query(
            collection(db, "adminMessages"),
            where("reportId", "==", report.id)
            // Removed orderBy to avoid composite index requirement
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messagesData: AdminMessage[] = [];
            snapshot.forEach((doc) => {
                messagesData.push({
                    id: doc.id,
                    ...doc.data()
                } as AdminMessage);
            });

            // Sort by timestamp manually in ascending order
            messagesData.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    try {
                        const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                        const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                        return dateA.getTime() - dateB.getTime(); // Ascending order
                    } catch (e) {
                        return 0;
                    }
                }
                return 0;
            });

            setAdminMessages(messagesData);
        });

        return () => unsubscribe();
    }, [report.id]);

    const formatDate = (date: any) => {
        if (!date) return "Unknown date";
        try {
            return date.toDate().toLocaleString();
        } catch (e) {
            return "Invalid date";
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        setIsSending(true);
        try {
            // Save message to Firestore
            await addDoc(collection(db, "adminMessages"), {
                reportId: report.id,
                senderId: "admin", // In a real app, this would be the actual admin ID
                receiverId: report.userId, // Send to the farmer who submitted the report
                message: message.trim(),
                timestamp: Timestamp.now(),
                read: false
            });

            // Show success feedback using toast notification
            toast({
                title: "Message Sent",
                description: `Your message has been sent to farmer ${report.username}.`,
            });
            setMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    // Create portal to render modal outside of current DOM hierarchy
    const modalContent = (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-0 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Detailed Problem Report
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Submitted by {report.username} on {formatDate(report.createdAt)}
                            </p>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <XCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {/* Report Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border p-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Problem Type</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="capitalize">{normalizeProblemCategory(report.problem) || 'General'}</span>
                            </div>
                        </div>

                        <div className="border p-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Affected Crop</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Leaf className="h-4 w-4 text-green-500" />
                                <span className="capitalize">{report.affectedCrop || 'Not specified'}</span>
                            </div>
                        </div>

                        <div className="border p-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
                            <div className="mt-1 capitalize">
                                {report.status}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Farmer's Report */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Farmer's Description
                        </h3>
                        <div className="border p-4">
                            <p className="whitespace-pre-wrap">{report.reportText || 'No description provided.'}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* AI Recommendations */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Leaf className="h-5 w-5 text-green-500" />
                            AI Recommendations
                        </h3>

                        <div className="space-y-4">
                            {report.recommendedCrops && report.recommendedCrops.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-muted-foreground mb-1">Best Practices</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {report.recommendedCrops.map((crop, index) => (
                                            <span key={index} className="border px-2 py-1 text-sm">
                                                {crop}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {report.cropsToAvoid && report.cropsToAvoid.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-muted-foreground mb-1">Caution / Things to Avoid</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {report.cropsToAvoid.map((crop, index) => (
                                            <span key={index} className="border px-2 py-1 text-sm">
                                                {crop}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-medium text-muted-foreground mb-1">Additional Advice</h4>
                                <div className="border p-4">
                                    <p className="whitespace-pre-wrap">{formatAiGuidance(report.advice) || 'No additional advice provided.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Previous Messages */}
                    {adminMessages.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <Send className="h-5 w-5 text-blue-500" />
                                Message Thread
                            </h3>
                            <div className="space-y-3">
                                {adminMessages.map((msg) => (
                                    <div key={msg.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-muted/30">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium">Admin</span>
                                            <span className="text-xs text-muted-foreground">
                                                {msg.timestamp?.toDate().toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="mt-1">{msg.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Message Section - Only show for admin view */}
                    {isAdminView && (
                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <Send className="h-5 w-5 text-blue-500" />
                                Send Message to Farmer
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="admin-message">Your Message</Label>
                                    <Textarea
                                        id="admin-message"
                                        placeholder="Type your message to the farmer here..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={isSending || !message.trim()}
                                        className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions - Only show for admin view */}
                    {isAdminView && (
                        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Report ID: {report.id}</span>
                            </div>

                            <div className="flex gap-2">
                                {report.status !== 'resolved' && (
                                    <Button
                                        variant="default"
                                        onClick={async () => {
                                            await onUpdateStatus(report.id, 'resolved');
                                            onClose(); // Auto-close after marking as resolved
                                        }}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-white border border-green-300"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        Mark as Resolved
                                    </Button>
                                )}

                                {report.status === 'resolved' && (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            await onUpdateStatus(report.id, 'pending');
                                            onClose(); // Auto-close after reopening
                                        }}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                        Reopen Report
                                    </Button>
                                )}

                                <Button variant="outline" onClick={onClose} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* For farmer view, just show a close button */}
                    {!isAdminView && (
                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={onClose} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Close
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    // Render modal using portal to ensure it covers the entire viewport
    return createPortal(modalContent, document.body);
};

export default ReportDetailView;
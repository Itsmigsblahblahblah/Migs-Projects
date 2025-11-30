import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertTriangle,
    CheckCircle,
    Calendar,
    User,
    Eye,
    Trash2,
    X,
    Info
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

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

interface DeletionRequestsProps {
    deletionRequests: DeletionRequest[];
    deleteMode: boolean;
    selectedRequests: string[];
    onDeleteModeToggle: () => void;
    onRefresh: () => void;
    onBulkDelete: () => void;
    onRequestSelect: (requestId: string) => void;
    onApproveRequest: (requestId: string) => void;
    onDenyRequest: (requestId: string) => void;
}

const DeletionRequests = ({
    deletionRequests,
    deleteMode,
    selectedRequests,
    onDeleteModeToggle,
    onRefresh,
    onBulkDelete,
    onRequestSelect,
    onApproveRequest,
    onDenyRequest
}: DeletionRequestsProps) => {
    const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);

    return (
        <>
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Account Deletion Requests</CardTitle>
                                <CardDescription>
                                    Manage farmer account deletion requests ({deletionRequests.filter(r => r.status === 'pending').length} pending, {deletionRequests.length} total)
                                </CardDescription>
                            </div>
                            {/* Desktop view - buttons on the right */}
                            <div className="hidden md:flex gap-2">
                                {deleteMode ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onDeleteModeToggle}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={onBulkDelete}
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
                                            onClick={onRefresh}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={onDeleteModeToggle}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Mobile view - buttons below description and full width but side by side */}
                        <div className="md:hidden flex gap-2 mt-3">
                            {deleteMode ? (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onDeleteModeToggle}
                                        className="flex-1"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={onBulkDelete}
                                        disabled={selectedRequests.length === 0}
                                        className="flex-1"
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
                                        onClick={onRefresh}
                                        className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onDeleteModeToggle}
                                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox for delete mode */}
                                        {deleteMode && (
                                            <Checkbox
                                                checked={selectedRequests.includes(request.id)}
                                                onCheckedChange={() => onRequestSelect(request.id)}
                                                className="h-5 w-5 mt-1"
                                            />
                                        )}

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-secondary rounded-full p-2 mt-1">
                                                        <User className="h-5 w-5 text-secondary-foreground" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{request.fullName}</h3>
                                                        <p className="text-sm text-muted-foreground">{request.email}</p>
                                                    </div>
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

                                            {/* Show reason button for pending requests */}
                                            {request.status === 'pending' && request.reason && (
                                                <div className="mt-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-xs"
                                                            >
                                                                <Info className="h-3 w-3 mr-1" />
                                                                View Reason
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Deletion Request Reason</DialogTitle>
                                                                <DialogDescription>
                                                                    Reason provided by {request.fullName} for account deletion
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="py-4">
                                                                <p className="text-sm">{request.reason}</p>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons - Only for pending requests and not in delete mode */}
                                        {!deleteMode && request.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onDenyRequest(request.id)}
                                                    className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Deny
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => onApproveRequest(request.id)}
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
        </>
    );
};

export default DeletionRequests;
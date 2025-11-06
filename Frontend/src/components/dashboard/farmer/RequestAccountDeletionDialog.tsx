import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RequestAccountDeletionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isRequestingDeletion: boolean;
    handleRequestAccountDeletion: (reason: string) => Promise<void>;
}

const RequestAccountDeletionDialog = ({
    open,
    onOpenChange,
    isRequestingDeletion,
    handleRequestAccountDeletion
}: RequestAccountDeletionDialogProps) => {
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [otherReason, setOtherReason] = useState<string>("");
    const [error, setError] = useState<string>("");

    const deletionReasons = [
        "No longer farming",
        "Found a better alternative",
        "Privacy concerns",
        "Technical issues",
        "Other"
    ];

    const handleSubmit = async () => {
        // Validate reason selection
        if (!selectedReason) {
            setError("Please select a reason for deletion");
            return;
        }

        // If "Other" is selected, validate custom reason
        if (selectedReason === "Other" && !otherReason.trim()) {
            setError("Please provide a reason for deletion");
            return;
        }

        setError("");
        
        // Use custom reason if "Other" is selected, otherwise use the selected reason
        const reason = selectedReason === "Other" ? otherReason : selectedReason;
        await handleRequestAccountDeletion(reason);
    };

    const handleReasonChange = (value: string) => {
        setSelectedReason(value);
        setError("");
        
        // Clear other reason when switching away from "Other"
        if (value !== "Other") {
            setOtherReason("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-warning">
                        <AlertTriangle className="h-5 w-5" />
                        Request Account Deletion
                    </DialogTitle>
                    <DialogDescription>
                        Submit a request to delete your account. An admin will review your request before you can proceed with deletion.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="deletion-reason">Reason for Deletion *</Label>
                        <Select onValueChange={handleReasonChange} value={selectedReason}>
                            <SelectTrigger id="deletion-reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {deletionReasons.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                        {reason}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedReason === "Other" && (
                        <div className="space-y-2">
                            <Label htmlFor="other-reason">Please specify your reason *</Label>
                            <Textarea
                                id="other-reason"
                                placeholder="Enter your reason for deletion..."
                                value={otherReason}
                                onChange={(e) => {
                                    setOtherReason(e.target.value);
                                    setError("");
                                }}
                                rows={3}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="bg-warning/10 border border-warning/20 rounded-md p-4 space-y-2">
                        <p className="text-sm font-medium text-warning">Next Steps:</p>
                        <ul className="text-sm text-warning/90 list-disc list-inside space-y-1">
                            <li>Your request will be sent to the admin for review</li>
                            <li>Wait for admin approval</li>
                            <li>Once approved, you can delete your account permanently</li>
                            <li>All your data will be removed from the system</li>
                        </ul>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isRequestingDeletion}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isRequestingDeletion}
                    >
                        {isRequestingDeletion ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                Submitting...
                            </div>
                        ) : (
                            "Submit Deletion Request"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RequestAccountDeletionDialog;
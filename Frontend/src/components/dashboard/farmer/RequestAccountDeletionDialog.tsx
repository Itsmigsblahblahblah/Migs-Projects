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

interface RequestAccountDeletionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isRequestingDeletion: boolean;
    handleRequestAccountDeletion: () => Promise<void>;
}

const RequestAccountDeletionDialog = ({
    open,
    onOpenChange,
    isRequestingDeletion,
    handleRequestAccountDeletion
}: RequestAccountDeletionDialogProps) => {
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
                        onClick={handleRequestAccountDeletion}
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
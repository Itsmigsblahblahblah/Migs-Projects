import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/firebaseConfig";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";

interface DeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    handleDeleteAccount: (password: string) => Promise<void>;
}

const DeleteAccountDialog = ({
    open,
    onOpenChange,
    handleDeleteAccount
}: DeleteAccountDialogProps) => {
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Check if user is signed in with Google
    useEffect(() => {
        if (!auth) return; // Skip if auth not initialized yet
        const user = auth.currentUser;
        if (user) {
            const googleProvider = user.providerData.some(provider => provider.providerId === 'google.com');
            setIsGoogleUser(googleProvider);
        }
    }, [open]);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setDeleteConfirmText("");
            setShowConfirmation(false);
        }
    }, [open]);

    // Determine if the delete button should be enabled
    const isDeleteButtonEnabled = () => {
        if (isGoogleUser) {
            return deleteConfirmText === 'DELETE';
        } else {
            return deleteConfirmText.trim().length > 0;
        }
    };

    const handleDeleteClick = async () => {
        // Show confirmation dialog instead of directly deleting
        setShowConfirmation(true);
    };

    const handleConfirmDelete = async () => {
        // Perform the actual deletion
        await handleDeleteAccount(deleteConfirmText);
        // Only close if no error toast is shown
        if (!document.querySelector('.toast-destructive')) {
            onOpenChange(false);
            setDeleteConfirmText("");
        }
        setShowConfirmation(false);
    };

    const handleCancelDelete = () => {
        setShowConfirmation(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Account Deletion</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="rounded-lg bg-destructive/10 p-4">
                            <h4 className="font-medium text-destructive mb-2">Warning</h4>
                            <p className="text-sm text-destructive">
                                All your data including profile, crops, reports, and history will be permanently deleted.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deleteConfirm">
                                {isGoogleUser 
                                    ? "Type DELETE to confirm account deletion" 
                                    : "Enter your password to confirm"}
                            </Label>
                            <Input
                                id="deleteConfirm"
                                type={isGoogleUser ? "text" : "password"}
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={isGoogleUser ? "Type DELETE" : "Enter your password"}
                            />
                            <p className="text-sm text-muted-foreground">
                                {isGoogleUser 
                                    ? "For Google accounts, type DELETE to confirm deletion" 
                                    : "For email/password accounts, enter your password to confirm deletion"}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteClick}
                            disabled={!isDeleteButtonEnabled()}
                        >
                            Delete My Account Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <DeleteConfirmationDialog
                open={showConfirmation}
                onOpenChange={setShowConfirmation}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </>
    );
};

export default DeleteAccountDialog;
import { useState } from "react";
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
    const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");

    return (
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
                            Type "DELETE" to confirm
                        </Label>
                        <Input
                            id="deleteConfirm"
                            value={deleteConfirmPassword}
                            onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                            placeholder="Type DELETE"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            await handleDeleteAccount(deleteConfirmPassword);
                            if (!document.querySelector('.toast-destructive')) { // Only close if no error toast
                                onOpenChange(false);
                                setDeleteConfirmPassword("");
                            }
                        }}
                        disabled={deleteConfirmPassword !== 'DELETE'}
                    >
                        Permanently Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteAccountDialog;
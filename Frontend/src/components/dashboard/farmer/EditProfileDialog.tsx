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
import { User, Upload, Trash2 } from "lucide-react";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    farmerProfile: {
        fullName: string;
        email: string;
        contactNumber: string;
        homeAddress: string;
        farmAddress: string;
        farmArea: string;
        photoURL?: string;
    };
    profileImageFile: File | null;
    handleProfileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleUpdateProfile: () => Promise<void>;
    onRequestAccountDeletion: () => void;
    username: string;
}

const EditProfileDialog = ({
    open,
    onOpenChange,
    farmerProfile,
    profileImageFile,
    handleProfileInputChange,
    handleProfileImageUpload,
    handleUpdateProfile,
    onRequestAccountDeletion,
    username
}: EditProfileDialogProps) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsUploading(true);
        handleProfileImageUpload(e);
        setIsUploading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile information
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Profile Picture Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-image">Profile Picture</Label>
                        <div className="flex items-center gap-4">
                            {farmerProfile.photoURL ? (
                                <img
                                    src={farmerProfile.photoURL}
                                    alt={username}
                                    className="h-16 w-16 rounded-full object-cover"
                                />
                            ) : (
                                <div className="bg-secondary rounded-full p-4">
                                    <User className="h-8 w-8 text-secondary-foreground" />
                                </div>
                            )}
                            <Input
                                id="profile-image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                onClick={() => document.getElementById('profile-image')?.click()}
                                className="flex items-center gap-2"
                                disabled={isUploading}
                            >
                                <Upload className="h-4 w-4" />
                                {isUploading ? 'Uploading...' : farmerProfile.photoURL || profileImageFile ? 'Change Photo' : 'Upload Photo'}
                            </Button>
                        </div>
                    </div>

                    {/* Full Name and Contact Number - Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-fullName">Full Name</Label>
                            <Input
                                id="profile-fullName"
                                name="fullName"
                                value={farmerProfile.fullName}
                                onChange={handleProfileInputChange}
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-contactNumber">Contact Number</Label>
                            <Input
                                id="profile-contactNumber"
                                name="contactNumber"
                                value={farmerProfile.contactNumber}
                                onChange={handleProfileInputChange}
                                placeholder="e.g., 09123456789"
                            />
                        </div>
                    </div>

                    {/* Email (Disabled) - Full width */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-email">Email (Cannot be edited)</Label>
                        <Input
                            id="profile-email"
                            name="email"
                            value={farmerProfile.email}
                            disabled
                            className="bg-muted cursor-not-allowed"
                        />
                    </div>

                    {/* Home Address and Farm Address - Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-homeAddress">Home Address</Label>
                            <Input
                                id="profile-homeAddress"
                                name="homeAddress"
                                value={farmerProfile.homeAddress}
                                onChange={handleProfileInputChange}
                                placeholder="Enter your home address"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-farmAddress">Farm Address</Label>
                            <Input
                                id="profile-farmAddress"
                                name="farmAddress"
                                value={farmerProfile.farmAddress}
                                onChange={handleProfileInputChange}
                                placeholder="Enter your farm location"
                            />
                        </div>
                    </div>

                    {/* Farm Area - Full width */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-farmArea">Farm Area (hectares)</Label>
                        <Input
                            id="profile-farmArea"
                            name="farmArea"
                            value={farmerProfile.farmArea}
                            onChange={handleProfileInputChange}
                            placeholder="e.g., 2.5 hectares"
                        />
                    </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={onRequestAccountDeletion}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Request Account Deletion
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={async () => {
                                await handleUpdateProfile();
                                onOpenChange(false);
                            }}
                        >
                            Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileDialog;
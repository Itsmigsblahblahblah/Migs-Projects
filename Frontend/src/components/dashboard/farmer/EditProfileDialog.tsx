import { useState, useRef, useEffect } from "react";
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
import { User, Upload, Trash2, Clock, CheckCircle, XCircle, ChevronDown } from "lucide-react";

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
    deletionRequest: any;
    isDeletionButtonDisabled: boolean;
    getDeletionButtonText: () => string;
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
    username,
    deletionRequest,
    isDeletionButtonDisabled,
    getDeletionButtonText
}: EditProfileDialogProps) => {
    const [isUploading, setIsUploading] = useState(false);
    
    // Dropdown states for home address
    const [showHomeDropdown, setShowHomeDropdown] = useState(false);
    const [homeSearchTerm, setHomeSearchTerm] = useState(farmerProfile.homeAddress || "");
    const homeDropdownRef = useRef<HTMLDivElement>(null);

    // Dropdown states for farm address
    const [showFarmDropdown, setShowFarmDropdown] = useState(false);
    const [farmSearchTerm, setFarmSearchTerm] = useState(farmerProfile.farmAddress || "");
    const farmDropdownRef = useRef<HTMLDivElement>(null);

    // Sync dropdown values with farmerProfile when it changes
    useEffect(() => {
        setHomeSearchTerm(farmerProfile.homeAddress || "");
        setFarmSearchTerm(farmerProfile.farmAddress || "");
    }, [farmerProfile.homeAddress, farmerProfile.farmAddress]);
    
    // Home address options
    const homeAddressOptions = [
        "Amonoy", "Bakia", "Balanac", "Balayong", "Banilad", "Banti", "Bitaoy", 
        "Botocan", "Bukal", "Burgos", "Burol", "Coralao", "Gagalot", "Ibabang Banga", 
        "Ibabang Bayucain", "Ilayang Banga", "Ilayang Bayucain", "Isabang", "Malinao", 
        "May-It", "Munting Kawayan", "Oobi", "Olla", "Origuel (Poblacion)", "Panalaban", 
        "Pangil", "Panglan", "Piit", "Pook", "Rizal", "San Francisco (Poblacion)", 
        "San Isidro", "San Miguel (Poblacion)", "San Roque", "Santa Catalina (Poblacion)", 
        "Suba", "Talortor", "Tanawan", "Taytay", "Villa Nogales"
    ];
    
    // Farm address options
    const farmAddressOptions = [
        "Brgy. Amonoy", "Brgy. Balayong", "Brgy. Dobi", "Brgy. Banga", "Brgy. Bukal", 
        "Brgy. Gagalot", "Brgy. Malinao", "Brgy. Burgos", "Brgy. San Francisco", 
        "Brgy. Munting Kawayan", "Brgy. Piit", "Brgy. Taytay", "Brgy. Olla", 
        "Brgy. Coralao", "Brgy. San Roque", "Brgy. Suba", "Brgy. Pangil"
    ];
    
    // Filter options based on search term
    const getFilteredOptions = (options: string[], searchTerm: string) => {
        if (searchTerm) {
            return options.filter(option =>
                option.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return options;
    };
    
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (homeDropdownRef.current && !homeDropdownRef.current.contains(event.target as Node)) {
                setShowHomeDropdown(false);
            }
            if (farmDropdownRef.current && !farmDropdownRef.current.contains(event.target as Node)) {
                setShowFarmDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    // Handle selection for home address
    const handleHomeSelect = (value: string) => {
        setHomeSearchTerm(value);
        handleProfileInputChange({
            target: { name: "homeAddress", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowHomeDropdown(false);
    };
    
    // Handle selection for farm address
    const handleFarmSelect = (value: string) => {
        setFarmSearchTerm(value);
        handleProfileInputChange({
            target: { name: "farmAddress", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowFarmDropdown(false);
    };
    
    // Handle input change for home address
    const handleHomeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setHomeSearchTerm(value);
        handleProfileInputChange({
            target: { name: "homeAddress", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowHomeDropdown(true);
    };
    
    // Handle input change for farm address
    const handleFarmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFarmSearchTerm(value);
        handleProfileInputChange({
            target: { name: "farmAddress", value }
        } as React.ChangeEvent<HTMLInputElement>);
        setShowFarmDropdown(true);
    };

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
                        {/* Home Address Dropdown */}
                        <div className="space-y-2" ref={homeDropdownRef}>
                            <Label htmlFor="profile-homeAddress">Home Address (Barangay)</Label>
                            <div className="relative">
                                <Input
                                    id="profile-homeAddress"
                                    name="homeAddress"
                                    value={homeSearchTerm}
                                    onChange={handleHomeInputChange}
                                    onFocus={() => setShowHomeDropdown(true)}
                                    placeholder="Select or type your barangay"
                                    className="pr-10"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                
                                {showHomeDropdown && (
                                    <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-[120px] overflow-auto">
                                        {getFilteredOptions(homeAddressOptions, homeSearchTerm).length > 0 ? (
                                            getFilteredOptions(homeAddressOptions, homeSearchTerm).map((option) => (
                                                <div
                                                    key={option}
                                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => handleHomeSelect(option)}
                                                >
                                                    {option}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                                No matching barangays found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Farm Address Dropdown */}
                        <div className="space-y-2" ref={farmDropdownRef}>
                            <Label htmlFor="profile-farmAddress">Farm Address (Barangay)</Label>
                            <div className="relative">
                                <Input
                                    id="profile-farmAddress"
                                    name="farmAddress"
                                    value={farmSearchTerm}
                                    onChange={handleFarmInputChange}
                                    onFocus={() => setShowFarmDropdown(true)}
                                    placeholder="Select or type your barangay"
                                    className="pr-10"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowFarmDropdown(!showFarmDropdown)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                
                                {showFarmDropdown && (
                                    <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-[120px] overflow-auto">
                                        {getFilteredOptions(farmAddressOptions, farmSearchTerm).length > 0 ? (
                                            getFilteredOptions(farmAddressOptions, farmSearchTerm).map((option) => (
                                                <div
                                                    key={option}
                                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => handleFarmSelect(option)}
                                                >
                                                    {option}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                                No matching barangays found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
                        disabled={isDeletionButtonDisabled}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {getDeletionButtonText()}
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
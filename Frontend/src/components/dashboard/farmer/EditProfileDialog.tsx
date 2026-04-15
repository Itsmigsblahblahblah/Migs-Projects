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
import { User, Trash2, Clock, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ProfilePictureSelector from "./ProfilePictureSelector";

interface FarmerProfileData {
    fullName: string;
    email: string;
    contactNumber: string;
    homeAddress: string;
    farmAddress: string;
    farmArea: string;
    photoURL?: string;
}

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    farmerProfile: FarmerProfileData;
    handleProfileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleProfileImageSelection: (imagePath: string) => void;
    handleUpdateProfile: (profileData?: FarmerProfileData) => Promise<void>;
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
    handleProfileInputChange,
    handleProfileImageSelection,
    handleUpdateProfile,
    onRequestAccountDeletion,
    username,
    deletionRequest,
    isDeletionButtonDisabled,
    getDeletionButtonText
}: EditProfileDialogProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const wasJustSaved = useRef(false);
    const [emailHasBeenSaved, setEmailHasBeenSaved] = useState(false); // Track if email was saved
    const [editableEmail, setEditableEmail] = useState(farmerProfile.email || "");
    
    // Dropdown states for home address
    const [showHomeDropdown, setShowHomeDropdown] = useState(false);
    const [homeSearchTerm, setHomeSearchTerm] = useState(farmerProfile.homeAddress || "");
    const homeDropdownRef = useRef<HTMLDivElement>(null);

    // Dropdown states for farm address
    const [showFarmDropdown, setShowFarmDropdown] = useState(false);
    const [farmSearchTerm, setFarmSearchTerm] = useState(farmerProfile.farmAddress || "");
    const farmDropdownRef = useRef<HTMLDivElement>(null);

    // Split full name into first and last name for editing
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // Sync dropdown values with farmerProfile when it changes or when dialog opens
    useEffect(() => {
        if (open) { // Only sync when dialog is open
            // Small delay to ensure state propagation
            setTimeout(() => {
                setHomeSearchTerm(farmerProfile.homeAddress || "");
                setFarmSearchTerm(farmerProfile.farmAddress || "");
            }, 10);
        }
    }, [farmerProfile.homeAddress, farmerProfile.farmAddress, open]);
    
    // Sync name fields only when dialog opens or when fullName changes from external sources
    useEffect(() => {
        if (open) { // Only sync when dialog is open
            // Small delay to ensure state propagation
            setTimeout(() => {
                // Split full name into first and last name
                if (farmerProfile.fullName) {
                    const nameParts = farmerProfile.fullName.split(" ");
                    if (nameParts.length >= 2) {
                        setFirstName(nameParts[0]);
                        setLastName(nameParts.slice(1).join(" "));
                    } else {
                        setFirstName(farmerProfile.fullName);
                        setLastName("");
                    }
                }
            }, 10);
        }
    }, [farmerProfile.fullName, open]);
    
    // Sync email state when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                setEditableEmail(farmerProfile.email || "");
                // If email already exists and is not empty, mark it as saved
                if (farmerProfile.email && farmerProfile.email.trim() !== "") {
                    setEmailHasBeenSaved(true);
                }
            }, 10);
        }
    }, [farmerProfile.email, open]);
    
    // Home address options
    const homeAddressOptions = [
        "Brgy. Amonoy", "Brgy. Bakia", "Brgy. Balanac", "Brgy. Balayong", "Brgy. Banilad", "Brgy. Banti", "Brgy. Bitaoy",
        "Brgy. Botocan", "Brgy. Bukal", "Brgy. Burgos", "Brgy. Burol", "Brgy. Coralao", "Brgy. Gagalot", "Brgy. Ibabang Banga",
        "Brgy. Ibabang Bayucain", "Brgy. Ilayang Banga", "Brgy. Ilayang Bayucain", "Brgy. Isabang", "Brgy. Malinao",
        "Brgy. May-It", "Brgy. Munting Kawayan", "Brgy. Oobi", "Brgy. Olla", "Brgy. Origuel (Poblacion)", "Brgy. Panalaban",
        "Brgy. Pangil", "Brgy. Panglan", "Brgy. Piit", "Brgy. Pook", "Brgy. Rizal", "Brgy. San Francisco (Poblacion)",
        "Brgy. San Isidro", "Brgy. San Miguel (Poblacion)", "Brgy. San Roque", "Brgy. Santa Catalina (Poblacion)",
        "Brgy. Suba", "Brgy. Talortor", "Brgy. Tanawan", "Brgy. Taytay", "Brgy. Villa Nogales"
    ];
    
    // Farm address options
    const farmAddressOptions = [
        "Brgy. Amonoy", "Brgy. Balayong", "Brgy. Oobi", "Brgy. Banga", "Brgy. Bukal", 
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

    // Handle input change for first name
    const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.target.value);
    };

    // Handle input change for last name
    const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLastName(e.target.value);
    };

    // Handle input change for email
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditableEmail(e.target.value);
    };

    // Handle input change for contact number
    const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
        handleProfileInputChange({
            target: { name: "contactNumber", value }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    // Format contact number for display
    const formatContactNumberDisplay = (contactNumber: string) => {
        if (!contactNumber) return '';
        
        // If it already has the +63 prefix, remove it first
        let cleaned = contactNumber.replace(/\D/g, '');
        if (contactNumber.startsWith('+63')) {
            // Remove the first 2 digits (63) if it starts with +63
            if (cleaned.startsWith('63') && cleaned.length > 2) {
                cleaned = cleaned.substring(2);
            }
        }
        
        const limited = cleaned.slice(0, 10);
        
        if (limited.length <= 3) {
            return limited;
        }
        
        if (limited.length <= 6) {
            return `${limited.slice(0, 3)} ${limited.slice(3)}`;
        }
        
        return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    };

    // Handle save changes with combined full name
    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            // Combine first and last name into full name before saving
            const combinedFullName = `${firstName} ${lastName}`.trim();
            
            // Create updated profile data with the new fullName and email
            const updatedProfileData = {
                ...farmerProfile,
                fullName: combinedFullName,
                email: editableEmail // Use the editable email
            };
            
            // Call the update function with the updated profile data
            await handleUpdateProfile(updatedProfileData);
            
            // Mark email as saved if it has a value
            if (editableEmail && editableEmail.trim() !== "") {
                setEmailHasBeenSaved(true);
            }
            
            onOpenChange(false);
        } catch (error) {
            setIsSaving(false);
            console.error("Error saving profile:", error);
            throw error;
        } finally {
            setIsSaving(false);
        }
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
                    {/* Profile Picture Selection */}
                    <ProfilePictureSelector
                        selectedImage={farmerProfile.photoURL || null}
                        onSelectImage={handleProfileImageSelection}
                        disabled={isSaving}
                    />

                    {/* First Name and Last Name - Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-firstName">First Name</Label>
                            <Input
                                id="profile-firstName"
                                value={firstName}
                                onChange={handleFirstNameChange}
                                placeholder="Enter your first name"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-lastName">Last Name</Label>
                            <Input
                                id="profile-lastName"
                                value={lastName}
                                onChange={handleLastNameChange}
                                placeholder="Enter your last name"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    {/* Contact Number - Full width */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-contactNumber">Contact Number</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-gray-100 dark:bg-gray-800 rounded-l-md border-r border-gray-300 dark:border-gray-600">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">+63</span>
                            </div>
                            <Input
                                id="profile-contactNumber"
                                name="contactNumber"
                                value={formatContactNumberDisplay(farmerProfile.contactNumber)}
                                onChange={handleContactNumberChange}
                                placeholder="9xx xxx xxxx"
                                disabled={isSaving}
                                className="pl-16"
                                maxLength={12}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Enter your 10-digit Philippine mobile number (e.g., 9123456789)
                        </p>
                        {farmerProfile.contactNumber && (
                            <p className="text-xs text-muted-foreground">
                                Will be stored as: <span className="font-medium">+63{farmerProfile.contactNumber.replace(/\s/g, '').replace('+63', '')}</span>
                            </p>
                        )}
                    </div>

                    {/* Email - Editable if empty, disabled after saved */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-email">
                            Email
                            {emailHasBeenSaved ? (
                                <span className="text-xs text-muted-foreground ml-2">(Cannot be edited after saving)</span>
                            ) : (
                                <span className="text-xs text-destructive ml-2">*Required - You must provide an email</span>
                            )}
                        </Label>
                        <Input
                            id="profile-email"
                            name="email"
                            value={editableEmail}
                            onChange={handleEmailChange}
                            disabled={emailHasBeenSaved || isSaving}
                            className={emailHasBeenSaved ? "bg-muted cursor-not-allowed" : "bg-white"}
                            placeholder={emailHasBeenSaved ? "" : "Enter your email address"}
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
                                    disabled={isSaving}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isSaving}
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
                                    disabled={isSaving}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowFarmDropdown(!showFarmDropdown)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isSaving}
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
                            disabled={isSaving}
                        />
                    </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={onRequestAccountDeletion}
                        disabled={isDeletionButtonDisabled || isSaving}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {getDeletionButtonText()}
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => onOpenChange(false)} 
                            className="flex-1"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 flex items-center gap-2"
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <LoadingSpinner size="sm" className="text-white" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileDialog;
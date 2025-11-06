import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Edit2 } from "lucide-react";

interface ProfileCardProps {
    username: string;
    farmerProfile: {
        fullName: string;
        photoURL?: string;
        farmArea: string;
        farmAddress: string;
        homeAddress: string;
        createdAt?: string;
    };
    onEditProfile: () => void;
}

const ProfileCard = ({ username, farmerProfile, onEditProfile }: ProfileCardProps) => {
    // Format the registration date
    const formatRegistrationDate = (dateString: string | undefined) => {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Farmer Profile
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEditProfile}
                        className="flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    {farmerProfile.photoURL ? (
                        <img
                            src={farmerProfile.photoURL}
                            alt={username}
                            className="h-12 w-12 rounded-full object-cover"
                        />
                    ) : (
                        <div className="bg-secondary rounded-full p-3">
                            <User className="h-6 w-6 text-secondary-foreground" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold">{farmerProfile.fullName || username}</h3>
                        <p className="text-sm text-muted-foreground">
                            {farmerProfile.homeAddress 
                                ? `${farmerProfile.homeAddress}, Majayjay` 
                                : "Majayjay, Batangas"}
                        </p>
                    </div>
                </div>
                <Separator />
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Farm Area:</span>
                        <span>{farmerProfile.farmArea || '2.5 hectares'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{farmerProfile.farmAddress || 'Barangay 1'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Member Since:</span>
                        <span>{formatRegistrationDate(farmerProfile.createdAt)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProfileCard;
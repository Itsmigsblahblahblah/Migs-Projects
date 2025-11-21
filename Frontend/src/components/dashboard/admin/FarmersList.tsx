import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Home, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Farmer {
    uid: string;
    email: string;
    fullName: string;
    farmName: string;
    contactNumber: string;
    role: string;
    createdAt: string;
    photoURL?: string | null;
    homeAddress?: string;
    farmAddress?: string;
}

interface FarmersListProps {
    farmers: Farmer[];
}

const FarmersList = ({ farmers }: FarmersListProps) => {
    const navigate = useNavigate();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Unknown date';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Unknown date';
        }
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Registered Farmers</CardTitle>
                        <CardDescription>List of all farmers registered in the system ({farmers.length} total)</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {farmers.length > 0 ? (
                    <div className="space-y-4">
                        {farmers.map((farmer) => (
                            <div
                                key={farmer.uid}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Circular Profile Image */}
                                    <Avatar className="h-16 w-16 cursor-pointer" onClick={() => navigate(`/admin/farmer/${farmer.uid}`)}>
                                        <AvatarImage src={farmer.photoURL || undefined} alt={farmer.fullName} />
                                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                            {getInitials(farmer.fullName)}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Farmer Information */}
                                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/admin/farmer/${farmer.uid}`)}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold text-lg">{farmer.fullName}</h3>
                                                <p className="text-sm text-muted-foreground">{farmer.contactNumber || "No contact number"}</p>
                                            </div>
                                            <Badge variant="secondary">Farmer</Badge>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground truncate">{farmer.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <span className="text-muted-foreground">Home: </span>
                                                    <span>{farmer.homeAddress || "Not provided"}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <span className="text-muted-foreground">Farm: </span>
                                                    <span>{farmer.farmAddress || "Not provided"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            Registered: {formatDate(farmer.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>No registered farmers yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FarmersList;
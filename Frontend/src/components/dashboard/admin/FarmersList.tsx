import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Calendar, Mail, Home, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

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
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const farmersPerPage = 10;

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

    // Filter farmers based on search term
    const filteredFarmers = farmers.filter(farmer =>
        farmer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (farmer.contactNumber && farmer.contactNumber.includes(searchTerm)) ||
        (farmer.homeAddress && farmer.homeAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (farmer.farmAddress && farmer.farmAddress.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredFarmers.length / farmersPerPage);
    const startIndex = (currentPage - 1) * farmersPerPage;
    const endIndex = startIndex + farmersPerPage;
    const currentFarmers = filteredFarmers.slice(startIndex, endIndex);

    return (
        <Card className="shadow-card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Registered Farmers</CardTitle>
                        <CardDescription>List of all farmers registered in the system ({filteredFarmers.length} total)</CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search farmers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {farmers.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            {currentFarmers.map((farmer) => (
                                <div
                                    key={farmer.uid}
                                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Circular Profile Image */}
                                        <Avatar className="h-16 w-16 cursor-pointer overflow-hidden rounded-full" onClick={() => navigate(`/admin/farmer/${farmer.uid}`)}>
                                            <AvatarImage src={farmer.photoURL || undefined} alt={farmer.fullName} className="object-cover w-full h-full" />
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

                        {/* Pagination Controls */}
                        {farmers.length > 0 && (
                            <div className="border-t pt-1 px-4 mt-auto" style={{ paddingBottom: '0px' }}>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground" style={{ margin: '1px 0' }}>
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredFarmers.length)} of {filteredFarmers.length} farmers
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Previous
                                        </Button>

                                        {/* Page Number Buttons */}
                                        {(() => {
                                            const pageButtons = [];
                                            // Show more pages (7 instead of 5) to reduce ellipsis
                                            let startPage = Math.max(1, currentPage - 3);
                                            let endPage = Math.min(totalPages, startPage + 6);

                                            // Adjust startPage if we're near the end
                                            if (endPage - startPage < 6) {
                                                startPage = Math.max(1, endPage - 6);
                                            }

                                            // First page button
                                            if (startPage > 1) {
                                                pageButtons.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(1)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        1
                                                    </Button>
                                                );
                                                // Only show ellipsis if there's a significant gap
                                                if (startPage > 2) {
                                                    pageButtons.push(
                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                    );
                                                }
                                            }

                                            // Page number buttons
                                            for (let i = startPage; i <= endPage; i++) {
                                                pageButtons.push(
                                                    <Button
                                                        key={i}
                                                        variant={currentPage === i ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(i)}
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                                                    >
                                                        {i}
                                                    </Button>
                                                );
                                            }

                                            // Last page button
                                            if (endPage < totalPages) {
                                                // Only show ellipsis if there's a significant gap
                                                if (endPage < totalPages - 1) {
                                                    pageButtons.push(
                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                    );
                                                }
                                                pageButtons.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="h-8 w-8 p-0 text-sm"
                                                    >
                                                        {totalPages}
                                                    </Button>
                                                );
                                            }

                                            return pageButtons;
                                        })()}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 px-3 text-sm"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
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
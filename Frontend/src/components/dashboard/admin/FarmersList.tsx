import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ArrowDown, ArrowUp } from "lucide-react";
import { Calendar, Mail, Home, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
    const [sortBy, setSortBy] = useState<'date' | 'barangay'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [groupByBarangay, setGroupByBarangay] = useState(false);
    const [selectedBarangay, setSelectedBarangay] = useState('all');
    const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
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

    // Get unique barangays from farmers
    const uniqueBarangays = useMemo(() => {
        const barangays = farmers.map(farmer => {
            const address = farmer.homeAddress || farmer.farmAddress || 'Unknown';
            return address;
        }).filter(Boolean);
        return [...new Set(barangays)].sort();
    }, [farmers]);

    // Filter and sort farmers
    const filteredAndSortedFarmers = useMemo(() => {
        // First filter by search term
        let filtered = farmers.filter(farmer =>
            farmer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            farmer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (farmer.contactNumber && farmer.contactNumber.includes(searchTerm)) ||
            (farmer.homeAddress && farmer.homeAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (farmer.farmAddress && farmer.farmAddress.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Filter by selected barangay if grouping is enabled
        if (groupByBarangay && selectedBarangay !== 'all') {
            filtered = filtered.filter(farmer => {
                const address = farmer.homeAddress || farmer.farmAddress || 'Unknown';
                return address === selectedBarangay;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            if (sortBy === 'date') {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                comparison = dateA - dateB;
            } else if (sortBy === 'barangay') {
                const barangayA = a.homeAddress || a.farmAddress || 'Unknown';
                const barangayB = b.homeAddress || b.farmAddress || 'Unknown';
                comparison = barangayA.localeCompare(barangayB);
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [farmers, searchTerm, sortBy, sortOrder, groupByBarangay, selectedBarangay]);

    // Group farmers by barangay if enabled
    const groupedFarmers = useMemo(() => {
        if (!groupByBarangay) return {};

        const groups: Record<string, typeof farmers> = {};
        filteredAndSortedFarmers.forEach(farmer => {
            const address = farmer.homeAddress || farmer.farmAddress || 'Unknown';
            if (!groups[address]) {
                groups[address] = [];
            }
            groups[address].push(farmer);
        });

        // Sort groups by barangay name
        const sortedGroups: Record<string, typeof farmers> = {};
        Object.keys(groups)
            .sort()
            .forEach(key => {
                sortedGroups[key] = groups[key];
            });

        return sortedGroups;
    }, [filteredAndSortedFarmers, groupByBarangay]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortBy, sortOrder, groupByBarangay, selectedBarangay]);

    // Pagination logic for non-grouped view
    const totalPages = groupByBarangay ? 1 : Math.ceil(filteredAndSortedFarmers.length / farmersPerPage);
    const startIndex = (currentPage - 1) * farmersPerPage;
    const endIndex = startIndex + farmersPerPage;
    const currentFarmers = groupByBarangay ? [] : filteredAndSortedFarmers.slice(startIndex, endIndex);

    // Handle sort change
    const handleSortChange = (criteria: 'date' | 'barangay', order: 'asc' | 'desc') => {
        setSortBy(criteria);
        setSortOrder(order);
        setCurrentPage(1);
    };

    // Handle accordion change
    const handleAccordionChange = (value: string | undefined) => {
        setOpenAccordion(value);
    };

    // Get sort label
    const getSortByLabel = () => {
        return sortBy === 'date' ? 'Date' : 'Barangay';
    };

    const getOrderLabel = () => {
        return sortOrder === 'asc' ? 'Ascending' : 'Descending';
    };

    // Render farmer card
    const renderFarmerCard = (farmer: typeof farmers[0]) => (
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
                        <Badge variant="secondary" className="hidden md:inline-flex">Farmer</Badge>
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
    );

    return (
        <Card className="shadow-card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Registered Farmers</CardTitle>
                        <CardDescription>List of all farmers registered in the system ({filteredAndSortedFarmers.length} total)</CardDescription>
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

                {/* Sorting and Grouping Options */}
                <div className="flex flex-wrap gap-2 pt-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Sort: {getSortByLabel()} - {getOrderLabel()}
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <Accordion
                                type="single"
                                collapsible
                                value={openAccordion}
                                onValueChange={handleAccordionChange}
                                className="w-full"
                            >
                                <AccordionItem value="date" className="border-b-0">
                                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                        <span className="flex items-center">
                                            Date
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-0">
                                        <DropdownMenuItem onClick={() => handleSortChange("date", "desc")} className="hover:bg-blue-50 hover:text-blue-700">
                                            <ArrowDown className="h-4 w-4 mr-2" />
                                            Newest First
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSortChange("date", "asc")} className="hover:bg-blue-50 hover:text-blue-700">
                                            <ArrowUp className="h-4 w-4 mr-2" />
                                            Oldest First
                                        </DropdownMenuItem>
                                    </AccordionContent>
                                </AccordionItem>

                                <DropdownMenuSeparator />

                                <AccordionItem value="barangay" className="border-b-0">
                                    <AccordionTrigger className="py-2 px-4 hover:no-underline hover:bg-blue-50 rounded-sm">
                                        <span className="flex items-center">
                                            Barangay
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-0">
                                        <DropdownMenuItem onClick={() => handleSortChange("barangay", "asc")} className="hover:bg-blue-50 hover:text-blue-700">
                                            <ArrowUp className="h-4 w-4 mr-2" />
                                            A - Z
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSortChange("barangay", "desc")} className="hover:bg-blue-50 hover:text-blue-700">
                                            <ArrowDown className="h-4 w-4 mr-2" />
                                            Z - A
                                        </DropdownMenuItem>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant={groupByBarangay ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGroupByBarangay(!groupByBarangay)}
                        className={`text-blue-600 hover:text-white ${groupByBarangay ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-blue-50'}`}
                    >
                        Group by Barangay
                    </Button>

                    {/* Filter by Barangay dropdown - shown when grouping is active */}
                    {groupByBarangay && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    {selectedBarangay === 'all' ? 'All Barangays' : selectedBarangay}
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 max-h-60 overflow-y-auto">
                                <DropdownMenuItem
                                    onClick={() => setSelectedBarangay('all')}
                                    className={`cursor-pointer ${selectedBarangay === 'all' ? "bg-blue-50 text-blue-700" : ""}`}
                                >
                                    All Barangays
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {uniqueBarangays.map(barangay => (
                                    <DropdownMenuItem
                                        key={barangay}
                                        onClick={() => setSelectedBarangay(barangay)}
                                        className={`cursor-pointer ${selectedBarangay === barangay ? "bg-blue-50 text-blue-700" : ""}`}
                                    >
                                        {barangay}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {farmers.length > 0 ? (
                    <div className="flex flex-col h-full">
                        <div className="space-y-4 flex-grow">
                            {groupByBarangay ? (
                                // Grouped view by barangay
                                Object.entries(groupedFarmers).map(([barangay, barangayFarmers]) => (
                                    <div key={barangay} className="space-y-3">
                                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md">
                                            <MapPin className="h-4 w-4 text-blue-600" />
                                            <h3 className="font-semibold text-blue-900">{barangay}</h3>
                                            <Badge variant="secondary" className="text-xs">{barangayFarmers.length} farmers</Badge>
                                        </div>
                                        <div className="space-y-3 pl-2">
                                            {barangayFarmers.map((farmer) => renderFarmerCard(farmer))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Non-grouped view with pagination
                                currentFarmers.map((farmer) => renderFarmerCard(farmer))
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {farmers.length > 0 && (
                            <div className="border-t pt-4 mt-auto">
                                {/* Desktop layout - text on left, pagination on right */}
                                <div className="hidden md:flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedFarmers.length)} of {filteredAndSortedFarmers.length} farmers
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-sm hover:bg-blue-50"
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
                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>

                                {/* Mobile layout - text and pagination both centered, pagination below text */}
                                <div className="md:hidden space-y-4">
                                    <div className="text-sm text-muted-foreground text-center">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedFarmers.length)} of {filteredAndSortedFarmers.length} farmers
                                    </div>
                                    <div className="flex justify-center space-x-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 px-3 text-sm hover:bg-blue-50"
                                        >
                                            Previous
                                        </Button>

                                        {/* Page Number Buttons */}
                                        {(() => {
                                            const pageButtons = [];
                                            // Show fewer pages on mobile to prevent overflow
                                            let startPage = Math.max(1, currentPage - 1);
                                            let endPage = Math.min(totalPages, startPage + 2);

                                            // Adjust startPage if we're near the end
                                            if (endPage - startPage < 2) {
                                                startPage = Math.max(1, endPage - 2);
                                            }

                                            // First page button
                                            if (startPage > 1) {
                                                pageButtons.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(1)}
                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
                                                    >
                                                        1
                                                    </Button>
                                                );
                                                // Only show ellipsis if there's a significant gap
                                                if (startPage > 2) {
                                                    pageButtons.push(
                                                        <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
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
                                                        className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-blue-50"}`}
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
                                                        <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm hidden sm:inline">⋯</span>
                                                    );
                                                }
                                                pageButtons.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="h-8 w-8 p-0 text-sm hover:bg-blue-50"
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
                                            className="h-8 px-3 text-sm hover:bg-blue-50"
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
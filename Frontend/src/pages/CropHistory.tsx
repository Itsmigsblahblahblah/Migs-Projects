import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCrops } from "@/contexts/CropContext";
import { Leaf, Calendar, MapPin, Wheat, TrendingUp, Plus, Sprout } from "lucide-react";

const CropHistory = () => {
    const { crops } = useCrops();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const user = localStorage.getItem('username');

        if (role !== 'farmer') {
            navigate('/');
            return;
        }

        setUsername(user || 'Farmer');

        // Simulate loading state
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [navigate]);

    const formatDate = (timestamp: any) => {
        if (!timestamp || !timestamp.toDate) return 'Unknown date';
        try {
            return timestamp.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return 'Unknown date';
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                        <div className="flex items-center gap-3 mb-2">
                            <Leaf className="h-6 w-6" />
                            <h1 className="text-2xl font-bold">Crop History</h1>
                        </div>
                        <p className="text-primary-foreground/90">
                            View and manage all your crop plantings
                        </p>
                    </div>

                    {/* Loading State */}
                    <Card className="shadow-card">
                        <CardContent className="py-12 text-center">
                            <div className="flex justify-center items-center h-24">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-muted-foreground">Loading crop history...</p>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header with Add Crop Button */}
                <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Leaf className="h-6 w-6" />
                                <h1 className="text-2xl font-bold">Crop History</h1>
                            </div>
                            <p className="text-primary-foreground/90">
                                View and manage all your crop plantings
                            </p>
                        </div>
                        <Button 
                            onClick={() => navigate('/farmer')} 
                            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Crop
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                {crops.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Sprout className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Crops</p>
                                        <p className="text-2xl font-bold">{crops.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-success/10 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Investment</p>
                                        <p className="text-2xl font-bold">
                                            ₱{(crops.reduce((sum, crop) => sum + (Number(crop.puhunan) || 0), 0)).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="shadow-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <MapPin className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Area</p>
                                        <p className="text-2xl font-bold">
                                            {(crops.reduce((sum, crop) => sum + (Number(crop.landArea) || 0), 0)).toFixed(1)} ha
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Crops List */}
                {crops.length === 0 ? (
                    <Card className="shadow-card">
                        <CardContent className="py-12 text-center">
                            <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No crops found</h3>
                            <p className="text-muted-foreground mb-4">
                                You haven't added any crops yet. Start by adding your first crop.
                            </p>
                            <Button onClick={() => navigate('/farmer')}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Crop
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Your Crops</h2>
                            <p className="text-muted-foreground">{crops.length} crops</p>
                        </div>
                        
                        {crops.map((crop) => (
                            <Card
                                key={crop.id}
                                className="shadow-card hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
                                onClick={() => navigate(`/crop/${crop.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Wheat className="h-5 w-5 text-primary" />
                                                {crop.name}
                                            </CardTitle>
                                            <CardDescription>
                                                Planted on {formatDate(crop.plantedDate)}
                                            </CardDescription>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/crop/${crop.id}`);
                                            }}
                                        >
                                            <Leaf className="h-4 w-4 mr-1" />
                                            View Details
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Land Area</p>
                                                <p className="font-medium">{Number(crop.landArea)} hectares</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Capital</p>
                                                <p className="font-medium">₱{Number(crop.puhunan).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Leaf className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Soil Type</p>
                                                <p className="font-medium">{crop.soilType}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Planting Date</p>
                                                <p className="font-medium">{formatDate(crop.plantedDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CropHistory;
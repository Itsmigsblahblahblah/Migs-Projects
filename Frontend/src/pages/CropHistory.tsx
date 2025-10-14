import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useCrops } from "@/contexts/CropContext";
import { Leaf, Calendar, MapPin, Wheat, TrendingUp } from "lucide-react";

interface Crop {
    id: string;
    name: string;
    landArea: string;
    quantity: number;
    soilType: string;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    puhunan: number;
    plantedDate: any;
    createdAt: any;
}

const CropHistory = () => {
    const { crops } = useCrops();
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        const user = localStorage.getItem('username');

        if (role !== 'farmer') {
            navigate('/');
            return;
        }

        setUsername(user || 'Farmer');
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
                                Add Crop
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {crops.map((crop) => (
                            <Card
                                key={crop.id}
                                className="shadow-card hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => navigate(`/crop/${crop.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Wheat className="h-5 w-5" />
                                                {crop.name}
                                            </CardTitle>
                                            <CardDescription>
                                                Planted on {formatDate(crop.plantedDate)}
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            View Details
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Land Area</p>
                                                <p className="font-medium">{crop.landArea}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Wheat className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Quantity</p>
                                                <p className="font-medium">{crop.quantity} kg</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Puhunan</p>
                                                <p className="font-medium">₱{crop.puhunan.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Soil Type</p>
                                                <p className="font-medium">{crop.soilType}</p>
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
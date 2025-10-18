import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, MapPin, Wheat, Droplets, TrendingUpIcon } from "lucide-react";

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

interface CropInfoCardProps {
    crop: Crop;
}

const CropInfoCard = ({ crop }: CropInfoCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5" />
                    Basic Crop Information
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Wheat className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Crop Name</p>
                            <p className="font-medium">{crop.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Land Area</p>
                            <p className="font-medium">{crop.landArea}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Wheat className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Quantity</p>
                            <p className="font-medium">{crop.quantity} kg</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Droplets className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Soil Type</p>
                            <p className="font-medium">{crop.soilType}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Droplets className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Soil Composition</p>
                            <p className="font-medium">
                                N:{crop.nitrogen} P:{crop.phosphorus} K:{crop.potassium}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <TrendingUpIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Puhunan</p>
                            <p className="font-medium">₱{crop.puhunan.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CropInfoCard;
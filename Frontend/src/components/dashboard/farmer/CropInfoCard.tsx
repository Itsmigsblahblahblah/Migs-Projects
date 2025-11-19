import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, MapPin, Wheat, Droplets, TrendingUpIcon, Calendar } from "lucide-react";

interface CropInfoCardProps {
    crop: any;
}

const CropInfoCard = ({ crop }: CropInfoCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    Crop Information
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Wheat className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Crop Name</p>
                            <p className="font-medium text-lg">{crop.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Land Area</p>
                            <p className="font-medium text-lg">{crop.landArea} hectares</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Droplets className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Soil Type</p>
                            <p className="font-medium text-lg">{crop.soilType}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <TrendingUpIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Capital</p>
                            <p className="font-medium text-lg">₱{crop.puhunan.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Planting Date</p>
                            <p className="font-medium text-lg">
                                {(() => {
                                    try {
                                        // Handle string dates (YYYY-MM-DD format)
                                        if (typeof crop.plantedDate === 'string') {
                                            const date = new Date(crop.plantedDate);
                                            if (!isNaN(date.getTime())) {
                                                return date.toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                });
                                            }
                                        }
                                        
                                        // Handle Firestore Timestamp
                                        if (crop.plantedDate?.toDate) {
                                            return crop.plantedDate.toDate().toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                        }
                                        
                                        // Handle JavaScript Date objects
                                        if (crop.plantedDate instanceof Date) {
                                            return crop.plantedDate.toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                        }
                                        
                                        return 'Unknown date';
                                    } catch (e) {
                                        return 'Unknown date';
                                    }
                                })()}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Leaf className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Days Since Planting</p>
                            <p className="font-medium text-lg">
                                {(() => {
                                    try {
                                        let plantedDate;
                                        
                                        // Handle string dates (YYYY-MM-DD format)
                                        if (typeof crop.plantedDate === 'string') {
                                            plantedDate = new Date(crop.plantedDate);
                                        }
                                        // Handle Firestore Timestamp
                                        else if (crop.plantedDate?.toDate) {
                                            plantedDate = crop.plantedDate.toDate();
                                        }
                                        // Handle JavaScript Date objects
                                        else if (crop.plantedDate instanceof Date) {
                                            plantedDate = crop.plantedDate;
                                        }
                                        
                                        if (plantedDate && !isNaN(plantedDate.getTime())) {
                                            return Math.floor((new Date().getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
                                        }
                                        
                                        return 'N/A';
                                    } catch (e) {
                                        return 'N/A';
                                    }
                                })()} days
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CropInfoCard;
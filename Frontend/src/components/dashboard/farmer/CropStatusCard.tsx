import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wheat } from "lucide-react";

interface CropData {
    currentCrop: string;
    plantedArea: string;
    nextHarvest: string;
    growthStage: string;
    productivityIndex: number;
}

interface CropStatusCardProps {
    cropData: CropData;
    onClick?: () => void; // Add onClick handler
}

const CropStatusCard = ({ cropData, onClick }: CropStatusCardProps) => {
    return (
        <Card className="shadow-card cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wheat className="h-5 w-5" />
                    Crop Status
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="bg-success/10 p-2 rounded-full">
                        <Wheat className="h-5 w-5 text-success" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{cropData.currentCrop}</h3>
                        <p className="text-sm text-muted-foreground">{cropData.plantedArea}</p>
                    </div>
                </div>
                <Separator />
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Next Harvest:</span>
                        <span className="font-medium">{cropData.nextHarvest}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Growth Stage:</span>
                        <Badge variant="outline">{cropData.growthStage}</Badge>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Productivity:</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                                <div
                                    className="bg-success h-2 rounded-full"
                                    style={{ width: `${cropData.productivityIndex}%` }}
                                ></div>
                            </div>
                            <span className="text-sm">{cropData.productivityIndex}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CropStatusCard;
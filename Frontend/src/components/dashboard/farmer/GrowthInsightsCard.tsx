import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Bug, Droplets } from "lucide-react";

interface PrescribedCrop {
    id: string;
    name: string;
    reason: string;
    recommendations: string[];
    practices: string[];
}

interface GrowthInsightsCardProps {
    growthStage: string;
    harvestDate: string;
    productivity: number;
    prescribedCrops: PrescribedCrop[];
    selectedPrescribedCrop: PrescribedCrop | null;
    onPrescribedCropSelect: (crop: PrescribedCrop) => void;
    onResetSelection: () => void;
}

const GrowthInsightsCard = ({
    growthStage,
    harvestDate,
    productivity,
    prescribedCrops,
    selectedPrescribedCrop,
    onPrescribedCropSelect,
    onResetSelection
}: GrowthInsightsCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Growth and Health Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-accent/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Growth Stage</p>
                        <p className="font-medium">{growthStage}</p>
                    </div>
                    <div className="p-4 bg-accent/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Harvest Date</p>
                        <p className="font-medium">{harvestDate}</p>
                    </div>
                    <div className="p-4 bg-accent/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Productivity</p>
                        <div className="flex items-center gap-2">
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-success h-2 rounded-full"
                                    style={{ width: `${productivity}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-medium">{productivity}%</span>
                        </div>
                    </div>
                </div>

                {/* Prescribed Crops Section */}
                <div>
                    <h3 className="font-medium mb-3">Prescribed Crops</h3>
                    {prescribedCrops.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {prescribedCrops.map((prescribedCrop) => (
                                <Badge
                                    key={prescribedCrop.id}
                                    variant={selectedPrescribedCrop?.id === prescribedCrop.id ? "default" : "secondary"}
                                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                                    onClick={() => onPrescribedCropSelect(prescribedCrop)}
                                >
                                    {prescribedCrop.name}
                                </Badge>
                            ))}
                            {selectedPrescribedCrop && (
                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={onResetSelection}
                                >
                                    Clear Selection
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No crop prescriptions available at the moment. Please check again later or adjust your soil/forecast settings.
                        </p>
                    )}
                </div>

                {/* Common Issues & Solutions */}
                <div>
                    <h3 className="font-medium mb-3">Common Issues & Solutions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Bug className="h-4 w-4 text-destructive" />
                                <span className="font-medium text-sm">Pests</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Use neem oil spray and introduce beneficial insects like ladybugs.
                            </p>
                        </div>
                        <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Droplets className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">Diseases</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Ensure proper spacing and apply copper-based fungicides if needed.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default GrowthInsightsCard;
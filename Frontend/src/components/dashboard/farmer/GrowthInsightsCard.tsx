import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Bug, Droplets, Leaf, Calendar, TrendingUp } from "lucide-react";

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
                    <Sun className="h-5 w-5 text-primary" />
                    Growth Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Leaf className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Growth Stage</p>
                        </div>
                        <p className="font-bold text-lg">{growthStage}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Harvest Date</p>
                        </div>
                        <p className="font-bold text-lg">{harvestDate}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productivity</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-success h-2 rounded-full"
                                    style={{ width: `${productivity}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-bold">{productivity}%</span>
                        </div>
                    </div>
                </div>

                {/* Prescribed Crops Section */}
                <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-primary" />
                        Recommended Crops
                    </h3>
                    {prescribedCrops.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {prescribedCrops.map((prescribedCrop) => (
                                <Badge
                                    key={prescribedCrop.id}
                                    variant={selectedPrescribedCrop?.id === prescribedCrop.id ? "default" : "secondary"}
                                    className="cursor-pointer hover:bg-primary/80 transition-colors py-2 px-3 text-sm"
                                    onClick={() => onPrescribedCropSelect(prescribedCrop)}
                                >
                                    {prescribedCrop.name}
                                </Badge>
                            ))}
                            {selectedPrescribedCrop && (
                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
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
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Bug className="h-4 w-4 text-primary" />
                        Common Issues & Solutions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <Bug className="h-4 w-4 text-destructive" />
                                <span className="font-medium text-sm">Pest Control</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Use neem oil spray and introduce beneficial insects like ladybugs.
                            </p>
                        </div>
                        <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <Droplets className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-sm">Disease Prevention</span>
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
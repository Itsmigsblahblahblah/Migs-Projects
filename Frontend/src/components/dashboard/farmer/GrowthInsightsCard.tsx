import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Bug, Droplets, Leaf, Calendar, TrendingUp } from "lucide-react";
import InfoTooltip from "@/components/ui/info-tooltip";

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
    scrollToMaintenance?: () => void;
}

const GrowthInsightsCard = ({
    growthStage,
    harvestDate,
    productivity,
    scrollToMaintenance
}: GrowthInsightsCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-primary" />
                    Growth Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Leaf className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Growth Stage</p>
                            <InfoTooltip content="The current development phase of your crop, indicating what care it needs now" />
                        </div>
                        <p className="font-bold text-lg">{growthStage}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Harvest Date</p>
                            <InfoTooltip content="The estimated date when your crop will be ready for harvesting" />
                        </div>
                        <p className="font-bold text-lg">{harvestDate}</p>
                    </div>
                    <div
                        className="p-4 bg-primary/5 rounded-lg border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={scrollToMaintenance}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productivity</p>
                            <InfoTooltip content="Your completion percentage of recommended farming practices for this crop. Click to view maintenance checklist." />
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

                {/* Common Issues & Solutions */}
                <div className="pb-2">
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
                                <Droplets className="h-4 w-4 text-green-500" />
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
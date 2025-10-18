import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface PrescribedCrop {
    id: string;
    name: string;
    reason: string;
    recommendations: string[];
    practices: string[];
}

interface RecommendationsCardProps {
    selectedPrescribedCrop: PrescribedCrop | null;
}

const RecommendationsCard = ({ selectedPrescribedCrop }: RecommendationsCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {selectedPrescribedCrop ? `${selectedPrescribedCrop.name} Recommendations` : "Recommendations"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {selectedPrescribedCrop ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="p-3 bg-primary/5 rounded-lg border">
                            <h4 className="font-medium mb-2">Why {selectedPrescribedCrop.name}?</h4>
                            <p className="text-sm">{selectedPrescribedCrop.reason}</p>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Practical Recommendations</h4>
                            <ul className="space-y-2 text-sm">
                                {selectedPrescribedCrop.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium mb-2">Best Practices</h4>
                            <ul className="space-y-2 text-sm">
                                {selectedPrescribedCrop.practices.map((practice, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                        <span>{practice}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>Water consistently but avoid waterlogging</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>Apply balanced fertilizer every 3 weeks</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>Monitor for pests daily, especially in the morning</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>Harvest when grains are golden brown for best yield</span>
                        </li>
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default RecommendationsCard;
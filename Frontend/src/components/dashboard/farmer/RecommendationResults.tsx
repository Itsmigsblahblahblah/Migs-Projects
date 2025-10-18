import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sprout, AlertTriangle, CheckCircle, TrendingUp, Lightbulb } from "lucide-react";

interface Recommendation {
    problem: string;
    crop: string;
    recommend: string[];
    avoid: string[];
    advice: string;
}

interface RecommendationResultsProps {
    recommendation: Recommendation | null;
}

const RecommendationResults = ({ recommendation }: RecommendationResultsProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    AI Recommendation
                </CardTitle>
                <CardDescription>
                    Smart farming guidance based on your reported issue
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!recommendation ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Sprout className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>Submit your farming problem to get personalized recommendations</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Problem Detection */}
                        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-warning" />
                                <span className="font-medium">Detected Problem</span>
                            </div>
                            <Badge variant="outline" className="capitalize">
                                {recommendation.problem.replace('_', ' ')}
                            </Badge>
                            {recommendation.crop !== 'unknown' && (
                                <Badge variant="outline" className="ml-2 capitalize">
                                    Affected: {recommendation.crop}
                                </Badge>
                            )}
                        </div>

                        <Separator />

                        {/* Recommendations */}
                        <div className="space-y-4">
                            {recommendation.recommend.length > 0 && (
                                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="h-4 w-4 text-success" />
                                        <span className="font-medium text-success">Recommended Crops</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendation.recommend.map((crop: string, index: number) => (
                                            <Badge key={index} className="bg-success text-success-foreground">
                                                {crop}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recommendation.avoid.length > 0 && (
                                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                        <span className="font-medium text-destructive">Avoid These Crops</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendation.avoid.map((crop: string, index: number) => (
                                            <Badge key={index} variant="destructive">
                                                {crop}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expert Advice */}
                            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-accent" />
                                    <span className="font-medium">Expert Advice</span>
                                </div>
                                <p className="text-sm text-foreground/80">
                                    {recommendation.advice}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecommendationResults;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sprout, AlertTriangle, CheckCircle, TrendingUp, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
    const [showAllRecommend, setShowAllRecommend] = useState(false);
    const [showAllAvoid, setShowAllAvoid] = useState(false);
    
    // Limit for displaying items before showing "See More"
    const DISPLAY_LIMIT = 3;
    
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

                        {/* Best Practices */}
                        <div className="space-y-4">
                            {recommendation.recommend.length > 0 && (
                                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckCircle className="h-4 w-4 text-success" />
                                        <span className="font-medium text-success">Best Practices</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendation.recommend
                                            .slice(0, showAllRecommend ? recommendation.recommend.length : DISPLAY_LIMIT)
                                            .map((crop: string, index: number) => (
                                                <Badge key={index} className="bg-success text-success-foreground">
                                                    {crop}
                                                </Badge>
                                            ))}
                                    </div>
                                    {recommendation.recommend.length > DISPLAY_LIMIT && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 p-0 h-auto text-success hover:text-success/80"
                                            onClick={() => setShowAllRecommend(!showAllRecommend)}
                                        >
                                            {showAllRecommend ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                    Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                    See More ({recommendation.recommend.length - DISPLAY_LIMIT} more)
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Caution / Things to Avoid */}
                            {recommendation.avoid.length > 0 && (
                                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                        <span className="font-medium text-destructive">Caution / Things to Avoid</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendation.avoid
                                            .slice(0, showAllAvoid ? recommendation.avoid.length : DISPLAY_LIMIT)
                                            .map((crop: string, index: number) => (
                                                <Badge key={index} variant="destructive">
                                                    {crop}
                                                </Badge>
                                            ))}
                                    </div>
                                    {recommendation.avoid.length > DISPLAY_LIMIT && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-2 p-0 h-auto text-destructive hover:text-destructive/80"
                                            onClick={() => setShowAllAvoid(!showAllAvoid)}
                                        >
                                            {showAllAvoid ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                    Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                    See More ({recommendation.avoid.length - DISPLAY_LIMIT} more)
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* AI Guidance */}
                            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-accent" />
                                    <span className="font-medium">AI Guidance</span>
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
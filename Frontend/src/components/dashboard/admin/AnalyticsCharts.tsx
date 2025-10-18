import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

interface ProblemData {
    name: string;
    count: number;
    color: string;
}

interface MonthlyTrend {
    month: string;
    reports: number;
    resolved: number;
}

interface CropRecommendation {
    crop: string;
    frequency: number;
}

interface AnalyticsChartsProps {
    problemsData: ProblemData[];
    monthlyTrends: MonthlyTrend[];
    cropRecommendations: CropRecommendation[];
    onExport: (type: string) => void;
}

const AnalyticsCharts = ({
    problemsData,
    monthlyTrends,
    cropRecommendations,
    onExport
}: AnalyticsChartsProps) => {
    return (
        <>
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Problem Types Chart */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Most Common Problems</CardTitle>
                        <CardDescription>Distribution of farming issues this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {problemsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={problemsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Trends */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Monthly Trends</CardTitle>
                        <CardDescription>Reports vs resolved issues over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthlyTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="reports"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="resolved"
                                        stroke="hsl(var(--success))"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Crop Recommendations */}
            <Card className="shadow-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Top Crop Recommendations</CardTitle>
                            <CardDescription>Most frequently suggested crops</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onExport('crops')}
                            disabled={cropRecommendations.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {cropRecommendations.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={cropRecommendations} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="crop" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="frequency" fill="hsl(var(--success))" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                            No recommendations data available
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default AnalyticsCharts;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
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

const COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981'];

const AnalyticsCharts = ({
    problemsData,
    monthlyTrends,
    cropRecommendations,
    onExport
}: AnalyticsChartsProps) => {
    // Calculate total reports for percentage calculation
    const totalReports = problemsData.reduce((sum, item) => sum + item.count, 0);
    
    // Prepare data for pie chart
    const pieData = problemsData.map(item => ({
        name: item.name,
        value: item.count,
        percentage: totalReports > 0 ? Math.round((item.count / totalReports) * 100) : 0
    }));

    return (
        <>
            <div className="grid lg:grid-cols-2 gap-6">
                {/* NLP-Based Report Categorization - Enhanced Visualization */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>NLP-Based Report Categorization</CardTitle>
                        <CardDescription>AI-powered classification of farmer reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {problemsData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={(props: any) => `${Math.round(props.percent * 100)}%`}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} reports`, 'Count']} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h3 className="font-semibold mb-2">Category Insights</h3>
                                    <ul className="space-y-2">
                                        {problemsData.map((item, index) => (
                                            <li key={item.name} className="flex items-center">
                                                <div 
                                                    className="w-3 h-3 rounded-full mr-2" 
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                ></div>
                                                <span className="capitalize">{item.name}</span>
                                                <span className="ml-auto font-medium">{item.count} reports</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-4 pt-2 border-t">
                                        <p className="text-sm text-muted-foreground">
                                            Total Reports Analyzed: <span className="font-semibold">{totalReports}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Resolution Trends */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Resolution Trends</CardTitle>
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
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        name="New Reports"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="resolved"
                                        stroke="hsl(var(--success))"
                                        strokeWidth={2}
                                        name="Resolved"
                                    />
                                    <Legend />
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

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Problem Types Distribution */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Problem Type Distribution</CardTitle>
                        <CardDescription>Frequency of identified issues</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {problemsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={problemsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Reports">
                                        {problemsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Crop Recommendations */}
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
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={cropRecommendations} layout="horizontal">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="crop" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="frequency" fill="hsl(var(--success))" name="Recommendations" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No recommendations data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* NLP Insights Summary */}
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle>NLP Analysis Summary</CardTitle>
                    <CardDescription>Key insights from AI-powered report categorization</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-blue-800">Precision Agriculture</h3>
                            <p className="text-sm text-blue-600 mt-1">
                                Reports automatically categorized into 5 problem types using Gemini AI
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <h3 className="font-semibold text-green-800">Real-time Insights</h3>
                            <p className="text-sm text-green-600 mt-1">
                                Instant classification enables faster response to farming issues
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h3 className="font-semibold text-purple-800">Data-Driven Decisions</h3>
                            <p className="text-sm text-purple-600 mt-1">
                                Pattern recognition helps predict and prevent agricultural problems
                            </p>
                        </div>
                    </div>
                    
                    {problemsData.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-2">Dominant Issue Category</h4>
                            <div className="flex items-center">
                                <div 
                                    className="w-4 h-4 rounded-full mr-2" 
                                    style={{ backgroundColor: COLORS[0] }}
                                ></div>
                                <span className="font-semibold">
                                    {problemsData[0].name} ({problemsData[0].count} reports)
                                </span>
                                <span className="ml-2 text-sm text-muted-foreground">
                                    ({totalReports > 0 ? Math.round((problemsData[0].count / totalReports) * 100) : 0}% of all reports)
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default AnalyticsCharts;
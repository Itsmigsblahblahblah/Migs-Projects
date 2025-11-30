import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList } from "recharts";
import { Download } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import ReportDetailView from "./ReportDetailView";

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

interface Report {
    id: string;
    userId: string;
    username: string;
    reportText: string;
    problem: string;
    affectedCrop: string;
    recommendedCrops: string[];
    cropsToAvoid: string[];
    advice: string;
    hasImage: boolean;
    imageName: string | null;
    createdAt: any;
    status: string;
}

interface AnalyticsChartsProps {
    problemsData: ProblemData[];
    monthlyTrends: MonthlyTrend[];
    cropRecommendations: CropRecommendation[];
    onExport: (type: string) => void;
    reports?: Report[]; // Add optional reports prop
    onUpdateStatus?: (reportId: string, status: string) => void; // Add optional onUpdateStatus prop
}

const COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#10b981'];

const AnalyticsCharts = ({
    problemsData,
    monthlyTrends,
    cropRecommendations,
    onExport,
    reports = [], // Default to empty array if not provided
    onUpdateStatus // Add onUpdateStatus prop
}: AnalyticsChartsProps) => {
    // Calculate total reports for percentage calculation
    const totalReports = problemsData.reduce((sum, item) => sum + item.count, 0);

    // Prepare data for pie chart
    const pieData = problemsData.map(item => ({
        name: item.name,
        value: item.count,
        percentage: totalReports > 0 ? Math.round((item.count / totalReports) * 100) : 0
    }));

    // Prepare data for funnel chart (top 5 crops)
    const funnelData = cropRecommendations.slice(0, 5).map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length]
    }));

    // State for modal
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null); // Add state for selected report
    const [currentPage, setCurrentPage] = useState(1);
    const reportsPerPage = 10;

    // Filter reports by selected category
    const filteredReports = useMemo(() => {
        if (!selectedCategory || !reports) return [];
        return reports.filter(report =>
            report.problem.toLowerCase() === selectedCategory.toLowerCase()
        );
    }, [selectedCategory, reports]);

    // Pagination logic for filtered reports
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const currentReports = filteredReports.slice(startIndex, endIndex);

    // Reset to first page when category changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory]);

    // Handle bar click
    const handleBarClick = (data: any, index: number) => {
        const category = problemsData[index]?.name;
        if (category) {
            setSelectedCategory(category);
            setIsModalOpen(true);
        }
    };

    // Open report detail view
    const openReportDetail = (report: Report) => {
        setSelectedReport(report);
    };

    // Close report detail view
    const closeReportDetail = () => {
        setSelectedReport(null);
    };

    // Close category modal
    const closeCategoryModal = () => {
        setIsModalOpen(false);
        setSelectedCategory(null);
    };

    // Format date for display
    const formatDate = (date: any) => {
        if (!date) return "Unknown date";
        try {
            return date.toDate().toLocaleDateString();
        } catch (e) {
            return "Invalid date";
        }
    };

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
                                    <Bar
                                        dataKey="count"
                                        fill="hsl(var(--primary))"
                                        name="Reports"
                                        cursor="pointer"
                                    >
                                        {problemsData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                onClick={() => handleBarClick(entry, index)}
                                            />
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

                {/* Top Crop Recommendation Funnel Chart */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Top Crop Recommendation</CardTitle>
                        <CardDescription>Top 5 crops from Farmer Crop Management data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {funnelData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <FunnelChart margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                                            <Funnel
                                                data={funnelData}
                                                dataKey="frequency"
                                                nameKey="crop"
                                                isAnimationActive
                                            >
                                                <LabelList
                                                    position="inside"
                                                    fill="#fff"
                                                    stroke="none"
                                                    dataKey="frequency"
                                                    fontSize={14}
                                                    fontWeight="bold"
                                                />
                                                {funnelData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Funnel>
                                            <Tooltip formatter={(value) => [`${value} planted`, 'Quantity']} />
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="md:col-span-1 flex flex-col justify-center">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-lg">Crop Legend</h4>
                                        {funnelData.map((entry, index) => (
                                            <div key={entry.crop} className="flex items-start">
                                                <div
                                                    className="w-4 h-4 rounded-sm mr-2 mt-1 flex-shrink-0"
                                                    style={{ backgroundColor: entry.fill }}
                                                ></div>
                                                <span className="text-sm">{entry.crop}</span>
                                            </div>
                                        ))}
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

            {/* Modal for displaying reports by category */}
            {isModalOpen && selectedCategory && createPortal(
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-0 z-50">
                    <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        Reports for "{selectedCategory}" Category
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Showing {currentReports.length} of {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} categorized as "{selectedCategory}"
                                    </p>
                                </div>
                                <Button variant="ghost" onClick={closeCategoryModal} className="h-8 w-8 p-0">
                                    <span className="text-2xl">×</span>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            {filteredReports.length > 0 ? (
                                <div className="space-y-4">
                                    {currentReports.map((report) => (
                                        <div
                                            key={report.id}
                                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-medium">{report.username}</div>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDate(report.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="capitalize text-sm">
                                                    {report.status}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-3 gap-4 text-sm mb-3">
                                                <div>
                                                    <span className="text-muted-foreground">Problem: </span>
                                                    <span className="capitalize">{report.problem}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Affected Crop: </span>
                                                    <span className="capitalize">{report.affectedCrop}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Recommended: </span>
                                                    <span className="truncate max-w-[150px] inline-block align-top">
                                                        {report.recommendedCrops?.slice(0, 2).join(', ') || 'None'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {report.reportText}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openReportDetail(report)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination Controls - Match FarmersList design */}
                                    {totalPages > 0 && (
                                        <div className="border-t pt-1 px-4 mt-auto" style={{ paddingBottom: '0px' }}>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-muted-foreground" style={{ margin: '1px 0' }}>
                                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
                                                </div>
                                                <div className="flex space-x-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="h-8 px-3 text-sm"
                                                    >
                                                        Previous
                                                    </Button>

                                                    {/* Page Number Buttons */}
                                                    {(() => {
                                                        const pageButtons = [];
                                                        // Show more pages (7 instead of 5) to reduce ellipsis
                                                        let startPage = Math.max(1, currentPage - 3);
                                                        let endPage = Math.min(totalPages, startPage + 6);

                                                        // Adjust startPage if we're near the end
                                                        if (endPage - startPage < 6) {
                                                            startPage = Math.max(1, endPage - 6);
                                                        }

                                                        // First page button
                                                        if (startPage > 1) {
                                                            pageButtons.push(
                                                                <Button
                                                                    key={1}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(1)}
                                                                    className="h-8 w-8 p-0 text-sm"
                                                                >
                                                                    1
                                                                </Button>
                                                            );
                                                            // Only show ellipsis if there's a significant gap
                                                            if (startPage > 2) {
                                                                pageButtons.push(
                                                                    <span key="start-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                                );
                                                            }
                                                        }

                                                        // Page number buttons
                                                        for (let i = startPage; i <= endPage; i++) {
                                                            pageButtons.push(
                                                                <Button
                                                                    key={i}
                                                                    variant={currentPage === i ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(i)}
                                                                    className={`h-8 w-8 p-0 text-sm ${currentPage === i ? "bg-primary text-primary-foreground" : ""}`}
                                                                >
                                                                    {i}
                                                                </Button>
                                                            );
                                                        }

                                                        // Last page button
                                                        if (endPage < totalPages) {
                                                            // Only show ellipsis if there's a significant gap
                                                            if (endPage < totalPages - 1) {
                                                                pageButtons.push(
                                                                    <span key="end-ellipsis" className="px-1 py-0 text-muted-foreground text-sm">⋯</span>
                                                                );
                                                            }
                                                            pageButtons.push(
                                                                <Button
                                                                    key={totalPages}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(totalPages)}
                                                                    className="h-8 w-8 p-0 text-sm"
                                                                >
                                                                    {totalPages}
                                                                </Button>
                                                            );
                                                        }

                                                        return pageButtons;
                                                    })()}

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                        disabled={currentPage === totalPages}
                                                        className="h-8 px-3 text-sm"
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No reports found for the "{selectedCategory}" category.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>,
                document.body
            )}

            {/* Modal for displaying report details */}
            {selectedReport && createPortal(
                <ReportDetailView
                    report={selectedReport}
                    onClose={closeReportDetail}
                    onUpdateStatus={onUpdateStatus || ((reportId: string, status: string) => { })} // Provide a default empty function if not provided
                    isAdminView={true}
                />,
                document.body
            )}
        </>
    );
};

export default AnalyticsCharts;
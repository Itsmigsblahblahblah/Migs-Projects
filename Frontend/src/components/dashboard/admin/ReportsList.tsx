import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Eye, Download, FileText } from "lucide-react";

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

interface ReportsListProps {
    reports: Report[];
    onExport: () => void;
    onUpdateStatus: (reportId: string, status: string) => void;
}

const ReportsList = ({ reports, onExport, onUpdateStatus }: ReportsListProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Recent Farmer Reports</CardTitle>
                        <CardDescription>Latest submissions from farmers ({reports.length} total)</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        onClick={onExport}
                        disabled={reports.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export All
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {reports.length > 0 ? (
                    <div className="space-y-4">
                        {reports.slice(0, 10).map((report) => (
                            <div
                                key={report.id}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium">{report.username}</div>
                                        <Badge
                                            variant={report.status === 'resolved' ? 'default' : 'secondary'}
                                            className={report.status === 'resolved' ? 'bg-success text-success-foreground' : ''}
                                        >
                                            {report.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        {report.createdAt?.toDate().toLocaleDateString()}
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
                                        {report.recommendedCrops?.slice(0, 2).join(', ')}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {report.reportText}
                                    </p>
                                    <div className="flex gap-2">
                                        {report.status !== 'resolved' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onUpdateStatus(report.id, 'resolved')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Mark Resolved
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>No reports submitted yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ReportsList;
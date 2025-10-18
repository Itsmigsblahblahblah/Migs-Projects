import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, MapPin } from "lucide-react";

interface QuickStatsProps {
    monthlyReports: number;
    successRate: number;
    activeFields: number;
}

const QuickStats = ({ monthlyReports, successRate, activeFields }: QuickStatsProps) => {
    return (
        <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Reports This Month</p>
                        <p className="text-lg font-bold">{monthlyReports}</p>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-bold">{successRate}%</p>
                    </div>
                </div>
            </Card>

            <Card className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                        <MapPin className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Active Fields</p>
                        <p className="text-lg font-bold">{activeFields}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default QuickStats;
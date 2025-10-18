import StatsCard from "@/components/shared/StatsCard";
import { Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
    activeFarmers: number;
    pendingReports: number;
    resolvedThisMonth: number;
    successRate: number;
}

interface AdminStatsOverviewProps {
    stats: Stats;
}

const AdminStatsOverview = ({ stats }: AdminStatsOverviewProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
                title="Active Farmers"
                value={stats.activeFarmers}
                icon={<Users className="h-5 w-5 text-primary" />}
            />
            <StatsCard
                title="Pending Reports"
                value={stats.pendingReports}
                icon={<AlertTriangle className="h-5 w-5 text-warning" />}
            />
            <StatsCard
                title="Resolved This Month"
                value={stats.resolvedThisMonth}
                icon={<CheckCircle className="h-5 w-5 text-success" />}
            />
            <StatsCard
                title="Success Rate"
                value={`${stats.successRate}%`}
                icon={<TrendingUp className="h-5 w-5 text-accent" />}
            />
        </div>
    );
};

export default AdminStatsOverview;
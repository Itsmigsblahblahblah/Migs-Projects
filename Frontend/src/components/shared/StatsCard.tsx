import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    trend?: 'up' | 'down';
    trendValue?: string;
}

const StatsCard = ({ title, value, icon, description, trend, trendValue }: StatsCardProps) => {
    return (
        <Card className="shadow-soft">
            <CardContent className="p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                        {trend && trendValue && (
                            <div className={`flex items-center text-xs mt-1 ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                                {trend === 'up' ? '↑' : '↓'} {trendValue}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default StatsCard;
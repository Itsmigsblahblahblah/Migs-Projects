import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

interface SalesData {
    stage: string;
    puhunan: number;
    grossSales: number;
    netProfit: number;
}

interface SalesForecastCardProps {
    puhunan: number;
    estimatedSales: number;
    netProfit: number;
    salesForecastData: SalesData[];
}

// Chart configuration for ShadCN chart
const salesChartConfig = {
    puhunan: {
        label: "Investment",
        color: "hsl(var(--chart-1))",
    },
    grossSales: {
        label: "Est. Gross Sales",
        color: "hsl(var(--chart-2))",
    },
    netProfit: {
        label: "Est. Projected Net Profit",
        color: "hsl(var(--chart-3))",
    },
} satisfies ChartConfig;

const SalesForecastCard = ({
    puhunan,
    estimatedSales,
    netProfit,
    salesForecastData
}: SalesForecastCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sales Forecast
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-primary/5 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Your Investment</p>
                        <p className="text-2xl font-bold text-primary">₱{puhunan.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-success/5 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Est. Gross Sales</p>
                        <p className="text-2xl font-bold text-success">₱{estimatedSales.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
                        <p className="text-sm text-muted-foreground mb-1">Est. Projected Net Profit</p>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ₱{netProfit.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Sales Forecast Line Chart */}
                <div className="mt-6">
                    <h3 className="font-medium mb-4">Sales Projection Over Time</h3>
                    <div className="h-80 w-full">
                        <ChartContainer config={salesChartConfig} className="h-full w-full">
                            <LineChart
                                accessibilityLayer
                                data={salesForecastData}
                                margin={{
                                    left: 12,
                                    right: 12,
                                    top: 12,
                                    bottom: 12,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="stage"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => `₱${value.toLocaleString()}`}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value) => `₱${Number(value).toLocaleString()}`}
                                        labelFormatter={(value) => `Stage: ${value}`}
                                    />}
                                />
                                <Legend />
                                <Line
                                    dataKey="puhunan"
                                    type="monotone"
                                    stroke="var(--color-puhunan)"
                                    strokeWidth={2}
                                    fill="var(--color-puhunan)"
                                    dot={{ r: 4, fill: "var(--color-puhunan)", strokeWidth: 2, stroke: "var(--color-puhunan)" }}
                                    activeDot={{ r: 6, stroke: "var(--color-puhunan)", strokeWidth: 2 }}
                                    connectNulls={true}
                                />
                                <Line
                                    dataKey="grossSales"
                                    type="monotone"
                                    stroke="var(--color-grossSales)"
                                    strokeWidth={2}
                                    fill="var(--color-grossSales)"
                                    dot={{ r: 4, fill: "var(--color-grossSales)", strokeWidth: 2, stroke: "var(--color-grossSales)" }}
                                    activeDot={{ r: 6, stroke: "var(--color-grossSales)", strokeWidth: 2 }}
                                    connectNulls={true}
                                />
                                <Line
                                    dataKey="netProfit"
                                    type="monotone"
                                    stroke="var(--color-netProfit)"
                                    strokeWidth={2}
                                    fill="var(--color-netProfit)"
                                    dot={{ r: 4, fill: "var(--color-netProfit)", strokeWidth: 2, stroke: "var(--color-netProfit)" }}
                                    activeDot={{ r: 6, stroke: "var(--color-netProfit)", strokeWidth: 2 }}
                                    connectNulls={true}
                                />
                            </LineChart>
                        </ChartContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SalesForecastCard;
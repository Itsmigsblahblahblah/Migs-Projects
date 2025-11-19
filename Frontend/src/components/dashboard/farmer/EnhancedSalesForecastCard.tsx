import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Sprout } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { getCropInsights } from "@/services/cropDataService";

interface SalesData {
    stage: string;
    puhunan: number;
    grossSales: number;
    netProfit: number;
}

interface EnhancedSalesForecastCardProps {
    crop: any;
    marketData?: any; // Added optional marketData prop
}

// Chart configuration for ShadCN chart
const salesChartConfig = {
    puhunan: {
        label: "Investment",
        color: "hsl(var(--chart-1))",
    },
    grossSales: {
        label: "Gross Sales",
        color: "hsl(var(--chart-2))",
    },
    netProfit: {
        label: "Net Profit",
        color: "hsl(var(--chart-3))",
    },
} satisfies ChartConfig;

const EnhancedSalesForecastCard = ({ crop, marketData }: EnhancedSalesForecastCardProps) => {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [salesForecastData, setSalesForecastData] = useState<SalesData[]>([]);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setLoading(true);
                
                // Use provided marketData or fetch new insights
                let cropInsights;
                if (marketData) {
                    cropInsights = marketData;
                } else {
                    cropInsights = await getCropInsights(
                        crop.name,
                        crop.soilType,
                        crop.landArea,
                        crop.puhunan
                    );
                }
                
                setInsights(cropInsights);
                
                // Generate sales forecast data based on insights
                const forecastData: SalesData[] = [
                    {
                        stage: "Planting",
                        puhunan: crop.puhunan,
                        grossSales: 0,
                        netProfit: -crop.puhunan * 0.3 // 30% initial costs
                    },
                    {
                        stage: "Growth",
                        puhunan: crop.puhunan * 0.2, // Additional investment
                        grossSales: cropInsights.profit.potentialRevenue * 0.3,
                        netProfit: (cropInsights.profit.potentialRevenue * 0.3) - (crop.puhunan * 1.2)
                    },
                    {
                        stage: "Harvest",
                        puhunan: 0,
                        grossSales: cropInsights.profit.potentialRevenue,
                        netProfit: cropInsights.profit.netProfit
                    }
                ];
                
                setSalesForecastData(forecastData);
            } catch (error) {
                console.error("Error fetching crop insights:", error);
            } finally {
                setLoading(false);
            }
        };

        if (crop) {
            fetchInsights();
        }
    }, [crop, marketData]);

    if (loading) {
        return (
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Sales Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center h-32">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const netProfit = insights?.profit?.netProfit || 0;
    const potentialRevenue = insights?.profit?.potentialRevenue || 0;
    const estimatedYield = insights?.profit?.estimatedYield || 0;

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sales Forecast
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="p-4 bg-primary/5 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
                        <p className="text-2xl font-bold text-primary">₱{Number(crop.puhunan).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-success/5 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Potential Revenue</p>
                        <p className="text-2xl font-bold text-success">₱{potentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
                        <p className="text-sm text-muted-foreground mb-1">Projected Net Profit</p>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ₱{netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="p-4 bg-yellow-500/5 rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">Suggested Capital</p>
                        <p className="text-2xl font-bold text-yellow-500">
                            ₱{insights?.profit?.suggestedCapital?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}
                        </p>
                    </div>
                </div>

                {insights?.market && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-blue-500/5 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                <p className="font-medium">Market Insights</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Average Price</span>
                                    <span className="font-medium">₱{insights.market.averagePrice?.toFixed(2)}/kg</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Price Trend</span>
                                    <span className="font-medium capitalize">{insights.market.trend}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Est. Yield</span>
                                    <span className="font-medium">{estimatedYield?.toLocaleString()} kg</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-green-500/5 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Sprout className="h-4 w-4 text-green-500" />
                                <p className="font-medium">Profitability</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Profit Margin</span>
                                    <span className="font-medium">{insights.profit.profitMargin?.toFixed(1) || '0'}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Return on Investment</span>
                                    <span className="font-medium">
                                        {crop.puhunan > 0 ? ((netProfit / crop.puhunan) * 100).toFixed(1) : '0'}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Break-even Point</span>
                                    <span className="font-medium">
                                        {potentialRevenue > 0 ? ((crop.puhunan / potentialRevenue) * 100).toFixed(1) : '0'}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sales Forecast Line Chart */}
                <div className="mt-6">
                    <h3 className="font-medium mb-4">Financial Projection Over Time</h3>
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
                                    tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
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

                {/* Monthly Price Trend */}
                {insights?.market?.priceHistory && insights.market.priceHistory.length > 0 && (
                    <div className="mt-8">
                        <h3 className="font-medium mb-4">Price Trend Analysis</h3>
                        <div className="h-64 w-full">
                            <ChartContainer config={{ price: { label: "Price", color: "hsl(var(--chart-1))" } }} className="h-full w-full">
                                <BarChart
                                    accessibilityLayer
                                    data={insights.market.priceHistory.slice(0, 6).map((record: any) => ({
                                        month: `${record.month} ${record.year}`,
                                        price: record.price
                                    }))}
                                    margin={{
                                        left: 12,
                                        right: 12,
                                        top: 12,
                                        bottom: 12,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.slice(0, 3)}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => `₱${value}`}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent
                                            formatter={(value) => `₱${Number(value).toFixed(2)}`}
                                        />}
                                    />
                                    <Bar
                                        dataKey="price"
                                        fill="var(--color-price)"
                                        radius={4}
                                        barSize={32}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EnhancedSalesForecastCard;
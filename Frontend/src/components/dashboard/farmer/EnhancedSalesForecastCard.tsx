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
        label: "Est. Gross Sales",
        color: "hsl(var(--chart-2))",
    },
    netProfit: {
        label: "Est. Net Profit",
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
                {/* Simplified Financial Flow - Step by step explanation */}
                <div className="mb-8">
                    <h3 className="font-bold text-lg mb-4">How Your Money Works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                            <div className="text-primary font-bold text-xl mb-2">1</div>
                            <p className="text-sm text-muted-foreground mb-1">Your Investment</p>
                            <p className="text-xl font-bold text-primary">₱{Number(crop.puhunan).toLocaleString()}</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is the money you spend to plant and grow your {crop.name}</p>
                        </div>
                        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500">
                            <div className="text-yellow-500 font-bold text-xl mb-2">2</div>
                            <p className="text-sm text-muted-foreground mb-1">Suggested Capital</p>
                            <p className="text-xl font-bold text-yellow-500">₱{insights?.profit?.suggestedCapital?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 'N/A'}</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is the minimum money needed to successfully grow your {crop.name}</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500">
                            <div className="text-blue-500 font-bold text-xl mb-2">3</div>
                            <p className="text-sm text-muted-foreground mb-1">Expected Harvest</p>
                            <p className="text-xl font-bold text-blue-500">{estimatedYield?.toLocaleString()} kg</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is your est. expected harvest</p>
                        </div>
                        <div className={`p-4 rounded-lg border ${netProfit >= 0 ? 'bg-success/10 border-success' : 'bg-destructive/10 border-destructive'}`}>
                            <div className={`font-bold text-xl mb-2 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>4</div>
                            <p className="text-sm text-muted-foreground mb-1">Your Est. Profit</p>
                            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                ₱{netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs mt-2 text-muted-foreground">
                                {netProfit >= 0 
                                    ? "This is your est. expected profit after all expenses" 
                                    : "You might lose money. Consider adjusting your approach."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Simplified Explanation Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-blue-500/5 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            <p className="font-bold">What Affects Your Earnings</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm">Current Market Price</span>
                                <span className="font-medium">₱{insights?.market?.averagePrice?.toFixed(2)}/kg</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm">Est. Price Direction</span>
                                <span className="font-medium capitalize">{insights?.market?.trend || 'Stable'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-3">
                                <p>Higher prices mean more earnings. Watch for seasonal changes in prices.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-green-500/5 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                            <Sprout className="h-5 w-5 text-green-500" />
                            <p className="font-bold">Understanding Your Est. Profit</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm">Est. Profit Percentage</span>
                                <span className="font-medium">
                                    {crop.puhunan > 0 ? ((netProfit / crop.puhunan) * 100).toFixed(1) : '0'}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm">
                                    {netProfit >= 0 ? "Est. Profit Status" : "Est. Loss Status"}
                                </span>
                                <span className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {netProfit >= 0 ? "Profitable" : "Not Profitable"}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-3">
                                <p>
                                    {netProfit >= 0 
                                        ? "Good! Your crop is expected to make money." 
                                        : "Be careful. You might lose money with current conditions."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Simplified Visualization */}
                <div className="mt-6">
                    <h3 className="font-bold text-lg mb-4">Your Farming Journey</h3>
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
                                    tickFormatter={(value) => value}
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
                                    name="Money Spent"
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
                                    name="Money Earned"
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
                                    name="Actual Profit"
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
                    <div className="mt-4 text-sm text-muted-foreground">
                        <p>This chart shows how your money moves from spending to earning throughout the farming process.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EnhancedSalesForecastCard;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Sprout, Wallet, AlertTriangle } from "lucide-react";
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
import InfoTooltip from "@/components/ui/info-tooltip";

interface SalesData {
    stage: string;
    puhunan: number;
    grossSales: number;
    netProfit: number;
}

interface EnhancedSalesForecastCardProps {
    crop: any;
}

// Chart configuration for ShadCN chart
const salesChartConfig = {
    puhunan: {
        label: "Investment",
        color: "hsl(var(--destructive))", // Changed to red color
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

const EnhancedSalesForecastCard = ({ crop }: EnhancedSalesForecastCardProps) => {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [salesForecastData, setSalesForecastData] = useState<SalesData[]>([]);



    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setLoading(true);
                console.log('Fetching insights for crop:', crop?.name, 'with investment:', crop?.puhunan);
                console.log('Crop data:', crop);
                console.log('Crop landArea:', crop?.landArea, 'type:', typeof crop?.landArea);
                console.log('Crop soilType:', crop?.soilType);
                console.log('Crop puhunan:', crop?.puhunan, 'type:', typeof crop?.puhunan);

                // Always fetch fresh insights to ensure we have up-to-date calculations based on current investment
                console.log('Fetching new insights');
                const cropInsights = await getCropInsights(
                    crop.name,
                    crop.soilType,
                    crop.landArea,
                    crop.puhunan
                );

                console.log('Received cropInsights:', cropInsights);
                setInsights(cropInsights);

                // Calculate values for chart data
                const userInvestment = Number(crop.puhunan) || 0;
                const suggestedCapital = cropInsights?.profit?.suggestedCapital || 0;

                // Calculate estimated yield based on user's investment
                const estimatedYield = userInvestment === 0 ? 0 :
                    (cropInsights?.profit?.estimatedYield || 0) *
                    (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 ? 1 : (userInvestment / suggestedCapital));
                
                console.log('Calculating yield - userInvestment:', userInvestment, 'suggestedCapital:', suggestedCapital, 'cropInsights.estimatedYield:', cropInsights?.profit?.estimatedYield, 'calculated estimatedYield:', estimatedYield);

                // Calculate potential revenue using the same ML logic as Market Demand feature
                // Use predicted_price from demand prediction if available, otherwise fall back to averagePrice
                const marketPrice = (cropInsights?.profit?.averageMarketPrice !== undefined && cropInsights?.profit?.averageMarketPrice > 0)
                    ? cropInsights?.profit?.averageMarketPrice
                    : (cropInsights?.market?.averagePrice || 0);
                const potentialRevenue = estimatedYield * marketPrice;

                // Calculate net profit based on user's investment (same as summary)
                const chartNetProfit = userInvestment === 0 ? 0 : potentialRevenue - userInvestment;

                // Generate sales forecast data based on insights
                // Distribute investment across all stages based on typical farming expense patterns
                // Planting: 40% (seeds, initial soil prep, labor)
                // Growth: 45% (fertilizers, ongoing labor, pest control)
                // Harvest: 15% (harvesting, transport, post-harvest)
                const forecastData: SalesData[] = [
                    {
                        stage: "Planting",
                        puhunan: userInvestment * 0.4, // 40% of investment in planting stage
                        grossSales: 0,
                        netProfit: -userInvestment * 0.4 // Loss equal to planting investment
                    },
                    {
                        stage: "Growth",
                        puhunan: userInvestment * 0.45, // 45% of investment in growth stage
                        grossSales: potentialRevenue * 0.5, // 50% of potential revenue
                        netProfit: (potentialRevenue * 0.5) - (userInvestment * 0.85) // Revenue minus cumulative investment
                    },
                    {
                        stage: "Harvest",
                        puhunan: userInvestment * 0.15, // 15% of investment in harvest stage
                        grossSales: potentialRevenue, // 100% of potential revenue
                        netProfit: chartNetProfit // Final net profit
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
    }, [crop?.name, crop?.puhunan, crop?.landArea, crop?.soilType]);

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

    // Calculate values based on user's investment
    const userInvestment = Number(crop.puhunan) || 0;
    const suggestedCapital = insights?.profit?.suggestedCapital || 0;
    
    console.log('Render calculations - crop.puhunan:', crop.puhunan, 'userInvestment:', userInvestment, 'suggestedCapital:', suggestedCapital);
    console.log('Render calculations - insights.profit:', insights?.profit);

    // Calculate estimated yield based on user's investment
    // If investment is 0, yield should also be 0
    const estimatedYield = userInvestment === 0 ? 0 :
        (insights?.profit?.estimatedYield || 0) *
        (userInvestment >= suggestedCapital || Math.abs(userInvestment - suggestedCapital) < 0.01 ? 1 : (userInvestment / suggestedCapital));
    
    console.log('Render - userInvestment:', userInvestment, 'suggestedCapital:', suggestedCapital, 'insights.estimatedYield:', insights?.profit?.estimatedYield, 'calculated estimatedYield:', estimatedYield);

    // Calculate potential revenue
    const potentialRevenue = estimatedYield * (insights?.market?.averagePrice || 0);

    // Calculate net profit based on user's investment
    // If investment is 0, profit should also be 0
    const netProfit = userInvestment === 0 ? 0 : potentialRevenue - userInvestment;

    // Check if investment exceeds suggested capital (with tolerance for floating point precision)
    const investmentExceedsSuggested = userInvestment > suggestedCapital && Math.abs(userInvestment - suggestedCapital) >= 0.01;
    
    // Check if investment is less than suggested capital (with tolerance for floating point precision)
    const investmentBelowSuggested = userInvestment < suggestedCapital && Math.abs(userInvestment - suggestedCapital) >= 0.01;
    
    // Check if investment is effectively equal to suggested capital (within tolerance)
    const investmentEqualToSuggested = Math.abs(userInvestment - suggestedCapital) < 0.01;

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-lg border ${investmentBelowSuggested ? 'bg-destructive/10 border-destructive' : 'bg-primary/10 border-primary'}`}>
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-muted-foreground mb-1">Your Investment</p>
                                <InfoTooltip content={`The total amount you've invested in seeds, fertilizers, labor, and other expenses for this crop. This includes:\n• Seeds/Cost of planting material: ₱${(userInvestment * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}\n• Fertilizers and soil amendments: ₱${(userInvestment * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}\n• Labor costs: ₱${(userInvestment * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}\n• Pest control and other chemicals: ₱${(userInvestment * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}\n• Miscellaneous expenses: ₱${(userInvestment * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}\n\nInvestment Distribution by Stage:\n• Planting Stage: 40% (₱${(userInvestment * 0.4).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'})\n• Growth Stage: 45% (₱${(userInvestment * 0.45).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'})\n• Harvest Stage: 15% (₱${(userInvestment * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'})\n\nTotal Investment: ₱${userInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                            </div>
                            <p className={`text-xl font-bold ${investmentBelowSuggested ? 'text-destructive' : 'text-primary'}`}>₱{userInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            {/* Show warning if investment is less than suggested capital */}
                            {investmentBelowSuggested && (
                                <p className={`text-xs flex items-center gap-1 mt-2 ${investmentBelowSuggested ? 'text-destructive' : 'text-destructive-foreground'}`}>
                                    <AlertTriangle className="inline h-3 w-3 flex-shrink-0" />
                                    <span>Investment is below suggested capital by ₱{(suggestedCapital - userInvestment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </p>
                            )}
                            {/* Show warning if investment exceeds suggested capital */}
                            {investmentExceedsSuggested && (
                                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                                    <p className="text-xs text-yellow-800 flex flex-wrap items-center gap-1">
                                        <AlertTriangle className="inline h-3 w-3 flex-shrink-0" />
                                        <span>Investment exceeds suggested capital by ₱{(userInvestment - suggestedCapital).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </p>
                                </div>
                            )}
                            <p className="text-xs mt-2 text-muted-foreground">This is the money you spend to plant and grow your {crop.name}</p>
                        </div>

                        {/* Show Est. Suggested Capital only if user's investment is less than suggested capital */}
                        {(!investmentEqualToSuggested) && (
                            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm text-muted-foreground mb-1">Est. Suggested Capital</p>
                                    <InfoTooltip content={`The recommended minimum investment needed for optimal growth of your crop based on current market conditions. This includes:
• Seeds/Cost of planting material: ₱${suggestedCapital ? (suggestedCapital * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
• Fertilizers and soil amendments: ₱${suggestedCapital ? (suggestedCapital * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
• Labor costs: ₱${suggestedCapital ? (suggestedCapital * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
• Pest control and other chemicals: ₱${suggestedCapital ? (suggestedCapital * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
• Miscellaneous expenses: ₱${suggestedCapital ? (suggestedCapital * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}

Investment Distribution by Stage:
• Planting Stage: 40% (₱${suggestedCapital ? (suggestedCapital * 0.4).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'})
• Growth Stage: 45% (₱${suggestedCapital ? (suggestedCapital * 0.45).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'})
• Harvest Stage: 15% (₱${suggestedCapital ? (suggestedCapital * 0.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'})

Total Suggested Capital: ₱${Number(suggestedCapital || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                </div>
                                <p className="text-xl font-bold text-yellow-500">₱{Number(suggestedCapital || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                {investmentExceedsSuggested && (
                                    <div className="mt-2">
                                        <p className="text-xs text-yellow-700">
                                            Your investment is ₱{(userInvestment - suggestedCapital).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} higher than suggested
                                        </p>
                                    </div>
                                )}
                                {investmentBelowSuggested && (
                                    <div className="mt-2">
                                        <p className="text-xs text-destructive">
                                            You need ₱{(suggestedCapital - userInvestment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more for optimal results
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs mt-2 text-muted-foreground">This is the minimum money needed to successfully grow your {crop.name}</p>
                            </div>
                        )}

                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500">
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-muted-foreground mb-1">Est. Yield Harvest</p>
                                <InfoTooltip content={`The estimated yield you can expect from your crop based on land area, soil quality, and farming practices.

Factors affecting yield:
• Land area: ${crop.landArea} ha
• Soil type: ${crop.soilType}
• Investment level: ${investmentEqualToSuggested || investmentExceedsSuggested ? 'Optimal' : 'Below suggested'}

Estimated yield: ${estimatedYield.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg

${userInvestment === 0 ? 'Note: Harvest is 0 because investment is 0.' :
                                        investmentBelowSuggested ? `Note: Harvest is scaled down proportionally to your investment (${((userInvestment / suggestedCapital) * 100).toFixed(1)}% of optimal).` :
                                            'Note: Harvest is at optimal level based on your investment.'}`} />
                            </div>
                            <p className="text-xl font-bold text-green-500">{estimatedYield.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg</p>
                            <p className="text-xs mt-2 text-muted-foreground">This is your est. yield harvest</p>
                        </div>

                        <div className={`p-4 rounded-lg border ${netProfit >= 0 ? (investmentBelowSuggested ? 'bg-destructive/10 border-destructive' : 'bg-success/10 border-success') : 'bg-destructive/10 border-destructive'}`}>
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-muted-foreground mb-1">Your Est. Profit</p>
                                <InfoTooltip content={`Estimated Profit Calculation:
Gross Sales: ${(estimatedYield.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0')} kg × ₱${(Number(insights?.market?.averagePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}/kg = ₱${(estimatedYield * (insights?.market?.averagePrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}

Total Expenses: ₱${userInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}

Net Profit: ₱${(estimatedYield * (insights?.market?.averagePrice || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} - ₱${userInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} = ₱${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${userInvestment === 0 ? 'Note: Profit is 0 because investment is 0.' :
                                        investmentBelowSuggested ? `Note: Profit is scaled down proportionally to your investment (${((userInvestment / suggestedCapital) * 100).toFixed(1)}% of optimal).` :
                                            investmentExceedsSuggested ? `Note: Profit calculation assumes optimal yield despite excess investment.` :
                                                'Note: Profit is at optimal level based on your investment.'}`} />
                            </div>
                            <p className={`text-xl font-bold ${netProfit >= 0 ? (investmentBelowSuggested ? 'text-destructive' : 'text-success') : 'text-destructive'}`}>
                                ₱{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs mt-2 text-muted-foreground">
                                {netProfit >= 0
                                    ? (investmentBelowSuggested ? "Below suggested investment" : "This is your est. expected profit after all expenses")
                                    : "You might lose money. Consider adjusting your approach."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Simplified Explanation Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-green-500/5 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <p className="font-bold">What Affects Your Earnings</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-2">
                                <span className="text-sm">Current Market Price</span>
                                <span className="font-medium">₱{Number(insights?.market?.averagePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg</span>
                                <InfoTooltip content={`The current average price farmers are receiving for this crop type in the market`} />
                            </div>
                            <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-2">
                                <span className="text-sm">Est. Price Direction</span>
                                <span className="font-medium capitalize">{insights?.market?.trend || 'Stable'}</span>
                                <InfoTooltip content={`The predicted direction of market prices for your crop in the near future`} />
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
                            <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-2">
                                <span className="text-sm">
                                    {netProfit >= 0 ? "Est. Profit Percentage" : "Est. Loss Percentage"}
                                </span>
                                <span className="font-medium">
                                    {crop.puhunan > 0 ? ((netProfit / crop.puhunan) * 100).toFixed(1) : '0.0'}%
                                </span>
                                <InfoTooltip content={`Your estimated return on investment (ROI) percentage for this crop`} />
                            </div>
                            <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-2">
                                <span className="text-sm">
                                    {netProfit >= 0 ? "Est. Profit Status" : "Est. Loss Status"}
                                </span>
                                <span className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {netProfit >= 0 ? "Profitable" : "Not Profitable"}
                                </span>
                                <InfoTooltip content={`Whether your crop investment is expected to be profitable or result in a loss`} />
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

                {/* Improved Visualization */}
                <div className="mt-6">
                    <h3 className="font-bold text-lg mb-4">Your Farming Journey</h3>
                    <div className="h-64 sm:h-80 w-full">
                        <ChartContainer config={salesChartConfig} className="h-full w-full">
                            <BarChart
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
                                <Bar
                                    dataKey="puhunan"
                                    name="Money Spent"
                                    fill="var(--color-puhunan)"
                                    radius={4}
                                />
                                <Bar
                                    dataKey="grossSales"
                                    name="Money Earned"
                                    fill="var(--color-grossSales)"
                                    radius={4}
                                />
                                <Bar
                                    dataKey="netProfit"
                                    name="Actual Profit"
                                    fill="var(--color-netProfit)"
                                    radius={4}
                                />
                            </BarChart>
                        </ChartContainer>
                    </div>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-bold mb-2">Understanding This Chart</h4>
                        <ul className="text-sm space-y-1">
                            <li className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-[var(--destructive)] mt-1"></div>
                                <span><strong>Money Spent:</strong> Your expenses at each stage of farming</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-[var(--color-grossSales)] mt-1"></div>
                                <span><strong>Money Earned:</strong> Income from selling your harvest</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-[var(--color-netProfit)] mt-1"></div>
                                <span><strong>Actual Profit:</strong> What you keep after all expenses</span>
                            </li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-3">
                            This chart shows how your money moves from spending to earning throughout the farming process.
                            Investment is distributed as follows: 40% in Planting, 45% in Growth, and 15% in Harvest stages.
                            Positive bars (green) show profit, while negative bars (red) show losses.
                        </p>
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-xs text-yellow-500 font-medium break-words">Disclaimer: This forecast is based on historical data and market trends. Actual results may vary due to factors such as weather conditions, market fluctuations, and other unforeseen circumstances. This projection should be used as a guide only and not as a guarantee of income.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EnhancedSalesForecastCard;
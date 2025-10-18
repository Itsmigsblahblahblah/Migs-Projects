import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
}

interface ProductivityData {
    task: string;
    productivity: number;
}

interface MaintenanceChecklistCardProps {
    checklist: ChecklistItem[];
    productivityData: ProductivityData[];
    checklistProductivity: number;
    onToggleItem: (itemId: string) => void;
    selectedPrescribedCrop: any;
}

// Chart configuration for productivity chart
const productivityChartConfig = {
    productivity: {
        label: "Productivity (%)",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

const MaintenanceChecklistCard = ({
    checklist,
    productivityData,
    checklistProductivity,
    onToggleItem,
    selectedPrescribedCrop
}: MaintenanceChecklistCardProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {selectedPrescribedCrop ? `${selectedPrescribedCrop.name} Maintenance Checklist` : "Maintenance Checklist"}
                </CardTitle>
                <CardDescription>
                    Track your progress through the growing season
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                            <Checkbox
                                id={item.id}
                                checked={item.completed}
                                onCheckedChange={() => onToggleItem(item.id)}
                            />
                            <label
                                htmlFor={item.id}
                                className={`flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                            >
                                {item.title}
                                <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                            </label>
                        </div>
                    ))}
                </div>

                {/* Productivity Visualization based on checklist completion */}
                <div className="mt-8">
                    <h3 className="font-medium mb-4">Maintenance Progress</h3>
                    <div className="h-64 w-full">
                        <ChartContainer config={productivityChartConfig} className="h-full w-full">
                            <LineChart
                                accessibilityLayer
                                data={productivityData}
                                margin={{
                                    left: 12,
                                    right: 12,
                                    top: 12,
                                    bottom: 12,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="task"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value) => `${Number(value).toFixed(0)}%`}
                                        labelFormatter={(value) => `Task: ${value}`}
                                    />}
                                />
                                <Line
                                    dataKey="productivity"
                                    type="monotone"
                                    stroke="var(--color-productivity)"
                                    strokeWidth={2}
                                    fill="var(--color-productivity)"
                                    dot={{ r: 4, fill: "var(--color-productivity)", strokeWidth: 2, stroke: "var(--color-productivity)" }}
                                    activeDot={{ r: 6, stroke: "var(--color-productivity)", strokeWidth: 2 }}
                                    connectNulls={false}
                                />
                            </LineChart>
                        </ChartContainer>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm font-medium">{checklistProductivity}% Complete</p>
                        <p className="text-xs text-muted-foreground">
                            {checklist.filter(item => item.completed).length} of {checklist.length} tasks completed
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MaintenanceChecklistCard;
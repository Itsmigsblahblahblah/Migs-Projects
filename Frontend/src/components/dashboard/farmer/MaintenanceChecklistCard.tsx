import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle } from "lucide-react";
import { 
    RadialBarChart, 
    RadialBar, 
    Legend, 
    ResponsiveContainer 
} from "recharts";

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
    selectedPrescribedCrop?: any;
}

const MaintenanceChecklistCard = ({
    checklist,
    productivityData,
    checklistProductivity,
    onToggleItem
}: MaintenanceChecklistCardProps) => {
    // Prepare data for the radial bar chart
    const radialData = [
        { name: 'Completed', value: checklistProductivity, fill: '#10b981' }, // green
        { name: 'Remaining', value: 100 - checklistProductivity, fill: '#bbf7d0' } // light green
    ];

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Maintenance Checklist
                </CardTitle>
                <CardDescription>
                    Track your progress through the growing season
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div className="mt-4">
                    <h3 className="font-medium mb-4">Maintenance Progress</h3>
                    <div className="flex flex-col items-center">
                        <div className="w-48 h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart 
                                    innerRadius="60%" 
                                    outerRadius="90%" 
                                    barSize={12}
                                    data={radialData}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <RadialBar
                                        background
                                        dataKey="value"
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <p className="text-3xl font-bold text-green-600">{checklistProductivity}%</p>
                                <p className="text-sm text-muted-foreground">Complete</p>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                {checklist.filter(item => item.completed).length} of {checklist.length} tasks completed
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MaintenanceChecklistCard;
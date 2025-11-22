import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Edit3, Clock } from "lucide-react";
import { 
    RadialBarChart, 
    RadialBar, 
    Legend, 
    ResponsiveContainer 
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import InfoTooltip from "@/components/ui/info-tooltip";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    category: string;
    completedAt?: string; // Add timestamp for completion
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [pendingItemId, setPendingItemId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(true);

    // Prepare data for the radial bar chart
    const radialData = [
        { name: 'Completed', value: checklistProductivity, fill: '#10b981' }, // green
        { name: 'Remaining', value: 100 - checklistProductivity, fill: '#bbf7d0' } // light green
    ];

    // Format timestamp for display
    const formatTimestamp = (timestamp: string | undefined) => {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '';
        }
    };

    const handleToggleWithConfirmation = (itemId: string, currentlyCompleted: boolean) => {
        setPendingItemId(itemId);
        setIsCompleting(!currentlyCompleted);
        setIsDialogOpen(true);
    };

    const confirmToggle = () => {
        if (pendingItemId) {
            onToggleItem(pendingItemId);
        }
        setIsDialogOpen(false);
        setPendingItemId(null);
    };

    return (
        <>
            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Maintenance Checklist
                        <InfoTooltip content="A list of recommended tasks to ensure healthy crop growth and maximum yield" />
                    </CardTitle>
                    <CardDescription>
                        Track your progress through the growing season
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {checklist.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                <Checkbox
                                    id={item.id}
                                    checked={item.completed}
                                    onCheckedChange={() => handleToggleWithConfirmation(item.id, item.completed)}
                                />
                                <div className="flex-1">
                                    <label
                                        htmlFor={item.id}
                                        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
                                    >
                                        {item.title}
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                                    {item.completed && item.completedAt && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                Completed: {formatTimestamp(item.completedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <InfoTooltip content="Mark this task as completed when finished. This helps track your farming progress." />
                                {item.completed && (
                                    <button 
                                        onClick={() => handleToggleWithConfirmation(item.id, item.completed)}
                                        className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
                                        aria-label="Edit completion status"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                )}
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

            {/* Confirmation Dialog */}
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isCompleting ? "Mark Task as Completed?" : "Unmark Completed Task?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isCompleting 
                                ? "This will mark the task as completed and record the current time." 
                                : "This will unmark the task as completed and remove the completion time."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggle}>
                            {isCompleting ? "Complete Task" : "Unmark Task"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default MaintenanceChecklistCard;
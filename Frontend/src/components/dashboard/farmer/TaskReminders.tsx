import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Task {
    id: number;
    title: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
}

interface TaskRemindersProps {
    tasks: Task[];
}

const TaskReminders = ({ tasks }: TaskRemindersProps) => {
    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Upcoming Tasks
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                            <div>
                                <h4 className="font-medium">{task.title}</h4>
                                <p className="text-sm text-muted-foreground">{task.dueDate}</p>
                            </div>
                            <Badge
                                variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}
                            >
                                {task.priority}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default TaskReminders;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
    Eye,
    Plus,
    Edit,
    Leaf,
    Bell,
    Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
    onAddCrop: () => void;
    onUpdateCrop: () => void;
}

const QuickActions = ({ onAddCrop, onUpdateCrop }: QuickActionsProps) => {
    const navigate = useNavigate();

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/history')}>
                            <Eye className="h-5 w-5" />
                            <span>View Reports</span>
                        </Button>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={onAddCrop}>
                                <Plus className="h-5 w-5" />
                                <span>Add Crop</span>
                            </Button>
                        </DialogTrigger>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={onUpdateCrop}>
                            <Edit className="h-5 w-5" />
                            <span>Update Crop</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/crop-history')}>
                            <Leaf className="h-5 w-5" />
                            <span>Crop History</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/alerts')}>
                            <Bell className="h-5 w-5" />
                            <span>Alerts</span>
                        </Button>
                    </div>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default QuickActions;
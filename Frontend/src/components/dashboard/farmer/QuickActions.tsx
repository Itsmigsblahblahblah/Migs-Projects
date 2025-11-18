import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Eye,
    Plus,
    Edit,
    Leaf,
    Bell,
    Lightbulb,
    Sprout,
    History,
    TrendingUp,
    ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FarmerProfile {
    fullName: string;
    email: string;
    contactNumber: string;
    homeAddress: string;
    farmAddress: string;
    farmArea: string;
    photoURL: string;
    createdAt: string;
}

interface QuickActionsProps {
    onAddCrop: () => void;
    onUpdateCrop: () => void;
    farmerProfile?: FarmerProfile;
    weatherData?: any; // Add weather data prop
}

const QuickActions = ({ onAddCrop, onUpdateCrop, farmerProfile, weatherData }: QuickActionsProps) => {
    const navigate = useNavigate();

    const handlePrescribeCrop = () => {
        // Pass the weatherData and farmerProfile as state when navigating
        navigate('/prescribe-crop', { 
            state: { 
                weatherData: weatherData,
                farmerProfile: farmerProfile
            } 
        });
    };

    return (
        <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <Button 
                        variant="outline" 
                        className="h-20 flex flex-col gap-2"
                        onClick={handlePrescribeCrop}
                    >
                        <Sprout className="h-5 w-5" />
                        <span>Prescribe Crop</span>
                    </Button>
                    
                    {/* Combined Crop Management Button with Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-20 flex flex-col gap-2">
                                <Leaf className="h-5 w-5" />
                                <span className="flex items-center gap-1">
                                    Crop Management
                                    <ChevronDown className="h-4 w-4" />
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
                            <DropdownMenuItem onClick={onAddCrop} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Crop
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onUpdateCrop} className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Edit Crop
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/crop-history')} className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Crop History
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/alerts')}>
                        <Bell className="h-5 w-5" />
                        <span>Alerts</span>
                    </Button>
                    
                    {/* Market Demand Button */}
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/market-demand')}>
                        <TrendingUp className="h-5 w-5" />
                        <span>Market Demand</span>
                    </Button>
                    
                    {/* History button moved here as requested */}
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/history')}>
                        <History className="h-5 w-5" />
                        <span>History</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default QuickActions;
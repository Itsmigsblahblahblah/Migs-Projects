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
    TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    <Button 
                        variant="outline" 
                        className="h-20 flex flex-col gap-2"
                        onClick={handlePrescribeCrop}
                    >
                        <Sprout className="h-5 w-5" />
                        <span>Prescribe Crop</span>
                    </Button>
                    
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={onAddCrop}>
                        <Plus className="h-5 w-5" />
                        <span>Add Crop</span>
                    </Button>
                    
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
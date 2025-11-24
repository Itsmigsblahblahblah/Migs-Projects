import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAnnouncements } from "./UserAnnouncements";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";

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
    weatherData?: any;
    userId?: string; // Add userId prop
    unreadWeatherAlerts?: number; // Add unread weather alerts prop
}

const QuickActions = ({ onAddCrop, onUpdateCrop, farmerProfile, weatherData, userId, unreadWeatherAlerts = 0 }: QuickActionsProps) => {
    const navigate = useNavigate();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const { announcements, loading: announcementsLoading, unreadCount: unreadAnnouncements } = useAnnouncements();
    const { weatherAlerts, loading: weatherLoading } = useWeatherAlerts();

    // Fetch unread admin messages count
    useEffect(() => {
        if (!userId) return;

        const messagesQuery = query(
            collection(db, "adminMessages"),
            where("receiverId", "==", userId),
            where("read", "==", false)
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            setUnreadMessages(snapshot.size);
        });

        return () => unsubscribe();
    }, [userId]);

    // Calculate total unread alerts
    const totalUnreadAlerts = () => {
        let count = unreadMessages; // Admin messages
        
        // Add unread announcements
        if (!announcementsLoading) {
            count += unreadAnnouncements;
        }
        
        // Add unread weather alerts
        count += unreadWeatherAlerts;
        
        return count;
    };

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
                    
                    {/* Direct Crop Management Button - No Dropdown */}
                    <Button 
                        variant="outline" 
                        className="h-20 flex flex-col gap-2"
                        onClick={() => navigate('/crop-history')}
                    >
                        <Leaf className="h-5 w-5" />
                        <span>Crop Management</span>
                    </Button>
                    
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/alerts')}>
                        <div className="relative">
                            <Bell className="h-5 w-5" />
                            {totalUnreadAlerts() > 0 && (
                                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {totalUnreadAlerts()}
                                </Badge>
                            )}
                        </div>
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
                        <span>Report History</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default QuickActions;
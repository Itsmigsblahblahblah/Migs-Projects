import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sprout, User, LogOut, Bell, Sprout as SproutIcon, Leaf, TrendingUp, History } from "lucide-react";
import { clearMarketDemandCache } from "@/services/marketDemandMultiCacheService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { db } from "@/firebaseConfig";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { useAnnouncements } from "@/components/dashboard/farmer/UserAnnouncements";
import { useWeatherAlerts } from "@/hooks/custom/useWeatherAlerts";

// Function to create a stable ID for weather alerts (copied from Alerts.tsx)
const createWeatherAlertId = (description: string, date: string) => {
  // Create a simple hash-based ID to avoid issues with special characters in btoa
  let hash = 0;
  const str = description + date;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `weather-${Math.abs(hash)}`;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadWeatherAlerts, setUnreadWeatherAlerts] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [userReadStatus, setUserReadStatus] = useState<Record<string, any>>({});
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const { weatherAlerts, loading: weatherLoading } = useWeatherAlerts();

  // Get user info from localStorage
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');
  const userId = localStorage.getItem('userId');

  // Fetch user read status for both announcements and weather alerts
  useEffect(() => {
    if (!userId || userRole !== 'farmer') return;

    // Fetch announcement read status
    const announcementReadStatusQuery = query(
      collection(db, "userReadStatus", userId, "announcements")
    );

    const unsubscribeAnnouncements = onSnapshot(announcementReadStatusQuery, (snapshot) => {
      const readStatus: Record<string, any> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle backward compatibility with old boolean format
        if (typeof data === 'boolean') {
          readStatus[doc.id] = { read: data, timestamp: null };
        } else {
          readStatus[doc.id] = data;
        }
      });
      setUserReadStatus(prev => ({
        ...prev,
        ...readStatus
      }));
    });

    // Fetch weather alert read status
    const weatherReadStatusQuery = query(
      collection(db, "userReadStatus", userId, "weather")
    );

    const unsubscribeWeather = onSnapshot(weatherReadStatusQuery, (snapshot) => {
      const readStatus: Record<string, any> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle backward compatibility with old boolean format
        if (typeof data === 'boolean') {
          readStatus[doc.id] = { read: data, timestamp: null };
        } else {
          readStatus[doc.id] = data;
        }
      });

      // Merge with existing read status
      setUserReadStatus(prev => ({
        ...prev,
        ...readStatus
      }));
    });

    return () => {
      unsubscribeAnnouncements();
      unsubscribeWeather();
    };
  }, [userId, userRole]);

  // Fetch unread admin messages count
  useEffect(() => {
    if (!userId || userRole !== 'farmer') return;

    const messagesQuery = query(
      collection(db, "adminMessages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadMessages(snapshot.size);
    });

    return () => unsubscribe();
  }, [userId, userRole]);

  // Fetch unread announcements count
  useEffect(() => {
    if (!announcementsLoading && userRole === 'farmer') {
      // Filter out read and deleted announcements
      const unreadCount = announcements.filter((announcement: any) => {
        const status = userReadStatus[announcement.id];
        // If there's no read status, it's unread
        if (!status) return true;
        // If it's marked as deleted, don't count it
        if (status.deleted) return false;
        // If it's marked as read, don't count it
        return !status.read;
      }).length;
      setUnreadAnnouncements(unreadCount);
    }
  }, [announcements, announcementsLoading, userRole, userReadStatus]);

  // Fetch unread weather alerts count
  useEffect(() => {
    if (!weatherLoading && userRole === 'farmer' && weatherAlerts) {
      // Filter out read and deleted weather alerts
      const unreadCount = weatherAlerts.filter((alert: any) => {
        // Create a stable ID based on the alert description and date
        const weatherAlertId = createWeatherAlertId(alert.description, alert.date || '');
        const status = userReadStatus[weatherAlertId];
        // If there's no read status, it's unread
        if (!status) return true;
        // If it's marked as deleted, don't count it
        if (status.deleted) return false;
        // If it's marked as read, don't count it
        return !status.read;
      }).length;
      setUnreadWeatherAlerts(unreadCount);
    }
  }, [weatherAlerts, weatherLoading, userRole, userReadStatus]);

  // Calculate total unread alerts
  const totalUnreadAlerts = () => {
    if (userRole !== 'farmer') return 0;

    let count = unreadMessages; // Admin messages
    count += unreadAnnouncements; // Announcements
    count += unreadWeatherAlerts; // Weather alerts

    return count;
  };

  const handleLogout = () => {
    // Remove all authentication data
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');

    // Clear market demand cache
    clearMarketDemandCache();

    // Close dialog
    setIsLogoutDialogOpen(false);

    // Navigate to login
    navigate('/login');
  };

  // Determine if a navigation item is active based on current location
  const isActive = (path: string) => {
    if (path === '/farmer' || path === '/admin') {
      return location.pathname === path;
    }
    // For paths like '/history' or '/admin/rules', check if the current path starts with the item path
    return location.pathname.startsWith(path);
  };

  // Don't render layout if user is not authenticated
  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-earth flex flex-col">
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. You can log back in anytime to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Yes, Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - now acts as Dashboard link */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(userRole === 'farmer' ? '/farmer' : '/admin')}
            >
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">Harvestify</h1>
              </div>
            </div>

            {/* Navigation - only for farmer role */}
            {userRole === 'farmer' && (
              <nav className="hidden md:flex items-center space-x-4">
                <button
                  onClick={() => navigate('/prescribe-crop')}
                  className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${isActive('/prescribe-crop') ? 'text-yellow-500' : ''}`}
                >
                  <span className="relative z-10">Prescribe</span>
                  <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${isActive('/prescribe-crop') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </button>

                <button
                  onClick={() => navigate('/crop-history')}
                  className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${isActive('/crop-history') ? 'text-yellow-500' : ''}`}
                >
                  <span className="relative z-10">Manage Crop</span>
                  <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${isActive('/crop-history') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </button>

                <button
                  onClick={() => navigate('/market-demand')}
                  className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${isActive('/market-demand') ? 'text-yellow-500' : ''}`}
                >
                  <span className="relative z-10">Market Demand</span>
                  <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${isActive('/market-demand') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </button>

                <button
                  onClick={() => navigate('/history')}
                  className={`group text-foreground hover:text-accent-foreground px-3 py-2 text-sm font-medium transition-all duration-300 relative ${isActive('/history') ? 'text-yellow-500' : ''}`}
                >
                  <span className="relative z-10">Reports</span>
                  <span className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-yellow-500 transition-all duration-300 ${isActive('/history') ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </button>
              </nav>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Alerts Icon - only for farmer role */}
              {userRole === 'farmer' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/alerts')}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {totalUnreadAlerts() > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                      {totalUnreadAlerts()}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{username}</span>
                      <span className="text-xs text-muted-foreground">
                        {userRole === 'farmer' ? 'Farmer' : 'Administrator'}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card/80 backdrop-blur-sm border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sprout className="h-4 w-4 text-primary" />
              <span>© 2025 Majayjay Farm Resource Management System</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Empowering farmers with smart technology
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
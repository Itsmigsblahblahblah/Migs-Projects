import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sprout, User, LogOut } from "lucide-react";
import { clearMarketDemandCache } from "@/services/marketDemandMultiCacheService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Get user info from localStorage
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');

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

  const navigationItems = [
    // Dashboard button removed as requested
    // History button removed as requested
    // Rules Manager button removed as requested
  ];

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

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className={isActive(item.path)
                    ? "bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90 hover:text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{username}</span>
                <span className="text-muted-foreground">
                  ({userRole === 'farmer' ? 'Farmer' : 'Administrator'})
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogoutDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
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
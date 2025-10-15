import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sprout,
  LogOut,
  User,
  History,
  Settings,
  Home
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Check authentication status and listen for changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const role = localStorage.getItem('userRole');
      const name = localStorage.getItem('username');
      
      setUserRole(role);
      setUsername(name);
      
      // If user is not authenticated, redirect to login
      if (!role) {
        navigate('/login');
      }
    };
    
    checkAuthStatus();
    
    // Listen for storage changes (multi-tab logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userRole' && !e.newValue) {
        // User logged out in another tab
        navigate('/login');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Set up interval to periodically check auth status
    const interval = setInterval(checkAuthStatus, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [navigate]);

  const handleLogout = () => {
    // Remove all authentication data
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    
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
    {
      label: 'Dashboard',
      icon: Home,
      path: userRole === 'farmer' ? '/farmer' : '/admin',
      onClick: () => navigate(userRole === 'farmer' ? '/farmer' : '/admin'),
    },
    {
      label: 'History',
      icon: History,
      path: '/history',
      onClick: () => navigate('/history'),
    },
    ...(userRole === 'admin' ? [{
      label: 'Rules Manager',
      icon: Settings,
      path: '/admin/rules',
      onClick: () => navigate('/admin/rules'),
    }] : [])
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
      <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">Majayjay Farm</h1>
                <p className="text-xs text-muted-foreground">Resource Management</p>
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

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-card border-b border-border p-4">
        <div className="flex gap-2 overflow-x-auto">
          {navigationItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="sm"
              onClick={item.onClick}
              className={`flex-shrink-0 ${isActive(item.path)
                ? "bg-gradient-primary text-primary-foreground hover:bg-gradient-primary/90"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>
      </nav>

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
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Sprout, 
  LogOut, 
  User, 
  History,
  Settings,
  Home
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    navigate('/');
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      icon: Home,
      onClick: () => navigate(userRole === 'farmer' ? '/farmer' : '/admin'),
      active: true
    },
    {
      label: 'History',
      icon: History,
      onClick: () => navigate('/history'),
    },
    ...(userRole === 'admin' ? [{
      label: 'Rules Manager',
      icon: Settings,
      onClick: () => navigate('/admin/rules'),
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-earth">
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
                  variant={item.active ? "default" : "ghost"}
                  size="sm"
                  onClick={item.onClick}
                  className={item.active ? "bg-gradient-primary" : ""}
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
                onClick={handleLogout}
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
              variant={item.active ? "default" : "ghost"}
              size="sm"
              onClick={item.onClick}
              className={`flex-shrink-0 ${item.active ? "bg-gradient-primary" : ""}`}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card/80 backdrop-blur-sm border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sprout className="h-4 w-4 text-primary" />
              <span>© 2024 Majayjay Farm Resource Management System</span>
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
import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { getAuthWhenReady } from '@/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'farmer' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    // First check localStorage for quick auth check
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (role && userId) {
      // User is authenticated based on localStorage
      setIsAuthenticated(true);
      setUserRole(role);
      setIsAuthReady(true);
      return;
    }
    
    // If no localStorage, wait for Firebase auth
    (async () => {
      try {
        const auth = await getAuthWhenReady();
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setIsAuthenticated(true);
            // Get role from Firestore or localStorage
            const role = localStorage.getItem('userRole');
            setUserRole(role);
          } else {
            setIsAuthenticated(false);
          }
          setIsAuthReady(true);
        });
      } catch (error) {
        console.warn('Firebase auth not available, relying on localStorage');
        setIsAuthReady(true);
      }
    })();
  }, []);
  
  // Show loading state while auth is being checked
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If specific role is required and user doesn't have it, redirect to appropriate dashboard
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/farmer'} replace />;
  }
  
  // User is authenticated and has the required role, render children
  return <>{children}</>;
};

export default ProtectedRoute;
import { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

const PublicOnlyRoute = ({ children }: PublicOnlyRouteProps) => {
  const location = useLocation();
  
  // Check if user is authenticated
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const isAuthenticated = !!userRole && !!userId;
  
  // If user is authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    // Redirect to the appropriate dashboard based on user role
    const redirectPath = userRole === 'admin' ? '/admin' : '/farmer';
    return <Navigate to={redirectPath} replace />;
  }
  
  // User is not authenticated, render children (login page)
  return <>{children}</>;
};

export default PublicOnlyRoute;
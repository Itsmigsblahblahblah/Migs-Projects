import { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'farmer' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation();
  
  // Check if user is authenticated
  const userRole = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  const isAuthenticated = !!userRole && !!userId;
  
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
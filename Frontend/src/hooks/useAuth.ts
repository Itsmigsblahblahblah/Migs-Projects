import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  username: string | null;
}

export const useAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    username: null
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status on mount and when localStorage changes
    const checkAuthStatus = () => {
      const userRole = localStorage.getItem('userRole');
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      
      const isAuthenticated = !!userRole && !!userId;
      
      setAuthState({
        isAuthenticated,
        userRole,
        userId,
        username
      });
      
      // Handle multi-tab session management
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'userRole' || e.key === 'userId') {
          // If userRole or userId is removed, it means user logged out
          if (!e.newValue) {
            // Redirect to login in all tabs
            navigate('/login');
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    };
    
    checkAuthStatus();
    
    // Set up interval to periodically check auth status
    const interval = setInterval(checkAuthStatus, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [navigate]);

  return authState;
};
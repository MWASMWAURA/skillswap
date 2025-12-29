import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, User, ApiResponse } from './api';
import { sessionService } from '../services/sessionService';
import { RoleProvider, useRole, UserRole } from '../components/auth/RoleBasedAccess';

interface AuthenticatedUser extends User {
  role: 'user' | 'admin' | 'moderator';
  permissions: string[];
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
  setMfaRequired: (required: boolean, token?: string) => void;
  verifyMfa: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');
      
      if (token && storedUser) {
        try {
          // First try to use stored user data
          const userData = JSON.parse(storedUser);
          const authenticatedUser: AuthenticatedUser = {
            ...userData,
            role: userData.role || 'user',
            permissions: userData.permissions || ['profile:read', 'profile:update']
          };
          setUser(authenticatedUser);
          localStorage.setItem('authUser', storedUser);
          
          // Verify token is still valid
          const result = await apiClient.getMe();
          if (!result.data) {
            // Token is invalid, clear everything
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setUser(null);
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setMfaRequired(false);

    try {
      const result = await apiClient.login(email, password);
      
      if (result.data && result.data.user && ((result.data as any).accessToken || (result.data as any).token)) {
        // Check if MFA is required
        if ((result.data as any).mfaRequired) {
          setMfaRequired(true);
          setMfaToken((result.data as any).mfaToken);
          setLoading(false);
          return false; // Don't complete login yet
        }
        
        // Handle both response formats (accessToken from backend, token from other sources)
        const token = (result.data as any).accessToken || (result.data as any).token;
        localStorage.setItem('authToken', token);
        
        // Store refresh token if available
        if ((result.data as any).refreshToken) {
          localStorage.setItem('refreshToken', (result.data as any).refreshToken);
        }
        
        // Convert User to AuthenticatedUser
        const authenticatedUser: AuthenticatedUser = {
          ...result.data.user,
          role: 'user',
          permissions: ['profile:read', 'profile:update']
        };
        setUser(authenticatedUser);
        
        // Start session monitoring
        sessionService.startSessionMonitoring();
        
        setLoading(false);
        return true;
      } else {
        setError(result.error || 'Login failed');
        setLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.register({ name, email, password });
      
      if (result.data && result.data.user && ((result.data as any).accessToken || (result.data as any).token)) {
        // Handle both response formats (accessToken from backend, token from other sources)
        const token = (result.data as any).accessToken || (result.data as any).token;
        localStorage.setItem('authToken', token);
        
        // Store refresh token if available
        if ((result.data as any).refreshToken) {
          localStorage.setItem('refreshToken', (result.data as any).refreshToken);
        }
        
        // Convert User to AuthenticatedUser
        const authenticatedUser: AuthenticatedUser = {
          ...result.data.user,
          role: 'user',
          permissions: ['profile:read', 'profile:update']
        };
        setUser(authenticatedUser);
        setLoading(false);
        return true;
      } else {
        setError(result.error || 'Registration failed');
        setLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Stop session monitoring
      sessionService.stopSessionMonitoring();
      
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setError(null);
      setMfaRequired(false);
      setMfaToken(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const verifyMfa = async (token: string): Promise<boolean> => {
    if (!mfaToken) return false;
    
    try {
      // This would call the MFA verification API
      // For now, simulate success
      setMfaRequired(false);
      setMfaToken(null);
      return true;
    } catch (error) {
      setError('MFA verification failed');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    mfaRequired,
    mfaToken,
    setMfaRequired,
    verifyMfa,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!user) {
      window.location.href = '/login';
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
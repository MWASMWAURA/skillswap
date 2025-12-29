import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shield, User, Settings, Lock } from 'lucide-react';

export type UserRole = 'user' | 'admin' | 'moderator';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

interface RoleContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccess: (resource: string, action: string) => boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

interface RoleProviderProps {
  children: React.ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  };

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  };

  const canAccess = (resource: string, action: string): boolean => {
    if (!user) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Define role-based permissions
    const permissions = {
      user: [
        'profile:read',
        'profile:update',
        'skills:create',
        'skills:read',
        'skills:update:own',
        'exchanges:create',
        'exchanges:read',
        'exchanges:update:own',
        'messages:create',
        'messages:read',
      ],
      moderator: [
        'profile:read',
        'profile:update',
        'skills:create',
        'skills:read',
        'skills:update:any',
        'skills:delete',
        'exchanges:create',
        'exchanges:read',
        'exchanges:update:any',
        'exchanges:delete',
        'messages:create',
        'messages:read',
        'messages:moderate',
        'users:moderate',
        'reports:read',
        'reports:update',
      ],
      admin: [
        'profile:read',
        'profile:update',
        'profile:delete',
        'skills:create',
        'skills:read',
        'skills:update:any',
        'skills:delete',
        'exchanges:create',
        'exchanges:read',
        'exchanges:update:any',
        'exchanges:delete',
        'messages:create',
        'messages:read',
        'messages:moderate',
        'messages:delete',
        'users:read',
        'users:update',
        'users:delete',
        'users:ban',
        'users:role',
        'reports:read',
        'reports:update',
        'reports:delete',
        'system:settings',
        'system:logs',
        'system:backup',
      ],
    };

    const requiredPermission = `${resource}:${action}`;
    const permissionWithScope = `${resource}:${action}:any`;
    
    return (
      permissions[user.role]?.includes(requiredPermission) ||
      permissions[user.role]?.includes(permissionWithScope) ||
      hasPermission(requiredPermission)
    );
  };

  const value: RoleContextType = {
    user,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
    canAccess,
    login,
    logout,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

// Higher-order component for role-based access
export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[] = []
) {
  return function WithRoleComponent(props: P) {
    const { user, hasRole } = useRole();
    
    if (!user) {
      return <div className="text-center py-8">Please log in to access this page.</div>;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.some(role => hasRole(role))) {
      return (
        <div className="text-center py-8">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Hook for permission-based rendering
export function usePermission(permission: string) {
  const { hasPermission } = useRole();
  return hasPermission(permission);
}

// Hook for role-based rendering
export function useRoleCheck(allowedRoles: UserRole[]) {
  const { hasRole } = useRole();
  return allowedRoles.some(role => hasRole(role));
}

// Component for permission-based rendering
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useRole();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Component for role-based rendering
interface RoleGateProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { hasRole } = useRole();
  
  if (!roles.some(role => hasRole(role))) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Role indicator component
export function RoleIndicator() {
  const { user } = useRole();
  
  if (!user) return null;
  
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Settings className="w-4 h-4" />;
      case 'moderator':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };
  
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
      {getRoleIcon(user.role)}
      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
    </div>
  );
}
"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthService from './auth-service';
import { User } from '@repo/types';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/oauth/callback',
];

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
];

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  requiredPermissions = [],
  fallback 
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const isAuthenticated = AuthService.isAuthenticated();
      const user = AuthService.getCurrentUser();
      
      if (isAuthenticated && user) {
        // Verify token is still valid by making a test request
        try {
          const currentUser = await AuthService.getCurrentUser();
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user: currentUser,
          });
        } catch (error) {
          // Token is invalid, clear auth state
          AuthService.logout();
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
        }
      } else {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  };

  // Show loading spinner while checking auth
  if (authState.isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if current route requires authentication
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (requireAuth && !authState.isAuthenticated && isProtectedRoute) {
    const returnUrl = encodeURIComponent(pathname);
    router.replace(`/login?returnUrl=${returnUrl}`);
    return null;
  }

  // Redirect authenticated users from auth pages
  if (authState.isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    router.replace('/dashboard');
    return null;
  }

  // Check role requirements
  if (authState.isAuthenticated && requiredRole && authState.user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Access Denied</div>
          <p className="text-gray-400">You don't have the required role to access this page.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (authState.isAuthenticated && requiredPermissions.length > 0) {
    const userPermissions = authState.user?.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">Insufficient Permissions</div>
            <p className="text-gray-400">You don't have the required permissions to access this page.</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook to use auth state in components
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated = AuthService.isAuthenticated();
      const user = AuthService.getCurrentUser();
      
      setAuthState({
        isLoading: false,
        isAuthenticated,
        user,
      });
    };

    checkAuth();

    // Listen for auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clarifaior_access_token' || e.key === 'clarifaior_user') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const authResponse = await AuthService.login(credentials);
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        user: authResponse.user,
      });
      return authResponse;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      await AuthService.logout();
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    } catch (error) {
      // Even if logout fails, clear local state
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const authResponse = await AuthService.register(userData);
      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        user: authResponse.user,
      });
      return authResponse;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    register,
    hasRole: (role: string) => authState.user?.role === role,
    hasPermission: (permission: string) => 
      authState.user?.permissions?.includes(permission) || false,
  };
}

// Higher-order component for route protection
export function withAuth<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options?: {
    requireAuth?: boolean;
    requiredRole?: string;
    requiredPermissions?: string[];
  }
) {
  return function AuthenticatedComponent(props: T) {
    return (
      <AuthGuard
        requireAuth={options?.requireAuth}
        requiredRole={options?.requiredRole}
        requiredPermissions={options?.requiredPermissions}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}

export default AuthGuard;

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Securing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If a specific role list is required, the user must hold one of them
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role) {
      // Role not resolved. Only treat as parent if metadata explicitly says so;
      // otherwise send to login (prevents wrong-dashboard flip on reload).
      const metaRole = (user.user_metadata as any)?.role;
      if (metaRole === 'parent') {
        return <Navigate to="/parent/dashboard" replace />;
      }
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getDashboardPath(role)} replace />;
    }
  }

  return <>{children}</>;
}

export function getDashboardPath(role: AppRole | null): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/auth/login';
  }
}

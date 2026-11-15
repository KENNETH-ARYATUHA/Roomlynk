
// The single place that enforces "who is allowed to see this page."
// Three roles, three very different dashboards â€” pass `allowedRoles` and it
// redirects anyone who doesn't match.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Don't redirect while still checking localStorage â€” that would bounce a
  // logged-in user to /login for a split second on every page refresh.
  if (isLoading) return <div className="page-loading">Loadingâ€¦</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
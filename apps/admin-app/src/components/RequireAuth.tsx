import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { authenticated, unconfigured, loading } = useAuth();

  if (loading) {
    return (
      <div className="mapui:flex mapui:items-center mapui:justify-center mapui:min-h-screen">
        <div className="mapui:text-slate-500">Checking authentication...</div>
      </div>
    );
  }

  // Auth not configured on server — allow through in dev mode
  if (unconfigured) {
    return <>{children}</>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

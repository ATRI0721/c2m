import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex gap-2">
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft" style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft" style={{ animationDelay: '150ms' }} />
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

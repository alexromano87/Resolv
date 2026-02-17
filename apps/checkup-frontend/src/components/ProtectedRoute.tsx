import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'superadmin' | 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
}

export function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/checkup/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/checkup/cambio-password" replace />;
  }

  if (requiredRole && user.ruolo !== requiredRole) {
    return <Navigate to="/checkup/" replace />;
  }

  return <>{children}</>;
}

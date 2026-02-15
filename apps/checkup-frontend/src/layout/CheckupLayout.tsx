import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ClipboardList,
  Users,
  LayoutDashboard,
  LogOut,
  FileText,
} from 'lucide-react';

export function CheckupLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/checkup/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-700 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary-700" />
              <span className="text-lg font-semibold text-primary-900">RESOLV Checkup</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {user?.nome} {user?.cognome}
                {user?.azienda && (
                  <span className="text-gray-400 ml-1">({user.azienda})</span>
                )}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                {user?.ruolo}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-danger-600 rounded-lg transition-colors"
                title="Esci"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar navigation */}
          <nav className="w-56 flex-shrink-0">
            <div className="space-y-1">
              <NavLink to="/checkup/" end className={navLinkClass}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavLink>

              {user?.ruolo === 'admin_studio' && (
                <>
                  <NavLink to="/checkup/utenti" className={navLinkClass}>
                    <Users className="h-4 w-4" />
                    Gestione Utenti
                  </NavLink>
                  <NavLink to="/checkup/gestione-questionari" className={navLinkClass}>
                    <ClipboardList className="h-4 w-4" />
                    Questionari
                  </NavLink>
                </>
              )}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

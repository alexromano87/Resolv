import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronLeft, ChevronRight, X, ArrowLeft, LayoutDashboard, FileText, Shield, Settings, Search, Ticket, Bell, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { preassessmentApi, threadsUnreadApi } from '../api/preassessment';

interface CheckupAppLayoutProps {
  children: ReactNode;
}

export function CheckupAppLayout({ children }: CheckupAppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  // Unsaved changes are handled by the Settings page custom modal.
  const [unread, setUnread] = useState<{ tickets: number; alerts: number }>({ tickets: 0, alerts: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initials = useMemo(() => {
    const name = `${user?.nome || ''} ${user?.cognome || ''}`.trim();
    if (!name) return 'CU';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }, [user]);

  const clientCompanyName = useMemo(() => {
    return (
      user?.client?.ragioneSociale ||
      user?.azienda ||
      user?.clientNome ||
      user?.client?.nome ||
      ''
    );
  }, [user]);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/checkup/dashboard-studio')) return 'Dashboard';
    if (location.pathname.startsWith('/checkup/ricerca-clienti')) return 'Ricerca clienti';
    if (location.pathname.startsWith('/checkup/amministrazione')) return 'Amministrazione';
    if (location.pathname.startsWith('/checkup/utenti')) return 'Amministrazione';
    if (location.pathname.startsWith('/checkup/help')) return 'Help';
    if (location.pathname.startsWith('/checkup/impostazioni')) return 'Impostazioni';
    if (location.pathname.startsWith('/checkup/tickets')) return 'Ticket';
    if (location.pathname.startsWith('/checkup/alerts')) return 'Alert';
    if (location.pathname.startsWith('/checkup/audit')) return 'Log attività';
    if (location.pathname.startsWith('/checkup/clienti')) {
      if (location.pathname.endsWith('/tickets')) return 'Ticket';
      if (location.pathname.endsWith('/alerts')) return 'Alert';
      return 'Pre-Assessment';
    }
    return 'Pre-Assessment';
  }, [location.pathname, user?.ruolo]);
  const isStaff = user ? user.ruolo !== 'cliente' : false;
  const dashboardPath = user?.ruolo === 'admin_studio' ? '/checkup/dashboard-studio' : '/checkup';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ── Unread badge polling (cliente only) ────────────────────────────────────
  useEffect(() => {
    if (!user || user.ruolo !== 'cliente') {
      setUnread({ tickets: 0, alerts: 0 });
      return;
    }
    const fetchUnread = async () => {
      try {
        const pre = await preassessmentApi.get();
        const counts = await threadsUnreadApi.getCounts(pre.id);
        setUnread(counts);
      } catch {
        // silently ignore
      }
    };
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.ruolo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    navigate('/checkup/login');
  };

  const handleLogoutConfirm = async () => {
    const ok = await confirm({
      title: 'Conferma logout',
      message: 'Vuoi uscire dall’applicazione?',
      confirmText: 'Esci',
      variant: 'warning',
    });
    if (!ok) return;
    await handleLogout();
  };

  return (
    <div className="min-h-screen overflow-visible bg-transparent text-slate-900 transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_55%),radial-gradient(circle_at_18%_12%,rgba(79,70,229,0.28),transparent_50%),radial-gradient(circle_at_92%_6%,rgba(242,179,107,0.2),transparent_44%),linear-gradient(135deg,#ebe8ff,#dfe6ff)] transition-colors duration-300" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,rgba(10,16,32,0.06),transparent_45%)]" />

      <div className="relative flex h-screen overflow-visible p-4 gap-4">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 lg:z-10
            flex h-full flex-col
            rounded-none lg:rounded-2xl
            border-r lg:border border-blue-900/20
            bg-[#0f172a] bg-none
            shadow-[0_20px_60px_rgba(15,23,42,0.2)]
            transform
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'w-20' : 'w-80'}
            lg:m-0 m-4 mt-4 mb-4
          `}
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="flex items-center justify-between border-b border-blue-800/30 px-6 py-5 flex-shrink-0">
            <div className={`overflow-hidden transition-all duration-400 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <img src="/logo_resolv.png" alt="RESOLV" className="h-14 w-auto" />
              <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.24em] text-white/90 shadow-sm">
                PRE-ASSESSMENT
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-slate-400 hover:text-white transition-all duration-200"
                aria-label={sidebarCollapsed ? 'Espandi menu' : 'Riduci menu'}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white transition-colors"
                aria-label="Chiudi menu"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-6 px-4 py-5 overflow-y-auto overflow-x-hidden">
            <div className={`${sidebarCollapsed ? 'hidden' : ''} space-y-1`}>
              <NavLink
                to={dashboardPath}
                onClick={() => {
                  if (dashboardPath !== '/checkup') return;
                  if (location.pathname === '/checkup' || location.pathname === '/checkup/') {
                    window.dispatchEvent(new CustomEvent('checkup:go-dashboard'));
                  }
                }}
                className={({ isActive }) =>
                  [
                    'group flex items-center rounded-2xl transition-colors',
                    sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                    'text-sm font-medium',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {!sidebarCollapsed && (
                      <span
                        className={[
                          'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                          isActive
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                        ].join(' ')}
                      />
                    )}
                    <LayoutDashboard
                      size={18}
                      className="text-slate-400 group-hover:text-white transition-all duration-200"
                    />
                    <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      Dashboard
                    </span>
                  </>
                )}
              </NavLink>
              {user?.ruolo === 'admin_studio' && (
                <NavLink
                  to="/checkup/ricerca-clienti"
                  className={({ isActive }) =>
                    [
                      'group flex items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isActive
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <Search
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Ricerca clienti
                      </span>
                    </>
                  )}
                </NavLink>
              )}
              {!isStaff && (
                <>
                  <NavLink
                    to="/checkup/tickets"
                    className={({ isActive }) =>
                      [
                        'group flex items-center rounded-2xl transition-colors',
                        sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                        'text-sm font-medium',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {!sidebarCollapsed && (
                          <span
                            className={[
                              'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                              isActive
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                            ].join(' ')}
                          />
                        )}
                        <Ticket
                          size={18}
                          className="text-slate-400 group-hover:text-white transition-all duration-200"
                        />
                        <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          Ticket
                        </span>
                        {!sidebarCollapsed && unread.tickets > 0 && (
                          <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                            {unread.tickets > 99 ? '99+' : unread.tickets}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/checkup/alerts"
                    className={({ isActive }) =>
                      [
                        'group flex items-center rounded-2xl transition-colors',
                        sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                        'text-sm font-medium',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      ].join(' ')
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {!sidebarCollapsed && (
                          <span
                            className={[
                              'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                              isActive
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                            ].join(' ')}
                          />
                        )}
                        <Bell
                          size={18}
                          className="text-slate-400 group-hover:text-white transition-all duration-200"
                        />
                        <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          Alert
                        </span>
                        {!sidebarCollapsed && unread.alerts > 0 && (
                          <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                            {unread.alerts > 99 ? '99+' : unread.alerts}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </>
              )}
              <div id="checkup-subnav" className="space-y-3" />
            </div>

            {isStaff && (
              <div className={`${sidebarCollapsed ? 'hidden' : ''} space-y-1 border-t border-blue-800/30 pt-4`}>
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Report
                </p>
                <NavLink
                  to="/checkup/report-salvati"
                  className={({ isActive }) =>
                    [
                      'group flex items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isActive
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <FileText
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Report salvati
                      </span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
            {user?.ruolo === 'admin_studio' && (
              <div className={`${sidebarCollapsed ? 'hidden' : ''} space-y-1 border-t border-blue-800/30 pt-4`}>
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Gestione
                </p>
                <NavLink
                  to="/checkup/amministrazione"
                  className={({ isActive }) =>
                    [
                      'group flex items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isActive
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <Shield
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Amministrazione
                      </span>
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/checkup/impostazioni"
                  className={({ isActive }) =>
                    [
                      'group flex items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isActive
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <Settings
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Impostazioni
                      </span>
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/checkup/audit"
                  className={({ isActive }) =>
                    [
                      'group flex items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isActive
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <ClipboardList
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Log attività
                      </span>
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </nav>

          <div className="border-t border-blue-800/30 px-4 py-4 text-xs text-slate-400 flex-shrink-0">
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={handleLogoutConfirm}
                title="Esci"
                className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-300 transition-all hover:bg-blue-900/40 hover:text-white"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <span>v1.0 • 2025</span>
                <button
                  type="button"
                  onClick={handleLogoutConfirm}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-all hover:bg-blue-900/40 hover:text-white"
                >
                  <LogOut size={14} />
                  Esci
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-visible">
          <header className="mx-6 mt-6 flex h-16 shrink-0 items-center justify-between rounded-2xl border border-indigo-200/60 bg-white/85 px-6 backdrop-blur transition-colors duration-300 shadow-[0_20px_60px_rgba(10,16,32,0.16)]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-indigo-200/70 bg-white/85 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                aria-label="Apri menu"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-500">Workspace</span>
                  <span className="text-slate-300">/</span>
                  <span>{pageTitle}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-xl font-semibold text-slate-900 display-font">{pageTitle}</h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {(location.pathname.startsWith('/checkup/utenti') || location.pathname.startsWith('/checkup/impostazioni') || location.pathname.startsWith('/checkup/amministrazione')) && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/checkup');
                  }}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  <ArrowLeft size={14} />
                  Torna al checkup
                </button>
              )}
              {!location.pathname.startsWith('/checkup/help') && (
                <button
                  type="button"
                  onClick={() => navigate('/checkup/help')}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  Help
                </button>
              )}
              {!location.pathname.startsWith('/checkup/impostazioni') && (
                <button
                  type="button"
                  onClick={() => navigate('/checkup/impostazioni')}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  Impostazioni
                </button>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/85 px-3 py-2 text-xs shadow-[0_16px_46px_rgba(10,16,32,0.16)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-800 via-indigo-600 to-blue-500 text-[11px] font-semibold text-white">
                  {initials}
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] font-medium text-slate-900 truncate max-w-[160px]">
                    {user?.nome} {user?.cognome}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                    {user?.ruolo === 'cliente'
                      ? `Cliente${clientCompanyName ? ` · ${clientCompanyName}` : ''}`
                      : user?.ruolo}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <div className="mx-auto max-w-7xl space-y-8">
              <div className="wow-card p-5 md:p-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}

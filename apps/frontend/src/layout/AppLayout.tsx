import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Home,
  Users,
  Building2,
  FileText,
  Search,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Briefcase,
  Shield,
  BarChart3,
  Wrench,
  ScrollText,
  Download,
  UploadCloud,
  RefreshCw,
  CalendarClock,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { alertsApi } from '../api/alerts';
import { ticketsApi } from '../api/tickets';
import { fetchPratiche, getDebitoreDisplayName, type Pratica } from '../api/pratiche';
import { fetchCliente } from '../api/clienti';
import { studiApi } from '../api/studi';
import { notificationsApi, type Notification as PracticeApiNotification } from '../api/notifications';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';

interface AppLayoutProps {
  children: ReactNode;
}

interface ChatNotification {
  id: string;
  source: 'alert' | 'ticket';
  sourceId: string;
  praticaId: string;
  praticaLabel: string;
  message: string;
  sender: string;
  timestamp: Date;
}

interface PracticeNotification {
  id: string;
  praticaId: string;
  praticaLabel: string;
  message: string;
  timestamp: Date;
  type?: string;
  title?: string;
  metadata?: Record<string, unknown> | null;
}

type NavSubItem = {
  path: string;
  label: string;
  icon?: ComponentType<any>;
};

type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<any>;
  subItems?: NavSubItem[];
};

const mainNav: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/clienti', label: 'Clienti', icon: Users },
  { path: '/debitori', label: 'Debitori', icon: Building2 },
  { path: '/pratiche', label: 'Pratiche', icon: FileText },
  { path: '/alert', label: 'Alert & scadenze', icon: Bell },
  { path: '/ticket', label: 'Ticket clienti', icon: MessageSquare },
  { path: '/statistiche', label: 'Statistiche', icon: BarChart3 },
  { path: '/ricerca', label: 'Report & Ricerca', icon: Search },
  { path: '/utilita', label: 'Utilità', icon: ScrollText },
];

const studioNav: NavItem[] = [
  { path: '/gestione-studio', label: 'Gestione Studio', icon: Building2 },
  { path: '/avvocati', label: 'Avvocati', icon: Briefcase },
  { path: '/collaboratori', label: 'Collaboratori', icon: Users },
  { path: '/report/fatturazione', label: 'Fatturazione', icon: FileText },
];


export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [practiceNotifications, setPracticeNotifications] = useState<PracticeNotification[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const readIdsRef = useRef<Set<string>>(new Set());
  const [notificationsStyle, setNotificationsStyle] = useState<React.CSSProperties>({});
  const [studioName, setStudioName] = useState<string>('');
  const [clienteName, setClienteName] = useState<string>('');
  const [headerStats, setHeaderStats] = useState({ openCount: 0, dueTodayCount: 0 });
  const [headerUpdatedAt, setHeaderUpdatedAt] = useState<Date | null>(null);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Find current nav item including subitems
  let currentNav: NavItem | NavSubItem | undefined = mainNav.find(
    (n) => n.path === location.pathname,
  );
  if (!currentNav) {
    for (const item of mainNav) {
      if (item.subItems) {
        const subItem = item.subItems.find((s) => s.path === location.pathname);
        if (subItem) {
          currentNav = subItem;
          break;
        }
      }
    }
  }
  if (!currentNav) {
    currentNav = studioNav.find((n) => n.path === location.pathname);
  }

  // Check admin paths
  let pageTitle = currentNav?.label ?? 'Dashboard';
  if (location.pathname === '/impostazioni') {
    pageTitle = 'Impostazioni';
  } else if (location.pathname.startsWith('/pratiche/')) {
    pageTitle = 'Dettaglio pratica';
  } else if (location.pathname === '/report/fatturazione') {
    pageTitle = 'Report Fatturazione';
  } else if (location.pathname === '/admin/users') {
    pageTitle = 'Gestione utenti';
  } else if (location.pathname === '/admin/studi') {
    pageTitle = 'Gestione studi';
  } else if (location.pathname === '/admin/dashboard') {
    pageTitle = 'Dashboard Amministrativa';
  } else if (location.pathname === '/admin/maintenance') {
    pageTitle = 'Manutenzione Dati';
  } else if (location.pathname === '/admin/audit-logs') {
    pageTitle = 'Log di Audit';
  } else if (location.pathname === '/admin/export-dati') {
    pageTitle = 'Esportazione Dati';
  } else if (location.pathname === '/admin/import-dati') {
    pageTitle = 'Importazione Dati';
  } else if (location.pathname === '/admin/backup') {
    pageTitle = 'Gestione Backup';
  } else if (location.pathname === '/admin/tassi-interesse') {
    pageTitle = 'Tassi di Interesse';
  }

  const pageSubtitle =
    pageTitle === 'Dashboard'
      ? 'Visione completa e aggiornata delle attività di recupero crediti.'
      : pageTitle === 'Statistiche'
        ? 'Performance, efficienza e stato delle pratiche in tempo reale.'
        : '';

  const handleLogout = () => {
    confirm({
      title: 'Conferma logout',
      message: 'Vuoi uscire dall’applicazione?',
      confirmText: 'Esci',
      variant: 'warning',
    }).then((ok) => {
      if (!ok) return;
      logout();
      navigate('/login');
    });
  };

  const readStorageKey = user ? `chat_notifications_read_${user.id}` : 'chat_notifications_read';

  useEffect(() => {
    if (!user) {
      readIdsRef.current = new Set();
      return;
    }
    try {
      const stored = localStorage.getItem(readStorageKey);
      const ids = stored ? JSON.parse(stored) : [];
      readIdsRef.current = new Set<string>(
        Array.isArray(ids) ? ids.map((id) => String(id)) : [],
      );
    } catch {
      readIdsRef.current = new Set();
    }
  }, [readStorageKey, user?.id]);

  const loadReadIds = () => {
    return new Set<string>(readIdsRef.current);
  };

  const saveReadIds = (ids: Set<string>) => {
    readIdsRef.current = new Set(ids);
    localStorage.setItem(readStorageKey, JSON.stringify(Array.from(ids)));
  };

  const markNotificationRead = async (notification: ChatNotification | PracticeNotification) => {
    const ids = loadReadIds();
    if ('source' in notification) {
      ids.add(notification.id);
      saveReadIds(ids);
      setChatNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      return;
    }

    try {
      await notificationsApi.markRead(notification.id);
    } catch (error) {
      console.error('Errore segnare notifica letta:', error);
    } finally {
      ids.add(notification.id);
      saveReadIds(ids);
      setPracticeNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }
  };

  const markAllNotificationsRead = async () => {
    const ids = loadReadIds();
    chatNotifications.forEach((n) => ids.add(n.id));
    practiceNotifications.forEach((n) => ids.add(n.id));
    saveReadIds(ids);
    setChatNotifications([]);

    try {
      await notificationsApi.markAllRead();
    } catch (error) {
      console.error('Errore segnare tutte le notifiche lette:', error);
    } finally {
      setPracticeNotifications([]);
    }
  };

  const openNotification = (notification: ChatNotification | PracticeNotification) => {
    if ('source' in notification) {
      const path = notification.source === 'alert' ? '/alert' : '/ticket';
      navigate(`${path}?id=${notification.sourceId}&chat=1`);
      setShowNotifications(false);
      return;
    }

    if (notification.type?.startsWith('tasso_interesse') || notification.type?.startsWith('bce_')) {
      navigate('/admin/tassi-interesse?fetch=1');
      setShowNotifications(false);
      return;
    }

    if (user?.ruolo === 'cliente') {
      navigate(`/pratiche/${notification.praticaId}/cliente`);
    } else {
      navigate(`/pratiche/${notification.praticaId}`);
    }
    setShowNotifications(false);
  };

  const isTassoNotification = (notification: PracticeNotification) =>
    notification.type?.startsWith('tasso_interesse') ||
    notification.type?.startsWith('bce_');

  const handleRequestTasso = async (notification: PracticeNotification) => {
    navigate('/admin/tassi-interesse?fetch=1');
    setShowNotifications(false);
    await markNotificationRead(notification);
  };

  const getRelevantPratiche = (pratiche: Pratica[]) => {
    if (!user) return [];

    if (user.ruolo === 'admin') return pratiche;

    if (user.ruolo === 'avvocato' || user.ruolo === 'collaboratore') {
      return pratiche;
    }

    if (user.ruolo === 'cliente') {
      return pratiche;
    }

    // Per titolare_studio e segreteria usa studioId
    if (user.studioId) {
      return pratiche.filter((pratica) => pratica.studioId && pratica.studioId === user.studioId);
    }

    return [];
  };

  // Removed unused function getPraticaLabel

  const getPraticaLabelFromApi = (notification: PracticeApiNotification) => {
    const pratica = notification.pratica;
    if (pratica) {
      const cliente = pratica.cliente?.ragioneSociale || 'Pratica';
      const debitore = getDebitoreDisplayName(pratica.debitore);
      return `${cliente} vs ${debitore}`;
    }
    return notification.title || 'Pratica';
  };

  const isSameDay = (date: Date, compare: Date) =>
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate();

  const loadHeaderStats = async () => {
    if (!user) return;
    try {
      setHeaderLoading(true);
      const pratiche = await fetchPratiche({ includeInactive: false });
      const relevant = getRelevantPratiche(pratiche);
      const openCount = relevant.filter((pratica) => pratica.aperta).length;
      const today = new Date();
      const dueTodayCount = relevant.filter((pratica) => {
        if (!pratica.dataScadenza || !pratica.aperta) return false;
        const parsed = new Date(pratica.dataScadenza);
        if (Number.isNaN(parsed.getTime())) return false;
        return isSameDay(parsed, today);
      }).length;

      setHeaderStats({ openCount, dueTodayCount });
      setHeaderUpdatedAt(new Date());
    } catch (error) {
      console.error('Errore caricamento header stats:', error);
    } finally {
      setHeaderLoading(false);
    }
  };

  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !notificationsRef.current?.contains(target) &&
        !notificationsDropdownRef.current?.contains(target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useLayoutEffect(() => {
    if (!showNotifications) return;

    const updatePosition = () => {
      const button = notificationsButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 384;
      const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.right - width));
      const top = Math.min(window.innerHeight - 16, rect.bottom + 12);
      setNotificationsStyle({
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 90,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!user) return;
    loadHeaderStats();
  }, [user]);

  useEffect(() => {
    if (!user || user.ruolo === 'admin') {
      setChatNotifications([]);
      setPracticeNotifications([]);
      return;
    }

    let cancelled = false;

    const loadChatNotifications = async () => {
      try {
        const [pratiche, alerts, tickets] = await Promise.all([
          fetchPratiche({ includeInactive: false }),
          alertsApi.getAll(false),
          ticketsApi.getAll(false),
        ]);

        if (cancelled) return;

        const relevantPratiche = getRelevantPratiche(pratiche);
        const praticaById = new Map(pratiche.map((pratica) => [pratica.id, pratica]));
        const relevantPraticaIds = new Set(relevantPratiche.map((pratica) => pratica.id));

        const readIds = loadReadIds();
        const nextNotifications: ChatNotification[] = [];

        const shouldNotifyFor = user.ruolo === 'cliente' ? 'studio' : 'cliente';

        alerts.forEach((alert) => {
          if (!alert.praticaId || !relevantPraticaIds.has(alert.praticaId)) return;
          const pratica = alert.pratica ?? praticaById.get(alert.praticaId);
          const praticaLabel = pratica
            ? `${pratica.cliente?.ragioneSociale || 'Pratica'} vs ${getDebitoreDisplayName(pratica.debitore)}`
            : 'Pratica';

          (alert.messaggi || [])
            .filter((msg) => msg.autore === shouldNotifyFor)
            .forEach((msg) => {
              const id = `alert:${alert.id}:${msg.id}`;
              if (readIds.has(id)) return;
              nextNotifications.push({
                id,
                source: 'alert',
                sourceId: alert.id,
                praticaId: alert.praticaId,
                praticaLabel,
                message: msg.testo,
                sender: msg.autore,
                timestamp: new Date(msg.dataInvio),
              });
            });
        });

        tickets.forEach((ticket) => {
          if (!ticket.praticaId || !relevantPraticaIds.has(ticket.praticaId)) return;
          const pratica = ticket.pratica ?? praticaById.get(ticket.praticaId);
          const praticaLabel = pratica
            ? `${pratica.cliente?.ragioneSociale || 'Pratica'} vs ${getDebitoreDisplayName(pratica.debitore)}`
            : 'Pratica';

          (ticket.messaggi || [])
            .filter((msg) => msg.autore === shouldNotifyFor)
            .forEach((msg) => {
              const id = `ticket:${ticket.id}:${msg.id}`;
              if (readIds.has(id)) return;
              nextNotifications.push({
                id,
                source: 'ticket',
                sourceId: ticket.id,
                praticaId: ticket.praticaId || '',
                praticaLabel,
                message: msg.testo,
                sender: msg.autore,
                timestamp: new Date(msg.dataInvio),
              });
            });
        });

        nextNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setChatNotifications(nextNotifications);
      } catch (error) {
        console.error('Errore caricamento notifiche chat:', error);
      }
    };

    loadChatNotifications();
    const intervalId = window.setInterval(loadChatNotifications, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPracticeNotifications([]);
      return;
    }

    let cancelled = false;

    const loadPracticeNotifications = async () => {
      try {
        const data = await notificationsApi.getAll({ unread: true, limit: 50 });
        if (cancelled) return;
        const readIds = loadReadIds();
        const mapped: PracticeNotification[] = data
          .filter((item) => !item.readAt)
          .filter((item) => !readIds.has(item.id))
          .map((item) => ({
          id: item.id,
          praticaId: item.praticaId ?? '',
          praticaLabel: getPraticaLabelFromApi(item),
          message: item.message,
          timestamp: new Date(item.createdAt),
          type: item.type,
          title: item.title,
          metadata: item.metadata ?? null,
        }));
        setPracticeNotifications(mapped);
      } catch (error) {
        console.error('Errore caricamento notifiche pratiche:', error);
      }
    };

    loadPracticeNotifications();
    const intervalId = window.setInterval(loadPracticeNotifications, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (user?.ruolo === 'cliente') {
      setStudioName('');
      if (!user?.clienteId) {
        setClienteName('');
        return;
      }
      let cancelled = false;

      const loadClienteName = async () => {
        try {
          const cliente = await fetchCliente(user.clienteId as string);
          if (!cancelled) {
            setClienteName(cliente.ragioneSociale || '');
          }
        } catch (error) {
          console.error('Errore caricamento cliente:', error);
          if (!cancelled) {
            setClienteName('');
          }
        }
      };

      loadClienteName();
      return () => {
        cancelled = true;
      };
    }

    // Per avvocati usa currentStudioId (studio della sessione corrente)
    // Per altri ruoli usa studioId (studio primario)
    const activeStudioId = user?.ruolo === 'avvocato'
      ? user?.currentStudioId || user?.studioId
      : user?.studioId;

    if (!activeStudioId) {
      setStudioName('');
      setClienteName('');
      return;
    }
    let cancelled = false;

    const loadStudioName = async () => {
      try {
        const studio = await studiApi.getOne(activeStudioId as string);
        if (!cancelled) {
          setStudioName(studio.nome);
        }
      } catch (error) {
        console.error('Errore caricamento studio:', error);
        if (!cancelled) {
          setStudioName('');
        }
      }
    };

    loadStudioName();
    return () => {
      cancelled = true;
    };
  }, [user?.ruolo, user?.studioId, user?.currentStudioId, user?.clienteId]);

  useEffect(() => {
    if (!user || user.ruolo === 'admin') return;
    let cancelled = false;

    const checkAlerts = async () => {
      try {
        try {
          const stored = localStorage.getItem('rc-user-settings');
          const parsed = stored ? JSON.parse(stored) : null;
          if (parsed?.notifications?.popup === false) {
            return;
          }
        } catch {
          // ignore settings read errors
        }
        const alerts = await alertsApi.getAll(false);
        if (cancelled) return;
        const now = new Date();
        const destinatario = user.ruolo === 'cliente' ? 'cliente' : 'studio';

        alerts
          .filter((alert) => {
            if (alert.destinatario !== destinatario) return false;
            if (alert.stato !== 'in_gestione' || !alert.attivo) return false;
            if (alert.modalitaNotifica !== 'popup') return false;
            if (shownAlertsRef.current.has(alert.id)) return false;

            const scadenza = new Date(alert.dataScadenza);
            const diffDays = Math.floor(
              (scadenza.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return diffDays <= (alert.giorniAnticipo ?? 0);
          })
          .forEach((alert) => {
            const scadenza = new Date(alert.dataScadenza);
            const isOverdue = scadenza < now;
            const praticaShort = alert.praticaId?.slice(0, 8);
            showToast({
              type: 'info',
              title: praticaShort ? `Alert Pratica #${praticaShort}` : 'Alert',
              message: isOverdue
                ? `Scaduto il ${scadenza.toLocaleDateString('it-IT')}: ${alert.titolo}`
                : `In scadenza il ${scadenza.toLocaleDateString('it-IT')}: ${alert.titolo}`,
              duration: 0,
              isAlert: true,
            });
            shownAlertsRef.current.add(alert.id);
          });
      } catch (err) {
        console.error('Errore controllo alert popup:', err);
      }
    };

    checkAlerts();
    const interval = window.setInterval(checkAlerts, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showToast, user]);

  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.nome.charAt(0)}${user.cognome.charAt(0)}`.toUpperCase();
  };

  const getUserFullName = () => {
    if (!user) return 'Utente';
    return `${user.nome} ${user.cognome}`;
  };

  const getRuoloLabel = () => {
    if (!user) return 'Utente';
    switch (user.ruolo) {
      case 'admin':
        return 'Admin';
      case 'titolare_studio':
        return 'Titolare Studio';
      case 'avvocato':
        return 'Avvocato';
      case 'collaboratore':
        return 'Collaboratore';
      case 'segreteria':
        return 'Segreteria';
      case 'cliente':
        return 'Referente';
      default:
        return 'Utente';
    }
  };

  const isAdmin = user?.ruolo === 'admin';
  const isCliente = user?.ruolo === 'cliente';
  const isAvvocatoOrCollaboratore =
    user?.ruolo === 'avvocato' || user?.ruolo === 'collaboratore';
  const isStudioManagement =
    user?.ruolo === 'segreteria' || user?.ruolo === 'titolare_studio';
  const showHeaderStats =
    user?.ruolo === 'titolare_studio' ||
    user?.ruolo === 'avvocato' ||
    user?.ruolo === 'collaboratore' ||
    user?.ruolo === 'segreteria';
  const showNotificationsBell = user?.ruolo !== 'admin';

  const visibleMainNav = mainNav.filter((item) => {
    if (!user) return false;
    if (isCliente) {
      return item.path === '/' || item.path === '/ticket';
    }
    if (isAvvocatoOrCollaboratore) {
      return item.path !== '/clienti' && item.path !== '/debitori';
    }
    if (user.ruolo === 'segreteria') {
      return item.path !== '/alert';
    }
    return true;
  });

  const visibleStudioNav = isStudioManagement ? studioNav : [];

  // Chiudi sidebar quando cambia route (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-visible bg-transparent text-slate-900 transition-colors duration-300 dark:text-slate-100">
      {/* sfondo sfumato dietro al layout */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_55%),radial-gradient(circle_at_18%_12%,rgba(79,70,229,0.28),transparent_50%),radial-gradient(circle_at_92%_6%,rgba(242,179,107,0.2),transparent_44%),linear-gradient(135deg,#ebe8ff,#dfe6ff)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.65),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.25),transparent_45%),linear-gradient(135deg,#05070c,#0b1120)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(120deg,rgba(10,16,32,0.06),transparent_45%)]" />

      <div className="relative flex h-screen overflow-visible p-4 gap-4">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR - Navy Scura Professionale */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 lg:z-10
            flex h-full flex-col
            rounded-none lg:rounded-2xl
            border-r lg:border border-blue-900/20
            bg-gradient-to-b from-slate-900 to-blue-950
            shadow-[0_20px_60px_rgba(15,23,42,0.2)]
            transform
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'w-20' : 'w-80'}
            lg:m-0 m-4 mt-4 mb-4
          `}
          style={{
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Logo + Close button (mobile) + Collapse button (desktop) */}
          <div className="flex items-center justify-between border-b border-blue-800/30 px-6 py-5 flex-shrink-0">
            <div className={`overflow-hidden transition-all duration-400 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <img src="/logo_resolv.png" alt="RESOLV" className="h-14 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-slate-400 hover:text-white transition-all duration-200"
                aria-label={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}
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

          {/* Navigazione */}
          <nav className="flex-1 space-y-6 px-4 py-5 overflow-y-auto overflow-x-hidden">
            {!isAdmin && (
              <div>
              {!sidebarCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Operatività
                </p>
              )}
              <ul className="space-y-1">
                {visibleMainNav.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          [
                            'group relative flex items-center rounded-lg transition-all duration-200',
                            sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-2.5',
                            'text-sm font-semibold',
                            isActive
                              ? 'bg-blue-700/90 text-white shadow-md'
                              : 'text-slate-300 hover:bg-blue-900/40 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !sidebarCollapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-cyan-400 transition-all duration-300" />
                            )}
                            <Icon
                              size={18}
                              className={`transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                            />
                            <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>

                      {hasSubItems && !sidebarCollapsed && (
                        <ul className="ml-8 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon ?? Icon;
                            return (
                              <li key={subItem.path}>
                                <NavLink
                                  to={subItem.path}
                                  className={({ isActive }) =>
                                    [
                                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                                      isActive
                                        ? 'bg-blue-700/70 text-white'
                                        : 'text-slate-400 hover:bg-blue-900/30 hover:text-white',
                                    ].join(' ')
                                  }
                                >
                                  <SubIcon size={14} />
                                  <span>{subItem.label}</span>
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
              </div>
            )}

            {!isAdmin && visibleStudioNav.length > 0 && (
              <div>
              {!sidebarCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Studio
                </p>
              )}
              <ul className="space-y-1">
                {visibleStudioNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          [
                            'group relative flex items-center rounded-lg transition-all duration-200',
                            sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-2.5',
                            'text-sm font-semibold',
                            isActive
                              ? 'bg-blue-700/90 text-white shadow-md'
                              : 'text-slate-300 hover:bg-blue-900/40 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !sidebarCollapsed && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-cyan-400 transition-all duration-300" />
                            )}
                            <Icon
                              size={18}
                              className={`transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                            />
                            <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
              </div>
            )}

            {isAdmin && (
              <div>
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Amministrazione
                  </p>
                )}
                <ul className="space-y-1">
                  <li>
                    <NavLink
                      to="/admin/dashboard"
                      title={sidebarCollapsed ? "Dashboard Admin" : undefined}
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
                          <BarChart3
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Dashboard Admin
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/users"
                      title={sidebarCollapsed ? "Gestione utenti" : undefined}
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
                            Gestione utenti
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/studi"
                      title={sidebarCollapsed ? "Gestione studi" : undefined}
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
                          <Building2
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Gestione studi
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/tassi-interesse"
                      title={sidebarCollapsed ? "Tassi di Interesse" : undefined}
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
                          <TrendingUp
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Tassi di Interesse
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/audit-logs"
                      title={sidebarCollapsed ? "Log di Audit" : undefined}
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
                          <ScrollText
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Log di Audit
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/maintenance"
                      title={sidebarCollapsed ? "Manutenzione" : undefined}
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
                          <Wrench
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Manutenzione
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/export-dati"
                      title={sidebarCollapsed ? "Esportazione Dati" : undefined}
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
                          <Download
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Esportazione Dati
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/import-dati"
                      title={sidebarCollapsed ? "Importazione Dati" : undefined}
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
                          <UploadCloud
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Importazione Dati
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin/backup"
                      title={sidebarCollapsed ? "Backup & Ripristino" : undefined}
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
                          <RefreshCw
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Backup & Ripristino
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                </ul>
              </div>
            )}

            {!isAdmin && (
              <div>
              {!sidebarCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Sistema
                </p>
              )}
              <ul className="space-y-1">
                <li>
                  <NavLink
                    to="/impostazioni"
                    title={sidebarCollapsed ? "Impostazioni" : undefined}
                    className={({ isActive }) =>
                      [
                        'flex w-full items-center rounded-lg transition-all duration-200',
                        sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-2.5',
                        'text-left text-sm font-semibold',
                        isActive
                          ? 'bg-blue-700/90 text-white shadow-md'
                          : 'text-slate-300 hover:bg-blue-900/40 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <Settings size={18} className="transition-all duration-200" />
                    <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      Impostazioni
                    </span>
                  </NavLink>
                </li>
              </ul>
              </div>
            )}
          </nav>

          {/* Footer sidebar */}
          <div className="border-t border-blue-800/30 px-4 py-4 text-xs text-slate-400 flex-shrink-0">
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={handleLogout}
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
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-all hover:bg-blue-900/40 hover:text-white"
                >
                  <LogOut size={14} />
                  Esci
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <div className="flex min-w-0 flex-1 flex-col overflow-visible">
          {/* HEADER */}
          <header className="mx-6 mt-6 flex h-16 shrink-0 items-center justify-between rounded-2xl border border-indigo-200/60 bg-white/85 px-6 backdrop-blur transition-colors duration-300 shadow-[0_20px_60px_rgba(10,16,32,0.16)] dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
            <div className="flex items-center gap-4">
              {/* Hamburger Menu Button (Mobile) */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-indigo-200/70 bg-white/85 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                aria-label="Apri menu"
              >
                <Menu size={20} />
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Workspace
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span>{pageTitle}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 display-font">
                    {pageTitle}
                  </h1>
                  {pageSubtitle && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {pageSubtitle}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {showHeaderStats && (
                <div className="hidden lg:flex items-center gap-4 rounded-2xl border border-indigo-200/60 bg-white/90 px-4 py-2 text-xs shadow-[0_16px_46px_rgba(10,16,32,0.16)] dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Aperte</span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {headerStats.openCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-slate-500 dark:text-slate-400">Oggi</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      {headerStats.dueTodayCount}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={loadHeaderStats}
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${headerLoading ? 'animate-spin' : ''}`} />
                {headerUpdatedAt
                  ? `Aggiornato ${headerUpdatedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Aggiorna'}
              </button>

              {/* Notifiche */}
              {showNotificationsBell && (
                <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  ref={notificationsButtonRef}
                  className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-indigo-200/70 bg-white/85 text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition-colors hover:border-indigo-500 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:shadow-black/30 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                  aria-label="Notifiche chat"
                >
                  <Bell size={16} />
                  {chatNotifications.length + practiceNotifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] font-semibold text-white ring-2 ring-slate-50 dark:ring-slate-900">
                      {chatNotifications.length + practiceNotifications.length > 9
                        ? '9+'
                        : chatNotifications.length + practiceNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications &&
                  createPortal(
                  <div
                    ref={notificationsDropdownRef}
                    style={notificationsStyle}
                    className="rounded-3xl border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notifiche</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {chatNotifications.length + practiceNotifications.length > 0
                            ? `${chatNotifications.length + practiceNotifications.length} nuove`
                            : 'Nessuna nuova'}
                        </p>
                      </div>
                      {chatNotifications.length + practiceNotifications.length > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          Segna tutte lette
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-auto">
                      {chatNotifications.length + practiceNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nessuna nuova notifica per le pratiche.
                        </div>
                      ) : (
                        [...chatNotifications, ...practiceNotifications]
                          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                          .map((notification) => (
                          <div
                            key={notification.id}
                            className="flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800"
                          >
                            <div className="mt-1 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {'source' in notification ? (
                                <MessageSquare className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                  {'source' in notification
                                    ? notification.source === 'alert'
                                      ? 'Alert'
                                      : 'Ticket'
                                    : isTassoNotification(notification)
                                      ? 'Tassi'
                                      : 'Pratica'}
                                </p>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {notification.timestamp.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {notification.praticaLabel}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <button
                                  onClick={() => openNotification(notification)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                >
                                  {'source' in notification
                                    ? 'Apri chat'
                                    : isTassoNotification(notification)
                                      ? 'Apri tassi'
                                      : 'Apri pratica'}
                                </button>
                                {'source' in notification
                                  ? null
                                  : isTassoNotification(notification) && (
                                    <button
                                      onClick={() => handleRequestTasso(notification)}
                                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                                    >
                                      Richiedi nuovo tasso
                                    </button>
                                  )}
                                <button
                                  onClick={() => markNotificationRead(notification)}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-600 dark:text-slate-400"
                                >
                                  Segna come letta
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>,
                  document.body,
                )}
                </div>
              )}

              {/* Profilo */}
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-200/60 bg-white/85 px-3 py-2 text-xs shadow-[0_16px_46px_rgba(10,16,32,0.16)] transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-black/30">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-800 via-indigo-600 to-blue-500 text-[11px] font-semibold text-white flex-shrink-0">
                  {getUserInitials()}
                </div>
                <div className="leading-tight hidden sm:block">
                  <p className="text-[11px] font-medium text-slate-900 dark:text-slate-100 truncate max-w-[150px] md:max-w-none">
                    {getUserFullName()}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] md:max-w-none">
                    {getRuoloLabel()} • {isCliente ? clienteName || 'Cliente' : studioName || 'Studio legale'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT AREA */}
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

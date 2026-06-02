import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ChevronLeft, ChevronRight, ChevronDown, X, ArrowLeft, LayoutDashboard, FileText, Shield, Settings, Search, Ticket, Bell, BellRing, ClipboardList, MessageCircle, CircleHelp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreassessmentNav } from '../contexts/PreassessmentNavContext';
import { useStudio } from '../contexts/StudioContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { meApi, type PersonalNotificationItem, type SystemNotificationItem } from '../api/me';
import { preassessmentApi, threadsUnreadApi, preassessmentAlertApi, preassessmentStaffChatApi, type PreassessmentClientEntry } from '../api/preassessment';
import { ToastNotification, type AlertToast } from '../components/ui/ToastNotification';
import { ActivityToastNotification, type ActivityToast } from '../components/ui/ActivityToastNotification';

const getModelDisplayName = (user?: { license?: { model?: { code?: string | null; label?: string | null } | null } | null } | null) => {
  const code = user?.license?.model?.code?.trim();
  const label = user?.license?.model?.label?.trim();
  if (code && code.toLowerCase() !== 'preassessment') return code.toUpperCase();
  if (label) return label;
  return 'Pre-Assessment';
};

const getMacroReference = (macroId: string) => {
  const parts = (macroId || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const lastAlpha = [...parts].reverse().find((part) => /^[a-z]+$/.test(part));
  return (lastAlpha || macroId || 's').slice(-1).toUpperCase();
};

const stripMacroPrefix = (label: string) =>
  (label || '').replace(/^(?:[A-Z0-9]+[_-])?[A-Z]\s*[-–—:]\s*/i, '').trim() || label;

const stripSectionPrefix = (title: string) =>
  (title || '').replace(/^(?:[A-Z0-9]+[_-])?[A-Z](?:[._]\d+)+\s*[-–—:]?\s*/i, '').trim() || title;

const getSectionReference = (sectionId: string, macroId: string, fallbackIndex: number) => {
  const normalized = (sectionId || '').replace(/-/g, '_');
  const match = normalized.match(/(?:^|_)([a-z])_(\d+(?:_\d+)*)$/i);
  if (match) return `${match[1].toUpperCase()}.${match[2].replace(/_/g, '.')}`;
  return `${getMacroReference(macroId)}.${fallbackIndex + 1}`;
};

// ── Web Audio beep ────────────────────────────────────────────────────────────
function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const beep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beep(880, 0, 0.3);
    beep(1100, 0.35, 0.25);
  } catch { /* AudioContext not available */ }
}

interface StaffNotificationSnapshot {
  clientId: string;
  clientLabel: string;
  preassessmentId: string;
  tickets: number;
  alerts: number;
  chat: number;
  status: 'in_progress' | 'concluso';
  sectionValidationsCount: number;
  finalValidationAt: string | null;
}

interface StaffUnreadTotals {
  tickets: number;
  alerts: number;
  chat: number;
}


interface CheckupAppLayoutProps {
  children: ReactNode;
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function markPersonalNotificationsRead(userId: string | undefined, items: PersonalNotificationItem[]) {
  if (!userId || items.length === 0) return;
  const key = `checkup_personal_notifications_read:${userId}`;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = new Set<string>(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    items.forEach((item) => next.add(item.id));
    localStorage.setItem(key, JSON.stringify(Array.from(next)));
  } catch {
    localStorage.setItem(key, JSON.stringify(items.map((item) => item.id)));
  }
}

export function CheckupAppLayout({ children }: CheckupAppLayoutProps) {
  const { user, logout } = useAuth();
  const modelDisplayName = useMemo(() => getModelDisplayName(user), [user]);
  const location = useLocation();
  const navigate = useNavigate();
  const { navState, setNavState, collapsed, setCollapsed, search, setSearch, onSectionClick } = usePreassessmentNav();
  const navSearchNorm = search.trim().toLowerCase();
  // Derive base path for section navigation (handles /checkup/clienti/:id routes)
  const sectionBasePath = useMemo(() => {
    const match = location.pathname.match(/^(\/checkup\/clienti\/[^/]+)/);
    return match ? match[1] : '/checkup';
  }, [location.pathname]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  // Unsaved changes are handled by the Settings page custom modal.
  const [unread, setUnread] = useState<{ tickets: number; alerts: number; chat: number }>({ tickets: 0, alerts: 0, chat: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [alertToasts, setAlertToasts] = useState<AlertToast[]>([]);
  const [activityToasts, setActivityToasts] = useState<ActivityToast[]>([]);
  const toastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staffNotificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const systemNotificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // In-memory dismissed set — cleared on logout/remount so toasts reappear on every login
  const dismissedToastIds = useRef<Set<string>>(new Set());
  const previousStaffNotificationsRef = useRef<Record<string, StaffNotificationSnapshot> | null>(null);
  const notificationPopoverRef = useRef<HTMLDivElement | null>(null);
  const notificationBellButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationPopoverPanelRef = useRef<HTMLDivElement | null>(null);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotificationItem[]>([]);
  const [systemNotificationsLoading, setSystemNotificationsLoading] = useState(false);
  const [systemNotificationsError, setSystemNotificationsError] = useState('');
  const [systemNotificationsOpen, setSystemNotificationsOpen] = useState(false);
  const [systemNotificationsUnread, setSystemNotificationsUnread] = useState(0);
  const [personalNotifications, setPersonalNotifications] = useState<PersonalNotificationItem[]>([]);
  const [personalNotificationsLoading, setPersonalNotificationsLoading] = useState(false);
  const [personalNotificationsError, setPersonalNotificationsError] = useState('');
  const [personalNotificationsUnread, setPersonalNotificationsUnread] = useState(0);
  const [staffUnreadTotals, setStaffUnreadTotals] = useState<StaffUnreadTotals>({ tickets: 0, alerts: 0, chat: 0 });

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
    if (location.pathname.startsWith('/checkup/chat')) return 'Chat';
    if (location.pathname.startsWith('/checkup/tickets')) return 'Ticket';
    if (location.pathname.startsWith('/checkup/alerts')) return 'Alert';
    if (location.pathname.startsWith('/checkup/notifiche-sistema')) return 'Notifiche';
    if (location.pathname.startsWith('/checkup/notifiche')) return 'Notifiche';
    if (location.pathname.startsWith('/checkup/audit')) return 'Log attività';
    if (location.pathname.startsWith('/checkup/clienti')) {
      if (location.pathname.endsWith('/tickets')) return 'Ticket';
      if (location.pathname.endsWith('/alerts')) return 'Alert';
      return navState?.questionnaireLabel || modelDisplayName;
    }
    return modelDisplayName;
  }, [location.pathname, modelDisplayName, navState?.questionnaireLabel, user?.ruolo]);
  const { logoUrl: studioLogoUrl, nome: studioNome } = useStudio();
  const isStaff = user ? user.ruolo !== 'cliente' : false;
  const hasPersonalNotificationsArea = !!user && user.ruolo === 'cliente' && !!user.sublicense?.id;
  const isClientChatRoute = !isStaff && location.pathname.startsWith('/checkup/chat');
  const dashboardPath = isStaff ? '/checkup/dashboard-studio' : '/checkup';
  const lastSeenNotificationsKey = useMemo(
    () => (user?.id ? `checkup_system_notifications_seen:${user.id}` : ''),
    [user?.id],
  );
  const latestSystemNotifications = useMemo(() => systemNotifications.slice(0, 6), [systemNotifications]);
  const latestPersonalNotifications = useMemo(() => personalNotifications.slice(0, 6), [personalNotifications]);
  const visibleNotifications = isStaff ? latestSystemNotifications : latestPersonalNotifications;
  const notificationsLoading = isStaff ? systemNotificationsLoading : personalNotificationsLoading;
  const notificationsError = isStaff ? systemNotificationsError : personalNotificationsError;
  const notificationsUnread = isStaff ? systemNotificationsUnread : personalNotificationsUnread;
  const notificationTitle = 'Notifiche';
  const showNotificationBell = isStaff || hasPersonalNotificationsArea;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const markOnline = () => {
      preassessmentStaffChatApi.markOnline().catch(() => {});
    };
    markOnline();
    const interval = window.setInterval(markOnline, 30_000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!systemNotificationsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationPopoverRef.current?.contains(target)) return;
      if (notificationPopoverPanelRef.current?.contains(target)) return;
      setSystemNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [systemNotificationsOpen]);

  const loadSystemNotifications = useCallback(async (silent = false): Promise<SystemNotificationItem[]> => {
    if (!isStaff) return [];
    if (!silent) {
      setSystemNotificationsLoading(true);
      setSystemNotificationsError('');
    }
    try {
      const response = await meApi.getSystemNotifications({ limit: 6, page: 1 });
      const data = response.items;
      setSystemNotifications(data);
      const lastSeen = lastSeenNotificationsKey ? sessionStorage.getItem(lastSeenNotificationsKey) : null;
      const unread = lastSeen
        ? data.filter((item) => new Date(item.createdAt).getTime() > new Date(lastSeen).getTime()).length
        : Math.min(data.length, 6);
      setSystemNotificationsUnread(unread);
      return data;
    } catch (err) {
      if (!silent) {
        setSystemNotificationsError(err instanceof Error ? err.message : 'Errore nel caricamento delle notifiche');
      }
      return [];
    } finally {
      if (!silent) {
        setSystemNotificationsLoading(false);
      }
    }
  }, [isStaff, lastSeenNotificationsKey]);

  const loadPersonalNotifications = useCallback(async (silent = false): Promise<PersonalNotificationItem[]> => {
    if (!hasPersonalNotificationsArea) return [];
    if (!silent) {
      setPersonalNotificationsLoading(true);
      setPersonalNotificationsError('');
    }
    try {
      const response = await meApi.getNotifications({ limit: 6, page: 1 });
      setPersonalNotifications(response.items);
      const lastSeen = lastSeenNotificationsKey ? sessionStorage.getItem(lastSeenNotificationsKey) : null;
      const unread = lastSeen
        ? response.items.filter((item) => new Date(item.createdAt).getTime() > new Date(lastSeen).getTime()).length
        : Math.min(response.items.length, 6);
      setPersonalNotificationsUnread(unread);
      return response.items;
    } catch (err) {
      if (!silent) {
        setPersonalNotificationsError(err instanceof Error ? err.message : 'Errore nel caricamento delle notifiche');
      }
      return [];
    } finally {
      if (!silent) {
        setPersonalNotificationsLoading(false);
      }
    }
  }, [hasPersonalNotificationsArea, lastSeenNotificationsKey]);

  const markSystemNotificationsSeen = useCallback((items: SystemNotificationItem[]) => {
    if (!lastSeenNotificationsKey || items.length === 0) return;
    sessionStorage.setItem(lastSeenNotificationsKey, items[0].createdAt);
    setSystemNotificationsUnread(0);
  }, [lastSeenNotificationsKey]);

  useEffect(() => {
    if (!isStaff) {
      setSystemNotifications([]);
      setSystemNotificationsUnread(0);
      setSystemNotificationsOpen(false);
      return;
    }
    loadSystemNotifications();
    systemNotificationIntervalRef.current = setInterval(() => {
      loadSystemNotifications(true);
    }, 60_000);
    return () => {
      if (systemNotificationIntervalRef.current) clearInterval(systemNotificationIntervalRef.current);
    };
  }, [isStaff, loadSystemNotifications]);

  useEffect(() => {
    if (!hasPersonalNotificationsArea) {
      setPersonalNotifications([]);
      setPersonalNotificationsUnread(0);
      return;
    }
    loadPersonalNotifications();
    systemNotificationIntervalRef.current = setInterval(() => {
      loadPersonalNotifications(true);
    }, 60_000);
    return () => {
      if (systemNotificationIntervalRef.current) clearInterval(systemNotificationIntervalRef.current);
    };
  }, [hasPersonalNotificationsArea, loadPersonalNotifications]);

  // ── Azzera navState quando l'utente torna alla dashboard (nessun cliente attivo) ──
  useEffect(() => {
    if (location.pathname.startsWith('/checkup/dashboard-studio')) {
      setNavState(null);
    }
  }, [location.pathname, setNavState]);

  // ── Unread badge polling (cliente only) ────────────────────────────────────
  useEffect(() => {
    if (!user || user.ruolo !== 'cliente') {
      setUnread({ tickets: 0, alerts: 0, chat: 0 });
      return;
    }
    const fetchUnread = async () => {
      try {
        const pre = await preassessmentApi.get();
        const [counts, chatCounts] = await Promise.all([
          threadsUnreadApi.getCounts(pre.id),
          preassessmentStaffChatApi.getUnreadCount(),
        ]);
        setUnread({ ...counts, chat: chatCounts.unread });
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

  // ── Instant badge clear when a page calls markSeen ─────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent<'tickets' | 'alerts' | 'chat'>).detail;
      setUnread((prev) => ({ ...prev, [type]: 0 }));
      setStaffUnreadTotals((prev) => ({ ...prev, [type]: 0 }));
      setNavState((prev) => {
        if (!prev) return prev;
        if (type === 'tickets') return { ...prev, ticketCount: 0 };
        if (type === 'alerts') return { ...prev, alertCount: 0 };
        if (type === 'chat') return { ...prev, chatCount: 0 };
        return prev;
      });
    };
    window.addEventListener('checkup:mark-seen', handler);
    return () => window.removeEventListener('checkup:mark-seen', handler);
  }, [setNavState]);

  // ── Expiring alerts toast polling ───────────────────────────────────────────
  const dismissToast = useCallback((id: string) => {
    dismissedToastIds.current.add(id);
    setAlertToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissActivityToast = useCallback((id: string) => {
    setActivityToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const alertsPagePath = useMemo(() => {
    if (!user) return '/checkup/alerts';
    return '/checkup/alerts';
  }, [user?.ruolo]);

  useEffect(() => {
    if (!user || user.ruolo === 'cliente') {
      previousStaffNotificationsRef.current = null;
      setActivityToasts([]);
      setStaffUnreadTotals({ tickets: 0, alerts: 0, chat: 0 });
      return;
    }

    const enqueueActivityToast = (toast: ActivityToast) => {
      setActivityToasts((prev) => {
        if (prev.some((item) => item.id === toast.id)) return prev;
        return [...prev, toast].slice(-6);
      });
    };

      const buildSnapshot = async (entries: PreassessmentClientEntry[]): Promise<Record<string, StaffNotificationSnapshot>> => {
      const withPre = entries.filter((entry) => entry.preassessment?.id);
      const counts = await Promise.allSettled(
        withPre.map(async (entry) => ({
          preassessmentId: entry.preassessment!.id,
          counts: await threadsUnreadApi.getCounts(entry.preassessment!.id),
        })),
      );

      const countsByPreId = new Map<string, { tickets: number; alerts: number; chat: number }>();
      counts.forEach((result) => {
        if (result.status === 'fulfilled') {
          countsByPreId.set(result.value.preassessmentId, result.value.counts);
        }
      });

      return withPre.reduce<Record<string, StaffNotificationSnapshot>>((acc, entry) => {
        const pre = entry.preassessment!;
        const count = countsByPreId.get(pre.id) || { tickets: 0, alerts: 0, chat: 0 };
        const clientLabel = entry.client.ragioneSociale || entry.client.azienda || entry.client.nome || 'Cliente';
        acc[pre.id] = {
          clientId: entry.client.id,
          clientLabel,
          preassessmentId: pre.id,
          tickets: count.tickets,
          alerts: count.alerts,
          chat: count.chat,
          status: pre.status,
          sectionValidationsCount: pre.sectionValidationsCount || 0,
          finalValidationAt: pre.finalValidationAt || null,
        };
        return acc;
      }, {});
    };

    const pollStaffNotifications = async () => {
      try {
        const entries = await preassessmentApi.listClients();
        const next = await buildSnapshot(entries);
        const directChatUnread = await preassessmentStaffChatApi.getUnreadCount().catch(() => ({ unread: 0 }));
        const totals = Object.values(next).reduce(
          (acc, current) => ({
            tickets: acc.tickets + current.tickets,
            alerts: acc.alerts + current.alerts,
            chat: acc.chat + current.chat,
          }),
          { tickets: 0, alerts: 0, chat: 0 },
        );
        setStaffUnreadTotals({ ...totals, chat: directChatUnread.unread });
        const previous = previousStaffNotificationsRef.current;

        if (!previous) {
          previousStaffNotificationsRef.current = next;
          return;
        }

        Object.values(next).forEach((current) => {
          const prev = previous[current.preassessmentId];
          if (!prev) return;

          if (current.chat > prev.chat) {
            const delta = current.chat - prev.chat;
            enqueueActivityToast({
              id: `chat:${current.preassessmentId}:${current.chat}`,
              kind: 'chat',
              titolo: delta > 1 ? 'Nuovi messaggi in chat' : 'Nuovo messaggio in chat',
              messaggio: `${current.clientLabel}: ${delta > 1 ? `hai ${delta} nuovi messaggi` : 'hai ricevuto un nuovo messaggio'}.`,
              ctaLabel: 'Apri pre-assessment',
            });
          }

          if (current.tickets > prev.tickets) {
            const delta = current.tickets - prev.tickets;
            enqueueActivityToast({
              id: `ticket:${current.preassessmentId}:${current.tickets}`,
              kind: 'ticket',
              titolo: delta > 1 ? 'Nuove attività sui ticket' : 'Nuova attività su ticket',
              messaggio: `${current.clientLabel}: ${delta > 1 ? `ci sono ${delta} nuove attività sui ticket` : "c'è un nuovo ticket o una nuova risposta"}.`,
              ctaLabel: 'Apri ticket',
            });
          }

          if (prev.status !== 'concluso' && current.status === 'concluso') {
            enqueueActivityToast({
              id: `completed:${current.preassessmentId}:${current.status}`,
              kind: 'completed',
              titolo: 'Checkup completato',
              messaggio: `Il checkup di ${current.clientLabel} risulta completato.`,
              ctaLabel: 'Apri pre-assessment',
            });
          }

          if (current.sectionValidationsCount > prev.sectionValidationsCount) {
            const delta = current.sectionValidationsCount - prev.sectionValidationsCount;
            enqueueActivityToast({
              id: `validation:${current.preassessmentId}:${current.sectionValidationsCount}`,
              kind: 'validation',
              titolo: delta > 1 ? 'Nuove sezioni validate' : 'Nuova sezione validata',
              messaggio: `${current.clientLabel}: ${delta > 1 ? `sono state validate ${delta} nuove sezioni` : 'è stata validata una nuova sezione'}.`,
              ctaLabel: 'Apri pre-assessment',
            });
          }

          if (!prev.finalValidationAt && current.finalValidationAt) {
            enqueueActivityToast({
              id: `approved:${current.preassessmentId}:${current.finalValidationAt}`,
              kind: 'approved',
              titolo: 'Checkup validato dal Super-owner',
              messaggio: `Il checkup di ${current.clientLabel} è stato validato definitivamente.`,
              ctaLabel: 'Apri pre-assessment',
            });
          }
        });

        if (Object.values(next).some((current) => {
          const prev = previous[current.preassessmentId];
          return prev && (
            current.chat > prev.chat
            || current.tickets > prev.tickets
            || (prev.status !== 'concluso' && current.status === 'concluso')
            || current.sectionValidationsCount > prev.sectionValidationsCount
            || (!prev.finalValidationAt && !!current.finalValidationAt)
          );
        })) {
          playAlertSound();
        }

        previousStaffNotificationsRef.current = next;
      } catch {
        // silently ignore
      }
    };

    pollStaffNotifications();
    staffNotificationIntervalRef.current = setInterval(pollStaffNotifications, 30_000);
    return () => {
      if (staffNotificationIntervalRef.current) clearInterval(staffNotificationIntervalRef.current);
    };
  }, [user?.id, user?.ruolo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;

    const checkExpiring = async () => {
      try {
        const expiring = await preassessmentAlertApi.getExpiring();
        if (expiring.length === 0) return;
        const newToasts: AlertToast[] = expiring
          .filter((a) => !dismissedToastIds.current.has(a.id) && a.dataScadenza && a.preavvisoGiorni)
          .map((a) => ({
            id: a.id,
            messaggio: a.messaggio,
            priority: a.priority,
            dataScadenza: a.dataScadenza!,
            preavvisoGiorni: a.preavvisoGiorni!,
          }));
        if (newToasts.length > 0) {
          setAlertToasts((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const fresh = newToasts.filter((t) => !existingIds.has(t.id));
            if (fresh.length > 0) {
              playAlertSound();
              return [...prev, ...fresh];
            }
            return prev;
          });
        }
      } catch { /* silently ignore */ }
    };

    checkExpiring();
    toastIntervalRef.current = setInterval(checkExpiring, 5 * 60 * 1000); // ogni 5 minuti
    return () => {
      if (toastIntervalRef.current) clearInterval(toastIntervalRef.current);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
                {navState?.questionnaireLabel || modelDisplayName}
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
            <div className="space-y-1">
              <NavLink
                to={dashboardPath}
                end
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
                    (isActive && !isClientChatRoute)
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
                          (isActive && !isClientChatRoute)
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
              {isStaff && (
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
              {isStaff && (
                <>
                  <NavLink
                    to="/checkup/chat"
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
                    title="Chat"
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
                        <MessageCircle size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                        <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          Chat
                        </span>
                        {!sidebarCollapsed && staffUnreadTotals.chat > 0 && (
                          <span className="ml-auto rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                            {staffUnreadTotals.chat > 99 ? '99+' : staffUnreadTotals.chat}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
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
                    title="Ticket"
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
                        <Ticket size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                        <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          Ticket
                        </span>
                        {!sidebarCollapsed && staffUnreadTotals.tickets > 0 && (
                          <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                            {staffUnreadTotals.tickets > 99 ? '99+' : staffUnreadTotals.tickets}
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
                    title="Alert"
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
                        <Bell size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                        <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          Alert
                        </span>
                        {!sidebarCollapsed && staffUnreadTotals.alerts > 0 && (
                          <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                            {staffUnreadTotals.alerts > 99 ? '99+' : staffUnreadTotals.alerts}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </>
              )}
              {isStaff && navState?.hasAssessment && navState.clientId && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (location.pathname === `/checkup/clienti/${navState.clientId}`) {
                        window.dispatchEvent(new CustomEvent('checkup:go-dashboard'));
                        document.getElementById('checkup-main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        navigate(`/checkup/clienti/${navState.clientId}`);
                      }
                    }}
                    className={[
                      'group flex w-full items-center rounded-2xl transition-colors',
                      sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                      'text-sm font-medium',
                      location.pathname === `/checkup/clienti/${navState.clientId}` && new URLSearchParams(location.search).get('panel') !== 'chat'
                        ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                    title="Panoramica Checkup"
                  >
                    {!sidebarCollapsed && (
                      <span
                        className={[
                          'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                          location.pathname === `/checkup/clienti/${navState.clientId}` && new URLSearchParams(location.search).get('panel') !== 'chat'
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                        ].join(' ')}
                      />
                    )}
                    <ClipboardList size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                    <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                      Panoramica Checkup
                    </span>
                  </button>
                </>
              )}
              {!isStaff && (
                <>
                  {navState?.hasAssessment && (
                    <button
                      type="button"
                      onClick={() => navigate('/checkup/chat')}
                      className={[
                        'group flex w-full items-center rounded-2xl transition-colors',
                        sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2',
                        'text-sm font-medium',
                        isClientChatRoute
                          ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      ].join(' ')}
                      title="Chat"
                    >
                      {!sidebarCollapsed && (
                        <span
                          className={[
                            'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                            isClientChatRoute
                              ? 'opacity-100 translate-x-0'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                          ].join(' ')}
                        />
                      )}
                      <MessageCircle
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Chat
                      </span>
                      {!sidebarCollapsed && unread.chat > 0 && (
                        <span className="ml-auto rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                          {unread.chat > 99 ? '99+' : unread.chat}
                        </span>
                      )}
                    </button>
                  )}
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
                  {hasPersonalNotificationsArea && (
                    <NavLink
                      to="/checkup/notifiche"
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
                          <BellRing
                            size={18}
                            className="text-slate-400 group-hover:text-white transition-all duration-200"
                          />
                          <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            Notifiche
                          </span>
                          {!sidebarCollapsed && personalNotificationsUnread > 0 && (
                            <span className="ml-auto rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[18px] text-center">
                              {personalNotificationsUnread > 99 ? '99+' : personalNotificationsUnread}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )}
                </>
              )}
              {/* Unico contenitore: target del portal quando PreassessmentPage è montata,
                  nav contestuale (stesso wrapper CSS di PreassessmentSidebar) quando non lo è */}
              <div id="checkup-subnav" className="space-y-3">
                {!sidebarCollapsed && navState !== null && navState.hasAssessment && onSectionClick === null && (
                  <div className="space-y-4">
                    {/* div vuoto identico al container del pulsante Chat in PreassessmentSidebar
                        — garantisce la stessa spaziatura in tutti i contesti */}
                    <div className="space-y-1" />
                    {/* Ricerca */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cerca sezione o campo..."
                        className="w-full rounded-2xl border border-blue-900/40 bg-blue-950/40 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-500"
                      />
                    </div>

                    {/* Gruppi macro area */}
                    <nav className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                      {navState.grouped.map((g) => {
                        const visibleSections = navSearchNorm
                          ? g.sections.filter((s) =>
                              s.title.toLowerCase().includes(navSearchNorm)
                              || s.description.toLowerCase().includes(navSearchNorm)
                              || s.fields.some((f) => f.label.toLowerCase().includes(navSearchNorm)),
                            )
                          : g.sections;
                        if (visibleSections.length === 0) return null;
                        return (
                          <div key={g.id} className="space-y-1">
                            <button
                              onClick={() =>
                                setCollapsed((p) => {
                                  const isCollapsed = !!p[g.id];
                                  const next: Record<string, boolean> = {};
                                  navState.grouped.forEach((macro) => {
                                    next[macro.id] = macro.id === g.id ? !isCollapsed : true;
                                  });
                                  return next;
                                })
                              }
                              className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400"
                            >
                              {`${getMacroReference(g.id)} - ${stripMacroPrefix(g.label)}`}
                              <ChevronDown className={`h-3 w-3 text-slate-500 transition ${collapsed[g.id] ? '-rotate-90' : ''}`} />
                            </button>
                            {!collapsed[g.id] && visibleSections.map((s) => {
                              const sIdx = g.sections.indexOf(s);
                              const idx = navState.sections.findIndex((sec) => sec.id === s.id);
                              const stat = navState.sectionStats[s.id];
                              const done = stat?.done ?? 0;
                              const total = stat?.total ?? 0;
                              const na = stat?.na ?? 0;
                              const isValidated = !!navState.macroValidations[s.macro];
                              const sectionNum = getSectionReference(s.id, g.id, sIdx);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    if (idx < 0) return;
                                    navigate(`${sectionBasePath}?section=${idx}`);
                                  }}
                                  className="group relative flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <span className="h-6 w-1 flex-shrink-0 rounded-full bg-indigo-400 opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0 transition-all duration-300" />
                                  <span className="flex-1 min-w-0 text-left truncate">
                                    <span className="font-semibold opacity-70">{sectionNum}</span>
                                    <span className="mx-1 opacity-50">—</span>
                                    {stripSectionPrefix(s.title)}
                                  </span>
                                  <span className={`flex flex-shrink-0 items-center gap-2 text-[10px] font-semibold ${total > 0 && done === total ? 'text-emerald-300' : done > 0 ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {isValidated && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                                    {na > 0 && <span className="text-rose-300">N/A {na}</span>}
                                    <span>{done}/{total}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </nav>
                    <div className="border-t border-blue-800/30 pt-4" />
                  </div>
                )}
              </div>
            </div>

            {isStaff && (
              <div className="space-y-1 border-t border-blue-800/30 pt-4">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Report
                  </p>
                )}
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
            {isStaff && (
              <div className="space-y-1 border-t border-blue-800/30 pt-4">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Attivita
                  </p>
                )}
                {user?.ruolo === 'admin_studio' && (
                  <>
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
                  </>
                )}
                {user?.ruolo !== 'admin_studio' && (
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
                )}
                <NavLink
                  to="/checkup/notifiche-sistema"
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
                      <BellRing
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Notifiche
                      </span>
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/checkup/help"
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
                      <CircleHelp
                        size={18}
                        className="text-slate-400 group-hover:text-white transition-all duration-200"
                      />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Help
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
            {!isStaff && (
              <div className="space-y-1 border-t border-blue-800/30 pt-4">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Supporto
                  </p>
                )}
                <NavLink
                  to="/checkup/help"
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
                      <BellRing size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Help
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
                      <Settings size={18} className="text-slate-400 group-hover:text-white transition-all duration-200" />
                      <span className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Impostazioni
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
                <span>v1.0 • 2026</span>
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
          <header className="mx-6 mt-6 relative flex h-16 shrink-0 items-center justify-between rounded-2xl border border-indigo-200/60 bg-white/85 px-6 backdrop-blur transition-colors duration-300 shadow-[0_20px_60px_rgba(10,16,32,0.16)]">
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

            {/* Studio branding — center of header */}
            {(studioLogoUrl || studioNome) && (
              <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 max-w-[240px] pointer-events-none select-none">
                {studioLogoUrl ? (
                  <img
                    src={studioLogoUrl}
                    alt="Logo studio"
                    className="h-8 w-auto max-w-[180px] object-contain"
                  />
                ) : (
                  studioNome && (
                    <div className="flex flex-col items-center leading-none gap-[3px]">
                      <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-blue-400 select-none">Licenziatario</span>
                      <span className="text-[15px] font-extrabold tracking-[0.02em] text-slate-900 truncate max-w-[240px]">{studioNome}</span>
                    </div>
                  )
                )}
              </div>
            )}

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
              {showNotificationBell && (
                <div ref={notificationPopoverRef} className="relative z-[120]">
                  <button
                    ref={notificationBellButtonRef}
                    type="button"
                    onClick={async () => {
                      const nextOpen = !systemNotificationsOpen;
                      setSystemNotificationsOpen(nextOpen);
                      if (nextOpen) {
                        if (isStaff) {
                          const latest = await loadSystemNotifications();
                          markSystemNotificationsSeen(latest);
                        } else {
                          const latest = await loadPersonalNotifications();
                          markPersonalNotificationsRead(user?.id, latest);
                          if (lastSeenNotificationsKey && latest.length > 0) {
                            sessionStorage.setItem(lastSeenNotificationsKey, latest[0].createdAt);
                          }
                          setPersonalNotificationsUnread(0);
                        }
                      }
                    }}
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-200/60 bg-white/85 text-slate-700 shadow-[0_16px_46px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700"
                    aria-label={notificationTitle}
                    title={notificationTitle}
                  >
                    <BellRing size={18} />
                    {notificationsUnread > 0 && (
                      <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    )}
                  </button>
                  {systemNotificationsOpen && typeof document !== 'undefined' && createPortal(
                    <div
                      ref={notificationPopoverPanelRef}
                      className="fixed z-[9999] w-[380px] overflow-hidden rounded-2xl border border-indigo-100/60 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-800/90"
                      style={{
                        top: ((notificationBellButtonRef.current?.getBoundingClientRect().bottom ?? 96) + 12),
                        right: Math.max(window.innerWidth - (notificationBellButtonRef.current?.getBoundingClientRect().right ?? window.innerWidth - 24), 24),
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{notificationTitle}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Ultimi aggiornamenti del pre-assessment</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSystemNotificationsOpen(false);
                            navigate(isStaff ? '/checkup/notifiche-sistema' : '/checkup/notifiche');
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Vedi tutte
                        </button>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                            Caricamento notifiche...
                          </div>
                        ) : notificationsError ? (
                          <div className="px-4 py-6 text-sm text-rose-700 dark:text-rose-300">
                            {notificationsError}
                          </div>
                        ) : visibleNotifications.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                            Nessuna notifica disponibile.
                          </div>
                        ) : (
                          visibleNotifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (isStaff) {
                                  const systemItem = item as SystemNotificationItem;
                                  const params = new URLSearchParams();
                                  params.set('notificationId', systemItem.id);
                                  params.set('type', systemItem.type);
                                  params.set('query', `${systemItem.title} ${systemItem.clientName || ''}`.trim());
                                  navigate(`/checkup/notifiche-sistema?${params.toString()}`);
                                } else if (item.actionUrl) {
                                  navigate(item.actionUrl);
                                }
                                setSystemNotificationsOpen(false);
                              }}
                              className="flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.title}</p>
                                <span className="shrink-0 text-[11px] text-slate-400">{formatNotificationDate(item.createdAt)}</span>
                              </div>
                              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
                              {item.clientName && (
                                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300">{item.clientName}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>,
                    document.body,
                  )}
                </div>
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
                      ? (clientCompanyName || '')
                      : (user?.studioNome || '')}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main id="checkup-main-scroll" className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <div className="mx-auto max-w-7xl space-y-8">
              <div className="wow-card p-5 md:p-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog />

      <ActivityToastNotification
        toasts={activityToasts}
        onDismiss={dismissActivityToast}
        onNavigate={(toast) => {
          const match = toast.id.match(/^[^:]+:([^:]+)/);
          const preassessmentId = match?.[1];
          const snapshot = preassessmentId ? previousStaffNotificationsRef.current?.[preassessmentId] : null;
          if (!snapshot) return;
          if (toast.kind === 'ticket') {
            navigate(`/checkup/tickets?clientId=${snapshot.clientId}`);
            return;
          }
          if (toast.kind === 'alert') {
            navigate(`/checkup/alerts?clientId=${snapshot.clientId}`);
            return;
          }
          if (toast.kind === 'chat') {
            navigate(`/checkup/chat?clientId=${snapshot.clientId}`);
            return;
          }
          navigate(`/checkup/clienti/${snapshot.clientId}`);
        }}
      />

      {/* ── Expiring alert toasts ─────────────────────────────────────────── */}
      <ToastNotification
        toasts={alertToasts}
        onDismiss={dismissToast}
        onNavigate={() => navigate(alertsPagePath)}
      />
    </div>
  );
}

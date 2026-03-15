import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Printer,
  ArrowDown,
  MessageCircle,
  Ticket,
  Bell,
  Send,
  Eye,
  Users,
  Loader2,
  Ban,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  MACRO_AREAS as DEFAULT_MACRO_AREAS,
  SECTIONS as DEFAULT_SECTIONS,
  FieldSpec,
  SectionSpec,
  MacroAreaSpec,
} from '../data/preassessment';
import * as questionManagementApi from '../api/questionManagement';
import {
  preassessmentApi,
  preassessmentChatApi,
  preassessmentTicketApi,
  preassessmentAlertApi,
  preassessmentDocumentsApi,
  threadsUnreadApi,
  PreassessmentClientEntry,
  PreassessmentClientRecord,
  PreassessmentChatMessage,
  PreassessmentTicket,
  PreassessmentAlert,
  PreassessmentDocument,
} from '../api/preassessment';
import { preassessmentReportApi } from '../api/reports';
import { pdfConfigApi, DEFAULT_PDF_CONFIG, type PdfConfig } from '../api/pdfConfig';
import { useAuth } from '../contexts/AuthContext';
import { usePreassessmentNav } from '../contexts/PreassessmentNavContext';
import { useStudio } from '../contexts/StudioContext';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { downloadTextFile, formatDateTime, sanitizeFilename } from '../utils/textExport';
import {
  OWNER_EMAIL_BY_MACRO,
  buildPreassessmentCsv,
  getInitialData,
  getInitialNaFields,
  getOwnerInfo,
} from '../features/preassessment/preassessment-utils';
import { FormField } from '../features/preassessment/FormField';

const CHAT_SECTION_ID = 'general';
const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
};

export default function PreassessmentPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setNavState, collapsed, setCollapsed, search, setSearch, registerSectionClick, unregisterSectionClick } = usePreassessmentNav();
  const { logoUrl: studioLogoUrl, nome: studioNome } = useStudio();
  const isClient = user?.ruolo === 'cliente';
  const isStaff = !!user && user.ruolo !== 'cliente';
  const canChat = user?.ruolo === 'cliente'
    || user?.ruolo === 'collaboratore'
    || user?.ruolo === 'admin_studio'
    || user?.ruolo === 'segreteria';
  const [macroAreas, setMacroAreas] = useState<MacroAreaSpec[]>(DEFAULT_MACRO_AREAS);
  const [sections, setSections] = useState<SectionSpec[]>(DEFAULT_SECTIONS);
  const assignedClientMacroAreas = useMemo(() => {
    if (!isClient) return null;
    const values = Array.from(
      new Set(
        (user?.macroAreaAssignments || [])
          .map((value) => value?.trim())
          .filter((value): value is string => !!value),
      ),
    );
    return values.length > 0 ? new Set(values) : null;
  }, [isClient, user?.macroAreaAssignments]);

  useEffect(() => {
    const modelId = user?.license?.model?.id;
    if (!modelId) {
      setMacroAreas(DEFAULT_MACRO_AREAS);
      setSections(DEFAULT_SECTIONS);
      return;
    }

    let cancelled = false;
    const normalizeFieldType = (value: string): FieldSpec['type'] => {
      if (value === 'textarea' || value === 'select' || value === 'multiselect' || value === 'number') {
        return value;
      }
      return 'text';
    };

    questionManagementApi
      .getCompleteStructure(modelId)
      .then((data) => {
        if (cancelled) return;
        const nextMacroAreas: MacroAreaSpec[] = data.map((macro) => ({
          id: macro.code,
          label: macro.label,
          color: macro.color,
        }));
        const nextSections: SectionSpec[] = data.flatMap((macro) =>
          (macro.sections || []).map((section) => ({
            id: section.code,
            macro: macro.code,
            title: section.title,
            description: section.description || '',
            fields: (section.fields || []).map((field) => ({
              id: field.fieldId,
              label: field.label,
              type: normalizeFieldType(field.type),
              options: field.options || undefined,
              required: field.required || false,
              help: field.help || undefined,
              allowDocuments: field.allowDocuments ?? true,
              weight: typeof field.weight === 'number' ? field.weight : 1,
            })),
          }))
        );
        const visibleMacroAreas = assignedClientMacroAreas
          ? nextMacroAreas.filter((macro) => assignedClientMacroAreas.has(macro.id))
          : nextMacroAreas;
        const visibleSections = assignedClientMacroAreas
          ? nextSections.filter((section) => assignedClientMacroAreas.has(section.macro))
          : nextSections;

        setMacroAreas(visibleMacroAreas.length || assignedClientMacroAreas ? visibleMacroAreas : DEFAULT_MACRO_AREAS);
        setSections(visibleSections.length || assignedClientMacroAreas ? visibleSections : DEFAULT_SECTIONS);
      })
      .catch(() => {
        if (cancelled) return;
        setMacroAreas(DEFAULT_MACRO_AREAS);
        setSections(DEFAULT_SECTIONS);
      });

    return () => {
      cancelled = true;
    };
  }, [assignedClientMacroAreas, user?.license?.model?.id]);

  const [clients, setClients] = useState<PreassessmentClientEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId ?? null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<PreassessmentClientEntry[]>([]);
  const [clientSearched, setClientSearched] = useState(false);

  const [data, setData] = useState<Record<string, string>>(() => getInitialData(sections));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [userFieldNotes, setUserFieldNotes] = useState<Record<string, string>>({});
  const [fieldMeta, setFieldMeta] = useState<Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }>>({});
  const [naFields, setNaFields] = useState<Record<string, boolean>>(() => getInitialNaFields(sections));
  const [macroValidations, setMacroValidations] = useState<Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>>({});
  const [sectionValidations, setSectionValidations] = useState<Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>>({});
  const [finalValidation, setFinalValidation] = useState<{ by: { id: string; name: string; ruolo: string }; at: string } | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<'in_progress' | 'concluso'>('in_progress');
  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [isPreassessmentOnline, setIsPreassessmentOnline] = useState(false);
  const [clientInfo, setClientInfo] = useState<PreassessmentClientRecord['client'] | null>(null);
  const [view, setView] = useState<'dashboard' | number>('dashboard');
  const lastSectionIdRef = useRef<string | null>(null);
  // search + collapsed come from PreassessmentNavContext (shared with CheckupAppLayout)
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState<'excludeNA' | 'includeNA'>('excludeNA');
  const [exportIncludeConsultantNotes, setExportIncludeConsultantNotes] = useState(true);
  const [panel, setPanel] = useState<'chat' | 'tickets' | 'alerts' | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>(DEFAULT_PDF_CONFIG);
  const [savingReport, setSavingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const consultantNoteDirtyRef = useRef(false);
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<PreassessmentChatMessage[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [ticketUnreadCount, setTicketUnreadCount] = useState(0);
  const [alertUnreadCount, setAlertUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; name: string; ruolo: string }>>([]);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTicketIdsRef = useRef<Set<string>>(new Set());
  const [tickets, setTickets] = useState<PreassessmentTicket[]>([]);
  const [alerts, setAlerts] = useState<PreassessmentAlert[]>([]);
  const [activeEditors, setActiveEditors] = useState<Record<string, { userId: string; name: string }>>({});
  const [dashFilter, setDashFilter] = useState<'all' | 'completed' | 'todo' | 'na'>('all');
  const [documentsByField, setDocumentsByField] = useState<Record<string, PreassessmentDocument[]>>({});
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const documentsEnabled = useMemo(() => {
    if (isClient) return user?.sublicense?.allowDocuments !== false;
    return clientInfo?.sublicense?.allowDocuments !== false;
  }, [isClient, user?.sublicense?.allowDocuments, clientInfo?.sublicense?.allowDocuments]);

  // exportIncludeConsultantNotes defaults to true for all users

  useEffect(() => {
    setData((prev) => ({ ...getInitialData(sections), ...prev }));
    setNaFields((prev) => ({ ...getInitialNaFields(sections), ...prev }));
  }, [sections]);

  useEffect(() => {
    if (macroAreas.length === 0) return;
    setCollapsed((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      macroAreas.forEach((macro) => {
        next[macro.id] = true;
      });
      return next;
    });
  }, [macroAreas]);

  useEffect(() => {
    const handler = () => {
      setView('dashboard');
      setPanel(null);
    };
    window.addEventListener('checkup:go-dashboard', handler);
    return () => window.removeEventListener('checkup:go-dashboard', handler);
  }, []);

  const didInitRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoDataUrlRef = useRef<string | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sidebarTarget = typeof document !== 'undefined' ? document.getElementById('checkup-subnav') : null;

  const activeClientId = isClient ? user?.clientId ?? null : selectedClientId;
  const isFinalClosed = assessmentStatus === 'concluso' && !!finalValidation;
  const canEditAnswers = isClient ? !isFinalClosed : false;
  const readOnly = !canEditAnswers;
  const showAssessment = !!activeClientId && !!preassessmentId;
  const activeSection = typeof view === 'number' ? sections[view] : null;
  const activeMacro = activeSection ? macroAreas.find((m) => m.id === activeSection.macro) : null;

  // ── Register section click in nav context (useLayoutEffect: sincrono pre-paint, no flash) ──
  useLayoutEffect(() => {
    registerSectionClick((idx) => {
      setView(idx);
      setPanel(null);
    });
    return () => {
      unregisterSectionClick();
    };
  }, [registerSectionClick, unregisterSectionClick]);

  // ── Populate nav context for sidebar persistence across routes ──────────────
  useEffect(() => {
    const allGrouped = macroAreas
      .map((m) => ({ ...m, sections: sections.filter((s) => s.macro === m.id) }))
      .filter((g) => g.sections.length > 0);
    const sectionStats: Record<string, { done: number; total: number; na: number }> = {};
    sections.forEach((s) => {
      sectionStats[s.id] = {
        done: s.fields.filter((f) => f.required && !naFields[f.id] && data[f.id]?.trim()).length,
        total: s.fields.filter((f) => f.required && !naFields[f.id]).length,
        na: s.fields.filter((f) => naFields[f.id]).length,
      };
    });
    setNavState({
      grouped: allGrouped,
      sections,
      sectionStats,
      macroValidations,
      chatCount: chatUnreadCount,
      ticketCount: ticketUnreadCount,
      alertCount: alertUnreadCount,
      clientId: activeClientId || null,
      hasAssessment: !!activeClientId,
      isClient,
    });
  }, [sections, macroAreas, data, naFields, macroValidations, chatUnreadCount, ticketUnreadCount, alertUnreadCount, activeClientId, isClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to top when section changes ───────────────────────────────────────
  useEffect(() => {
    if (typeof view === 'number') {
      document.getElementById('checkup-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [view]);

  // ── Handle ?section=N URL param (navigation from Ticket/Alert pages) ────────
  useEffect(() => {
    if (!preassessmentId) return;
    const params = new URLSearchParams(location.search);
    const sParam = params.get('section');
    if (sParam !== null) {
      const idx = parseInt(sParam, 10);
      if (!isNaN(idx) && idx >= 0 && idx < sections.length) {
        setView(idx);
        setPanel(null);
        navigate(location.pathname, { replace: true });
      }
    }
  }, [preassessmentId, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const lastLocalChangeRef = useRef<number>(0);
  const onlineUsers = useMemo(() => {
    const map = new Map<string, { userId: string; name: string }>();
    Object.values(activeEditors).forEach((entry) => {
      if (!entry) return;
      if (!map.has(entry.userId)) map.set(entry.userId, entry);
    });
    return Array.from(map.values());
  }, [activeEditors]);

  const loadDocuments = useCallback(async () => {
    if (!preassessmentId || !activeSection) return;
    setDocumentsLoading(true);
    try {
      const docs = await preassessmentDocumentsApi.list(preassessmentId, activeSection.id);
      const grouped: Record<string, PreassessmentDocument[]> = {};
      docs.forEach((doc) => {
        const key = doc.fieldId;
        grouped[key] = grouped[key] ? [...grouped[key], doc] : [doc];
      });
      setDocumentsByField(grouped);
    } catch {
      setDocumentsByField({});
    } finally {
      setDocumentsLoading(false);
    }
  }, [preassessmentId, activeSection]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadDocument = useCallback(async (fieldId: string, sectionId: string, file: File) => {
    if (!preassessmentId) return;
    try {
      const uploaded = await preassessmentDocumentsApi.upload(preassessmentId, file, fieldId, sectionId);
      setDocumentsByField((prev) => {
        const list = prev[fieldId] || [];
        return { ...prev, [fieldId]: [uploaded, ...list.filter((d) => d.id !== uploaded.id)] };
      });
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento del documento');
    }
  }, [preassessmentId, loadDocuments]);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    await preassessmentDocumentsApi.delete(docId);
    await loadDocuments();
  }, [loadDocuments]);

  const handleDownloadDocument = useCallback(async (doc: PreassessmentDocument) => {
    const blob = await preassessmentDocumentsApi.download(doc.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nomeOriginale || 'documento';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const waitForExportJob = useCallback(async (
    createJob: () => Promise<{ id: string; status: 'queued' | 'processing' | 'completed' | 'failed'; errorMessage?: string | null }>,
    fallbackError: string,
  ) => {
    const initialJob = await createJob();
    let job = initialJob;
    const deadline = Date.now() + 5 * 60 * 1000;

    while (job.status === 'queued' || job.status === 'processing') {
      if (Date.now() > deadline) {
        throw new Error("Il file e' ancora in preparazione. Riprova tra qualche istante.");
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      job = await preassessmentApi.getExportJob(job.id);
    }

    if (job.status === 'failed') {
      throw new Error(job.errorMessage || fallbackError);
    }

    const { blob, filename } = await preassessmentApi.downloadExportJob(job.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const [previewDoc, setPreviewDoc] = useState<PreassessmentDocument | null>(null);
  const handlePreviewDocument = useCallback((doc: PreassessmentDocument) => {
    setPreviewDoc(doc);
  }, []);

  const handleDownloadDocumentsZip = useCallback(async () => {
    if (!preassessmentId) return;
    setZipLoading(true);
    try {
      await waitForExportJob(
        () => preassessmentDocumentsApi.createZipJob(preassessmentId),
        'Errore durante la preparazione dello ZIP dei documenti',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il download dei documenti');
    } finally {
      setZipLoading(false);
    }
  }, [preassessmentId, waitForExportJob]);

  useEffect(() => {
    if (!preassessmentId) {
      setIsPreassessmentOnline(false);
      return;
    }
    let alive = true;

    const fetchOnline = async () => {
      try {
        const res = await preassessmentApi.getOnline();
        if (!alive) return;
        setIsPreassessmentOnline(res.preassessmentIds.includes(preassessmentId));
      } catch {
        if (!alive) return;
        setIsPreassessmentOnline(false);
      }
    };

    fetchOnline();
    const interval = setInterval(fetchOnline, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [preassessmentId]);

  useEffect(() => {
    if (!activeClientId) setShowExport(false);
  }, [activeClientId]);

  useEffect(() => {
    if (clientId) setSelectedClientId(clientId);
  }, [clientId]);

  // Auto-open panel from ?panel=chat query param (e.g. coming from dashboard chat icon)
  useEffect(() => {
    if (!preassessmentId) return;
    const params = new URLSearchParams(location.search);
    const p = params.get('panel');
    if (p === 'chat') setPanel('chat');
  }, [preassessmentId, location.search]);

  useEffect(() => {
    if (!isStaff) return;
    let alive = true;
    setClientsLoading(true);
    preassessmentApi
      .listClients()
      .then((res) => {
        if (!alive) return;
        setClients(res);
      })
      .catch(() => {
        if (!alive) return;
        setClients([]);
      })
      .finally(() => {
        if (alive) setClientsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isStaff]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    didInitRef.current = false;

    const load = async () => {
      try {
        if (isStaff && !activeClientId) {
          setPreassessmentId(null);
          setClientInfo(null);
          setData(getInitialData(sections));
          setNotes({});
          setFieldNotes({});
          setUserFieldNotes({});
          setFieldMeta({});
          setNaFields(getInitialNaFields(sections));
          setMacroValidations({});
          setSectionValidations({});
          setFinalValidation(null);
          setAssessmentStatus('in_progress');
          setLastSavedAt(null);
          return;
        }

        if (isStaff && activeClientId) {
          const res = await preassessmentApi.getClient(activeClientId);
          if (!isMounted) return;
          const base = getInitialData(sections);
          setClientInfo(res.client);
          setPreassessmentId(res.preassessment.id);
          setAssessmentStatus(res.preassessment.status || 'in_progress');
          setData({ ...base, ...(res.preassessment.data || {}) });
          setNotes(res.preassessment.notes || {});
          setFieldNotes(res.preassessment.fieldNotes || {});
          setUserFieldNotes(res.preassessment.userFieldNotes || {});
          setFieldMeta(res.preassessment.fieldMeta || {});
          setNaFields(res.preassessment.naFields || getInitialNaFields(sections));
          setMacroValidations(res.preassessment.macroValidations || {});
          setSectionValidations(res.preassessment.sectionValidations || {});
          setFinalValidation(res.preassessment.finalValidation || null);
          lastRemoteUpdatedAtRef.current = res.preassessment.updatedAt;
          setLastSavedAt(new Date(res.preassessment.updatedAt).toLocaleTimeString('it-IT'));
          didInitRef.current = true;
          return;
        }

        const res = await preassessmentApi.get();
        if (!isMounted) return;
        const base = getInitialData(sections);
        setClientInfo(null);
        setPreassessmentId(res.id);
        setAssessmentStatus(res.status || 'in_progress');
        setData({ ...base, ...(res.data || {}) });
        setNotes(res.notes || {});
        setFieldNotes(res.fieldNotes || {});
        setUserFieldNotes(res.userFieldNotes || {});
        setFieldMeta(res.fieldMeta || {});
        setNaFields(res.naFields || getInitialNaFields(sections));
        setMacroValidations(res.macroValidations || {});
        setSectionValidations(res.sectionValidations || {});
        setFinalValidation(res.finalValidation || null);
        lastRemoteUpdatedAtRef.current = res.updatedAt;
        setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
        didInitRef.current = true;
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [activeClientId, isStaff]);

  useEffect(() => {
    if (!activeClientId) return;
    // Staff always starts at dashboard overview when entering a client's checkup
    if (isStaff) {
      setView('dashboard');
      setPanel(null);
      return;
    }
    // For clients, restore the last view so they can continue where they left off
    const key = `checkup_preassessment_view_${activeClientId}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { view?: 'dashboard' | number };
        if (parsed.view === 'dashboard' || typeof parsed.view === 'number') {
          setView(parsed.view);
        } else {
          setView('dashboard');
        }
        setPanel(null);
        return;
      } catch {
        // fallthrough
      }
    }
    setView('dashboard');
    setPanel(null);
  }, [activeClientId, isStaff]);

  useEffect(() => {
    if (location.pathname.startsWith('/checkup/ricerca-clienti')) {
      setView('dashboard');
      setPanel(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof view !== 'number') return;
    const current = sections[view];
    if (current) {
      lastSectionIdRef.current = current.id;
      return;
    }
    if (lastSectionIdRef.current) {
      const idx = sections.findIndex((s) => s.id === lastSectionIdRef.current);
      if (idx >= 0) {
        setView(idx);
        setPanel(null);
        return;
      }
    }
    if (view < 0 || view >= sections.length) {
      setView('dashboard');
      setPanel(null);
    }
  }, [sections, view]);

  useEffect(() => {
    if (!activeClientId) return;
    const key = `checkup_preassessment_view_${activeClientId}`;
    sessionStorage.setItem(key, JSON.stringify({ view }));
  }, [activeClientId, view, panel]);

  useEffect(() => {
    if (!preassessmentId) return;

    const fetchPresence = () => {
      preassessmentApi.getPresence(preassessmentId)
        .then((res) => {
          const next: Record<string, { userId: string; name: string }> = {};
          res.fields.forEach((f) => {
            next[f.fieldId] = { userId: f.userId, name: f.name };
          });
          setActiveEditors(next);
        })
        .catch(() => {
          setActiveEditors({});
        });
    };

    fetchPresence();
    presenceTimerRef.current = setInterval(fetchPresence, 2000);

    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      presenceTimerRef.current = null;
    };
  }, [preassessmentId]);

  useEffect(() => {
    if (!showAssessment || !preassessmentId) return;
    const fetchRemote = async () => {
      try {
        if (isStaff && activeClientId) {
          const res = await preassessmentApi.getClient(activeClientId);
          const updatedAt = res.preassessment.updatedAt;
          if (!updatedAt) return;
          const lastRemote = lastRemoteUpdatedAtRef.current ? new Date(lastRemoteUpdatedAtRef.current).getTime() : 0;
          const nextRemote = new Date(updatedAt).getTime();
          if (nextRemote <= lastRemote) return;
          if (Date.now() - lastLocalChangeRef.current < 1200) return;
          const base = getInitialData(sections);
          setClientInfo(res.client);
          setPreassessmentId(res.preassessment.id);
          setAssessmentStatus(res.preassessment.status || 'in_progress');
          setData({ ...base, ...(res.preassessment.data || {}) });
          setNotes(res.preassessment.notes || {});
          setFieldNotes(res.preassessment.fieldNotes || {});
          setUserFieldNotes(res.preassessment.userFieldNotes || {});
          setFieldMeta(res.preassessment.fieldMeta || {});
          setNaFields(res.preassessment.naFields || getInitialNaFields(sections));
          setMacroValidations(res.preassessment.macroValidations || {});
          setSectionValidations(res.preassessment.sectionValidations || {});
          setFinalValidation(res.preassessment.finalValidation || null);
          setLastSavedAt(new Date(res.preassessment.updatedAt).toLocaleTimeString('it-IT'));
          lastRemoteUpdatedAtRef.current = res.preassessment.updatedAt;
          return;
        }

        const res = await preassessmentApi.get();
        const updatedAt = res.updatedAt;
        if (!updatedAt) return;
        const lastRemote = lastRemoteUpdatedAtRef.current ? new Date(lastRemoteUpdatedAtRef.current).getTime() : 0;
        const nextRemote = new Date(updatedAt).getTime();
        if (nextRemote <= lastRemote) return;
        if (Date.now() - lastLocalChangeRef.current < 1200) return;
        const base = getInitialData(sections);
        setClientInfo(null);
        setPreassessmentId(res.id);
        setAssessmentStatus(res.status || 'in_progress');
        setData({ ...base, ...(res.data || {}) });
        setNotes(res.notes || {});
        setFieldNotes(res.fieldNotes || {});
        setUserFieldNotes(res.userFieldNotes || {});
        setFieldMeta(res.fieldMeta || {});
        setNaFields(res.naFields || getInitialNaFields(sections));
        setMacroValidations(res.macroValidations || {});
        setSectionValidations(res.sectionValidations || {});
        setFinalValidation(res.finalValidation || null);
        setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
        lastRemoteUpdatedAtRef.current = res.updatedAt;
      } catch {
        // ignore polling errors
      }
    };

    fetchRemote();
    const timer = setInterval(fetchRemote, 4000);
    return () => clearInterval(timer);
  }, [showAssessment, preassessmentId, isStaff, activeClientId]);

  useEffect(() => {
    if (!didInitRef.current) return;
    lastLocalChangeRef.current = Date.now();
  }, [data, notes, fieldNotes, userFieldNotes, naFields, macroValidations, sectionValidations]);

  useEffect(() => {
    if (!didInitRef.current) return;
    if (!preassessmentId) return;
    if (!canEditAnswers && !(isStaff && consultantNoteDirtyRef.current)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const payload = isStaff && !canEditAnswers
        ? { fieldNotes }
        : {
            data,
            notes,
            fieldNotes,
            userFieldNotes: isClient ? userFieldNotes : undefined,
            naFields,
            macroValidations,
            sectionValidations: isClient ? sectionValidations : undefined,
          };
      const promise = isStaff && activeClientId
        ? preassessmentApi.updateClient(activeClientId, payload)
        : preassessmentApi.update(payload);
      promise
        .then((res) => {
          setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
          // Aggiorna il ref del timestamp remoto così il polling non ri-applica
          // i dati appena salvati al prossimo tick.
          lastRemoteUpdatedAtRef.current = res.updatedAt;
          if (res.status) {
            setAssessmentStatus(res.status);
          }
          if (res.fieldMeta) {
            setFieldMeta(res.fieldMeta);
          }
          if (res.finalValidation !== undefined) {
            setFinalValidation(res.finalValidation || null);
          }
          // NON aggiornare macroValidations/sectionValidations dalla risposta del save:
          // sono già corrette nello stato locale e aggiornarle triggera un re-salvataggio
          // infinito (entrambe sono nelle dipendenze di questo useEffect).
          // Il polling ogni 4s sincronizza eventuali differenze server-side.
          consultantNoteDirtyRef.current = false;
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
        });
    }, 700);
  }, [data, notes, fieldNotes, userFieldNotes, naFields, macroValidations, sectionValidations, canEditAnswers, isClient, isStaff, activeClientId, preassessmentId]);

  const emitFieldActive = useCallback((fieldId: string) => {
    if (!preassessmentId || !canEditAnswers) return;
    preassessmentApi.setPresenceActive(preassessmentId, fieldId)
      .catch(() => preassessmentApi.getPresence(preassessmentId).then((res) => {
        const next: Record<string, { userId: string; name: string }> = {};
        res.fields.forEach((f) => {
          next[f.fieldId] = { userId: f.userId, name: f.name };
        });
        setActiveEditors(next);
      }).catch(() => {}));
  }, [preassessmentId, canEditAnswers]);

  const emitFieldInactive = useCallback((fieldId: string) => {
    if (!preassessmentId || !canEditAnswers) return;
    preassessmentApi.setPresenceInactive(preassessmentId, fieldId).catch(() => {});
  }, [preassessmentId, canEditAnswers]);

  const handleChange = useCallback((id: string, val: string) => {
    if (!canEditAnswers) return;
    setData((p) => ({ ...p, [id]: val }));
    emitFieldActive(id);
  }, [canEditAnswers, emitFieldActive]);

  const handleFieldNote = useCallback((id: string, val: string) => {
    if (!isStaff) return;
    consultantNoteDirtyRef.current = true;
    setFieldNotes((p) => ({ ...p, [id]: val }));
  }, [isStaff]);

  const handleUserFieldNote = useCallback((id: string, val: string) => {
    if (!canEditAnswers || !isClient) return;
    setUserFieldNotes((p) => ({ ...p, [id]: val }));
  }, [canEditAnswers, isClient]);

  const handleSectionNote = useCallback((id: string, val: string) => {
    if (!canEditAnswers) return;
    setNotes((p) => ({ ...p, [id]: val }));
  }, [canEditAnswers]);

  const handleNaChange = useCallback((id: string, checked: boolean) => {
    if (!canEditAnswers) return;
    setNaFields((p) => ({ ...p, [id]: checked }));
    if (checked) {
      setData((p) => ({ ...p, [id]: '' }));
    }
  }, [canEditAnswers]);

  const handleSectionSkip = useCallback((sectionFields: FieldSpec[]) => {
    if (!canEditAnswers) return;
    const allNA = sectionFields.every((f) => naFields[f.id]);
    const newValue = !allNA;
    setNaFields((prev) => {
      const updates: Record<string, boolean> = {};
      sectionFields.forEach((f) => { updates[f.id] = newValue; });
      return { ...prev, ...updates };
    });
    if (newValue) {
      setData((prev) => {
        const updates: Record<string, string> = {};
        sectionFields.forEach((f) => { updates[f.id] = ''; });
        return { ...prev, ...updates };
      });
    }
  }, [canEditAnswers, naFields]);

  const handleRevokeValidation = useCallback((macroId: string) => {
    if (!activeClientId) return;
    if (isFinalClosed) return;
    setMacroValidations((p) => {
      const next = { ...p };
      delete next[macroId];
      return next;
    });
  }, [activeClientId, isFinalClosed]);

  const handleValidateSection = useCallback((sectionId: string) => {
    if (!activeClientId || !user) return;
    if (isFinalClosed) return;
    const name = `${user.nome} ${user.cognome}`.trim() || user.email;
    setSectionValidations((p) => ({
      ...p,
      [sectionId]: {
        by: { id: user.id, name, ruolo: user.ruolo },
        at: new Date().toISOString(),
      },
    }));
  }, [activeClientId, isFinalClosed, user]);

  const handleRevokeSectionValidation = useCallback((sectionId: string) => {
    if (!activeClientId) return;
    if (isFinalClosed) return;
    setSectionValidations((p) => {
      const next = { ...p };
      delete next[sectionId];
      return next;
    });
  }, [activeClientId, isFinalClosed]);

  const handleFinalValidate = useCallback(async () => {
    if (!isClient || !user?.superOwner || finalValidation) return;
    const confirmed = await confirm({
      title: 'Chiudere e validare il checkup?',
      message: 'Confermi la chiusura e la validazione finale del checkup? Dopo la validazione il licenziatario riceverà la notifica.',
      confirmText: 'Chiudi e valida',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      const res = await preassessmentApi.finalValidate();
      setFinalValidation(res.finalValidation || null);
      setAssessmentStatus(res.status || 'concluso');
      setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
      setReportNotice('Checkup chiuso e validato correttamente dal Super-owner.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la validazione finale');
    }
  }, [confirm, finalValidation, isClient, user?.superOwner]);

  const handleReopenFinalValidation = useCallback(async () => {
    if (!isClient || !user?.superOwner || !finalValidation) return;
    const confirmed = await confirm({
      title: 'Riaprire il checkup?',
      message: 'Confermi la riapertura del checkup? La validazione finale verrà rimossa e il checkup tornerà modificabile.',
      confirmText: 'Riapri checkup',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      const res = await preassessmentApi.reopenFinalValidation();
      setFinalValidation(res.finalValidation || null);
      setAssessmentStatus(res.status || 'in_progress');
      setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
      setReportNotice('Checkup riaperto correttamente dal Super-owner.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la riapertura del checkup');
    }
  }, [confirm, finalValidation, isClient, user?.superOwner]);

  const isOwnerSection = useCallback(
    (section: SectionSpec) => section.macro === 'k' || section.fields.some((field) => /^owner_[a-j]_/.test(field.id)),
    [],
  );
  const countedSections = useMemo(
    () => sections.filter((section) => !isOwnerSection(section)),
    [sections, isOwnerSection],
  );
  const countedMacroAreas = useMemo(
    () => macroAreas.filter((macro) => macro.id !== 'k' && countedSections.some((section) => section.macro === macro.id)),
    [macroAreas, countedSections],
  );
  const isFieldResolved = useCallback(
    (field: FieldSpec) => !!naFields[field.id] || !!data[field.id]?.trim(),
    [data, naFields],
  );

  // Count-based metrics (for display "N/M" labels)
  const totalReq = useMemo(
    () => countedSections.reduce((a, s) => a + s.fields.filter((f) => f.required).length, 0),
    [countedSections],
  );
  const totalFilled = useMemo(
    () => countedSections.reduce((a, s) => a + s.fields.filter((f) => f.required && isFieldResolved(f)).length, 0),
    [countedSections, isFieldResolved],
  );
  const totalFields = useMemo(
    () => countedSections.reduce((a, s) => a + s.fields.length, 0),
    [countedSections],
  );
  const totalNA = useMemo(
    () => countedSections.reduce((a, s) => a + s.fields.filter((f) => f.required && naFields[f.id]).length, 0),
    [countedSections, naFields],
  );
  const pct = totalReq > 0 ? Math.min(100, Math.round((totalFilled / totalReq) * 100)) : 0;

  const sDone = (s: SectionSpec) => s.fields.filter((f) => f.required && isFieldResolved(f)).length;
  const sTotal = (s: SectionSpec) => s.fields.filter((f) => f.required).length;
  const sNA = (s: SectionSpec) => s.fields.filter((f) => f.required && naFields[f.id]).length;

  const fieldMatchesFilter = (f: FieldSpec) => {
    if (dashFilter === 'all') return true;
    if (dashFilter === 'completed') return isFieldResolved(f);
    if (dashFilter === 'todo') return !naFields[f.id] && !data[f.id]?.trim();
    if (dashFilter === 'na') return !!naFields[f.id];
    return true;
  };

  const sectionMatchesDashboardFilter = useCallback((section: SectionSpec) => {
    const total = sTotal(section);
    const done = sDone(section);
    const naCount = sNA(section);

    if (dashFilter === 'all') return true;
    if (dashFilter === 'completed') return total > 0 && done === total;
    if (dashFilter === 'todo') return total > 0 && done < total;
    if (dashFilter === 'na') return total > 0 && naCount === total;
    return true;
  }, [dashFilter, isFieldResolved, data, naFields]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const t = search.toLowerCase();
    return sections.filter((s) =>
      s.title.toLowerCase().includes(t)
      || s.description.toLowerCase().includes(t)
      || s.fields.some((f) => f.label.toLowerCase().includes(t)),
    );
  }, [search, sections]);

  const grouped = useMemo(
    () => macroAreas
      .map((m) => ({ ...m, sections: filtered.filter((s) => s.macro === m.id) }))
      .filter((g) => g.sections.length > 0),
    [filtered, macroAreas],
  );

  const isOwnerForMacro = (macroId: string) => {
    if (!isClient || !user?.email) return false;
    const ownerField = OWNER_EMAIL_BY_MACRO[macroId];
    if (!ownerField) return false;
    const ownerEmail = (data[ownerField] || '').trim().toLowerCase();
    return ownerEmail !== '' && ownerEmail === user.email.toLowerCase();
  };

  const dashFilterLabel = dashFilter === 'completed'
    ? 'Completati'
    : dashFilter === 'todo'
      ? 'Da completare'
      : dashFilter === 'na'
        ? 'N/A'
        : 'Tutti';

  const exportCSV = () => {
    const csv = buildPreassessmentCsv({
      sections,
      macroAreas,
      data,
      notes,
      userFieldNotes,
      fieldNotes,
      naFields,
      excludeNA: exportMode === 'excludeNA',
      includeConsultantNotes: exportIncludeConsultantNotes,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre_assessment_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogoDataUrl = useCallback(async () => {
    if (logoDataUrlRef.current) return logoDataUrlRef.current;
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    try {
      const res = await fetch('/logo_resolv.png');
      if (!res.ok) throw new Error('Logo non disponibile');
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Errore logo'));
        reader.readAsDataURL(blob);
      });
      logoDataUrlRef.current = dataUrl;
      return dataUrl;
    } catch {
      return transparentPixel;
    }
  }, []);

  // Flattens transparent pixels against a solid background color.
  // Needed because Puppeteer PDF does not composite <img> transparent pixels
  // against CSS background-color — they render against the white PDF page instead.
  const flattenLogoTransparency = useCallback((dataUrl: string, bgColor: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        // alpha: false → opaque canvas, toDataURL will produce PNG with no alpha channel
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) { resolve(dataUrl); return; }
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  // Carica il config PDF dal backend all'avvio
  useEffect(() => {
    pdfConfigApi.getConfig()
      .then(setPdfConfig)
      .catch(() => { /* usa il default */ });
  }, []);

  const buildReportHtml = useCallback(async () => {
    const nowDate = new Date();
    const nowLabel = nowDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = nowDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const clientNomeCompleto = clientInfo
      ? `${clientInfo.nome || ''} ${clientInfo.cognome || ''}`.trim()
      : '';
    const clientRagioneSociale = user?.client?.ragioneSociale || user?.client?.nome || null;
    const ragione =
      clientInfo?.ragioneSociale ||
      clientRagioneSociale ||
      clientInfo?.azienda ||
      clientNomeCompleto ||
      'Società non specificata';
    const clientEmail = clientInfo?.email || '';
    const logoUrl = await getLogoDataUrl();
    // Single source of truth for the cover header band background.
    // The logo transparency is flattened against the exact same color,
    // so no darker rectangle remains visible around the logo in the PDF.
    const logoForCover = logoUrl;
    const sanitize = (value?: string) => (value || '').replace(/[✅✔️✔🟢🟩]/g, '').trim();

    // Carica tutti i documenti del preassessment per includerli nel report
    let allDocsByField: Record<string, { nomeOriginale: string }[]> = {};
    if (documentsEnabled && preassessmentId) {
      try {
        const allDocs = await preassessmentDocumentsApi.list(preassessmentId);
        allDocs.forEach((d) => {
          if (!allDocsByField[d.fieldId]) allDocsByField[d.fieldId] = [];
          allDocsByField[d.fieldId].push({ nomeOriginale: d.nomeOriginale });
        });
      } catch {
        // silently ignore — documenti non disponibili
      }
    }
    const excludeNA = exportMode === 'excludeNA';
    const includeNotes = exportIncludeConsultantNotes;

    // ── Build cover HTML ────────────────────────────────────────────────────
    const licenziatarioNome = clientInfo?.studioNome || user?.licenziatarioNome || (!isClient ? studioNome : null);
    const escapeHtml = (value?: string) => (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const cssColor = (value?: string, fallback = 'transparent') => value && value.trim() ? value : fallback;
    const coverElements = (pdfConfig.coverElements ?? []).slice().sort((a, b) => a.zIndex - b.zIndex);
    const coverElementHtml = coverElements
      .filter((element) => element.visible)
      .map((element) => {
        const justify = element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start';
        const baseStyle = [
          `left:${element.x}%`,
          `top:${element.y}%`,
          `width:${element.width}%`,
          `min-height:${element.height}%`,
          `z-index:${element.zIndex}`,
          `justify-content:${justify}`,
          `text-align:${element.align}`,
          `color:${cssColor(element.color, '#ffffff')}`,
          `font-family:${escapeHtml(element.fontFamily || pdfConfig.fontFamily || 'Noto Sans')}`,
          `font-size:${element.fontSize}px`,
          `font-weight:${escapeHtml(String(element.fontWeight || 'normal'))}`,
          `opacity:${element.opacity ?? 1}`,
          `line-height:${element.lineHeight ?? 1.3}`,
          `letter-spacing:${element.letterSpacing ?? 0}em`,
          `background:${cssColor(element.backgroundColor)}`,
          `border:${element.borderWidth ? `${element.borderWidth}px solid ${cssColor(element.borderColor, 'transparent')}` : 'none'}`,
          `border-radius:${element.borderRadius ?? 0}px`,
          `text-transform:${element.uppercase ? 'uppercase' : 'none'}`,
        ].join(';');

        let innerHtml = '';
        if (element.type === 'logo') {
          innerHtml = logoForCover ? `<img src="${logoForCover}" alt="Logo" class="cover-element-logo" />` : '<div class="cover-element-logo-placeholder"></div>';
        } else if (element.type === 'company') {
          innerHtml = escapeHtml(ragione);
        } else if (element.type === 'date') {
          innerHtml = escapeHtml(`Generato il ${nowLabel} · ${nowTime}`);
        } else if (element.type === 'consultant') {
          innerHtml = escapeHtml(licenziatarioNome ? `Consulente: ${licenziatarioNome}` : '');
        } else if (element.type === 'features') {
          innerHtml = `<div class="cover-element-features">${(element.items ?? []).map((item) => `<div class="cover-element-feature"><span class="dot"></span><span>${escapeHtml(item)}</span></div>`).join('')}</div>`;
        } else {
          innerHtml = escapeHtml(element.text || '');
        }

        return `<div class="cover-element cover-element--${element.type}" data-element-id="${escapeHtml(element.id)}" style="${baseStyle}">${innerHtml}</div>`;
      })
      .join('');

    let html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
      :root {
        --q-font-size: ${pdfConfig.questionFontSize}pt;
        --a-font-size: ${pdfConfig.answerFontSize}pt;
        --sh-font-size: ${pdfConfig.sectionHeaderFontSize}pt;
        --body-font: '${pdfConfig.fontFamily}', system-ui, Helvetica, Arial, sans-serif;
        --border-width: ${pdfConfig.borderWidth}px;
        /* Cover */
        --cv-bg: linear-gradient(135deg, ${pdfConfig.coverBgStart ?? '#1e3a8a'} 0%, ${pdfConfig.coverBgMid ?? '#1e40af'} 45%, ${pdfConfig.coverBgEnd ?? '#0f172a'} 100%);
      }
      @page { size: A4; margin: 0mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { height: auto; }
      body {
        font-family: var(--body-font);
        background: #f6f8fb;
        color: #1c2738;
        font-size: 11pt;
        line-height: 1.5;
      }
      .pdf-page {
        width: 210mm;
        height: 297mm;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
        background: #f6f8fb;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
      }
      .pdf-page.last {
        page-break-after: auto;
        break-after: auto;
      }

      /* === COVER === */
      .cover-page { padding: 0; background: #f6f8fb; }
      .cover {
        height: 100%; width: 100%;
        padding: 40px 36px;
        border-radius: 18px;
        color: #eef2ff;
        background: var(--cv-bg);
        border: 1px solid rgba(255,255,255,0.12);
        display: flex; flex-direction: column;
        position: relative; overflow: hidden; box-sizing: border-box;
      }
      .cover-content { position: relative; z-index: 1; display: block; flex: 1; width: 100%; height: 100%; }
      .cover-element {
        position: absolute;
        display: flex;
        align-items: flex-start;
        white-space: pre-wrap;
        overflow: hidden;
        box-sizing: border-box;
      }
      .cover-element-logo { width: 100%; height: 100%; object-fit: contain; }
      .cover-element-logo-placeholder { width: 100%; height: 100%; border-radius: 8px; background: rgba(255,255,255,0.24); }
      .cover-element-features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; width: 100%; }
      .cover-element-feature { display: flex; gap: 8px; align-items: flex-start; }
      .cover-element-feature .dot { width: 8px; height: 8px; border-radius: 999px; background: #22d3ee; margin-top: 5px; flex: none; }

      /* ---- Page corner accent (echoes cover style on every content page) ---- */
      .mac-corner { position: absolute; top: 0; right: 0; width: 34px; height: 100%; pointer-events: none; }
      .mac-cs { position: absolute; inset: 0; }

      .intro-page { }

      .summary {
        margin: 10px 0 8px;
        padding: 14px 16px;
        border-radius: 12px;
        background: #f1f5ff;
        border: 1px solid #dfe7ff;
      }
      .summary-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
      .summary-item { background:#fff; border:1px solid #e6ebf5; border-radius:10px; padding:12px; }
      .summary-item .label { font-size:10px; color:#64748b; text-transform: uppercase; letter-spacing:0.08em; }
      .summary-item .value { font-size:16px; font-weight:700; color:#0f172a; margin-top:6px; word-break: break-word; }

      .client-summary {
        margin: 10px 0 6px;
        padding: 12px 16px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
      }
      .client-summary h3 {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 10px;
      }
      .client-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; }
      .client-item .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
      .client-item .value { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px; word-break: break-word; }

      .index-page {
        margin-top: 10px;
        padding: 14px 16px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
      }
      .index-title {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 12px;
      }
      .index-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; align-items: start; }
      .index-col { display: flex; flex-direction: column; }
      .index-group { margin-bottom: 10px; }
      .index-group-title {
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 5px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
      }
      .index-item {
        font-size: 10px;
        color: #1f2937;
        padding: 2px 0 2px 9px;
        border-left: 2px solid #e2e8f0;
        margin-bottom: 3px;
        line-height: 1.4;
      }

      /* === MACRO AREA PAGES === */
      .section-page { padding: 5mm; box-sizing: border-box; }
      .section-page.last { display: flex; flex-direction: column; padding: 5mm; box-sizing: border-box; }
      .macro-frame {
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 6px;
        overflow: hidden;
        box-sizing: border-box;
        border: var(--border-width) solid #3b82f6;
      }
      .section-page.last .macro-frame { flex: 1; height: auto; }
      .macro-hdr { display: flex; align-items: center; padding: 7px 14px; flex-shrink: 0; position: relative; overflow: hidden; }
      .macro-hdr-name { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #ffffff; }
      .macro-hdr-page { margin-left: auto; font-size: 9px; color: rgba(255,255,255,0.8); }
      .macro-col-hdr { display: grid; grid-template-columns: 1fr 1fr; flex-shrink: 0; }
      .col-q, .col-a { padding: 5px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
      .col-q { border-right: 1px solid; }
      .macro-grid { display: grid; grid-template-columns: 1fr 1fr; flex: 1; align-content: start; overflow: hidden; padding-bottom: 8px; }
      .sec-hdr {
        grid-column: 1 / -1;
        padding: 6px 12px 5px;
        font-size: var(--sh-font-size);
        font-weight: 600;
        background: #f4f7fb;
        border-top: 1px solid #e8edf5;
        border-bottom: 1px solid #e2e8f0;
      }
      .sec-hdr:first-child { border-top: none; }
      .fq {
        padding: 6px 12px;
        font-size: var(--q-font-size);
        font-weight: normal;
        color: #334155;
        border-right: 1px solid #e8edf5;
        border-bottom: 1px solid #f1f5f9;
        word-break: break-word;
        line-height: 1.45;
      }
      .fa {
        padding: 6px 12px;
        font-size: var(--a-font-size);
        color: #1e293b;
        border-bottom: 1px solid #f1f5f9;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.45;
      }
      .empty-val { color: #94a3b8; font-style: italic; }
      .fn { font-size: 9px; font-style: italic; margin-top: 3px; padding-left: 6px; line-height: 1.3; }
      .fn .note-lbl { font-weight: 700; margin-right: 3px; }
      .user-note { color: #475569; border-left: 2px solid #e2e8f0; }
      .consultant-note { color: #1e40af; border-left: 2px solid #c7d2fe; }
      .sec-note-row {
        grid-column: 1 / -1;
        margin: 3px 8px;
        padding: 5px 10px;
        background: #fefce8;
        border: 1px solid #fef08a;
        border-radius: 4px;
        font-size: 9.5px;
        color: #713f12;
      }
      .doc-row { grid-column: 1 / -1; padding: 5px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #475569; }
      .doc-row .doc-title { font-weight: 700; margin-bottom: 2px; color: #334155; }
      .doc-row .doc-item { padding: 1px 0; }

      .footer {
        margin-top: 26px;
        padding: 16px 24px;
        background: linear-gradient(135deg, #0c162b 0%, #132844 50%, #1f3c63 100%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 12px;
        box-shadow: 0 14px 28px rgba(12, 25, 46, 0.18);
      }
      .footer-logo { display: flex; align-items: center; gap: 16px; }
      .footer-logo img { height: 42px; width: auto; }
      .footer-text { font-size: 10px; color: #e7ecf5; line-height: 1.6; }
      .footer-text .copyright { font-size: 9px; color: #c7d1df; margin-top: 6px; }
    </style></head><body>

          <div class="pdf-page cover-page">
            <div class="cover">
              <div class="cover-content">
                ${coverElementHtml}
              </div>
            </div>
          </div>

          <div class="pdf-page intro-page" style="padding: 5mm; box-sizing: border-box;">
          <div style="border: 1.5px solid #1e3a8a; border-radius: 6px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
            <div style="background: #1e3a8a; color: white; padding: 7px 14px; flex-shrink: 0; display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.06em;">RIEPILOGO DEL PREASSESSMENT</span>
              <span style="margin-left: auto; font-size: 9px; color: rgba(255,255,255,0.75);">${ragione}</span>
            </div>
            <div style="flex: 1; overflow: hidden; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
              <div class="client-summary" style="margin: 0;">
                <h3>Cliente</h3>
                <div class="client-grid">
                  ${clientNomeCompleto ? `<div class="client-item"><div class="label">Nominativo</div><div class="value">${clientNomeCompleto}</div></div>` : ''}
                  ${clientEmail ? `<div class="client-item"><div class="label">Email</div><div class="value">${clientEmail}</div></div>` : ''}
                  <div class="client-item"><div class="label">Ragione sociale</div><div class="value">${ragione}</div></div>
                  <div class="client-item"><div class="label">Codice fiscale / Partita IVA</div><div class="value">${data.cf_piva || '-'}</div></div>
                  <div class="client-item"><div class="label">Sede legale</div><div class="value">${data.sede_legale || '-'}</div></div>
                </div>
              </div>
              <div class="summary" style="margin: 0;">
                <div class="summary-grid">
                  <div class="summary-item"><div class="label">Sezioni</div><div class="value">${sections.length}</div></div>
                  <div class="summary-item"><div class="label">Campi obbligatori</div><div class="value">${totalReq}</div></div>
                  <div class="summary-item"><div class="label">Compilati</div><div class="value">${totalFilled}/${totalReq} (${pct}%)</div></div>
                </div>
              </div>`;

    const sectionsByMacro = macroAreas.map((m) => ({
      macro: m.label,
      color: m.color,
      sections: sections.filter((s) => s.macro === m.id),
    })).filter((g) => g.sections.length > 0);

    // Build flat list of all index sections with sequential numbering
    const allIdxSections: { num: number; title: string; color: string; macroLabel: string }[] = [];
    let idxNum = 1;
    sectionsByMacro.forEach((g) => {
      g.sections.forEach((s) => {
        allIdxSections.push({ num: idxNum, title: s.title, color: g.color, macroLabel: g.macro });
        idxNum++;
      });
    });
    // Col 3 = solo sezioni Owner; col 1+2 = tutto il resto, divise per macro group intero
    const ownerSections = allIdxSections.filter((s) => s.macroLabel.toLowerCase().includes('owner'));
    const normalSections = allIdxSections.filter((s) => !s.macroLabel.toLowerCase().includes('owner'));

    // Raggruppa le sezioni normali per macro (preservando l'ordine)
    const normalGroups: { macroLabel: string; color: string; items: typeof allIdxSections }[] = [];
    normalSections.forEach((s) => {
      const last = normalGroups[normalGroups.length - 1];
      if (last && last.macroLabel === s.macroLabel) { last.items.push(s); }
      else { normalGroups.push({ macroLabel: s.macroLabel, color: s.color, items: [s] }); }
    });

    // Trova il punto di taglio al confine di macro group più vicino alla metà
    const midpoint = Math.ceil(normalSections.length / 2);
    let running = 0; let splitAt = normalGroups.length;
    for (let i = 0; i < normalGroups.length; i++) {
      running += normalGroups[i].items.length;
      if (running >= midpoint) { splitAt = i + 1; break; }
    }
    const idxCols = [
      normalGroups.slice(0, splitAt).flatMap((g) => g.items),
      normalGroups.slice(splitAt).flatMap((g) => g.items),
      ownerSections,
    ];

    html += `<div class="index-page" style="margin: 0; flex: 1;"><div class="index-title">Indice</div><div class="index-cols">`;
    idxCols.forEach((colSections) => {
      html += `<div class="index-col">`;
      let curMacro = '';
      colSections.forEach((s) => {
        if (s.macroLabel !== curMacro) {
          if (curMacro) html += `</div>`;
          html += `<div class="index-group"><div class="index-group-title" style="color:${s.color};">${s.macroLabel}</div>`;
          curMacro = s.macroLabel;
        }
        html += `<div class="index-item">${s.num}. ${s.title}</div>`;
      });
      if (colSections.length > 0) html += `</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
    html += `</div></div></div>`;

    // Build macro area groups with paginated items
    type MacroItemType =
      | { type: 'section_header'; title: string; sectionId: string }
      | { type: 'field'; field: FieldSpec; sectionId: string }
      | { type: 'section_note'; note: string }
      | { type: 'docs'; docs: { nomeOriginale: string }[] };

    const macroGroups: { macro: MacroAreaSpec; items: MacroItemType[] }[] = [];
    macroAreas.forEach((macro) => {
      const macroSections = sections.filter((s) => s.macro === macro.id);
      const items: MacroItemType[] = [];
      macroSections.forEach((s) => {
        const fields = excludeNA ? s.fields.filter((f) => !naFields[f.id]) : s.fields;
        if (fields.length === 0) return;
        items.push({ type: 'section_header', title: s.title, sectionId: s.id });
        fields.forEach((f) => items.push({ type: 'field', field: f, sectionId: s.id }));
        const sectionNote = sanitize(notes[s.id]);
        if (sectionNote) items.push({ type: 'section_note', note: sectionNote });
        if (documentsEnabled && pdfConfig.showDocuments) {
          const sectionDocs = s.fields.flatMap((f) => allDocsByField[f.id] || []);
          if (sectionDocs.length > 0) items.push({ type: 'docs', docs: sectionDocs });
        }
      });
      if (items.length > 0) macroGroups.push({ macro, items });
    });

    // Paginazione:
    // - Default: 26 domande per pagina, sezioni si spezzano liberamente
    // - SECTIONS_PER_PAGE_OVERRIDE: max N sezioni per pagina (E → 3)
    // - SECTION_INTEGRITY_MACROS: sezioni rimangono intere, si impacchettano
    //   sulla stessa pagina solo se la somma domande è ≤ MAX_Q (H)
    const MAX_Q = pdfConfig.maxQuestionsPerPage;
    const SECTIONS_PER_PAGE_OVERRIDE: Record<string, number> = {};
    const SECTION_INTEGRITY_MACROS = new Set<string>();
    pdfConfig.macroOverrides.forEach((ov) => {
      if (ov.mode === 'sections') SECTIONS_PER_PAGE_OVERRIDE[ov.macroId] = ov.limit;
      else if (ov.mode === 'integrity') SECTION_INTEGRITY_MACROS.add(ov.macroId);
    });

    type MacroPage = { macro: MacroAreaSpec; chunk: MacroItemType[]; pageNum: number; totalPages: number; };
    const allMacroPages: MacroPage[] = [];

    macroGroups.forEach(({ macro, items }) => {
      const chunks: MacroItemType[][] = [];
      let current: MacroItemType[] = [];

      if (SECTION_INTEGRITY_MACROS.has(macro.id)) {
        // Sezioni intere: si impacchettano se la somma domande ≤ MAX_Q, altrimenti nuova pagina
        const sectionBlocks: MacroItemType[][] = [];
        let curBlock: MacroItemType[] = [];
        items.forEach((item) => {
          if (item.type === 'section_header' && curBlock.length > 0) {
            sectionBlocks.push(curBlock); curBlock = [];
          }
          curBlock.push(item);
        });
        if (curBlock.length > 0) sectionBlocks.push(curBlock);

        let qCount = 0;
        sectionBlocks.forEach((block) => {
          const bq = block.filter(i => i.type === 'field').length;
          if (qCount + bq > MAX_Q && current.length > 0) {
            chunks.push(current); current = []; qCount = 0;
          }
          block.forEach(i => current.push(i));
          qCount += bq;
        });

      } else {
        const sectLimit = SECTIONS_PER_PAGE_OVERRIDE[macro.id];
        if (sectLimit !== undefined) {
          // Max N sezioni per pagina
          let sectCount = 0;
          items.forEach((item) => {
            if (item.type === 'section_header') {
              if (sectCount >= sectLimit && current.length > 0) {
                chunks.push(current); current = []; sectCount = 0;
              }
              sectCount++;
            }
            current.push(item);
          });
        } else {
          // Default: 26 domande per pagina, sezioni si spezzano
          let qCount = 0;
          items.forEach((item) => {
            if (item.type === 'field' && qCount >= MAX_Q) {
              chunks.push(current); current = []; qCount = 0;
            }
            current.push(item);
            if (item.type === 'field') qCount++;
          });
        }
      }
      if (current.length > 0) chunks.push(current);

      chunks.forEach((chunk, ci) =>
        allMacroPages.push({ macro, chunk, pageNum: ci + 1, totalPages: chunks.length })
      );
    });

    allMacroPages.forEach(({ macro, chunk, pageNum, totalPages }, pi) => {
      const isLastPage = pi === allMacroPages.length - 1;
      const c = macro.color;
      const cLight = c + '14';
      const cMid = c + '35';
      html += `<div class="pdf-page section-page${isLastPage ? ' last' : ''}">`;
      html += `<div class="macro-frame" style="border-color:${c};">`;
      // Macro area header
      html += `<div class="macro-hdr" style="background:${c};">`;
      // Corner accent — 3 white diagonal stripes echoing the cover design
      html += `<div class="mac-corner">`;
      html += `<div class="mac-cs" style="clip-path:polygon(50% 0%,100% 0%,100% 50%);background:rgba(255,255,255,0.22);"></div>`;
      html += `<div class="mac-cs" style="clip-path:polygon(15% 0%,40% 0%,100% 85%,100% 60%);background:rgba(255,255,255,0.15);"></div>`;
      html += `<div class="mac-cs" style="clip-path:polygon(0% 0%,18% 0%,100% 100%,82% 100%);background:rgba(255,255,255,0.08);"></div>`;
      html += `</div>`;
      const _macroHeaderLabel = pdfConfig.showMacroLetter
        ? `${macro.id.toUpperCase()} \u2013 ${macro.label.toUpperCase()}`
        : macro.label.toUpperCase();
      html += `<span class="macro-hdr-name">${_macroHeaderLabel}</span>`;
      if (totalPages > 1) html += `<span class="macro-hdr-page">${pageNum} / ${totalPages}</span>`;
      html += `</div>`;
      // Column headers
      html += `<div class="macro-col-hdr" style="background:${cLight};border-bottom:1px solid ${cMid};">`;
      html += `<div class="col-q" style="color:${c};border-right-color:${cMid};">Domande</div>`;
      html += `<div class="col-a" style="color:${c};">Risposte</div>`;
      html += `</div>`;
      // Fields grid
      html += `<div class="macro-grid">`;
      chunk.forEach((item) => {
        if (item.type === 'section_header') {
          html += `<div class="sec-hdr" style="color:${c};border-bottom-color:${cMid};">${item.title}</div>`;
        } else if (item.type === 'field') {
          const f = item.field;
          const isNA = !!naFields[f.id];
          const rawValue = isNA ? 'N/A' : sanitize(data[f.id]);
          const v = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
          const un = pdfConfig.showUserNotes && !isNA ? sanitize(userFieldNotes[f.id]) : '';
          const consultantNote = includeNotes && pdfConfig.showConsultantNotes && !isNA ? sanitize(fieldNotes[f.id]) : '';
          const displayLabel = pdfConfig.showAsterisks ? f.label : f.label.replace(/\s*\*+\s*$/g, '');
          html += `<div class="fq">${displayLabel}</div>`;
          html += `<div class="fa">${v ? v.replace(/\n/g, '<br>') : '<span class="empty-val">—</span>'}`;
          if (un) html += `<div class="fn user-note"><span class="note-lbl">Nota:</span>${un.replace(/\n/g, '<br>')}</div>`;
          if (consultantNote) html += `<div class="fn consultant-note"><span class="note-lbl">Consulente:</span>${consultantNote.replace(/\n/g, '<br>')}</div>`;
          html += `</div>`;
        } else if (item.type === 'section_note') {
          html += `<div class="sec-note-row"><strong>Note sezione:</strong> ${item.note.replace(/\n/g, '<br>')}</div>`;
        } else if (item.type === 'docs' && item.docs) {
          html += `<div class="doc-row"><div class="doc-title">Documenti allegati (${item.docs.length})</div>`;
          item.docs.forEach((d) => { html += `<div class="doc-item">📎 ${d.nomeOriginale}</div>`; });
          html += `</div>`;
        }
      });
      html += `</div>`; // end macro-grid
      html += `</div>`; // end macro-frame
      if (isLastPage) {
        html += `<div class="footer"><div class="footer-logo">`;
        if (pdfConfig.footerShowLogo !== false) {
          html += `<img src="${logoUrl}" alt="Resolv" />`;
        }
        html += `<div class="footer-text">
            ${pdfConfig.footerMainText ?? 'Software gestionale per studi legali e professionisti del settore creditizio'}<br>
            Report generato il ${nowLabel}
            <div class="copyright">© ${new Date().getFullYear()} ${pdfConfig.footerCopyrightText ?? 'Resolv. Tutti i diritti riservati.'}</div>
          </div></div></div>`;
      }
      html += `</div>`; // end pdf-page
    });

    html += `
    </body></html>`;

    return html;
  }, [
    data,
    notes,
    userFieldNotes,
    fieldNotes,
    naFields,
    macroAreas,
    sections,
    exportMode,
    exportIncludeConsultantNotes,
    isClient,
    clientInfo,
    getLogoDataUrl,
    flattenLogoTransparency,
    totalReq,
    totalFilled,
    pct,
    documentsEnabled,
    preassessmentId,
    studioLogoUrl,
    pdfConfig,
  ]);

  const generatePDF = async () => {
    setPdfLoading(true);
    setReportNotice(null);
    try {
      const html = await buildReportHtml();
      await waitForExportJob(
        () => preassessmentApi.createPdfJob(html),
        'Errore durante la generazione del PDF',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la generazione del PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const saveReport = async () => {
    if (!preassessmentId) return;
    setSavingReport(true);
    setReportNotice(null);
    try {
      const html = await buildReportHtml();
      const saved = await preassessmentReportApi.save(preassessmentId, html);
      setReportNotice(`Report salvato: ${saved.filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio del report');
    } finally {
      setSavingReport(false);
    }
  };

  const loadChat = useCallback(async (markRead = false) => {
    if (!preassessmentId) return;
    try {
      const msgs = await preassessmentChatApi.getMessages(preassessmentId, CHAT_SECTION_ID);
      setChatMessages(msgs);
      const unread = msgs.filter((msg) => !msg.letto && msg.userId !== user?.id);
      setChatUnreadCount(unread.length);
      if (markRead && unread.length > 0) {
        for (const msg of unread) {
          preassessmentChatApi.markAsRead(msg.id).catch(() => {});
        }
        // Bulk-mark chat as seen so the dashboard badge resets
        threadsUnreadApi.markSeen(preassessmentId, 'chat').catch(() => {});
        window.dispatchEvent(new CustomEvent('checkup:mark-seen', { detail: 'chat' }));
        setChatUnreadCount(0);
      }
    } catch {
      // ignore
    }
  }, [preassessmentId, user?.id]);

  const loadTickets = useCallback(async () => {
    if (!preassessmentId) return;
    try {
      const res = await preassessmentTicketApi.list(preassessmentId);
      const prevIds = lastTicketIdsRef.current;
      const nextIds = new Set(res.map((t) => t.id));
      if (prevIds.size > 0 && isStaff) {
        const newTickets = res.filter((t) => !prevIds.has(t.id) && t.status === 'open');
        if (newTickets.length > 0) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
          } catch {
            // ignore audio errors
          }
        }
      }
      lastTicketIdsRef.current = nextIds;
      setTickets(res);
    } catch {
      setTickets([]);
    }
  }, [preassessmentId, isStaff]);

  const loadAlerts = useCallback(async () => {
    if (!preassessmentId) return;
    try {
      const res = await preassessmentAlertApi.list(preassessmentId);
      setAlerts(res);
    } catch {
      setAlerts([]);
    }
  }, [preassessmentId]);

  useEffect(() => {
    if (!preassessmentId) return;
    loadTickets();
    loadAlerts();
  }, [preassessmentId, loadTickets, loadAlerts]);

  useEffect(() => {
    if (!preassessmentId || isClient) return;
    const loadUnreadCounts = async () => {
      try {
        const counts = await threadsUnreadApi.getCounts(preassessmentId);
        setTicketUnreadCount(counts.tickets);
        setAlertUnreadCount(counts.alerts);
      } catch {
        setTicketUnreadCount(0);
        setAlertUnreadCount(0);
      }
    };
    loadUnreadCounts();
  }, [preassessmentId, isClient, tickets, alerts]);

  useEffect(() => {
    if (!preassessmentId) return;
    const interval = setInterval(() => {
      loadTickets();
    }, 8000);
    return () => clearInterval(interval);
  }, [preassessmentId, loadTickets]);

  useEffect(() => {
    if (!preassessmentId) return;
    if (panel === 'chat') {
      loadChat(true);
      const interval = setInterval(() => loadChat(true), 5000);
      return () => clearInterval(interval);
    }
    loadChat(false);
    const interval = setInterval(() => loadChat(false), 5000);
    return () => clearInterval(interval);
  }, [panel, preassessmentId, loadChat]);

  useEffect(() => {
    if (panel !== 'chat' || !preassessmentId) {
      setTypingUsers([]);
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      return;
    }
    const fetchTyping = () => {
      preassessmentApi.getTyping(preassessmentId, CHAT_SECTION_ID)
        .then((res) => {
          const others = res.users.filter((u) => u.userId !== user?.id);
          setTypingUsers(others);
        })
        .catch(() => setTypingUsers([]));
    };
    fetchTyping();
    typingTimerRef.current = setInterval(fetchTyping, 2000);
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, [panel, preassessmentId, user?.id]);

  useEffect(() => {
    if (panel !== 'tickets' || !preassessmentId) return;
    loadTickets();
  }, [panel, preassessmentId, loadTickets]);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    navigate(`/checkup/clienti/${id}`);
  };

  const handleClientSearch = () => {
    const term = clientQuery.trim().toLowerCase();
    const results = term
      ? clients.filter((c) => {
        const name = `${c.client.nome || ''} ${c.client.cognome || ''}`.trim().toLowerCase();
        const email = c.client.email?.toLowerCase() || '';
        const azienda = c.client.azienda?.toLowerCase() || '';
        const ragione = c.client.ragioneSociale?.toLowerCase() || '';
        return name.includes(term) || email.includes(term) || azienda.includes(term) || ragione.includes(term);
      })
      : clients;
    setClientResults(results);
    setClientSearched(true);
  };

  const compilerName = `${user?.nome || ''} ${user?.cognome || ''}`.trim();
  const clientDisplayName = `${clientInfo?.nome || ''} ${clientInfo?.cognome || ''}`.trim();
  const companyName = isClient
    ? (user?.azienda || user?.client?.ragioneSociale || user?.clientNome || clientInfo?.azienda || clientInfo?.ragioneSociale || clientDisplayName)
    : (clientInfo?.azienda || clientInfo?.ragioneSociale || clientDisplayName);

  const otherName = isClient ? 'Studio' : (companyName || 'Cliente');

  const openTickets = tickets.filter((t) =>
    isStaff ? t.status === 'open' : t.status === 'pending_close',
  ).length;

  const renderDashboard = () => {
    if (isStaff && !activeClientId) {
      return (
        <div className="space-y-6">
          <div className="wow-panel p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Ricerca cliente</h2>
                <p className="text-sm text-slate-500">Trova un cliente per aprire il suo checkup.</p>
              </div>
            </div>

            <form
              className="mt-6 flex flex-col gap-3 md:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                handleClientSearch();
              }}
            >
              <div className="relative flex-1 min-h-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Cerca per nome, email o azienda..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                className="wow-button px-6"
                disabled={clientsLoading}
              >
                Cerca
              </button>
            </form>
          </div>

          {clientSearched && (
            <div className="wow-card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Risultati</h3>
                <p className="text-xs text-slate-500">Clicca su “Apri checkup” per accedere.</p>
              </div>
              {clientsLoading ? (
                <div className="px-6 py-8 text-sm text-slate-500">Caricamento...</div>
              ) : clientResults.length === 0 ? (
                <div className="px-6 py-8 text-sm text-slate-500">Nessun cliente trovato.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Cliente</th>
                      <th className="px-6 py-3 text-left">Email</th>
                      <th className="px-6 py-3 text-left">Azienda</th>
                      <th className="px-6 py-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientResults.map((c) => {
                      const label = `${c.client.nome} ${c.client.cognome}`.trim() || c.client.email;
                      return (
                        <tr key={c.client.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-900">{label}</td>
                          <td className="px-6 py-3 text-slate-500">{c.client.email}</td>
                          <td className="px-6 py-3 text-slate-500">{c.client.azienda || '—'}</td>
                          <td className="px-6 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c.client.id)}
                                className="wow-button-ghost"
                              >
                                Apri checkup
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${c.client.id}/tickets`)}
                                className="group relative rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                                title="Ticket"
                              >
                                <Ticket className="h-4 w-4" />
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">Ticket</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${c.client.id}/alerts`)}
                                className="group relative rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Alert"
                              >
                                <Bell className="h-4 w-4" />
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">Alert</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      );
    }

    const completedSections = countedSections.filter((s) => {
      const t = sTotal(s);
      return t > 0 && sDone(s) === t;
    }).length;

    const allRelevantSections = countedSections;
    const allRelevantMacros = countedMacroAreas.filter((m) => allRelevantSections.some((s) => s.macro === m.id));
    const dashboardSections = sections.filter(sectionMatchesDashboardFilter);
    const filteredMacros = macroAreas.filter((m) => dashboardSections.some((s) => s.macro === m.id));
    const macroRows = filteredMacros.map((m) => {
      const sects = dashboardSections.filter((s) => s.macro === m.id);
      const total = sects.reduce((a, s) => a + sTotal(s), 0);
      const done = sects.reduce((a, s) => a + sDone(s), 0);
      const naCount = sects.reduce((a, s) => a + sNA(s), 0);
      const pctMacro = total > 0 ? Math.round((done / total) * 100) : 0;
      const ownerInfo = getOwnerInfo(data, m.id);
      const validatedSections = sects.filter((s) => sectionValidations[s.id]).length;
      const excluded = sects.length > 0 && sects.every((section) => isOwnerSection(section));
      const validated = excluded || (sects.length > 0 && validatedSections === sects.length);
      const explicitMacroValidation = !!macroValidations[m.id];
      const macroValidationInfo = macroValidations[m.id] || null;
      return {
        ...m,
        total,
        done,
        naCount,
        pctMacro,
        sections: sects.length,
        ownerInfo,
        validated,
        validatedSections,
        excluded,
        explicitMacroValidation,
        macroValidationInfo,
      };
    }).filter((row) => !row.excluded);
    const validationRows = allRelevantMacros.map((m) => {
      const sects = allRelevantSections.filter((s) => s.macro === m.id);
      return {
        id: m.id,
        sections: sects.length,
        validatedSections: sects.filter((s) => sectionValidations[s.id]).length,
      };
    });
    const totalSectionsToValidate = validationRows.reduce((acc, row) => acc + row.sections, 0);
    const validatedSectionsTotal = validationRows.reduce((acc, row) => acc + row.validatedSections, 0);
    const validatedCount = validationRows.filter((row) => row.sections > 0 && row.validatedSections === row.sections).length;
    const canFinalValidate =
      isClient
      && Boolean(user?.superOwner)
      && !finalValidation
      && totalSectionsToValidate > 0
      && validatedSectionsTotal === totalSectionsToValidate;
    return (
      <div className="space-y-6">
        <div className="wow-card p-6 md:p-8 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold">{companyName || 'Cliente'}</h2>
                {isPreassessmentOnline && (
                  <span className="group relative inline-flex items-center" aria-label="Online adesso">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100">
                      Online adesso
                    </span>
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80">
                {readOnly ? 'Modalità visualizzazione (sola lettura)' : 'Compilazione assessment'}
              </p>
              {compilerName && isClient && (
                <p className="text-xs text-white/70 mt-1">
                  In compilazione: {compilerName}
                </p>
              )}
            </div>
            <div className="text-left md:text-right">
              <div className="text-4xl font-semibold">{pct}%</div>
              <div className="text-xs text-white/80">completamento</div>
              {onlineUsers.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Online ora
                  </span>
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 6).map((userOnline) => (
                      <span
                        key={userOnline.userId}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/10 text-[10px] font-semibold text-white shadow-sm backdrop-blur"
                        title={userOnline.name}
                      >
                        {getInitials(userOnline.name) || 'U'}
                      </span>
                    ))}
                    {onlineUsers.length > 6 && (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-white/20 text-[10px] font-semibold text-white">
                        +{onlineUsers.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 h-2 rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {isStaff && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPanel('chat')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
                {chatUnreadCount > 0 && (
                  <span className="rounded-full bg-indigo-400 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {chatUnreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate(`/checkup/clienti/${activeClientId}/tickets`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
              >
                <Ticket className="h-3.5 w-3.5" />
                Ticket
                {openTickets > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {openTickets}
                  </span>
                )}
              </button>
              {(() => {
                const activeAlerts = alerts.filter((a) => a.stato !== 'chiuso');
                return (
                  <button
                    onClick={() => navigate(`/checkup/clienti/${activeClientId}/alerts`)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Alert
                    {activeAlerts.length > 0 && (
                      <span className="rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                        {activeAlerts.length}
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>
          )}
          {isClient && user?.superOwner && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {finalValidation ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-white">
                    <ShieldCheck className="h-4 w-4" />
                    Checkup chiuso e validato il {new Date(finalValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button
                    type="button"
                    onClick={handleReopenFinalValidation}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
                  >
                    Riapri checkup
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalValidate}
                  disabled={!canFinalValidate}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    canFinalValidate
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                      : 'cursor-not-allowed bg-white/15 text-white/70'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Chiudi e valida checkup
                </button>
              )}
              <span className="text-xs text-white/75">
                {finalValidation
                  ? `Validazione finale registrata da ${finalValidation.by.name}.`
                  : canFinalValidate
                    ? 'Tutte le sezioni rilevanti sono validate: puoi chiudere e validare il checkup.'
                    : 'La chiusura finale sarà disponibile quando tutte le sezioni rilevanti saranno validate.'}
              </span>
            </div>
          )}
        </div>

        <div className="wow-panel p-3 flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'Tutti' },
            { key: 'completed', label: 'Completati' },
            { key: 'todo', label: 'Da completare' },
            { key: 'na', label: 'N/A' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setDashFilter(item.key as 'all' | 'completed' | 'todo' | 'na')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                dashFilter === item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-semibold text-slate-500">Filtro attivo: {dashFilterLabel}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[
            { label: 'Macro Aree', value: countedMacroAreas.length, detail: 'aree tematiche' },
            { label: 'Sezioni', value: countedSections.length, detail: `${completedSections} completate` },
            { label: 'Sezioni validate', value: validatedSectionsTotal, detail: `su ${totalSectionsToValidate}` },
            { label: 'Campi', value: totalFields, detail: `${totalReq} obbligatori` },
            { label: 'Compilati', value: totalFilled, detail: `su ${totalReq}` },
            { label: 'N/A', value: totalNA, detail: 'campi esclusi' },
          ].map((item) => (
            <div key={item.label} className="wow-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</div>
              <div className="text-xs text-slate-500">{item.detail}</div>
            </div>
          ))}
        </div>

        <div id="macro-area-status" className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Stato per Macro Area</h3>
            {validatedCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {validatedCount}/{allRelevantMacros.length} validate
              </span>
            )}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Macro Area</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Sezioni</th>
                  <th className="px-3 py-2">Sezioni validate</th>
                  <th className="px-3 py-2">Obb.</th>
                  <th className="px-3 py-2">Compilati</th>
                  <th className="px-3 py-2">N/A</th>
                  <th className="px-3 py-2">Stato</th>
                  <th className="px-3 py-2">Progresso</th>
                  <th className="px-3 py-2">Validazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {macroRows.map((row) => (
                  <Fragment key={row.id}>
                  <tr
                    className="text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedMacros((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                      return next;
                    })}
                  >
                    <td className="px-3 py-3 font-medium">
                      <span className="flex items-center gap-1.5">
                        {expandedMacros.has(row.id)
                          ? <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
                          : <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />}
                        <span style={{ color: row.color }} className="font-semibold">{`${row.id.toUpperCase()} - ${row.label}`}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.ownerInfo ? (
                        <div className="text-xs text-slate-600">
                          <div className="font-semibold text-slate-700">{row.ownerInfo.primary}</div>
                          {row.ownerInfo.secondary && (
                            <div className="text-[10px] text-slate-400">{row.ownerInfo.secondary}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{row.sections}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{row.validatedSections}/{row.sections}</span>
                        <div className="h-2 w-20 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${row.sections > 0 ? Math.round((row.validatedSections / row.sections) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{row.total}</td>
                    <td className="px-3 py-3">{row.done}</td>
                    <td className="px-3 py-3">
                      <span className={row.naCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                        {row.naCount > 0 ? row.naCount : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          row.excluded
                            ? 'bg-slate-100 text-slate-600'
                            : row.pctMacro === 0
                            ? 'bg-slate-100 text-slate-500'
                            : row.pctMacro === 100 && row.validated
                              ? 'bg-emerald-100 text-emerald-600'
                              : row.pctMacro === 100
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {row.excluded
                          ? 'Esclusa dal calcolo'
                          : row.pctMacro === 0
                          ? 'Da iniziare'
                          : row.pctMacro === 100 && row.validated
                            ? 'Completo'
                            : row.pctMacro === 100
                              ? 'In attesa validazione'
                              : 'In corso'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${row.excluded ? 'bg-slate-300' : row.pctMacro === 100 && !row.validated ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${row.pctMacro}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{row.pctMacro}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {row.excluded ? (
                        <span className="text-[10px] font-semibold text-slate-500">Esclusa dal checkup</span>
                      ) : row.validated ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Validata</span>
                          {row.macroValidationInfo ? (
                            <span className="text-[10px] text-slate-400">
                              {row.macroValidationInfo.by.name} • {new Date(row.macroValidationInfo.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Tutte le sezioni risultano validate
                            </span>
                          )}
                          {!isFinalClosed && row.explicitMacroValidation && isOwnerForMacro(row.id) && (
                            <button
                              onClick={() => handleRevokeValidation(row.id)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                            >
                              Revoca
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-slate-400">
                            {row.pctMacro === 100 ? 'In attesa della chiusura finale del Super-owner' : 'Completare'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* ── Sezioni espanse ─────────────────────────────────── */}
                  {expandedMacros.has(row.id) && (() => {
                    const rowSects = sections.filter((s) => s.macro === row.id);
                    return (
                      <tr>
                        <td colSpan={10} className="px-3 pb-3 pt-0 bg-slate-50/60">
                          <div className="ml-5 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="min-w-full text-xs">
                              <thead className="bg-slate-100">
                                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                                  <th className="px-3 py-2">Sezione</th>
                                  <th className="px-3 py-2">Obb.</th>
                                  <th className="px-3 py-2">Compilati</th>
                                  <th className="px-3 py-2">N/A</th>
                                  <th className="px-3 py-2">Stato</th>
                                  <th className="px-3 py-2">Progresso</th>
                                  <th className="px-3 py-2">Validata</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {rowSects.map((s) => {
                                  const done = sDone(s);
                                  const total = sTotal(s);
                                  const naCount = sNA(s);
                                  const sp = total > 0 ? Math.round((done / total) * 100) : 0;
                                  const validated = !!sectionValidations[s.id];
                                  const realIndex = sections.findIndex((sec) => sec.id === s.id);
                                  return (
                                    <tr
                                      key={s.id}
                                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (realIndex < 0) return;
                                        setView(realIndex);
                                        setPanel(null);
                                      }}
                                    >
                                      <td className="px-3 py-2 font-medium text-slate-700">{s.title}</td>
                                      <td className="px-3 py-2 text-slate-500">{total}</td>
                                      <td className="px-3 py-2 text-slate-500">{done}</td>
                                      <td className="px-3 py-2">
                                        <span className={naCount > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                                          {naCount > 0 ? naCount : '—'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          sp === 0
                                            ? 'bg-slate-100 text-slate-500'
                                            : sp === 100 && validated
                                              ? 'bg-emerald-100 text-emerald-600'
                                              : sp === 100
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-blue-100 text-blue-600'
                                        }`}>
                                          {sp === 0
                                            ? 'Da iniziare'
                                            : sp === 100 && validated
                                              ? 'Completo'
                                              : sp === 100
                                                ? 'In attesa'
                                                : 'In corso'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-20 rounded-full bg-slate-200">
                                            <div
                                              className={`h-full rounded-full ${sp === 100 && !validated ? 'bg-amber-400' : 'bg-blue-500'}`}
                                              style={{ width: `${sp}%` }}
                                            />
                                          </div>
                                          <span className="text-slate-500">{sp}%</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        {validated
                                          ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Sì</span>
                                          : <span className="text-slate-400">No</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  const renderSection = () => {
    if (!activeSection) return null;
    const visibleFields = activeSection.fields.filter(fieldMatchesFilter);
    const macroValidation = macroValidations[activeSection.macro];
    const sectionValidation = sectionValidations[activeSection.id];
    const ownerInfo = getOwnerInfo(data, activeSection.macro);
    const isSectionValidated = !!sectionValidation;
    const isOwnerSection = activeSection.fields.some((f) => /^owner_[a-j]_/.test(f.id));
    return (
      <div className="space-y-4">
        {!isClient && readOnly && (
          <div className="wow-panel border-amber-200 bg-amber-50/80 p-3 text-xs font-semibold text-amber-800 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Modalità sola lettura — L'ambiente è esclusivo del cliente
          </div>
        )}
        <div className="wow-card overflow-hidden">
          <div className="border-b border-slate-200/60 p-6">
            <span className="wow-chip" style={{ backgroundColor: `${activeMacro?.color}20`, color: activeMacro?.color, borderColor: `${activeMacro?.color}40` }}>
              {activeMacro?.label}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">{activeSection.title}</h2>
            <p className="text-sm text-slate-600">{activeSection.description}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                <span>Filtro: {dashFilter === 'completed' ? 'Completati' : dashFilter === 'todo' ? 'Da completare' : dashFilter === 'na' ? 'N/A' : 'Tutti'}</span>
                <span>
                  Owner: {ownerInfo?.primary || '—'}
                  {ownerInfo?.secondary && ` • ${ownerInfo.secondary}`}
                </span>
                <span className={isSectionValidated ? 'text-emerald-600' : 'text-amber-600'}>
                  Validazione sezione: {isSectionValidated ? 'Sì' : 'No'}
                </span>
                {macroValidation && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Macro validata • {macroValidation.by.name} • {new Date(macroValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleSectionSkip(activeSection.fields)}
                  title={activeSection.fields.every((f) => naFields[f.id]) ? 'Ripristina tutti i campi della sezione' : 'Marca tutti i campi come N/A'}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold transition-all duration-200 ${
                    activeSection.fields.every((f) => naFields[f.id])
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  {activeSection.fields.every((f) => naFields[f.id]) ? (
                    <><RefreshCw className="h-3 w-3" /><span>Ripristina sezione</span></>
                  ) : (
                    <><Ban className="h-3 w-3" /><span>Salta sezione (N/A)</span></>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5 p-6">
            {/* Griglia validazione macro — mostrata solo nella sezione owner */}
            {isOwnerSection && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Stato validazione macro aree</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {macroAreas.map((m) => {
                    const val = macroValidations[m.id];
                    return (
                      <div
                        key={m.id}
                        className={`rounded-lg border px-3 py-2 text-xs ${val ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                      >
                        <div className="font-semibold text-slate-700 truncate">{m.label}</div>
                        {val ? (
                          <div className="mt-0.5 text-emerald-600 font-medium truncate">✓ {val.by.name}</div>
                        ) : (
                          <div className="mt-0.5 text-slate-400">Non validata</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {visibleFields.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Nessun campo corrispondente al filtro selezionato.
              </div>
            )}
            {visibleFields.map((f) => (
              <FormField
                key={f.id}
                field={f}
                value={data[f.id]}
                onChange={handleChange}
                consultantNote={fieldNotes[f.id]}
                userNote={userFieldNotes[f.id]}
                onConsultantNoteChange={handleFieldNote}
                onUserNoteChange={handleUserFieldNote}
                readOnly={readOnly}
                ownerProtected={isClient && /^owner_[a-j]_/.test(f.id)}
                fieldMeta={fieldMeta[f.id]}
                activeEditor={activeEditors[f.id]}
                currentUserId={user?.id}
                onFieldFocus={emitFieldActive}
                onFieldBlur={emitFieldInactive}
                naChecked={!!naFields[f.id]}
                onNaChange={handleNaChange}
                canEditConsultantNotes={!isClient}
                canEditUserNotes={!readOnly && isClient && !/^owner_[a-j]_/.test(f.id)}
                highlightCompletionState={isClient}
                documents={documentsByField[f.id] || []}
                documentsLoading={documentsLoading}
                documentsEnabled={documentsEnabled}
                onUploadDocument={handleUploadDocument}
                onDeleteDocument={handleDeleteDocument}
                onDownloadDocument={handleDownloadDocument}
                onPreviewDocument={handlePreviewDocument}
                sectionId={activeSection.id}
              />
            ))}
          </div>

          <div className="border-t border-slate-100 px-6 pb-6">
            {!readOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <label className="text-xs font-semibold text-amber-800">Note e osservazioni</label>
                <textarea
                  value={notes[activeSection.id] || ''}
                  onChange={(e) => handleSectionNote(activeSection.id, e.target.value)}
                  rows={2}
                  placeholder="Annotazioni..."
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            )}
            {readOnly && notes[activeSection.id] && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
                <strong>Note:</strong> {notes[activeSection.id]}
              </div>
            )}
          </div>

          {isClient && isOwnerForMacro(activeSection.macro) && (
            <div className="border-t border-slate-100 px-6 py-4">
              {sectionValidations[activeSection.id] ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
                  <span>
                    Sezione validata • {sectionValidations[activeSection.id].by.name} • {new Date(sectionValidations[activeSection.id].at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isFinalClosed && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSectionValidation(activeSection.id)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
                    >
                      Revoca validazione
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {sDone(activeSection) === sTotal(activeSection) && sTotal(activeSection) > 0
                      ? 'Sezione completa. Puoi validare la compilazione.'
                      : 'Completa tutti i campi obbligatori per validare la sezione.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleValidateSection(activeSection.id)}
                    disabled={sTotal(activeSection) === 0 || sDone(activeSection) < sTotal(activeSection)}
                    className="wow-button disabled:opacity-50"
                  >
                    Valida la compilazione
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/80 px-6 py-4">
            <button
              onClick={() => (view === 0 ? setView('dashboard') : setView((view as number) - 1))}
              className="wow-button-ghost"
            >
              <ChevronLeft className="h-4 w-4" />
              {view === 0 ? 'Panoramica' : 'Precedente'}
            </button>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={goToMacroStatusOverview}
                className="text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors"
              >
                ↑ Panoramica
              </button>
              <span className="text-[10px] font-semibold text-slate-300">{(view as number) + 1}/{sections.length}</span>
            </div>
            <button
              onClick={() => (view === sections.length - 1 ? setView('dashboard') : setView((view as number) + 1))}
              className="wow-button"
            >
              {view === sections.length - 1 ? 'Panoramica' : 'Successiva'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const breadcrumbs = [
    { label: 'Pre-Assessment', onClick: () => { setView('dashboard'); setPanel(null); } },
    panel ? { label: panel === 'chat' ? 'Chat' : panel === 'tickets' ? 'Ticket' : 'Alert' } : null,
    !panel && activeSection ? { label: activeMacro?.label || '' } : null,
    !panel && activeSection ? { label: activeSection.title } : null,
    !panel && !activeSection ? { label: 'Dashboard' } : null,
  ].filter(Boolean) as { label: string; onClick?: () => void }[];

  const goToMacroStatusOverview = useCallback(() => {
    setView('dashboard');
    setPanel(null);
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById('macro-area-status')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 40);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
      {panel !== 'chat' && (
        <div className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="display-font text-3xl font-semibold text-slate-900">Pre-Assessment</h1>
              <p className="text-sm text-slate-600">
                Questionario strutturato per la profilazione governance, compliance, risk e documentazione.
              </p>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((bc, idx) => (
                  <span key={`${bc.label}-${idx}`} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={bc.onClick}
                      className={`text-xs ${bc.onClick ? 'text-slate-500 hover:text-slate-700' : 'text-slate-700 font-semibold'}`}
                    >
                      {bc.label}
                    </button>
                    {idx < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
                  </span>
                ))}
              </div>
              {lastSavedAt && (
                <div>Salvato alle {lastSavedAt}</div>
              )}
              {companyName && (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Cliente: {companyName}</span>
                  {isPreassessmentOnline && (
                    <span className="group relative inline-flex items-center" aria-label="Online adesso">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100">
                        Online adesso
                      </span>
                    </span>
                  )}
                </div>
              )}
              {!panel && view === 'dashboard' && (
                <div>Filtro dashboard: {dashFilterLabel}</div>
              )}
              {!isClient && readOnly && (
                <div className="text-amber-700 font-semibold">Sola lettura</div>
              )}
              {isFinalClosed && (
                <div className="text-emerald-700 font-semibold">Checkup concluso</div>
              )}
              {finalValidation && (
                <div className="text-teal-700 font-semibold">
                  Validazione finale registrata il {new Date(finalValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex flex-wrap gap-3">
              {activeClientId && (
                <button
                  onClick={() => setShowExport((p) => !p)}
                  className="wow-button-ghost"
                >
                  <Download className="h-4 w-4" />
                  {isClient ? 'Report' : 'Esporta'}
                </button>
              )}
            </div>
            {showExport && activeClientId && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setExportMode('excludeNA')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${exportMode === 'excludeNA' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Escludi N/A
                  </button>
                  <button
                    onClick={() => setExportMode('includeNA')}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${exportMode === 'includeNA' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Includi N/A
                  </button>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={exportIncludeConsultantNotes}
                      onChange={(e) => setExportIncludeConsultantNotes(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    Note consulente
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportCSV} className="wow-button-ghost">CSV</button>
                  {documentsEnabled && (
                    <button onClick={handleDownloadDocumentsZip} className="wow-button-ghost" disabled={zipLoading}>
                      {zipLoading ? 'Preparazione ZIP...' : 'Documenti ZIP'}
                    </button>
                  )}
                  <button onClick={generatePDF} className="wow-button" disabled={pdfLoading}>
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {pdfLoading ? 'Preparazione PDF...' : 'Report PDF'}
                  </button>
                  {!isClient && (
                    <button onClick={saveReport} className="wow-button-ghost" disabled={savingReport}>
                      {savingReport ? 'Salvataggio...' : 'Salva report'}
                    </button>
                  )}
                </div>
                {reportNotice && (
                  <div className="text-xs font-semibold text-emerald-600">{reportNotice}</div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-rose-700 flex items-center gap-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">
          Caricamento in corso...
        </div>
      ) : (
        <section className="space-y-6">
          {panel === 'chat' && showAssessment && (
            <ChatPanel
              messages={chatMessages}
              onSend={async (msg) => {
                if (!preassessmentId) return;
                await preassessmentChatApi.sendMessage(preassessmentId, CHAT_SECTION_ID, msg);
                await loadChat();
              }}
              onTyping={(active) => {
                if (!preassessmentId) return;
                preassessmentApi.setTyping(preassessmentId, CHAT_SECTION_ID, active).catch(() => {});
              }}
              canSend={canChat}
              currentUserId={user?.id}
              otherName={otherName}
              typingUsers={typingUsers}
              onClose={() => setPanel(null)}
            />
          )}
          {!panel && (view === 'dashboard' ? renderDashboard() : renderSection())}
        </section>
      )}

      {/* ── Document preview modal ─────────────────────────────────────────── */}
      <DocumentPreviewModal
        doc={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        downloadFn={(id) => preassessmentDocumentsApi.download(id)}
      />

      {sidebarTarget && createPortal(
        <PreassessmentSidebar
          view={view}
          setView={setView}
          panel={panel}
          setPanel={setPanel}
          search={search}
          setSearch={setSearch}
          grouped={grouped}
          sections={sections}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sDone={sDone}
          sTotal={sTotal}
          sNA={sNA}
          validations={macroValidations}
          hasAssessment={!!activeClientId}
        />,
        sidebarTarget,
      )}

      <ConfirmDialog />
    </div>
  );
}

function PreassessmentSidebar({
  view,
  setView,
  panel,
  setPanel,
  search,
  setSearch,
  grouped,
  sections,
  collapsed,
  setCollapsed,
  sDone,
  sTotal,
  sNA,
  validations,
  hasAssessment,
}: {
  view: 'dashboard' | number;
  setView: (val: 'dashboard' | number) => void;
  panel: 'chat' | 'tickets' | 'alerts' | null;
  setPanel: (val: 'chat' | 'tickets' | 'alerts' | null) => void;
  search: string;
  setSearch: (val: string) => void;
  grouped: { id: string; label: string; color: string; sections: SectionSpec[] }[];
  sections: SectionSpec[];
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sDone: (s: SectionSpec) => number;
  sTotal: (s: SectionSpec) => number;
  sNA: (s: SectionSpec) => number;
  validations: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>;
  hasAssessment: boolean;
}) {
  return (
    <div className="space-y-4">
      {hasAssessment && (
        <>
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

          <nav className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
            {grouped.map((g) => (
              <div key={g.id} className="space-y-1">
                <button
                  onClick={() =>
                    setCollapsed((p) => {
                      const isCollapsed = !!p[g.id];
                      const next: Record<string, boolean> = {};
                      grouped.forEach((macro) => {
                        next[macro.id] = macro.id === g.id ? !isCollapsed : true;
                      });
                      return next;
                    })
                  }
                  className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400"
                >
                  {`${g.id.toUpperCase()} - ${g.label}`}
                  <ChevronDown className={`h-3 w-3 text-slate-500 transition ${collapsed[g.id] ? '-rotate-90' : ''}`} />
                </button>
                {!collapsed[g.id] && g.sections.map((s, sIdx) => {
                  const idx = sections.findIndex((sec) => sec.id === s.id);
                  const active = view === idx && !panel;
                  const done = sDone(s);
                  const total = sTotal(s);
                  const na = sNA(s);
                  const isValidated = !!validations[s.macro];
                  const sectionNum = `${g.id.toUpperCase()}.${sIdx + 1}`;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (idx < 0) return;
                        setView(idx);
                        setPanel(null);
                      }}
                      className={`group relative flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs transition-colors ${active ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span
                        className={[
                          'h-6 w-1 flex-shrink-0 rounded-full bg-indigo-400 transition-all duration-300',
                          active
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                        ].join(' ')}
                      />
                      <span className="flex-1 min-w-0 text-left truncate">
                        <span className="font-semibold opacity-70">{sectionNum}</span>
                        <span className="mx-1 opacity-50">—</span>
                        {s.title.replace(/^[A-Za-z]\.\d+\s*/, '')}
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
            ))}
          </nav>
        </>
      )}

      <div className="border-t border-blue-800/30 pt-4" />
    </div>
  );
}

function ChatPanel({
  messages,
  onSend,
  onTyping,
  canSend,
  currentUserId,
  otherName,
  typingUsers,
  onClose,
}: {
  messages: PreassessmentChatMessage[];
  onSend: (msg: string) => Promise<void> | void;
  onTyping: (active: boolean) => void;
  canSend: boolean;
  currentUserId?: string;
  otherName: string;
  typingUsers: Array<{ userId: string; name: string; ruolo: string }>;
  onClose?: () => void;
}) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedScrollRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 96;
  }, []);

  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollToLatest(!isNearBottom());
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  useLayoutEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      lastMessageIdRef.current = null;
      setShowScrollToLatest(false);
      return;
    }

    const hasNewLatestMessage = latestMessage.id !== lastMessageIdRef.current;
    const shouldSnapToBottom = !initializedScrollRef.current || isNearBottom() || (hasNewLatestMessage && latestMessage.userId === currentUserId);

    if (shouldSnapToBottom) {
      scrollToLatestMessage(initializedScrollRef.current ? 'smooth' : 'auto');
      setShowScrollToLatest(false);
    } else {
      setShowScrollToLatest(true);
    }

    initializedScrollRef.current = true;
    lastMessageIdRef.current = latestMessage.id;
  }, [messages, currentUserId, isNearBottom, scrollToLatestMessage]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await onSend(msg.trim());
      setMsg('');
      onTyping(false);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleTyping = (value: string) => {
    setMsg(value);
    if (!canSend) return;
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2500);
  };

  const handleExportChat = () => {
    const lines: string[] = [
      'ESPORTAZIONE CHAT',
      `Conversazione con: ${otherName}`,
      `Generato il: ${formatDateTime(new Date().toISOString())}`,
      `Numero messaggi: ${messages.length}`,
      '',
    ];

    messages.forEach((message, index) => {
      const author = `${message.user.nome} ${message.user.cognome}`.trim();
      lines.push(`${index + 1}. ${author} - ${formatDateTime(message.createdAt)}`);
      lines.push(message.messaggio);
      lines.push('');
    });

    downloadTextFile(
      `chat-${sanitizeFilename(otherName)}-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
    );
  };

  return (
    <div className="wow-panel flex h-[70vh] min-h-0 flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title="Torna indietro"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-semibold text-slate-900 flex-1">Chat con {otherName}</span>
        <button
          onClick={handleExportChat}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title="Esporta conversazione"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={scrollContainerRef} className="h-full min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-slate-400">Nessun messaggio. Inizia la conversazione.</div>
          )}
          {messages.map((m) => {
          const isOwn = m.userId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                {!isOwn && (
                  <div className="mb-1 text-[10px] font-semibold text-blue-600">
                    {m.user.nome} {m.user.cognome}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.messaggio}</div>
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                  <span>{new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isOwn && (
                    <span className={`inline-flex items-center ${m.letto ? 'text-emerald-200' : 'text-blue-200'}`}>
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {m.letto && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3 -ml-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
          })}
          <div ref={endRef} />
        </div>
        {showScrollToLatest && messages.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToLatestMessage()}
            className="absolute bottom-4 right-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
            title="Vai all'ultimo messaggio"
          >
            <ArrowDown className="h-4 w-4" />
            Ultimo messaggio
          </button>
        )}
      </div>
      {typingUsers.length > 0 && (
        <div className="px-5 pb-2 text-[11px] text-slate-500">
          {typingUsers.length === 1
            ? `${typingUsers[0].name} sta scrivendo...`
            : `${typingUsers.map((u) => u.name).join(', ')} stanno scrivendo...`}
        </div>
      )}
      <div className="border-t border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            value={msg}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={canSend ? 'Scrivi un messaggio...' : 'Solo lettura'}
            disabled={!canSend}
            className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

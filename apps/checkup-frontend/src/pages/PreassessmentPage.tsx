import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  StickyNote,
  HelpCircle,
  Download,
  Printer,
  Upload,
  FileText,
  Trash2,
  MessageCircle,
  Ticket,
  Bell,
  Send,
  Eye,
  Users,
  Loader2,
  Ban,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
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
  PreassessmentClientEntry,
  PreassessmentClientRecord,
  PreassessmentChatMessage,
  PreassessmentTicket,
  PreassessmentAlert,
  PreassessmentDocument,
} from '../api/preassessment';
import { preassessmentReportApi } from '../api/reports';
import { useAuth } from '../contexts/AuthContext';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

const DOC_ICON_FIELDS = new Set([
  'd_accordi_partnership',
  'd_anticorruzione',
  'd_bilanci_infrannuali',
  'd_bilancio',
  'd_budget',
  'd_budget_odv',
  'd_business_plan',
  'd_certificazioni',
  'd_codice_etico',
  'd_contratti_appalti',
  'd_contratti_clienti',
  'd_contratti_fornitori',
  'd_contratti_outsourcing',
  'd_dashboard_kpi',
  'd_deleghe',
  'd_doc_backup',
  'd_dpia',
  'd_dr_it',
  'd_dvr',
  'd_mansionari',
  'd_matrice_poteri',
  'd_modello_231',
  'd_organigramma',
  'd_patti_parasociali',
  'd_piani_operativi',
  'd_piano_emergenza',
  'd_piano_industriale',
  'd_piano_marketing',
  'd_piano_tesoreria',
  'd_policy_nda',
  'd_policy_omaggi',
  'd_policy_smartworking',
  'd_policy_social',
  'd_polizze',
  'd_privacy',
  'd_procedura_breach',
  'd_procedure_operative',
  'd_procure',
  'd_registro_breach',
  'd_registro_whistleblowing',
  'd_sistema_disciplinare',
  'd_sostenibilita',
  'd_statuto',
  'd_verbali_assemblea',
  'd_verbali_cda',
  'd_verbali_odv',
  'd_visura',
  'd_whistleblowing',
]);

const ASSETTI_ICON_FIELDS = new Set([
  'aa_cda',
  'aa_poteri_formalizzati',
  'aa_corrispondenza_delega',
  'aa_internal_audit',
  'aa_organo_controllo_srl',
  'aa_revisore_srl',
  'aa_piano_industriale',
  'aa_piani_operativi',
  'aa_funzioni_esterne',
  'aa_parti_correlate',
  'ac_sistema_integrato',
  'ac_esternalizzazione',
  'ac_esternalizzazione_tipo',
  'ac_trasferimento_dati',
  'ac_cadenza_aggiornamento',
  'ac_bilanci_infrannuali',
  'ac_bilanci_gestionali',
  'ac_analisi_bilancio',
  'ac_analisi_crisi',
  'ac_controllo_gestione',
  'ac_contabilita_analitica',
  'ac_kpi',
  'ac_budget_reporting',
  'ac_cadenza_reporting',
  'ac_aspetti_finanziari',
]);

function getOptionLabel(field: FieldSpec, value: string) {
  if (!DOC_ICON_FIELDS.has(field.id)) return value;
  const lower = value.toLowerCase();
  if (lower.startsWith('disponibile')) return `✅ ${value}`;
  if (lower.startsWith('da reperire')) return `📋 ${value}`;
  if (lower.startsWith('non')) return `❌ ${value}`;
  return value;
}

function getAssettiOptionLabel(field: FieldSpec, value: string) {
  if (!ASSETTI_ICON_FIELDS.has(field.id)) return value;
  switch (value) {
    case 'Sì':
      return `✔︎ ${value}`;
    case 'No':
      return `✖︎ ${value}`;
    case 'Non applicabile':
      return `— ${value}`;
    case 'Totale':
      return `■ ${value}`;
    case 'Parziale':
      return `▢ ${value}`;
    case 'Fax':
      return `📠 ${value}`;
    case 'Email':
      return `✉️ ${value}`;
    case 'Condivisione di un sistema informativo':
      return `🔗 ${value}`;
    case 'Altro':
      return `⋯ ${value}`;
    case 'Mensile':
    case 'Trimestrale':
    case 'Quadrimestrale':
    case 'Semestrale':
    case 'Annuale':
      return `🗓 ${value}`;
    default:
      return value;
  }
}

function getOptions(field: FieldSpec) {
  if (field.type !== 'select') return [];
  return [...(field.options || [])];
}

function getInitialData(sectionsData: SectionSpec[]) {
  const init: Record<string, string> = {};
  sectionsData.forEach((s) => s.fields.forEach((f) => { init[f.id] = ''; }));
  return init;
}

function getInitialNaFields(sectionsData: SectionSpec[]) {
  const init: Record<string, boolean> = {};
  sectionsData.forEach((s) => s.fields.forEach((f) => { init[f.id] = false; }));
  return init;
}

const OWNER_EMAIL_BY_MACRO: Record<string, string> = {
  a: 'owner_a_email',
  b: 'owner_b_email',
  c: 'owner_c_email',
  d: 'owner_d_email',
  e: 'owner_e_email',
  f: 'owner_f_email',
  g: 'owner_g_email',
  h: 'owner_h_email',
  i: 'owner_i_email',
  j: 'owner_j_email',
};
const OWNER_FIELDS_BY_MACRO: Record<string, { name: string; role: string; email: string }> = {
  a: { name: 'owner_a_nome', role: 'owner_a_ruolo', email: 'owner_a_email' },
  b: { name: 'owner_b_nome', role: 'owner_b_ruolo', email: 'owner_b_email' },
  c: { name: 'owner_c_nome', role: 'owner_c_ruolo', email: 'owner_c_email' },
  d: { name: 'owner_d_nome', role: 'owner_d_ruolo', email: 'owner_d_email' },
  e: { name: 'owner_e_nome', role: 'owner_e_ruolo', email: 'owner_e_email' },
  f: { name: 'owner_f_nome', role: 'owner_f_ruolo', email: 'owner_f_email' },
  g: { name: 'owner_g_nome', role: 'owner_g_ruolo', email: 'owner_g_email' },
  h: { name: 'owner_h_nome', role: 'owner_h_ruolo', email: 'owner_h_email' },
  i: { name: 'owner_i_nome', role: 'owner_i_ruolo', email: 'owner_i_email' },
  j: { name: 'owner_j_nome', role: 'owner_j_ruolo', email: 'owner_j_email' },
};
const getOwnerInfo = (data: Record<string, string> | null | undefined, macroId: string) => {
  if (!data) return null;
  const fields = OWNER_FIELDS_BY_MACRO[macroId];
  if (!fields) return null;
  const name = (data[fields.name] || '').trim();
  const role = (data[fields.role] || '').trim();
  const email = (data[fields.email] || '').trim();
  if (!name && !role && !email) return null;
  const primary = name || email || '—';
  const secondary = [role, email && email !== primary ? email : ''].filter(Boolean).join(' • ');
  return { name, role, email, primary, secondary };
};

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
  const isClient = user?.ruolo === 'cliente';
  const isStaff = !!user && user.ruolo !== 'cliente';
  const canChat = user?.ruolo === 'cliente'
    || user?.ruolo === 'collaboratore'
    || user?.ruolo === 'admin_studio'
    || user?.ruolo === 'segreteria';
  const canCreateAlert = user?.ruolo === 'admin_studio';

  const [macroAreas, setMacroAreas] = useState<MacroAreaSpec[]>(DEFAULT_MACRO_AREAS);
  const [sections, setSections] = useState<SectionSpec[]>(DEFAULT_SECTIONS);

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
        setMacroAreas(nextMacroAreas.length ? nextMacroAreas : DEFAULT_MACRO_AREAS);
        setSections(nextSections.length ? nextSections : DEFAULT_SECTIONS);
      })
      .catch(() => {
        if (cancelled) return;
        setMacroAreas(DEFAULT_MACRO_AREAS);
        setSections(DEFAULT_SECTIONS);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.license?.model?.id]);

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
  const [assessmentStatus, setAssessmentStatus] = useState<'in_progress' | 'concluso'>('in_progress');
  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [isPreassessmentOnline, setIsPreassessmentOnline] = useState(false);
  const [clientInfo, setClientInfo] = useState<PreassessmentClientRecord['client'] | null>(null);
  const [view, setView] = useState<'dashboard' | number>('dashboard');
  const lastSectionIdRef = useRef<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState<'excludeNA' | 'includeNA'>('excludeNA');
  const [exportIncludeConsultantNotes, setExportIncludeConsultantNotes] = useState(true);
  const [panel, setPanel] = useState<'chat' | 'tickets' | 'alerts' | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const consultantNoteDirtyRef = useRef(false);
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<PreassessmentChatMessage[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; name: string; ruolo: string }>>([]);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ticketNotice, setTicketNotice] = useState<{ count: number; at: number } | null>(null);
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

  useEffect(() => {
    if (isClient) {
      setExportIncludeConsultantNotes(false);
    }
  }, [isClient]);

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
  const canEditAnswers = isClient ? assessmentStatus !== 'concluso' : false;
  const readOnly = !canEditAnswers;
  const showAssessment = !!activeClientId && !!preassessmentId;
  const activeSection = typeof view === 'number' ? sections[view] : null;
  const activeMacro = activeSection ? macroAreas.find((m) => m.id === activeSection.macro) : null;
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

  const [previewDoc, setPreviewDoc] = useState<PreassessmentDocument | null>(null);
  const handlePreviewDocument = useCallback((doc: PreassessmentDocument) => {
    setPreviewDoc(doc);
  }, []);

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
    const key = `checkup_preassessment_view_${activeClientId}`;
    const raw = localStorage.getItem(key);
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
  }, [activeClientId]);

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
    localStorage.setItem(key, JSON.stringify({ view }));
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
      setSaving(true);
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
          if (res.status) {
            setAssessmentStatus(res.status);
          }
          if (res.fieldMeta) {
            setFieldMeta(res.fieldMeta);
          }
          consultantNoteDirtyRef.current = false;
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
        })
        .finally(() => setSaving(false));
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

  const handleValidateMacro = useCallback((macroId: string) => {
    if (!activeClientId || !user) return;
    if (assessmentStatus === 'concluso') return;
    const name = `${user.nome} ${user.cognome}`.trim() || user.email;
    setMacroValidations((p) => ({
      ...p,
      [macroId]: {
        by: { id: user.id, name, ruolo: user.ruolo },
        at: new Date().toISOString(),
      },
    }));
  }, [activeClientId, assessmentStatus, user]);

  const handleRevokeValidation = useCallback((macroId: string) => {
    if (!activeClientId) return;
    if (assessmentStatus === 'concluso') return;
    setMacroValidations((p) => {
      const next = { ...p };
      delete next[macroId];
      return next;
    });
  }, [activeClientId, assessmentStatus]);

  const handleValidateSection = useCallback((sectionId: string) => {
    if (!activeClientId || !user) return;
    if (assessmentStatus === 'concluso') return;
    const name = `${user.nome} ${user.cognome}`.trim() || user.email;
    setSectionValidations((p) => ({
      ...p,
      [sectionId]: {
        by: { id: user.id, name, ruolo: user.ruolo },
        at: new Date().toISOString(),
      },
    }));
  }, [activeClientId, assessmentStatus, user]);

  const handleRevokeSectionValidation = useCallback((sectionId: string) => {
    if (!activeClientId) return;
    if (assessmentStatus === 'concluso') return;
    setSectionValidations((p) => {
      const next = { ...p };
      delete next[sectionId];
      return next;
    });
  }, [activeClientId, assessmentStatus]);

  // Count-based metrics (for display "N/M" labels)
  const totalReq = useMemo(
    () => sections.reduce((a, s) => a + s.fields.filter((f) => f.required && !naFields[f.id]).length, 0),
    [sections, naFields],
  );
  const totalFilled = useMemo(
    () => sections.reduce((a, s) => a + s.fields.filter((f) => f.required && !naFields[f.id] && data[f.id]?.trim()).length, 0),
    [sections, data, naFields],
  );
  const totalFields = useMemo(
    () => sections.reduce((a, s) => a + s.fields.length, 0),
    [sections],
  );
  const totalNA = useMemo(
    () => Object.values(naFields).filter(Boolean).length,
    [naFields],
  );
  // Weighted score (uses field.weight, defaults to 1)
  const totalWeightReq = useMemo(
    () => sections.reduce((a, s) => a + s.fields.filter((f) => f.required && !naFields[f.id]).reduce((acc, f) => acc + (f.weight ?? 1), 0), 0),
    [sections, naFields],
  );
  const totalWeightFilled = useMemo(
    () => sections.reduce((a, s) => a + s.fields.filter((f) => f.required && !naFields[f.id] && data[f.id]?.trim()).reduce((acc, f) => acc + (f.weight ?? 1), 0), 0),
    [sections, data, naFields],
  );
  const pct = totalWeightReq > 0 ? Math.round((totalWeightFilled / totalWeightReq) * 100) : 0;

  const sDone = (s: SectionSpec) => s.fields.filter((f) => f.required && !naFields[f.id] && data[f.id]?.trim()).length;
  const sTotal = (s: SectionSpec) => s.fields.filter((f) => f.required && !naFields[f.id]).length;
  const sNA = (s: SectionSpec) => s.fields.filter((f) => naFields[f.id]).length;

  const fieldMatchesFilter = (f: FieldSpec) => {
    if (dashFilter === 'all') return true;
    if (dashFilter === 'completed') return !naFields[f.id] && !!data[f.id]?.trim();
    if (dashFilter === 'todo') return !naFields[f.id] && !data[f.id]?.trim();
    if (dashFilter === 'na') return !!naFields[f.id];
    return true;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const t = search.toLowerCase();
    return sections.filter((s) =>
      s.title.toLowerCase().includes(t)
      || s.description.toLowerCase().includes(t)
      || s.fields.some((f) => f.label.toLowerCase().includes(t)),
    );
  }, [search]);

  const grouped = useMemo(
    () => macroAreas
      .map((m) => ({ ...m, sections: filtered.filter((s) => s.macro === m.id) }))
      .filter((g) => g.sections.length > 0),
    [filtered],
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

  const exportJSON = () => {
    const excludeNA = exportMode === 'excludeNA';
    const includeNotes = !isClient && exportIncludeConsultantNotes;
    const exp = {
      tool: 'Governance Pre-Assessment Tool v13',
      data_compilazione: new Date().toISOString(),
      modalita: excludeNA ? 'Escludi N/A' : 'Completo',
      note_consulente: includeNotes ? 'incluse' : 'escluse',
      note_utente: 'incluse',
      sezioni: sections.map((s) => ({
        id: s.id,
        titolo: s.title,
        macro_area: macroAreas.find((m) => m.id === s.macro)?.label,
        risposte: Object.fromEntries(
          s.fields
            .filter((f) => !(excludeNA && naFields[f.id]))
            .map((f) => {
              const isNA = !!naFields[f.id];
              const value = isNA ? 'N/A' : (data[f.id] || '');
              const entry: Record<string, string> = { label: f.label, valore: value };
              if (!isNA && userFieldNotes[f.id]) {
                entry.nota_utente = userFieldNotes[f.id] || '';
              }
              if (includeNotes && fieldNotes[f.id] && !isNA) {
                entry.nota_consulente = fieldNotes[f.id] || '';
              }
              return [f.id, entry];
            }),
        ),
        note_sezione: notes[s.id] || '',
      })),
    };
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre_assessment_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const excludeNA = exportMode === 'excludeNA';
    const includeNotes = !isClient && exportIncludeConsultantNotes;
    let csv = 'Macro Area;Sezione;Campo;Obbligatorio;Valore';
    csv += ';Nota utente';
    if (includeNotes) csv += ';Nota consulente';
    csv += ';Note sezione\n';
    sections.forEach((s) => {
      const m = macroAreas.find((x) => x.id === s.macro)?.label || '';
      const rows = s.fields.filter((f) => !(excludeNA && naFields[f.id]));
      rows.forEach((f, i) => {
        const isNA = !!naFields[f.id];
        const rawValue = isNA ? 'N/A' : (data[f.id] || '');
        const value = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
        let row = `"${m}";"${s.title}";"${f.label}";"${f.required ? 'Sì' : 'No'}";"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        row += `;"${(isNA ? '' : (userFieldNotes[f.id] || '')).replace(/"/g, '""')}"`;
        if (includeNotes) {
          row += `;"${(isNA ? '' : (fieldNotes[f.id] || '')).replace(/"/g, '""')}"`;
        }
        row += `;"${i === 0 ? (notes[s.id] || '').replace(/"/g, '""') : ''}"\n`;
        csv += row;
      });
    });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
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

  const buildReportHtml = useCallback(async () => {
    const nowDate = new Date();
    const nowLabel = nowDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = nowDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ragione = data.ragione_sociale || 'Società non specificata';
    const logoUrl = await getLogoDataUrl();
    const sanitize = (value?: string) => (value || '').replace(/[✅✔️✔🟢🟩]/g, '').trim();
    const excludeNA = exportMode === 'excludeNA';
    const includeNotes = !isClient && exportIncludeConsultantNotes;

    let html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
    <title>Report Pre-Assessment — ${ragione}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { height: auto; }
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        background: #f6f8fb;
        color: #1c2738;
        font-size: 11pt;
        line-height: 1.5;
      }
      .pdf-page {
        width: 190mm;
        height: 277mm;
        padding: 0;
        margin: 0 auto;
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

      .cover-page {
        padding: 0;
        background: #f6f8fb;
      }
      .cover {
        height: 100%;
        width: 100%;
        padding: 40px 36px;
        border-radius: 18px;
        color: #eef2ff;
        background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #0f172a 100%);
        box-shadow: none;
        border: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .cover::before {
        content: '';
        position: absolute;
        top: -120px;
        right: -120px;
        width: 380px;
        height: 380px;
        border-radius: 999px;
        background: rgba(6, 182, 212, 0.2);
        filter: blur(10px);
      }
      .cover::after {
        content: '';
        position: absolute;
        bottom: -140px;
        left: -120px;
        width: 360px;
        height: 360px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.2);
        filter: blur(12px);
      }
      .cover-top { display: flex; align-items: center; gap: 16px; }
      .cover-top img { height: 64px; width: auto; }
      .cover-title { font-size: 28px; font-weight: 700; letter-spacing: 0.02em; }
      .cover-subtitle { font-size: 14px; opacity: 0.85; margin-top: 6px; }
      .cover-center { margin-top: 22px; }
      .cover-kicker { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.8; }
      .cover-heading { font-size: 36px; font-weight: 700; margin-top: 10px; color: #ffffff; }
      .cover-company { font-size: 18px; color: #dbeafe; margin-top: 12px; }
      .cover-meta { margin-top: 12px; font-size: 12px; color: #c7d2fe; }
      .cover-detail {
        margin-top: 14px;
        max-width: 520px;
        color: #dbeafe;
        font-size: 12px;
        line-height: 1.7;
      }
      .cover-features {
        margin-top: 10px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 18px;
      }
      .cover-feature {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 11px;
        color: #e2e8f0;
      }
      .cover-feature .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #22d3ee;
        margin-top: 5px;
        flex: none;
      }
      .cover-footer {
        display: flex;
        gap: 16px;
        align-items: center;
        font-size: 11px;
        color: #cbd5f5;
      }
      .cover-chip {
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.18);
        padding: 6px 10px;
        border-radius: 999px;
        font-weight: 600;
        letter-spacing: 0.04em;
      }
      .cover-content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; }
      .cover-band {
        margin-top: 14px;
        background: rgba(15, 23, 42, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 12px;
        padding: 12px 14px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .cover-band .item { display: flex; flex-direction: column; gap: 4px; }
      .cover-band .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: #cbd5f5; }
      .cover-band .value { font-size: 16px; font-weight: 700; color: #ffffff; }

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
      .index-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
      .index-group { margin-bottom: 8px; }
      .index-group-title {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 6px;
      }
      .index-item {
        font-size: 11px;
        color: #1f2937;
        margin-bottom: 4px;
      }

      .section {
        margin-bottom:16px;
        padding-bottom:10px;
        border-bottom:1px solid #e2e8f0;
      }
      .section:last-child { border-bottom: none; }
      .section h3 {
        font-size:13px;
        color:#1c2a44;
        margin-bottom:8px;
      }
      .macro-label {
        font-size: 10px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 6px;
      }
      .field {
        display:grid;
        grid-template-columns: minmax(200px, 42%) 1fr;
        column-gap: 12px;
        padding:6px 0;
        border-bottom:1px dashed #eef2f7;
        align-items: start;
      }
      .field:last-child { border-bottom: none; }
      .field-label { font-weight:600; color:#334155; font-size:10.5px; word-break: break-word; }
      .field-value { color:#1e293b; font-size:10.5px; white-space: pre-wrap; word-break: break-word; }
      .field-value svg, .field-value .icon, .field-value .status-icon { display: none !important; }
      .field-note {
        font-size:9.5px;
        font-style:italic;
        margin-top:4px;
        padding-left:8px;
        line-height:1.4;
      }
      .field-note .note-label { font-weight:700; margin-right:4px; }
      .field-note.user { color:#475569; border-left:2px solid #e2e8f0; }
      .field-note.user .note-label { color:#334155; }
      .field-note.consultant { color:#1e40af; border-left:2px solid #c7d2fe; }
      .field-note.consultant .note-label { color:#1e3a8a; }
      .empty { color:#94a3b8; font-style:italic; }
      .section-note {
        margin-top:8px;
        padding:8px 12px;
        background:#fefce8;
        border:1px solid #fef08a;
        border-radius:8px;
        font-size:10px;
        color:#713f12;
      }
      .section-page { display: block; }
      .section-page.last {
        display: flex;
        flex-direction: column;
      }
      .section-body { flex: 1; }

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
                <div class="cover-top">
                  <img src="${logoUrl}" alt="Resolv" />
                  <div>
                    <div class="cover-title">CHECKUP</div>
                    <div class="cover-subtitle">Checkup Governance • Pre-Assessment</div>
                  </div>
                </div>
                <div class="cover-center">
                  <div class="cover-kicker">Report Riservato</div>
                  <div class="cover-heading">Pre-Assessment Tool</div>
                  <div class="cover-company">${ragione}</div>
                  <div class="cover-meta">Generato il ${nowLabel} · ${nowTime}</div>
                  <div class="cover-detail">
                    Gestione professionale del checkup governance per studi legali e aziende.
                    Un report strutturato per decisioni rapide e tracciabilità completa.
                  </div>
                  <div class="cover-features">
                    <div class="cover-feature"><span class="dot"></span><span>Tracking completo e stato avanzamento in tempo reale</span></div>
                    <div class="cover-feature"><span class="dot"></span><span>Sicurezza, compliance e audit trail integrato</span></div>
                    <div class="cover-feature"><span class="dot"></span><span>Dashboard e report con KPI immediati</span></div>
                    <div class="cover-feature"><span class="dot"></span><span>Collaborazione studio-cliente con controllo accessi</span></div>
                  </div>
                </div>
                <div class="cover-band">
                  <div class="item"><div class="label">Sezioni</div><div class="value">${sections.length}</div></div>
                  <div class="item"><div class="label">Obbligatori</div><div class="value">${totalReq}</div></div>
                  <div class="item"><div class="label">Compilati</div><div class="value">${totalFilled}/${totalReq} (${pct}%)</div></div>
                </div>
                <div class="cover-footer">
                  <span class="cover-chip">v6.0</span>
                  <span>Documento ad uso interno e cliente</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pdf-page intro-page">
          <div class="client-summary">
            <h3>Cliente</h3>
            <div class="client-grid">
              <div class="client-item"><div class="label">Ragione sociale</div><div class="value">${ragione}</div></div>
              <div class="client-item"><div class="label">Codice fiscale / Partita IVA</div><div class="value">${data.cf_piva || '-'}</div></div>
              <div class="client-item"><div class="label">Sede legale</div><div class="value">${data.sede_legale || '-'}</div></div>
            </div>
          </div>

          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item"><div class="label">Sezioni</div><div class="value">${sections.length}</div></div>
              <div class="summary-item"><div class="label">Campi obbligatori</div><div class="value">${totalReq}</div></div>
              <div class="summary-item"><div class="label">Compilati</div><div class="value">${totalFilled}/${totalReq} (${pct}%)</div></div>
            </div>
          </div>`;

    const sectionsByMacro = macroAreas.map((m) => ({
      macro: m.label,
      sections: sections.filter((s) => s.macro === m.id),
    })).filter((g) => g.sections.length > 0);

    html += `<div class="index-page"><div class="index-title">Indice</div><div class="index-grid">`;
    sectionsByMacro.forEach((g, gIdx) => {
      html += `<div class="index-group"><div class="index-group-title">${g.macro}</div>`;
      g.sections.forEach((s, sIdx) => {
        html += `<div class="index-item">${gIdx + 1}.${sIdx + 1} ${s.title}</div>`;
      });
      html += `</div>`;
    });
    html += `</div></div>`;
    html += `</div>`;

    const macroLabelById = new Map(macroAreas.map((m) => [m.id, m.label]));
    const FIELDS_PER_PAGE = 14;
    const chunkFields = <T,>(arr: T[], size: number) => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const sectionPages = sections.flatMap((s) => {
      const fields = excludeNA ? s.fields.filter((f) => !naFields[f.id]) : s.fields;
      if (fields.length === 0) return [];
      const chunks = chunkFields(fields, FIELDS_PER_PAGE);
      return chunks.map((chunk, idx) => ({
        section: s,
        chunk,
        chunkIndex: idx,
        chunkCount: chunks.length,
      }));
    });

    sectionPages.forEach((page, pageIndex) => {
      const { section, chunk, chunkIndex, chunkCount } = page;
      const macroLabel = macroLabelById.get(section.macro) || '';
      const isLastPage = pageIndex === sectionPages.length - 1;
      const title = chunkIndex === 0 ? section.title : `${section.title} (continua)`;
      html += `<div class="pdf-page section-page ${isLastPage ? 'last' : ''}"><div class="section-body"><div class="section">`;
      html += `<div class="macro-label">${macroLabel}</div><h3>${title}</h3>`;
      chunk.forEach((f) => {
        const isNA = !!naFields[f.id];
        const rawValue = isNA ? 'N/A' : sanitize(data[f.id]);
        const v = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
        const un = !isNA ? sanitize(userFieldNotes[f.id]) : '';
        const fn = includeNotes && !isNA ? sanitize(fieldNotes[f.id]) : '';
        html += `<div class="field"><div class="field-label">${f.label}${f.required ? ' *' : ''}</div><div class="field-value">${v ? v.replace(/\n/g, '<br>') : '<span class="empty">—</span>'}`;
        if (un) html += `<div class="field-note user"><span class="note-label">Nota utente:</span>${un.replace(/\n/g, '<br>')}</div>`;
        if (fn) html += `<div class="field-note consultant"><span class="note-label">Nota consulente:</span>${fn.replace(/\n/g, '<br>')}</div>`;
        html += `</div></div>`;
      });
      const sectionNote = sanitize(notes[section.id]);
      if (chunkIndex === chunkCount - 1 && sectionNote) {
        html += `<div class="section-note"><strong>Note sezione:</strong> ${sectionNote.replace(/\n/g, '<br>')}</div>`;
      }
      html += `</div></div>`;
      if (isLastPage) {
        html += `
          <div class="footer">
            <div class="footer-logo">
              <img src="${logoUrl}" alt="Resolv" />
              <div class="footer-text">
                Software gestionale per studi legali e professionisti del settore creditizio<br>
                Report generato il ${nowLabel}
                <div class="copyright">© ${new Date().getFullYear()} Resolv. Tutti i diritti riservati.</div>
              </div>
            </div>
          </div>`;
      }
      html += `</div>`;
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
    getLogoDataUrl,
    totalReq,
    totalFilled,
    pct,
  ]);

  const generatePDF = async () => {
    setPdfLoading(true);
    setReportNotice(null);
    try {
      const html = await buildReportHtml();
      const blob = await preassessmentApi.downloadPdf(html);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pre_assessment_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
          setTicketNotice({ count: newTickets.length, at: Date.now() });
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
  }, [preassessmentId]);

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

  useEffect(() => {
    if (panel !== 'alerts' || !preassessmentId) return;
    loadAlerts();
  }, [panel, preassessmentId, loadAlerts]);

  const createTicket = async (subject: string, body: string) => {
    if (!preassessmentId) return;
    await preassessmentTicketApi.create(preassessmentId, subject, body);
    await loadTickets();
  };

  const replyTicket = async (ticketId: string, messaggio: string) => {
    await preassessmentTicketApi.reply(ticketId, messaggio);
    await loadTickets();
  };

  const createAlert = async (payload: { targetUserId?: string; priority?: string; messaggio: string }) => {
    if (!preassessmentId) return;
    await preassessmentAlertApi.create(preassessmentId, payload);
    await loadAlerts();
  };

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
              <div className="relative flex-1">
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
                            <button
                              type="button"
                              onClick={() => handleSelectClient(c.client.id)}
                              className="wow-button-ghost"
                            >
                              Apri checkup
                            </button>
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

    const completedSections = sections.filter((s) => {
      const t = sTotal(s);
      return t > 0 && sDone(s) === t;
    }).length;

    const filteredMacros = macroAreas.filter((m) => m.id !== 'k');
    const validatedCount = filteredMacros.filter((m) => macroValidations[m.id]).length;
    const macroRows = filteredMacros.map((m) => {
      const sects = sections.filter((s) => s.macro === m.id);
      const total = sects.reduce((a, s) => a + sTotal(s), 0);
      const done = sects.reduce((a, s) => a + sDone(s), 0);
      const naCount = sects.reduce((a, s) => a + sNA(s), 0);
      const pctMacro = total > 0 ? Math.round((done / total) * 100) : 0;
      const ownerInfo = getOwnerInfo(data, m.id);
      const validated = !!macroValidations[m.id];
      const validatedSections = sects.filter((s) => sectionValidations[s.id]).length;
      return { ...m, total, done, naCount, pctMacro, sections: sects.length, ownerInfo, validated, validatedSections };
    });
    const totalSectionsToValidate = macroRows.reduce((acc, row) => acc + row.sections, 0);
    const validatedSectionsTotal = macroRows.reduce((acc, row) => acc + row.validatedSections, 0);
    const sectionCards = sections.filter((s) => s.fields.some(fieldMatchesFilter));

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
              {compilerName && (
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
            { label: 'Macro Aree', value: macroAreas.length, detail: 'aree tematiche' },
            { label: 'Sezioni', value: sections.length, detail: `${completedSections} completate` },
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

        <div className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Stato per Macro Area</h3>
            {validatedCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {validatedCount}/{filteredMacros.length} validate
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
                  <tr key={row.id} className="text-slate-700">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.label}</td>
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
                          row.pctMacro === 0
                            ? 'bg-slate-100 text-slate-500'
                            : row.pctMacro === 100 && row.validated
                              ? 'bg-emerald-100 text-emerald-600'
                              : row.pctMacro === 100
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {row.pctMacro === 0
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
                            className={`h-full rounded-full ${row.pctMacro === 100 && !row.validated ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${row.pctMacro}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{row.pctMacro}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {macroValidations[row.id] ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Validata</span>
                          <span className="text-[10px] text-slate-400">
                            {macroValidations[row.id].by.name} • {new Date(macroValidations[row.id].at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {assessmentStatus !== 'concluso' && isOwnerForMacro(row.id) && (
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
                          {assessmentStatus !== 'concluso' && isOwnerForMacro(row.id) && row.pctMacro === 100 ? (
                            <button
                              onClick={() => handleValidateMacro(row.id)}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                            >
                              Valida
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {row.pctMacro === 100 ? 'Non validata' : 'Completare'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sectionCards.length === 0 ? (
          <div className="wow-panel p-6 text-sm text-slate-500">
            Nessuna sezione corrisponde al filtro selezionato.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sectionCards.map((s) => {
              const done = sDone(s);
              const total = sTotal(s);
              const naCount = sNA(s);
              const sp = total > 0 ? Math.round((done / total) * 100) : 0;
              const macro = macroAreas.find((m) => m.id === s.macro);
              const isValidated = !!sectionValidations[s.id];
              const ownerInfo = getOwnerInfo(data, s.macro);
              const realIndex = sections.findIndex((sec) => sec.id === s.id);
              return (
              <button
                key={s.id}
                onClick={() => {
                  if (realIndex < 0) return;
                  setView(realIndex);
                  setPanel(null);
                }}
                className={`wow-card p-4 text-left transition hover:border-blue-300 ${isValidated ? 'border-emerald-200' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: macro?.color }}>{macro?.label}</span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    {isValidated ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    )}
                    <span>{done}/{total}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Owner: {ownerInfo?.primary || '—'}
                  {ownerInfo?.secondary && ` • ${ownerInfo.secondary}`}
                </div>
                <div className={`mt-1 text-[11px] font-semibold ${isValidated ? 'text-emerald-600' : 'text-amber-600'}`}>
                  Validazione: {isValidated ? 'Sì' : 'No'}
                </div>
                {naCount > 0 && (
                  <div className="mt-1 text-[11px] font-semibold text-rose-600">N/A: {naCount}</div>
                )}
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${sp}%`, background: sp === 100 ? '#10b981' : macro?.color }} />
                </div>
              </button>
            );
            })}
          </div>
        )}
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
    return (
      <div className="space-y-4">
        {readOnly && (
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
                  {assessmentStatus !== 'concluso' && (
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
              {view === 0 ? 'Dashboard' : 'Precedente'}
            </button>
            <span className="text-xs font-semibold text-slate-400">{(view as number) + 1}/{sections.length}</span>
            <button
              onClick={() => (view === sections.length - 1 ? setView('dashboard') : setView((view as number) + 1))}
              className="wow-button"
            >
              {view === sections.length - 1 ? 'Dashboard' : 'Successiva'}
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="wow-chip">Checkup Governance</div>
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
              {readOnly && (
                <div className="text-amber-700 font-semibold">Sola lettura • Modifiche non autorizzate dal cliente</div>
              )}
              {assessmentStatus === 'concluso' && (
                <div className="text-emerald-700 font-semibold">Checkup concluso</div>
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
              {saving && (
                <span className="text-xs font-semibold text-slate-500">Salvataggio…</span>
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
                  {!isClient && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={exportIncludeConsultantNotes}
                        onChange={(e) => setExportIncludeConsultantNotes(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      Note consulente
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isClient && (
                    <button onClick={exportJSON} className="wow-button-ghost">JSON</button>
                  )}
                  <button onClick={exportCSV} className="wow-button-ghost">CSV</button>
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
            />
          )}
          {panel === 'tickets' && showAssessment && (
            <TicketPanel
              tickets={tickets}
              onNew={createTicket}
              onReply={replyTicket}
              onAssign={async (ticketId) => {
                await preassessmentTicketApi.assign(ticketId);
                await loadTickets();
              }}
              onRequestClose={async (ticketId) => {
                await preassessmentTicketApi.requestClose(ticketId);
                await loadTickets();
              }}
              onConfirmClose={async (ticketId) => {
                await preassessmentTicketApi.confirmClose(ticketId);
                await loadTickets();
              }}
              onReopen={async (ticketId) => {
                await preassessmentTicketApi.reopen(ticketId);
                await loadTickets();
              }}
              currentUserId={user?.id}
              isAdmin={user?.ruolo !== 'cliente'}
              ticketNotice={ticketNotice}
            />
          )}
          {panel === 'alerts' && showAssessment && (
            <AlertPanel
              alerts={alerts}
              onNew={createAlert}
              users={clients.map((c) => ({
                id: c.client.id,
                name: `${c.client.nome} ${c.client.cognome}`.trim(),
              }))}
              isAdmin={canCreateAlert}
              currentUserId={user?.id}
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
          chatCount={chatUnreadCount}
          openTickets={openTickets}
        />,
        sidebarTarget,
      )}
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
  chatCount,
  openTickets,
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
  chatCount: number;
  openTickets: number;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {hasAssessment && (
          <>
            <button
              onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
              className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${panel === 'chat' ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span
                className={[
                  'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                  panel === 'chat'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                ].join(' ')}
              />
              <MessageCircle className="h-4 w-4 text-slate-400 group-hover:text-white transition-all duration-200" />
              Chat
              {chatCount > 0 && (
                <span className="ml-auto rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {chatCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanel(panel === 'tickets' ? null : 'tickets')}
              className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${panel === 'tickets' ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span
                className={[
                  'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                  panel === 'tickets'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                ].join(' ')}
              />
              <Ticket className="h-4 w-4 text-slate-400 group-hover:text-white transition-all duration-200" />
              Ticket
              {openTickets > 0 && (
                <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {openTickets}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanel(panel === 'alerts' ? null : 'alerts')}
              className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${panel === 'alerts' ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span
                className={[
                  'h-7 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                  panel === 'alerts'
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                ].join(' ')}
              />
              <Bell className="h-4 w-4 text-slate-400 group-hover:text-white transition-all duration-200" />
              Alert
            </button>
          </>
        )}
      </div>

      {hasAssessment && !panel && (
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
                  {g.label}
                  <ChevronDown className={`h-3 w-3 text-slate-500 transition ${collapsed[g.id] ? '-rotate-90' : ''}`} />
                </button>
                {!collapsed[g.id] && g.sections.map((s) => {
                  const idx = sections.findIndex((sec) => sec.id === s.id);
                  const active = view === idx && !panel;
                  const done = sDone(s);
                  const total = sTotal(s);
                  const na = sNA(s);
                  const isValidated = !!validations[s.macro];
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (idx < 0) return;
                        setView(idx);
                        setPanel(null);
                      }}
                      className={`group relative flex w-full items-center justify-between rounded-2xl px-3 py-2 text-xs transition-colors ${active ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/40' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span
                        className={[
                          'h-6 w-1 rounded-full bg-indigo-400 transition-all duration-300',
                          active
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0',
                        ].join(' ')}
                      />
                      <span className="truncate">{s.title}</span>
                      <span className={`flex items-center gap-2 text-[10px] font-semibold ${total > 0 && done === total ? 'text-emerald-300' : done > 0 ? 'text-blue-200' : 'text-slate-500'}`}>
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
}: {
  messages: PreassessmentChatMessage[];
  onSend: (msg: string) => Promise<void> | void;
  onTyping: (active: boolean) => void;
  canSend: boolean;
  currentUserId?: string;
  otherName: string;
  typingUsers: Array<{ userId: string; name: string; ruolo: string }>;
}) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="wow-panel flex h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">
        Chat con {otherName}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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

function TicketPanel({
  tickets,
  onNew,
  onReply,
  onAssign,
  onRequestClose,
  onConfirmClose,
  onReopen,
  currentUserId,
  isAdmin,
  ticketNotice,
}: {
  tickets: PreassessmentTicket[];
  onNew: (subject: string, body: string) => Promise<void> | void;
  onReply: (ticketId: string, messaggio: string) => Promise<void> | void;
  onAssign: (ticketId: string) => Promise<void> | void;
  onRequestClose: (ticketId: string) => Promise<void> | void;
  onConfirmClose: (ticketId: string) => Promise<void> | void;
  onReopen: (ticketId: string) => Promise<void> | void;
  currentUserId?: string;
  isAdmin: boolean;
  ticketNotice?: { count: number; at: number } | null;
}) {
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const selected = selectedId ? tickets.find((t) => t.id === selectedId) : null;

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  const handleCreate = async () => {
    if (!subject.trim() || !body.trim()) return;
    await onNew(subject.trim(), body.trim());
    setSubject('');
    setBody('');
    setShowNew(false);
  };

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    await onReply(selected.id, reply.trim());
    setReply('');
  };

  const statusLabel = (status: PreassessmentTicket['status']) => {
    if (status === 'open') return 'Aperto';
    if (status === 'in_progress') return 'In lavorazione';
    if (status === 'pending_close') return 'In chiusura';
    return 'Chiuso';
  };

  const statusClass = (status: PreassessmentTicket['status']) => {
    if (status === 'open') return 'bg-amber-100 text-amber-700';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (status === 'pending_close') return 'bg-purple-100 text-purple-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div className="wow-panel flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Ticket {isAdmin ? 'dai clienti' : ''}</h3>
        <div className="flex-1" />
        {!isAdmin && (
          <button onClick={() => setShowNew(true)} className="wow-button-ghost text-xs">
            Nuovo
          </button>
        )}
      </div>
      {ticketNotice && isAdmin && (
        <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-xs text-blue-700">
          {ticketNotice.count} nuovo ticket ricevuto
        </div>
      )}
      {showNew && (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Oggetto"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Descrizione..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="wow-button text-xs">Invia</button>
            <button onClick={() => setShowNew(false)} className="wow-button-ghost text-xs">Annulla</button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {tickets.length === 0 && (
          <div className="p-10 text-center text-xs text-slate-400">Nessun ticket.</div>
        )}
        {!selected && tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className="w-full border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(t.status)}`}>
                {statusLabel(t.status)}
              </span>
              <span className="text-sm font-semibold text-slate-900">{t.subject}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {new Date(t.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              {' '}— {(t.messages || []).length} risposte
            </div>
            {t.assignedTo && (
              <div className="mt-1 text-[11px] text-slate-500">
                In carico a {t.assignedTo.nome} {t.assignedTo.cognome}
              </div>
            )}
          </button>
        ))}
        {selected && (
          <div className="p-5">
            <button onClick={() => setSelectedId(null)} className="wow-button-ghost text-xs">
              <ChevronLeft className="h-4 w-4" /> Indietro
            </button>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">{selected.subject}</h4>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(selected.status)}`}>
                {statusLabel(selected.status)}
              </span>
              {selected.assignedTo && (
                <span className="text-[11px] text-slate-500">
                  In carico a {selected.assignedTo.nome} {selected.assignedTo.cognome}
                </span>
              )}
            </div>
            <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {selected.body}
              <div className="mt-2 text-[10px] text-slate-400">
                {new Date(selected.createdAt).toLocaleString('it-IT')}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(selected.messages || []).map((r) => (
                <div key={r.id} className={`rounded-xl border-l-4 p-3 text-xs ${r.userId === currentUserId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="mb-1 text-[10px] font-semibold text-slate-500">
                    {r.user.nome} {r.user.cognome}
                  </div>
                  <div>{r.messaggio}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {new Date(r.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isAdmin && selected.status !== 'closed' && (
                <>
                  {selected.status === 'open' && (
                    <button onClick={() => onAssign(selected.id)} className="wow-button-ghost text-xs">
                      Prendi in carico
                    </button>
                  )}
                  {selected.status === 'in_progress' && selected.assignedToId === currentUserId && (
                    <button onClick={() => onRequestClose(selected.id)} className="wow-button text-xs">
                      Richiedi chiusura
                    </button>
                  )}
                  {selected.status === 'pending_close' && (
                    <span className="text-[11px] text-slate-500">In attesa di conferma cliente</span>
                  )}
                </>
              )}
              {!isAdmin && selected.status === 'pending_close' && (
                <button onClick={() => onConfirmClose(selected.id)} className="wow-button text-xs">
                  Conferma chiusura
                </button>
              )}
              {isAdmin && selected.status === 'closed' && (
                <button onClick={() => onReopen(selected.id)} className="wow-button-ghost text-xs">
                  Riapri ticket
                </button>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Rispondi..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
              <button onClick={handleReply} className="wow-button text-xs">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertPanel({
  alerts,
  onNew,
  users,
  isAdmin,
  currentUserId,
}: {
  alerts: PreassessmentAlert[];
  onNew: (payload: { targetUserId?: string; priority?: string; messaggio: string }) => Promise<void> | void;
  users: { id: string; name: string }[];
  isAdmin: boolean;
  currentUserId?: string;
}) {
  const [showNew, setShowNew] = useState(false);
  const [target, setTarget] = useState('');
  const [priority, setPriority] = useState('info');
  const [text, setText] = useState('');

  const handleCreate = async () => {
    if (!text.trim()) return;
    await onNew({
      targetUserId: target || undefined,
      priority,
      messaggio: text.trim(),
    });
    setText('');
    setTarget('');
    setPriority('info');
    setShowNew(false);
  };

  return (
    <div className="wow-panel flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Alert</h3>
        <div className="flex-1" />
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="wow-button text-xs bg-rose-600 hover:bg-rose-700">
            Nuovo
          </button>
        )}
      </div>
      {showNew && isAdmin && (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 space-y-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="">Me stesso (promemoria)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="info">Info</option>
            <option value="warning">Attenzione</option>
            <option value="urgent">Urgente</option>
          </select>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Testo alert..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="wow-button text-xs bg-rose-600 hover:bg-rose-700">Invia Alert</button>
            <button onClick={() => setShowNew(false)} className="wow-button-ghost text-xs">Annulla</button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {alerts.length === 0 && (
          <div className="p-10 text-center text-xs text-slate-400">Nessun alert.</div>
        )}
        {alerts.map((a) => {
          const colors: Record<string, { fg: string; bg: string }> = {
            info: { fg: '#2563eb', bg: '#eff6ff' },
            warning: { fg: '#d97706', bg: '#fef3c7' },
            urgent: { fg: '#dc2626', bg: '#fee2e2' },
          };
          const color = colors[a.priority] || colors.info;
          const targetName = a.targetUserId === currentUserId ? 'Me stesso' : a.targetUser
            ? `${a.targetUser.nome} ${a.targetUser.cognome}`.trim()
            : '';
          return (
            <div key={a.id} className="rounded-xl p-3" style={{ background: color.bg, borderLeft: `4px solid ${color.fg}` }}>
              <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: color.fg }}>
                {a.priority === 'urgent' ? 'URGENTE' : a.priority === 'warning' ? 'ATTENZIONE' : 'INFO'}
                <span className="text-slate-400 font-normal">
                  {new Date(a.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-700">{a.messaggio}</div>
              {targetName && (
                <div className="mt-1 text-[10px] text-slate-500">Destinatario: {targetName}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FormField = memo(function FormField({
  field,
  value,
  onChange,
  consultantNote,
  userNote,
  onConsultantNoteChange,
  onUserNoteChange,
  readOnly = false,
  fieldMeta,
  activeEditor,
  currentUserId,
  onFieldFocus,
  onFieldBlur,
  naChecked = false,
  onNaChange,
  canEditConsultantNotes = false,
  canEditUserNotes = false,
  documents = [],
  documentsLoading = false,
  documentsEnabled = true,
  onUploadDocument,
  onDeleteDocument,
  onDownloadDocument,
  onPreviewDocument,
  sectionId,
  ownerProtected = false,
}: {
  field: FieldSpec;
  value: string;
  onChange: (id: string, val: string) => void;
  consultantNote?: string;
  userNote?: string;
  onConsultantNoteChange: (id: string, val: string) => void;
  onUserNoteChange: (id: string, val: string) => void;
  readOnly?: boolean;
  ownerProtected?: boolean;
  fieldMeta?: { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } };
  activeEditor?: { userId: string; name: string };
  currentUserId?: string;
  onFieldFocus?: (id: string) => void;
  onFieldBlur?: (id: string) => void;
  naChecked?: boolean;
  onNaChange?: (id: string, checked: boolean) => void;
  canEditConsultantNotes?: boolean;
  canEditUserNotes?: boolean;
  documents?: PreassessmentDocument[];
  documentsLoading?: boolean;
  documentsEnabled?: boolean;
  onUploadDocument?: (fieldId: string, sectionId: string, file: File) => Promise<void> | void;
  onDeleteDocument?: (docId: string) => Promise<void> | void;
  onDownloadDocument?: (doc: PreassessmentDocument) => Promise<void> | void;
  onPreviewDocument?: (doc: PreassessmentDocument) => void;
  sectionId: string;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showUserNote, setShowUserNote] = useState(Boolean(userNote));
  const [showConsultantNote, setShowConsultantNote] = useState(Boolean(consultantNote));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const isEditingOther = activeEditor && activeEditor.userId !== currentUserId;
  const showModified = !!fieldMeta;
  const modifiedAt = fieldMeta
    ? new Date(fieldMeta.updatedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const disabled = readOnly || ownerProtected || !!isEditingOther || naChecked;
  const consultantNoteDisabled = !!isEditingOther || naChecked;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadDocument) return;

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('Il file supera la dimensione massima consentita di 15 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploadError(null);

    setUploading(true);
    try {
      await onUploadDocument(field.id, sectionId, file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (userNote) setShowUserNote(true);
  }, [userNote]);

  useEffect(() => {
    if (consultantNote) setShowConsultantNote(true);
  }, [consultantNote]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!helpRef.current) return;
      if (!helpRef.current.contains(e.target as Node)) setShowHelp(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const renderValue = (raw: string) => {
    if (!raw) return '';
    if (raw.includes('||')) return raw.split('||').join(', ');
    return raw;
  };

  return (
    <div className={`space-y-2 rounded-xl ${isEditingOther ? 'ring-2 ring-blue-200/70 bg-blue-50/40 p-3' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <label className={`text-sm font-medium ${naChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {field.label}
          {field.required && !naChecked && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {showModified && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
              Ultima modifica: {fieldMeta?.updatedBy.name} • {modifiedAt}
            </span>
          )}
          {isEditingOther && (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 border border-blue-200 rounded-full px-2 py-0.5">
              In modifica da {activeEditor?.name}
            </span>
          )}
          {ownerProtected && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
              <Lock className="h-2.5 w-2.5" />
              Campo Studio
            </span>
          )}
          {!readOnly && !ownerProtected && !isEditingOther && (
            <label className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-semibold ${naChecked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500'}`}>
              <input
                type="checkbox"
                checked={naChecked}
                onChange={(e) => onNaChange?.(field.id, e.target.checked)}
                className="h-3 w-3 rounded border-slate-300 text-rose-600"
              />
              N/A
            </label>
          )}
          {canEditUserNotes && !naChecked && (
            <button
              type="button"
              onClick={() => setShowUserNote((p) => !p)}
              className={`rounded-md border px-2 py-1 text-xs transition ${showUserNote || userNote ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              title="Nota utente"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          )}
          {canEditConsultantNotes && !naChecked && (
            <button
              type="button"
              onClick={() => setShowConsultantNote((p) => !p)}
              className={`rounded-md border px-2 py-1 text-xs transition ${showConsultantNote || consultantNote ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              title="Nota consulente"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          )}
          {field.help && (
            <div className="relative" ref={helpRef}>
              <button
                type="button"
                onClick={() => setShowHelp((p) => !p)}
                className={`rounded-md border px-2 py-1 text-xs transition ${showHelp ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {showHelp && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-blue-100/60 bg-white/95 p-3 text-xs text-slate-600 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">INFORMAZIONI</div>
                  <div className="mt-2 whitespace-pre-wrap">{field.help}</div>
                  <button
                    type="button"
                    onClick={() => setShowHelp(false)}
                    className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 hover:text-blue-700"
                  >
                    CHIUDI
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {naChecked && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
          Campo contrassegnato come Non Applicabile
        </div>
      )}

      {field.type === 'textarea' && (
        <textarea
          value={renderValue(value)}
          onChange={(e) => onChange(field.id, e.target.value)}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          rows={3}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}

      {field.type === 'select' && (
        <CustomSelect
          value={value}
          onChange={(val) => onChange(field.id, val)}
          options={getOptions(field).map((o) => ({
            value: o,
            label: DOC_ICON_FIELDS.has(field.id)
              ? getOptionLabel(field, o)
              : getAssettiOptionLabel(field, o),
          }))}
          placeholder="— Selezionare —"
          triggerClassName="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm"
          disabled={disabled}
          onOpen={() => onFieldFocus?.(field.id)}
          onClose={() => onFieldBlur?.(field.id)}
        />
      )}

      {field.type === 'multiselect' && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          {(field.options || []).map((o) => {
            const selected = (value || '').split('||').filter(Boolean).includes(o);
            return (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  const current = (value || '').split('||').filter(Boolean);
                  const next = selected ? current.filter((x) => x !== o) : [...current, o];
                  onFieldFocus?.(field.id);
                  onChange(field.id, next.join('||'));
                  onFieldBlur?.(field.id);
                }}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}

      {field.type === 'text' && (
        <input
          type="text"
          value={renderValue(value)}
          onChange={(e) => onChange(field.id, e.target.value)}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}

      {documentsEnabled && field.allowDocuments !== false && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Documenti allegati</span>
            {documentsLoading && (
              <span className="text-[10px] text-slate-400">Caricamento...</span>
            )}
          </div>
          {documents.length > 0 ? (
            <div className="mt-2 space-y-1">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => onDownloadDocument?.(doc)}
                    className="truncate text-left text-slate-700 hover:text-blue-700 flex-1 min-w-0"
                  >
                    {doc.nomeOriginale}
                  </button>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onPreviewDocument?.(doc)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Anteprima"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onDeleteDocument?.(doc.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-400">Nessun documento caricato.</div>
          )}
          {!readOnly && (
            <>
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setUploadError(null); fileRef.current?.click(); }}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Caricamento...' : 'Carica documento'}
                </button>
                <span className="text-[10px] text-slate-400">Max 15 MB</span>
              </div>
              {uploadError && (
                <p className="mt-1 text-[10px] text-rose-600">{uploadError}</p>
              )}
            </>
          )}
        </div>
      )}

      {showUserNote && canEditUserNotes && !naChecked && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-blue-700">Nota utente</label>
          <textarea
            value={userNote || ''}
            onChange={(e) => onUserNoteChange(field.id, e.target.value)}
            onFocus={() => onFieldFocus?.(field.id)}
            onBlur={() => onFieldBlur?.(field.id)}
            rows={2}
            placeholder="Nota utente..."
            disabled={disabled}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      )}

      {!canEditUserNotes && userNote && !naChecked && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <strong>Nota utente:</strong> {userNote}
        </div>
      )}

      {showConsultantNote && canEditConsultantNotes && !naChecked && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-amber-700">Nota consulente</label>
          <textarea
            value={consultantNote || ''}
            onChange={(e) => onConsultantNoteChange(field.id, e.target.value)}
            onFocus={() => onFieldFocus?.(field.id)}
            onBlur={() => onFieldBlur?.(field.id)}
            rows={2}
            placeholder="Nota consulente..."
            disabled={consultantNoteDisabled}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      )}

      {!canEditConsultantNotes && consultantNote && !naChecked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Nota consulente:</strong> {consultantNote}
        </div>
      )}
    </div>
  );
});

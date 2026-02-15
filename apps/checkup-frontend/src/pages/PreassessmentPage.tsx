import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  StickyNote,
  HelpCircle,
  Download,
  Printer,
  MessageCircle,
  Ticket,
  Bell,
  Send,
  Eye,
  Users,
} from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
import {
  MACRO_AREAS,
  SECTIONS,
  FieldSpec,
  SectionSpec,
} from '../data/preassessment';
import {
  preassessmentApi,
  preassessmentChatApi,
  preassessmentTicketApi,
  preassessmentAlertApi,
  PreassessmentClientEntry,
  PreassessmentClientRecord,
  PreassessmentChatMessage,
  PreassessmentTicket,
  PreassessmentAlert,
} from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';

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
  const opts = [...(field.options || [])];
  if (DOC_ICON_FIELDS.has(field.id)) return opts;
  if (!opts.some((o) => o.toLowerCase().includes('non applicabile') || o === 'N/A')) {
    opts.push('Non applicabile');
  }
  if (!opts.some((o) => o.toLowerCase().includes('non disponibile') || o === 'N/D')) {
    opts.push('Non disponibile');
  }
  return opts;
}

function getInitialData() {
  const init: Record<string, string> = {};
  SECTIONS.forEach((s) => s.fields.forEach((f) => { init[f.id] = ''; }));
  return init;
}

const CHAT_SECTION_ID = 'general';

export default function PreassessmentPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.ruolo === 'cliente';
  const isStaff = !!user && user.ruolo !== 'cliente';
  const canChat = user?.ruolo === 'cliente' || user?.ruolo === 'collaboratore';
  const canCreateAlert = user?.ruolo === 'admin_studio';

  const [clients, setClients] = useState<PreassessmentClientEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId ?? null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<PreassessmentClientEntry[]>([]);
  const [clientSearched, setClientSearched] = useState(false);

  const [data, setData] = useState<Record<string, string>>(getInitialData);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [studioCanEdit, setStudioCanEdit] = useState(false);
  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<PreassessmentClientRecord['client'] | null>(null);
  const [view, setView] = useState<'dashboard' | number>('dashboard');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showExport, setShowExport] = useState(false);
  const [panel, setPanel] = useState<'chat' | 'tickets' | 'alerts' | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<PreassessmentChatMessage[]>([]);
  const [tickets, setTickets] = useState<PreassessmentTicket[]>([]);
  const [alerts, setAlerts] = useState<PreassessmentAlert[]>([]);

  const didInitRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoDataUrlRef = useRef<string | null>(null);
  const sidebarTarget = typeof document !== 'undefined' ? document.getElementById('checkup-subnav') : null;

  const activeClientId = isClient ? user?.id ?? null : selectedClientId;
  const canEdit = isClient || (isStaff && studioCanEdit);
  const readOnly = !canEdit;
  const showAssessment = !!activeClientId && !!preassessmentId;

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
          setData(getInitialData());
          setNotes({});
          setFieldNotes({});
          setStudioCanEdit(false);
          setLastSavedAt(null);
          return;
        }

        if (isStaff && activeClientId) {
          const res = await preassessmentApi.getClient(activeClientId);
          if (!isMounted) return;
          const base = getInitialData();
          setClientInfo(res.client);
          setPreassessmentId(res.preassessment.id);
          setStudioCanEdit(res.preassessment.studioCanEdit);
          setData({ ...base, ...(res.preassessment.data || {}) });
          setNotes(res.preassessment.notes || {});
          setFieldNotes(res.preassessment.fieldNotes || {});
          setLastSavedAt(new Date(res.preassessment.updatedAt).toLocaleTimeString('it-IT'));
          didInitRef.current = true;
          return;
        }

        const res = await preassessmentApi.get();
        if (!isMounted) return;
        const base = getInitialData();
        setClientInfo(null);
        setPreassessmentId(res.id);
        setStudioCanEdit(res.studioCanEdit);
        setData({ ...base, ...(res.data || {}) });
        setNotes(res.notes || {});
        setFieldNotes(res.fieldNotes || {});
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
    setView('dashboard');
    setPanel(null);
  }, [activeClientId]);

  useEffect(() => {
    if (!didInitRef.current) return;
    if (!canEdit) return;
    if (!preassessmentId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      const payload = { data, notes, fieldNotes, studioCanEdit: isClient ? studioCanEdit : undefined };
      const promise = isStaff && activeClientId
        ? preassessmentApi.updateClient(activeClientId, payload)
        : preassessmentApi.update(payload);
      promise
        .then((res) => {
          setLastSavedAt(new Date(res.updatedAt).toLocaleTimeString('it-IT'));
        })
        .catch(() => {
          setError('Errore durante il salvataggio');
        })
        .finally(() => setSaving(false));
    }, 700);
  }, [data, notes, fieldNotes, studioCanEdit, canEdit, isClient, isStaff, activeClientId, preassessmentId]);

  const handleChange = useCallback((id: string, val: string) => {
    if (!canEdit) return;
    setData((p) => ({ ...p, [id]: val }));
  }, [canEdit]);

  const handleFieldNote = useCallback((id: string, val: string) => {
    if (!canEdit) return;
    setFieldNotes((p) => ({ ...p, [id]: val }));
  }, [canEdit]);

  const handleSectionNote = useCallback((id: string, val: string) => {
    if (!canEdit) return;
    setNotes((p) => ({ ...p, [id]: val }));
  }, [canEdit]);

  const totalReq = useMemo(
    () => SECTIONS.reduce((a, s) => a + s.fields.filter((f) => f.required).length, 0),
    [],
  );
  const totalFilled = useMemo(
    () => SECTIONS.reduce((a, s) => a + s.fields.filter((f) => f.required && data[f.id]?.trim()).length, 0),
    [data],
  );
  const totalFields = useMemo(
    () => SECTIONS.reduce((a, s) => a + s.fields.length, 0),
    [],
  );
  const pct = totalReq > 0 ? Math.round((totalFilled / totalReq) * 100) : 0;

  const sDone = (s: SectionSpec) => s.fields.filter((f) => f.required && data[f.id]?.trim()).length;
  const sTotal = (s: SectionSpec) => s.fields.filter((f) => f.required).length;

  const filtered = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const t = search.toLowerCase();
    return SECTIONS.filter((s) =>
      s.title.toLowerCase().includes(t)
      || s.description.toLowerCase().includes(t)
      || s.fields.some((f) => f.label.toLowerCase().includes(t)),
    );
  }, [search]);

  const grouped = useMemo(
    () => MACRO_AREAS
      .map((m) => ({ ...m, sections: filtered.filter((s) => s.macro === m.id) }))
      .filter((g) => g.sections.length > 0),
    [filtered],
  );

  const activeSection = typeof view === 'number' ? SECTIONS[view] : null;
  const activeMacro = activeSection ? MACRO_AREAS.find((m) => m.id === activeSection.macro) : null;

  const exportJSON = () => {
    const exp = {
      tool: 'Governance Pre-Assessment Tool v6.0',
      data_compilazione: new Date().toISOString(),
      sezioni: SECTIONS.map((s) => ({
        id: s.id,
        titolo: s.title,
        macro_area: MACRO_AREAS.find((m) => m.id === s.macro)?.label,
        risposte: Object.fromEntries(
          s.fields.map((f) => [
            f.id,
            { label: f.label, valore: data[f.id] || '', nota_campo: fieldNotes[f.id] || '' },
          ]),
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
    let csv = 'Macro Area;Sezione;Campo;Obbligatorio;Valore;Nota Campo;Note Sezione\n';
    SECTIONS.forEach((s) => {
      const m = MACRO_AREAS.find((x) => x.id === s.macro)?.label || '';
      s.fields.forEach((f, i) => {
        csv += `"${m}";"${s.title}";"${f.label}";"${f.required ? 'Sì' : 'No'}";"${(data[f.id] || '').replace(/"/g, '""').replace(/\n/g, ' ')}";"${(fieldNotes[f.id] || '').replace(/"/g, '""')}";"${i === 0 ? (notes[s.id] || '').replace(/"/g, '""') : ''}"\n`;
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

  const generatePDF = async () => {
    const nowDate = new Date();
    const nowLabel = nowDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = nowDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ragione = data.ragione_sociale || 'Società non specificata';
    const logoUrl = await getLogoDataUrl();
    const sanitize = (value?: string) => (value || '').replace(/[✅✔️✔🟢🟩]/g, '').trim();

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
        color:#1e40af;
        font-style:italic;
        margin-top:4px;
        padding-left:8px;
        border-left:2px solid #c7d2fe;
        line-height:1.4;
      }
      .field-note .note-label { font-weight:700; color:#1e3a8a; margin-right:4px; }
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
                  <div class="item"><div class="label">Sezioni</div><div class="value">${SECTIONS.length}</div></div>
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
              <div class="client-item"><div class="label">Email</div><div class="value">${data.email || '-'}</div></div>
              <div class="client-item"><div class="label">Partita IVA</div><div class="value">${data.partita_iva || '-'}</div></div>
              <div class="client-item"><div class="label">Codice Fiscale</div><div class="value">${data.codice_fiscale || '-'}</div></div>
            </div>
          </div>

          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item"><div class="label">Sezioni</div><div class="value">${SECTIONS.length}</div></div>
              <div class="summary-item"><div class="label">Campi obbligatori</div><div class="value">${totalReq}</div></div>
              <div class="summary-item"><div class="label">Compilati</div><div class="value">${totalFilled}/${totalReq} (${pct}%)</div></div>
            </div>
          </div>`;

    const sectionsByMacro = MACRO_AREAS.map((m) => ({
      macro: m.label,
      sections: SECTIONS.filter((s) => s.macro === m.id),
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

    const macroLabelById = new Map(MACRO_AREAS.map((m) => [m.id, m.label]));
    const FIELDS_PER_PAGE = 14;
    const chunkFields = <T,>(arr: T[], size: number) => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const sectionPages = SECTIONS.flatMap((s) => {
      const chunks = chunkFields(s.fields, FIELDS_PER_PAGE);
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
        const v = sanitize(data[f.id]);
        const fn = sanitize(fieldNotes[f.id]);
        html += `<div class="field"><div class="field-label">${f.label}${f.required ? ' *' : ''}</div><div class="field-value">${v ? v.replace(/\n/g, '<br>') : '<span class="empty">—</span>'}`;
        if (fn) html += `<div class="field-note"><span class="note-label">Nota risposta:</span>${fn.replace(/\n/g, '<br>')}</div>`;
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

    preassessmentApi.downloadPdf(html)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pre_assessment_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Errore durante la generazione del PDF');
      });
  };

  const loadChat = useCallback(async () => {
    if (!preassessmentId) return;
    try {
      const msgs = await preassessmentChatApi.getMessages(preassessmentId, CHAT_SECTION_ID);
      setChatMessages(msgs);
      for (const msg of msgs) {
        if (!msg.letto && msg.userId !== user?.id) {
          preassessmentChatApi.markAsRead(msg.id).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }, [preassessmentId, user?.id]);

  const loadTickets = useCallback(async () => {
    if (!preassessmentId) return;
    try {
      const res = await preassessmentTicketApi.list(preassessmentId);
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
    if (panel !== 'chat' || !preassessmentId) return;
    loadChat();
    const interval = setInterval(loadChat, 10000);
    return () => clearInterval(interval);
  }, [panel, preassessmentId, loadChat]);

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

  const handleOpenClientSearch = () => {
    setSelectedClientId(null);
    setPanel(null);
    setView('dashboard');
    navigate('/checkup/clienti');
  };

  const handleClientSearch = () => {
    const term = clientQuery.trim().toLowerCase();
    const results = term
      ? clients.filter((c) => {
        const name = `${c.client.nome} ${c.client.cognome}`.trim().toLowerCase();
        const email = c.client.email?.toLowerCase() || '';
        const azienda = c.client.azienda?.toLowerCase() || '';
        return name.includes(term) || email.includes(term) || azienda.includes(term);
      })
      : clients;
    setClientResults(results);
    setClientSearched(true);
  };

  const clientName = isClient
    ? `${user?.nome || ''} ${user?.cognome || ''}`.trim()
    : `${clientInfo?.nome || ''} ${clientInfo?.cognome || ''}`.trim();

  const otherName = isClient ? 'Studio' : (clientName || 'Cliente');

  const openTickets = tickets.filter((t) => t.status === 'open').length;

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

    const completedSections = SECTIONS.filter((s) => {
      const t = sTotal(s);
      return t > 0 && sDone(s) === t;
    }).length;

    const macroRows = MACRO_AREAS.map((m) => {
      const sects = SECTIONS.filter((s) => s.macro === m.id);
      const total = sects.reduce((a, s) => a + sTotal(s), 0);
      const done = sects.reduce((a, s) => a + sDone(s), 0);
      const pctMacro = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...m, total, done, pctMacro, sections: sects.length };
    });

    return (
      <div className="space-y-6">
        <div className="wow-card p-6 md:p-8 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{clientName || 'Cliente'}</h2>
              <p className="text-sm text-white/80">
                {readOnly ? 'Modalità visualizzazione (sola lettura)' : 'Compilazione assessment'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-4xl font-semibold">{pct}%</div>
              <div className="text-xs text-white/80">completamento</div>
            </div>
          </div>
          <div className="mt-6 h-2 rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Macro Aree', value: MACRO_AREAS.length, detail: 'aree tematiche' },
            { label: 'Sezioni', value: SECTIONS.length, detail: `${completedSections} completate` },
            { label: 'Campi', value: totalFields, detail: `${totalReq} obbligatori` },
            { label: 'Compilati', value: totalFilled, detail: `su ${totalReq}` },
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
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Macro Area</th>
                  <th className="px-3 py-2">Sezioni</th>
                  <th className="px-3 py-2">Obb.</th>
                  <th className="px-3 py-2">Compilati</th>
                  <th className="px-3 py-2">Stato</th>
                  <th className="px-3 py-2">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {macroRows.map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-3 py-3">{row.sections}</td>
                    <td className="px-3 py-3">{row.total}</td>
                    <td className="px-3 py-3">{row.done}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.pctMacro === 0 ? 'bg-slate-100 text-slate-500' : row.pctMacro === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {row.pctMacro === 0 ? 'Da iniziare' : row.pctMacro === 100 ? 'Completo' : 'In corso'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${row.pctMacro}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{row.pctMacro}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, idx) => {
            const done = sDone(s);
            const total = sTotal(s);
            const sp = total > 0 ? Math.round((done / total) * 100) : 0;
            const macro = MACRO_AREAS.find((m) => m.id === s.macro);
            return (
              <button
                key={s.id}
                onClick={() => setView(idx)}
                className="wow-card p-4 text-left transition hover:border-blue-300"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: macro?.color }}>{macro?.label}</span>
                  <span className="text-xs font-semibold text-slate-500">{done}/{total}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${sp}%`, background: sp === 100 ? '#10b981' : macro?.color }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSection = () => {
    if (!activeSection) return null;
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
          </div>

          <div className="space-y-5 p-6">
            {activeSection.fields.map((f) => (
              <FormField
                key={f.id}
                field={f}
                value={data[f.id]}
                onChange={handleChange}
                fieldNote={fieldNotes[f.id]}
                onNoteChange={handleFieldNote}
                readOnly={readOnly}
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

          <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/80 px-6 py-4">
            <button
              onClick={() => (view === 0 ? setView('dashboard') : setView((view as number) - 1))}
              className="wow-button-ghost"
            >
              <ChevronLeft className="h-4 w-4" />
              {view === 0 ? 'Dashboard' : 'Precedente'}
            </button>
            <span className="text-xs font-semibold text-slate-400">{(view as number) + 1}/{SECTIONS.length}</span>
            <button
              onClick={() => (view === SECTIONS.length - 1 ? setView('dashboard') : setView((view as number) + 1))}
              className="wow-button"
            >
              {view === SECTIONS.length - 1 ? 'Dashboard' : 'Successiva'}
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
              {clientName && (
                <div>Cliente: {clientName}{clientInfo?.azienda ? ` • ${clientInfo.azienda}` : ''}</div>
              )}
              {readOnly && (
                <div className="text-amber-700 font-semibold">Sola lettura • Modifiche non autorizzate dal cliente</div>
              )}
              {isStaff && !readOnly && (
                <div className="text-emerald-700 font-semibold">Modifiche abilitate dal cliente</div>
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
                  Esporta
                </button>
              )}
              {isClient && (
                <button
                  onClick={() => setStudioCanEdit((p) => !p)}
                  className={`wow-button-ghost ${studioCanEdit ? 'border-emerald-300 text-emerald-700' : ''}`}
                >
                  {studioCanEdit ? 'Modifiche studio: abilitate' : 'Modifiche studio: disattivate'}
                </button>
              )}
              {saving && (
                <span className="text-xs font-semibold text-slate-500">Salvataggio…</span>
              )}
            </div>
            {showExport && activeClientId && (
              <div className="flex flex-wrap gap-2">
                <button onClick={exportJSON} className="wow-button-ghost">JSON</button>
                <button onClick={exportCSV} className="wow-button-ghost">CSV</button>
                <button onClick={generatePDF} className="wow-button">
                  <Printer className="h-4 w-4" />
                  Report PDF
                </button>
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
              canSend={canChat}
              currentUserId={user?.id}
              otherName={otherName}
            />
          )}
          {panel === 'tickets' && showAssessment && (
            <TicketPanel
              tickets={tickets}
              onNew={createTicket}
              onReply={replyTicket}
              currentUserId={user?.id}
              isAdmin={user?.ruolo !== 'cliente'}
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

      {sidebarTarget && createPortal(
        <PreassessmentSidebar
          isStaff={isStaff}
          onOpenClientSearch={handleOpenClientSearch}
          view={view}
          setView={setView}
          panel={panel}
          setPanel={setPanel}
          search={search}
          setSearch={setSearch}
          grouped={grouped}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sDone={sDone}
          sTotal={sTotal}
          hasAssessment={!!activeClientId}
          chatCount={chatMessages.length}
          openTickets={openTickets}
        />,
        sidebarTarget,
      )}
    </div>
  );
}

function PreassessmentSidebar({
  isStaff,
  onOpenClientSearch,
  view,
  setView,
  panel,
  setPanel,
  search,
  setSearch,
  grouped,
  collapsed,
  setCollapsed,
  sDone,
  sTotal,
  hasAssessment,
  chatCount,
  openTickets,
}: {
  isStaff: boolean;
  onOpenClientSearch: () => void;
  view: 'dashboard' | number;
  setView: (val: 'dashboard' | number) => void;
  panel: 'chat' | 'tickets' | 'alerts' | null;
  setPanel: (val: 'chat' | 'tickets' | 'alerts' | null) => void;
  search: string;
  setSearch: (val: string) => void;
  grouped: { id: string; label: string; color: string; sections: SectionSpec[] }[];
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sDone: (s: SectionSpec) => number;
  sTotal: (s: SectionSpec) => number;
  hasAssessment: boolean;
  chatCount: number;
  openTickets: number;
}) {
  return (
    <div className="space-y-4">
      {isStaff && hasAssessment && (
        <button
          onClick={onOpenClientSearch}
          className="flex w-full items-center gap-3 rounded-lg border border-blue-900/30 bg-blue-950/40 px-4 py-3 text-sm font-semibold text-blue-100/90 transition hover:bg-blue-900/40"
        >
          <Search className="h-4 w-4" />
          Ricerca clienti
        </button>
      )}

      <div className="space-y-1">
        <button
          onClick={() => { setView('dashboard'); setPanel(null); }}
          className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${view === 'dashboard' && !panel ? 'bg-blue-700/90 text-white shadow-md' : 'text-slate-200 hover:bg-blue-900/40'}`}
        >
          <LayoutGrid className="h-4 w-4" />
          Dashboard
        </button>
        {hasAssessment && (
          <>
            <button
              onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${panel === 'chat' ? 'bg-blue-700/90 text-white shadow-md' : 'text-slate-200 hover:bg-blue-900/40'}`}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
              {chatCount > 0 && (
                <span className="ml-auto rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {chatCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanel(panel === 'tickets' ? null : 'tickets')}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${panel === 'tickets' ? 'bg-blue-700/90 text-white shadow-md' : 'text-slate-200 hover:bg-blue-900/40'}`}
            >
              <Ticket className="h-4 w-4" />
              Ticket
              {openTickets > 0 && (
                <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {openTickets}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanel(panel === 'alerts' ? null : 'alerts')}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition ${panel === 'alerts' ? 'bg-blue-700/90 text-white shadow-md' : 'text-slate-200 hover:bg-blue-900/40'}`}
            >
              <Bell className="h-4 w-4" />
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
              className="w-full rounded-xl border border-blue-900/40 bg-blue-950/40 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>

          <nav className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {grouped.map((g) => (
              <div key={g.id} className="space-y-1">
                <button
                  onClick={() => setCollapsed((p) => ({ ...p, [g.id]: !p[g.id] }))}
                  className="flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300"
                >
                  {g.label}
                  <ChevronDown className={`h-3 w-3 transition ${collapsed[g.id] ? '-rotate-90' : ''}`} />
                </button>
                {!collapsed[g.id] && g.sections.map((s) => {
                  const idx = SECTIONS.indexOf(s);
                  const active = view === idx && !panel;
                  const done = sDone(s);
                  const total = sTotal(s);
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setView(idx); setPanel(null); }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${active ? 'bg-blue-700/80 text-white' : 'text-slate-200 hover:bg-blue-900/40'}`}
                    >
                      <span className="truncate">{s.title}</span>
                      <span className={`text-[10px] font-semibold ${total > 0 && done === total ? 'text-emerald-300' : done > 0 ? 'text-blue-200' : 'text-slate-500'}`}>
                        {done}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </>
      )}

      <div className="border-t border-blue-900/40 pt-4" />
    </div>
  );
}

function ChatPanel({
  messages,
  onSend,
  canSend,
  currentUserId,
  otherName,
}: {
  messages: PreassessmentChatMessage[];
  onSend: (msg: string) => Promise<void> | void;
  canSend: boolean;
  currentUserId?: string;
  otherName: string;
}) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await onSend(msg.trim());
      setMsg('');
    } finally {
      setSending(false);
    }
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
                <div className={`mt-1 text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                  {new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
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
  currentUserId,
  isAdmin,
}: {
  tickets: PreassessmentTicket[];
  onNew: (subject: string, body: string) => Promise<void> | void;
  onReply: (ticketId: string, messaggio: string) => Promise<void> | void;
  currentUserId?: string;
  isAdmin: boolean;
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
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {t.status === 'open' ? 'Aperto' : 'Chiuso'}
              </span>
              <span className="text-sm font-semibold text-slate-900">{t.subject}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {new Date(t.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              {' '}— {(t.messages || []).length} risposte
            </div>
          </button>
        ))}
        {selected && (
          <div className="p-5">
            <button onClick={() => setSelectedId(null)} className="wow-button-ghost text-xs">
              <ChevronLeft className="h-4 w-4" /> Indietro
            </button>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">{selected.subject}</h4>
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

function FormField({
  field,
  value,
  onChange,
  fieldNote,
  onNoteChange,
  readOnly = false,
}: {
  field: FieldSpec;
  value: string;
  onChange: (id: string, val: string) => void;
  fieldNote?: string;
  onNoteChange: (id: string, val: string) => void;
  readOnly?: boolean;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showNote, setShowNote] = useState(Boolean(fieldNote));
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!helpRef.current) return;
      if (!helpRef.current.contains(e.target as Node)) setShowHelp(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNote((p) => !p)}
            className={`rounded-md border px-2 py-1 text-xs transition ${showNote || fieldNote ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
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
                  {field.help}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {field.type === 'textarea' && (
        <textarea
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          rows={3}
          disabled={readOnly}
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
          disabled={readOnly}
        />
      )}

      {field.type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={readOnly}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}

      {showNote && (
        <textarea
          value={fieldNote || ''}
          onChange={(e) => onNoteChange(field.id, e.target.value)}
          rows={2}
          placeholder="Nota su questo campo..."
          disabled={readOnly}
          className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-400"
        />
      )}
    </div>
  );
}

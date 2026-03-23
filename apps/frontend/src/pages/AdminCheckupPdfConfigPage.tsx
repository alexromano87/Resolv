import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Save, RotateCcw, Settings, FileText, Type, ToggleLeft, Plus, Trash2,
  AlertCircle, CheckCircle, BookOpen, PanelBottom,
  AlignLeft, AlignCenter, AlignRight, CopyPlus, Eye, EyeOff, Layers3, GripVertical,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkupPdfConfigApi, DEFAULT_PDF_CONFIG, cloneDefaultCoverElements, materializeCoverElements,
  type PdfConfig, type MacroOverride, type CoverElement, type CoverElementType, type PdfCoverPreviewContext,
} from '../api/checkup-pdf-config';
import { useToast } from '../components/ui/ToastProvider';

const FONT_OPTIONS = ['Noto Sans', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia'];

const COVER_ELEMENT_TYPE_OPTIONS: { value: CoverElementType; label: string }[] = [
  { value: 'text', label: 'Testo libero' },
  { value: 'chip', label: 'Badge' },
  { value: 'features', label: 'Lista bullet' },
  { value: 'company', label: 'Azienda' },
  { value: 'date', label: 'Data generazione' },
  { value: 'consultant', label: 'Consulente' },
];

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Sinistra', icon: AlignLeft },
  { value: 'center', label: 'Centro', icon: AlignCenter },
  { value: 'right', label: 'Destra', icon: AlignRight },
] as const;

const COVER_TEXT_FIELDS: Array<{
  id: string;
  label: string;
  configKey: keyof PdfConfig;
  description: string;
  multiline?: boolean;
}> = [
  { id: 'kicker', label: 'Etichetta', configKey: 'coverKicker', description: 'Testo piccolo sopra al titolo principale.' },
  { id: 'heading', label: 'Titolo principale', configKey: 'coverHeading', description: 'Titolo hero della copertina.' },
  { id: 'title', label: 'Titolo app', configKey: 'coverTitle', description: 'Label applicativa vicino al logo.' },
  { id: 'subtitle', label: 'Sottotitolo', configKey: 'coverSubtitle', description: 'Testo secondario accanto al logo.' },
  { id: 'detail', label: 'Testo descrittivo', configKey: 'coverDetail', description: 'Paragrafo introduttivo della copertina.', multiline: true },
  { id: 'chip', label: 'Badge', configKey: 'coverChipText', description: 'Badge testuale della copertina.' },
  { id: 'footer-note', label: 'Nota copertina', configKey: 'coverFooterNote', description: 'Nota in basso a sinistra della cover.' },
] as const;

// ── Cover live preview ────────────────────────────────────────────────────────
const PREVIEW_W = 264;
const PDF_W = 794; // 210mm @96dpi

function renderCoverElementContent(element: CoverElement, previewContext: PdfCoverPreviewContext) {
  switch (element.type) {
    case 'logo':
      return (
        <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.28)', borderRadius: element.borderRadius ?? 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }} title="Logo fisso">
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)' }}>Logo fisso</span>
        </div>
      );
    case 'company':
      return previewContext.companyName;
    case 'date':
      return `Generato il ${new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    case 'consultant':
      return `Consulente: ${previewContext.consultantName}`;
    case 'features':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {(element.items ?? []).map((item, index) => (
            <div key={`${element.id}-${index}`} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22d3ee', marginTop: 5, flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      );
    default:
      return element.text || '';
  }
}

const FIXED_LOGO_ELEMENT = cloneDefaultCoverElements().find((element) => element.type === 'logo')!;

function normalizeFixedCoverElements(elements: CoverElement[] | undefined): CoverElement[] {
  const nonLogo = (elements ?? []).filter((element) => element.type !== 'logo');
  return [{ ...FIXED_LOGO_ELEMENT }, ...nonLogo];
}

function CoverPreview({
  config,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  previewContext,
  previewZoom,
}: {
  config: PdfConfig;
  selectedElementId: string | null;
  onSelectElement: (elementId: string) => void;
  onUpdateElement: (elementId: string, patch: Partial<CoverElement>) => void;
  previewContext: PdfCoverPreviewContext;
  previewZoom: number;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [guides, setGuides] = useState<Array<{ orientation: 'vertical' | 'horizontal'; position: number }>>([]);
  const [interaction, setInteraction] = useState<null | {
    elementId: string;
    mode: 'drag' | 'resize';
    startX: number;
    startY: number;
    origin: Pick<CoverElement, 'x' | 'y' | 'width' | 'height'>;
  }>(null);
  const snap = (value: number, step = 1) => Math.round(value / step) * step;
  const getAlignmentGuides = (
    elementId: string,
    nextRect: { x: number; y: number; width: number; height: number },
  ): Array<{ orientation: 'vertical' | 'horizontal'; position: number }> => {
    const tolerance = 0.75;
    const currentXPoints = [nextRect.x, nextRect.x + nextRect.width / 2, nextRect.x + nextRect.width];
    const currentYPoints = [nextRect.y, nextRect.y + nextRect.height / 2, nextRect.y + nextRect.height];
    const matches: Array<{ orientation: 'vertical' | 'horizontal'; position: number }> = [];
    const pushGuide = (orientation: 'vertical' | 'horizontal', position: number) => {
      if (!matches.some((guide) => guide.orientation === orientation && Math.abs(guide.position - position) < 0.1)) {
        matches.push({ orientation, position });
      }
    };

    for (const element of (config.coverElements ?? []).filter((item) => item.visible && item.id !== elementId)) {
      const otherXPoints = [element.x, element.x + element.width / 2, element.x + element.width];
      const otherYPoints = [element.y, element.y + element.height / 2, element.y + element.height];

      currentXPoints.forEach((point) => {
        if (otherXPoints.some((other) => Math.abs(other - point) <= tolerance)) pushGuide('vertical', point);
      });
      currentYPoints.forEach((point) => {
        if (otherYPoints.some((other) => Math.abs(other - point) <= tolerance)) pushGuide('horizontal', point);
      });
    }

    return matches;
  };

  useEffect(() => {
    if (!interaction) return;
    const handleMove = (event: PointerEvent) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const deltaX = ((event.clientX - interaction.startX) / rect.width) * 100;
      const deltaY = ((event.clientY - interaction.startY) / rect.height) * 100;
      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
      const applySnap = (value: number) => (event.altKey ? value : snap(value));
      if (interaction.mode === 'drag') {
        const nextX = applySnap(clamp(interaction.origin.x + deltaX, 0, 100 - interaction.origin.width));
        const nextY = applySnap(clamp(interaction.origin.y + deltaY, 0, 100 - interaction.origin.height));
        setGuides(getAlignmentGuides(interaction.elementId, {
          x: nextX,
          y: nextY,
          width: interaction.origin.width,
          height: interaction.origin.height,
        }));
        onUpdateElement(interaction.elementId, { x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) });
      } else {
        const nextWidth = applySnap(clamp(interaction.origin.width + deltaX, 4, 100 - interaction.origin.x));
        const nextHeight = applySnap(clamp(interaction.origin.height + deltaY, 2, 100 - interaction.origin.y));
        setGuides(getAlignmentGuides(interaction.elementId, {
          x: interaction.origin.x,
          y: interaction.origin.y,
          width: nextWidth,
          height: nextHeight,
        }));
        onUpdateElement(interaction.elementId, { width: Number(nextWidth.toFixed(2)), height: Number(nextHeight.toFixed(2)) });
      }
    };
    const handleUp = () => {
      setInteraction(null);
      setGuides([]);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [config.coverElements, interaction, onUpdateElement]);

  const previewWidth = Math.round(PREVIEW_W * previewZoom);
  const previewHeight = Math.round(374 * previewZoom);
  const gridMinor = Math.max(12, Math.round(previewWidth / 12));
  const gridMajor = gridMinor * 2;

  return (
    <div
      ref={frameRef}
      style={{
        width: previewWidth,
        height: previewHeight,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${config.coverBgStart ?? '#1e3a8a'} 0%, ${config.coverBgMid ?? '#1e40af'} 45%, ${config.coverBgEnd ?? '#0f172a'} 100%)`,
        backgroundImage: `
          linear-gradient(135deg, ${config.coverBgStart ?? '#1e3a8a'} 0%, ${config.coverBgMid ?? '#1e40af'} 45%, ${config.coverBgEnd ?? '#0f172a'} 100%),
          linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)
        `,
        backgroundSize: `100% 100%, ${gridMinor}px ${gridMinor}px, ${gridMinor}px ${gridMinor}px, ${gridMajor}px ${gridMajor}px, ${gridMajor}px ${gridMajor}px`,
        padding: `${14 * previewZoom}px ${13 * previewZoom}px`,
        boxSizing: 'border-box',
        color: '#eef2ff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 20px 44px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 34, height: '100%', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0%,100% 0%,100% 50%)', background: 'rgba(255,255,255,0.22)' }} />
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(15% 0%,40% 0%,100% 85%,100% 60%)', background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0% 0%,18% 0%,100% 100%,82% 100%)', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {guides.map((guide, index) => (
        <div
          key={`${guide.orientation}-${guide.position}-${index}`}
          style={guide.orientation === 'vertical'
            ? {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${guide.position}%`,
              width: 1,
              background: 'rgba(56, 189, 248, 0.95)',
              boxShadow: '0 0 0 1px rgba(125, 211, 252, 0.25)',
              pointerEvents: 'none',
              zIndex: 999,
            }
            : {
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${guide.position}%`,
              height: 1,
              background: 'rgba(56, 189, 248, 0.95)',
              boxShadow: '0 0 0 1px rgba(125, 211, 252, 0.25)',
              pointerEvents: 'none',
              zIndex: 999,
            }}
        />
      ))}

      {(config.coverElements ?? [])
        .filter((element) => element.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => {
          const isFixedLogo = element.type === 'logo';
          const isSelected = !isFixedLogo && element.id === selectedElementId;
          const style: CSSProperties = {
            position: 'absolute',
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            minHeight: `${element.height}%`,
            zIndex: element.zIndex,
            display: 'flex',
            alignItems: element.type === 'logo' ? 'center' : 'flex-start',
            justifyContent: element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start',
            textAlign: element.align,
            color: element.color,
            fontFamily: element.fontFamily || config.fontFamily,
            fontSize: Math.max(4, Math.round(element.fontSize * (previewWidth / PDF_W) * 10) / 10),
            fontWeight: element.fontWeight,
            opacity: element.opacity ?? 1,
            lineHeight: element.lineHeight ?? 1.3,
            letterSpacing: element.letterSpacing ? `${element.letterSpacing}em` : undefined,
            textTransform: element.uppercase ? 'uppercase' : undefined,
            background: element.backgroundColor,
            border: isSelected
              ? `${Math.max(1, (element.borderWidth || 1) * (previewWidth / PDF_W))}px solid #38bdf8`
              : element.borderWidth ? `${Math.max(1, element.borderWidth * (previewWidth / PDF_W))}px solid ${element.borderColor || 'transparent'}` : undefined,
            borderRadius: element.borderRadius ? Math.max(2, Math.round(element.borderRadius * (previewWidth / PDF_W) * 10) / 10) : undefined,
            padding: element.type === 'chip' ? `${Math.max(2, Math.round(6 * (previewWidth / PDF_W) * 10) / 10)}px ${Math.max(4, Math.round(10 * (previewWidth / PDF_W) * 10) / 10)}px` : undefined,
            whiteSpace: element.type === 'features' ? 'normal' : 'pre-wrap',
            overflow: 'hidden',
            cursor: isFixedLogo ? 'default' : 'move',
            pointerEvents: isFixedLogo ? 'none' : 'auto',
            boxShadow: isSelected ? '0 0 0 2px rgba(56, 189, 248, 0.35)' : undefined,
          };

          return (
            <div
              key={element.id}
              style={style}
              onPointerDown={(event) => {
                if (isFixedLogo) return;
                event.stopPropagation();
                onSelectElement(element.id);
                setInteraction({
                  elementId: element.id,
                  mode: 'drag',
                  startX: event.clientX,
                  startY: event.clientY,
                  origin: { x: element.x, y: element.y, width: element.width, height: element.height },
                });
              }}
            >
              {renderCoverElementContent(element, previewContext)}
              {!isFixedLogo && (
                <button
                  type="button"
                  aria-label={`Ridimensiona ${element.name}`}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelectElement(element.id);
                    setInteraction({
                      elementId: element.id,
                      mode: 'resize',
                      startX: event.clientX,
                      startY: event.clientY,
                      origin: { x: element.x, y: element.y, width: element.width, height: element.height },
                    });
                  }}
                  style={{ position: 'absolute', right: 2, bottom: 2, width: 10, height: 10, borderRadius: 999, border: '1px solid rgba(255,255,255,0.9)', background: isSelected ? '#38bdf8' : 'rgba(255,255,255,0.85)', cursor: 'nwse-resize' }}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}

type Tab = 'paginazione' | 'stile' | 'elementi' | 'copertina' | 'footer';

export default function AdminCheckupPdfConfigPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PdfConfig>(DEFAULT_PDF_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>('paginazione');
  const [selectedCoverElementId, setSelectedCoverElementId] = useState<string | null>(DEFAULT_PDF_CONFIG.coverElements.find((element) => element.type !== 'logo')?.id ?? null);
  const [previewZoom, setPreviewZoom] = useState(1.35);
  const [draggedCoverElementId, setDraggedCoverElementId] = useState<string | null>(null);
  const [dragOverCoverElementId, setDragOverCoverElementId] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<PdfCoverPreviewContext>({
    companyName: 'Cliente di esempio',
    consultantName: 'Studio licenziatario',
  });

  if (user?.ruolo !== 'superadmin') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">Accesso negato</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Solo i superadmin possono accedere a questa pagina.</p>
      </div>
    );
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [data, context] = await Promise.all([
        checkupPdfConfigApi.getConfig(),
        checkupPdfConfigApi.getPreviewContext(),
      ]);
      const normalized = { ...data, coverElements: normalizeFixedCoverElements(materializeCoverElements(data)) };
      setConfig(normalized);
      setPreviewContext(context);
      setSelectedCoverElementId(normalized.coverElements.find((element) => element.type !== 'logo')?.id ?? null);
    } catch (err: any) {
      toastError(err.message || 'Errore nel caricamento della configurazione');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...config, coverElements: normalizeFixedCoverElements(materializeCoverElements(config)) };
      await checkupPdfConfigApi.updateConfig(payload);
      success('Configurazione PDF salvata con successo');
    } catch (err: any) {
      toastError(err.message || 'Errore nel salvataggio della configurazione');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      ...DEFAULT_PDF_CONFIG,
      macroOverrides: [...DEFAULT_PDF_CONFIG.macroOverrides],
      coverFeatures: [...DEFAULT_PDF_CONFIG.coverFeatures],
      coverCenterOrder: [...DEFAULT_PDF_CONFIG.coverCenterOrder],
      coverElements: normalizeFixedCoverElements(cloneDefaultCoverElements()),
    });
    setSelectedCoverElementId(cloneDefaultCoverElements().find((element) => element.type !== 'logo')?.id ?? null);
  };

  // ── Macro overrides ──────────────────────────────────────────────────────
  const updateOverride = (idx: number, field: keyof MacroOverride, value: string | number) => {
    const overrides = [...config.macroOverrides];
    overrides[idx] = { ...overrides[idx], [field]: value };
    setConfig({ ...config, macroOverrides: overrides });
  };
  const addOverride = () =>
    setConfig({ ...config, macroOverrides: [...config.macroOverrides, { macroId: '', mode: 'questions', limit: 26 }] });
  const removeOverride = (idx: number) =>
    setConfig({ ...config, macroOverrides: config.macroOverrides.filter((_, i) => i !== idx) });

  const selectedCoverElement = (config.coverElements ?? []).find((element) => element.id === selectedCoverElementId && element.type !== 'logo') ?? null;
  const editableCoverElements = useMemo(
    () => [...(config.coverElements ?? [])].filter((element) => element.type !== 'logo').sort((a, b) => b.zIndex - a.zIndex),
    [config.coverElements],
  );
  const getCoverElementById = (elementId: string) => (config.coverElements ?? []).find((element) => element.id === elementId) ?? null;

  const updateCoverElements = (updater: (elements: CoverElement[]) => CoverElement[]) => {
    setConfig((prev) => ({ ...prev, coverElements: normalizeFixedCoverElements(updater(prev.coverElements ?? [])) }));
  };

  const updateSelectedCoverElement = (patch: Partial<CoverElement>) => {
    if (!selectedCoverElementId) return;
    updateCoverElements((elements) => elements.map((element) => (
      element.id === selectedCoverElementId ? { ...element, ...patch } : element
    )));
  };

  const updateCoverElementById = (elementId: string, patch: Partial<CoverElement>) => {
    updateCoverElements((elements) => elements.map((element) => (
      element.id === elementId ? { ...element, ...patch } : element
    )));
  };

  const updateSemanticCoverText = (
    elementId: string,
    configKey: keyof PdfConfig,
    value: string,
  ) => {
    setConfig((prev) => ({ ...prev, [configKey]: value }));
    updateCoverElementById(elementId, { text: value });
  };

  const updateSemanticCoverItems = (items: string[]) => {
    setConfig((prev) => ({ ...prev, coverFeatures: items }));
    updateCoverElementById('features', { items });
  };

  const addCoverElement = (type: CoverElementType) => {
    const id = `${type}-${Date.now()}`;
    const base: CoverElement = {
      id,
      name: `Nuovo ${COVER_ELEMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'elemento'}`,
      type,
      visible: true,
      x: 10,
      y: 10,
      width: type === 'logo' ? 18 : type === 'chip' ? 14 : 34,
      height: type === 'features' ? 16 : type === 'logo' ? 8 : 6,
      zIndex: (config.coverElements ?? []).length + 10,
      text: type === 'chip' ? 'Nuovo badge' : type === 'text' ? 'Nuovo testo' : undefined,
      items: type === 'features' ? ['Bullet 1', 'Bullet 2'] : undefined,
      fontFamily: config.fontFamily,
      fontSize: type === 'chip' ? 10 : type === 'features' ? 11 : type === 'company' ? 18 : type === 'date' || type === 'consultant' ? 11 : 14,
      fontWeight: type === 'chip' ? 'bold' : 'normal',
      color: '#ffffff',
      align: 'left',
      backgroundColor: type === 'chip' ? 'rgba(255,255,255,0.16)' : undefined,
      borderColor: type === 'chip' ? 'rgba(255,255,255,0.18)' : undefined,
      borderWidth: type === 'chip' ? 1 : 0,
      borderRadius: type === 'chip' ? 999 : 0,
      opacity: 1,
      letterSpacing: type === 'chip' ? 0.04 : 0,
      lineHeight: type === 'features' ? 1.45 : 1.3,
      uppercase: false,
    };
    updateCoverElements((elements) => [...elements, base]);
    setSelectedCoverElementId(id);
  };

  const duplicateCoverElementById = (elementId: string) => {
    const source = (config.coverElements ?? []).find((element) => element.id === elementId);
    if (!source) return;
    const copy: CoverElement = {
      ...source,
      id: `${source.type}-${Date.now()}`,
      name: `${source.name} copia`,
      x: Math.min(source.x + 2, 90),
      y: Math.min(source.y + 2, 92),
      items: source.items ? [...source.items] : undefined,
      zIndex: source.zIndex + 1,
    };
    updateCoverElements((elements) => [...elements, copy]);
    setSelectedCoverElementId(copy.id);
  };

  const duplicateSelectedCoverElement = () => {
    if (!selectedCoverElementId) return;
    duplicateCoverElementById(selectedCoverElementId);
  };

  const removeCoverElementById = (elementId: string) => {
    const remaining = (config.coverElements ?? []).filter((element) => element.id !== elementId);
    setConfig((prev) => ({ ...prev, coverElements: remaining }));
    setSelectedCoverElementId((current) => (current === elementId ? (remaining[0]?.id ?? null) : current));
  };

  const reorderCoverElementById = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceIndex = editableCoverElements.findIndex((element) => element.id === sourceId);
    const targetIndex = editableCoverElements.findIndex((element) => element.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const reordered = [...editableCoverElements];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    updateCoverElements((elements) => {
      const reorderedById = new Map(
        reordered.map((element, index) => [element.id, { ...element, zIndex: reordered.length - index + 1 }]),
      );
      return elements.map((element) => (
        element.type === 'logo'
          ? element
          : (reorderedById.get(element.id) ?? element)
      ));
    });
    setSelectedCoverElementId(sourceId);
  };


  const moveSelectedCoverElement = (direction: 'forward' | 'backward') => {
    if (!selectedCoverElementId) return;
    const sorted = [...(config.coverElements ?? [])].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((element) => element.id === selectedCoverElementId);
    if (index === -1) return;
    const targetIndex = direction === 'forward' ? Math.min(sorted.length - 1, index + 1) : Math.max(0, index - 1);
    if (targetIndex == index) return;
    const reordered = [...sorted];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    updateCoverElements(() => reordered.map((element, idx) => ({ ...element, zIndex: idx + 1 })));
  };

  // ── Toggle helper ────────────────────────────────────────────────────────
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
      ].join(' ')}
    >
      <span className={['inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200', checked ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'paginazione', label: 'Paginazione', icon: FileText },
    { id: 'stile', label: 'Stile', icon: Type },
    { id: 'elementi', label: 'Elementi', icon: ToggleLeft },
    { id: 'copertina', label: 'Copertina', icon: BookOpen },
    { id: 'footer', label: 'Footer', icon: PanelBottom },
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurazione PDF Report</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Personalizza layout, stile e contenuto del report PDF Pre-Assessment
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
            Ripristina default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salva configurazione
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <CheckCircle className="mt-0.5 h-5 w-5 flex-none text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Come testare:</strong> dopo aver salvato, accedi al frontend Checkup, apri un preassessment e genera il PDF. Le modifiche saranno applicate immediatamente.
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ── Paginazione ───────────────────────────────────────────── */}
          {activeTab === 'paginazione' && (
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Domande massime per pagina
                </label>
                <div className="flex items-center gap-4">
                  <input type="range" min={10} max={40} step={1} value={config.maxQuestionsPerPage}
                    onChange={(e) => setConfig({ ...config, maxQuestionsPerPage: Number(e.target.value) })}
                    className="w-48" />
                  <span className="w-12 rounded-md border border-slate-200 bg-slate-50 py-1 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-800">
                    {config.maxQuestionsPerPage}
                  </span>
                  <span className="text-sm text-slate-500">domande / pagina (default: 26)</span>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Override per macro area</p>
                    <p className="text-xs text-slate-500">Codici: a, b, c, ... h, 231_e, 231_h, ...</p>
                  </div>
                  <button type="button" onClick={addOverride}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Plus className="h-3.5 w-3.5" />Aggiungi override
                  </button>
                </div>
                {config.macroOverrides.length === 0 && (
                  <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800">
                    Nessun override — tutte le macro aree usano la paginazione standard.
                  </p>
                )}
                <div className="space-y-2">
                  {config.macroOverrides.map((ov, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Codice macro area</label>
                        <input type="text" value={ov.macroId}
                          onChange={(e) => updateOverride(idx, 'macroId', e.target.value)}
                          placeholder="es. e, h, 231_e"
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Modalità</label>
                        <select value={ov.mode} onChange={(e) => updateOverride(idx, 'mode', e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                          <option value="questions">Max domande per pagina</option>
                          <option value="sections">Max sezioni per pagina</option>
                          <option value="integrity">Sezione integra (max domande)</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Limite</label>
                        <input type="number" min={1} max={50} value={ov.limit}
                          onChange={(e) => updateOverride(idx, 'limit', Number(e.target.value))}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                      </div>
                      <button type="button" onClick={() => removeOverride(idx)}
                        className="mt-4 rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stile ─────────────────────────────────────────────────── */}
          {activeTab === 'stile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Famiglia font</label>
                  <select value={config.fontFamily} onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                    {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Spessore bordo cornice macro (px)</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min={1} max={6} step={0.5} value={config.borderWidth}
                      onChange={(e) => setConfig({ ...config, borderWidth: Number(e.target.value) })}
                      className="w-36" />
                    <span className="w-12 rounded-md border border-slate-200 bg-slate-50 py-1 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-800">
                      {config.borderWidth}px
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {([
                  { key: 'questionFontSize', label: 'Font domande (pt)', min: 6, max: 16 },
                  { key: 'answerFontSize', label: 'Font risposte (pt)', min: 6, max: 16 },
                  { key: 'sectionHeaderFontSize', label: 'Font intestazione sezione (pt)', min: 6, max: 16 },
                ] as const).map(({ key, label, min, max }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={min} max={max} step={0.5} value={config[key]}
                        onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
                        className="w-32" />
                      <span className="w-14 rounded-md border border-slate-200 bg-slate-50 py-1 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-800">
                        {config[key]}pt
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Anteprima stile testo</p>
                <div style={{ fontFamily: config.fontFamily }} className="space-y-1">
                  <p style={{ fontSize: config.sectionHeaderFontSize + 'pt', fontWeight: 600 }} className="text-slate-700 dark:text-slate-200">A1 – Struttura organizzativa</p>
                  <p style={{ fontSize: config.questionFontSize + 'pt' }} className="text-slate-600 dark:text-slate-300">Numero totale dipendenti *</p>
                  <p style={{ fontSize: config.answerFontSize + 'pt' }} className="text-slate-500 dark:text-slate-400">42</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Elementi ──────────────────────────────────────────────── */}
          {activeTab === 'elementi' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Attiva o disattiva le sezioni e gli elementi inclusi nel PDF.</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {([
                  { key: 'showIndex', label: 'Indice del report', description: "Pagina di indice all'inizio del PDF" },
                  { key: 'showAsterisks', label: 'Asterischi su domande obbligatorie', description: 'Mostra il simbolo * accanto alle domande obbligatorie' },
                  { key: 'showUserNotes', label: 'Note utente', description: "Includi le note inserite dall'utente accanto alle risposte" },
                  { key: 'showConsultantNotes', label: 'Note consulente', description: 'Includi le note del consulente (admin_studio)' },
                  { key: 'showDocuments', label: 'Documenti allegati', description: 'Elenca i documenti allegati a ciascuna sezione' },
                  { key: 'showMacroLetter', label: 'Lettera macro area nell\'intestazione', description: 'Es. "A – IDENTITÀ E STRUTTURA" invece di solo "IDENTITÀ E STRUTTURA"' },
                ] as const).map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                    <Toggle checked={config[key]} onChange={() => setConfig({ ...config, [key]: !config[key] })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Copertina ─────────────────────────────────────────────── */}
          {activeTab === 'copertina' && (
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Testi della copertina</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gestisci i contenuti principali della cover senza toccare il logo.</p>
                    </div>
                    <Type className="mt-0.5 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="space-y-4">
                    {COVER_TEXT_FIELDS.map((field) => {
                      const element = getCoverElementById(field.id);
                      return (
                        <div key={field.id}>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>
                          {field.multiline ? (
                            <textarea
                              rows={4}
                              value={String(config[field.configKey] ?? '')}
                              onChange={(event) => updateSemanticCoverText(field.id, field.configKey, event.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(config[field.configKey] ?? '')}
                              onChange={(event) => updateSemanticCoverText(field.id, field.configKey, event.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            />
                          )}
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-400">
                            <span>{field.description}</span>
                            {element && (
                              <button
                                type="button"
                                onClick={() => setSelectedCoverElementId(element.id)}
                                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                Modifica posizione
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bullet point copertina</label>
                        <button
                          type="button"
                          onClick={() => updateSemanticCoverItems([...(config.coverFeatures ?? []), `Nuovo bullet ${(config.coverFeatures?.length ?? 0) + 1}`])}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          <Plus className="h-3.5 w-3.5" /> Aggiungi
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(config.coverFeatures ?? []).map((item, index) => (
                          <div key={`cover-feature-${index}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(event) => {
                                const next = [...(config.coverFeatures ?? [])];
                                next[index] = event.target.value;
                                updateSemanticCoverItems(next);
                              }}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => updateSemanticCoverItems((config.coverFeatures ?? []).filter((_, itemIndex) => itemIndex !== index))}
                              className="rounded-md p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <p><strong>Azienda:</strong> {previewContext.companyName}</p>
                      <p className="mt-1"><strong>Consulente:</strong> {previewContext.consultantName}</p>
                      <p className="mt-2">Questi due elementi sono letti dal database. Puoi spostarli e stilizzarli, ma non cambiarne il contenuto.</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Elementi in copertina</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Seleziona un elemento e riordinalo o nascondilo. Il logo resta fisso.</p>
                    </div>
                    <Layers3 className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {editableCoverElements.map((element) => {
                        const isSelected = element.id === selectedCoverElementId;
                        const isDragOver = dragOverCoverElementId === element.id && draggedCoverElementId !== element.id;
                        return (
                          <div
                            key={element.id}
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={() => {
                              setDraggedCoverElementId(element.id);
                              setDragOverCoverElementId(element.id);
                            }}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (draggedCoverElementId && draggedCoverElementId !== element.id) {
                                setDragOverCoverElementId(element.id);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverCoverElementId === element.id) {
                                setDragOverCoverElementId(null);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (draggedCoverElementId && draggedCoverElementId !== element.id) {
                                reorderCoverElementById(draggedCoverElementId, element.id);
                              }
                              setDraggedCoverElementId(null);
                              setDragOverCoverElementId(null);
                            }}
                            onDragEnd={() => {
                              setDraggedCoverElementId(null);
                              setDragOverCoverElementId(null);
                            }}
                            onClick={() => setSelectedCoverElementId(element.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedCoverElementId(element.id);
                              }
                            }}
                            className={[
                              'flex cursor-move items-start gap-3 px-4 py-3 transition',
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60',
                              isDragOver ? 'ring-2 ring-inset ring-blue-400' : '',
                            ].join(' ')}
                          >
                            <div className="pt-0.5 text-slate-300 dark:text-slate-600">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{element.name}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {COVER_ELEMENT_TYPE_OPTIONS.find((option) => option.value === element.type)?.label ?? element.type}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">X {element.x}% · Y {element.y}% · {element.width}% × {element.height}% · livello {element.zIndex}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateCoverElementById(element.id, { visible: !element.visible });
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                title={element.visible ? 'Nascondi elemento' : 'Mostra elemento'}
                              >
                                {element.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  duplicateCoverElementById(element.id);
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                title="Duplica elemento"
                              >
                                <CopyPlus className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeCoverElementById(element.id);
                                }}
                                className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                title="Elimina elemento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={() => moveSelectedCoverElement('backward')}
                      disabled={!selectedCoverElement}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Indietro
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedCoverElement('forward')}
                      disabled={!selectedCoverElement}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Avanti
                    </button>
                    <div className="ml-auto grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => addCoverElement('text')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        + Testo
                      </button>
                      <button
                        type="button"
                        onClick={() => addCoverElement('chip')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        + Badge
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Posizione e stile elemento</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Modifica il singolo elemento selezionato. Il logo non è modificabile.</p>
                    </div>
                    {selectedCoverElement && (
                      <button
                        type="button"
                        onClick={duplicateSelectedCoverElement}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        <CopyPlus className="h-3.5 w-3.5" /> Duplica
                      </button>
                    )}
                  </div>

                  {!selectedCoverElement ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Seleziona un elemento dalla colonna a sinistra o direttamente nell’anteprima.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Nome elemento</label>
                          <input
                            type="text"
                            value={selectedCoverElement.name}
                            onChange={(event) => updateSelectedCoverElement({ name: event.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Visibile</p>
                              <p className="text-xs text-slate-400">Nasconde l’elemento senza eliminarlo</p>
                            </div>
                            <Toggle checked={selectedCoverElement.visible} onChange={() => updateSelectedCoverElement({ visible: !selectedCoverElement.visible })} />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        {([
                          ['x', 'X (%)', 0, 90],
                          ['y', 'Y (%)', 0, 94],
                          ['width', 'Larghezza (%)', 5, 100],
                          ['height', 'Altezza (%)', 2, 40],
                        ] as const).map(([key, label, min, max]) => (
                          <div key={key}>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
                            <input
                              type="number"
                              min={min}
                              max={max}
                              value={selectedCoverElement[key]}
                              onChange={(event) => updateSelectedCoverElement({ [key]: Number(event.target.value) } as Partial<CoverElement>)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Font</label>
                          <select
                            value={selectedCoverElement.fontFamily || config.fontFamily}
                            onChange={(event) => updateSelectedCoverElement({ fontFamily: event.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          >
                            {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Dimensione</label>
                          <input
                            type="number"
                            min={8}
                            max={72}
                            value={selectedCoverElement.fontSize}
                            onChange={(event) => updateSelectedCoverElement({ fontSize: Number(event.target.value) })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Peso</label>
                          <select
                            value={selectedCoverElement.fontWeight}
                            onChange={(event) => updateSelectedCoverElement({ fontWeight: event.target.value as CoverElement['fontWeight'] })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          >
                            <option value="normal">Normale</option>
                            <option value="500">Medio</option>
                            <option value="600">Semibold</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Colore testo</label>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                            <input type="color" value={selectedCoverElement.color} onChange={(event) => updateSelectedCoverElement({ color: event.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200 p-0.5 dark:border-slate-500" />
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-300">{selectedCoverElement.color}</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Colore sfondo</label>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                            <input type="color" value={selectedCoverElement.backgroundColor || '#ffffff'} onChange={(event) => updateSelectedCoverElement({ backgroundColor: event.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200 p-0.5 dark:border-slate-500" />
                            <button type="button" onClick={() => updateSelectedCoverElement({ backgroundColor: undefined })} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300">Nessuno</button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Colore bordo</label>
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                            <input type="color" value={selectedCoverElement.borderColor || '#ffffff'} onChange={(event) => updateSelectedCoverElement({ borderColor: event.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200 p-0.5 dark:border-slate-500" />
                            <button type="button" onClick={() => updateSelectedCoverElement({ borderColor: undefined })} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-300">Nessuno</button>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Bordo</label>
                          <input type="number" min={0} max={12} value={selectedCoverElement.borderWidth ?? 0} onChange={(event) => updateSelectedCoverElement({ borderWidth: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Raggio</label>
                          <input type="number" min={0} max={999} value={selectedCoverElement.borderRadius ?? 0} onChange={(event) => updateSelectedCoverElement({ borderRadius: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Opacità</label>
                          <input type="number" min={0} max={1} step={0.05} value={selectedCoverElement.opacity ?? 1} onChange={(event) => updateSelectedCoverElement({ opacity: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Livello</label>
                          <input type="number" min={1} max={99} value={selectedCoverElement.zIndex} onChange={(event) => updateSelectedCoverElement({ zIndex: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Allineamento</label>
                          <div className="flex gap-2">
                            {ALIGN_OPTIONS.map(({ value, label, icon: Icon }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateSelectedCoverElement({ align: value })}
                                className={[
                                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                                  selectedCoverElement.align === value
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200',
                                ].join(' ')}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Tracking</label>
                          <input type="number" min={0} max={1} step={0.01} value={selectedCoverElement.letterSpacing ?? 0} onChange={(event) => updateSelectedCoverElement({ letterSpacing: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Line height</label>
                          <input type="number" min={0.8} max={2.2} step={0.05} value={selectedCoverElement.lineHeight ?? 1.3} onChange={(event) => updateSelectedCoverElement({ lineHeight: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </div>
                        <div className="flex items-end">
                          <div className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Maiuscolo</p>
                              <p className="text-xs text-slate-400">Applica uppercase</p>
                            </div>
                            <Toggle checked={selectedCoverElement.uppercase ?? false} onChange={() => updateSelectedCoverElement({ uppercase: !(selectedCoverElement.uppercase ?? false) })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Aspetto generale della cover</h3>
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Sfondo copertina</p>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { key: 'coverBgStart', label: 'Inizio' },
                          { key: 'coverBgMid', label: 'Centro' },
                          { key: 'coverBgEnd', label: 'Fine' },
                        ] as const).map(({ key, label }) => (
                          <label key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            <span className="mb-2 block">{label}</span>
                            <div className="flex items-center gap-2">
                              <input type="color" value={(config[key] as string) || '#1e3a8a'} onChange={(event) => setConfig({ ...config, [key]: event.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200 p-0.5 dark:border-slate-500" />
                              <span className="font-mono text-[11px] text-slate-400">{(config[key] as string) || '#1e3a8a'}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Font predefinito</label>
                      <select
                        value={config.fontFamily}
                        onChange={(event) => setConfig({ ...config, fontFamily: event.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      >
                        {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Anteprima live</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Zoom</span>
                      <input
                        type="range"
                        min={0.8}
                        max={2}
                        step={0.05}
                        value={previewZoom}
                        onChange={(event) => setPreviewZoom(Number(event.target.value))}
                        className="w-24"
                      />
                      <span className="w-12 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {Math.round(previewZoom * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Il logo Resolv è fisso: resta visibile in anteprima ma non compare tra gli elementi modificabili.
                  </div>
                  <div className="flex justify-center">
                    <CoverPreview
                      config={config}
                      selectedElementId={selectedCoverElementId}
                      onSelectElement={setSelectedCoverElementId}
                      onUpdateElement={(elementId, patch) => updateCoverElements((elements) => elements.map((element) => element.id === elementId ? { ...element, ...patch } : element))}
                      previewContext={previewContext}
                      previewZoom={previewZoom}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-400">Trascina e ridimensiona gli elementi direttamente nella cover.</p>
                  <p className="mt-1 text-center text-[11px] text-slate-400">Tieni premuto `Alt` durante drag o resize per disattivare temporaneamente lo snap alla griglia.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────── */}
          {activeTab === 'footer' && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Testi del footer</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Configura il footer dell’ultima pagina del report PDF.</p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Testo principale</label>
                      <textarea
                        rows={3}
                        value={config.footerMainText ?? ''}
                        onChange={(e) => setConfig({ ...config, footerMainText: e.target.value })}
                        placeholder="Piattaforma GRC modulare per la gestione integrata della compliance aziendale"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <p className="mt-1 text-xs text-slate-400">Testo istituzionale al centro del footer.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Testo copyright <span className="font-normal text-slate-400">(dopo "© {new Date().getFullYear()} ")</span>
                      </label>
                      <input
                        type="text"
                        value={config.footerCopyrightText ?? ''}
                        onChange={(e) => setConfig({ ...config, footerCopyrightText: e.target.value })}
                        placeholder="Resolv. Tutti i diritti riservati."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Mostra logo Resolv</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Il footer usa sempre il logo Resolv, non quello del cliente o dello studio.</p>
                      </div>
                      <Toggle
                        checked={config.footerShowLogo !== false}
                        onChange={() => setConfig({ ...config, footerShowLogo: !config.footerShowLogo })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Anteprima footer</p>
                <div className="overflow-hidden rounded-xl" style={{ background: 'linear-gradient(135deg, #10233f 0%, #183f68 100%)' }}>
                  <div className="flex items-center gap-4 px-6 py-4">
                    {config.footerShowLogo !== false && (
                      <div className="flex h-11 w-28 flex-none items-center justify-center rounded bg-white/10 text-xs font-semibold tracking-[0.08em] text-white/90">
                        LOGO RESOLV
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-100">
                      <div>{config.footerMainText || 'Piattaforma GRC modulare per la gestione integrata della compliance aziendale'}</div>
                      <div className="mt-1 text-slate-200">Report generato il {new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      <div className="mt-1 text-slate-300">© {new Date().getFullYear()} {config.footerCopyrightText || 'Resolv. Tutti i diritti riservati.'}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">12 / 24</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer save bar */}
      <div className="flex justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={handleReset}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <RotateCcw className="h-4 w-4" />Ripristina default
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
          Salva configurazione
        </button>
      </div>
    </div>
  );
}

import { useContext, useEffect, useMemo, useState } from 'react';
import { Save, Upload, XCircle } from 'lucide-react';
import { studiApi, type Studio } from '../api/studi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/ToastProvider';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

function usePrompt(message: string, when: boolean) {
  const { navigator } = useContext(NavigationContext) as unknown as {
    navigator: { block: (cb: (tx: { retry: () => void }) => void) => () => void };
  };

  useEffect(() => {
    if (!when) return;
    const unblock = navigator.block((tx) => {
      if (window.confirm(message)) {
        unblock();
        tx.retry();
      }
    });
    return unblock;
  }, [navigator, message, when]);
}

export function GestioneStudioPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoToUpload, setLogoToUpload] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
  });

  const getFormDataFromStudio = (data: Studio) => ({
    nome: data.nome || '',
    ragioneSociale: data.ragioneSociale || '',
    partitaIva: data.partitaIva || '',
    codiceFiscale: data.codiceFiscale || '',
    indirizzo: data.indirizzo || '',
    citta: data.citta || '',
    cap: data.cap || '',
    provincia: data.provincia || '',
    telefono: data.telefono || '',
    email: data.email || '',
    pec: data.pec || '',
  });

  const hasUnsavedChanges = useMemo(() => {
    if (!studio || !isEditing) return false;
    const initial = getFormDataFromStudio(studio);
    const formDirty = Object.keys(initial).some((key) => {
      const k = key as keyof typeof initial;
      return formData[k] !== initial[k];
    });
    return formDirty || logoRemoved || logoToUpload !== null;
  }, [studio, isEditing, formData, logoRemoved, logoToUpload]);

  usePrompt('Hai modifiche non salvate. Vuoi uscire senza salvare?', hasUnsavedChanges);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    loadStudio();
  }, [user?.studioId]);

  const loadStudio = async () => {
    if (!user?.studioId) {
      toastError('Studio non trovato');
      return;
    }

    try {
      setLoading(true);
      const data = await studiApi.getOne(user.studioId);
      setStudio(data);
      setLogoPreview(data.logo || null);
      setFormData(getFormDataFromStudio(data));
      setIsEditing(false);
      setLogoToUpload(null);
      setLogoRemoved(false);
      setSubmitAttempted(false);
    } catch (err: any) {
      console.error('Errore caricamento studio:', err);
      toastError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica dimensione (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastError('Il file è troppo grande. Dimensione massima: 2MB');
      return;
    }

    // Verifica tipo
    if (!file.type.startsWith('image/')) {
      toastError('Il file deve essere un\'immagine');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setLogoToUpload(base64String);
      setLogoRemoved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (!isEditing) return;
    if (!studio?.id) return;

    setLogoPreview(null);
    setLogoToUpload(null);
    setLogoRemoved(Boolean(studio.logo));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setSubmitAttempted(true);

    if (!formData.nome.trim()) {
      toastError('Il nome dello studio è obbligatorio');
      return;
    }

    if (!studio?.id) return;

    try {
      setSaving(true);

      // Aggiorna dati studio
      await studiApi.update(studio.id, formData);

      // Upload logo se presente
      if (logoRemoved) {
        await studiApi.deleteLogo(studio.id);
      } else if (logoToUpload) {
        await studiApi.uploadLogo(studio.id, logoToUpload);
      }

      success('Studio aggiornato con successo');
      setIsEditing(false);
      loadStudio();
    } catch (err: any) {
      console.error('Errore salvataggio studio:', err);
      toastError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!studio) return;
    setFormData(getFormDataFromStudio(studio));
    setLogoPreview(studio.logo || null);
    setLogoToUpload(null);
    setLogoRemoved(false);
    setSubmitAttempted(false);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Configurazione</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Gestione Studio
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Modifica le informazioni e il logo del tuo studio legale
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="wow-card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEditing ? 'Modifica in corso' : 'I dati sono in sola lettura'}
            </p>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                Modifica
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  <Save size={16} />
                  {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
              </div>
            )}
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Logo Studio
            </label>

            {logoPreview ? (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-32 w-32 object-contain rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white p-3 shadow-sm"
                  />
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                      <Upload size={16} />
                      Cambia logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <XCircle size={16} />
                      Rimuovi logo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-40 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Clicca per caricare un logo
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    PNG, JPG fino a 2MB
                  </p>
                </div>
                {isEditing && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                )}
              </label>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6" />

          {/* Nome Studio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Studio *
            </label>
            <input
              type="text"
              required
              disabled={!isEditing}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                submitAttempted && !formData.nome.trim()
                  ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                  : ''
              } ${!isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''}`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ragione Sociale */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ragione Sociale
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.ragioneSociale}
                onChange={(e) => setFormData({ ...formData, ragioneSociale: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>

            {/* Partita IVA */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Partita IVA
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.partitaIva}
                onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>
          </div>

          {/* Codice Fiscale */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Codice Fiscale
            </label>
          <input
            type="text"
            disabled={!isEditing}
            value={formData.codiceFiscale}
            onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
            className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
              !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
            }`}
          />
        </div>

          {/* Indirizzo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Indirizzo
            </label>
          <input
            type="text"
            disabled={!isEditing}
            value={formData.indirizzo}
            onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
            className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
              !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
            }`}
          />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Città */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Città
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.citta}
                onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>

            {/* CAP */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                CAP
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.cap}
                onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Provincia
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.provincia}
                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefono */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
                  !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
                }`}
              />
            </div>
          </div>

          {/* PEC */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              PEC
            </label>
          <input
            type="email"
            disabled={!isEditing}
            value={formData.pec}
            onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
            className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 ${
              !isEditing ? 'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400' : ''
            }`}
          />
        </div>
        </form>
      </div>
    </div>
  );
}

// apps/frontend/src/components/ManageStudiModal.tsx
import { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { usersApi } from '../api/users';
import { studiApi, type Studio } from '../api/studi';
import type { User } from '../api/auth';
import { useToast } from './ui/ToastProvider';
import { BodyPortal } from './ui/BodyPortal';

interface ManageStudiModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManageStudiModal({ user, onClose, onSuccess }: ManageStudiModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [allStudi, setAllStudi] = useState<Studio[]>([]);
  const [selectedStudiIds, setSelectedStudiIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studiData, userStudiData] = await Promise.all([
        studiApi.getAll(),
        usersApi.getStudi(user.id),
      ]);
      setAllStudi(studiData);
      setSelectedStudiIds(userStudiData.map((s: Studio) => s.id));
    } catch (err: any) {
      showError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudio = (studioId: string) => {
    setSelectedStudiIds(prev => {
      if (prev.includes(studioId)) {
        return prev.filter(id => id !== studioId);
      } else {
        return [...prev, studioId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await usersApi.updateStudi(user.id, selectedStudiIds);
      showSuccess('Studi aggiornati con successo');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 display-font">
                Gestione Studi
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {user.nome} {user.cognome}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {loading && allStudi.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Caricamento...
              </div>
            ) : allStudi.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Nessuno studio disponibile
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Seleziona gli studi ({selectedStudiIds.length})
                </label>
                <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  {allStudi.map((studio) => (
                    <label
                      key={studio.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-transparent p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudiIds.includes(studio.id)}
                        onChange={() => handleToggleStudio(studio.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        disabled={loading}
                      />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {studio.nome}
                          </div>
                          {studio.ragioneSociale && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {studio.ragioneSociale}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="wow-button"
              disabled={loading}
            >
              <Save size={16} />
              {loading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

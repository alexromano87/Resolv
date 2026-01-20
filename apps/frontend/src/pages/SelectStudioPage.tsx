// apps/frontend/src/pages/SelectStudioPage.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, CheckCircle } from 'lucide-react';
import { authApi, type StudioSelectionResponse } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

export default function SelectStudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectionData = location.state as StudioSelectionResponse | null;

  if (!selectionData || !selectionData.requiresStudioSelection) {
    navigate('/login');
    return null;
  }

  const handleSelectStudio = async (studioId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.selectStudio(selectionData.userId, studioId);

      // Salva il token e l'utente nel context
      setSession(response);

      // Naviga alla dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Errore durante la selezione dello studio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-2xl">
        <div className="wow-card p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                <Building2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 display-font">
              Seleziona Studio Legale
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Hai accesso a più studi legali. Seleziona quello su cui vuoi lavorare.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {selectionData.studi.map((studio) => (
              <button
                key={studio.id}
                onClick={() => handleSelectStudio(studio.id)}
                disabled={loading}
                className="w-full p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-500 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {studio.nome}
                    </h3>
                    {studio.ragioneSociale && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {studio.ragioneSociale}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-6 w-6 text-transparent group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              disabled={loading}
            >
              Torna al login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

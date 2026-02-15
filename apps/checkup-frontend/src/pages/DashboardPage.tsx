import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { questionnairesApi, CheckupQuestionnaire } from '../api/questionnaires';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  Pencil,
} from 'lucide-react';

const statoLabels: Record<string, string> = {
  bozza: 'Bozza',
  in_compilazione: 'In compilazione',
  completato: 'Completato',
  revisionato: 'Revisionato',
};

const statoColors: Record<string, string> = {
  bozza: 'bg-gray-100 text-gray-700',
  in_compilazione: 'bg-cyan-100 text-cyan-700',
  completato: 'bg-success-100 text-success-700',
  revisionato: 'bg-primary-100 text-primary-700',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState<CheckupQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    questionnairesApi
      .getAll()
      .then(setQuestionnaires)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  const stats = {
    totali: questionnaires.length,
    inCorso: questionnaires.filter((q) => q.stato === 'in_compilazione').length,
    completati: questionnaires.filter((q) => q.stato === 'completato' || q.stato === 'revisionato').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.ruolo !== 'cliente' ? 'Dashboard Studio' : 'I miei Questionari'}
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.ruolo !== 'cliente'
            ? 'Panoramica dei questionari assegnati'
            : 'Compila i questionari che ti sono stati assegnati'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-lg">
              <ClipboardList className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totali}</p>
              <p className="text-sm text-gray-500">Questionari totali</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 rounded-lg">
              <Clock className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inCorso}</p>
              <p className="text-sm text-gray-500">In compilazione</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completati}</p>
              <p className="text-sm text-gray-500">Completati</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questionnaire list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Questionari</h2>
        </div>

        {questionnaires.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nessun questionario assegnato</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questionnaires.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(`/checkup/questionario/${q.id}`)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-gray-900 truncate">
                      {q.template?.nome || 'Questionario'}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statoColors[q.stato]}`}>
                      {statoLabels[q.stato]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {user?.ruolo !== 'cliente' && q.cliente && (
                      <span>
                        {q.cliente.nome} {q.cliente.cognome}
                        {q.cliente.azienda && ` - ${q.cliente.azienda}`}
                      </span>
                    )}
                    {q.dataAssegnazione && (
                      <span>Assegnato: {new Date(q.dataAssegnazione).toLocaleDateString('it-IT')}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 rounded-full transition-all"
                        style={{ width: `${q.percentualeCompletamento}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-10 text-right">
                      {q.percentualeCompletamento}%
                    </span>
                  </div>
                </div>
                <span className="ml-4 flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                  {user?.ruolo !== 'cliente' ? (
                    <><Eye className="h-3.5 w-3.5" /> Visualizza</>
                  ) : (
                    <><Pencil className="h-3.5 w-3.5" /> Compila</>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

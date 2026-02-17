import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionnairesApi, CheckupQuestionnaire, CheckupAnswer, CheckupSection } from '../api/questionnaires';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { ChatPanel } from '../components/ChatPanel';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Eye,
} from 'lucide-react';

export default function QuestionnairePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<CheckupQuestionnaire | null>(null);
  const [answers, setAnswers] = useState<Map<string, CheckupAnswer>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const pendingChangesRef = useRef<Map<string, string>>(new Map());
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [presenceByField, setPresenceByField] = useState<Record<string, { userId: string; name: string }[]>>({});
  const activeFieldRef = useRef<string | null>(null);
  const totalQuestionsRef = useRef(0);

  const isReadOnly = user?.ruolo !== 'cliente';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const q = await questionnairesApi.getOne(id);
      setQuestionnaire(q);

      // Build answers map
      const map = new Map<string, CheckupAnswer>();
      if (q.answers) {
        q.answers.forEach((a) => map.set(a.questionId, a));
      }
      setAnswers(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  const sections = useMemo(
    () => questionnaire?.template?.sections || [],
    [questionnaire],
  );

  useEffect(() => {
    totalQuestionsRef.current = sections.reduce((sum, section) => sum + section.questions.length, 0);
  }, [sections]);

  const activeSection = sections[activeSectionIdx] as CheckupSection | undefined;
  const activeCollaborators = useMemo(() => {
    const map = new Map<string, { userId: string; name: string }>();
    Object.values(presenceByField).forEach((users) => {
      users.forEach((u) => {
        if (u.userId === user?.id) return;
        if (!map.has(u.userId)) {
          map.set(u.userId, u);
        }
      });
    });
    return Array.from(map.values());
  }, [presenceByField, user?.id]);

  // Filter root questions (no parent) for active section
  const rootQuestions = useMemo(() => {
    if (!activeSection) return [];
    return activeSection.questions.filter((q) => !q.parentQuestionId);
  }, [activeSection]);

  // Get child questions for a given parent
  const getChildQuestions = useCallback(
    (parentId: string) => {
      if (!activeSection) return [];
      return activeSection.questions.filter((q) => q.parentQuestionId === parentId);
    },
    [activeSection],
  );

  // Combined answers (saved + pending)
  const combinedAnswers = useMemo(() => {
    const combined = new Map(answers);
    pendingChanges.forEach((valore, questionId) => {
      const existing = combined.get(questionId);
      if (existing) {
        combined.set(questionId, { ...existing, valore });
      } else {
        combined.set(questionId, {
          id: '',
          questionnaireId: id || '',
          questionId,
          valore,
          richiesto: false,
          evaso: false,
          note: null,
          question: null as never,
        });
      }
    });
    return combined;
  }, [answers, pendingChanges, id]);

  const handleAnswerChange = (questionId: string, valore: string) => {
    if (isReadOnly) return;
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(questionId, valore);
      return next;
    });
  };

  const markFieldActive = useCallback(
    (questionId: string) => {
      if (!id || isReadOnly) return;
      activeFieldRef.current = questionId;
      questionnairesApi.setPresenceActive(id, questionId).catch(() => null);
    },
    [id, isReadOnly],
  );

  const markFieldInactive = useCallback(
    (questionId: string) => {
      if (!id || isReadOnly) return;
      if (activeFieldRef.current === questionId) {
        activeFieldRef.current = null;
      }
      questionnairesApi.setPresenceInactive(id, questionId).catch(() => null);
    },
    [id, isReadOnly],
  );

  const refreshAnswers = useCallback(async () => {
    if (!id) return;
    try {
      const latest = await questionnairesApi.getAnswers(id);
      setAnswers((prev) => {
        const next = new Map(prev);
        latest.forEach((answer) => {
          if (!pendingChangesRef.current.has(answer.questionId)) {
            next.set(answer.questionId, answer);
          }
        });
        const totalQuestions = totalQuestionsRef.current;
        if (totalQuestions > 0) {
          const answeredCount = Array.from(next.values()).filter((a) => a?.valore && a.valore.trim() !== '').length;
          setQuestionnaire((current) => (current ? ({
            ...current,
            percentualeCompletamento: Math.round((answeredCount / totalQuestions) * 100),
          }) : current));
        }
        return next;
      });
    } catch {
      // ignore polling errors
    }
  }, [id]);

  const refreshPresence = useCallback(async () => {
    if (!id) return;
    try {
      const res = await questionnairesApi.getPresence(id);
      const next: Record<string, { userId: string; name: string }[]> = {};
      res.fields.forEach((field) => {
        next[field.fieldId] = field.users;
      });
      setPresenceByField(next);
    } catch {
      // ignore polling errors
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    refreshPresence();
    const interval = setInterval(refreshPresence, 4000);
    return () => clearInterval(interval);
  }, [id, refreshPresence]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(refreshAnswers, 5000);
    return () => clearInterval(interval);
  }, [id, refreshAnswers]);

  useEffect(() => {
    if (!id || isReadOnly) return;
    const interval = setInterval(() => {
      if (activeFieldRef.current) {
        questionnairesApi.setPresenceActive(id, activeFieldRef.current).catch(() => null);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      if (activeFieldRef.current) {
        questionnairesApi.setPresenceInactive(id, activeFieldRef.current).catch(() => null);
      }
    };
  }, [id, isReadOnly]);

  const saveSection = async () => {
    if (!id || pendingChanges.size === 0 || isReadOnly) return;

    setSaving(true);
    setSaveMessage('');
    try {
      const answersList = Array.from(pendingChanges.entries()).map(([questionId, valore]) => ({
        questionId,
        valore,
      }));

      const result = await questionnairesApi.saveAnswers(id, answersList);
      setPendingChanges(new Map());

      // Refresh to get updated answers
      await loadData();

      if (questionnaire) {
        setQuestionnaire({
          ...questionnaire,
          percentualeCompletamento: result.percentualeCompletamento,
          stato: result.stato as CheckupQuestionnaire['stato'],
        });
      }

      setSaveMessage('Risposte salvate con successo');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const goToSection = async (idx: number) => {
    if (!isReadOnly && pendingChanges.size > 0) {
      await saveSection();
    }
    setActiveSectionIdx(idx);
  };

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

  if (!questionnaire || !activeSection) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/checkup/')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{questionnaire.template?.nome}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${questionnaire.percentualeCompletamento}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{questionnaire.percentualeCompletamento}%</span>
          </div>
        </div>
        {activeCollaborators.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">Collaboratori attivi</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {activeCollaborators.map((u) => (
                <span
                  key={u.userId}
                  className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                >
                  {u.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Read-only banner for staff */}
      {isReadOnly && (
        <div className="flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-700 text-sm">
          <Eye className="h-4 w-4 flex-shrink-0" />
          Stai visualizzando il questionario in sola lettura. Solo gli utenti cliente della stessa azienda possono compilare le risposte.
        </div>
      )}

      <div className="flex gap-6">
        {/* Section sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sticky top-24">
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Sezioni
            </p>
            <nav className="space-y-0.5">
              {sections.map((s, idx) => {
                const sectionAnswered = s.questions.filter((q) => {
                  const a = combinedAnswers.get(q.id);
                  return a?.valore && a.valore.trim() !== '';
                }).length;
                const sectionTotal = s.questions.filter((q) => !q.parentQuestionId).length;

                return (
                  <button
                    key={s.id}
                    onClick={() => goToSection(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      idx === activeSectionIdx
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-6 h-6 rounded-md bg-gray-100 text-xs font-bold flex items-center justify-center text-gray-500">
                        {s.codice}
                      </span>
                      <span className="truncate">{s.nome}</span>
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {sectionAnswered}/{sectionTotal}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Questions area */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {activeSection.codice}. {activeSection.nome}
              </h2>
              {activeSection.descrizione && (
                <p className="text-sm text-gray-500 mt-1">{activeSection.descrizione}</p>
              )}
            </div>

            <div className="space-y-4">
              {rootQuestions.map((q) => (
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  answer={combinedAnswers.get(q.id)}
                  onAnswerChange={handleAnswerChange}
                  childQuestions={getChildQuestions(q.id)}
                  answers={combinedAnswers}
                  questionnaireId={questionnaire.id}
                  onDocumentUploaded={loadData}
                  readOnly={isReadOnly}
                  presenceByField={presenceByField}
                  currentUserId={user?.id}
                  onFieldFocus={markFieldActive}
                  onFieldBlur={markFieldInactive}
                />
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => goToSection(activeSectionIdx - 1)}
              disabled={activeSectionIdx === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Precedente
            </button>

            {!isReadOnly && (
              <div className="flex items-center gap-3">
                {saveMessage && (
                  <span className="flex items-center gap-1 text-sm text-success-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {saveMessage}
                  </span>
                )}
                <button
                  onClick={saveSection}
                  disabled={saving || pendingChanges.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvataggio...' : 'Salva sezione'}
                </button>
              </div>
            )}

            <button
              onClick={() => goToSection(activeSectionIdx + 1)}
              disabled={activeSectionIdx === sections.length - 1}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Successiva
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <ChatPanel
        questionnaireId={questionnaire.id}
        sectionId={activeSection.id}
        sectionName={`${activeSection.codice}. ${activeSection.nome}`}
      />
    </div>
  );
}

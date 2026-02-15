import { CheckupQuestion, CheckupAnswer } from '../api/questionnaires';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { CheckupDocument, questionnairesApi } from '../api/questionnaires';
import { useState, useRef } from 'react';

interface Props {
  question: CheckupQuestion;
  answer: CheckupAnswer | undefined;
  onAnswerChange: (questionId: string, valore: string) => void;
  childQuestions: CheckupQuestion[];
  answers: Map<string, CheckupAnswer>;
  questionnaireId: string;
  onDocumentUploaded: () => void;
  readOnly?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  childQuestions,
  answers,
  questionnaireId,
  onDocumentUploaded,
  readOnly = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentValue = answer?.valore || '';
  const canShowDocuments = question.accettaDocumenti ?? true;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !answer) return;

    setUploading(true);
    try {
      await questionnairesApi.uploadDocument(questionnaireId, file, answer.id);
      onDocumentUploaded();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await questionnairesApi.deleteDocument(docId);
      onDocumentUploaded();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Check if this conditional question should be visible
  const isVisible = !question.parentQuestionId || (() => {
    const parentAnswer = answers.get(question.parentQuestionId);
    if (!parentAnswer?.valore) return false;
    return parentAnswer.valore.toUpperCase() === question.parentConditionValue?.toUpperCase();
  })();

  if (!isVisible) return null;

  const renderInput = () => {
    switch (question.tipo) {
      case 'yesno':
        return (
          <div className="flex gap-3">
            {['SI', 'NO'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => !readOnly && onAnswerChange(question.id, opt)}
                disabled={readOnly}
                className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  currentValue === opt
                    ? 'bg-primary-700 text-white border-primary-700'
                    : readOnly
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                }`}
              >
                {opt === 'SI' ? 'S\u00ec' : 'No'}
              </button>
            ))}
          </div>
        );

      case 'choice':
        return (
          <div className="space-y-2">
            {question.opzioni?.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  readOnly ? 'cursor-default' : 'cursor-pointer'
                } ${
                  currentValue === opt
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={currentValue === opt}
                  onChange={() => !readOnly && onAnswerChange(question.id, opt)}
                  disabled={readOnly}
                  className="text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            disabled={readOnly}
            className={`w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg outline-none ${
              readOnly
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            }`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={currentValue}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            disabled={readOnly}
            className={`w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg outline-none ${
              readOnly
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            }`}
          />
        );

      default:
        return (
          <textarea
            value={currentValue}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            disabled={readOnly}
            rows={3}
            className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none resize-y ${
              readOnly
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
            }`}
            placeholder={readOnly ? '' : 'Inserisci la risposta...'}
          />
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium text-gray-900 flex-1">
          {question.testo}
          {question.obbligatoria && <span className="text-danger-500 ml-1">*</span>}
        </p>
      </div>

      {renderInput()}

      {/* Upload area */}
      {canShowDocuments && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Documenti allegati</span>
          </div>

          {/* Existing documents */}
          {answer?.documents && answer.documents.length > 0 && (
            <div className="space-y-1 mb-2">
              {answer.documents.map((doc: CheckupDocument) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-700 truncate">{doc.nomeOriginale}</span>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1 text-gray-400 hover:text-danger-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            <>
              <input
                ref={fileRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !answer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Caricamento...' : 'Carica documento'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Child conditional questions */}
      {childQuestions.length > 0 && (
        <div className="ml-4 pl-4 border-l-2 border-primary-100 space-y-3 mt-3">
          {childQuestions.map((child) => (
            <QuestionRenderer
              key={child.id}
              question={child}
              answer={answers.get(child.id)}
              onAnswerChange={onAnswerChange}
              childQuestions={[]}
              answers={answers}
              questionnaireId={questionnaireId}
              onDocumentUploaded={onDocumentUploaded}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

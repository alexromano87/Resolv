import { useEffect, useMemo, useState } from 'react';
import { Check, X, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import type {
  FetchTassiResultDto,
  FetchedRateWithStatus,
  FetchedRateData,
} from '../api/tassi-interesse';
import { BodyPortal } from './ui/BodyPortal';

const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    'banca-italia': 'Banca d\'Italia',
    'mef': 'MEF',
    'normattiva': 'Normattiva (IPZS)',
    'avvocato-andreani': 'Avvocato Andreani',
  };
  return labels[source] || source;
};

interface FetchedRatesPreviewProps {
  result: FetchTassiResultDto;
  onApprove: (rate: FetchedRateData) => void;
  onApproveSelected: (items: FetchedRateWithStatus[]) => void;
  onOverwrite: (item: FetchedRateWithStatus) => void;
  onDiscard: (item: FetchedRateWithStatus) => void;
  onClose: () => void;
}

export function FetchedRatesPreview({
  result,
  onApprove,
  onApproveSelected,
  onOverwrite,
  onDiscard,
  onClose,
}: FetchedRatesPreviewProps) {
  const ratesToApprove = result.rates.filter(r => r.status === 'needs-approval');
  const ratesDuplicate = result.rates.filter(r => r.status === 'skipped');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [result.fetchedAt]);

  const getRateKey = (item: FetchedRateWithStatus) =>
    `${item.data.tipo}-${item.data.tassoPercentuale}-${item.data.dataInizioValidita}-${item.data.dataFineValidita ?? 'open'}-${item.data.source}`;

  const selectedItems = useMemo(
    () => ratesToApprove.filter((item) => selectedKeys.has(getRateKey(item))),
    [ratesToApprove, selectedKeys],
  );

  return (
    <BodyPortal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto dark:bg-slate-900">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 display-font">
              Tassi Recuperati - Revisione Richiesta
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {result.autoSaved} salvati automaticamente, {result.needsApproval} richiedono approvazione manuale
            </p>
          </div>

          {/* Summary Stats */}
          <div className="px-6 py-4 bg-slate-50 grid grid-cols-2 gap-4 md:grid-cols-4 dark:bg-slate-800/40">
            <div className="text-center rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-2xl font-semibold text-emerald-600">{result.autoSaved}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Auto-salvati</div>
            </div>
            <div className="text-center rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-2xl font-semibold text-amber-600">{result.needsApproval}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Da approvare</div>
            </div>
            <div className="text-center rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-2xl font-semibold text-slate-500">{result.skipped}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Gia presenti</div>
            </div>
            <div className="text-center rounded-xl border border-slate-200 bg-white/70 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-2xl font-semibold text-rose-600">{result.errors}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Errori</div>
            </div>
          </div>

          {/* Fetch Errors (se presenti) */}
          {result.fetchErrors.length > 0 && (
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/40">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-rose-900 mb-2 dark:text-rose-100">Errori durante il recupero:</h3>
                  <ul className="space-y-1 text-sm text-rose-800 dark:text-rose-100/80">
                    {result.fetchErrors.map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.source}:</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Rates List */}
          <div className="px-6 py-4 space-y-4">
            {ratesToApprove.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-400">
                <span>Da approvare</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedKeys(new Set(ratesToApprove.map(getRateKey)))}
                    className="wow-button-ghost px-2 py-1 text-[11px]"
                  >
                    Seleziona tutti
                  </button>
                  {selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onApproveSelected(selectedItems)}
                      className="wow-button px-2 py-1 text-[11px]"
                    >
                      Salva selezionati
                    </button>
                  )}
                </div>
              </div>
            )}
            {ratesToApprove.map((item, index) => (
              <FetchedRateCard
                key={index}
                item={item}
                selected={selectedKeys.has(getRateKey(item))}
                onToggleSelected={() => {
                  setSelectedKeys((prev) => {
                    const next = new Set(prev);
                    const key = getRateKey(item);
                    if (next.has(key)) {
                      next.delete(key);
                    } else {
                      next.add(key);
                    }
                    return next;
                  });
                }}
                onApprove={() => onApprove(item.data)}
              />
            ))}

            {ratesDuplicate.length > 0 && (
              <div className="pt-2 text-xs uppercase tracking-wide text-slate-400">Gia presenti</div>
            )}
            {ratesDuplicate.map((item, index) => (
              <FetchedDuplicateCard
                key={`dup-${index}`}
                item={item}
                onDiscard={() => onDiscard(item)}
                onOverwrite={() => onOverwrite(item)}
              />
            ))}

            {ratesToApprove.length === 0 && ratesDuplicate.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <Info className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-600 dark:text-slate-300">Nessun tasso richiede intervento manuale</p>
                {result.autoSaved > 0 && (
                  <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
                    {result.autoSaved} {result.autoSaved === 1 ? 'tasso è stato salvato' : 'tassi sono stati salvati'} automaticamente da fonti ufficiali
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end sticky bottom-0 bg-white dark:border-slate-700 dark:bg-slate-900">
            <button
              onClick={onClose}
              className="wow-button-ghost"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

// Card for individual fetched rate
interface FetchedRateCardProps {
  item: FetchedRateWithStatus;
  selected: boolean;
  onToggleSelected: () => void;
  onApprove: () => void;
}

function FetchedRateCard({ item, selected, onToggleSelected, onApprove }: FetchedRateCardProps) {
  const { data, validation, duplicateCheck } = item;

  return (
    <div className="wow-panel border border-slate-200 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              title="Seleziona per salvare"
            />
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                data.tipo === 'legale'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                  : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
              }`}
            >
              {data.tipo === 'legale' ? 'Legale' : 'Moratorio'}
            </span>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {data.tassoPercentuale.toFixed(2)}%
            </span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Dal {new Date(data.dataInizioValidita).toLocaleDateString('it-IT')}
            {data.dataFineValidita && ` al ${new Date(data.dataFineValidita).toLocaleDateString('it-IT')}`}
          </div>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs ${
              data.isReliable
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            }`}
          >
            {data.isReliable ? 'Fonte Ufficiale' : 'Web Scraping'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
        {data.decretoRiferimento && (
          <div>
            <span className="font-medium">Decreto:</span> {data.decretoRiferimento}
          </div>
        )}

        <div>
          <span className="font-medium">Fonte:</span>{' '}
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline inline-flex items-center gap-1 dark:text-indigo-300"
          >
            {getSourceLabel(data.source)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {data.calculationDetails && (
          <div>
            <span className="font-medium">Calcolo:</span> {data.calculationDetails}
          </div>
        )}

        {data.note && (
          <div>
            <span className="font-medium">Note:</span> {data.note}
          </div>
        )}
      </div>

      {/* Validation warnings/errors */}
      {validation.warnings.length > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded dark:bg-amber-900/20 dark:border-amber-800/40">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-100">
              {validation.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {validation.errors.length > 0 && (
        <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded dark:bg-rose-900/20 dark:border-rose-800/40">
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-rose-800 dark:text-rose-100">
              {validation.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate check */}
      {duplicateCheck.isDuplicate && (
        <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded dark:bg-slate-800/50 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <strong>Nota:</strong> {duplicateCheck.reason}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onApprove}
          disabled={!validation.isValid}
          className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Approva e Salva
        </button>
      </div>
    </div>
  );
}

interface FetchedDuplicateCardProps {
  item: FetchedRateWithStatus;
  onDiscard: () => void;
  onOverwrite: () => void;
}

function FetchedDuplicateCard({ item, onDiscard, onOverwrite }: FetchedDuplicateCardProps) {
  const { data, duplicateCheck } = item;
  const existing = duplicateCheck.existingRate;
  const currentRange = existing
    ? `dal ${new Date(existing.dataInizioValidita).toLocaleDateString('it-IT')}${
        existing.dataFineValidita ? ` al ${new Date(existing.dataFineValidita).toLocaleDateString('it-IT')}` : ''
      }`
    : 'periodo attuale';

  return (
    <div className="wow-panel border border-slate-200 p-4 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                data.tipo === 'legale'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                  : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
              }`}
            >
              {data.tipo === 'legale' ? 'Legale' : 'Moratorio'}
            </span>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {data.tassoPercentuale.toFixed(2)}%
            </span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Tasso uguale a quello attualmente in vigore {currentRange}
          </div>
        </div>
      </div>

      {existing && (
        <div className="text-xs text-slate-600 space-y-1 dark:text-slate-300">
          <div>
            <span className="font-medium">Tasso attuale:</span> {existing.tassoPercentuale.toFixed(2)}%
          </div>
          {existing.decretoRiferimento && (
            <div>
              <span className="font-medium">Decreto attuale:</span> {existing.decretoRiferimento}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium">Fonte proposta:</span>{' '}
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline inline-flex items-center gap-1 dark:text-indigo-300"
        >
          {getSourceLabel(data.source)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onDiscard}
          className="wow-button-ghost"
        >
          Scarta
        </button>
        <button
          onClick={onOverwrite}
          className="wow-button"
        >
          Sovrascrivi
        </button>
      </div>
    </div>
  );
}

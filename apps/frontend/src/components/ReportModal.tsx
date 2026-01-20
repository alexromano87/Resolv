import { useState } from 'react';
import { X, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { generaReportPDF, generaReportExcel, generaReportCsv, downloadBlob, type ReportOptions } from '../api/report';
import { useToast } from './ui/ToastProvider';
import { BodyPortal } from './ui/BodyPortal';
import { DateField } from './ui/DateField';
import type { Cliente } from '../api/clienti';

interface ReportModalProps {
  cliente: Cliente;
  onClose: () => void;
}

export function ReportModal({ cliente, onClose }: ReportModalProps) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dataInizio: '',
    dataFine: '',
    includiDettaglio: true,
    includiAnticipazioni: true,
    includiCompensi: true,
    note: '',
  });

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);

      const options: ReportOptions = {
        dataInizio: formData.dataInizio || undefined,
        dataFine: formData.dataFine || undefined,
        includiDettaglio: formData.includiDettaglio,
        includiAnticipazioni: formData.includiAnticipazioni,
        includiCompensi: formData.includiCompensi,
        note: formData.note || undefined,
      };

      const blob = await generaReportPDF(cliente.id, options);
      const filename = `report-${cliente.ragioneSociale?.replace(/\s+/g, '-') || cliente.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);

      success('Report PDF generato con successo');
      onClose();
    } catch (err: any) {
      console.error('Errore generazione PDF:', err);
      toastError(err.message || 'Errore nella generazione del report PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExcel = async () => {
    try {
      setLoading(true);

      const options: ReportOptions = {
        dataInizio: formData.dataInizio || undefined,
        dataFine: formData.dataFine || undefined,
      };

      const blob = await generaReportExcel(cliente.id, options);
      const filename = `report-${cliente.ragioneSociale?.replace(/\s+/g, '-') || cliente.id}-${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);

      success('Report Excel generato con successo');
      onClose();
    } catch (err: any) {
      console.error('Errore generazione Excel:', err);
      toastError(err.message || 'Errore nella generazione del report Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCsv = async () => {
    try {
      setLoading(true);

      const options: ReportOptions = {
        dataInizio: formData.dataInizio || undefined,
        dataFine: formData.dataFine || undefined,
      };

      const blob = await generaReportCsv(cliente.id, options);
      const filename = `report-${cliente.ragioneSociale?.replace(/\s+/g, '-') || cliente.id}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);

      success('Report CSV generato con successo');
      onClose();
    } catch (err: any) {
      console.error('Errore generazione CSV:', err);
      toastError(err.message || 'Errore nella generazione del report CSV');
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
                Genera Report
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {cliente.ragioneSociale}
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

          {/* Form */}
          <div className="space-y-4 mb-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Inizio
                </label>
                <DateField
                  value={formData.dataInizio}
                  onChange={(value) => setFormData({ ...formData, dataInizio: value })}
                  placeholder="Seleziona una data"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Fine
                </label>
                <DateField
                  value={formData.dataFine}
                  onChange={(value) => setFormData({ ...formData, dataFine: value })}
                  placeholder="Seleziona una data"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includiDettaglio"
                  checked={formData.includiDettaglio}
                  onChange={(e) => setFormData({ ...formData, includiDettaglio: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <label htmlFor="includiDettaglio" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Includi dettaglio pratiche
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includiAnticipazioni"
                  checked={formData.includiAnticipazioni}
                  onChange={(e) => setFormData({ ...formData, includiAnticipazioni: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <label htmlFor="includiAnticipazioni" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Includi anticipazioni
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includiCompensi"
                  checked={formData.includiCompensi}
                  onChange={(e) => setFormData({ ...formData, includiCompensi: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
                <label htmlFor="includiCompensi" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Includi compensi
                </label>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Note (opzionale)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                placeholder="Aggiungi note da includere nel report..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Download size={18} className="animate-bounce" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Genera PDF
                </>
              )}
            </button>

            <button
              onClick={handleGenerateExcel}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Download size={18} className="animate-bounce" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Genera Excel
                </>
              )}
            </button>

            <button
              onClick={handleGenerateCsv}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-600 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Download size={18} className="animate-bounce" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Genera CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}

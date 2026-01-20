import { API_BASE_URL } from './config';

export interface ReportOptions {
  dataInizio?: string;
  dataFine?: string;
  includiDettaglio?: boolean;
  includiAnticipazioni?: boolean;
  includiCompensi?: boolean;
  includiRiepilogo?: boolean;
  includiAlert?: boolean;
  includiTickets?: boolean;
  includePraticheIds?: string[];
  includeAlertIds?: string[];
  includeTicketIds?: string[];
  note?: string;
}

export interface SavedReport {
  id: string;
  filename: string;
  createdAt: string;
  clienteId: string;
}

/**
 * Genera un report PDF per un cliente
 */
export async function generaReportPDF(clienteId: string, options?: ReportOptions): Promise<Blob> {
  const token = localStorage.getItem('auth_token');

  const params = new URLSearchParams();
  if (options?.dataInizio) params.append('dataInizio', options.dataInizio);
  if (options?.dataFine) params.append('dataFine', options.dataFine);
  if (options?.includiDettaglio !== undefined) params.append('includiDettaglio', String(options.includiDettaglio));
  if (options?.includiAnticipazioni !== undefined) params.append('includiAnticipazioni', String(options.includiAnticipazioni));
  if (options?.includiCompensi !== undefined) params.append('includiCompensi', String(options.includiCompensi));
  if (options?.includiRiepilogo !== undefined) params.append('includiRiepilogo', String(options.includiRiepilogo));
  if (options?.includiAlert !== undefined) params.append('includiAlert', String(options.includiAlert));
  if (options?.includiTickets !== undefined) params.append('includiTickets', String(options.includiTickets));
  if (options?.includePraticheIds?.length) params.append('includePraticheIds', options.includePraticheIds.join(','));
  if (options?.includeAlertIds?.length) params.append('includeAlertIds', options.includeAlertIds.join(','));
  if (options?.includeTicketIds?.length) params.append('includeTicketIds', options.includeTicketIds.join(','));
  if (options?.note) params.append('note', options.note);

  const url = `${API_BASE_URL}/report/cliente/${clienteId}/pdf?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nella generazione del report PDF');
  }

  return await response.blob();
}

/**
 * Salva un report PDF per un cliente (ritorna metadata)
 */
export async function salvaReportPDF(clienteId: string, options?: ReportOptions): Promise<SavedReport> {
  const token = localStorage.getItem('auth_token');

  const params = new URLSearchParams();
  if (options?.dataInizio) params.append('dataInizio', options.dataInizio);
  if (options?.dataFine) params.append('dataFine', options.dataFine);
  if (options?.includiDettaglio !== undefined) params.append('includiDettaglio', String(options.includiDettaglio));
  if (options?.includiAnticipazioni !== undefined) params.append('includiAnticipazioni', String(options.includiAnticipazioni));
  if (options?.includiCompensi !== undefined) params.append('includiCompensi', String(options.includiCompensi));
  if (options?.includiRiepilogo !== undefined) params.append('includiRiepilogo', String(options.includiRiepilogo));
  if (options?.includiAlert !== undefined) params.append('includiAlert', String(options.includiAlert));
  if (options?.includiTickets !== undefined) params.append('includiTickets', String(options.includiTickets));
  if (options?.includePraticheIds?.length) params.append('includePraticheIds', options.includePraticheIds.join(','));
  if (options?.includeAlertIds?.length) params.append('includeAlertIds', options.includeAlertIds.join(','));
  if (options?.includeTicketIds?.length) params.append('includeTicketIds', options.includeTicketIds.join(','));
  if (options?.note) params.append('note', options.note);

  const url = `${API_BASE_URL}/report/cliente/${clienteId}/salva?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel salvataggio del report');
  }

  return await response.json();
}

export async function listaReportCliente(clienteId: string): Promise<SavedReport[]> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/report/cliente/${clienteId}/salvati`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Errore nel recupero dei report salvati');
  return await response.json();
}

export async function downloadReportSalvato(reportId: string): Promise<Blob> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/report/salvato/${reportId}/pdf`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Errore nel download del report');
  return await response.blob();
}

/**
 * Genera un report Excel per un cliente
 */
export async function generaReportExcel(clienteId: string, options?: ReportOptions): Promise<Blob> {
  const token = localStorage.getItem('auth_token');

  const params = new URLSearchParams();
  if (options?.dataInizio) params.append('dataInizio', options.dataInizio);
  if (options?.dataFine) params.append('dataFine', options.dataFine);

  const url = `${API_BASE_URL}/report/cliente/${clienteId}/excel?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nella generazione del report Excel');
  }

  return await response.blob();
}

/**
 * Genera un report CSV per un cliente
 */
export async function generaReportCsv(clienteId: string, options?: ReportOptions): Promise<Blob> {
  const token = localStorage.getItem('auth_token');

  const params = new URLSearchParams();
  if (options?.dataInizio) params.append('dataInizio', options.dataInizio);
  if (options?.dataFine) params.append('dataFine', options.dataFine);

  const url = `${API_BASE_URL}/report/cliente/${clienteId}/csv?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Errore nella generazione del report CSV');
  }

  return await response.blob();
}

/**
 * Scarica un blob come file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

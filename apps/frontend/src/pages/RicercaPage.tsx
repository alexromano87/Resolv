// apps/frontend/src/pages/RicercaPage.tsx
import { useEffect, useState } from 'react';
import { BodyPortal } from '../components/ui/BodyPortal';
import {
  Search,
  ChevronRight,
  Users,
  Building2,
  User,
  FileText,
  Bell,
  Ticket,
  X,
  ArrowRight,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  FileDown,
  Banknote,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../components/Pagination';

import type { Cliente } from '../api/clienti';
import { fetchClienti } from '../api/clienti';
import type { Debitore } from '../api/debitori';
import {
  fetchDebitoriWithClientiCount,
  getDebitoreDisplayName,
  type DebitoreWithClientiCount,
} from '../api/debitori';
import type { Pratica } from '../api/pratiche';
import { fetchPratiche, formatCurrency, getDebitoreDisplayName as getPraticaDebitoreDisplayName } from '../api/pratiche';
import { movimentiFinanziariApi, type TotaliMovimenti } from '../api/movimenti-finanziari';
import { fetchAlerts, type Alert } from '../api/alerts';
import { fetchTickets, type Ticket as TicketType, type TicketPriorita } from '../api/tickets';
import { listaReportCliente, downloadReportSalvato, type SavedReport, downloadBlob } from '../api/report';
import { useToast } from '../components/ui/ToastProvider';
import { DebitoreDetailModal } from '../components/ui/DebitoreDetailModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SearchableClienteSelect } from '../components/ui/SearchableClienteSelect';

type TipoRisultato = 'cliente' | 'debitore' | 'pratica' | 'alert' | 'ticket';

type RisultatoRicerca = {
  tipo: TipoRisultato;
  data: any;
};


const formatoItalianoANumero = (valore: string) => {
  if (!valore) return '';
  const stringa = String(valore).replace(/\./g, '').replace(',', '.');
  return stringa;
};

const numeroAFormatoItaliano = (valore: string) => {
  if (!valore || valore === '0' || valore === '0.00') return '';
  const numero = parseFloat(valore);
  if (isNaN(numero)) return '';
  return numero.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const formatExportDate = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT');
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const defaultTotals: TotaliMovimenti = {
  capitale: 0,
  anticipazioni: 0,
  compensi: 0,
  interessi: 0,
  recuperoCapitale: 0,
  recuperoAnticipazioni: 0,
  recuperoCompensi: 0,
  recuperoInteressi: 0,
};

type ImportiPratica = {
  capitale: number;
  capitaleRecuperato: number;
  anticipazioni: number;
  anticipazioniRecuperate: number;
  compensi: number;
  compensiRecuperati: number;
  interessi: number;
  interessiRecuperati: number;
};

const defaultImporti: ImportiPratica = {
  capitale: 0,
  capitaleRecuperato: 0,
  anticipazioni: 0,
  anticipazioniRecuperate: 0,
  compensi: 0,
  compensiRecuperati: 0,
  interessi: 0,
  interessiRecuperati: 0,
};

export function RicercaPage() {
  // === Stato dati ===
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [debitori, setDebitori] = useState<DebitoreWithClientiCount[]>([]);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [movimentiPerPratica, setMovimentiPerPratica] = useState<Record<string, TotaliMovimenti>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportClienteId, setReportClienteId] = useState('');
  const [reportResults, setReportResults] = useState<SavedReport[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // === Stato filtri ricerca ===
  const [termineRicerca, setTermineRicerca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<
    'tutti' | 'clienti' | 'debitori' | 'pratiche' | 'alerts' | 'tickets'
  >('tutti');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [valoreDa, setValoreDa] = useState('');
  const [valoreA, setValoreA] = useState('');
  const [tipoImporto, setTipoImporto] = useState<'capitale' | 'interessi' | 'anticipazioni' | 'compensi'>('capitale');
  const [categoriaImporto, setCategoriaImporto] = useState<'affidato' | 'recuperato' | 'da_recuperare'>('affidato');
  const [risultati, setRisultati] = useState<RisultatoRicerca[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [ricercaEffettuata, setRicercaEffettuata] = useState(false);

  const tipoOptions = [
    { value: 'tutti', label: 'Tutti i tipi' },
    { value: 'clienti', label: 'Clienti' },
    { value: 'debitori', label: 'Debitori' },
    { value: 'pratiche', label: 'Pratiche' },
    { value: 'alerts', label: 'Alert & scadenze' },
    { value: 'tickets', label: 'Tickets' },
  ];

  const statoOptions = [
    { value: 'tutti', label: 'Tutti gli stati' },
    ...(filtroTipo === 'pratiche' || filtroTipo === 'tutti'
      ? [
          { value: 'aperte', label: 'Pratiche aperte' },
          { value: 'chiuse', label: 'Pratiche chiuse' },
        ]
      : []),
    ...(filtroTipo === 'alerts'
      ? [
          { value: 'in_gestione', label: 'Alert in gestione' },
          { value: 'chiuso', label: 'Alert chiusi' },
        ]
      : []),
    ...(filtroTipo === 'tickets'
      ? [
          { value: 'aperto', label: 'Ticket aperti' },
          { value: 'chiuso', label: 'Ticket chiusi/risolti' },
        ]
      : []),
  ];

  const tipoImportoOptions = [
    { value: 'capitale', label: 'Capitale' },
    { value: 'interessi', label: 'Interessi' },
    { value: 'anticipazioni', label: 'Anticipazioni' },
    { value: 'compensi', label: 'Compensi legali' },
  ];

  const categoriaImportoOptions = [
    { value: 'affidato', label: 'Affidato' },
    { value: 'recuperato', label: 'Recuperato' },
    { value: 'da_recuperare', label: 'Da recuperare' },
  ];

  // === Stato modale debitore ===
  const [selectedDebitore, setSelectedDebitore] = useState<Debitore | null>(null);
  const [isDebitoreModalOpen, setIsDebitoreModalOpen] = useState(false);

  // === Stato modale cliente ===
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);

  // === Stato modale pratica ===
  const [selectedPratica, setSelectedPratica] = useState<Pratica | null>(null);
  const [isPraticaModalOpen, setIsPraticaModalOpen] = useState(false);

  // === Stato modale ticket ===
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const navigate = useNavigate();
  const { error: toastError, info: toastInfo } = useToast();
  const getImportiPratica = (p: Pratica): ImportiPratica => {
    const t = movimentiPerPratica[p.id] || defaultTotals;
    return {
      capitale: toNumber(p.capitale) + toNumber(t.capitale),
      capitaleRecuperato: toNumber(p.importoRecuperatoCapitale) + toNumber(t.recuperoCapitale),
      anticipazioni: toNumber(p.anticipazioni) + toNumber(t.anticipazioni),
      anticipazioniRecuperate: toNumber(p.importoRecuperatoAnticipazioni) + toNumber(t.recuperoAnticipazioni),
      compensi: toNumber(p.compensiLegali) + toNumber(t.compensi),
      compensiRecuperati: toNumber(p.compensiLiquidati) + toNumber(t.recuperoCompensi),
      interessi: toNumber(p.interessi) + toNumber(t.interessi),
      interessiRecuperati: toNumber(p.interessiRecuperati) + toNumber(t.recuperoInteressi),
    };
  };
  const importiSelected = selectedPratica ? getImportiPratica(selectedPratica) : defaultImporti;

  // === Caricamento dati ===
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [clientiData, debitoriData, praticheData, alertsData, ticketsData] = await Promise.all([
          fetchClienti(true), // Include anche disattivati per ricerca completa
          fetchDebitoriWithClientiCount(true), // Include conteggio clienti per badge orfano
          fetchPratiche({ includeInactive: true }), // Include tutte le pratiche
          fetchAlerts(true), // Include tutti gli alert
          fetchTickets(true), // Include tutti i ticket
        ]);
        setClienti(clientiData);
        setDebitori(debitoriData);
        setPratiche(praticheData);
        setAlerts(alertsData);
        setTickets(ticketsData);

        // Totali movimenti per ogni pratica per importi coerenti con i movimenti finanziari
        const totals = await Promise.all(
          praticheData.map(async (p) => {
            try {
              const t = await movimentiFinanziariApi.getTotaliByPratica(p.id);
              return { id: p.id, totals: t };
            } catch (err) {
              console.error('Errore caricamento totali movimenti pratica', p.id, err);
              return { id: p.id, totals: null };
            }
          }),
        );
        const map: Record<string, TotaliMovimenti> = {};
        totals.forEach(({ id, totals }) => {
          if (totals) map[id] = totals;
        });
        setMovimentiPerPratica(map);
      } catch (e: any) {
        const msg = e?.message ?? 'Errore nel recupero dei dati';
        setError(msg);
        toastError(msg, 'Errore caricamento ricerca');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toastError]);

  // === Gestione focus/blur per i campi valore con formattazione italiana ===
  const handleValoreFocus = (campo: 'da' | 'a', valore: string) => {
    if (!valore) return;
    const numeroConvertito = formatoItalianoANumero(valore);
    if (campo === 'da') {
      setValoreDa(numeroConvertito);
    } else {
      setValoreA(numeroConvertito);
    }
  };

  const handleValoreBlur = (campo: 'da' | 'a', valore: string) => {
    if (!valore || valore.trim() === '') {
      if (campo === 'da') {
        setValoreDa('');
      } else {
        setValoreA('');
      }
      return;
    }
    const numeroConvertito = formatoItalianoANumero(valore);
    const numeroFormattato = numeroAFormatoItaliano(numeroConvertito);
    if (campo === 'da') {
      setValoreDa(numeroFormattato);
    } else {
      setValoreA(numeroFormattato);
    }
  };

  const getPraticaImportoValue = (pratica: Pratica) => {
    const importi = getImportiPratica(pratica);
    if (tipoImporto === 'capitale') {
      if (categoriaImporto === 'affidato') {
        return importi.capitale;
      }
      if (categoriaImporto === 'recuperato') {
        return importi.capitaleRecuperato;
      }
      return importi.capitale - importi.capitaleRecuperato;
    }
    if (tipoImporto === 'interessi') {
      if (categoriaImporto === 'affidato') {
        return importi.interessi;
      }
      if (categoriaImporto === 'recuperato') {
        return importi.interessiRecuperati;
      }
      return importi.interessi - importi.interessiRecuperati;
    }
    if (tipoImporto === 'anticipazioni') {
      if (categoriaImporto === 'affidato') {
        return importi.anticipazioni;
      }
      if (categoriaImporto === 'recuperato') {
        return importi.anticipazioniRecuperate;
      }
      return importi.anticipazioni - importi.anticipazioniRecuperate;
    }
    if (categoriaImporto === 'affidato') {
      return importi.compensi;
    }
    if (categoriaImporto === 'recuperato') {
      return importi.compensiRecuperati;
    }
    return importi.compensi - importi.compensiRecuperati;
  };

  const exportToCsv = () => {
    if (!risultati.length) {
      toastInfo('Nessun risultato da esportare.', 'Esporta report');
      return;
    }

    const headers = [
      'Tipo',
      'ID',
      'Numero',
      'Titolo',
      'Cliente',
      'Debitore',
      'Stato',
      'Importo',
      'Data',
      'Email',
      'Telefono',
      'Note',
    ];

    const rows = risultati.map((risultato) => {
      if (risultato.tipo === 'cliente') {
        return {
          Tipo: 'Cliente',
          ID: risultato.data.id,
          Numero: '',
          Titolo: risultato.data.ragioneSociale,
          Cliente: risultato.data.ragioneSociale,
          Debitore: '',
          Stato: risultato.data.attivo ? 'Attivo' : 'Disattivo',
          Importo: '',
          Data: formatExportDate(risultato.data.createdAt),
          Email: risultato.data.email,
          Telefono: risultato.data.telefono,
          Note: '',
        };
      }
      if (risultato.tipo === 'debitore') {
        const nomeDebitore = getDebitoreDisplayName(risultato.data);
        return {
          Tipo: 'Debitore',
          ID: risultato.data.id,
          Numero: '',
          Titolo: nomeDebitore,
          Cliente: '',
          Debitore: nomeDebitore,
          Stato: risultato.data.attivo ? 'Attivo' : 'Disattivo',
          Importo: '',
          Data: formatExportDate(risultato.data.createdAt),
          Email: risultato.data.email,
          Telefono: risultato.data.telefono,
          Note: '',
        };
      }
      if (risultato.tipo === 'pratica') {
        const cliente =
          risultato.data.cliente?.ragioneSociale ||
          clienti.find((c) => c.id === risultato.data.clienteId)?.ragioneSociale ||
          '';
        const debitore =
          getPraticaDebitoreDisplayName(risultato.data.debitore) ||
          getDebitoreDisplayName(debitori.find((d) => d.id === risultato.data.debitoreId)) ||
          '';
        const importo = getPraticaImportoValue(risultato.data);
        const titolo = cliente && debitore ? `${cliente} vs ${debitore}` : risultato.data.riferimentoCredito || 'Pratica';
        return {
          Tipo: 'Pratica',
          ID: risultato.data.id,
          Numero: risultato.data.riferimentoCredito || '',
          Titolo: titolo,
          Cliente: cliente,
          Debitore: debitore,
          Stato: risultato.data.aperta ? 'Aperta' : 'Chiusa',
          Importo: formatCurrency(importo),
          Data: formatExportDate(risultato.data.dataAffidamento || risultato.data.createdAt),
          Email: '',
          Telefono: '',
          Note: risultato.data.note || '',
        };
      }
      if (risultato.tipo === 'alert') {
        const pratica = risultato.data.praticaId
          ? pratiche.find((p) => p.id === risultato.data.praticaId)
          : null;
        const cliente =
          risultato.data.pratica?.cliente?.ragioneSociale ||
          pratica?.cliente?.ragioneSociale ||
          (pratica ? clienti.find((c) => c.id === pratica.clienteId)?.ragioneSociale : '') ||
          '';
        const debitore =
          getPraticaDebitoreDisplayName(risultato.data.pratica?.debitore) ||
          getPraticaDebitoreDisplayName(pratica?.debitore) ||
          (pratica ? getDebitoreDisplayName(debitori.find((d) => d.id === pratica.debitoreId)) : '') ||
          '';
        return {
          Tipo: 'Alert',
          ID: risultato.data.id,
          Numero: '',
          Titolo: risultato.data.titolo,
          Cliente: cliente,
          Debitore: debitore,
          Stato: risultato.data.stato,
          Importo: '',
          Data: formatExportDate(risultato.data.dataScadenza || risultato.data.dataCreazione),
          Email: '',
          Telefono: '',
          Note: risultato.data.descrizione || '',
        };
      }

      const pratica = risultato.data.praticaId
        ? pratiche.find((p) => p.id === risultato.data.praticaId)
        : null;
      const cliente =
        risultato.data.pratica?.cliente?.ragioneSociale ||
        pratica?.cliente?.ragioneSociale ||
        (pratica ? clienti.find((c) => c.id === pratica.clienteId)?.ragioneSociale : '') ||
        '';
      const debitore =
        getPraticaDebitoreDisplayName(risultato.data.pratica?.debitore) ||
        getPraticaDebitoreDisplayName(pratica?.debitore) ||
        (pratica ? getDebitoreDisplayName(debitori.find((d) => d.id === pratica.debitoreId)) : '') ||
        '';

      return {
        Tipo: 'Ticket',
        ID: risultato.data.id,
        Numero: risultato.data.numeroTicket || '',
        Titolo: risultato.data.oggetto || 'Ticket',
        Cliente: cliente,
        Debitore: debitore,
        Stato: risultato.data.stato,
        Importo: '',
        Data: formatExportDate(risultato.data.dataCreazione),
        Email: '',
        Telefono: '',
        Note: risultato.data.descrizione || '',
      };
    });

    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => formatCsvValue(row[header as keyof typeof row] ?? '')).join(','),
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_ricerca_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // === Helpers per label e icone ===
  const getPrioritaBadgeColor = (priorita: TicketPriorita) => {
    switch (priorita) {
      case 'urgente':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400';
      case 'alta':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400';
      case 'normale':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
      case 'bassa':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getPraticaNome = (praticaOrId: Pratica | string | null | undefined) => {
    if (!praticaOrId) return 'N/D';
    const pratica =
      typeof praticaOrId === 'string'
        ? pratiche.find((p) => p.id === praticaOrId)
        : praticaOrId;
    if (!pratica) return 'N/D';

    const clienteLabel =
      pratica.cliente?.ragioneSociale ||
      clienti.find((c) => c.id === pratica.clienteId)?.ragioneSociale ||
      'N/D';

    const debitoreLabel =
      getPraticaDebitoreDisplayName(pratica.debitore) ||
      getDebitoreDisplayName(debitori.find((d) => d.id === pratica.debitoreId)) ||
      'N/D';

    return `${clienteLabel} vs ${debitoreLabel}`;
  };

  const getTipoIcon = (tipo: TipoRisultato) => {
    switch (tipo) {
      case 'cliente':
        return Users;
      case 'debitore':
        return Building2;
      case 'pratica':
        return FileText;
      case 'alert':
        return Bell;
      case 'ticket':
        return Ticket;
      default:
        return FileText;
    }
  };

  const getTipoColor = (tipo: TipoRisultato) => {
    switch (tipo) {
      case 'cliente':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
      case 'debitore':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
      case 'pratica':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200';
      case 'alert':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200';
      case 'ticket':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200';
    }
  };

  const getTipoLabel = (tipo: TipoRisultato) => {
    switch (tipo) {
      case 'cliente':
        return 'Cliente';
      case 'debitore':
        return 'Debitore';
      case 'pratica':
        return 'Pratica';
      case 'alert':
        return 'Alert';
      case 'ticket':
        return 'Ticket';
      default:
        return tipo;
    }
  };

  // === Navigazione al dettaglio ===
  const visualizzaDettaglio = (risultato: RisultatoRicerca) => {
    switch (risultato.tipo) {
      case 'cliente':
        setSelectedCliente(risultato.data as Cliente);
        setIsClienteModalOpen(true);
        break;
      case 'debitore':
        // Apre la modale con i dettagli del debitore
        setSelectedDebitore(risultato.data as Debitore);
        setIsDebitoreModalOpen(true);
        break;
      case 'pratica':
        // Porta direttamente al dettaglio pratica
        navigate(`/pratiche/${(risultato.data as Pratica).id}`);
        break;
      case 'alert':
        navigate('/alert');
        break;
      case 'ticket':
        // Apre la modale con i dettagli del ticket
        setSelectedTicket(risultato.data as TicketType);
        setIsTicketModalOpen(true);
        break;
      default:
        break;
    }
  };

  // Handler per chiusura modale debitore
  const handleCloseDebitoreModal = () => {
    setIsDebitoreModalOpen(false);
    setSelectedDebitore(null);
  };

  const handleCloseClienteModal = () => {
    setIsClienteModalOpen(false);
    setSelectedCliente(null);
  };

  // Handler quando un debitore orfano viene collegato
  const handleDebitoreLinked = () => {
    // Potresti voler aggiornare i risultati di ricerca qui
    // Per ora non facciamo nulla, la modale si aggiornerà da sola
  };

  // Handler per chiusura modale pratica
  const handleClosePraticaModal = () => {
    setIsPraticaModalOpen(false);
    setSelectedPratica(null);
  };

  // Handler per navigare alla pratica
  const handleGoToPratica = () => {
    if (selectedPratica?.id) {
      navigate(`/pratiche/${selectedPratica.id}`);
    }
  };


  // === Funzione principale di ricerca (per ora clienti + struttura pronta per il resto) ===
  const eseguiRicerca = () => {
    // Se nessun filtro attivo, resetta
    if (
      !termineRicerca.trim() &&
      filtroTipo === 'tutti' &&
      filtroStato === 'tutti' &&
      !valoreDa &&
      !valoreA
    ) {
      setRisultati([]);
      setRicercaEffettuata(false);
      return;
    }

    const termine = termineRicerca.toLowerCase();
    const matches = (value?: string | number | null) =>
      value !== null &&
      value !== undefined &&
      String(value).toLowerCase().includes(termine);
    let risultatiTrovati: RisultatoRicerca[] = [];

    // === CLIENTI ===
    if (filtroTipo === 'tutti' || filtroTipo === 'clienti') {
      const clientiTrovati = clienti
        .filter((c) => {
          return (
            !termine ||
            matches(c.ragioneSociale) ||
            matches(c.email) ||
            matches(c.telefono) ||
            matches(c.indirizzo) ||
            matches(c.citta) ||
            matches(c.provincia) ||
            matches(c.nazione) ||
            matches(c.partitaIva) ||
            matches(c.codiceFiscale)
          );
        })
        .map((c) => ({ tipo: 'cliente' as const, data: c }));
      risultatiTrovati = [...risultatiTrovati, ...clientiTrovati];
    }

    // === DEBITORI ===
    if (filtroTipo === 'tutti' || filtroTipo === 'debitori') {
      const debitoriTrovati = debitori
        .filter((d: Debitore) => {
          const displayName = getDebitoreDisplayName(d).toLowerCase();
          return (
            !termine ||
            displayName.includes(termine) ||
            matches(d.ragioneSociale) ||
            matches(d.nome) ||
            matches(d.cognome) ||
            matches(d.codiceFiscale) ||
            matches(d.partitaIva) ||
            matches(d.email) ||
            matches(d.telefono) ||
            matches(d.indirizzo) ||
            matches(d.citta) ||
            matches(d.provincia) ||
            matches(d.nazione)
          );
        })
        .map((d: DebitoreWithClientiCount) => ({ tipo: 'debitore' as const, data: d }));
      risultatiTrovati = [...risultatiTrovati, ...debitoriTrovati];
    }

    // === PRATICHE (struttura pronta, ma pratiche[] è vuoto) ===
    if (filtroTipo === 'tutti' || filtroTipo === 'pratiche') {
      let praticheTrovate = pratiche.filter((p: any) => {
        const cliente = clienti.find((c) => c.id === p.clienteId);
        const debitore = debitori.find((d) => d.id === p.debitoreId);
        const importi = getImportiPratica(p);

        const debitoreDisplay = debitore ? getDebitoreDisplayName(debitore).toLowerCase() : '';
        const matchTermine =
          !termine ||
          matches(p.numeroPratica) ||
          matches(p.id) ||
          matches(p.note) ||
          matches(p.fase) ||
          matches((p.fase as any)?.nome) ||
          matches(p.faseId) ||
          matches(cliente?.ragioneSociale) ||
          matches(cliente?.email) ||
          matches(cliente?.telefono) ||
          matches(cliente?.partitaIva) ||
          matches(cliente?.codiceFiscale) ||
          matches(debitore?.ragioneSociale) ||
          debitoreDisplay.includes(termine) ||
          matches(debitore?.nome) ||
          matches(debitore?.cognome) ||
          matches(debitore?.codiceFiscale) ||
          matches(debitore?.partitaIva) ||
          matches(debitore?.email) ||
          matches(debitore?.telefono) ||
          matches(importi.capitale);

        let matchValore = true;
        if (valoreDa || valoreA) {
          // Determina quale campo usare in base al tipo e categoria
          let valoreDaConfronto = 0;

          if (tipoImporto === 'capitale') {
            if (categoriaImporto === 'affidato') {
              valoreDaConfronto = importi.capitale;
            } else if (categoriaImporto === 'recuperato') {
              valoreDaConfronto = importi.capitaleRecuperato;
            } else if (categoriaImporto === 'da_recuperare') {
              valoreDaConfronto = importi.capitale - importi.capitaleRecuperato;
            }
          } else if (tipoImporto === 'interessi') {
            if (categoriaImporto === 'affidato') {
              valoreDaConfronto = importi.interessi;
            } else if (categoriaImporto === 'recuperato') {
              valoreDaConfronto = importi.interessiRecuperati;
            } else if (categoriaImporto === 'da_recuperare') {
              valoreDaConfronto = importi.interessi - importi.interessiRecuperati;
            }
          } else if (tipoImporto === 'anticipazioni') {
            if (categoriaImporto === 'affidato') {
              valoreDaConfronto = importi.anticipazioni;
            } else if (categoriaImporto === 'recuperato') {
              valoreDaConfronto = importi.anticipazioniRecuperate;
            } else if (categoriaImporto === 'da_recuperare') {
              valoreDaConfronto = importi.anticipazioni - importi.anticipazioniRecuperate;
            }
          } else if (tipoImporto === 'compensi') {
            if (categoriaImporto === 'affidato') {
              valoreDaConfronto = importi.compensi;
            } else if (categoriaImporto === 'recuperato') {
              valoreDaConfronto = importi.compensiRecuperati;
            } else if (categoriaImporto === 'da_recuperare') {
              valoreDaConfronto = importi.compensi - importi.compensiRecuperati;
            }
          }

          const da = valoreDa
            ? parseFloat(formatoItalianoANumero(valoreDa))
            : 0;
          const a = valoreA
            ? parseFloat(formatoItalianoANumero(valoreA))
            : Infinity;

          if (valoreDa && valoreA) {
            matchValore = valoreDaConfronto >= da && valoreDaConfronto <= a;
          } else if (valoreDa) {
            matchValore = valoreDaConfronto >= da;
          } else if (valoreA) {
            matchValore = valoreDaConfronto <= a;
          }
        }

        return matchTermine && matchValore;
      });

      // filtro stato pratiche
      if (filtroStato === 'aperte') {
        praticheTrovate = praticheTrovate.filter((p: any) => p.aperta);
      } else if (filtroStato === 'chiuse') {
        praticheTrovate = praticheTrovate.filter((p: any) => !p.aperta);
      }

      risultatiTrovati = [
        ...risultatiTrovati,
        ...praticheTrovate.map((p: any) => ({
          tipo: 'pratica' as const,
          data: p,
        })),
      ];
    }

    // === ALERTS (placeholder) ===
    if (filtroTipo === 'tutti' || filtroTipo === 'alerts') {
      let alertsTrovati = alerts.filter((a: any) => {
        const pratica = pratiche.find((p: any) => p.id === a.praticaId);
        const cliente = pratica
          ? clienti.find((c) => c.id === pratica.clienteId)
          : null;
        const debitore = pratica
          ? debitori.find((d) => d.id === pratica.debitoreId)
          : null;

        return (
          !termine ||
          matches(a.titolo) ||
          matches(a.note) ||
          matches(a.descrizione) ||
          matches(a.destinatario) ||
          matches(a.stato) ||
          matches(pratica?.numeroPratica) ||
          matches(cliente?.ragioneSociale) ||
          matches(cliente?.email) ||
          matches(cliente?.telefono) ||
          matches(cliente?.partitaIva) ||
          matches(cliente?.codiceFiscale) ||
          matches(debitore?.ragioneSociale) ||
          matches(debitore?.codiceFiscale) ||
          matches(debitore?.partitaIva) ||
          matches(debitore?.email) ||
          matches(debitore?.telefono)
        );
      });

      if (filtroStato === 'in_gestione') {
        alertsTrovati = alertsTrovati.filter(
          (a: any) => a.stato === 'in_gestione',
        );
      } else if (filtroStato === 'chiuso') {
        alertsTrovati = alertsTrovati.filter((a: any) => a.stato === 'chiuso');
      }

      risultatiTrovati = [
        ...risultatiTrovati,
        ...alertsTrovati.map((a: any) => ({
          tipo: 'alert' as const,
          data: a,
        })),
      ];
    }

    // === TICKETS ===
    if (filtroTipo === 'tutti' || filtroTipo === 'tickets') {
      let ticketsTrovati = tickets.filter((t: any) => {
        const pratica = pratiche.find((p: any) => p.id === t.praticaId);
        const cliente = pratica
          ? clienti.find((c) => c.id === pratica.clienteId)
          : null;
        const debitore = pratica
          ? debitori.find((d) => d.id === pratica.debitoreId)
          : null;

        return (
          !termine ||
          matches(t.numeroTicket) ||
          matches(t.oggetto) ||
          matches(t.descrizione) ||
          matches(t.autore) ||
          matches(t.stato) ||
          matches(t.priorita) ||
          matches(pratica?.numeroPratica) ||
          matches(cliente?.ragioneSociale) ||
          matches(cliente?.email) ||
          matches(cliente?.telefono) ||
          matches(cliente?.partitaIva) ||
          matches(cliente?.codiceFiscale) ||
          matches(debitore?.ragioneSociale) ||
          matches(debitore?.codiceFiscale) ||
          matches(debitore?.partitaIva) ||
          matches(debitore?.email) ||
          matches(debitore?.telefono)
        );
      });

      if (filtroStato === 'aperto') {
        ticketsTrovati = ticketsTrovati.filter((t: any) => t.stato === 'aperto');
      } else if (filtroStato === 'chiuso') {
        ticketsTrovati = ticketsTrovati.filter(
          (t: any) => t.stato === 'chiuso' || t.stato === 'risolto',
        );
      }

      risultatiTrovati = [
        ...risultatiTrovati,
        ...ticketsTrovati.map((t: any) => ({
          tipo: 'ticket' as const,
          data: t,
        })),
      ];
    }

    setRisultati(risultatiTrovati);
    setRicercaEffettuata(true);
  };

  const cercaReportSalvati = async () => {
    if (!reportClienteId) {
      toastInfo('Seleziona un cliente per cercare i report salvati');
      return;
    }
    try {
      setLoadingReport(true);
      const reports = await listaReportCliente(reportClienteId);
      setReportResults(reports);
    } catch (err: any) {
      console.error(err);
      toastError(err.message || 'Errore nel recupero dei report');
    } finally {
      setLoadingReport(false);
    }
  };

  const scaricaReport = async (report: SavedReport) => {
    try {
      const blob = await downloadReportSalvato(report.id);
      downloadBlob(blob, report.filename);
    } catch (err: any) {
      console.error(err);
      toastError(err.message || 'Errore nel download del report');
    }
  };

  const anteprimaReport = async (report: SavedReport) => {
    try {
      const blob = await downloadReportSalvato(report.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error(err);
      toastError(err.message || 'Errore nel caricamento anteprima');
    }
  };

  // === Render ===
  const filtersArea = (
    <>
      {/* Pannello filtri */}
      <div className="wow-panel p-4 md:p-5 relative z-30">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 md:items-end">
            <div className="w-full">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Cerca
              </label>
              <input
                type="text"
                value={termineRicerca}
                onChange={(e) => setTermineRicerca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') eseguiRicerca();
                }}
                placeholder="Inserisci nome, email, telefono, fase, importo..."
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="w-full">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Tipo
              </label>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <CustomSelect
                    options={tipoOptions}
                    value={filtroTipo}
                    onChange={(value) => {
                      const nextValue = value as typeof filtroTipo;
                      setFiltroTipo(nextValue);
                      setFiltroStato('tutti');
                      if (nextValue !== 'pratiche' && nextValue !== 'tutti') {
                        setValoreDa('');
                        setValoreA('');
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={eseguiRicerca}
                  className="wow-button text-xs"
                >
                  <Search className="h-4 w-4" />
                  Cerca
                </button>
              </div>
            </div>
          </div>

          {(loading || ricercaEffettuata) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-indigo-500" />
                {loading
                  ? 'Ricerca in corso...'
                  : risultati.length === 0
                    ? 'Nessun risultato trovato'
                    : `Trovati ${risultati.length} risultati`}
              </div>
              {ricercaEffettuata && risultati.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('ricerca-risultati')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Vai ai risultati
                </button>
              )}
            </div>
          )}

          {(filtroTipo === 'pratiche' || filtroTipo === 'alerts' || filtroTipo === 'tickets') && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Stato
                </label>
                <CustomSelect
                  options={statoOptions}
                  value={filtroStato}
                  onChange={setFiltroStato}
                />
              </div>
            </div>
          )}

          {filtroTipo === 'pratiche' && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {/* Tipo importo */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Tipo importo
                  </label>
                  <CustomSelect
                    options={tipoImportoOptions}
                    value={tipoImporto}
                    onChange={(value) => setTipoImporto(value as typeof tipoImporto)}
                  />
                </div>

                {/* Categoria importo */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Categoria
                  </label>
                  <CustomSelect
                    options={categoriaImportoOptions}
                    value={categoriaImporto}
                    onChange={(value) => setCategoriaImporto(value as typeof categoriaImporto)}
                  />
                </div>
              </div>

              {/* Range valore */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Valore (€)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={valoreDa}
                    onChange={(e) => setValoreDa(e.target.value)}
                    onFocus={(e) => handleValoreFocus('da', e.target.value)}
                    onBlur={(e) => handleValoreBlur('da', e.target.value)}
                    placeholder="Da (es. 1.000,00)"
                    className="flex-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    value={valoreA}
                    onChange={(e) => setValoreA(e.target.value)}
                    onFocus={(e) => handleValoreFocus('a', e.target.value)}
                    onBlur={(e) => handleValoreBlur('a', e.target.value)}
                    placeholder="A (es. 50.000,00)"
                    className="flex-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs text-slate-900 shadow-sm placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Suggerimento */}
          <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-200">
              Suggerimento:{' '}
            </span>
            Puoi cercare per ragione sociale, email, telefono, fase, importi o
            note. Usa i filtri avanzati per cercare per tipo importo (capitale, interessi, anticipazioni, compensi)
            e categoria (affidato, recuperato, da recuperare).
          </div>
        </div>
      </div>

      {/* Ricerca report salvati */}
      <div className="wow-panel p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="wow-chip">Report salvati</p>
            <h2 className="text-lg font-semibold text-slate-900">Cerca report cliente</h2>
            <p className="text-xs text-slate-500">Seleziona un cliente e recupera i PDF salvati.</p>
          </div>
          <div className="flex gap-2">
            <div className="min-w-[240px]">
              <SearchableClienteSelect
                clienti={clienti}
                value={reportClienteId || null}
                onChange={(val) => setReportClienteId(val || '')}
                placeholder="Seleziona cliente"
              />
            </div>
            <button
              type="button"
              onClick={cercaReportSalvati}
              className="wow-button text-xs"
              disabled={loadingReport}
            >
              {loadingReport ? 'Carico...' : 'Cerca report'}
            </button>
          </div>
        </div>

        {reportResults.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">File</th>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportResults.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-800">{r.filename}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.createdAt).toLocaleString('it-IT')}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        className="wow-button-ghost text-xs"
                        onClick={() => anteprimaReport(r)}
                      >
                        Anteprima
                      </button>
                      <button
                        className="wow-button text-xs"
                        onClick={() => scaricaReport(r)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            {reportClienteId ? 'Nessun report salvato per questo cliente.' : 'Seleziona un cliente per cercare i report.'}
          </div>
        )}
      </div>
    </>
  );

  const risultatiArea = (
    <>
      {/* Area risultati */}
      {loading && !ricercaEffettuata ? (
        <div
          id="ricerca-risultati"
          className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
        >
          Caricamento dati per la ricerca...
        </div>
      ) : !ricercaEffettuata ? (
        <div
          id="ricerca-risultati"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400"
        >
          <Search className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Cerca nel database
          </p>
          <p className="mt-1 max-w-md">
            Inserisci un termine e applica i filtri per trovare rapidamente
            clienti, debitori, pratiche, alert e ticket correlati.
          </p>
        </div>
      ) : risultati.length === 0 ? (
        <div
          id="ricerca-risultati"
          className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/90 p-8 text-center text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
        >
          <Search className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Nessun risultato trovato
          </p>
          <p className="mt-1 max-w-md">
            Prova a modificare i termini di ricerca o ad allentare i filtri.
          </p>
        </div>
      ) : (
        <div
          id="ricerca-risultati"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
        >
          {/* Header risultati */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-slate-700 dark:text-slate-200">
              Trovati{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                {risultati.length}
              </span>{' '}
              risultati
            </p>
            <div className="flex items-center gap-3">
              {(valoreDa || valoreA) && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Filtro importi:</span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-100">
                    {tipoImporto === 'capitale' && 'Capitale'}
                    {tipoImporto === 'interessi' && 'Interessi'}
                    {tipoImporto === 'anticipazioni' && 'Anticipazioni'}
                    {tipoImporto === 'compensi' && 'Compensi'}{' '}
                    ({categoriaImporto === 'affidato' && 'Affidato'}
                    {categoriaImporto === 'recuperato' && 'Recuperato'}
                    {categoriaImporto === 'da_recuperare' && 'Da recuperare'})
                    {' - '}
                    {valoreDa && `Da €${valoreDa}`}{' '}
                    {valoreDa && valoreA && ' - '}{' '}
                    {valoreA && `A €${valoreA}`}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={exportToCsv}
                className="wow-button-ghost text-[11px]"
              >
                <FileDown className="h-4 w-4" />
                Esporta CSV
              </button>
            </div>
          </div>

          {/* Elenco risultati */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {risultati
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map((risultato, index) => {
              const Icon = getTipoIcon(risultato.tipo);

              return (
                <div
                  key={`${risultato.tipo}-${risultato.data.id ?? index}`}
                  className="cursor-pointer px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/60"
                  onClick={() => visualizzaDettaglio(risultato)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      {/* Icona */}
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Contenuto */}
                      <div className="min-w-0 flex-1">
                        {/* Badge tipo + stato */}
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getTipoColor(
                              risultato.tipo,
                            )}`}
                          >
                            {getTipoLabel(risultato.tipo)}
                          </span>

                          {/* Badge orfano/collegato per debitori */}
                          {risultato.tipo === 'debitore' && (
                            risultato.data.clientiCount === 0 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                                ⚠️ Orfano
                              </span>
                            ) : (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                                {risultato.data.clientiCount} cliente{risultato.data.clientiCount > 1 ? 'i' : ''}
                              </span>
                            )
                          )}

                          {/* Badge stati specifici per pratiche */}
                          {risultato.tipo === 'pratica' && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              {(() => {
                                const pratica = risultato.data as Pratica;
                                if (!pratica.aperta) {
                                  return pratica.esito === 'positivo'
                                    ? 'Chiusa - Esito positivo'
                                    : pratica.esito === 'negativo'
                                      ? 'Chiusa - Esito negativo'
                                      : 'Chiusa';
                                }
                                return pratica.fase?.nome || 'Aperta';
                              })()}
                            </span>
                          )}
                        </div>

                        {/* Titolo principale */}
                        <h4 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {risultato.tipo === 'cliente'
                            ? risultato.data.ragioneSociale
                            : risultato.tipo === 'debitore'
                              ? getDebitoreDisplayName(risultato.data)
                              : risultato.tipo === 'pratica'
                                ? getPraticaNome(risultato.data as Pratica)
                                : risultato.tipo === 'alert'
                                  ? risultato.data.titolo ?? 'Alert'
                                  : risultato.data.oggetto ?? 'Ticket'}
                        </h4>

                        {/* Dettagli sintetici */}
                        <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {risultato.tipo === 'cliente' && (
                            <>
                              {risultato.data.partitaIva && (
                                <p>
                                  <span className="font-medium">P.IVA:</span>{' '}
                                  {risultato.data.partitaIva}
                                </p>
                              )}
                              {risultato.data.email && (
                                <p>
                                  <span className="font-medium">Email:</span>{' '}
                                  {risultato.data.email}
                                </p>
                              )}
                              {risultato.data.telefono && (
                                <p>
                                  <span className="font-medium">Tel:</span>{' '}
                                  {risultato.data.telefono}
                                </p>
                              )}
                              {risultato.data.citta && (
                                <p>
                                  <span className="font-medium">Sede:</span>{' '}
                                  {risultato.data.citta}
                                  {risultato.data.provincia && ` (${risultato.data.provincia})`}
                                </p>
                              )}
                              {risultato.data.attivo === false && (
                                <p className="text-amber-600 dark:text-amber-400">
                                  <span className="font-medium">⚠️ Disattivato</span>
                                </p>
                              )}
                            </>
                          )}

                          {risultato.tipo === 'debitore' && (
                            <>
                              <p>
                                <span className="font-medium">Tipo:</span>{' '}
                                {risultato.data.tipoSoggetto === 'persona_fisica' ? 'Persona fisica' : 'Persona giuridica'}
                              </p>
                              {risultato.data.codiceFiscale && (
                                <p>
                                  <span className="font-medium">C.F.:</span>{' '}
                                  {risultato.data.codiceFiscale}
                                </p>
                              )}
                              {risultato.data.partitaIva && (
                                <p>
                                  <span className="font-medium">P.IVA:</span>{' '}
                                  {risultato.data.partitaIva}
                                </p>
                              )}
                              {risultato.data.email && (
                                <p>
                                  <span className="font-medium">Email:</span>{' '}
                                  {risultato.data.email}
                                </p>
                              )}
                              {risultato.data.telefono && (
                                <p>
                                  <span className="font-medium">Tel:</span>{' '}
                                  {risultato.data.telefono}
                                </p>
                              )}
                              {risultato.data.citta && (
                                <p>
                                  <span className="font-medium">Sede:</span>{' '}
                                  {risultato.data.citta}
                                  {risultato.data.provincia && ` (${risultato.data.provincia})`}
                                </p>
                              )}
                              {risultato.data.attivo === false && (
                                <p className="text-amber-600 dark:text-amber-400">
                                  <span className="font-medium">⚠️ Disattivato</span>
                                </p>
                              )}
                            </>
                          )}

                          {risultato.tipo === 'pratica' && (
                            <>
                              <p>
                                <span className="font-medium">Numero pratica:</span>{' '}
                                {risultato.data.numeroPratica || risultato.data.id?.slice(0, 8)}
                              </p>
                              <p>
                                <span className="font-medium">Cliente:</span>{' '}
                                {risultato.data.cliente?.ragioneSociale}
                              </p>
                              <p>
                                <span className="font-medium">Debitore:</span>{' '}
                                {getPraticaDebitoreDisplayName(risultato.data.debitore)}
                              </p>
                              <p>
                                <span className="font-medium">Capitale:</span> €{' '}
                                {formatCurrency(getImportiPratica(risultato.data).capitale)}
                              </p>
                              <p>
                                <span className="font-medium">Stato:</span>{' '}
                                {risultato.data.aperta ? 'Aperta' : 'Chiusa'}
                              </p>
                            </>
                          )}

                          {risultato.tipo === 'alert' && (
                            <>
                              <p>
                                <span className="font-medium">Descrizione:</span>{' '}
                                {risultato.data.descrizione}
                              </p>
                              <p>
                                <span className="font-medium">Scadenza:</span>{' '}
                                {new Date(risultato.data.dataScadenza).toLocaleDateString('it-IT')}
                              </p>
                              <p>
                                <span className="font-medium">Destinatario:</span>{' '}
                                {risultato.data.destinatario === 'studio' ? 'Studio' : 'Cliente'}
                              </p>
                              <p>
                                <span className="font-medium">Stato:</span>{' '}
                                {risultato.data.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                              </p>
                              {risultato.data.pratica && (
                                <p>
                                  <span className="font-medium">Pratica:</span>{' '}
                                  {risultato.data.pratica.cliente?.ragioneSociale} vs{' '}
                                  {getPraticaDebitoreDisplayName(risultato.data.pratica.debitore)}
                                </p>
                              )}
                            </>
                          )}

                          {risultato.tipo === 'ticket' && (
                            <>
                              <p>
                                <span className="font-medium">Numero Ticket:</span>{' '}
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  #{risultato.data.numeroTicket}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Descrizione:</span>{' '}
                                {risultato.data.descrizione}
                              </p>
                              <p>
                                <span className="font-medium">Richiedente:</span>{' '}
                                {risultato.data.autore}
                              </p>
                              <p>
                                <span className="font-medium">Priorità:</span>{' '}
                                {risultato.data.priorita.charAt(0).toUpperCase() + risultato.data.priorita.slice(1)}
                              </p>
                              <p>
                                <span className="font-medium">Stato:</span>{' '}
                                {risultato.data.stato === 'aperto' ? 'Aperto' : risultato.data.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                              </p>
                              {risultato.data.pratica && (
                                <p>
                                  <span className="font-medium">Pratica:</span>{' '}
                                  {risultato.data.pratica.cliente?.ragioneSociale} vs{' '}
                                  {getPraticaDebitoreDisplayName(risultato.data.pratica.debitore)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Freccia */}
                    <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(risultati.length / ITEMS_PER_PAGE)}
            totalItems={risultati.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4 wow-stagger">
      {/* Header */}
      <div className="wow-card space-y-2 p-4 md:p-5">
        <span className="wow-chip">Strumenti</span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Ricerca avanzata
        </h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Cerca trasversalmente tra clienti, debitori, pratiche, alert e ticket.
          Filtra per tipo, stato e range di importo affidato.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-100 shadow-sm shadow-rose-900/40">
          {error}
        </div>
      )}
      <div className="space-y-4">{filtersArea}</div>
      {risultatiArea}

      {/* Modale dettaglio debitore */}
      <DebitoreDetailModal
        isOpen={isDebitoreModalOpen}
        onClose={handleCloseDebitoreModal}
        debitore={selectedDebitore}
        onLinked={handleDebitoreLinked}
      />

      {isClienteModalOpen && selectedCliente && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseClienteModal} />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Dettaglio Cliente
              </h2>
              <button onClick={handleCloseClienteModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ragione sociale</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedCliente.ragioneSociale}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Partita IVA</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {selectedCliente.partitaIva || 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Codice fiscale</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {selectedCliente.codiceFiscale || 'N/D'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {selectedCliente.email || 'N/D'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Telefono</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {selectedCliente.telefono || 'N/D'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Indirizzo</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {selectedCliente.indirizzo || 'N/D'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Città</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {selectedCliente.citta || 'N/D'}
                  {selectedCliente.provincia ? ` (${selectedCliente.provincia})` : ''}
                </p>
                {selectedCliente.nazione && (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Nazione</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      {selectedCliente.nazione}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                onClick={() => navigate('/clienti')}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/40"
              >
                Apri pagina clienti
              </button>
              <button
                onClick={handleCloseClienteModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Modale dettaglio pratica */}
      {isPraticaModalOpen && selectedPratica && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClosePraticaModal}
          />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Dettaglio Pratica
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPratica.cliente?.ragioneSociale} vs {getPraticaDebitoreDisplayName(selectedPratica.debitore)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePraticaModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* Stato pratica */}
              <div className="flex items-center gap-2">
                {selectedPratica.aperta ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                    In corso
                  </span>
                ) : selectedPratica.esito === 'positivo' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Chiusa con esito positivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400">
                    <XCircle className="h-3.5 w-3.5" />
                    Chiusa con esito negativo
                  </span>
                )}
                {!selectedPratica.attivo && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    Disattivata
                  </span>
                )}
              </div>

              {/* Informazioni principali */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Cliente
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedPratica.cliente?.ragioneSociale || 'N/D'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Debitore
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {getPraticaDebitoreDisplayName(selectedPratica.debitore)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Capitale
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    € {formatCurrency(importiSelected.capitale)}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Data affidamento
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedPratica.dataAffidamento
                      ? new Date(selectedPratica.dataAffidamento).toLocaleDateString('it-IT')
                      : 'N/D'}
                  </p>
                </div>
              </div>

              {/* Importi recuperati */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800">
                <h3 className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide mb-3">
                  Importi Recuperati
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Capitale</p>
                    <p className="font-bold text-indigo-900 dark:text-indigo-100">
                      € {formatCurrency(importiSelected.capitaleRecuperato || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Anticipazioni</p>
                    <p className="font-bold text-indigo-900 dark:text-indigo-100">
                      € {formatCurrency(importiSelected.anticipazioniRecuperate || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Compensi legali</p>
                    <p className="font-bold text-indigo-900 dark:text-indigo-100">
                      € {formatCurrency(importiSelected.compensiRecuperati || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Interessi</p>
                    <p className="font-bold text-indigo-900 dark:text-indigo-100">
                      € {formatCurrency(importiSelected.interessiRecuperati || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              {selectedPratica.note && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Note
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {selectedPratica.note}
                  </p>
                </div>
              )}

              {(selectedPratica.opposizione || selectedPratica.pignoramento) && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                    Dettagli procedurali
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Opposizione</p>
                      <p>
                        <span className="font-medium">Esito: </span>
                        {selectedPratica.opposizione?.esito || 'N/D'}
                      </p>
                      <p>
                        <span className="font-medium">Data esito: </span>
                        {selectedPratica.opposizione?.dataEsito
                          ? new Date(selectedPratica.opposizione.dataEsito).toLocaleDateString('it-IT')
                          : 'N/D'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {selectedPratica.opposizione?.note || 'Nessuna nota'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pignoramento</p>
                      <p>
                        <span className="font-medium">Tipo: </span>
                        {selectedPratica.pignoramento?.tipo || 'N/D'}
                      </p>
                      <p>
                        <span className="font-medium">Data notifica: </span>
                        {selectedPratica.pignoramento?.dataNotifica
                          ? new Date(selectedPratica.pignoramento.dataNotifica).toLocaleDateString('it-IT')
                          : 'N/D'}
                      </p>
                      <p>
                        <span className="font-medium">Esito: </span>
                        {selectedPratica.pignoramento?.esito || 'N/D'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {selectedPratica.pignoramento?.note || 'Nessuna nota'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con pulsante "Vai alla pratica" */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleClosePraticaModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Chiudi
              </button>
              <button
                onClick={handleGoToPratica}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition"
              >
                Vai alla pratica
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Modale Dettaglio Ticket */}
      {isTicketModalOpen && selectedTicket && (
        <BodyPortal>
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-content bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedTicket.oggetto}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getPrioritaBadgeColor(selectedTicket.priorita)}`}>
                    {selectedTicket.priorita === 'urgente' && <AlertTriangle className="h-3 w-3" />}
                    {selectedTicket.priorita.charAt(0).toUpperCase() + selectedTicket.priorita.slice(1)}
                  </span>
                  {selectedTicket.stato === 'aperto' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Aperto
                    </span>
                  )}
                  {selectedTicket.stato === 'in_gestione' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                      <PlayCircle className="h-3 w-3" />
                      In gestione
                    </span>
                  )}
                  {selectedTicket.stato === 'chiuso' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      <CheckCircle className="h-3 w-3" />
                      Chiuso
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Descrizione */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Descrizione
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedTicket.descrizione}
                </p>
              </div>

              {/* Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Numero Ticket
                  </h3>
                  <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{selectedTicket.numeroTicket}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Richiedente
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedTicket.autore}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Data Creazione
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(selectedTicket.dataCreazione).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>

              {/* Pratica */}
              {selectedTicket.pratica ? (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Pratica Collegata
                  </h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>Cliente:</strong> {selectedTicket.pratica.cliente?.ragioneSociale}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      <strong>Debitore:</strong> {getPraticaDebitoreDisplayName(selectedTicket.pratica.debitore)}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Pratica
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Richiesta generica (non collegata a pratica)
                  </p>
                </div>
              )}

              {/* Messaggi */}
              {selectedTicket.messaggi && selectedTicket.messaggi.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Messaggi ({selectedTicket.messaggi.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedTicket.messaggi.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.autore === 'studio' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.autore === 'studio'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1">
                            {msg.autore === 'studio' ? 'Studio' : 'Cliente'}
                          </p>
                          <p className="text-sm">{msg.testo}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {new Date(msg.dataInvio).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Chiudi
              </button>
              <button
                onClick={() => {
                  setIsTicketModalOpen(false);
                  navigate(`/ticket?id=${selectedTicket.id}`);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition"
              >
                Vai al ticket
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}
    </div>
  );
}

export default RicercaPage;

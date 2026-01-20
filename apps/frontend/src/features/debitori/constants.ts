// apps/frontend/src/features/debitori/constants.ts

export type DebitoreFormState = {
  ragioneSociale: string;
  partitaIva: string;

  sedeLegale: string;
  sedeOperativa: string;

  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;

  tipologia: string;
  referente: string;

  telefono: string;
  email: string;
  pec: string;
};

export const DEBITORE_INITIAL_FORM: DebitoreFormState = {
  ragioneSociale: '',
  partitaIva: '',

  sedeLegale: '',
  sedeOperativa: '',

  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: 'IT',

  tipologia: '',
  referente: '',

  telefono: '',
  email: '',
  pec: '',
};

export const DEBITORE_FIELD_CONFIG: Record<
  keyof DebitoreFormState,
  { label: string; placeholder?: string }
> = {
  ragioneSociale: {
    label: 'Ragione sociale / nominativo',
    placeholder: 'es. Rossi Srl / Rossi Mario',
  },
  partitaIva: {
    label: 'Partita IVA',
    placeholder: 'es. 01234560987',
  },

  sedeLegale: {
    label: 'Sede legale',
    placeholder: 'Indirizzo sede legale',
  },
  sedeOperativa: {
    label: 'Sede operativa',
    placeholder: 'Indirizzo sede operativa',
  },

  indirizzo: {
    label: 'Indirizzo (recapito)',
    placeholder: 'Via / piazza, n.',
  },
  cap: {
    label: 'CAP',
    placeholder: 'es. 24121',
  },
  citta: {
    label: 'Città',
    placeholder: 'es. Bergamo',
  },
  provincia: {
    label: 'Provincia',
    placeholder: 'es. BG',
  },
  nazione: {
    label: 'Nazione',
    placeholder: 'Seleziona nazione',
  },

  tipologia: {
    label: 'Tipologia soggetto',
    placeholder: 'Seleziona tipologia',
  },
  referente: {
    label: 'Referente',
    placeholder: 'Nome referente interno',
  },

  telefono: {
    label: 'Telefono',
    placeholder: 'Numero di telefono',
  },
  email: {
    label: 'Email',
    placeholder: 'Email ordinaria',
  },
  pec: {
    label: 'PEC',
    placeholder: 'Indirizzo PEC',
  },
};

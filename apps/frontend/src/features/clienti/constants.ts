// apps/frontend/src/features/clienti/constants.ts

export type ClienteFormState = {
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

export const CLIENTE_INITIAL_FORM: ClienteFormState = {
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

export const CLIENTE_FIELD_CONFIG = {
  ragioneSociale: {
    label: 'Ragione sociale*',
    placeholder: 'Es. ACME S.r.l.',
  },
  partitaIva: {
    label: 'Partita IVA',
    placeholder: '12345678901',
  },
  sedeLegale: {
    label: 'Sede legale',
    placeholder: 'Via / indirizzo completo',
  },
  sedeOperativa: {
    label: 'Sede operativa',
    placeholder: 'Via / indirizzo completo',
  },
  indirizzo: {
    label: 'Indirizzo (anagrafica)',
    placeholder: 'Via Roma 1',
  },
  cap: {
    label: 'CAP',
    placeholder: '24100',
  },
  citta: {
    label: 'Città',
    placeholder: 'Bergamo',
  },
  provincia: {
    label: 'Provincia',
    placeholder: 'BG',
  },
  referente: {
    label: 'Referente',
    placeholder: 'Nome e cognome referente',
  },
  telefono: {
    label: 'Telefono',
    placeholder: '+39 ...',
  },
  email: {
    label: 'Email',
    placeholder: 'esempio@studio.it',
  },
  pec: {
    label: 'PEC',
    placeholder: 'pec@azienda.it',
  },
} as const;

export const NAZIONI_OPTIONS = [
  { value: 'IT', label: 'Italia' },
  { value: 'SM', label: 'San Marino' },
  { value: 'VA', label: 'Città del Vaticano' },
  { value: 'CH', label: 'Svizzera' },
  { value: 'FR', label: 'Francia' },
  { value: 'DE', label: 'Germania' },
  { value: 'AT', label: 'Austria' },
] as const;

export const TIPOLOGIA_OPTIONS = [
  { value: '', label: 'Seleziona tipologia' },
  { value: 'impresa_individuale', label: 'Impresa individuale' },
  { value: 'impresa_individuale_agricola', label: 'Impresa individuale agricola' },
  { value: 'srl', label: 'SRL' },
  { value: 'spa', label: 'SPA' },
  { value: 'scpa', label: 'SCPA' },
  { value: 'srl_agricola', label: 'SRL agricola' },
  { value: 'snc', label: 'SNC' },
  { value: 'sas', label: 'SAS' },
] as const;

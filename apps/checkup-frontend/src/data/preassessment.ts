export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number';

export interface FieldSpec {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  help?: string;
  allowDocuments?: boolean;
  weight?: number;
}

export interface SectionSpec {
  id: string;
  macro: string;
  title: string;
  description: string;
  fields: FieldSpec[];
}

export interface MacroAreaSpec {
  id: string;
  label: string;
  color: string;
}

export const MACRO_AREAS: MacroAreaSpec[] = [
  {
    "id": "a",
    "label": "Identita e Struttura",
    "color": "#3b82f6"
  },
  {
    "id": "b",
    "label": "Governance",
    "color": "#7c3aed"
  },
  {
    "id": "c",
    "label": "Organizzazione",
    "color": "#0891b2"
  },
  {
    "id": "d",
    "label": "Compliance e Controlli",
    "color": "#d97706"
  },
  {
    "id": "e",
    "label": "Rapporti con la PA",
    "color": "#e11d48"
  },
  {
    "id": "f",
    "label": "Risk Management",
    "color": "#dc2626"
  },
  {
    "id": "g",
    "label": "Rapporti Esterni",
    "color": "#059669"
  },
  {
    "id": "h",
    "label": "Adeguati Assetti",
    "color": "#7c3aed"
  },
  {
    "id": "i",
    "label": "Documentazione",
    "color": "#475569"
  },
  {
    "id": "j",
    "label": "Autovalutazione",
    "color": "#ca8a04"
  },
  {
    "id": "k",
    "label": "Owner Macro Aree",
    "color": "#9333ea"
  }
];

export const SECTIONS: SectionSpec[] = [
  {
    "id": "a_1",
    "macro": "a",
    "title": "A.1 Anagrafica Societaria",
    "description": "",
    "fields": [
      {
        "id": "ragione_sociale",
        "label": "Ragione/Denominazione sociale",
        "type": "text",
        "required": true
      },
      {
        "id": "forma_giuridica",
        "label": "Forma giuridica",
        "type": "select",
        "required": true,
        "options": [
          "S.r.l.",
          "S.p.A.",
          "S.a.p.a.",
          "S.r.l.s.",
          "Soc. cooperativa",
          "Consorzio",
          "Fondazione",
          "Associazione",
          "Altro"
        ]
      },
      {
        "id": "anno_costituzione",
        "label": "Anno di costituzione",
        "type": "text",
        "required": true
      },
      {
        "id": "rea",
        "label": "Registro Imprese / N.ro iscrizione REA",
        "type": "text",
        "required": true
      },
      {
        "id": "cf_piva",
        "label": "Codice fiscale / Partita IVA",
        "type": "text",
        "required": true
      },
      {
        "id": "sede_legale",
        "label": "Sede legale",
        "type": "text",
        "required": true
      },
      {
        "id": "sedi_secondarie",
        "label": "La Società ha istituito sedi secondarie con rappresentanza stabile?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì in Italia",
          "Sì all'estero",
          "Si in Italia e all'estero - No"
        ],
        "help": "Le sedi secondarie sono uffici, filiali, stabilimenti o unità operative della Società situati in luogo diverso dalla sede legale, presso i quali opera stabilmente un rappresentante dotato di poteri per agire in nome e per conto della Società nei confronti dei terzi (c.d. institor o preposto).\nNon rientrano in questa definizione i semplici depositi, magazzini o unità produttive prive di un soggetto con poteri di rappresentanza."
      },
      {
        "id": "sedi_secondarie_dettaglio",
        "label": "Se si, indicare: numero di sedi secondarie e, per ciascuna di esse: indirizzo + attività svolta + numero complessivo di dipendenti assegnati",
        "type": "textarea",
        "required": true
      },
      {
        "id": "sedi_secondarie_ri",
        "label": "Le sedi secondarie in Italia sono iscritte nel Registro Imprese",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "sedi_secondarie_ri_2",
        "label": "Le sedi secondarie all'estero sono iscritte nel competente Registro Imprese",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "sedi_operative",
        "label": "La Società ha istituito sedi operative/unità locali?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì in Italia",
          "Sì all'estero",
          "Si in Italia e all'estero - No"
        ],
        "help": "Sono tutti i luoghi fisici in cui la Società svolge stabilmente la propria attività, diversi dalla sede legale: uffici, stabilimenti produttivi, magazzini, depositi, punti vendita, cantieri fissi, laboratori o centri logistici.\nA differenza delle sedi secondarie, le unità locali non richiedono la presenza di un soggetto munito di poteri di rappresentanza verso i terzi. È sufficiente che vi si svolga in modo continuativo un'attività dell'impresa."
      },
      {
        "id": "sedi_operative_dettaglio",
        "label": "Se si, indicare: numero di sedi operative (unità locali) e, per ciascuna di esse: indirizzo + attività svolta + numero complessivo di dipendenti assegnati",
        "type": "textarea",
        "required": true
      },
      {
        "id": "sedi_operative_ri",
        "label": "Le sedi operative in Italia sono iscritte nel Registro Imprese",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "sedi_operative_ri_2",
        "label": "Le sedi operative all'estero sono iscritte nel Registro Imprese",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ateco_attivita_prevalente",
        "label": "Codice ATECO attività prevalente + descrizione attività + sede/i in cui viene/vengono svolta/e",
        "type": "textarea",
        "required": true
      },
      {
        "id": "ateco_attivita_secondarie",
        "label": "Codice/i ATECO attività secondaria/e + descrizione attività secondaria/e + sede/i in cui viene/vengono svolta/e",
        "type": "textarea",
        "required": true
      },
      {
        "id": "capitale_sociale",
        "label": "Capitale sociale (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "compagine",
        "label": "Compagine societaria: soci (nome o ragione sociale/denominazione) + % partecipazione",
        "type": "textarea",
        "required": true
      },
      {
        "id": "diritti_particolari",
        "label": "Esistono diritti particolari dei soci?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Sono diritti speciali che lo statuto può attribuire a singoli soci, diversi e ulteriori rispetto a quelli standard spettanti a tutti i soci in proporzione alla quota posseduta. Possono riguardare sia la sfera patrimoniale sia quella amministrativa."
      },
      {
        "id": "diritti_particolari_det",
        "label": "Se si, quali?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "patti_parasociali",
        "label": "Esistono patti parasociali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì stipulati per iscritto",
          "Sì stipulati verbalmente",
          "No",
          "Non so"
        ],
        "help": "Sono accordi stipulati tra i soci (o tra alcuni di essi) al di fuori dello statuto, con i quali i partecipanti regolano convenzionalmente l'esercizio dei propri diritti sociali o aspetti della governance societaria. Sono disciplinati dall'art. 2341-bis c.c. e possono essere sia scritti sia — più raramente — verbali.\nIl Codice Civile individua tre categorie principali:\nSindacati di voto: i soci si impegnano a esercitare il diritto di voto in assemblea in modo concordato o secondo le indicazioni di un soggetto designato (es. votare compatti per la nomina di un determinato amministratore).\nSindacati di blocco: i soci limitano il trasferimento delle proprie azioni o quote, subordinandolo al gradimento degli altri aderenti, a diritti di prelazione reciproca o a divieti temporanei di cessione.\nPatti di controllo: i soci coordinano le proprie condotte per esercitare un'influenza dominante sulla società o per impedire che altri la acquisiscano."
      },
      {
        "id": "patti_dettaglio",
        "label": "Se sì e stipulati per iscritto: oggetto + durata dei patti parasociali",
        "type": "textarea",
        "required": false
      },
      {
        "id": "fatturato",
        "label": "Fatturato ultimo esercizio (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "fatturato_trend",
        "label": "Trend fatturato ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "In crescita",
          "Stabile",
          "In calo",
          "Non disponibile"
        ]
      },
      {
        "id": "fatturato_trend_2",
        "label": "Trend fatturato ultimo triennio: importo",
        "type": "select",
        "required": true,
        "options": [
          "In crescita",
          "Stabile",
          "In calo",
          "Non disponibile"
        ]
      },
      {
        "id": "attivo_patrimoniale",
        "label": "Totale attivo stato patrimoniale (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "patrimonio_netto",
        "label": "Patrimonio netto (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "indebitamento",
        "label": "Posizione finanziaria netta (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "num_dipendenti",
        "label": "Numero totale dipendenti",
        "type": "text",
        "required": true
      },
      {
        "id": "mercati_geo",
        "label": "Mercati di riferimento: Italia % + UE % + Extra UE %",
        "type": "textarea",
        "required": true
      },
      {
        "id": "mercati_top5",
        "label": "Mercati di riferimento: top 5 Paesi vendite % + top 5 Paesi acquisti %",
        "type": "textarea",
        "required": true
      },
      {
        "id": "clienti_principali",
        "label": "Concentrazione clientela: % fatturato top 5 clienti",
        "type": "textarea",
        "required": false
      },
      {
        "id": "fornitori_principali",
        "label": "Concentrazione fornitori: % acquisti top 5 fornitori",
        "type": "textarea",
        "required": false
      },
      {
        "id": "paesi_blacklist",
        "label": "La Società intrattiene rapporto con Paesi inseriti nella black-list?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Sono i rapporti commerciali, finanziari o operativi che la Società intrattiene con soggetti residenti o stabiliti in Paesi considerati a fiscalità privilegiata o ad alto rischio, inseriti in apposite liste (c.d. black-list) redatte da autorità nazionali e internazionali.\nEsistono diverse tipologie di liste, ciascuna con finalità e conseguenze specifiche:\n\nBlack-list fiscale: Paesi o territori con regime fiscale privilegiato, caratterizzati da un livello di tassazione sensibilmente inferiore a quello italiano o da carenza nello scambio di informazioni. Le operazioni con soggetti ivi residenti sono soggette a obblighi di documentazione rafforzata e a limitazioni nella deducibilità dei costi (art. 110, commi 9-bis e ss., D.P.R. 917/1986 — TUIR; D.M. 4 maggio 1999 e successivi aggiornamenti).\nBlack-list antiriciclaggio: Paesi ad alto rischio individuati dalla Commissione Europea e dal GAFI/FATF, nei confronti dei quali si applicano obblighi di adeguata verifica rafforzata della clientela (artt. 24 e 25, D.Lgs. 231/2007).\nListe di embargo e sanzioni internazionali: Paesi soggetti a misure restrittive adottate dall'UE, dall'ONU o dall'OFAC statunitense, che vietano o limitano determinate transazioni commerciali e finanziarie (Regolamenti UE in materia di misure restrittive)"
      },
      {
        "id": "paesi_blacklist_det",
        "label": "Se sì, quali?",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "a_2",
    "macro": "a",
    "title": "A.2 Struttura Societaria",
    "description": "",
    "fields": [
      {
        "id": "gruppo_app",
        "label": "La Società appartiene a un Gruppo societario?",
        "type": "select",
        "required": true,
        "options": [
          "No — società singola",
          "Sì — capogruppo",
          "Sì — controllata",
          "Sì — collegata",
          "Sì — partecipata"
        ]
      },
      {
        "id": "gruppo_mappa",
        "label": "In caso affermativo, esiste una mappa formalizzata e condivisa del Gruppo?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "gruppo_organigramma",
        "label": "In caso affermativo, esiste una Organigramma formalizzato di Gruppo?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "societa_controllate",
        "label": "Se la Società è capogruoppo: società controllate + ragione/denominazione sociale + sede + partita iva + % partecipazione capogruppo + attività",
        "type": "textarea",
        "required": true
      },
      {
        "id": "societa_controllante",
        "label": "Se la Società è controllata: società controllante + denominazione + sede + partita iva + % partecipazione controllante + attività",
        "type": "textarea",
        "required": true
      },
      {
        "id": "societa_collegate",
        "label": "Quali sono le società collegate e/o partecipate: denominazione/ragione sociale + sede + partita iva + % partecipazione + attività",
        "type": "textarea",
        "required": true
      },
      {
        "id": "rapporti_infragruppo",
        "label": "Rapporti infragruppo rilevanti",
        "type": "multiselect",
        "required": true,
        "options": [
          "Servizi",
          "Lavori",
          "Finanziamenti",
          "Garanzie"
        ]
      },
      {
        "id": "rapporti_infragruppo_ruolo",
        "label": "La Società è soggetto attivo o passivo dei rapporti infragruppo",
        "type": "select",
        "required": true,
        "options": [
          "Soggetto attivo",
          "Soggetto passivo"
        ]
      },
      {
        "id": "rapporti_infragruppo_desc",
        "label": "Descrizione sintetica dei rapporti rilevanti",
        "type": "textarea",
        "required": true
      },
      {
        "id": "contratti_infragruppo_formalizzati",
        "label": "I contratti infragruppo sono formalizzati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti",
          "Sì — parzialmente",
          "No"
        ]
      },
      {
        "id": "contratti_infragruppo_form",
        "label": "Quali sono i rapporti/contratti formalizzati?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "contratti_infragruppo_non_form",
        "label": "Quali sono i rapporti/contratti non formalizzati?",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "b_1",
    "macro": "b",
    "title": "B.1 Organi Sociali",
    "description": "",
    "fields": [
      {
        "id": "sistema_amm_modello",
        "label": "Modello sistema di amministrazione",
        "type": "select",
        "required": true,
        "options": [
          "Sistema tradizionale",
          "Sistema monistico",
          "Sistema dualistico"
        ],
        "help": "È il sistema attraverso cui la Società organizza la propria gestione e il controllo interno. Il diritto societario italiano prevede tre modelli:\n\nTradizionale (default): l'amministrazione è affidata a un Amministratore Unico o a un Consiglio di Amministrazione (CdA), il controllo a un Collegio Sindacale o Sindaco Unico, e la revisione legale a un revisore esterno o alla stessa società di revisione (artt. 2380-bis e ss. c.c.).\nDualistico: l'assemblea nomina un Consiglio di Sorveglianza, che a sua volta nomina un Consiglio di Gestione. Il Consiglio di Sorveglianza svolge anche funzioni di controllo, assorbendo il ruolo del Collegio Sindacale (artt. 2409-octies e ss. c.c.).\nMonistico: il CdA è nominato dall'assemblea e al suo interno è costituito un Comitato per il Controllo sulla Gestione, composto da amministratori indipendenti. Non è previsto un organo di controllo esterno separato (artt. 2409-sexiesdecies e ss. c.c.)."
      },
      {
        "id": "sistema_amm_tipo",
        "label": "Sistema di amministrazione",
        "type": "multiselect",
        "required": true,
        "options": [
          "Amministratore Unico",
          "CdA con Presidente",
          "CdA collegiale senza deleghe",
          "AD",
          "Comitato Esecutivo",
          "Consiglio di Sorveglianza",
          "Consiglio di Gestione",
          "Direttore Generale"
        ]
      },
      {
        "id": "au_nome",
        "label": "Amministratore Unico (se nominato): nome",
        "type": "text",
        "required": true
      },
      {
        "id": "au_scadenza",
        "label": "Scadenza mandato Amministratore Unico",
        "type": "text",
        "required": true
      },
      {
        "id": "cda_composizione",
        "label": "Componenti CdA (se nominato): componenti + cariche + dipendenti/indipendenti + esecutivi/non esecutivi (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "cda_scadenza",
        "label": "Scadenza mandato CdA",
        "type": "text",
        "required": true
      },
      {
        "id": "presidente",
        "label": "Presidente CdA (se nominato): nome, poteri (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "ad",
        "label": "Amministratore/i Delegato/i (se nominato/i): nome + dipendente/indipendente + poteri  (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "frequenza_cda",
        "label": "N. riunioni CdA nell'ultimo anno",
        "type": "text",
        "required": true
      },
      {
        "id": "cda_verbalizzazione",
        "label": "Le riunioni CdA sono regolarmente verbalizzate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sempre",
          "Sì — nella maggior parte dei casi",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "dg",
        "label": "Direttore Generale (se nominato): nome + poteri (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "ce_composizione",
        "label": "Comitato Esecutivo: componenti + ruoli",
        "type": "textarea",
        "required": true
      },
      {
        "id": "ce_scadenza",
        "label": "Scadenza mandato Comitato Esecutivo",
        "type": "text",
        "required": true
      },
      {
        "id": "frequenza_ce",
        "label": "N. riunioni Comitato Esecutivo nell'ultimo anno",
        "type": "text",
        "required": true
      },
      {
        "id": "ce_verbalizzazione",
        "label": "Le riunioni del Comitato Esecutivo sono regolarmente verbalizzate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sempre",
          "Sì — nella maggior parte dei casi",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "cs_composizione",
        "label": "Consiglio di Sorvegliana: componenti + ruoli (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "cs_scadenza",
        "label": "Scadenza mandato Consiglio di Sorvegliana",
        "type": "text",
        "required": true
      },
      {
        "id": "frequenza_cs",
        "label": "N. riunioni Consiglio di Sorveglianza nell'ultimo anno",
        "type": "text",
        "required": true
      },
      {
        "id": "cs_verbalizzazione",
        "label": "Le riunioni del Consiglio di Sorveglianza sono regolarmente verbalizzate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sempre",
          "Sì — nella maggior parte dei casi",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "cg_composizione",
        "label": "Consiglio di Gestione: componenti + ruoli (focus operativo e riporto)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "cg_scadenza",
        "label": "Scadenza mandato Consiglio di Gestione",
        "type": "text",
        "required": true
      },
      {
        "id": "frequenza_cg",
        "label": "N. riunioni Consiglio di Gestione nell'ultimo anno",
        "type": "text",
        "required": true
      },
      {
        "id": "cg_verbalizzazione",
        "label": "Le riunioni del Consiglio di Gestione sono regolarmente verbalizzate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sempre",
          "Sì — nella maggior parte dei casi",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "organo_controllo_int",
        "label": "Quali sono gli Organi di Controllo Interno della Società?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Collegio Sindacale",
          "Sindaco Unico",
          "Altro"
        ]
      },
      {
        "id": "collegio_sind_composizione",
        "label": "Collegio Sindacale: componenti + incarico",
        "type": "textarea",
        "required": true
      },
      {
        "id": "collegio_sind_scadenza",
        "label": "Scadenza mandato Collegio Sindacale",
        "type": "text",
        "required": true
      },
      {
        "id": "sindaco_unico_nome",
        "label": "Sindaco Unico: nome",
        "type": "text",
        "required": true
      },
      {
        "id": "sindaco_unico_scadenza",
        "label": "Scadenza mandato Sindaco Unico",
        "type": "text",
        "required": true
      },
      {
        "id": "altri_controllo_int",
        "label": "Quali sono gli altri Organi di Controllo Interno",
        "type": "textarea",
        "required": true
      },
      {
        "id": "altri_controllo_int_2",
        "label": "Scadenza altri Organi di Controllo Interno",
        "type": "text",
        "required": true
      },
      {
        "id": "organo_controllo_est",
        "label": "Quali sono gli Organi di Controllo Esterno della Società?",
        "type": "select",
        "required": true,
        "options": [
          "Revisore",
          "Società di Revisione",
          "Altro"
        ]
      },
      {
        "id": "soc_revisione_nome",
        "label": "Società di Revisione: denominazione/ragione sociale",
        "type": "textarea",
        "required": true
      },
      {
        "id": "soc_revisione_scadenza",
        "label": "Scadenza incarico Società di Revisione",
        "type": "text",
        "required": true
      },
      {
        "id": "revisore_nome",
        "label": "Revisore: nome",
        "type": "text",
        "required": true
      },
      {
        "id": "revisore_scadenza",
        "label": "Scadenza mandato Revisore",
        "type": "text",
        "required": true
      },
      {
        "id": "altri_controllo_est",
        "label": "Quali sono gli altri Organi di Controllo Esterno",
        "type": "textarea",
        "required": true
      },
      {
        "id": "altri_controllo_est_2",
        "label": "Scadenza altri Organi di Controllo Esterno",
        "type": "text",
        "required": true
      },
      {
        "id": "assemblea_freq",
        "label": "N. Assemblee Soci nell'ultimo triennio",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "b_2",
    "macro": "b",
    "title": "B.2 Procure, Deleghe e Poteri",
    "description": "",
    "fields": [
      {
        "id": "procure_notarili_n",
        "label": "Numero procure notarili in essere",
        "type": "text",
        "required": true
      },
      {
        "id": "procure_notarili_elenco",
        "label": "Elenco procure notarili: procuratore + poteri + limiti + data conferimento + durata",
        "type": "textarea",
        "required": true
      },
      {
        "id": "procure_non_notarili",
        "label": "Procure NON notarili in essere",
        "type": "textarea",
        "required": true
      },
      {
        "id": "deleghe_funzione",
        "label": "Deleghe di funzione formali",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sicurezza",
          "Ambiente",
          "Privacy",
          "Qualità",
          "Sostenibilità",
          "Altro"
        ]
      },
      {
        "id": "deleghe_operative",
        "label": "Deleghe operative interne: area + funzione + soggetto + oggetto + autorizzazioni spesa + limiti + riporto",
        "type": "textarea",
        "required": true
      },
      {
        "id": "limiti_spesa",
        "label": "Esiste una matrice limiti di spesa per livello/funzione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "firma_congiunta",
        "label": "Sono previsti meccanismi di firma congiunta?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sopra soglia",
          "Sì — solo alcune tipologie",
          "No"
        ]
      },
      {
        "id": "firma_congiunta_det",
        "label": "Dettaglio atti con firma congiunta: soglie + funzione/soggetti",
        "type": "textarea",
        "required": true
      },
      {
        "id": "firma_digitale",
        "label": "Utilizzo firma digitale / elettronica qualificata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — diffuso",
          "Sì — limitato",
          "No"
        ]
      },
      {
        "id": "firme_bancarie",
        "label": "Firme bancarie autorizzate: funzioni/soggetti + limiti + singola/congiunta",
        "type": "textarea",
        "required": true
      },
      {
        "id": "registro_procure",
        "label": "E' stato istituito un Registro Centralizzato delle Procure?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ]
      },
      {
        "id": "ultima_revisione_procure",
        "label": "Data ultima revisione sistematica delle procure",
        "type": "text",
        "required": true
      },
      {
        "id": "coerenza_statuto_procure",
        "label": "Le procure sono coerenti con statuto e delibere CdA?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — verificato",
          "Probabilmente sì",
          "Non verificato",
          "No"
        ]
      }
    ]
  },
  {
    "id": "b_3",
    "macro": "b",
    "title": "B.3 Conflitto di Interessi",
    "description": "",
    "fields": [
      {
        "id": "policy_cdi",
        "label": "E' stata adottata una Policy sul Conflitto di Interessi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata e diffusa",
          "Sì — solo formale",
          "In redazione",
          "No"
        ],
        "help": "È un documento interno con cui la Società disciplina le situazioni in cui un amministratore, un dirigente, un dipendente o un collaboratore si trova — o potrebbe trovarsi — in una condizione di contrasto tra il proprio interesse personale (diretto o indiretto) e l'interesse della Società.\nIl conflitto può essere patrimoniale (es. partecipazione in un fornitore), relazionale (es. vincoli familiari con una controparte contrattuale) o funzionale (es. cumulo di incarichi in società concorrenti)."
      },
      {
        "id": "registro_cdi",
        "label": "E' stato istituito un Registro dei Conflitti di Interesse?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "In redazione",
          "No"
        ],
        "help": "È un documento — cartaceo o digitale — in cui vengono annotate e conservate tutte le dichiarazioni rese da amministratori, dirigenti, dipendenti e collaboratori in merito a situazioni di conflitto di interessi, effettive o potenziali, rispetto all'attività della Società."
      },
      {
        "id": "obbligo_dichiarazione",
        "label": "Obbligo dichiarazione preventiva interessi per amministratori?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzato",
          "Sì — prassi informale",
          "No"
        ]
      },
      {
        "id": "operazioni_parti_correlate",
        "label": "Procedura operazioni con parti correlate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata",
          "Solo prassi informale",
          "No"
        ],
        "help": "È un documento interno che disciplina le modalità con cui la Società identifica, valuta, autorizza e monitora le operazioni compiute con soggetti legati alla Società stessa da un rapporto qualificato — le c.d. parti correlate.\nChi sono le parti correlate?\nSono soggetti che, per la posizione rivestita o per i legami esistenti, possono influenzare o essere influenzati dalla Società nelle decisioni economiche. Rientrano tipicamente: i soci di controllo o con influenza notevole; gli amministratori, i sindaci e i dirigenti con responsabilità strategiche (e i loro stretti familiari); le società controllate, collegate o sottoposte a comune controllo; le entità in cui i soggetti sopra indicati detengono partecipazioni rilevanti o incarichi direttivi.\nCosa disciplina la Procedura?\nI criteri per identificare le parti correlate e le operazioni rilevanti; i flussi informativi verso l'organo deliberante; la valutazione della congruità delle condizioni economiche dell'operazione (equivalenza a condizioni di mercato o arm's length); il ruolo degli amministratori indipendenti o dell'organo di controllo nel processo autorizzativo; i casi di esenzione (operazioni di importo esiguo, operazioni ordinarie a condizioni standard); gli obblighi di trasparenza e informativa in bilancio."
      },
      {
        "id": "parti_correlate_elenco",
        "label": "Operazioni significative con parti correlate (ultimo triennio)",
        "type": "textarea",
        "required": false
      },
      {
        "id": "incarichi_esterni",
        "label": "Amministratori con incarichi in altre società?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — dichiarati",
          "Sì — non tutti dichiarati",
          "No",
          "Non so"
        ]
      },
      {
        "id": "divieto_concorrenza",
        "label": "Clausole di non concorrenza per amministratori/dirigenti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — per tutti",
          "Sì — per alcuni",
          "No"
        ]
      },
      {
        "id": "episodi_cdi",
        "label": "Episodi di conflitto di interessi rilevati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "episodi_cdi_det",
        "label": "Se sì, descrivere sinteticamente",
        "type": "textarea",
        "required": false
      }
    ]
  },
  {
    "id": "c_1",
    "macro": "c",
    "title": "C.1 Struttura Organizzativa",
    "description": "",
    "fields": [
      {
        "id": "organigramma",
        "label": "Organigramma formalizzato e aggiornato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "Solo informale",
          "No"
        ]
      },
      {
        "id": "tipo_struttura",
        "label": "Tipologia di struttura organizzativa adottata",
        "type": "multiselect",
        "required": true,
        "options": [
          "Funzionale",
          "Divisionale",
          "A matrice",
          "Per processi",
          "Semplice",
          "Mista"
        ]
      },
      {
        "id": "revisione_struttura",
        "label": "Data ultima revisione della struttura organizzativa",
        "type": "text",
        "required": true
      },
      {
        "id": "funzionigramma",
        "label": "Funzionigramma (job description per ruolo)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completo",
          "Sì — parziale",
          "No"
        ],
        "help": "È il documento che descrive in modo analitico, per ciascuna posizione o ruolo previsto nell'organigramma, le funzioni, le responsabilità, i compiti operativi, i poteri decisionali e le relazioni gerarchiche e funzionali (riporto a chi, coordinamento con quali funzioni)."
      },
      {
        "id": "aree_funzionali",
        "label": "Principali aree/direzioni funzionali",
        "type": "textarea",
        "required": true
      },
      {
        "id": "dirigenti",
        "label": "Numero e ruoli dei dirigenti",
        "type": "textarea",
        "required": true
      },
      {
        "id": "funzioni_coperte",
        "label": "Funzioni chiave coperte da responsabile dedicato",
        "type": "multiselect",
        "required": true,
        "options": [
          "AFC",
          "Finanza",
          "Legale",
          "HR",
          "Commerciale",
          "Produzione/",
          "Operations",
          "Acquisti",
          "IT",
          "Qualità",
          "Logistica",
          "Sostenibilità/ESG",
          "Ambiente e Sicurezza (HSE)"
        ]
      },
      {
        "id": "funzioni_vacanti",
        "label": "Funzioni chiave vacanti o coperte ad interim",
        "type": "textarea",
        "required": true
      },
      {
        "id": "resp_sostenibilita",
        "label": "È stato nominato un Responsabile Sostenibilità / ESG Manager?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — dedicato",
          "Sì — funzione condivisa con altro ruolo",
          "No",
          "In fase di nomina"
        ]
      },
      {
        "id": "comitato_sostenibilita",
        "label": "Esiste un Comitato Sostenibilità o una funzione ESG formalizzata nell'Organigramma?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — comitato dedicato",
          "Sì — integrato in altro comitato",
          "No"
        ]
      },
      {
        "id": "integrazione_esg_processi",
        "label": "Gli obiettivi ESG sono integrati nei processi operativi e nei KPI delle funzioni aziendali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in tutte le funzioni",
          "Sì — in alcune funzion i",
          "No",
          "In fase di implementazione"
        ],
        "help": "Verificare se la Società ha tradotto i propri impegni in materia ambientale, sociale e di governance (ESG — Environmental, Social, Governance) in obiettivi concreti e misurabili, incorporandoli nei processi di lavoro quotidiani e nei sistemi di valutazione delle performance delle singole funzioni aziendali."
      },
      {
        "id": "sod_matrix",
        "label": "Matrice di segregazione dei compiti (SoD)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata e monitorata",
          "Sì — formalizzata non monitorata",
          "Solo informale",
          "No"
        ],
        "help": "La Matrice di Segregazione dei Compiti (SoD — Segregation of Duties) è uno strumento organizzativo — tipicamente in formato tabellare — che mappa i processi aziendali critici e verifica che le attività incompatibili tra loro non siano concentrate in capo alla stessa persona, assicurando una separazione effettiva tra chi autorizza, chi esegue, chi registra e chi controlla."
      },
      {
        "id": "procedure_operative",
        "label": "Procedure operative interne formalizzate (elencare)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "procedure_aggiornamento",
        "label": "Le procedure sono periodicamente aggiornate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — revisione annuale",
          "Sì — ad hoc",
          "Raramente",
          "Mai"
        ]
      },
      {
        "id": "mappatura_processi",
        "label": "Mappatura processi aziendali (BPM) effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completa",
          "Sì — parziale",
          "No"
        ],
        "help": "La mappatura dei processi aziendali (BPM — Business Process Management) è l'attività con cui la Società identifica, documenta e rappresenta in modo strutturato tutti i processi operativi che compongono la propria catena del valore, descrivendo per ciascuno le attività svolte, la sequenza logica, i soggetti coinvolti, gli input e gli output, i sistemi informativi utilizzati e i punti di controllo."
      },
      {
        "id": "tracciabilita",
        "label": "Processi decisionali tracciabili?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — workflow digitali",
          "Sì — verbali e minute",
          "Parzialmente",
          "No"
        ]
      },
      {
        "id": "flussi_interfunzionali",
        "label": "Flussi informativi inter-funzionali formalizzati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "Parzialmente",
          "No"
        ],
        "help": "Sono i canali e le modalità strutturate con cui le diverse funzioni aziendali si scambiano informazioni rilevanti per il corretto svolgimento delle rispettive attività e per il coordinamento operativo dell'organizzazione."
      },
      {
        "id": "comitati_operativi",
        "label": "Comitati/riunioni operative periodiche formalizzate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con verbale",
          "Sì — senza verbale",
          "No"
        ]
      },
      {
        "id": "erp",
        "label": "Sistema ERP / gestionale in uso",
        "type": "text",
        "required": true
      },
      {
        "id": "strumenti_digitali",
        "label": "Altri strumenti digitali (CRM, HR, workflow, DMS)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "internal_audit",
        "label": "Funzione di Internal Audit?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — interna dedicata",
          "Sì — esternalizzata",
          "Sì — parziale",
          "No"
        ],
        "help": "È una funzione aziendale indipendente che svolge attività di verifica e valutazione sistematica sull'adeguatezza, l'efficacia e l'effettivo funzionamento del sistema di controllo interno, dei processi organizzativi, delle procedure e della gestione dei rischi."
      },
      {
        "id": "compliance_function",
        "label": "Funzione Compliance dedicata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — interna",
          "Sì — esterna",
          "No — integrata in Legal",
          "No"
        ],
        "help": "È una funzione aziendale — distinta dalle funzioni operative e dalla funzione di Internal Audit — specificamente incaricata di presidiare la conformità dell'organizzazione alle normative esterne (leggi, regolamenti, disposizioni delle autorità di vigilanza) e alle regole interne (statuto, codice etico, procedure, policy) applicabili all'attività della Società."
      }
    ]
  },
  {
    "id": "c_2",
    "macro": "c",
    "title": "C.2 Lavoratori Dipendenti",
    "description": "",
    "fields": [
      {
        "id": "dip_totale",
        "label": "Numero totale dipendenti full-time",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_dirigenti",
        "label": "di cui dirigenti",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_quadri",
        "label": "di cui quadri",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_impiegati",
        "label": "di cui impiegati",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_operai",
        "label": "di cui operai",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_determinato",
        "label": "Numero totale dipendenti part-time",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_interinali",
        "label": "Lavoratori somministrati: numero + qualifiche",
        "type": "text",
        "required": true
      },
      {
        "id": "ccnl",
        "label": "CCNL applicato/i",
        "type": "text",
        "required": true
      },
      {
        "id": "contratti_integrativi",
        "label": "Contratti integrativi aziendali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In negoziazione"
        ]
      },
      {
        "id": "relazioni_sindacali",
        "label": "Stato relazioni sindacali",
        "type": "select",
        "required": true,
        "options": [
          "Buone / collaborative",
          "Nella norma",
          "Tese / conflittuali",
          "Nessuna rappresentanza"
        ]
      },
      {
        "id": "rsa_rsu",
        "label": "RSA/RSU presenti?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — RSU",
          "Sì — RSA",
          "No"
        ]
      },
      {
        "id": "contenziosi_lavoro",
        "label": "Contenziosi giuslavoristici in corso",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "turnover",
        "label": "Tasso di turnover annuo (%)",
        "type": "text",
        "required": true
      },
      {
        "id": "piani_welfare",
        "label": "Piani welfare aziendale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — strutturato",
          "Sì — base",
          "No"
        ],
        "help": "Sono l'insieme strutturato di beni, servizi, prestazioni e benefit che la Società mette a disposizione dei propri dipendenti — in aggiunta alla retribuzione ordinaria — con finalità di benessere personale e familiare, conciliazione vita-lavoro e fidelizzazione del personale."
      },
      {
        "id": "regolamento_interno_lavoro",
        "label": "E' stato adottato un Regolamento Interno per la corretta gestione del rapporto di lavoro",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "smart_working",
        "label": "Policy smart working?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata",
          "Sì — informale",
          "No"
        ]
      },
      {
        "id": "codice_disciplinare",
        "label": "Codice Disciplinare affisso e aggiornato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "formazione_obbligatoria",
        "label": "Formazione obbligatoria regolarmente erogata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutta aggiornata",
          "Sì — parzialmente",
          "No — lacune significative",
          "No"
        ]
      }
    ]
  },
  {
    "id": "c_3",
    "macro": "c",
    "title": "C.3 Collaboratori Esterni",
    "description": "",
    "fields": [
      {
        "id": "collab_cococo",
        "label": "Collaboratori coordinati e continuativi (numero)",
        "type": "text",
        "required": true
      },
      {
        "id": "collab_autonomi",
        "label": "Collaboratori a P.IVA / professionisti ricorrenti (numero)",
        "type": "text",
        "required": true
      },
      {
        "id": "agenti",
        "label": "Agenti / rappresentanti (numero)",
        "type": "text",
        "required": true
      },
      {
        "id": "outsourcing",
        "label": "Attività esternalizzate",
        "type": "multiselect",
        "required": true,
        "options": [
          "IT",
          "Contabilità",
          "Logistica",
          "HR",
          "Legale",
          "Sostenibilità",
          "Altro"
        ]
      },
      {
        "id": "outsourcing_contratti",
        "label": "Rapporti in outsourcing formalizzati con contratto?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti",
          "Sì — maggior parte",
          "Solo alcuni",
          "No"
        ]
      },
      {
        "id": "clausole_231",
        "label": "Contratti con terzi contengono clausole 231 / compliance?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematiche",
          "Sì — per i principali",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "clausole_privacy",
        "label": "Contratti con clausole privacy (art. 28 GDPR)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematiche",
          "Sì — per i principali",
          "Raramente",
          "No"
        ]
      },
      {
        "id": "verifica_fornitori",
        "label": "Processo qualifica / due diligence fornitori?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — strutturato",
          "Sì — informale",
          "No"
        ],
        "help": "È la procedura strutturata con cui la Società valuta, seleziona e monitora nel tempo i propri fornitori e partner commerciali prima e durante il rapporto contrattuale, verificando che possiedano requisiti adeguati sotto il profilo della solidità economica, dell'affidabilità operativa, della conformità normativa e dell'integrità etica."
      },
      {
        "id": "albo_fornitori",
        "label": "Albo fornitori qualificati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ]
      },
      {
        "id": "rischio_somministrazione",
        "label": "Rischio somministrazione illecita / appalto non genuino?",
        "type": "select",
        "required": true,
        "options": [
          "Basso",
          "Medio",
          "Alto",
          "Non valutato"
        ],
        "help": "È il rischio che un contratto formalmente qualificato come appalto di servizi o di opera mascheri, nella sostanza, una mera fornitura di manodopera al di fuori dei canali legali, in violazione della disciplina sulla somministrazione di lavoro."
      }
    ]
  },
  {
    "id": "d_1",
    "macro": "d",
    "title": "D.1 Modello 231/01",
    "description": "",
    "fields": [
      {
        "id": "m231_adottato",
        "label": "Modello 231 formalmente adottato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In fase di adozione"
        ]
      },
      {
        "id": "m231_software",
        "label": "In caso di adozione, la Società si avvale di software per la gestione del modello?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "m231_software_nome",
        "label": "Se sì, quale software viene utilizzato?",
        "type": "text",
        "required": true
      },
      {
        "id": "m231_data_adozione",
        "label": "Data di prima adozione del MOG 231",
        "type": "text",
        "required": true
      },
      {
        "id": "m231_ultimo_agg",
        "label": "Data ultimo aggiornamento del MOG 231",
        "type": "text",
        "required": true
      },
      {
        "id": "m231_risk_assessment",
        "label": "Risk assessment 231 effettuato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — ultimo anno",
          "Sì — 1-2 anni fa",
          "Sì — oltre 3 anni fa",
          "No — mai"
        ]
      },
      {
        "id": "m231_protocolli",
        "label": "Protocolli di prevenzione aggiornati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti",
          "Sì — parzialmente",
          "Solo formali",
          "No"
        ]
      },
      {
        "id": "odv_nominato",
        "label": "OdV nominato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In fase di nomina"
        ]
      },
      {
        "id": "odv_composizione",
        "label": "Composizione OdV",
        "type": "multiselect",
        "required": true,
        "options": [
          "Monocratico esterno",
          "Monocratico interno",
          "Collegiale con componenti interni",
          "Collegiale con componenti esterni",
          "Collegiale misto"
        ]
      },
      {
        "id": "odv_composizione_det",
        "label": "Indicazione soggetto/i e ruoli che compongono OdV",
        "type": "textarea",
        "required": true
      },
      {
        "id": "odv_budget",
        "label": "L'OdV dispone di budget autonomo?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "odv_budget_ammontare",
        "label": "Se sì, per quale ammontare?",
        "type": "text",
        "required": true
      },
      {
        "id": "flussi_odv",
        "label": "Flussi informativi verso l'OdV definiti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — periodici e ad evento",
          "Solo periodici",
          "Solo ad evento",
          "Non formalizzati",
          "Non esistenti"
        ]
      },
      {
        "id": "flussi_odv_det",
        "label": "Dettaglio flussi (chi invia, cosa, frequenza)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "sistema_disc_231",
        "label": "Sistema disciplinare 231 formalizzato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — applicato",
          "Sì — mai applicato",
          "Solo formale",
          "No"
        ]
      },
      {
        "id": "formazione_231",
        "label": "Formazione 231 erogata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — periodica",
          "Sì — una tantum",
          "No",
          "In programma"
        ]
      },
      {
        "id": "codice_etico",
        "label": "Codice Etico adottato e diffuso?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato e diffuso",
          "Sì — non aggiornato",
          "No"
        ]
      },
      {
        "id": "integrazione_procure_231",
        "label": "Procure/deleghe integrate nella mappatura rischi 231?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completamente",
          "Parzialmente",
          "No"
        ]
      },
      {
        "id": "procedimenti_231",
        "label": "Procedimenti ex D.Lgs. 231/01?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in corso",
          "Sì — conclusi",
          "No"
        ]
      }
    ]
  },
  {
    "id": "d_2",
    "macro": "d",
    "title": "D.2 Anticorruzione",
    "description": "",
    "fields": [
      {
        "id": "policy_anticorruzione",
        "label": "Policy anticorruzione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata e diffusa",
          "Sì — solo formale",
          "No",
          "Non so",
          "In redazione"
        ],
        "help": "È il documento interno con cui la Società definisce i principi, le regole di condotta e i presidi organizzativi adottati per prevenire ogni forma di corruzione — attiva e passiva, pubblica e privata — nell'ambito della propria attività e dei rapporti con terzi."
      },
      {
        "id": "anti_bribery_scope",
        "label": "Copre normative estere (FCPA, UK Bribery Act)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente",
          "Non so"
        ],
        "help": "Significa verificare se la Policy anticorruzione della Società tiene conto — oltre che della normativa italiana — anche delle principali legislazioni anticorruzione straniere a portata extraterritoriale, in particolare il Foreign Corrupt Practices Act statunitense (FCPA) e il Bribery Act 2010 del Regno Unito (UKBA)."
      },
      {
        "id": "gifts_policy",
        "label": "Policy omaggi, regali e ospitalità?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con soglie e registro",
          "Sì — generica",
          "No"
        ]
      },
      {
        "id": "sponsorizzazioni",
        "label": "Policy sponsorizzazioni e donazioni?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata",
          "Prassi informale",
          "No"
        ]
      },
      {
        "id": "agenti_intermediari",
        "label": "Due diligence su agenti e intermediari?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematica",
          "Sì — occasionale",
          "No"
        ],
        "help": "È il processo di verifica preventiva e continuativa che la Società conduce su agenti commerciali, intermediari, procacciatori d'affari, broker, consulenti commerciali e qualsiasi altro soggetto che operi per conto o nell'interesse della Società nei rapporti con terzi — in particolare con clienti, fornitori, pubbliche amministrazioni o controparti estere."
      },
      {
        "id": "rapporti_pa",
        "label": "Tipologia rapporti con la PA (appalti, autorizzazioni, contributi, concessioni, ispezioni)",
        "type": "multiselect",
        "required": true,
        "options": [
          "Appalti",
          "Autorizzazioni",
          "Ccontributi",
          "Concessioni",
          "Ispezioni",
          "Project Financing",
          "Altro"
        ]
      },
      {
        "id": "gare_appalti",
        "label": "La Società partecipa a gare d'appalto pubbliche?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — frequentemente",
          "Sì — occasionalmente",
          "No"
        ]
      },
      {
        "id": "contributi_pubblici",
        "label": "La Società riceve contributi / finanziamenti pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In passato"
        ]
      }
    ]
  },
  {
    "id": "d_3",
    "macro": "d",
    "title": "D.3 Whistleblowing",
    "description": "",
    "fields": [
      {
        "id": "wb_canale",
        "label": "Canale whistleblowing attivato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — piattaforma digitale",
          "Sì — email/PEC dedicata",
          "Sì — altro canale",
          "No",
          "Non obbligatorio"
        ],
        "help": "Il Whistleblowing è il sistema interno attraverso cui dipendenti, collaboratori e altri soggetti qualificati possono segnalare in modo riservato — e, se lo desiderano, in forma anonima — violazioni di legge, illeciti, irregolarità o condotte contrarie al codice etico e alle procedure aziendali di cui siano venuti a conoscenza nel contesto lavorativo.\nLa disciplina è stata profondamente riformata dal D.Lgs. 24/2023, che ha recepito la Direttiva UE 2019/1937 e ha sostituito la precedente normativa frammentata (art. 6, comma 2-bis, D.Lgs. 231/2001 e art. 54-bis D.Lgs. 165/2001). La nuova disciplina si applica a tutti i soggetti del settore privato che:\nhanno impiegato nell'ultimo anno una media di almeno 50 lavoratori subordinati con contratti a tempo determinato o indeterminato; oppure\nhanno adottato un Modello 231, indipendentemente dal numero di dipendenti; oppure\noperano in settori regolamentati (servizi finanziari, sicurezza dei trasporti, tutela dell'ambiente)."
      },
      {
        "id": "wb_tipologia",
        "label": "Tipologia canale whistleblowing",
        "type": "select",
        "required": true,
        "options": [
          "Tradizionale",
          "Digitale",
          "Mista"
        ]
      },
      {
        "id": "wb_piattaforma_nome",
        "label": "Se piattaforma digitale, quale?",
        "type": "text",
        "required": true
      },
      {
        "id": "wb_piattaforma_contratto",
        "label": "L'utilizzo della piattaforma è regolamentato da un contratto scritto",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "wb_piattaforma_resp_tratt",
        "label": "Il fornitore della piattaforma è stato nominato Responsabile Esterno del Trattamento dei dati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ]
      },
      {
        "id": "wb_piattaforma_sicurezza",
        "label": "La piattaforma garantisce anonimato e crittografia?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ]
      },
      {
        "id": "wb_piattaforma_dpia",
        "label": "Il fornitore della piattaforma ha fornito la valutazione di impatto relativa alla piattaforma (DPIA)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ]
      },
      {
        "id": "wb_gestore",
        "label": "Chi gestisce le segnalazioni?",
        "type": "select",
        "required": true,
        "options": [
          "OdV",
          "Responsabile compliance",
          "Comitato dedicato",
          "Soggetto esterno",
          "Non definito"
        ]
      },
      {
        "id": "wb_procedura",
        "label": "Esiste ina procedura scritta per gestione segnalazioni?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completa",
          "Sì — da aggiornare",
          "No"
        ]
      },
      {
        "id": "wb_informativa",
        "label": "Dipendenti e Collaboratori sono informati del canale e delle tutele?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formazione e comunicazione",
          "Sì — solo comunicazione scritta",
          "No"
        ]
      },
      {
        "id": "wb_segnalazioni",
        "label": "Segnalazioni ricevute nell'ultimo biennio (numero)",
        "type": "text",
        "required": true
      },
      {
        "id": "wb_privacy_dpia",
        "label": "DPIA effettuata dalla Società sul canale whistleblowing?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "La DPIA (Data Protection Impact Assessment — Valutazione d'impatto sulla protezione dei dati) è l'analisi documentata con cui la Società valuta preventivamente i rischi che il trattamento dei dati personali connesso al canale whistleblowing può comportare per i diritti e le libertà delle persone coinvolte — segnalanti, segnalati, testimoni e facilitatori."
      }
    ]
  },
  {
    "id": "d_4",
    "macro": "d",
    "title": "D.4 Privacy e GDPR",
    "description": "",
    "fields": [
      {
        "id": "privacy_gestione",
        "label": "La Società come gestisce la privacy?",
        "type": "select",
        "required": true,
        "options": [
          "Modalità tradizionale/cartacea",
          "Modalità digitale",
          "Modalità mista"
        ]
      },
      {
        "id": "privacy_software",
        "label": "In caso di modalità digtale o mista, quale software viene utilizzato?",
        "type": "text",
        "required": true
      },
      {
        "id": "dpo_nominato",
        "label": "DPO nominato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — interno",
          "Sì — esterno",
          "No — non obbligatorio",
          "No — obbligatorio ma non nominato"
        ],
        "help": "Il DPO — Data Protection Officer (Responsabile della Protezione dei Dati) è la figura professionale — interna o esterna all'organizzazione — incaricata di sorvegliare in modo indipendente la conformità della Società alla normativa in materia di protezione dei dati personali (GDPR e D.Lgs. 196/2003, come modificato dal D.Lgs. 101/2018).Quando la nomina è obbligatoria?\nL'art. 37 del Regolamento UE 2016/679 (GDPR) impone la designazione del DPO quando:\nil trattamento è effettuato da un'autorità pubblica o da un organismo pubblico (ad eccezione delle autorità giurisdizionali nell'esercizio delle funzioni giurisdizionali);\nle attività principali della Società consistono in trattamenti che, per natura, ambito o finalità, richiedono il monitoraggio regolare e sistematico degli interessati su larga scala (es. profilazione della clientela, videosorveglianza estesa, geolocalizzazione sistematica dei dipendenti, marketing comportamentale);\nle attività principali della Società consistono nel trattamento su larga scala di categorie particolari di dati (dati sanitari, biometrici, genetici, relativi a opinioni politiche, convinzioni religiose, appartenenza sindacale — art. 9 GDPR) o di dati relativi a condanne penali e reati (art. 10 GDPR)."
      },
      {
        "id": "privacy_figure_referenti",
        "label": "Sono state individuate figure interne o esterne per la gestione della privacy?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — internamente",
          "Sì — esternamente",
          "Sì — sia interne che esterne",
          "No"
        ]
      },
      {
        "id": "registro_trattamenti",
        "label": "La Società ha prediposto il Registro trattamenti ex art. 30 GDPR?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ],
        "help": "Il Registro dei Trattamenti è il documento — cartaceo o, più frequentemente, in formato elettronico — con cui la Società censisce e descrive in modo strutturato tutti i trattamenti di dati personali effettuati nell'ambito della propria attività, mantenendolo costantemente aggiornato e rendendolo disponibile su richiesta del Garante per la protezione dei dati personali."
      },
      {
        "id": "informative",
        "label": "Informative privacy predisposte (dipendenti, clienti, fornitori, sito)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutte",
          "Sì — parziali",
          "No"
        ],
        "help": "Sono i documenti con cui la Società comunica a ciascuna categoria di interessati — in modo chiaro, conciso e facilmente accessibile — quali dati personali raccoglie, per quali finalità, con quali modalità e per quanto tempo li tratta, nonché quali diritti spettano all'interessato stesso. L'informativa è l'espressione principale del principio di trasparenza, pilastro del GDPR."
      },
      {
        "id": "nomine_responsabili",
        "label": "Nomine responsabili trattamento ex art. 28 GDPR?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti i fornitori",
          "Sì — principali",
          "No"
        ],
        "help": "È l'atto formale — contratto o altro atto giuridico vincolante — con cui la Società, in qualità di Titolare del trattamento, designa i soggetti esterni (Responsabili esterni del trattamento) che trattano dati personali per suo conto, disciplinando obblighi, limiti e garanzie del trattamento affidato."
      },
      {
        "id": "dpia",
        "label": "DPIA (Valutazioni d'impatto) effettuate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — per tutti i trattamenti a rischio",
          "Sì — parziali",
          "Non necessarie",
          "No"
        ],
        "help": "La DPIA — Valutazioni d'impatto sulla protezione dei dati (art. 35 GDPR) è l'analisi documentata con cui la Società valuta preventivamente i rischi che uno specifico trattamento di dati personali può comportare per i diritti e le libertà delle persone coinvolte, individuando le misure idonee a mitigarli.Quando è obbligatoria?\nL'art. 35 GDPR impone la DPIA quando un trattamento, per natura, ambito, contesto o finalità, presenta un rischio elevato. In particolare:\nvalutazione sistematica e globale di aspetti personali basata su trattamento automatizzato, inclusa la profilazione, da cui derivano decisioni con effetti significativi sulle persone;\ntrattamento su larga scala di categorie particolari di dati (sanitari, biometrici, genetici — art. 9 GDPR) o di dati relativi a condanne penali (art. 10 GDPR);\nsorveglianza sistematica su larga scala di una zona accessibile al pubblico (es. videosorveglianza estesa)."
      },
      {
        "id": "misure_sicurezza",
        "label": "Misure sicurezza tecniche e organizzative (art. 32 GDPR)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — documentate",
          "Sì — non documentate",
          "Parziali",
          "Non valutate"
        ],
        "help": "Sono l'insieme dei presidi — tecnologici e procedurali — che la Società adotta per garantire un livello di sicurezza adeguato al rischio connesso al trattamento dei dati personali, proteggendoli da accessi non autorizzati, perdita, distruzione, alterazione o divulgazione accidentale o illecita."
      },
      {
        "id": "data_breach",
        "label": "Procedura gestione data breach formalizzata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "L'art. 4, n. 12, GDPR definisce la violazione dei dati personali (data breact) come qualsiasi evento — accidentale o illecito — che comporta la distruzione, la perdita, la modifica, la divulgazione non autorizzata o l'accesso non autorizzato ai dati personali trattati dalla Società. Non si limita agli attacchi informatici: è data breach anche lo smarrimento di un dispositivo aziendale non cifrato, l'invio di un'email contenente dati personali al destinatario sbagliato, il furto di documenti cartacei, l'accesso abusivo da parte di un dipendente non autorizzato, la cancellazione accidentale di un database senza backup, un attacco ransomware che rende i dati indisponibili.\nLa Procedura di gestione data breach (artt. 33-34 GDPR) è il documento interno che definisce le regole operative che la Società deve seguire in caso di violazione dei dati personali (data breach), disciplinando le fasi di rilevazione, valutazione, contenimento, notifica e documentazione dell'incidente."
      },
      {
        "id": "trasferimenti_extra_ue",
        "label": "Trasferimenti dati extra UE?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con garanzie adeguate",
          "Sì — senza garanzie verificate",
          "No"
        ]
      },
      {
        "id": "formazione_privacy",
        "label": "Formazione privacy erogata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — periodica",
          "Sì — una tantum",
          "No"
        ]
      },
      {
        "id": "sanzioni_garante",
        "label": "Sanzioni del Garante Privacy ricevute?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Procedimenti in corso"
        ]
      },
      {
        "id": "videosorveglianza",
        "label": "La Società utilizza sistemi/impianti di videosorveglianza?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — autorizzati ITL/accordo sindacale",
          "Sì — non autorizzati",
          "No"
        ]
      },
      {
        "id": "videosorveglianza_det",
        "label": "Se sì, in quali ambienti?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "tracciamento_gps",
        "label": "La Società utilizza sistemi di tracciamento GPS di veicoli e mezzi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — autorizzati ITL/accordo sindacale",
          "Sì — non autorizzati",
          "No"
        ]
      },
      {
        "id": "tracciamento_gps_det",
        "label": "Se sì, per auli mezzi e/o veicoli",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "d_5",
    "macro": "d",
    "title": "D.5 IT e Comunicazione",
    "description": "",
    "fields": [
      {
        "id": "it_infrastruttura_server",
        "label": "L'impresa dispone di server fisici o virtuali dedicati?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Server fisici on-premise",
          "Server virtuali on-premise",
          "Cloud (AWS/Azure/Google)",
          "Hosting esterno",
          "Nessun server dedicato"
        ]
      },
      {
        "id": "it_workstation",
        "label": "Numero di workstation/PC in dotazione",
        "type": "number",
        "required": true
      },
      {
        "id": "it_dispositivi_mobili",
        "label": "L'impresa fornisce dispositivi mobili aziendali (smartphone, tablet, laptop)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, a tutti",
          "Sì, solo ad alcuni ruoli",
          "No"
        ]
      },
      {
        "id": "it_dispositivi_mobili_n",
        "label": "Numero dispositivi mobili",
        "type": "number",
        "required": true
      },
      {
        "id": "it_byod",
        "label": "È consentito l'uso di dispositivi personali per scopi lavorativi (BYOD - Bring Your Own Device)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, con policy formalizzata",
          "Sì, senza policy",
          "No",
          "Non definito"
        ]
      },
      {
        "id": "it_erp",
        "label": "L'impresa utilizza un sistema ERP (Enterprise Resource Planning)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, integrato",
          "Sì, modulare",
          "No, software gestionali separati",
          "No",
          "In implementazione"
        ]
      },
      {
        "id": "it_crm",
        "label": "L'impresa utilizza un sistema CRM (Customer Relationship Management)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In implementazione"
        ]
      },
      {
        "id": "it_backup",
        "label": "È attivo un sistema di backup dei dati aziendali?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì, automatico e quotidiano",
          "Sì, periodico",
          "Sì, manuale",
          "No",
          "Non so"
        ]
      },
      {
        "id": "it_backup_modalita",
        "label": "Com evengono eseguiti i back-up?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Su server locale",
          "Su server in cloud",
          "Su hardisk esterno"
        ]
      },
      {
        "id": "it_disaster_recovery",
        "label": "Esiste un piano di Disaster Recovery e Business Continuity per i sistemi IT?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, formalizzato e testato",
          "Sì, formalizzato ma non testato",
          "In fase di sviluppo",
          "No"
        ],
        "help": "Sono due documenti distinti ma complementari con cui la Società pianifica le azioni necessarie per garantire la continuità operativa dell'organizzazione e il ripristino dei sistemi informativi in caso di eventi avversi — naturali, tecnologici o dolosi — che ne compromettano la disponibilità.\nIl Business Continuity Plan (BCP) — è il piano di più ampio respiro che definisce le strategie, le procedure e le risorse necessarie affinché i processi aziendali critici possano proseguire — anche in modalità degradata — durante e dopo un evento disruptivo. Non riguarda solo l'IT ma l'intera organizzazione: sedi alternative, catena di comando in emergenza, comunicazione interna ed esterna, gestione del personale, rapporti con fornitori e clienti, adempimenti normativi e contrattuali urgenti.\nIl Disaster Recovery Plan (DRP) — è la componente tecnologica del BCP, focalizzata specificamente sul ripristino dell'infrastruttura informatica, delle applicazioni, dei database e delle comunicazioni digitali dopo un incidente grave. Definisce le modalità tecniche di recupero dei sistemi, le priorità di ripristino e i livelli di servizio garantiti."
      },
      {
        "id": "it_antivirus",
        "label": "Sono installati e aggiornati sistemi antivirus/antimalware su tutti i dispositivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, su tutti i dispositivi",
          "Sì, solo su alcuni",
          "No",
          "Non so"
        ]
      },
      {
        "id": "it_firewall",
        "label": "La rete aziendale è protetta da firewall?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì, firewall hardware",
          "Sì, firewall software",
          "Sì, entrambi",
          "No",
          "Non so"
        ]
      },
      {
        "id": "it_responsabile",
        "label": "È presente un Responsabile IT/CTO formalmente incaricato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno/consulente",
          "No, gestione informale"
        ]
      },
      {
        "id": "it_amministratore_sistema",
        "label": "È stato nominato un Amministratore di Sistema?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno",
          "No",
          "Non necessario"
        ]
      },
      {
        "id": "it_helpdesk",
        "label": "È attivo un servizio di assistenza IT (helpdesk) per il personale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno",
          "Sì, misto",
          "No"
        ]
      },
      {
        "id": "it_formazione",
        "label": "Viene erogata formazione periodica al personale su sicurezza informatica e uso dei sistemi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, regolarmente",
          "Sì, occasionalmente",
          "Solo in onboarding",
          "No"
        ]
      },
      {
        "id": "nis2_ambito",
        "label": "La Società rientra nell'ambito di applicazione della Direttiva NIS 2 (Dir. UE 2022/2555, recepita con D.Lgs. 138/2024)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — soggetto essenziale",
          "Sì — soggetto importante",
          "No",
          "In fase di valutazione",
          "Non so"
        ],
        "help": "La Direttiva NIS 2 (Network and Information Security) è il quadro normativo europeo che stabilisce obblighi in materia di cybersicurezza per le imprese e gli enti che operano in settori considerati essenziali o importanti per il funzionamento dell'economia e della società. In Italia è stata recepita con il D.Lgs. 138/2024, in vigore dal 16 ottobre 2024.\nLa Direttiva si applica a due categorie di soggetti:\nSoggetti essenziali — imprese di grandi dimensioni (oltre 250 dipendenti o fatturato superiore a € 50 milioni o totale di bilancio superiore a € 43 milioni) operanti nei settori ad alta criticità: energia (elettricità, petrolio, gas, idrogeno, teleriscaldamento); trasporti (aereo, ferroviario, marittimo, stradale); settore bancario e infrastrutture dei mercati finanziari; settore sanitario (ospedali, laboratori, ricerca, produzione farmaceutica, dispositivi medici); acqua potabile e acque reflue; infrastrutture digitali (DNS, cloud computing, data center, CDN, servizi fiduciari, reti di comunicazione elettronica); gestione dei servizi ICT B2B; pubblica amministrazione; spazio.\nSoggetti importanti — imprese di medie dimensioni (oltre 50 dipendenti o fatturato superiore a € 10 milioni) operanti sia nei settori ad alta criticità sopra elencati sia in altri settori critici: servizi postali e di corriere; gestione dei rifiuti; fabbricazione, produzione e distribuzione di sostanze chimiche; produzione, trasformazione e distribuzione di alimenti; fabbricazione di dispositivi medici, computer, elettronica, apparecchiature elettriche, macchinari, autoveicoli e altri mezzi di trasporto; fornitori di servizi digitali (marketplace online, motori di ricerca, piattaforme di social networking); ricerca scientifica.\nIndipendentemente dalle dimensioni, rientrano sempre nell'ambito di applicazione: i fornitori di reti di comunicazione elettronica pubbliche o servizi di comunicazione elettronica accessibili al pubblico; i prestatori di servizi fiduciari; i registri di nomi di dominio di primo livello e i fornitori di servizi DNS; i soggetti identificati come critici ai sensi della Direttiva CER (UE 2022/2557)."
      },
      {
        "id": "nis2_settore",
        "label": "Se sì, in quale settore/sottosettore rientra la Società ai sensi degli Allegati I-IV del D.Lgs. 138/2024?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "nis2_registrazione_acn",
        "label": "La Società ha effettuato la registrazione sulla piattaforma dell'ACN (Agenzia per la Cybersicurezza Nazionale)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completata",
          "Sì — in corso",
          "No — non ancora avviata",
          "Non applicabile"
        ]
      },
      {
        "id": "nis2_punto_contatto",
        "label": "È stato designato un punto di contatto unico per la Società ai fini NIS 2?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzato",
          "Sì — informale",
          "No"
        ]
      },
      {
        "id": "nis2_risk_assessment_cyber",
        "label": "È stata effettuata una valutazione del rischio cyber conforme all'art. 24 D.Lgs. 138/2024 (misure di gestione dei rischi)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornata negli ultimi 12 mesi",
          "Sì — oltre 12 mesi fa",
          "No — mai effettuata",
          "In corso"
        ]
      },
      {
        "id": "nis2_misure_sicurezza",
        "label": "La Società ha adottato misure tecniche, operative e organizzative di gestione dei rischi di sicurezza informatica?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Analisi dei rischi e politiche di sicurezza dei sistemi informativi",
          "Gestione degli incidenti",
          "Continuità operativa e disaster recovery",
          "Sicurezza della catena di approvvigionamento",
          "Sicurezza acquisizione, sviluppo e manutenzione sistemi",
          "Valutazione efficacia delle misure",
          "Pratiche di igiene informatica e formazione",
          "Crittografia",
          "Sicurezza risorse umane e controllo accessi",
          "Autenticazione a più fattori (MFA)"
        ]
      },
      {
        "id": "nis2_incident_reporting",
        "label": "È stata predisposta una procedura di notifica degli incidenti significativi al CSIRT Italia (art. 25 D.Lgs. 138/2024)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata e testata",
          "Sì — formalizzata ma non testata",
          "No — in fase di predisposizione",
          "No"
        ]
      },
      {
        "id": "nis2_incidenti_occorsi",
        "label": "Incidenti di sicurezza informatica significativi nell'ultimo triennio?",
        "type": "select",
        "required": true,
        "options": [
          "Nessuno",
          "1-2 incidenti",
          "3-5 incidenti",
          "Oltre 5 incidenti"
        ]
      },
      {
        "id": "nis2_supply_chain",
        "label": "È stata valutata la sicurezza della catena di approvvigionamento ICT (fornitori e prestatori di servizi diretti)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con clausole contrattuali specifiche",
          "Sì — valutazione informale",
          "No",
          "In corso di valutazione"
        ]
      },
      {
        "id": "nis2_formazione_organo",
        "label": "L'Organo Amministrativo (CdA/AU) ha ricevuto formazione specifica in materia di cybersicurezza ai sensi dell'art. 23 D.Lgs. 138/2024?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — regolarmente",
          "Sì — una tantum",
          "No — mai",
          "In programma"
        ]
      },
      {
        "id": "nis2_responsabilita_organo",
        "label": "L'Organo Amministrativo ha formalmente approvato le misure di gestione dei rischi cyber e ne supervisiona l'attuazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con delibera formale",
          "Sì — informalmente",
          "No"
        ]
      },
      {
        "id": "nis2_audit_vulnerability",
        "label": "Sono stati effettuati audit di sicurezza o test di penetrazione (vulnerability assessment/penetration test)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — negli ultimi 12 mesi",
          "Sì — oltre 12 mesi fa",
          "No — mai",
          "In programma"
        ]
      },
      {
        "id": "com_piano_marketing",
        "label": "L'impresa ha un piano di marketing formalizzato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, annuale",
          "Sì, pluriennale",
          "In fase di sviluppo",
          "No"
        ]
      },
      {
        "id": "com_responsabile_marketing",
        "label": "È presente un Responsabile Marketing/Comunicazione formalmente incaricato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno/agenzia",
          "No, gestione informale"
        ]
      },
      {
        "id": "com_sito_web",
        "label": "L'impresa ha un sito web aziendale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, aggiornato regolarmente",
          "Sì, ma non aggiornato",
          "In sviluppo",
          "No"
        ]
      },
      {
        "id": "com_social_media",
        "label": "L'impresa è presente sui social media?",
        "type": "multiselect",
        "required": true,
        "options": [
          "LinkedIn",
          "Facebook",
          "Instagram",
          "Twitter/X",
          "YouTube",
          "TikTok",
          "Altro",
          "Nessuno"
        ]
      },
      {
        "id": "com_social_policy",
        "label": "Esiste una policy aziendale per l'uso dei social media?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, formalizzata",
          "Sì, informale",
          "No"
        ]
      },
      {
        "id": "com_newsletter",
        "label": "L'impresa gestisce newsletter o comunicazioni periodiche ai clienti/stakeholder?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, regolarmente",
          "Sì, occasionalmente",
          "No",
          "In progetto"
        ]
      }
    ]
  },
  {
    "id": "d_6",
    "macro": "d",
    "title": "D.6 Sicurezza sul Lavoro",
    "description": "",
    "fields": [
      {
        "id": "sicurezza_mog",
        "label": "La Società ha adottato un modello/sistema formalizzato di gestione sulla prevenzione e controllo dei rischi salute e sicurezza ai sensi dell'art. 30 del D.Lgs. 81/08?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In fase di adozione"
        ]
      },
      {
        "id": "sicurezza_organigramma",
        "label": "E' stato predisposto e formalizzato un Organigramma sulla Sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In fase di adozione"
        ],
        "help": "È la rappresentazione grafica e documentale della struttura organizzativa della Società specificamente dedicata alla gestione della salute e sicurezza nei luoghi di lavoro, che identifica tutti i soggetti coinvolti nel sistema prevenzionistico, i rispettivi ruoli, le relazioni gerarchiche e funzionali e le responsabilità attribuite a ciascuno."
      },
      {
        "id": "sicurezza_funzionigramma",
        "label": "E' stato predisposto e formalizzato un Funzionigramma sulla Sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In fase di adozione"
        ],
        "help": "È il documento che integra e completa l'organigramma della sicurezza, descrivendo in modo analitico — per ciascuna figura del sistema prevenzionistico — le specifiche funzioni, i compiti operativi, le responsabilità, i poteri e i limiti di intervento, le relazioni con le altre figure e gli obblighi di reportistica."
      },
      {
        "id": "datore_lavoro_identita",
        "label": "Nell'ambito aziendale, chi è il Datore di Lavoro ai sensi del D.Lgs. 81/08?",
        "type": "text",
        "required": true
      },
      {
        "id": "datore_lavoro_formale",
        "label": "Il datore di Lavoro è individuato formalmente?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ],
        "help": "Come si individua il datore di lavoro nelle società di capitali?\nL'art. 2, comma 1, lett. b), D.Lgs. 81/2008 definisce datore di lavoro il soggetto titolare del rapporto di lavoro o, comunque, il soggetto che ha la responsabilità dell'organizzazione dell'impresa o dell'unità produttiva in quanto esercita i poteri decisionali e di spesa. Nelle società con CdA, la giurisprudenza consolidata della Cassazione ha chiarito che:\nse il CdA ha conferito una delega gestoria in materia di sicurezza a uno o più amministratori, il datore di lavoro è l'amministratore delegato, a condizione che la delega gli attribuisca effettivi poteri di organizzazione, gestione e spesa in materia;\nin assenza di delega gestoria, la qualifica di datore di lavoro grava sull'intero CdA collegialmente, con responsabilità solidale di tutti i consiglieri;\nnelle S.r.l. con amministratore unico, il datore di lavoro è sempre l'amministratore unico."
      },
      {
        "id": "delega_81",
        "label": "La Società ha delegato le funzioni previste dall'art.16 D.Lgs. 81/08 (delega di funzioni)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formale con requisiti di legge",
          "Sì — informale",
          "No",
          "Non so"
        ],
        "help": "La delega di funzioni in materia di sicurezza sul lavoro (art. 16 D.Lgs. 81/2008)È l'atto formale con cui il datore di lavoro trasferisce a un altro soggetto — il delegato — l'esercizio di specifiche funzioni, compiti e responsabilità in materia di salute e sicurezza nei luoghi di lavoro, unitamente ai poteri organizzativi, gestionali e di spesa necessari per adempiervi.\nL'art. 17 D.Lgs. 81/2008 individua due obblighi indelegabili che restano in capo esclusivamente al datore di lavoro:\nla valutazione di tutti i rischi con la conseguente elaborazione del DVR (Documento di Valutazione dei Rischi);\nla designazione del RSPP (Responsabile del Servizio di Prevenzione e Protezione).\nQuesti obblighi non possono essere trasferiti in nessun caso, neppure mediante delega formalmente valida."
      },
      {
        "id": "delega_81_det",
        "label": "Se sì, a chi?",
        "type": "text",
        "required": true
      },
      {
        "id": "delega_sicurezza_2381",
        "label": "La Società ha delegato la gestione della sicurezza ai sensi dell'art. 2381 c.c. (delega gestoria)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formale con requisiti di legge",
          "Sì — informale",
          "No",
          "Non so"
        ],
        "help": "La delega gestoria in materia di sicurezza (art. 2381 c.c.) è l'atto con cui il Consiglio di Amministrazione, ove lo statuto o l'assemblea lo consentano, delega le proprie attribuzioni — inclusa la gestione della sicurezza sul lavoro — a uno o più amministratori delegati o a un comitato esecutivo, determinando il contenuto, i limiti e le eventuali modalità di esercizio della delega.\nIn cosa si distingue dalla delega di funzioni ex art. 16 D.Lgs. 81/2008?\nSi tratta di due istituti giuridici diversi per natura, funzione e disciplina:\nDelega gestoria (art. 2381 c.c.) — è un atto di organizzazione interna dell'organo amministrativo, di natura societaria, con cui il CdA ripartisce al proprio interno le funzioni di gestione. L'amministratore delegato riceve il potere-dovere di gestire la materia delegata (es. sicurezza sul lavoro) e assume la qualifica di datore di lavoro ai fini del D.Lgs. 81/2008. Questa delega opera a livello apicale, tra organi societari.\nDelega di funzioni (art. 16 D.Lgs. 81/2008) — è un atto con cui il datore di lavoro (già individuato, anche per effetto della delega gestoria) trasferisce specifici compiti prevenzionistici a soggetti collocati nella linea operativa (dirigenti, preposti, responsabili di stabilimento o di cantiere). Opera a livello gestionale-operativo, all'interno dell'organizzazione aziendale.\nLe due deleghe possono — e tipicamente devono — coesistere: la delega gestoria individua chi è il datore di lavoro nell'ambito della struttura societaria; la delega di funzioni distribuisce gli obblighi prevenzionistici all'interno della struttura organizzativa."
      },
      {
        "id": "preposti_nominati",
        "label": "La Società ha nominato preposti in ambito sicurezza sul lavoro?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formale con requisiti di legge",
          "Sì — informale",
          "No",
          "Non so"
        ],
        "help": "Il preposto è la persona che, in ragione delle competenze professionali e nei limiti dei poteri gerarchici e funzionali adeguati alla natura dell'incarico conferitogli, sovrintende all'attività lavorativa e garantisce l'attuazione delle direttive ricevute, controllandone la corretta esecuzione da parte dei lavoratori ed esercitando un funzionale potere di iniziativa (art. 2, comma 1, lett. e, D.Lgs. 81/2008)."
      },
      {
        "id": "preposti_dettaglio",
        "label": "Se sì, chi ed in quali ambiti/aree?",
        "type": "text",
        "required": true
      },
      {
        "id": "dvr",
        "label": "DVR redatto e aggiornato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ]
      },
      {
        "id": "dvr_data",
        "label": "Data ultimo aggiornamento DVR",
        "type": "text",
        "required": true
      },
      {
        "id": "rspp",
        "label": "RSPP nominato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — interno",
          "Sì — esterno",
          "No"
        ]
      },
      {
        "id": "mc",
        "label": "Medico Competente nominato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non obbligatorio"
        ]
      },
      {
        "id": "rls",
        "label": "RLS eletto/designato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "formazione_sicurezza",
        "label": "Formazione sicurezza (art. 37) regolarmente erogata e aggiornata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completa",
          "Sì — parziale / scadenze",
          "No — lacune significative"
        ]
      },
      {
        "id": "infortuni",
        "label": "Infortuni nell'ultimo triennio (numero e gravità)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "ispezioni_asl",
        "label": "Ispezioni ASL/INL nell'ultimo triennio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — senza rilievi",
          "Sì — con prescrizioni",
          "Sì — con sanzioni",
          "No"
        ]
      },
      {
        "id": "sanzioni_81",
        "label": "Sanzioni ricevute ex D.Lgs. 81/08?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "piano_emergenza",
        "label": "Piano emergenza e prove evacuazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato con prove periodiche",
          "Sì — non aggiornato",
          "No"
        ]
      }
    ]
  },
  {
    "id": "d_7",
    "macro": "d",
    "title": "D.7 Certificazioni ISO e Standard",
    "description": "",
    "fields": [
      {
        "id": "iso_9001",
        "label": "ISO 9001 (Qualità)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata — in corso di validità",
          "Certificata — in rinnovo",
          "In fase di certificazione",
          "Non certificata"
        ]
      },
      {
        "id": "iso_14001",
        "label": "ISO 14001 (Ambiente)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "No"
        ]
      },
      {
        "id": "iso_45001",
        "label": "ISO 45001 (Sicurezza sul lavoro)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "No"
        ]
      },
      {
        "id": "iso_27001",
        "label": "ISO 27001 (Sicurezza informazioni)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "No"
        ]
      },
      {
        "id": "iso_37001",
        "label": "ISO 37001 (Anticorruzione)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "No"
        ]
      },
      {
        "id": "iso_37301",
        "label": "ISO 37301 (Compliance integrata)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "No"
        ]
      },
      {
        "id": "altre_certificazioni",
        "label": "Altre certificazioni / accreditamenti di settore",
        "type": "textarea",
        "required": true
      },
      {
        "id": "nc_aperte",
        "label": "Sono state rilevate non conformità in occasione degli ultimo audit?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — maggiori",
          "Sì — solo minori",
          "No"
        ]
      },
      {
        "id": "rating_legalita",
        "label": "Rating di legalità AGCM",
        "type": "select",
        "required": true,
        "options": [
          "Ottenuto",
          "Richiesto",
          "Non richiesto"
        ],
        "help": "È un indicatore sintetico — espresso in \"stellette\" da una (★) a tre (★★★) — rilasciato dall'Autorità Garante della Concorrenza e del Mercato (AGCM) alle imprese italiane che ne facciano richiesta, attestante il rispetto di elevati standard di legalità nella conduzione dell'attività d'impresa.\nL'istituto è stato introdotto dall'art. 5-ter del D.L. 1/2012 (convertito con L. 27/2012) e disciplinato dal Regolamento attuativo dell'AGCM (Delibera 28 luglio 2020, n. 28361, e successive modifiche). Il rating ha durata biennale, è rinnovabile e può essere revocato o sospeso in caso di perdita dei requisiti."
      }
    ]
  },
  {
    "id": "d_8",
    "macro": "d",
    "title": "D.8 Sostenibilità e ESG",
    "description": "",
    "fields": [
      {
        "id": "aia_aua",
        "label": "Autorizzazioni ambientali (AIA, AUA)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutte in regola",
          "Sì — da rinnovare",
          "Non necessarie",
          "Non in regola"
        ]
      },
      {
        "id": "rifiuti",
        "label": "Gestione rifiuti conforme?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — conforme",
          "Sì — parzialmente",
          "Non conforme"
        ]
      },
      {
        "id": "emissioni",
        "label": "Monitoraggio emissioni CO2 (Scope 1-2-3)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — Scope 1-2-3",
          "Sì — solo Scope 1-2",
          "No"
        ]
      },
      {
        "id": "bilancio_sostenibilita",
        "label": "Report di sostenibilità redatto?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — conforme GRI/ESRS",
          "Sì — volontario",
          "No — obbligatorio (CSRD)",
          "No — non obbligatorio"
        ],
        "help": "È il documento con cui la Società comunica in modo strutturato e standardizzato le proprie performance, i rischi, gli impatti e le strategie in materia ambientale, sociale e di governance (ESG — Environmental, Social, Governance), rivolgendosi agli stakeholder interni ed esterni: investitori, istituti di credito, clienti, fornitori, dipendenti, comunità locali e autorità di vigilanza."
      },
      {
        "id": "due_diligence_esg",
        "label": "La Società svolge due diligence ESG sulla catena di fornitura?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — strutturata",
          "Sì — parziale",
          "No"
        ]
      },
      {
        "id": "sanzioni_ambientali",
        "label": "Sanzioni ambientali ricevute?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Procedimenti in corso"
        ]
      },
      {
        "id": "obiettivi_sostenibilita",
        "label": "Obiettivi di sostenibilità formalizzati (SDGs, net-zero)?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "obiettivi_sostenibilita_sociale",
        "label": "La Società ha proomosso o sostenuto iniziative benefit con impatto sociale per persone e/o comunità",
        "type": "textarea",
        "required": true,
        "options": [
          "Sì",
          "No",
          "No ma intende promuoverle"
        ]
      }
    ]
  },
  {
    "id": "d_9",
    "macro": "d",
    "title": "D.9 Antiriciclaggio",
    "description": "",
    "fields": [
      {
        "id": "aml_soggetto",
        "label": "La Società è soggetto obbligato ai sensi del D.Lgs. 231/2007?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — direttamente",
          "Sì — tramite gruppo",
          "No",
          "Non so"
        ],
        "help": "Il D.Lgs. 231/2007 è la normativa italiana di recepimento delle Direttive europee in materia di prevenzione del riciclaggio di denaro e del finanziamento del terrorismo. Individua una serie di categorie di soggetti — c.d. soggetti obbligati — tenuti ad adottare specifici presidi preventivi.\nChi sono i soggetti obbligati?\nGli artt. 3 e 3-bis del D.Lgs. 231/2007 elencano tassativamente le categorie:\nIntermediari bancari e finanziari — banche, SIM, SGR, SICAV, istituti di pagamento, istituti di moneta elettronica, intermediari finanziari ex art. 106 TUB, società fiduciarie, Poste Italiane per l'attività finanziaria.\nProfessionisti — dottori commercialisti ed esperti contabili, consulenti del lavoro, notai, avvocati (quando assistono il cliente nella pianificazione o realizzazione di operazioni finanziarie o immobiliari o nella gestione di denaro, beni o attività), revisori legali e società di revisione.\nAltri operatori — agenti immobiliari, mediatori creditizi, recupero crediti, custodia e trasporto valori, commercio di oggetti preziosi (per operazioni pari o superiori a € 10.000), case d'asta, gallerie d'arte, operatori in valuta virtuale e prestatori di servizi di portafoglio digitale, agenzie di scommesse e gioco.\nQuali obblighi comporta?\nI soggetti obbligati devono adottare: adeguata verifica della clientela (Know Your Customer — identificazione del cliente, del titolare effettivo, verifica dello scopo e della natura del rapporto); conservazione dei dati e della documentazione per 10 anni; segnalazione di operazioni sospette (SOS) all'UIF — Unità di Informazione Finanziaria; astensione dall'operazione in caso di impossibilità di adempiere agli obblighi di adeguata verifica; autovalutazione del rischio di riciclaggio; adozione di procedure interne, formazione del personale e controlli interni."
      },
      {
        "id": "aml_responsabile",
        "label": "È stato nominato un Responsabile Antiriciclaggio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — interno",
          "Sì — esterno",
          "No",
          "Non obbligatorio"
        ],
        "help": "È il soggetto incaricato di presidiare il rispetto della normativa antiriciclaggio all'interno dell'organizzazione, assicurando che gli obblighi previsti dal D.Lgs. 231/2007 siano correttamente attuati e mantenuti nel tempo."
      },
      {
        "id": "aml_delegato_sos",
        "label": "È stato nominato un Delegato per le segnalazioni di operazioni sospette (SOS)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Il delegato per le segnalazioni di operazioni sospette (SOS) è  il soggetto formalmente incaricato di valutare e trasmettere all'UIF (Unità di Informazione Finanziaria presso la Banca d'Italia) le segnalazioni di operazioni sospette di riciclaggio o finanziamento del terrorismo rilevate nell'ambito dell'attività della Società."
      },
      {
        "id": "aml_adeguata_verifica",
        "label": "Sono applicate procedure di adeguata verifica della clientela?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — ordinaria e rafforzata",
          "Sì — solo ordinaria",
          "Parzialmente",
          "No"
        ],
        "help": "È l'insieme delle procedure con cui il soggetto obbligato identifica il cliente, ne verifica l'identità, individua il titolare effettivo e acquisisce informazioni sullo scopo e sulla natura del rapporto continuativo o della prestazione professionale, al fine di prevenire l'utilizzo del sistema economico e finanziario a fini di riciclaggio o finanziamento del terrorismo."
      },
      {
        "id": "aml_titolare_effettivo",
        "label": "Viene identificato il titolare effettivo per tutte le operazioni rilevanti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematicamente",
          "Sì — per le principali",
          "Non sempre",
          "No"
        ],
        "help": "Il titolare effettivo è la persona fisica che, in ultima istanza, possiede o controlla un'entità giuridica cliente, ovvero la persona fisica per conto della quale un'operazione o un'attività è realizzata (art. 1, comma 2, lett. pp, D.Lgs. 231/2007)."
      },
      {
        "id": "aml_profilo_rischio",
        "label": "Viene effettuata la profilatura del rischio di riciclaggio della clientela?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con scoring",
          "Sì — qualitativa",
          "No"
        ],
        "help": "È il processo con cui il soggetto obbligato attribuisce a ciascun cliente un livello di rischio di riciclaggio e finanziamento del terrorismo (basso, medio, alto), sulla base di una valutazione combinata di più fattori, al fine di calibrare le misure di adeguata verifica e il livello di monitoraggio da applicare al rapporto."
      },
      {
        "id": "aml_monitoraggio_continuativo",
        "label": "È attivo un monitoraggio continuativo dei rapporti e delle operazioni?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — automatizzato",
          "Sì — manuale",
          "Parziale",
          "No"
        ]
      },
      {
        "id": "aml_conservazione",
        "label": "Sono rispettati gli obblighi di conservazione dei dati e dei documenti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — archivio informatico conforme",
          "Sì — archivio cartaceo",
          "Sì — archivio misto cartaceo e digitale",
          "Parzialmente",
          "No"
        ]
      },
      {
        "id": "aml_strumento_digitale",
        "label": "In caso di utiizzo di strumento digitale, di quale si tratta?",
        "type": "text",
        "required": true
      },
      {
        "id": "aml_sos_inviate",
        "label": "Sono state inviate segnalazioni di operazioni sospette (SOS) nell'ultimo triennio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ]
      },
      {
        "id": "aml_sos_numero",
        "label": "Se sì, indicare il numero e gli esiti",
        "type": "textarea",
        "required": true
      },
      {
        "id": "aml_procedure_interne",
        "label": "Esistono procedure interne formalizzate per la prevenzione del riciclaggio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornate",
          "Sì — da aggiornare",
          "No"
        ]
      },
      {
        "id": "aml_formazione",
        "label": "Viene erogata formazione antiriciclaggio al personale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — periodica",
          "Sì — una tantum",
          "No"
        ]
      },
      {
        "id": "aml_autovalutazione_rischio",
        "label": "È stata effettuata un'autovalutazione del rischio di riciclaggio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — ultimo anno",
          "Sì — oltre 1 anno fa",
          "No"
        ],
        "help": "È l'analisi documentata con cui il soggetto obbligato identifica, valuta e comprende il proprio livello di esposizione al rischio di essere utilizzato — consapevolmente o inconsapevolmente — come veicolo per operazioni di riciclaggio di denaro o finanziamento del terrorismo, al fine di adottare presidi proporzionati ed efficaci."
      },
      {
        "id": "aml_paesi_alto_rischio",
        "label": "L'impresa opera con controparti in Paesi ad alto rischio AML (liste GAFI/UE)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con misure rafforzate",
          "Sì — senza misure specifiche",
          "No"
        ],
        "help": "Significa verificare se la Società intrattiene rapporti commerciali, finanziari o professionali con soggetti residenti, stabiliti o operanti in Paesi o giurisdizioni identificati come ad alto rischio di riciclaggio e finanziamento del terrorismo dalle principali autorità internazionali e dell'Unione Europea.\nQuali sono le liste di riferimento?\nLista GAFI/FATF — il Gruppo d'Azione Finanziaria Internazionale pubblica e aggiorna periodicamente due elenchi:\nLista nera (c.d. High-Risk Jurisdictions subject to a Call for Action) — Paesi con gravi carenze strategiche nei sistemi AML/CFT, nei confronti dei quali il GAFI invita tutti i Paesi membri ad applicare contromisure rafforzate. Attualmente comprende Paesi quali Myanmar, Iran e Corea del Nord.\nLista grigia (c.d. Jurisdictions under Increased Monitoring) — Paesi che presentano carenze strategiche ma che si sono impegnati con il GAFI a implementare un piano d'azione per risolverle. L'elenco è aggiornato periodicamente (tipicamente tre volte l'anno) e include un numero variabile di giurisdizioni.\nLista della Commissione Europea — la Commissione UE adotta, mediante Regolamento Delegato (da ultimo aggiornato con Reg. Delegato (UE) 2023/2070), un elenco autonomo di Paesi terzi ad alto rischio che presentano carenze strategiche nei rispettivi regimi nazionali di prevenzione del riciclaggio e del finanziamento del terrorismo. Tale elenco, pur ispirandosi alle valutazioni del GAFI, non coincide necessariamente con le liste GAFI e ha valore giuridico vincolante nell'ordinamento dell'Unione"
      },
      {
        "id": "aml_pep",
        "label": "Sono state identificate controparti PEP (Persone Esposte Politicamente)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con procedure dedicate",
          "Sì — senza procedure specifiche",
          "No"
        ],
        "help": "Sono le persone fisiche che ricoprono o hanno ricoperto importanti cariche pubbliche, nonché i loro familiari stretti e le persone con cui intrattengono notoriamente stretti legami (c.d. close associates). La loro identificazione è un obbligo specifico dell'adeguata verifica rafforzata nell'ambito della normativa antiriciclaggio."
      },
      {
        "id": "aml_sanzioni_uif",
        "label": "Sanzioni ricevute da UIF, MEF o Autorità di Vigilanza in materia AML?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Procedimenti in corso"
        ],
        "help": "Questa domanda verifica se la Società ha ricevuto provvedimenti sanzionatori da parte delle autorità competenti in materia di prevenzione del riciclaggio e del finanziamento del terrorismo, il che costituisce un indicatore significativo di inadeguatezza dei presidi antiriciclaggio dell'organizzazione."
      },
      {
        "id": "aml_whistleblowing_aml",
        "label": "Esiste un canale interno per segnalazioni di sospetto riciclaggio (distinto dal WB 24/2023)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Integrato nel canale WB"
        ]
      },
      {
        "id": "aml_embargo_sanzioni",
        "label": "L'impresa verifica le liste di embargo e sanzioni internazionali (UE, OFAC, ONU)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematicamente",
          "Sì — occasionalmente",
          "No"
        ]
      }
    ]
  },
  {
    "id": "e_1",
    "macro": "e",
    "title": "E.1 Mappatura Rapporti Istituzionali",
    "description": "",
    "fields": [
      {
        "id": "pa_tipologia",
        "label": "Tipologie di rapporti con enti pubblici",
        "type": "multiselect",
        "required": true,
        "options": [
          "Appalti pubblici",
          "Concessioni",
          "Project Financing",
          "Autorizzazioni/licenze",
          "Contributi",
          "finanziamenti",
          "Ispezioni/verifiche",
          "Rapporti fiscali/tributari",
          "Rapporti previdenziali INPS/INAIL",
          "Rapporti doganali",
          "Autorità di vigilanza",
          "Convenzioni",
          "Nessuno"
        ]
      },
      {
        "id": "pa_enti_riferimento",
        "label": "Principali enti pubblici con cui la Società intrattiene rapporti",
        "type": "textarea",
        "required": true
      },
      {
        "id": "pa_frequenza",
        "label": "Frequenza dei contatti con enti pubblici",
        "type": "select",
        "required": true,
        "options": [
          "Quotidiana",
          "Settimanale",
          "Mensile",
          "Occasionale",
          "Rara"
        ]
      },
      {
        "id": "pa_soggetti_autorizzati",
        "label": "Sono individuati formalmente i soggetti autorizzati a intrattenere rapporti con la PA?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con registro formale",
          "Sì — solo prassi interna",
          "No"
        ]
      },
      {
        "id": "pa_procedura_rapporti",
        "label": "Esiste una procedura formalizzata per la gestione dei rapporti con funzionari pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — nel Modello 231",
          "Sì — procedura autonoma",
          "Solo prassi informale",
          "No"
        ]
      },
      {
        "id": "pa_divieto_pagamenti",
        "label": "È previsto un divieto esplicito di pagamenti, utilità o vantaggi a funzionari pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — nel Codice Etico e nel Modello 231",
          "Sì — solo nel Codice Etico",
          "No"
        ]
      },
      {
        "id": "pa_formazione_specifica",
        "label": "Il personale coinvolto nei rapporti con la PA riceve formazione anticorruzione specifica?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — periodica",
          "Sì — una tantum",
          "No"
        ]
      },
      {
        "id": "pa_consulenti_intermediari",
        "label": "La Società si avvale di consulenti o intermediari per i rapporti con enti pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con due diligence",
          "Sì — senza due diligence formalizzata",
          "No"
        ]
      }
    ]
  },
  {
    "id": "e_2",
    "macro": "e",
    "title": "E.2 Appalti e Gare Pubbliche",
    "description": "",
    "fields": [
      {
        "id": "pa_gare_partecipazione",
        "label": "La Società partecipa a procedure di evidenza pubblica?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — frequentemente",
          "Sì — occasionalmente",
          "No",
          "In passato"
        ]
      },
      {
        "id": "pa_gare_incidenza",
        "label": "Incidenza % degli appalti pubblici sul fatturato totale",
        "type": "select",
        "required": true,
        "options": [
          "Oltre 50%",
          "25-50%",
          "10-25%",
          "Sotto 10%"
        ]
      },
      {
        "id": "pa_soa",
        "label": "Attestazione SOA in possesso?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in corso di validità",
          "Sì — in rinnovo",
          "No — non necessaria",
          "No — in fase di ottenimento"
        ]
      },
      {
        "id": "pa_soa_det",
        "label": "Se sì, quali?",
        "type": "text",
        "required": true
      },
      {
        "id": "pa_rating_anac",
        "label": "Rating di impresa ai sensi del D.Lgs. 36/2023 (Codice Contratti)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In valutazione"
        ],
        "help": "È un sistema di valutazione reputazionale degli operatori economici che partecipano a procedure di affidamento di contratti pubblici, previsto dall'art. 222, comma 10, del D.Lgs. 36/2023, gestito dall'ANAC (Autorità Nazionale Anticorruzione) e finalizzato a misurare l'affidabilità complessiva dell'impresa sulla base di parametri oggettivi e verificabili."
      },
      {
        "id": "pa_subappalto",
        "label": "La Società opera come subappaltatore in contratti pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — frequentemente",
          "Sì — occasionalmente",
          "No"
        ]
      },
      {
        "id": "pa_rti_consorzi",
        "label": "Partecipazione a gare in RTI o tramite consorzi?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — come mandataria",
          "Sì — come mandante",
          "Sì — sia come mandante che come mandataria",
          "Sì — tramite consorzio",
          "No"
        ]
      },
      {
        "id": "pa_tracciabilita",
        "label": "I pagamenti relativi a contratti pubblici rispettano la tracciabilità ex L. 136/2010?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — conti dedicati e CIG/CUP",
          "Sì — parzialmente",
          "No"
        ]
      }
    ]
  },
  {
    "id": "e_3",
    "macro": "e",
    "title": "E.3 Contributi, Finanziamenti e Agevolazioni",
    "description": "",
    "fields": [
      {
        "id": "pa_contributi_ricevuti",
        "label": "La Società ha ricevuto contributi, sovvenzioni o finanziamenti pubblici nell'ultimo triennio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Richiesta in corso"
        ]
      },
      {
        "id": "pa_contributi_importo",
        "label": "Importo complessivo contributi pubblici ricevuti nell'ultimo triennio (€)",
        "type": "number",
        "required": true
      },
      {
        "id": "pa_trasparenza_124",
        "label": "Adempimento obblighi di pubblicazione contributi ex art. 1, co. 125-129, L. 124/2017?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — in nota integrativa",
          "Sì — sul sito web",
          "No"
        ],
        "help": "È l'obbligo di trasparenza imposto alle imprese che ricevono sovvenzioni, sussidi, vantaggi, contributi o aiuti in denaro o in natura da parte di pubbliche amministrazioni e da soggetti assimilati, consistente nella pubblicazione annuale delle informazioni relative agli importi ricevuti."
      },
      {
        "id": "pa_pnrr",
        "label": "La Società è beneficiaria diretta o indiretta di fondi PNRR?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — beneficiaria diretta",
          "Sì — subappaltatore/fornitore",
          "No"
        ]
      },
      {
        "id": "pa_crediti_imposta",
        "label": "La Società fruisce di crediti d'imposta o agevolazioni fiscali?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In gestione",
          "In passato"
        ]
      }
    ]
  },
  {
    "id": "e_4",
    "macro": "e",
    "title": "E.4 Autorizzazioni e Iscrizioni Pubbliche",
    "description": "",
    "fields": [
      {
        "id": "pa_autorizzazioni",
        "label": "La Società opera in base ad autorizzazioni, licenze o concessioni pubbliche?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutte vigenti e in regola",
          "Sì — alcune in scadenza/rinnovo",
          "No — attività non soggetta",
          "Non in regola"
        ]
      },
      {
        "id": "pa_autorizzazioni_elenco",
        "label": "Elencare le principali autorizzazioni/concessioni (ente, oggetto, scadenza)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "pa_albi_registri",
        "label": "La Società è iscritta in albi o registri tenuti da enti pubblici",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In passato"
        ]
      },
      {
        "id": "pa_albi_registri_det",
        "label": "Se sì, in quali?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "pa_antimafia",
        "label": "Informativa antimafia ex D.Lgs. 159/2011",
        "type": "select",
        "required": true,
        "options": [
          "Sì — informativa liberatoria vigente",
          "Sì — comunicazione antimafia",
          "In rinnovo"
        ],
        "help": "È il provvedimento rilasciato dal Prefetto che attesta, oltre all'assenza delle cause di decadenza, sospensione o divieto previste per la comunicazione antimafia, l'insussistenza di eventuali tentativi di infiltrazione mafiosa nell'impresa. Rappresenta il livello più approfondito di verifica antimafia previsto dall'ordinamento."
      },
      {
        "id": "pa_white_list",
        "label": "Iscrizione White List Prefettura",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in corso di validità",
          "In fase di iscrizione",
          "No — non applicabile",
          "No — non richiesta"
        ],
        "help": "È l'iscrizione volontaria della Società nell'elenco dei fornitori, prestatori di servizi ed esecutori di lavori non soggetti a tentativi di infiltrazione mafiosa, istituito presso ciascuna Prefettura — Ufficio Territoriale del Governo ai sensi dell'art. 1, commi 52-57, L. 190/2012 e del D.P.C.M. 18 aprile 2013."
      }
    ]
  },
  {
    "id": "e_5",
    "macro": "e",
    "title": "E.5 Controlli e Ispezioni",
    "description": "",
    "fields": [
      {
        "id": "pa_ispezioni_ricevute",
        "label": "Ispezioni, verifiche o accertamenti ricevuti da enti pubblici nell'ultimo triennio",
        "type": "multiselect",
        "required": true,
        "options": [
          "Agenzia Entrate",
          "Guardia di Finanza",
          "INPS",
          "INAIL",
          "ASL",
          "INL",
          "ARPA",
          "NAS",
          "Vigili del Fuoco",
          "ANAC",
          "Autorità settoriali",
          "Nessuna"
        ]
      },
      {
        "id": "pa_ispezioni_esito",
        "label": "Esito complessivo delle ispezioni ricevute",
        "type": "multiselect",
        "required": true,
        "options": [
          "Tutte regolari",
          "Con prescrizioni adempiute",
          "Con prescrizioni pendenti",
          "Con sanzioni",
          "Con segnalazioni penali"
        ]
      },
      {
        "id": "pa_ispezioni_dettaglio",
        "label": "Dettaglio ispezioni rilevanti (ente, data, oggetto, esito)",
        "type": "textarea",
        "required": false
      },
      {
        "id": "pa_sanzioni_pa",
        "label": "Sanzioni amministrative ricevute da enti pubblici nell'ultimo triennio",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì  No",
          "Procedimenti in corso"
        ]
      },
      {
        "id": "pa_sanzioni_dettaglio",
        "label": "Se sì, dettaglio (ente, importo, oggetto, stato)",
        "type": "textarea",
        "required": false
      }
    ]
  },
  {
    "id": "f_1",
    "macro": "f",
    "title": "F.1 Risk Assessment",
    "description": "",
    "fields": [
      {
        "id": "risk_framework",
        "label": "Framework di risk management strutturato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — ERM integrato",
          "Sì — parziale / settoriale",
          "Solo informale",
          "No"
        ],
        "help": "È il sistema organico e formalizzato con cui la Società identifica, valuta, gestisce, monitora e comunica i rischi che possono compromettere il raggiungimento degli obiettivi aziendali, integrando la gestione del rischio nei processi decisionali e nella governance complessiva dell'organizzazione."
      },
      {
        "id": "risk_owner",
        "label": "Responsabile del risk management",
        "type": "text",
        "required": true
      },
      {
        "id": "risk_mapping",
        "label": "Mappatura rischi aziendali effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — ultimo anno",
          "Sì — oltre 1 anno fa",
          "No — mai"
        ],
        "help": "È l'attività sistematica con cui la Società identifica, censisce e classifica tutti i rischi significativi — interni ed esterni — che possono compromettere il raggiungimento degli obiettivi aziendali, la continuità operativa, la conformità normativa o la reputazione dell'organizzazione."
      },
      {
        "id": "risk_categories",
        "label": "Categorie di rischio identificate (strategico, operativo, finanziario, compliance, reputazionale)",
        "type": "multiselect",
        "required": true,
        "options": [
          "Strategico",
          "Operativo",
          "Finanziario",
          "Compliance",
          "Ambientale",
          "Reputazionale",
          "Altro"
        ]
      },
      {
        "id": "risk_appetite",
        "label": "Risk appetite / tolerance definiti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzati",
          "Solo informali",
          "No"
        ],
        "help": "Sono i parametri con cui la Società definisce formalmente quanto rischio la Società è disposta ad assumersi nel perseguimento dei propri obiettivi strategici e operativi, e quali sono le soglie massime di rischio oltre le quali l'organizzazione non è disposta ad andare."
      },
      {
        "id": "business_continuity",
        "label": "Piano di Business Continuity (BCP)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — testato",
          "Sì — non testato",
          "No"
        ],
        "help": "È il documento strategico con cui la Società definisce le procedure, le risorse e le azioni necessarie per garantire la continuità delle funzioni aziendali critiche durante e dopo un evento avverso che ne comprometta il normale svolgimento, minimizzando l'impatto sull'operatività, sui clienti e sugli stakeholder."
      },
      {
        "id": "disaster_recovery",
        "label": "Piano di Disaster Recovery IT?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — testato",
          "Sì — non testato",
          "No"
        ],
        "help": "È il documento operativo che definisce le procedure tecniche, le risorse e le tempistiche per il ripristino dell'infrastruttura informatica, delle applicazioni, dei dati e delle comunicazioni digitali della Società a seguito di un evento che ne comprometta la disponibilità."
      },
      {
        "id": "cyber_security",
        "label": "Valutazione rischio cyber security effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — recente",
          "Sì — non recente",
          "No"
        ]
      },
      {
        "id": "rischio_frode",
        "label": "Valutazione rischio frode effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      }
    ]
  },
  {
    "id": "f_2",
    "macro": "f",
    "title": "F.2 Assicurazioni e Coperture",
    "description": "",
    "fields": [
      {
        "id": "polizza_do",
        "label": "Polizza D&O (Directors & Officers)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In valutazione"
        ],
        "help": "È la copertura assicurativa che protegge il patrimonio personale degli amministratori, dei sindaci, dei dirigenti e, in alcune formulazioni, della Società stessa, dai rischi economici derivanti da richieste di risarcimento per atti illeciti — colposi o presuntamente tali — commessi nell'esercizio delle rispettive funzioni gestorie o di controllo."
      },
      {
        "id": "do_massimale",
        "label": "Massimale D&O e principali esclusioni",
        "type": "textarea",
        "required": true
      },
      {
        "id": "polizza_rc",
        "label": "Polizza RC verso terzi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "polizza_cyber",
        "label": "Polizza Cyber Risk?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In valutazione"
        ]
      },
      {
        "id": "polizza_rc_prodotto",
        "label": "Polizza RC Prodotto?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "gap_analysis",
        "label": "Gap analysis sulle coperture effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — recente",
          "Sì — non recente",
          "No"
        ]
      }
    ]
  },
  {
    "id": "f_3",
    "macro": "f",
    "title": "F.3 Contenzioso e Procedimenti",
    "description": "",
    "fields": [
      {
        "id": "cont_civili",
        "label": "Contenziosi civili in corso (numero e valore indicativo)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "cont_lavoro",
        "label": "Contenziosi giuslavoristici in corso (numero e valore indicativo)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "cont_penali",
        "label": "Procedimenti penali in corso o passati",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non disponibile"
        ]
      },
      {
        "id": "cont_tributari",
        "label": "Contenziosi tributari in corso (numero e valore indicativo)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "fondo_rischi",
        "label": "Fondi rischi e oneri accantonati a bilancio (€)",
        "type": "text",
        "required": true
      },
      {
        "id": "azione_responsabilita",
        "label": "Azioni responsabilità ex art. 2476/2393 c.c. in corso o passate?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — in corso",
          "Sì — passate",
          "No"
        ]
      },
      {
        "id": "uso_improprio_procure",
        "label": "Episodi uso improprio procure/deleghe?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — accertati",
          "Sì — sospetti",
          "No"
        ]
      },
      {
        "id": "uso_improprio_det",
        "label": "Se sì, descrivere sinteticamente",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "g_1",
    "macro": "g",
    "title": "G.1 Contrattualistica",
    "description": "",
    "fields": [
      {
        "id": "contratti_standard",
        "label": "Sono stati predisposti modelli contrattuali standard e/o condizioni generali?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — completi e aggiornati",
          "Sì — parziali",
          "No"
        ]
      },
      {
        "id": "contratti_standard_det",
        "label": "Se sì, quali?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "legal_review",
        "label": "Contratti soggetti a revisione legale prima della firma?",
        "type": "select",
        "required": true,
        "options": [
          "Sempre — sopra soglia",
          "Spesso",
          "Raramente",
          "Mai"
        ]
      },
      {
        "id": "contratti_rilevanti",
        "label": "Contratti strategici in essere (appalti, partnership, JV, licenze)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "contratti_rilevanti_det",
        "label": "Se sì, quali i più importanti?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "garanzie_rilasciate",
        "label": "Garanzie rilasciate a terzi (fideiussioni, patronage, pegni)",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "contratti_rilevanti_det_2",
        "label": "Se sì, quali le più importanti?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "antiriciclaggio",
        "label": "Adempimenti antiriciclaggio applicabili?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — soggetto obbligato",
          "Sì — come controparte",
          "No"
        ]
      }
    ]
  },
  {
    "id": "g_2",
    "macro": "g",
    "title": "G.2 Proprietà Intellettuale",
    "description": "",
    "fields": [
      {
        "id": "marchi",
        "label": "Marchi registrati",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì - nazionali",
          "Sì - europei",
          "Sì, internazionali",
          "No"
        ]
      },
      {
        "id": "brevetti",
        "label": "Brevetti",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — nazionali",
          "Sì — europei",
          "Sì — internazionali",
          "No"
        ]
      },
      {
        "id": "know_how",
        "label": "Know-how e segreti commerciali protetti?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Sì — con NDA e misure di protezione",
          "Sì — solo NDA",
          "Sì — non protetti",
          "No — non protetti"
        ]
      },
      {
        "id": "licenze_ricevute",
        "label": "Licenze IP ricevute da terzi (software, brevetti, marchi)",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "licenze_ricevute_det",
        "label": "Se sì, quali?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "contenziosi_ip_corso",
        "label": "Contenziosi IP in corso?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "contenziosi_ip_passati",
        "label": "Contenziosi IP passati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "nda_policy",
        "label": "Policy NDA / riservatezza sistematica?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — standard",
          "Solo per alcuni rapporti",
          "No"
        ]
      }
    ]
  },
  {
    "id": "h_1",
    "macro": "h",
    "title": "H.1 Modello di Business",
    "description": "",
    "fields": [
      {
        "id": "mb_vision_mission",
        "label": "L'impresa, nella costruzione del proprio modello di business, ha definito la propria Vision e la propria Mission?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Sono le dichiarazioni formali con cui la Società definisce la propria identità strategica, comunicando all'interno e all'esterno il senso della propria esistenza e la direzione verso cui intende orientare il proprio sviluppo.\nQual è la differenza?\nVision — descrive l'aspirazione di lungo termine dell'impresa: dove vuole arrivare, quale posizione intende raggiungere nel mercato e nella società, quale futuro immagina per sé e per i propri stakeholder. È una proiezione ideale che orienta le scelte strategiche e ispira l'organizzazione. Risponde alla domanda: \"cosa vogliamo diventare?\".\nMission — descrive la ragion d'essere attuale dell'impresa: cosa fa, per chi lo fa, come lo fa e cosa +J375:J376la distingue dai concorrenti. È concreta, operativa e legata al presente. Risponde alla domanda: \"perché esistiamo e quale valore creiamo?\"."
      },
      {
        "id": "mb_strutturato",
        "label": "Il modello di business dell'impresa è stato strutturato e formalizzato? (verificare se sono stati utilizzati strumenti quali il Business Model Canvas o simili)",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "mb_comunicato",
        "label": "Si ritiene che il modello di business sia adeguatamente comunicato e condiviso all'interno dell'organizzazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "mb_swot",
        "label": "Nella costruzione del modello di business l'impresa ha enfatizzato minacce e opportunità relativamente alle variabili esterne e i propri punti di forza e di debolezza con riferimento alle variabili interne (analisi SWOT)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ],
        "help": "L'\"Analisi SWOT\" è lo strumento di analisi strategica con cui la Società valuta in modo strutturato la propria posizione competitiva, esaminando simultaneamente i fattori interni controllabili e i fattori esterni non direttamente controllabili che influenzano il raggiungimento degli obiettivi aziendali.\nSWOT identifica le quattro dimensioni dell'analisi:\nStrengths (Punti di forza) — variabili interne che costituiscono un vantaggio competitivo: competenze distintive, know-how proprietario, solidità patrimoniale, qualità del management, reputazione del brand, portafoglio clienti consolidato, brevetti e proprietà intellettuale, certificazioni, efficienza dei processi, posizionamento di mercato;\nWeaknesses (Punti di debolezza) — variabili interne che rappresentano una vulnerabilità: carenze organizzative, dipendenza da figure chiave, obsolescenza tecnologica, inadeguatezza dei sistemi informativi, debolezza finanziaria, mancanza di certificazioni, lacune di compliance, concentrazione eccessiva su pochi clienti o fornitori, assenza di pianificazione strategica;\nOpportunities (Opportunità) — variabili esterne che possono essere sfruttate a vantaggio dell'impresa: nuovi mercati o segmenti emergenti, evoluzione normativa favorevole, incentivi pubblici (PNRR, transizione ecologica), innovazione tecnologica, cambiamenti nelle abitudini dei consumatori, debolezza dei concorrenti, possibilità di aggregazione o partnership strategiche;\nThreats (Minacce) — variabili esterne che possono compromettere la posizione dell'impresa: ingresso di nuovi concorrenti, evoluzione normativa sfavorevole, instabilità geopolitica, aumento dei costi delle materie prime o dell'energia, obsolescenza dei prodotti, rischi cyber crescenti, contrazione della domanda, crisi della catena di fornitura, cambiamenti climatici e rischi ambientali."
      },
      {
        "id": "mb_obiettivi",
        "label": "Nella costruzione del modello di business l'impresa ha formalizzato un sistema di obiettivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "mb_piano_strategico",
        "label": "Nella costruzione del modello di business l'impresa ha formalizzato un piano strategico coerente con gli obiettivi in precedenza definiti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      }
    ]
  },
  {
    "id": "h_2",
    "macro": "h",
    "title": "H.2 Modello Gestionale",
    "description": "",
    "fields": [
      {
        "id": "mg_responsabile_it",
        "label": "L'impresa ha identificato un responsabile IT?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "mg_sistema_integrato",
        "label": "L'impresa è dotata di un sistema informativo integrato (ad esempio, un ERP o altro sistema meno complesso)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "mg_orientato_obiettivi",
        "label": "Il sistema informativo dell'impresa è orientato ai suoi obiettivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "mg_flussi_attendibili",
        "label": "Il sistema informativo consente a tutti i livelli flussi attendibili, chiari e tempestivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "mg_protezione",
        "label": "Sono presenti meccanismi di protezione rispetto a violazioni (interne e/o esterne) del sistema informativo?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "mg_protezione_dati",
        "label": "Il sistema informativo consente la gestione e la protezione dei dati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "mg_canali",
        "label": "Quali sono i canali che il sistema informativo aziendale predilige?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Email",
          "Cartelle condivise",
          "Software non integrato",
          "Software Integrato (ERP)",
          "Altro"
        ],
        "help": "Sono gli strumenti, le piattaforme e le modalità attraverso cui le informazioni rilevanti per la gestione dell'impresa vengono raccolte, elaborate, trasmesse, archiviate e rese disponibili ai soggetti che ne necessitano per l'esercizio delle proprie funzioni, a tutti i livelli dell'organizzazione."
      },
      {
        "id": "mg_risk_management",
        "label": "Il sistema informativo è funzionale al sistema di gestione del rischio dell'impresa?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ]
      }
    ]
  },
  {
    "id": "h_3",
    "macro": "h",
    "title": "H.3 Assetti Organizzativi",
    "description": "",
    "fields": [
      {
        "id": "ao_organigramma",
        "label": "L’impresa è dotata di un Organigramma formalizzato e comunicato all’interno dell’organizzazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_modello_struttura",
        "label": "In caso di riposta affermativa alla precedente domanda, qual è il modello di struttura organizzativa adottato?",
        "type": "select",
        "required": true,
        "options": [
          "Semplice",
          "Funzionale",
          "Divisionale",
          "A matrice",
          "Per progetti",
          "Per processi",
          "Altro"
        ]
      },
      {
        "id": "ao_funzionigramma",
        "label": "L'impresa è dotata di un Funzionigramma formalizzato e comunicato al suo interno?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_mansionario",
        "label": "L'impresa è dotata di un mansionario formalizzato e comunicato al suo interno?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ao_selezione_personale",
        "label": "Nei procedimenti di selezione del personale, l'impresa è dotata di procedure e/o di strumenti di analisi delle competenze dei candidati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_valutazione_competenze",
        "label": "L'impresa è dotata di sistemi di valutazione costante delle competenze delle risorse umane in relazione ai ruoli ricoperti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_formazione",
        "label": "L'impresa organizza corsi di formazione e di aggiornamento nell'ottica di un percorso di crescita professionale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_delega_poteri",
        "label": "Si ritiene che l'assegnazione di compiti e mansioni rispetti la corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ao_procedure_operative",
        "label": "L'impresa è dotata di procedure operative e processi formalizzati (ciclo attivo, passivo, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ao_procedure_sostenibilita",
        "label": "L'impresa è dotata di procedure operative e processi formalizzati a supporto degli obiettivi di sostenibilità dell'attività?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ao_procedure_autorizzative",
        "label": "L'impresa ha previsto procedure autorizzative in relazione a specifiche attività operative (ad esempio, accessi identificativi al sistema informativo, autorizzazione per spese superiori a determinati importi, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Parzialmente"
        ]
      },
      {
        "id": "ao_scigr",
        "label": "È presente un sistema di controllo interno e gestione dei rischi (SCIGR)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Il Sistema di Controllo Interno e Gestione dei Rischi (SCIGR) è l'insieme strutturato di regole, procedure, strutture organizzative e strumenti che la Società adotta per identificare, misurare, gestire e monitorare i principali rischi aziendali, assicurando il conseguimento degli obiettivi strategici, operativi, di compliance e di reporting in modo conforme alle leggi, ai regolamenti e alle norme interne."
      },
      {
        "id": "ao_modello_231",
        "label": "L'impresa ha adottato un modello organizzativo ai sensi del d.lgs. 231/2001?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_odv_composizione",
        "label": "In caso di risposta affermativa alla precedente domanda, qual è la composizione dell'organismo di vigilanza?",
        "type": "select",
        "required": true,
        "options": [
          "Monocratico",
          "Collegiale"
        ]
      },
      {
        "id": "ao_odv_criticita",
        "label": "L'organismo di vigilanza ha evidenziato criticità?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_whistleblowing",
        "label": "L'impresa, ricorrendo i presupposti previsti dalla normativa, ha adottato canali di segnalazione interna ai sensi del d.lgs. 24/2023 (c.d. decreto whistleblowing)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_rischi_esg",
        "label": "Nell'ambito della gestione dei rischi aziendali, sono stati analizzati anche quelli relativi ai fattori ESG?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_certificazioni",
        "label": "Sono state rilasciate certificazioni per l'esercizio di attività in specifici settori?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ao_parita_genere",
        "label": "L'impresa ha adottato procedure e misure per ridurre il divario di genere?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Sono l'insieme di politiche, azioni concrete e strumenti organizzativi che la Società adotta per promuovere la parità di trattamento e di opportunità tra uomini e donne nell'ambiente di lavoro, contrastando ogni forma di discriminazione diretta o indiretta basata sul genere."
      },
      {
        "id": "ao_parita_genere_det",
        "label": "Se si, quali?",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "h_4",
    "macro": "h",
    "title": "H.4 Assetti Amministrativi",
    "description": "",
    "fields": [
      {
        "id": "aa_poteri_formalizzati",
        "label": "Nel caso di costituzione di un consiglio di amministrazione, sono stati formalizzati i poteri e i compiti assegnati a ciascun componente?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_corrispondenza_delega",
        "label": "Si ritiene che ci sia corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_internal_audit",
        "label": "È presente una funzione di internal audit?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "È una funzione aziendale indipendente che svolge attività di verifica e valutazione sistematica sull'adeguatezza, l'efficacia e l'effettivo funzionamento del sistema di controllo interno, dei processi organizzativi, delle procedure e della gestione dei rischi."
      },
      {
        "id": "aa_organo_controllo_srl",
        "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un organo di controllo, anche monocratico?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_revisore_srl",
        "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un soggetto incaricato della revisione legale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_piano_industriale",
        "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di un piano industriale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_piani_operativi",
        "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di piani operativi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_funzioni_esterne",
        "label": "Esistono funzioni ricoperte da soggetti esterni all'organizzazione (ad esempio, responsabile finanziario, sicurezza, legale, privacy, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "aa_funzioni_esterne_det",
        "label": "Se si, quali?",
        "type": "textarea",
        "required": true
      },
      {
        "id": "aa_parti_correlate",
        "label": "Sono presenti procedure o regolamenti per la gestione delle operazioni con parti correlate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "È un documento interno che disciplina le modalità con cui la Società identifica, valuta, autorizza e monitora le operazioni compiute con soggetti legati alla Società stessa da un rapporto qualificato — le c.d. parti correlate.\nLe parti correlate sono soggetti che, per la posizione rivestita o per i legami esistenti, possono influenzare o essere influenzati dalla Società nelle decisioni economiche. Rientrano tipicamente: i soci di controllo o con influenza notevole; gli amministratori, i sindaci e i dirigenti con responsabilità strategiche (e i loro stretti familiari); le società controllate, collegate o sottoposte a comune controllo; le entità in cui i soggetti sopra indicati detengono partecipazioni rilevanti o incarichi direttivi."
      }
    ]
  },
  {
    "id": "h_5",
    "macro": "h",
    "title": "H.5 Assetti Contabili",
    "description": "",
    "fields": [
      {
        "id": "ac_sistema_integrato",
        "label": "L'impresa è dotata di un sistema informativo contabile integrato (ad esempio, si avvale di un unico software o più software per gli adempimenti contabili e fiscali)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ac_esternalizzazione",
        "label": "L'impresa ha esternalizzato le procedure di registrazione e gestione delle operazioni contabili (contabilità interna o esterna)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ac_esternalizzazione_tipo",
        "label": "In caso di risposta affermativa alla precedente domanda, l'esternalizzazione delle procedure contabili è parziale o totale?",
        "type": "select",
        "required": true,
        "options": [
          "Totale",
          "Parziale"
        ]
      },
      {
        "id": "ac_trasferimento_dati",
        "label": "Nel caso di esternalizzazione parziale o totale, come avviene il trasferimento dei dati e delle informazioni?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Fax",
          "Email",
          "Condivisione di un sistema informativo",
          "Altro"
        ]
      },
      {
        "id": "ac_cadenza_aggiornamento",
        "label": "Con quale cadenza avviene l'aggiornamento della contabilità?",
        "type": "select",
        "required": true,
        "options": [
          "Mensile",
          "Trimestrale",
          "Quadrimestrale",
          "Semestrale",
          "Annuale"
        ]
      },
      {
        "id": "ac_bilanci_infrannuali",
        "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali di esercizio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "I Bilanci infrannuali di esercizio sono le situazioni contabili periodiche — tipicamente trimestrali, quadrimestrali o semestrali — che la Società predispone nel corso dell'esercizio sociale prima della chiusura annuale del bilancio, al fine di monitorare con continuità l'andamento economico, patrimoniale e finanziario dell'impresa e di verificare la coerenza dei risultati effettivi con le previsioni di budget."
      },
      {
        "id": "ac_bilanci_infrannuali_periodicita",
        "label": "Se sì, con quale periodicità?",
        "type": "select",
        "required": true,
        "options": [
          "Trimestrale",
          "Quadrimestrale",
          "Semestrale",
          "Annuale"
        ]
      },
      {
        "id": "ac_bilanci_gestionali",
        "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali gestionali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Bilanci infrannuali gestionaliSono le situazioni contabili e gestionali periodiche predisposte dalla Società — a differenza dei bilanci infrannuali di esercizio, che seguono lo schema civilistico — secondo logiche di contabilità analitica e di controllo di gestione, finalizzate a fornire al management e agli organi di governo una visione operativa, tempestiva e articolata dell'andamento aziendale."
      },
      {
        "id": "ac_analisi_bilancio",
        "label": "L'impresa è dotata di un sistema di analisi di bilancio comprensivo di indici e indicatori di natura reddituale, patrimoniale e finanziaria?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ac_analisi_bilancio_indici",
        "label": "In caso di risposta affermativa, quali sono gli indici principali?",
        "type": "text",
        "required": true
      },
      {
        "id": "ac_analisi_crisi",
        "label": "L'analisi degli indici e degli indicatori di cui alla precedente domanda è effettuata in un'ottica di continuità aziendale e ai fini della rilevazione tempestiva della crisi d'impresa?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ac_controllo_gestione",
        "label": "L'impresa è dotata di un sistema di controllo di gestione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Il Sistema di controllo di gestione è l'insieme strutturato di strumenti, processi, metodologie e flussi informativi con cui la Società pianifica gli obiettivi economici, finanziari e operativi, monitora sistematicamente i risultati conseguiti, analizza gli scostamenti rispetto alle previsioni e orienta le decisioni correttive, al fine di guidare la gestione verso il raggiungimento degli obiettivi strategici definiti dall'organo amministrativo."
      },
      {
        "id": "ac_contabilita_analitica",
        "label": "L'impresa è dotata di un sistema di contabilità analitica?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Il Sistema di contabilità analitica (o contabilità industriale) è il sistema contabile che rileva, classifica e attribuisce i costi e i ricavi non solo per natura — come la contabilità generale — ma per destinazione: centro di costo, centro di ricavo, centro di profitto, prodotto, servizio, commessa, cliente, mercato, canale distributivo, progetto. Costituisce il fondamento informativo del controllo di gestione."
      },
      {
        "id": "ac_kpi",
        "label": "L'impresa è dotata di un sistema di KPI (Key Performance Indicator) relativi agli elementi più rilevanti della gestione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Il Sistema di KPI (Key Performance Indicators) è l'insieme strutturato di indicatori quantitativi e qualitativi che la Società utilizza per misurare, monitorare e valutare le performance aziendali nelle dimensioni più rilevanti della gestione, collegando gli obiettivi strategici definiti dal CdA ai risultati operativi effettivamente conseguiti a tutti i livelli dell'organizzazione.\nI KPI sono metriche sintetiche, oggettive e misurabili che traducono gli obiettivi aziendali in parametri quantificabili e verificabili nel tempo. Un KPI efficace risponde ai criteri c.d. SMART: Specifico (misura un fenomeno definito), Misurabile (quantificabile con dati oggettivi), Achievable/Attuabile (raggiungibile con le risorse disponibili), Rilevante (collegato a un obiettivo strategico o operativo significativo) e Temporalmente definito (con un orizzonte di misurazione e una frequenza di aggiornamento prestabiliti)."
      },
      {
        "id": "ac_kpi_principali",
        "label": "In caso di risposta affermativa, quali sono gli indici principali?",
        "type": "text",
        "required": true
      },
      {
        "id": "ac_budget_reporting",
        "label": "L'impresa è dotata di un sistema di budgeting e reporting?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      },
      {
        "id": "ac_cadenza_reporting",
        "label": "In caso di risposta affermativa alla precedente domanda, con quale cadenza l'impresa gestisce la reportistica relativa agli scostamenti?",
        "type": "select",
        "required": true,
        "options": [
          "Mensile",
          "Trimestrale",
          "Quadrimestrale",
          "Semestrale",
          "Annuale"
        ]
      },
      {
        "id": "ac_aspetti_finanziari",
        "label": "L'impresa pone attenzione ad aspetti finanziari quali, ad esempio, piano di tesoreria a sei mesi, analisi dei flussi di cassa, valutazione della posizione finanziaria netta, ecc.?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ]
      }
    ]
  },
  {
    "id": "i_1",
    "macro": "i",
    "title": "I.1 Atti Societari e Corporate",
    "description": "",
    "fields": [
      {
        "id": "d_statuto",
        "label": "Statuto sociale vigente",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_visura",
        "label": "Visura camerale aggiornata",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_patti_parasociali",
        "label": "Patti parasociali (se esistenti)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_bilancio",
        "label": "Bilancio ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_procure",
        "label": "Copia integrale procure notarili",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_deleghe",
        "label": "Deleghe interne e procure non notarili",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_verbali_cda",
        "label": "Verbali CdA ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_verbali_assemblea",
        "label": "Verbali assemblee ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_2",
    "macro": "i",
    "title": "I.2 Governance e Compliance",
    "description": "",
    "fields": [
      {
        "id": "d_organigramma_soc",
        "label": "Organigramma societario",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_funzionigramma_soc",
        "label": "Funzionigramma societario",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_modello_231",
        "label": "Modello 231 completo (Parte Generale + Parti Speciali)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_codice_etico",
        "label": "Codice Etico",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_sistema_disciplinare",
        "label": "Sistema disciplinare 231 formalizzato",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_verbali_odv",
        "label": "Verbali OdV ultimo biennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_budget_odv",
        "label": "Budget autonomo OdV",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_anticorruzione",
        "label": "Policy anticorruzione e conflitto interessi",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_policy_omaggi",
        "label": "Policy omaggi, regali e ospitalità",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_policy_whistleblowing",
        "label": "Policy whistleblowing",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_registro_whistleblowing",
        "label": "Registro segnalazioni whistleblowing",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_3",
    "macro": "i",
    "title": "I.3 Privacy e Sicurezza",
    "description": "",
    "fields": [
      {
        "id": "d_registro_trattamenti",
        "label": "Registro dei Trattamenti",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_privacy",
        "label": "Documentazione privacy completa (nomine, informative, consensi)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_istruzioni_privacy",
        "label": "Istruzioni operative privacy per il personale dipendente",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_dpia",
        "label": "DPIA - Data Protection Impact Assessment",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_procedura_breach",
        "label": "Procedura gestione data breach",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_registro_breach",
        "label": "Registro data breach",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_mog_81",
        "label": "MOG ex art. 30 D.Lgs. 81/08",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_dvr",
        "label": "DVR e deleghe sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_piano_emergenza",
        "label": "Piano emergenza (D.Lgs. 81/08)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_4",
    "macro": "i",
    "title": "I.4 Pianificazione e Controllo",
    "description": "",
    "fields": [
      {
        "id": "d_business_plan",
        "label": "Business plan",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_piano_industriale",
        "label": "Piano industriale/strategico pluriennale",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_piani_operativi",
        "label": "Piani operativi annuali",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_budget",
        "label": "Budget annuale",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_bilanci_infrannuali",
        "label": "Bilanci infrannuali/situation",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_piano_tesoreria",
        "label": "Piano tesoreria 6-12 mesi",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_dashboard_kpi",
        "label": "Dashboard KPI documentata",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_5",
    "macro": "i",
    "title": "I.5 IT e Comunicazione",
    "description": "",
    "fields": [
      {
        "id": "d_mappatura_it",
        "label": "Mappatura infrastruttura IT",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_dr_it",
        "label": "Piano Disaster Recovery IT",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_piano_marketing",
        "label": "Piano Marketing/Comunicazione",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_policy_social",
        "label": "Policy social media aziendali",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_doc_backup",
        "label": "Documentazione procedure backup",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_6",
    "macro": "i",
    "title": "I.6 Organizzazione e HR",
    "description": "",
    "fields": [
      {
        "id": "d_organigramma_sicurezza",
        "label": "Organigramma sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_funzionigramma_sicurezza",
        "label": "Funzionigramma sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_mog_81_2",
        "label": "MOG ex art. 30 D.Lgs. 81/08",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_mansionari",
        "label": "Mansionari dettagliati",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_policy_smartworking",
        "label": "Policy smart working/lavoro agile",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_contratti_outsourcing",
        "label": "Contratti outsourcing principali",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_procedure_operative",
        "label": "Procedure operative interne",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_7",
    "macro": "i",
    "title": "I.7 Contratti e Rapporti Esterni",
    "description": "",
    "fields": [
      {
        "id": "d_contratti_fornitori",
        "label": "Contratti fornitori strategici (top 5)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_contratti_clienti",
        "label": "Contratti clienti principali (top 10)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_accordi_partnership",
        "label": "Accordi partnership/collaborazione",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_policy_nda",
        "label": "Policy NDA/riservatezza",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_modelli_contratti",
        "label": "Modelli contratti",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_modelli_offerte",
        "label": "Modelli offerte",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_condizioni_generali",
        "label": "Condizioni generali",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_polizze",
        "label": "Polizze D&O, RC e coperture assicurative",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "i_8",
    "macro": "i",
    "title": "I.8 Certificazioni e Sostenibilità",
    "description": "",
    "fields": [
      {
        "id": "d_whistleblowing",
        "label": "Procedura whistleblowing (D.Lgs. 24/2023)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_certificazioni",
        "label": "Certificazioni ISO e audit report",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_sostenibilita",
        "label": "Report sostenibilità / ESG",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      },
      {
        "id": "d_matrice_poteri",
        "label": "Matrice poteri / sistema autorizzativo",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperirle",
          "Parzialmente disponibile",
          "Indisponibile"
        ]
      }
    ]
  },
  {
    "id": "j_1",
    "macro": "j",
    "title": "J.1 Governance e Compliance",
    "description": "",
    "fields": [
      {
        "id": "av_governance_adeguatezza",
        "label": "Come valuta complessivamente l'adeguatezza del sistema di governance della Società?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguato",
          "Parzialmente adeguato",
          "Da migliorare significativamente",
          "Inadeguato"
        ]
      },
      {
        "id": "av_governance_criticita",
        "label": "Principali criticità percepite nel sistema di governance",
        "type": "textarea",
        "required": true
      },
      {
        "id": "av_compliance_adeguatezza",
        "label": "Come valuta il livello di conformità normativa complessivo della Società?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguato",
          "Parzialmente adeguato",
          "Da migliorare significativamente",
          "Inadeguato"
        ]
      },
      {
        "id": "av_compliance_criticita",
        "label": "Principali aree di non conformità o criticità normative percepite",
        "type": "textarea",
        "required": true
      },
      {
        "id": "av_231_efficacia",
        "label": "Se adottato il Modello 231, come valuta la sua efficacia operativa?",
        "type": "select",
        "required": true,
        "options": [
          "Efficace e aggiornato",
          "Formalmente adeguato ma poco operativo",
          "Formalmente adeguato ma applicato",
          "Da aggiornare"
        ]
      },
      {
        "id": "av_privacy_adeguatezza",
        "label": "Come valuta il livello di adeguatezza della gestione della privacy?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguato",
          "Parzialmente adeguato",
          "Da migliorare significativamente",
          "Inadeguato"
        ]
      },
      {
        "id": "av_rischio_reputazionale",
        "label": "Come valuta il livello di rischio reputazionale della Società?",
        "type": "select",
        "required": true,
        "options": [
          "Basso",
          "Medio",
          "Alto"
        ]
      }
    ]
  },
  {
    "id": "j_2",
    "macro": "j",
    "title": "J.2 Organizzazione e Assetti",
    "description": "",
    "fields": [
      {
        "id": "av_assetti_org",
        "label": "Come valuta l'adeguatezza degli assetti organizzativi ex art. 2086 c.c.?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguati",
          "Parzialmente adeguati",
          "Da migliorare significativamente",
          "Inadeguati"
        ]
      },
      {
        "id": "av_assetti_amm",
        "label": "Come valuta l'adeguatezza degli assetti amministrativi?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguati",
          "Parzialmente adeguati",
          "Da migliorare significativamente",
          "Inadeguati"
        ]
      },
      {
        "id": "av_assetti_cont",
        "label": "Come valuta l'adeguatezza degli assetti contabili?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguati",
          "Parzialmente adeguati",
          "Da migliorare significativamente",
          "Inadeguati"
        ]
      },
      {
        "id": "av_continuita",
        "label": "Esistono segnali di rischio per la continuità aziendale?",
        "type": "select",
        "required": true,
        "options": [
          "No — nessun segnale",
          "Sì — segnali deboli monitorati",
          "Sì — criticità in corso",
          "Non valutato"
        ]
      },
      {
        "id": "av_risorse_umane",
        "label": "Come valuta l'adeguatezza delle risorse umane rispetto agli obiettivi aziendali?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguate",
          "Parzialmente adeguate",
          "Insufficienti"
        ]
      },
      {
        "id": "av_sistemi_it",
        "label": "Come valuta l'adeguatezza dei sistemi informativi e della sicurezza IT?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguati",
          "Parzialmente adeguati",
          "Da migliorare significativamente",
          "Inadeguati"
        ]
      },
      {
        "id": "av_digitalizzazione",
        "label": "Quali sono le aree in cui ritiene opportuna una maggiore digitalizzazione?",
        "type": "select",
        "required": true,
        "options": [
          "Adeguati",
          "Parzialmente adeguati",
          "Da migliorare significativamente",
          "Inadeguati"
        ]
      }
    ]
  },
  {
    "id": "j_3",
    "macro": "j",
    "title": "J.3 Priorità e Interventi",
    "description": "",
    "fields": [
      {
        "id": "av_priorita_1",
        "label": "Prima priorità di intervento individuata",
        "type": "textarea",
        "required": true
      },
      {
        "id": "av_priorita_2",
        "label": "Seconda priorità di intervento individuata",
        "type": "textarea",
        "required": true
      },
      {
        "id": "av_priorita_3",
        "label": "Terza priorità di intervento individuata",
        "type": "textarea",
        "required": true
      },
      {
        "id": "av_budget_compliance",
        "label": "È previsto un budget dedicato per attività di compliance e governance?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — adeguato",
          "Sì — insufficiente",
          "No",
          "In fase di valutazione"
        ]
      },
      {
        "id": "av_tempistiche",
        "label": "Tempistiche attese per l'implementazione degli interventi prioritari",
        "type": "select",
        "required": true,
        "options": [
          "Entro 3 mesi",
          "Entro 6 mesi",
          "Entro 12 mesi",
          "Oltre 12 mesi"
        ]
      },
      {
        "id": "av_supporto_esterno",
        "label": "Si ritiene necessario il supporto di consulenti esterni per gli interventi individuati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — per tutte le aree",
          "Sì — per alcune aree specifiche",
          "No — risorse interne sufficienti",
          "Da valutare dopo assessment"
        ]
      },
      {
        "id": "av_note_finali",
        "label": "Osservazioni finali e ulteriori elementi rilevanti non coperti dal questionario",
        "type": "textarea",
        "required": true
      }
    ]
  },
  {
    "id": "k_1",
    "macro": "k",
    "title": "K.1 Owner Macro Area A — Identità e Struttura",
    "description": "",
    "fields": [
      {
        "id": "owner_a_nome",
        "label": "Owner Macro Area A. Identità e Struttura — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_a_ruolo",
        "label": "Owner Macro Area A. Identità e Struttura — Ruolo/Funzione - Contatto mail",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_a_email",
        "label": "Owner Macro Area A. Identità e Struttura — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_a_validazione",
        "label": "Owner Macro Area A. Identità e Struttura — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_2",
    "macro": "k",
    "title": "K.2 Owner Macro Area B — Governance",
    "description": "",
    "fields": [
      {
        "id": "owner_b_nome",
        "label": "Owner Macro Area B. Governance — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_b_ruolo",
        "label": "Owner Macro Area B. Governance — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_b_email",
        "label": "Owner Macro Area B. Governance — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_b_validazione",
        "label": "Owner Macro Area B. Governance — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_3",
    "macro": "k",
    "title": "K.3 Owner Macro Area C — Organizzazione",
    "description": "",
    "fields": [
      {
        "id": "owner_c_nome",
        "label": "Owner Macro Area C. Organizzazione — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_c_ruolo",
        "label": "Owner Macro Area C. Organizzazione — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_c_email",
        "label": "Owner Macro Area C. Organizzazione — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_c_validazione",
        "label": "Owner Macro Area C. Organizzazione — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_4",
    "macro": "k",
    "title": "K.4 Owner Macro Area D — Compliance e Controlli",
    "description": "",
    "fields": [
      {
        "id": "owner_d_nome",
        "label": "Owner Macro Area D. Compliance e Controlli — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_d_ruolo",
        "label": "Owner Macro Area D. Compliance e Controlli — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_d_email",
        "label": "Owner Macro Area D. Compliance e Controlli — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_d_validazione",
        "label": "Owner Macro Area D. Compliance e Controlli — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_5",
    "macro": "k",
    "title": "K.5 Owner Macro Area E — Rapporti con la PA",
    "description": "",
    "fields": [
      {
        "id": "owner_e_nome",
        "label": "Owner Macro Area E. Rapporti con la PA — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_e_ruolo",
        "label": "Owner Macro Area E. Rapporti con la PA — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_e_email",
        "label": "Owner Macro Area E. Rapporti con la PA — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_e_validazione",
        "label": "Owner Macro Area E. Rapporti con la PA — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_6",
    "macro": "k",
    "title": "K.6 Owner Macro Area F — Risk Management",
    "description": "",
    "fields": [
      {
        "id": "owner_f_nome",
        "label": "Owner Macro Area F. Risk Management — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_f_ruolo",
        "label": "Owner Macro Area F. Risk Management — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_f_email",
        "label": "Owner Macro Area F. Risk Management — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_f_validazione",
        "label": "Owner Macro Area F. Risk Management — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_7",
    "macro": "k",
    "title": "K.7 Owner Macro Area G — Rapporti Esterni",
    "description": "",
    "fields": [
      {
        "id": "owner_g_nome",
        "label": "Owner Macro Area G. Rapporti Esterni — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_g_ruolo",
        "label": "Owner Macro Area G. Rapporti Esterni — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_g_email",
        "label": "Owner Macro Area G. Rapporti Esterni — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_g_validazione",
        "label": "Owner Macro Area G. Rapporti Esterni — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_8",
    "macro": "k",
    "title": "K.8 Owner Macro Area H — Adeguati Assetti",
    "description": "",
    "fields": [
      {
        "id": "owner_h_nome",
        "label": "Owner Macro Area H. Adeguati Assetti — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_h_ruolo",
        "label": "Owner Macro Area H. Adeguati Assetti — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_h_email",
        "label": "Owner Macro Area H. Adeguati Assetti — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_h_validazione",
        "label": "Owner Macro Area H. Adeguati Assetti — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_9",
    "macro": "k",
    "title": "K.9 Owner Macro Area I — Documentazione",
    "description": "",
    "fields": [
      {
        "id": "owner_i_nome",
        "label": "Owner Macro Area I. Documentazione — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_i_ruolo",
        "label": "Owner Macro Area I. Documentazione — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_i_email",
        "label": "Owner Macro Area I. Documentazione — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_i_validazione",
        "label": "Owner Macro Area I. Documentazione — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  },
  {
    "id": "k_10",
    "macro": "k",
    "title": "K.10 Owner Macro Area J — Autovalutazione",
    "description": "",
    "fields": [
      {
        "id": "owner_j_nome",
        "label": "Owner Macro Area J. Autovalutazione — Nome e Cognome",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_j_ruolo",
        "label": "Owner Macro Area J. Autovalutazione — Ruolo/Funzione",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_j_email",
        "label": "Owner Macro Area J. Autovalutazione — Email",
        "type": "text",
        "required": true
      },
      {
        "id": "owner_j_validazione",
        "label": "Owner Macro Area J. Autovalutazione — Data validazione dati",
        "type": "text",
        "required": true
      }
    ]
  }
];

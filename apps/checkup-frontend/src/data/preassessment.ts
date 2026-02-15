export type FieldType = string;

export interface FieldSpec {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  help?: string;
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
    "label": "Identità e Struttura",
    "color": "#6366f1"
  },
  {
    "id": "b",
    "label": "Governance",
    "color": "#8b5cf6"
  },
  {
    "id": "c",
    "label": "Organizzazione",
    "color": "#0ea5e9"
  },
  {
    "id": "d",
    "label": "Compliance e Controlli",
    "color": "#f59e0b"
  },
  {
    "id": "e",
    "label": "Risk Management",
    "color": "#ef4444"
  },
  {
    "id": "f",
    "label": "Rapporti Esterni",
    "color": "#10b981"
  },
  {
    "id": "g",
    "label": "Adeguati Assetti",
    "color": "#7c3aed"
  },
  {
    "id": "h",
    "label": "Documentazione",
    "color": "#64748b"
  }
];

export const SECTIONS: SectionSpec[] = [
  {
    "id": "a_1",
    "macro": "a",
    "title": "Anagrafica Societaria",
    "description": "",
    "fields": [
      {
        "id": "ragione_sociale",
        "label": "Ragione sociale",
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
        ],
        "help": "Seleziona la forma giuridica come da statuto/visura camerale."
      },
      {
        "id": "sede_legale",
        "label": "Sede legale",
        "type": "text",
        "required": true
      },
      {
        "id": "sedi_operative",
        "label": "Sedi operative (elencare tutte con indirizzo)",
        "type": "textarea",
        "required": false,
        "help": "Elenca tutte le sedi operative con indirizzo e attività svolta."
      },
      {
        "id": "cf_piva",
        "label": "Codice fiscale / Partita IVA",
        "type": "text",
        "required": true
      },
      {
        "id": "rea",
        "label": "N. iscrizione REA / Registro Imprese",
        "type": "text",
        "required": false,
        "help": "Numero REA riportato in visura camerale (CCIAA competente)."
      },
      {
        "id": "ateco",
        "label": "Codice/i ATECO e descrizione attività",
        "type": "text",
        "required": true,
        "help": "Indica i codici e la descrizione come da visura camerale; specifica il codice primario e gli eventuali secondari."
      },
      {
        "id": "anno_costituzione",
        "label": "Anno di costituzione",
        "type": "text",
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
        "label": "Compagine societaria (soci, quote %, diritti particolari)",
        "type": "textarea",
        "required": true,
        "help": "Elenca soci, percentuali, categorie di quote/azioni e diritti particolari (es. voto plurimo, privilegi)."
      },
      {
        "id": "patti_parasociali",
        "label": "Esistono patti parasociali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ],
        "help": "Verifica accordi tra soci (voto, trasferimenti, sindacati di blocco/consultazione) e relativa durata."
      },
      {
        "id": "patti_dettaglio",
        "label": "Se sì, oggetto e durata dei patti parasociali",
        "type": "textarea",
        "required": false,
        "help": "Specifica oggetto, durata, clausole di voto/trasferimento e data di sottoscrizione."
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
        "required": false,
        "options": [
          "In crescita",
          "Stabile",
          "In calo",
          "Non disponibile"
        ],
        "help": "Valuta l’andamento degli ultimi 3 esercizi; se non disponibile, indica “Non disponibile”."
      },
      {
        "id": "attivo_patrimoniale",
        "label": "Totale attivo stato patrimoniale (€)",
        "type": "text",
        "required": false,
        "help": "Totale attivo da stato patrimoniale dell’ultimo bilancio approvato."
      },
      {
        "id": "patrimonio_netto",
        "label": "Patrimonio netto (€)",
        "type": "text",
        "required": false,
        "help": "Valore del patrimonio netto da ultimo bilancio."
      },
      {
        "id": "indebitamento",
        "label": "Posizione finanziaria netta (€)",
        "type": "text",
        "required": false,
        "help": "PFN = debiti finanziari meno disponibilità liquide; inserisci il dato da ultimo bilancio o reporting."
      },
      {
        "id": "num_dipendenti",
        "label": "Numero totale dipendenti",
        "type": "text",
        "required": true
      },
      {
        "id": "mercati",
        "label": "Mercati di riferimento (Italia %, estero %, paesi principali)",
        "type": "textarea",
        "required": true,
        "help": "Indica % Italia/estero e principali Paesi/settori di riferimento."
      },
      {
        "id": "clienti_principali",
        "label": "Concentrazione clientela (% fatturato top 5 clienti)",
        "type": "text",
        "required": false,
        "help": "Indica la % del fatturato dei top 5 clienti; >50% segnala elevata dipendenza commerciale."
      },
      {
        "id": "fornitori_principali",
        "label": "Concentrazione fornitori (% acquisti top 5 fornitori)",
        "type": "text",
        "required": false,
        "help": "Indica % acquisti dei top 5 fornitori; segnala eventuale dipendenza critica."
      }
    ]
  },
  {
    "id": "a_2",
    "macro": "a",
    "title": "Struttura Societaria",
    "description": "",
    "fields": [
      {
        "id": "gruppo_app",
        "label": "Appartiene a un gruppo societario?",
        "type": "select",
        "required": true,
        "options": [
          "No — società singola",
          "Sì — capogruppo",
          "Sì — controllata",
          "Sì — collegata",
          "Sì — partecipata"
        ],
        "help": "Indica se esiste un gruppo e il ruolo della società (capogruppo/controllata/collegata)."
      },
      {
        "id": "capogruppo",
        "label": "Se controllata/collegata: denominazione e sede capogruppo",
        "type": "text",
        "required": false,
        "help": "Denominazione completa e sede della capogruppo; utile anche CF/P.IVA."
      },
      {
        "id": "societa_controllate",
        "label": "Società controllate (denominazione, sede, % partecipazione, attività)",
        "type": "textarea",
        "required": false,
        "help": "Elenca società controllate con sede, % partecipazione e attività."
      },
      {
        "id": "societa_collegate",
        "label": "Società collegate e partecipazioni",
        "type": "textarea",
        "required": false,
        "help": "Elenca società collegate/partecipate con % e natura del rapporto."
      },
      {
        "id": "direzione_coordinamento",
        "label": "Attività di direzione e coordinamento ex art. 2497 c.c.?",
        "type": "select",
        "required": false,
        "options": [
          "Sì — esercitata",
          "Sì — subita",
          "No",
          "Non applicabile"
        ],
        "help": "Se la società esercita o subisce direzione e coordinamento (art. 2497 c.c.); indica la capogruppo."
      },
      {
        "id": "rapporti_infragruppo",
        "label": "Rapporti infragruppo rilevanti (servizi, finanziamenti, garanzie)",
        "type": "textarea",
        "required": false,
        "help": "Esempi: cash pooling, servizi condivisi, finanziamenti, garanzie; indica se formalizzati."
      },
      {
        "id": "contratti_infragruppo",
        "label": "Contratti infragruppo formalizzati?",
        "type": "select",
        "required": false,
        "options": [
          "Sì — tutti",
          "Sì — parzialmente",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se i rapporti infragruppo sono regolati da contratti scritti."
      },
      {
        "id": "consolidato",
        "label": "Viene redatto il bilancio consolidato?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se il bilancio consolidato è redatto e da quale esercizio."
      }
    ]
  },
  {
    "id": "b_1",
    "macro": "b",
    "title": "Organi Sociali",
    "description": "",
    "fields": [
      {
        "id": "sistema_amm",
        "label": "Sistema di amministrazione",
        "type": "select",
        "required": true,
        "options": [
          "Amministratore Unico",
          "CdA con Presidente e AD",
          "CdA con AD",
          "CdA collegiale senza deleghe",
          "CdA con Comitato Esecutivo",
          "Sistema dualistico",
          "Sistema monistico"
        ]
      },
      {
        "id": "cda_composizione",
        "label": "Composizione CdA (nomi, cariche, indipendenti, esecutivi/non esecutivi)",
        "type": "textarea",
        "required": true,
        "help": "Indica membri, cariche, indipendenti, esecutivi/non esecutivi e scadenza."
      },
      {
        "id": "cda_scadenza",
        "label": "Scadenza mandato CdA",
        "type": "text",
        "required": true
      },
      {
        "id": "presidente",
        "label": "Presidente CdA (nome, poteri)",
        "type": "text",
        "required": false
      },
      {
        "id": "ad",
        "label": "Amministratore/i Delegato/i (nome, poteri conferiti)",
        "type": "textarea",
        "required": false,
        "help": "Indica poteri delegati e limiti; utile riportare la delibera CdA o procure collegate."
      },
      {
        "id": "dg",
        "label": "Direttore Generale (se nominato, poteri)",
        "type": "textarea",
        "required": false
      },
      {
        "id": "comitati_cda",
        "label": "Comitati interni al CdA",
        "type": "textarea",
        "required": false,
        "help": "Specifica comitati (audit, rischi, remunerazione) e componenti."
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
          "Sì — nella maggior parte",
          "Raramente",
          "No"
        ],
        "help": "Verifica che i verbali siano firmati e conservati in modo regolare."
      },
      {
        "id": "organo_controllo",
        "label": "Organo di controllo",
        "type": "select",
        "required": true,
        "options": [
          "Collegio Sindacale",
          "Sindaco Unico",
          "Nessuno (sotto soglie art. 2477 c.c.)",
          "Non applicabile"
        ],
        "help": "Verifica soglie art. 2477 c.c. (attivo >4M, ricavi >4M, dip. >20) e se la nomina è obbligatoria."
      },
      {
        "id": "organo_controllo_comp",
        "label": "Composizione organo di controllo",
        "type": "textarea",
        "required": false,
        "help": "Indica componenti, qualifica e durata dell’incarico."
      },
      {
        "id": "revisore",
        "label": "Revisione legale dei conti",
        "type": "select",
        "required": true,
        "options": [
          "Società di revisione",
          "Revisore legale persona fisica",
          "Collegio Sindacale (funzione integrata)",
          "Non prevista"
        ]
      },
      {
        "id": "revisore_dettaglio",
        "label": "Dettaglio revisore (denominazione, scadenza)",
        "type": "textarea",
        "required": false,
        "help": "Indica società/revisore, data nomina e scadenza incarico."
      },
      {
        "id": "assemblea_freq",
        "label": "N. assemblee soci nell'ultimo triennio",
        "type": "text",
        "required": false,
        "help": "Numero assemblee ordinarie/straordinarie nel triennio."
      }
    ]
  },
  {
    "id": "b_3",
    "macro": "b",
    "title": "Procure, Deleghe e Poteri",
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
        "label": "Elenco procure notarili (procuratore, poteri, limiti, data conferimento)",
        "type": "textarea",
        "required": true,
        "help": "Indica procuratore, poteri, limiti, durata e data conferimento."
      },
      {
        "id": "procure_non_notarili",
        "label": "Procure NON notarili in essere",
        "type": "textarea",
        "required": false,
        "help": "Includi deleghe interne o procure semplici non notarili."
      },
      {
        "id": "deleghe_funzione",
        "label": "Deleghe di funzione formali (sicurezza, ambiente, privacy, qualità)",
        "type": "textarea",
        "required": true,
        "help": "Devono essere scritte, con data certa, poteri/mezzi adeguati e accettazione del delegato."
      },
      {
        "id": "deleghe_operative",
        "label": "Deleghe operative interne (autorizzazioni spesa, firme, ordini)",
        "type": "textarea",
        "required": true
      },
      {
        "id": "limiti_spesa",
        "label": "Matrice limiti di spesa per livello/funzione",
        "type": "textarea",
        "required": true,
        "help": "Specifica soglie per ruolo/funzione (es. 5k, 20k, 100k) e regole di firma congiunta."
      },
      {
        "id": "firma_congiunta",
        "label": "Meccanismi di firma congiunta?",
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
        "label": "Dettaglio firma congiunta (soglie, soggetti)",
        "type": "textarea",
        "required": false,
        "help": "Specifica soglie, combinazioni di firma e casi applicabili."
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
        ],
        "help": "Indica tipologia (FEQ/FES) e provider utilizzato."
      },
      {
        "id": "firme_bancarie",
        "label": "Firme bancarie autorizzate (soggetti, limiti, singola/congiunta)",
        "type": "textarea",
        "required": true,
        "help": "Elenca soggetti autorizzati e limiti di operatività."
      },
      {
        "id": "registro_procure",
        "label": "Registro centralizzato delle procure?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ],
        "help": "Indica se esiste un registro unico con aggiornamenti periodici."
      },
      {
        "id": "ultima_revisione_procure",
        "label": "Data ultima revisione sistematica delle procure",
        "type": "text",
        "required": false,
        "help": "Data dell’ultima verifica complessiva delle procure."
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
          "Incongruenze note"
        ],
        "help": "Verifica coerenza tra procure, statuto e delibere CdA."
      }
    ]
  },
  {
    "id": "b_4",
    "macro": "b",
    "title": "Conflitto di Interessi",
    "description": "",
    "fields": [
      {
        "id": "policy_cdi",
        "label": "Policy sul conflitto di interessi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata e diffusa",
          "Sì — solo formale",
          "No",
          "In redazione"
        ]
      },
      {
        "id": "registro_cdi",
        "label": "Registro dei conflitti di interesse?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ]
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
        ],
        "help": "Prevedi dichiarazione preventiva e aggiornamenti periodici; indica se esiste modulo/policy."
      },
      {
        "id": "operazioni_parti_correlate",
        "label": "Procedura operazioni con parti correlate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formalizzata",
          "Solo prassi informale",
          "No",
          "Non applicabile"
        ],
        "help": "Procedura che disciplina approvazioni, soglie e disclosure."
      },
      {
        "id": "parti_correlate_elenco",
        "label": "Operazioni significative con parti correlate (ultimo triennio)",
        "type": "textarea",
        "required": false,
        "help": "Indica operazioni rilevanti e importi nel triennio."
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
        ],
        "help": "Indica incarichi potenzialmente confliggenti."
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
        ],
        "help": "Indica se presente in statuto/contratto, durata e ambito; rilevante per amministratori/dirigenti."
      },
      {
        "id": "episodi_cdi",
        "label": "Episodi di conflitto di interessi rilevati?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Sospetti non formalizzati"
        ]
      },
      {
        "id": "episodi_cdi_det",
        "label": "Se sì, descrivere sinteticamente",
        "type": "textarea",
        "required": false,
        "help": "Descrivi episodi, soggetti coinvolti e misure adottate."
      }
    ]
  },
  {
    "id": "c_1",
    "macro": "c",
    "title": "Struttura Organizzativa",
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
        ],
        "help": "Indica se l’organigramma è formalizzato e aggiornato."
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
        "help": "Specifica se esistono job description per ruoli chiave."
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
        "required": false
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
        "help": "Segregation of Duties: chi autorizza, chi esegue, chi controlla; utile matrice per processi critici."
      },
      {
        "id": "procedure_operative",
        "label": "Procedure operative interne formalizzate (elencare)",
        "type": "textarea",
        "required": true,
        "help": "Elenca procedure critiche (ciclo attivo/passivo, HR, IT, acquisti)."
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
        ],
        "help": "Indica la frequenza e il processo di revisione."
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
        ],
        "help": "Indica se esistono workflow, verbali o sistemi digitali di tracciamento."
      },
      {
        "id": "erp",
        "label": "Sistema ERP / gestionale in uso",
        "type": "text",
        "required": false
      },
      {
        "id": "strumenti_digitali",
        "label": "Altri strumenti digitali (CRM, HR, workflow, DMS)",
        "type": "textarea",
        "required": false
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
        "help": "Specificare struttura e periodicità delle verifiche."
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
        "help": "Indicare se esiste funzione dedicata o integrata in Legal."
      }
    ]
  },
  {
    "id": "c_2",
    "macro": "c",
    "title": "Lavoratori Dipendenti",
    "description": "",
    "fields": [
      {
        "id": "dip_totale",
        "label": "Numero totale dipendenti (FTE)",
        "type": "text",
        "required": true
      },
      {
        "id": "dip_dirigenti",
        "label": "di cui dirigenti",
        "type": "text",
        "required": false
      },
      {
        "id": "dip_quadri",
        "label": "di cui quadri",
        "type": "text",
        "required": false
      },
      {
        "id": "dip_impiegati",
        "label": "di cui impiegati",
        "type": "text",
        "required": false
      },
      {
        "id": "dip_operai",
        "label": "di cui operai",
        "type": "text",
        "required": false
      },
      {
        "id": "dip_determinato",
        "label": "Contratti a tempo determinato (numero)",
        "type": "text",
        "required": false
      },
      {
        "id": "dip_interinali",
        "label": "Lavoratori somministrati (numero)",
        "type": "text",
        "required": false
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
        ],
        "help": "Indica clima e presenza di contenziosi o trattative aperte."
      },
      {
        "id": "rsa_rsu",
        "label": "RSA/RSU presenti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — RSU",
          "Sì — RSA",
          "No"
        ],
        "help": "Se presenti, indicare numero e sigle principali."
      },
      {
        "id": "contenziosi_lavoro",
        "label": "Contenziosi giuslavoristici in corso",
        "type": "textarea",
        "required": false,
        "help": "Riporta natura e stato dei contenziosi."
      },
      {
        "id": "turnover",
        "label": "Tasso di turnover annuo (%)",
        "type": "text",
        "required": false,
        "help": "Calcolo su base annua: uscite/organico medio."
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
        "help": "Indica benefit e strumenti (sanità, flexible benefit, premi)."
      },
      {
        "id": "smart_working",
        "label": "Policy smart working?",
        "type": "select",
        "required": false,
        "options": [
          "Sì — formalizzata",
          "Sì — informale",
          "No",
          "Non applicabile"
        ],
        "help": "Se presente, indicare policy e accordi individuali/collettivi."
      },
      {
        "id": "codice_disciplinare",
        "label": "Codice disciplinare affisso e aggiornato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non so"
        ],
        "help": "Verifica affissione e aggiornamento (art. 7 Statuto Lavoratori)."
      },
      {
        "id": "formazione_obbligatoria",
        "label": "Formazione obbligatoria regolarmente erogata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutta aggiornata",
          "Sì — parzialmente",
          "No — lacune significative"
        ],
        "help": "Indica copertura formativa e scadenze mancanti."
      }
    ]
  },
  {
    "id": "c_3",
    "macro": "c",
    "title": "Collaboratori Esterni",
    "description": "",
    "fields": [
      {
        "id": "collab_cococo",
        "label": "Collaboratori coordinati e continuativi (numero)",
        "type": "text",
        "required": false
      },
      {
        "id": "collab_autonomi",
        "label": "Collaboratori a P.IVA / professionisti ricorrenti (numero)",
        "type": "text",
        "required": false
      },
      {
        "id": "agenti",
        "label": "Agenti / rappresentanti (numero)",
        "type": "text",
        "required": false
      },
      {
        "id": "outsourcing",
        "label": "Attività esternalizzate (IT, contabilità, logistica, HR, ecc.)",
        "type": "textarea",
        "required": true,
        "help": "Indica attività esternalizzate e ragioni (IT, contabilità, HR)."
      },
      {
        "id": "outsourcing_contratti",
        "label": "Rapporti di outsourcing formalizzati con contratto?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti",
          "Sì — maggior parte",
          "Solo alcuni",
          "No"
        ],
        "help": "Specificare se tutti i rapporti sono contrattualizzati."
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
        ],
        "help": "Clausole che impongono rispetto del Modello 231 con facoltà di risoluzione; indicare se standard."
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
        ],
        "help": "Nomina ex art. 28 GDPR con istruzioni, misure, subfornitori e audit; indicare se presente."
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
        "help": "Processo di qualifica, DD e monitoraggio fornitori."
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
        ],
        "help": "Esistenza di albo e criteri di aggiornamento."
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
        "help": "Valuta se l’appalto è genuino (autonomia organizzativa e rischio d’impresa); altrimenti c’è rischio illecito."
      }
    ]
  },
  {
    "id": "d_1",
    "macro": "d",
    "title": "Modello 231/2001",
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
        ],
        "help": "Indica se deliberato da CdA/soci e se esistono Parte Generale e Parti Speciali."
      },
      {
        "id": "m231_data_adozione",
        "label": "Data di prima adozione",
        "type": "text",
        "required": false,
        "help": "Data delibera di adozione del Modello 231."
      },
      {
        "id": "m231_ultimo_agg",
        "label": "Data ultimo aggiornamento",
        "type": "text",
        "required": true,
        "help": "Data ultimo aggiornamento e motivazione (nuovi reati, riorganizzazioni)."
      },
      {
        "id": "m231_reati",
        "label": "Famiglie di reati presupposto mappate",
        "type": "textarea",
        "required": true,
        "help": "Elenca le famiglie di reati effettivamente mappate nel risk assessment."
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
        ],
        "help": "Indica se OdV è attivo e da quando."
      },
      {
        "id": "odv_composizione",
        "label": "Composizione OdV (monocratico/collegiale, membri)",
        "type": "textarea",
        "required": false,
        "help": "Monocratico/collegiale; competenze e indipendenza."
      },
      {
        "id": "odv_budget",
        "label": "L'OdV dispone di budget autonomo?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non so"
        ],
        "help": "Indicare importo o disponibilità autonoma di spesa."
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
        ],
        "help": "Definisci chi invia, cosa e quando (es. operazioni sensibili, contenziosi, ispezioni)."
      },
      {
        "id": "flussi_odv_det",
        "label": "Dettaglio flussi (chi invia, cosa, frequenza)",
        "type": "textarea",
        "required": false,
        "help": "Specificare flussi (chi/che cosa/frequenza)."
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
        ],
        "help": "Deve prevedere sanzioni per dipendenti, dirigenti, amministratori e terzi contrattualizzati."
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
        ],
        "help": "Indica target, periodicità e modalità di erogazione."
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
        ],
        "help": "Indica se diffuso a dipendenti e terzi."
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
        ],
        "help": "Verifica allineamento tra mappatura rischi e sistema procure."
      },
      {
        "id": "procedimenti_231",
        "label": "Procedimenti ex D.Lgs. 231/2001?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in corso",
          "Sì — conclusi",
          "No"
        ],
        "help": "Indica stato, esito e reati contestati."
      }
    ]
  },
  {
    "id": "d_2",
    "macro": "d",
    "title": "Anticorruzione",
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
          "In redazione"
        ],
        "help": "Indica se policy è approvata, diffusa e applicata."
      },
      {
        "id": "anti_bribery_scope",
        "label": "Copre normative estere (FCPA, UK Bribery Act)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ]
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
        ],
        "help": "Indicare soglie, registro e approvazioni."
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
        ],
        "help": "Indicare criteri di approvazione e tracciamento."
      },
      {
        "id": "agenti_intermediari",
        "label": "Due diligence su agenti e intermediari?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — sistematica",
          "Sì — occasionale",
          "No",
          "Non applicabile"
        ],
        "help": "DD su agenti: verifica reputazione, beneficiari, compensi."
      },
      {
        "id": "rapporti_pa",
        "label": "Tipologia rapporti con la PA (appalti, autorizzazioni, contributi, concessioni, ispezioni)",
        "type": "textarea",
        "required": true,
        "help": "Dettaglia tipologia e intensità dei rapporti con PA."
      },
      {
        "id": "gare_appalti",
        "label": "Partecipa a gare d'appalto pubbliche?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — frequentemente",
          "Sì — occasionalmente",
          "No"
        ],
        "help": "Indica frequenza e valore medio delle gare."
      },
      {
        "id": "contributi_pubblici",
        "label": "Riceve contributi / finanziamenti pubblici?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "In passato"
        ],
        "help": "Indica tipologia ed ente erogante; rilevante per rischio indebita percezione o frode."
      }
    ]
  },
  {
    "id": "d_3",
    "macro": "d",
    "title": "Whistleblowing (D.Lgs. 24/2023)",
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
          "Non obbligatorio (<50 dip.)"
        ],
        "help": "Obbligatorio per aziende ≥50 dipendenti o con Modello 231; canale interno e riservato."
      },
      {
        "id": "wb_piattaforma",
        "label": "Se piattaforma digitale, quale? Garantisce anonimato e crittografia?",
        "type": "text",
        "required": false,
        "help": "Indica provider e requisiti di anonimato/criptazione."
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
        ],
        "help": "Soggetto incaricato della gestione e valutazione segnalazioni."
      },
      {
        "id": "wb_procedura",
        "label": "Procedura scritta per gestione segnalazioni?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completa",
          "Sì — da aggiornare",
          "No"
        ],
        "help": "Procedura con tempi, canali e tutela segnalante."
      },
      {
        "id": "wb_informativa",
        "label": "Dipendenti informati del canale e delle tutele?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formazione e comunicazione",
          "Sì — solo comunicazione scritta",
          "No"
        ],
        "help": "Comunicazioni e formazione al personale."
      },
      {
        "id": "wb_segnalazioni",
        "label": "Segnalazioni ricevute nell'ultimo biennio (numero)",
        "type": "text",
        "required": false,
        "help": "Indica numero segnalazioni e stato (aperte/chiuse)."
      },
      {
        "id": "wb_privacy_dpia",
        "label": "DPIA effettuata sul canale whistleblowing?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "DPIA richiesta se il canale comporta rischi elevati; indica se effettuata."
      }
    ]
  },
  {
    "id": "d_4",
    "macro": "d",
    "title": "Privacy e GDPR",
    "description": "",
    "fields": [
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
        "help": "Obbligatorio in casi previsti dall’art. 37 GDPR; indica interno/esterno e data nomina."
      },
      {
        "id": "registro_trattamenti",
        "label": "Registro trattamenti ex art. 30 GDPR?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ]
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
        "help": "Indica se esistono informative per dipendenti, clienti, fornitori e sito web."
      },
      {
        "id": "nomine_responsabili",
        "label": "Nomine responsabili trattamento ex art. 28 GDPR?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — tutti i fornitori",
          "Sì — principali",
          "No / parziale"
        ],
        "help": "Indica se sono formalizzate nomine con istruzioni e audit."
      },
      {
        "id": "dpia",
        "label": "DPIA (Valutazioni d'impatto) effettuate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — per tutti i trattamenti a rischio",
          "Sì — parziali",
          "No",
          "Non necessarie"
        ],
        "help": "Necessaria per trattamenti ad alto rischio (es. videosorveglianza, profilazione, dati sanitari)."
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
        "help": "Tecniche/organizzative (accessi, cifratura, backup, logging)."
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
        "help": "Procedura con tempi 72h per notifica al Garante; indica ruoli e flusso interno."
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
        ],
        "help": "Indicare Paesi e garanzie (SCC, BCR, decisioni adeguatezza)."
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
        ],
        "help": "Indica periodicità e target (HR, IT, marketing, ecc.)."
      },
      {
        "id": "sanzioni_garante",
        "label": "Sanzioni del Garante Privacy ricevute?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Procedimenti in corso"
        ],
        "help": "Dettaglia procedimenti e importi eventualmente comminati."
      },
      {
        "id": "videosorveglianza",
        "label": "Impianti di videosorveglianza?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — autorizzati ITL/accordo sindacale",
          "Sì — non autorizzati",
          "No"
        ],
        "help": "Serve accordo sindacale o autorizzazione ITL; conservazione immagini limitata nel tempo."
      }
    ]
  },
  {
    "id": "d_5",
    "macro": "d",
    "title": "IT e Comunicazione",
    "description": "",
    "fields": [
      {
        "id": "it_infrastruttura_server",
        "label": "L'impresa dispone di server fisici o virtuali dedicati?",
        "type": "select",
        "required": true,
        "options": [
          "Server fisici on-premise",
          "Server virtuali on-premise",
          "Cloud (AWS/Azure/Google)",
          "Hosting esterno",
          "Nessun server dedicato"
        ],
        "help": "Specificare on-premise, cloud o hosting e principali provider."
      },
      {
        "id": "it_workstation",
        "label": "Numero di workstation/PC in dotazione al personale",
        "type": "text",
        "required": true,
        "help": "Numero totale PC/terminali aziendali in uso."
      },
      {
        "id": "it_dispositivi_mobili",
        "label": "L'impresa fornisce dispositivi mobili aziendali (smartphone, tablet, laptop)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, a tutti",
          "Sì, solo ad alcuni ruoli",
          "No",
          "Non applicabile"
        ],
        "help": "Indica dotazione e policy di sicurezza (MDM, cifratura)."
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
        ],
        "help": "Se consentito, serve policy, MDM, separazione dati e misure di sicurezza dedicate."
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
          "No"
        ],
        "help": "Indica software e grado di integrazione tra funzioni."
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
        ],
        "help": "Indica software e processi coperti (vendite, post‑vendita)."
      },
      {
        "id": "it_backup",
        "label": "È attivo un sistema di backup dei dati aziendali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, automatico e quotidiano",
          "Sì, periodico",
          "Sì, manuale",
          "No",
          "Non so"
        ],
        "help": "Frequenza, retention e test di ripristino."
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
        "help": "Indica se esiste piano BCP/DR con RTO/RPO e test periodici."
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
        ],
        "help": "Indica soluzione e modalità di aggiornamento."
      },
      {
        "id": "it_firewall",
        "label": "La rete aziendale è protetta da firewall?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, firewall hardware",
          "Sì, firewall software",
          "Sì, entrambi",
          "No",
          "Non so"
        ],
        "help": "Indica tipologia e gestione (interna/outsourced)."
      },
      {
        "id": "it_responsabile",
        "label": "È presente un Responsabile IT/CTO formalmente incaricato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno/consulente",
          "No, gestione informale",
          "Non applicabile"
        ],
        "help": "Figura incaricata e responsabilità assegnate."
      },
      {
        "id": "it_amministratore_sistema",
        "label": "È stato nominato un Amministratore di Sistema ai sensi delle normative vigenti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno",
          "No",
          "Non necessario"
        ],
        "help": "Nomina formale con elenco aggiornato e logging accessi (Provv. Garante 27/11/2008)."
      },
      {
        "id": "it_helpdesk",
        "label": "È attivo un servizio di assistenza IT (helpdesk) per il personale?",
        "type": "select",
        "required": false,
        "options": [
          "Sì, interno",
          "Sì, esterno",
          "Sì, misto",
          "No"
        ],
        "help": "Indica canali di supporto e SLA interni."
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
        ],
        "help": "Indica frequenza e contenuti (phishing, password, GDPR)."
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
        ],
        "help": "Indica se esiste piano, obiettivi e budget."
      },
      {
        "id": "com_responsabile_marketing",
        "label": "È presente un Responsabile Marketing/Comunicazione formalmente incaricato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì, interno",
          "Sì, esterno/agenzia",
          "No, gestione informale",
          "Non applicabile"
        ],
        "help": "Indicare ruolo interno o agenzia esterna."
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
        ],
        "help": "Indica se aggiornato e conforme privacy/cookie."
      },
      {
        "id": "com_social_media",
        "label": "L'impresa è presente sui social media?",
        "type": "select",
        "required": false,
        "options": [
          "LinkedIn",
          "Facebook",
          "Instagram",
          "Twitter/X",
          "YouTube",
          "TikTok",
          "Altro",
          "Nessuno"
        ],
        "help": "Indica piattaforme attive e gestione contenuti."
      },
      {
        "id": "com_social_policy",
        "label": "Esiste una policy aziendale per l'uso dei social media?",
        "type": "select",
        "required": false,
        "options": [
          "Sì, formalizzata",
          "Sì, informale",
          "No",
          "Non applicabile"
        ],
        "help": "Indica policy interna e approvazione contenuti."
      },
      {
        "id": "com_newsletter",
        "label": "L'impresa gestisce newsletter o comunicazioni periodiche ai clienti/stakeholder?",
        "type": "select",
        "required": false,
        "options": [
          "Sì, regolarmente",
          "Sì, occasionalmente",
          "No",
          "In progetto"
        ],
        "help": "Indica periodicità e base giuridica per invio."
      }
    ]
  },
  {
    "id": "d_6",
    "macro": "d",
    "title": "Sicurezza sul Lavoro",
    "description": "",
    "fields": [
      {
        "id": "dvr",
        "label": "DVR redatto e aggiornato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — aggiornato",
          "Sì — non aggiornato",
          "No"
        ],
        "help": "Documento obbligatorio e indelegabile; indica data ultimo aggiornamento e soggetti coinvolti."
      },
      {
        "id": "dvr_data",
        "label": "Data ultimo aggiornamento DVR",
        "type": "text",
        "required": false
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
        ],
        "help": "Indica nominativo, interno/esterno e data nomina."
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
        ],
        "help": "Indica nominativo e periodicità sorveglianza sanitaria."
      },
      {
        "id": "rls",
        "label": "RLS eletto/designato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Indica modalità di elezione/designazione e durata incarico."
      },
      {
        "id": "delega_81",
        "label": "Delega di funzioni ex art. 16 D.Lgs. 81/08?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — formale con requisiti di legge",
          "Sì — informale",
          "No"
        ],
        "help": "Valida solo se scritta, accettata, con poteri e risorse adeguate."
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
        ],
        "help": "Indica se tutte le figure hanno formazione aggiornata."
      },
      {
        "id": "infortuni",
        "label": "Infortuni nell'ultimo triennio (numero e gravità)",
        "type": "textarea",
        "required": false,
        "help": "Indica numero e gravità; utile distinguere infortuni lievi/gravi."
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
        ],
        "help": "Indica esiti e prescrizioni eventualmente ricevute."
      },
      {
        "id": "sanzioni_81",
        "label": "Sanzioni ricevute ex D.Lgs. 81/08?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Indica eventuali sanzioni e stato dei procedimenti."
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
        ],
        "help": "Indica prove di evacuazione e aggiornamenti del piano."
      }
    ]
  },
  {
    "id": "d_7",
    "macro": "d",
    "title": "Certificazioni ISO e Standard",
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
        ],
        "help": "Indica ente certificatore e data scadenza."
      },
      {
        "id": "iso_14001",
        "label": "ISO 14001 (Ambiente)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "Non certificata",
          "Non applicabile"
        ],
        "help": "Indica ente certificatore e validità."
      },
      {
        "id": "iso_45001",
        "label": "ISO 45001 (Sicurezza sul lavoro)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "Non certificata",
          "Non applicabile"
        ],
        "help": "Indica ente certificatore e validità."
      },
      {
        "id": "iso_27001",
        "label": "ISO 27001 (Sicurezza informazioni)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "Non certificata",
          "Non applicabile"
        ],
        "help": "Indica ente certificatore e perimetro certificato."
      },
      {
        "id": "iso_37001",
        "label": "ISO 37001 (Anticorruzione)",
        "type": "select",
        "required": true,
        "options": [
          "Certificata",
          "In fase di certificazione",
          "Non certificata",
          "Non applicabile"
        ],
        "help": "Standard anticorruzione; utile se operi con PA o in mercati a rischio."
      },
      {
        "id": "rating_legalita",
        "label": "Rating di legalità AGCM",
        "type": "select",
        "required": true,
        "options": [
          "Ottenuto",
          "Richiesto",
          "Non richiesto",
          "Non applicabile"
        ],
        "help": "Richiede fatturato ≥2M e requisiti di legalità; indica se ottenuto o richiesto."
      },
      {
        "id": "altre_certificazioni",
        "label": "Altre certificazioni / accreditamenti di settore",
        "type": "textarea",
        "required": false,
        "help": "Elenca altre certificazioni rilevanti (settoriali)."
      },
      {
        "id": "nc_aperte",
        "label": "Non conformità aperte dall'ultimo audit?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — maggiori",
          "Sì — solo minori",
          "No"
        ],
        "help": "Indica numero e stato delle non conformità."
      }
    ]
  },
  {
    "id": "d_7b",
    "macro": "d",
    "title": "Sostenibilità e ESG",
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
        ],
        "help": "Indica autorizzazioni ambientali possedute e scadenze."
      },
      {
        "id": "rifiuti",
        "label": "Gestione rifiuti conforme?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — conforme",
          "Sì — parzialmente",
          "Non conforme",
          "Non applicabile"
        ],
        "help": "Descrivi processo di gestione e tracciabilità (FIR, registri)."
      },
      {
        "id": "emissioni",
        "label": "Monitoraggio emissioni CO2 (Scope 1-2-3)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — Scope 1-2-3",
          "Sì — solo Scope 1-2",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se monitori Scope 1/2/3 e metodologia."
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
        "help": "Indica standard usato (GRI/ESRS) e periodicità."
      },
      {
        "id": "csrd",
        "label": "Soggetta alla CSRD?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — già in obbligo",
          "Sì — dal prossimo esercizio",
          "No",
          "Non so"
        ],
        "help": "Direttiva 2022/2464/UE: verifica se rientra per dimensione o gruppo."
      },
      {
        "id": "due_diligence_esg",
        "label": "Due diligence ESG sulla catena di fornitura?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — strutturata",
          "Sì — parziale",
          "No",
          "Non applicabile"
        ],
        "help": "Verifica ESG su fornitori e supply chain."
      },
      {
        "id": "sanzioni_ambientali",
        "label": "Sanzioni ambientali ricevute?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Procedimenti in corso"
        ],
        "help": "Indica eventuali sanzioni/controlli in corso."
      },
      {
        "id": "obiettivi_sostenibilita",
        "label": "Obiettivi di sostenibilità formalizzati (SDGs, net-zero)?",
        "type": "textarea",
        "required": false,
        "help": "Indica obiettivi misurabili e KPI."
      }
    ]
  },
  {
    "id": "e_1",
    "macro": "e",
    "title": "Risk Assessment",
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
        "help": "Specificare framework (ISO 31000, COSO ERM) o metodologia adottata."
      },
      {
        "id": "risk_owner",
        "label": "Responsabile del risk management",
        "type": "text",
        "required": true,
        "help": "Indica funzione o persona responsabile del risk management."
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
        "help": "Data ultima mappatura e metodologia usata."
      },
      {
        "id": "risk_categories",
        "label": "Categorie di rischio identificate (strategico, operativo, finanziario, compliance, reputazionale)",
        "type": "textarea",
        "required": true,
        "help": "Elenca principali rischi (operativi, legali, finanziari, ESG, IT)."
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
        "help": "Definisce livelli di rischio accettabili e limiti; normalmente approvato dal CdA."
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
        "help": "Indica se esiste BCP testato e data ultimo test."
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
        "help": "Indica RTO/RPO e ultimo test eseguito."
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
        ],
        "help": "Indica data ultimo assessment e principali esiti."
      },
      {
        "id": "rischio_frode",
        "label": "Valutazione rischio frode effettuata?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Indica se è stato valutato e mitigato (controlli antifrode)."
      }
    ]
  },
  {
    "id": "e_2",
    "macro": "e",
    "title": "Assicurazioni e Coperture",
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
        "help": "Copre responsabilità personali di amministratori e sindaci; indica massimale e franchigia."
      },
      {
        "id": "do_massimale",
        "label": "Massimale D&O e principali esclusioni",
        "type": "textarea",
        "required": false
      },
      {
        "id": "polizza_rc",
        "label": "Polizza RC verso terzi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Indica massimale e principali esclusioni."
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
        ],
        "help": "Indica massimale e coperture (data breach, business interruption)."
      },
      {
        "id": "polizza_rc_prodotto",
        "label": "Polizza RC Prodotto?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica copertura per danni da prodotto e massimali."
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
        ],
        "help": "Analisi scostamenti tra rischi e coperture assicurative."
      }
    ]
  },
  {
    "id": "e_3",
    "macro": "e",
    "title": "Contenzioso e Procedimenti",
    "description": "",
    "fields": [
      {
        "id": "cont_civili",
        "label": "Contenziosi civili in corso (numero e valore indicativo)",
        "type": "textarea",
        "required": true,
        "help": "Indica oggetto, valore e stato (primo grado/appello)."
      },
      {
        "id": "cont_lavoro",
        "label": "Contenziosi giuslavoristici in corso",
        "type": "textarea",
        "required": true,
        "help": "Indica numero, oggetto e valore potenziale."
      },
      {
        "id": "cont_penali",
        "label": "Procedimenti penali in corso o passati",
        "type": "textarea",
        "required": true,
        "help": "Indica reati contestati e stato del procedimento."
      },
      {
        "id": "cont_tributari",
        "label": "Contenziosi tributari in corso (numero e valore indicativo)",
        "type": "textarea",
        "required": true,
        "help": "Indica importi e stato del contenzioso."
      },
      {
        "id": "fondo_rischi",
        "label": "Fondi rischi e oneri accantonati a bilancio (€)",
        "type": "text",
        "required": false,
        "help": "Importo accantonato a copertura contenziosi/rischi."
      },
      {
        "id": "azione_responsabilita",
        "label": "Azioni responsabilità ex art. 2476/2393 c.c. in corso o passate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — in corso",
          "Sì — passate",
          "No"
        ],
        "help": "Azioni ex artt. 2393/2476 c.c. verso amministratori; indica stato e esiti."
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
        ],
        "help": "Indica eventuali abusi e azioni correttive."
      },
      {
        "id": "uso_improprio_det",
        "label": "Se sì, descrivere sinteticamente",
        "type": "textarea",
        "required": false,
        "help": "Descrivi episodi, esiti e misure adottate."
      }
    ]
  },
  {
    "id": "f_1",
    "macro": "f",
    "title": "Contrattualistica",
    "description": "",
    "fields": [
      {
        "id": "contratti_standard",
        "label": "Modelli contrattuali standard (T&C, acquisti, vendite)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — completi e aggiornati",
          "Sì — parziali",
          "No"
        ],
        "help": "Indica se modelli contrattuali sono aggiornati e approvati."
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
        ],
        "help": "Specificare quando è obbligatoria la revisione legale."
      },
      {
        "id": "contratti_rilevanti",
        "label": "Contratti strategici in essere (appalti, partnership, JV, licenze)",
        "type": "textarea",
        "required": true,
        "help": "Elenca contratti con impatto economico o rischio elevato."
      },
      {
        "id": "garanzie_rilasciate",
        "label": "Garanzie rilasciate a terzi (fideiussioni, patronage, pegni)",
        "type": "textarea",
        "required": true,
        "help": "Indica garanzie e beneficiari (fideiussioni, comfort letter)."
      },
      {
        "id": "antiriciclaggio",
        "label": "Adempimenti antiriciclaggio applicabili?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — soggetto obbligato",
          "Sì — come controparte",
          "Non applicabile"
        ],
        "help": "Se soggetto obbligato: adeguata verifica, registri e segnalazioni; se controparte: clausole AML."
      }
    ]
  },
  {
    "id": "f_2",
    "macro": "f",
    "title": "Proprietà Intellettuale",
    "description": "",
    "fields": [
      {
        "id": "marchi",
        "label": "Marchi registrati (elenco e giurisdizioni)",
        "type": "textarea",
        "required": true,
        "help": "Indica marchi registrati e Paesi di registrazione."
      },
      {
        "id": "brevetti",
        "label": "Brevetti (elenco e giurisdizioni)",
        "type": "textarea",
        "required": false,
        "help": "Indica brevetti e stato (deposito/concesso)."
      },
      {
        "id": "know_how",
        "label": "Know-how e segreti commerciali protetti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì — con NDA e misure di protezione",
          "Sì — solo NDA",
          "No — non protetti",
          "Non applicabile"
        ],
        "help": "Protezione tramite NDA, misure organizzative e segreti industriali (artt. 98-99 c.p.i.)."
      },
      {
        "id": "licenze_ricevute",
        "label": "Licenze IP ricevute da terzi (software, brevetti, marchi)",
        "type": "textarea",
        "required": false,
        "help": "Licenze d’uso in essere e principali obblighi."
      },
      {
        "id": "contenziosi_ip",
        "label": "Contenziosi IP in corso?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No"
        ],
        "help": "Indica eventuali contenziosi o diffide ricevute."
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
        ],
        "help": "Indica modello NDA standard e casi di utilizzo."
      }
    ]
  },
  {
    "id": "g_1",
    "macro": "g",
    "title": "Modello di Business",
    "description": "",
    "fields": [
      {
        "id": "mb_vision_mission",
        "label": "L'impresa, nella costruzione del proprio modello di business, ha definito la propria Vision e la propria Mission?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esiste documentazione formale e come viene comunicata."
      },
      {
        "id": "mb_strutturato",
        "label": "Il modello di business dell'impresa è stato strutturato e formalizzato? (verificare se sono stati utilizzati strumenti quali il Business Model Canvas o simili)",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Specificare strumenti utilizzati (es. Business Model Canvas)."
      },
      {
        "id": "mb_comunicato",
        "label": "Si ritiene che il modello di business sia adeguatamente comunicato e condiviso all'interno dell'organizzazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Verifica se il modello è comunicato a manager e personale chiave."
      },
      {
        "id": "mb_swot",
        "label": "Nella costruzione del modello di business l'impresa ha enfatizzato minacce e opportunità relativamente alle variabili esterne e i propri punti di forza e di debolezza con riferimento alle variabili interne (analisi SWOT)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indicare se è stata svolta analisi SWOT recente."
      },
      {
        "id": "mb_obiettivi",
        "label": "Nella costruzione del modello di business l'impresa ha formalizzato un sistema di obiettivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esistono obiettivi misurabili e indicatori."
      },
      {
        "id": "mb_piano_strategico",
        "label": "Nella costruzione del modello di business l'impresa ha formalizzato un piano strategico coerente con gli obiettivi in precedenza definiti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esiste piano strategico coerente e aggiornato."
      }
    ]
  },
  {
    "id": "g_2",
    "macro": "g",
    "title": "Modello Gestionale",
    "description": "",
    "fields": [
      {
        "id": "mg_responsabile_it",
        "label": "L'impresa ha identificato un responsabile IT?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica la figura responsabile e il perimetro di ruolo."
      },
      {
        "id": "mg_sistema_integrato",
        "label": "L'impresa è dotata di un sistema informativo integrato (ad esempio, un ERP o altro sistema meno complesso)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esiste ERP o sistemi integrati tra funzioni."
      },
      {
        "id": "mg_orientato_obiettivi",
        "label": "Il sistema informativo dell'impresa è orientato ai suoi obiettivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Valuta se i sistemi supportano gli obiettivi aziendali."
      },
      {
        "id": "mg_flussi_attendibili",
        "label": "Il sistema informativo consente a tutti i livelli flussi attendibili, chiari e tempestivi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Verifica accuratezza e tempestività dei flussi informativi."
      },
      {
        "id": "mg_protezione",
        "label": "Sono presenti meccanismi di protezione rispetto a violazioni (interne e/o esterne) del sistema informativo?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica presidi contro accessi non autorizzati o incidenti."
      },
      {
        "id": "mg_protezione_dati",
        "label": "Il sistema informativo consente la gestione e la protezione dei dati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile",
          "Non disponibile"
        ],
        "help": "Indica misure per integrità, disponibilità e confidenzialità dati."
      },
      {
        "id": "mg_canali",
        "label": "Quali sono i canali che il sistema informativo aziendale predilige?",
        "type": "select",
        "required": true,
        "options": [
          "Email",
          "Cartelle condivise",
          "Software non integrato",
          "Software Integrato (ERP)",
          "Altro"
        ],
        "help": "Specifica canali prevalenti e criticità (email, ERP, condivisi)."
      },
      {
        "id": "mg_risk_management",
        "label": "Il sistema informativo è funzionale al sistema di gestione del rischio dell'impresa?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Se i sistemi supportano la gestione dei rischi."
      }
    ]
  },
  {
    "id": "g_3",
    "macro": "g",
    "title": "Assetti Organizzativi",
    "description": "",
    "fields": [
      {
        "id": "ao_modello_struttura",
        "label": "L’impresa è dotata di un organigramma formalizzato e comunicato all’interno dell’organizzazione?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se l’organigramma è formalizzato e condiviso."
      },
      {
        "id": "g3_ao_modello_struttura",
        "label": "In caso di riposta affermativa alla precedente domanda, qual è il modello di struttura organizzativa adottato?",
        "type": "select",
        "required": false,
        "options": [
          "Semplice",
          "Funzionale",
          "Divisionale",
          "A matrice",
          "Per progetti",
          "Per processi",
          "Altro"
        ],
        "help": "Indicare il modello organizzativo prevalente (funzionale, divisionale, ecc.)."
      },
      {
        "id": "ao_funzionigramma",
        "label": "L'impresa è dotata di un funzionigramma formalizzato e comunicato al suo interno?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esistono job description formalizzate."
      },
      {
        "id": "g3_ao_modello_strutturab",
        "label": "In caso di riposta affermativa alla precedente domanda, qual è il modello di struttura organizzativa adottato?",
        "type": "select",
        "required": false,
        "options": [
          "Semplice",
          "Funzionale",
          "Divisionale",
          "A matrice",
          "Per progetti",
          "Per processi",
          "Altro"
        ],
        "help": "Specificare il modello adottato (funzionale/divisionale/matrice)."
      },
      {
        "id": "ao_mansionario",
        "label": "L'impresa è dotata di un mansionario formalizzato e comunicato al suo interno?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esistono mansionari aggiornati per ruoli chiave."
      },
      {
        "id": "ao_selezione_personale",
        "label": "Nei procedimenti di selezione del personale, l'impresa è dotata di procedure e/o di strumenti di analisi delle competenze dei candidati?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Procedure di selezione e valutazione competenze."
      },
      {
        "id": "ao_valutazione_competenze",
        "label": "L'impresa è dotata di sistemi di valutazione costante delle competenze delle risorse umane in relazione ai ruoli ricoperti?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Sistemi di valutazione e performance review."
      },
      {
        "id": "ao_formazione",
        "label": "In caso di risposta negativa alla precedente domanda, l'impresa organizza corsi di formazione e di aggiornamento nell'ottica di un percorso di crescita professionale?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se vengono organizzati corsi di crescita professionale."
      },
      {
        "id": "ao_delega_poteri",
        "label": "Si ritiene che l'assegnazione di compiti e mansioni rispetti la corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Coerenza tra delega e poteri decisori effettivi."
      },
      {
        "id": "ao_procedure_operative",
        "label": "L'impresa è dotata di procedure operative e processi formalizzati (ciclo attivo, passivo, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Procedure formalizzate per processi core."
      },
      {
        "id": "ao_procedure_sostenibilita",
        "label": "L'impresa è dotata di procedure operative e processi formalizzati a supporto degli obiettivi di sostenibilità dell'attività?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Procedure a supporto obiettivi ESG."
      },
      {
        "id": "ao_procedure_autorizzative",
        "label": "L'impresa ha previsto procedure autorizzative in relazione a specifiche attività operative (ad esempio, accessi identificativi al sistema informativo, autorizzazione per spese superiori a determinati importi, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Procedure autorizzative per spese/accessi/operazioni."
      },
      {
        "id": "ao_scigr",
        "label": "È presente un sistema di controllo interno e gestione dei rischi (SCIGR)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Sistema di controllo interno e gestione rischi; indica se formalizzato e presidiato."
      },
      {
        "id": "ao_modello_231",
        "label": "L'impresa ha adottato un modello organizzativo ai sensi del d.lgs. 231/2001?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se esiste Modello 231 adottato."
      },
      {
        "id": "ao_odv_composizione",
        "label": "In caso di risposta affermativa alla precedente domanda, qual è la composizione dell'organismo di vigilanza?",
        "type": "select",
        "required": false,
        "options": [
          "Monocratico",
          "Collegiale"
        ],
        "help": "Se OdV presente, indicare composizione."
      },
      {
        "id": "ao_odv_criticita",
        "label": "L'organismo di vigilanza ha evidenziato criticità?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Eventuali criticità segnalate dall’OdV."
      },
      {
        "id": "ao_whistleblowing",
        "label": "L'impresa, ricorrendo i presupposti previsti dalla normativa, ha adottato canali di segnalazione interna ai sensi del d.lgs. 24/2023 (c.d. decreto whistleblowing)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Adozione canali WB se obbligatorio."
      },
      {
        "id": "ao_rischi_esg",
        "label": "Nell'ambito della gestione dei rischi aziendali, sono stati analizzati anche quelli relativi ai fattori ESG?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Integrazione dei rischi ESG nel risk assessment."
      },
      {
        "id": "ao_certificazioni",
        "label": "Sono state rilasciate certificazioni per l'esercizio di attività in specifici settori?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Certificazioni necessarie al settore di attività."
      },
      {
        "id": "ao_parita_genere",
        "label": "L'impresa ha adottato procedure e misure per ridurre il divario di genere?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Misure per ridurre divario di genere."
      },
      {
        "id": "g3_ao_parita_genere",
        "label": "Se si, quali?",
        "type": "textarea",
        "required": true,
        "help": "Specificare misure adottate (policy, KPI, piani)."
      }
    ]
  },
  {
    "id": "g_4",
    "macro": "g",
    "title": "Assetti Amministrativi",
    "description": "",
    "fields": [
      {
        "id": "aa_cda",
        "label": "Nelle società di capitali, è presente un consiglio di amministrazione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se CdA presente e composizione."
      },
      {
        "id": "aa_poteri_formalizzati",
        "label": "Nel caso di costituzione di un consiglio di amministrazione, sono stati formalizzati i poteri e i compiti assegnati a ciascun componente?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Esistenza di deleghe e compiti formalizzati."
      },
      {
        "id": "aa_corrispondenza_delega",
        "label": "Si ritiene che ci sia corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Coerenza tra delega e poteri effettivi."
      },
      {
        "id": "aa_internal_audit",
        "label": "È presente una funzione di internal audit?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Presenza funzione audit e perimetro."
      },
      {
        "id": "aa_organo_controllo_srl",
        "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un organo di controllo, anche monocratico?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Nomina obbligatoria al superamento soglie (art. 2477 c.c.)."
      },
      {
        "id": "aa_revisore_srl",
        "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un soggetto incaricato della revisione legale?",
        "type": "select",
        "required": false,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Revisore legale nominato quando obbligatorio."
      },
      {
        "id": "aa_piano_industriale",
        "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di un piano industriale?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Esistenza piano industriale/pluriennale."
      },
      {
        "id": "aa_piani_operativi",
        "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di piani operativi?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Piani operativi annuali con obiettivi e budget."
      },
      {
        "id": "aa_funzioni_esterne",
        "label": "Esistono funzioni ricoperte da soggetti esterni all'organizzazione (ad esempio, responsabile finanziario, sicurezza, legale, privacy, ecc.)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Funzioni esternalizzate (legale, privacy, sicurezza)."
      },
      {
        "id": "g4_aa_funzioni_esterne",
        "label": "Se si, quali?",
        "type": "textarea",
        "required": true,
        "help": "Elenca funzioni esternalizzate e contratti."
      },
      {
        "id": "aa_parti_correlate",
        "label": "Sono presenti procedure o regolamenti per la gestione delle operazioni con parti correlate?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Regolamento o procedura per operazioni con parti correlate."
      }
    ]
  },
  {
    "id": "g_5",
    "macro": "g",
    "title": "Assetti Contabili",
    "description": "",
    "fields": [
      {
        "id": "ac_sistema_integrato",
        "label": "L'impresa è dotata di un sistema informativo contabile integrato (ad esempio, si avvale di un unico software o più software per gli adempimenti contabili e fiscali)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se contabilità su sistema unico o multipli software."
      },
      {
        "id": "ac_esternalizzazione",
        "label": "L'impresa ha esternalizzato le procedure di registrazione e gestione delle operazioni contabili (contabilità interna o esterna)?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Indica se contabilità è interna o esternalizzata."
      },
      {
        "id": "ac_esternalizzazione_tipo",
        "label": "In caso di risposta affermativa alla precedente domanda, l'esternalizzazione delle procedure contabili è parziale o totale?",
        "type": "select",
        "required": false,
        "options": [
          "Totale",
          "Parziale"
        ],
        "help": "Specificare se parziale o totale."
      },
      {
        "id": "ac_trasferimento_dati",
        "label": "Nel caso di esternalizzazione parziale o totale, come avviene il trasferimento dei dati e delle informazioni?",
        "type": "select",
        "required": false,
        "options": [
          "Fax",
          "Email",
          "Condivisione di un sistema informativo",
          "Altro"
        ],
        "help": "Canali di trasmissione dati e controlli."
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
        ],
        "help": "Frequenza di aggiornamento contabile."
      },
      {
        "id": "ac_bilanci_infrannuali",
        "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali di esercizio?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Bilanci intermedi predisposti?"
      },
      {
        "id": "ac_bilanci_gestionali",
        "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali gestionali?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Bilanci gestionali e reporting interni."
      },
      {
        "id": "ac_analisi_bilancio",
        "label": "L'impresa è dotata di un sistema di analisi di bilancio comprensivo di indici e indicatori di natura reddituale, patrimoniale e finanziaria?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Analisi con indici e KPI economico‑finanziari."
      },
      {
        "id": "ac_analisi_crisi",
        "label": "L'analisi degli indici e degli indicatori di cui alla precedente domanda è effettuata in un'ottica di continuità aziendale e ai fini della rilevazione tempestiva della crisi d'impresa?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Rilevazione precoce crisi (art. 2086 c.c., CCII) tramite indici/DSCR."
      },
      {
        "id": "ac_controllo_gestione",
        "label": "L'impresa è dotata di un sistema di controllo di gestione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Presenza di controllo di gestione."
      },
      {
        "id": "ac_contabilita_analitica",
        "label": "L'impresa è dotata di un sistema di contabilità analitica?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Contabilità analitica per centri di costo."
      },
      {
        "id": "ac_kpi",
        "label": "L'impresa è dotata di un sistema di KPI (Key Performance Indicator) relativi agli elementi più rilevanti della gestione?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "KPI periodici per performance."
      },
      {
        "id": "ac_budget_reporting",
        "label": "L'impresa è dotata di un sistema di budgeting e reporting?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Sistema di budgeting e reporting degli scostamenti."
      },
      {
        "id": "ac_cadenza_reporting",
        "label": "In caso di risposta affermativa alla precedente domanda, con quale cadenza l'impresa gestisce la reportistica relativa agli scostamenti?",
        "type": "select",
        "required": false,
        "options": [
          "Mensile",
          "Trimestrale",
          "Quadrimestrale",
          "Semestrale",
          "Annuale"
        ],
        "help": "Frequenza report scostamenti (mensile/trimestrale)."
      },
      {
        "id": "ac_aspetti_finanziari",
        "label": "L'impresa pone attenzione ad aspetti finanziari quali, ad esempio, piano di tesoreria a sei mesi, analisi dei flussi di cassa, valutazione della posizione finanziaria netta, ecc.?",
        "type": "select",
        "required": true,
        "options": [
          "Sì",
          "No",
          "Non applicabile"
        ],
        "help": "Verificare tesoreria, flussi cassa, PFN, DSCR; indicare strumenti e frequenza."
      }
    ]
  },
  {
    "id": "h_1",
    "macro": "h",
    "title": "Atti Societari e Corporate",
    "description": "",
    "fields": [
      {
        "id": "d_statuto",
        "label": "Statuto sociale vigente",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      },
      {
        "id": "d_visura",
        "label": "Visura camerale aggiornata",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      },
      {
        "id": "d_patti_parasociali",
        "label": "Patti parasociali (se esistenti)",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      },
      {
        "id": "d_bilancio",
        "label": "Bilancio ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      },
      {
        "id": "d_procure",
        "label": "Copia integrale procure notarili",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      },
      {
        "id": "d_deleghe",
        "label": "Deleghe interne e procure non notarili",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      },
      {
        "id": "d_verbali_cda",
        "label": "Verbali CdA ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_verbali_assemblea",
        "label": "Verbali assemblee ultimo triennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      }
    ]
  },
  {
    "id": "h_2",
    "macro": "h",
    "title": "Governance e Compliance",
    "description": "",
    "fields": [
      {
        "id": "d_modello_231",
        "label": "Modello 231 completo (Parte Generale + Parti Speciali)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non adottato"
        ]
      },
      {
        "id": "d_codice_etico",
        "label": "Codice Etico",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_sistema_disciplinare",
        "label": "Sistema disciplinare 231 formalizzato",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_verbali_odv",
        "label": "Verbali OdV ultimo biennio",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_budget_odv",
        "label": "Budget autonomo OdV",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_anticorruzione",
        "label": "Policy anticorruzione e conflitto interessi",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_policy_omaggi",
        "label": "Policy omaggi, regali e ospitalità",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_registro_whistleblowing",
        "label": "Registro segnalazioni whistleblowing",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      }
    ]
  },
  {
    "id": "h_3",
    "macro": "h",
    "title": "Privacy e Sicurezza",
    "description": "",
    "fields": [
      {
        "id": "d_privacy",
        "label": "Documentazione privacy completa (nomine, informative, consensi)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_dpia",
        "label": "DPIA - Data Protection Impact Assessment",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non effettuate"
        ]
      },
      {
        "id": "d_procedura_breach",
        "label": "Procedura gestione data breach",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_registro_breach",
        "label": "Registro data breach",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_dvr",
        "label": "DVR e deleghe sicurezza",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      },
      {
        "id": "d_piano_emergenza",
        "label": "Piano emergenza (D.Lgs. 81/08)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      }
    ]
  },
  {
    "id": "h_4",
    "macro": "h",
    "title": "Pianificazione e Controllo",
    "description": "",
    "fields": [
      {
        "id": "d_business_plan",
        "label": "Business plan",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_piano_industriale",
        "label": "Piano industriale/strategico pluriennale",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_piani_operativi",
        "label": "Piani operativi annuali",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_budget",
        "label": "Budget annuale",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_bilanci_infrannuali",
        "label": "Bilanci infrannuali/situation",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non prodotti"
        ]
      },
      {
        "id": "d_piano_tesoreria",
        "label": "Piano tesoreria 6-12 mesi",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_dashboard_kpi",
        "label": "Dashboard KPI documentata",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      }
    ]
  },
  {
    "id": "h_5",
    "macro": "h",
    "title": "IT e Comunicazione",
    "description": "",
    "fields": [
      {
        "id": "d_dr_it",
        "label": "Piano Disaster Recovery IT",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_piano_marketing",
        "label": "Piano Marketing/Comunicazione",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_policy_social",
        "label": "Policy social media aziendali",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_doc_backup",
        "label": "Documentazione procedure backup",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      }
    ]
  },
  {
    "id": "h_6",
    "macro": "h",
    "title": "Organizzazione e HR",
    "description": "",
    "fields": [
      {
        "id": "d_organigramma",
        "label": "Organigramma e funzionigramma",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire"
        ]
      },
      {
        "id": "d_mansionari",
        "label": "Mansionari dettagliati",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      },
      {
        "id": "d_policy_smartworking",
        "label": "Policy smart working/lavoro agile",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_contratti_outsourcing",
        "label": "Contratti outsourcing principali",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_procedure_operative",
        "label": "Procedure operative interne",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      }
    ]
  },
  {
    "id": "h_7",
    "macro": "h",
    "title": "Contratti e Rapporti Esterni",
    "description": "",
    "fields": [
      {
        "id": "d_contratti_fornitori",
        "label": "Contratti fornitori strategici (top 5)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_contratti_clienti",
        "label": "Contratti clienti principali (top 10)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_accordi_partnership",
        "label": "Accordi partnership/collaborazione",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      },
      {
        "id": "d_policy_nda",
        "label": "Policy NDA/riservatezza",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_contratti_appalti",
        "label": "Contratti appalti pubblici",
        "type": "select",
        "required": false,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_polizze",
        "label": "Polizze D&O, RC e coperture assicurative",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistenti"
        ]
      }
    ]
  },
  {
    "id": "h_8",
    "macro": "h",
    "title": "Certificazioni e Sostenibilità",
    "description": "",
    "fields": [
      {
        "id": "d_whistleblowing",
        "label": "Procedura whistleblowing (D.Lgs. 24/2023)",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non applicabile"
        ]
      },
      {
        "id": "d_certificazioni",
        "label": "Certificazioni ISO e audit report",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_sostenibilita",
        "label": "Report sostenibilità / ESG",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      },
      {
        "id": "d_matrice_poteri",
        "label": "Matrice poteri / sistema autorizzativo",
        "type": "select",
        "required": true,
        "options": [
          "Disponibile",
          "Da reperire",
          "Non esistente"
        ]
      }
    ]
  }
];

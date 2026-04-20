import { MigrationInterface, QueryRunner } from 'typeorm';

type MacroAreaSeed = { code: string; label: string; color: string; sortOrder: number };
type SectionSeed = { code: string; title: string; description: string; macroCode: string; sortOrder: number };
type FieldSeed = { fieldId: string; label: string; type: string; options: string[] | null; required: boolean; help: string | null; allowDocuments: boolean; weight: number; sectionCode: string; sortOrder: number };

const MODEL_CODE = '231';
const MODEL_LABEL = '231';
const MODEL_DESCRIPTION = 'Modello questionario 231';

const MACRO_AREAS: MacroAreaSeed[] = [
  {
    "code": "m231_a",
    "label": "A. Identita e Struttura",
    "color": "#3b82f6",
    "sortOrder": 0
  },
  {
    "code": "m231_b",
    "label": "B. Governance",
    "color": "#7c3aed",
    "sortOrder": 1
  },
  {
    "code": "m231_c",
    "label": "C. Organizzazione",
    "color": "#0891b2",
    "sortOrder": 2
  },
  {
    "code": "m231_l",
    "label": "D. Processi Operativi",
    "color": "#0f766e",
    "sortOrder": 3
  },
  {
    "code": "m231_d",
    "label": "E. Compliance e Controlli",
    "color": "#d97706",
    "sortOrder": 4
  },
  {
    "code": "m231_e",
    "label": "F. Rapporti con la PA",
    "color": "#e11d48",
    "sortOrder": 5
  },
  {
    "code": "m231_f",
    "label": "G. Risk Management",
    "color": "#dc2626",
    "sortOrder": 6
  },
  {
    "code": "m231_g",
    "label": "H. Rapporti Esterni",
    "color": "#059669",
    "sortOrder": 7
  },
  {
    "code": "m231_h",
    "label": "I. Adeguati Assetti",
    "color": "#7c3aed",
    "sortOrder": 8
  },
  {
    "code": "m231_i",
    "label": "J. Documentazione",
    "color": "#475569",
    "sortOrder": 9
  },
  {
    "code": "m231_j",
    "label": "K.Autovalutazione",
    "color": "#ca8a04",
    "sortOrder": 10
  },
  {
    "code": "m231_k",
    "label": "L. Owner Macro Aree",
    "color": "#9333ea",
    "sortOrder": 11
  }
];

const SECTIONS: SectionSeed[] = [
  {
    "code": "m231_a_1",
    "title": "A.1 Anagrafica Societaria",
    "description": "",
    "macroCode": "m231_a",
    "sortOrder": 0
  },
  {
    "code": "m231_a_2",
    "title": "A.2 Struttura Societaria",
    "description": "",
    "macroCode": "m231_a",
    "sortOrder": 1
  },
  {
    "code": "m231_b_1",
    "title": "B.1 Organi Sociali",
    "description": "",
    "macroCode": "m231_b",
    "sortOrder": 2
  },
  {
    "code": "m231_b_2",
    "title": "B.2 Procure, Deleghe e Poteri",
    "description": "",
    "macroCode": "m231_b",
    "sortOrder": 3
  },
  {
    "code": "m231_b_3",
    "title": "B.3 Conflitto di Interessi",
    "description": "",
    "macroCode": "m231_b",
    "sortOrder": 4
  },
  {
    "code": "m231_c_1",
    "title": "C.1 Struttura Organizzativa",
    "description": "",
    "macroCode": "m231_c",
    "sortOrder": 5
  },
  {
    "code": "m231_c_2",
    "title": "C.2 Lavoratori Dipendenti",
    "description": "",
    "macroCode": "m231_c",
    "sortOrder": 6
  },
  {
    "code": "m231_c_3",
    "title": "C.3 Collaboratori Esterni",
    "description": "",
    "macroCode": "m231_c",
    "sortOrder": 7
  },
  {
    "code": "m231_l_1",
    "title": "D.1 Ciclo Attivo — Vendite e Clienti",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 8
  },
  {
    "code": "m231_l_2",
    "title": "D.2 Ciclo Passivo — Acquisti e Fornitori",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 9
  },
  {
    "code": "m231_l_3",
    "title": "D.3 Gestione Finanziaria e Tesoreria",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 10
  },
  {
    "code": "m231_l_4",
    "title": "D.4 Gestione del Personale",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 11
  },
  {
    "code": "m231_l_5",
    "title": "D.5 Operations, Produzione, Logistica e Ambiente",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 12
  },
  {
    "code": "m231_l_6",
    "title": "D.6 Gestione Fiscale e Contabile",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 13
  },
  {
    "code": "m231_l_7",
    "title": "D.7 Comunicazione, Omaggi e Sponsorizzazioni",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 14
  },
  {
    "code": "m231_l_8",
    "title": "D.8 Gestione IT e Sistemi Informativi",
    "description": "",
    "macroCode": "m231_l",
    "sortOrder": 15
  },
  {
    "code": "m231_d_2",
    "title": "E.1 Anticorruzione",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 16
  },
  {
    "code": "m231_d_3",
    "title": "E.2 Whistleblowing",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 17
  },
  {
    "code": "m231_d_4",
    "title": "E.3 Privacy e GDPR",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 18
  },
  {
    "code": "m231_d_5",
    "title": "E.4 IT e Comunicazione",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 19
  },
  {
    "code": "m231_d_6",
    "title": "E.5 Sicurezza sul Lavoro",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 20
  },
  {
    "code": "m231_d_7",
    "title": "E.6 Certificazioni ISO e Standard",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 21
  },
  {
    "code": "m231_d_8",
    "title": "E.7 Sostenibilità e ESG",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 22
  },
  {
    "code": "m231_d_9",
    "title": "E.8 Antiriciclaggio",
    "description": "",
    "macroCode": "m231_d",
    "sortOrder": 23
  },
  {
    "code": "m231_e_1",
    "title": "F.1 Mappatura Rapporti Istituzionali",
    "description": "",
    "macroCode": "m231_e",
    "sortOrder": 24
  },
  {
    "code": "m231_e_2",
    "title": "F.2 Appalti e Gare Pubbliche",
    "description": "",
    "macroCode": "m231_e",
    "sortOrder": 25
  },
  {
    "code": "m231_e_3",
    "title": "F.3 Contributi, Finanziamenti e Agevolazioni",
    "description": "",
    "macroCode": "m231_e",
    "sortOrder": 26
  },
  {
    "code": "m231_e_4",
    "title": "F.4 Autorizzazioni e Iscrizioni Pubbliche",
    "description": "",
    "macroCode": "m231_e",
    "sortOrder": 27
  },
  {
    "code": "m231_e_5",
    "title": "F.5 Controlli e Ispezioni",
    "description": "",
    "macroCode": "m231_e",
    "sortOrder": 28
  },
  {
    "code": "m231_f_1",
    "title": "G.1 Risk Assessment",
    "description": "",
    "macroCode": "m231_f",
    "sortOrder": 29
  },
  {
    "code": "m231_f_2",
    "title": "G.2 Assicurazioni e Coperture",
    "description": "",
    "macroCode": "m231_f",
    "sortOrder": 30
  },
  {
    "code": "m231_f_3",
    "title": "G.3 Contenzioso e Procedimenti",
    "description": "",
    "macroCode": "m231_f",
    "sortOrder": 31
  },
  {
    "code": "m231_g_1",
    "title": "H.1 Contrattualistica",
    "description": "",
    "macroCode": "m231_g",
    "sortOrder": 32
  },
  {
    "code": "m231_g_2",
    "title": "H.2 Proprietà Intellettuale",
    "description": "",
    "macroCode": "m231_g",
    "sortOrder": 33
  },
  {
    "code": "m231_h_1",
    "title": "I.1 Modello di Business",
    "description": "",
    "macroCode": "m231_h",
    "sortOrder": 34
  },
  {
    "code": "m231_h_2",
    "title": "I.2 Modello Gestionale",
    "description": "",
    "macroCode": "m231_h",
    "sortOrder": 35
  },
  {
    "code": "m231_h_3",
    "title": "I.3 Assetti Organizzativi",
    "description": "",
    "macroCode": "m231_h",
    "sortOrder": 36
  },
  {
    "code": "m231_h_4",
    "title": "I.4 Assetti Amministrativi",
    "description": "",
    "macroCode": "m231_h",
    "sortOrder": 37
  },
  {
    "code": "m231_h_5",
    "title": "I.5 Assetti Contabili",
    "description": "",
    "macroCode": "m231_h",
    "sortOrder": 38
  },
  {
    "code": "m231_i_1",
    "title": "J.1 Atti Societari e Corporate",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 39
  },
  {
    "code": "m231_i_2",
    "title": "J.2 Governance e Compliance",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 40
  },
  {
    "code": "m231_i_3",
    "title": "J.3 Privacy e Sicurezza",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 41
  },
  {
    "code": "m231_i_4",
    "title": "J.4 Pianificazione e Controllo",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 42
  },
  {
    "code": "m231_i_5",
    "title": "J.5 IT e Comunicazione",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 43
  },
  {
    "code": "m231_i_6",
    "title": "J.6 Organizzazione e HR",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 44
  },
  {
    "code": "m231_i_7",
    "title": "J.7 Contratti e Rapporti Esterni",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 45
  },
  {
    "code": "m231_i_8",
    "title": "J.8 Certificazioni e Sostenibilità",
    "description": "",
    "macroCode": "m231_i",
    "sortOrder": 46
  },
  {
    "code": "m231_j_1",
    "title": "K.1 Governance e Compliance",
    "description": "",
    "macroCode": "m231_j",
    "sortOrder": 47
  },
  {
    "code": "m231_j_2",
    "title": "K.2 Organizzazione e Assetti",
    "description": "",
    "macroCode": "m231_j",
    "sortOrder": 48
  },
  {
    "code": "m231_j_3",
    "title": "K.3 Priorità e Interventi",
    "description": "",
    "macroCode": "m231_j",
    "sortOrder": 49
  },
  {
    "code": "m231_k_1",
    "title": "L.1 Owner Macro Area A — Identità e Struttura",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 50
  },
  {
    "code": "m231_k_2",
    "title": "L.2 Owner Macro Area B — Governance",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 51
  },
  {
    "code": "m231_k_3",
    "title": "L.3 Owner Macro Area C — Organizzazione",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 52
  },
  {
    "code": "m231_k_4",
    "title": "L.4 Owner Macro Area D — Processi Operativi",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 53
  },
  {
    "code": "m231_k_5",
    "title": "L.5 Owner Macro Area E — Compliance e Controlli",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 54
  },
  {
    "code": "m231_k_6",
    "title": "L.6 Owner Macro Area F — Rapporti con la PA",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 55
  },
  {
    "code": "m231_k_7",
    "title": "L.7 Owner Macro Area G — Risk Management",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 56
  },
  {
    "code": "m231_k_8",
    "title": "L.8 Owner Macro Area H — Rapporti Esterni",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 57
  },
  {
    "code": "m231_k_9",
    "title": "L.9 Owner Macro Area I — Adeguati Assetti",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 58
  },
  {
    "code": "m231_k_10",
    "title": "L.10 Owner Macro Area J — Documentazione",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 59
  },
  {
    "code": "m231_k_11",
    "title": "L.11 Owner Macro Area K — Autovalutazione",
    "description": "",
    "macroCode": "m231_k",
    "sortOrder": 60
  }
];

const FIELDS: FieldSeed[] = [
  {
    "fieldId": "m231_ragione_sociale",
    "label": "Ragione/Denominazione sociale",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_forma_giuridica",
    "label": "Forma giuridica",
    "type": "select",
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
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_anno_costituzione",
    "label": "Anno di costituzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_rea",
    "label": "Registro Imprese / N.ro iscrizione REA",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_cf_piva",
    "label": "Codice fiscale / Partita IVA",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_sede_legale",
    "label": "Sede legale",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_sedi_secondarie",
    "label": "La Società ha istituito sedi secondarie con rappresentanza stabile?",
    "type": "multiselect",
    "options": [
      "Sì in Italia",
      "Sì all'estero",
      "Si in Italia e all'estero",
      "No"
    ],
    "required": true,
    "help": "Le sedi secondarie sono uffici, filiali, stabilimenti o unità operative della Società situati in luogo diverso dalla sede legale, presso i quali opera stabilmente un rappresentante dotato di poteri per agire in nome e per conto della Società nei confronti dei terzi (c.d. institor o preposto).\nNon rientrano in questa definizione i semplici depositi, magazzini o unità produttive prive di un soggetto con poteri di rappresentanza.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_sedi_secondarie_dettaglio",
    "label": "Se si, indicare: numero di sedi secondarie e, per ciascuna di esse: indirizzo + attività svolta + numero complessivo di dipendenti assegnati",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_sedi_secondarie_ri",
    "label": "Le sedi secondarie in Italia sono iscritte nel Registro Imprese",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_sedi_secondarie_ri_2",
    "label": "Le sedi secondarie all'estero sono iscritte nel competente Registro Imprese",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_sedi_operative",
    "label": "La Società ha istituito sedi operative/unità locali?",
    "type": "multiselect",
    "options": [
      "Sì in Italia",
      "Sì all'estero",
      "Si in Italia e all'estero",
      "No"
    ],
    "required": true,
    "help": "Sono tutti i luoghi fisici in cui la Società svolge stabilmente la propria attività, diversi dalla sede legale: uffici, stabilimenti produttivi, magazzini, depositi, punti vendita, cantieri fissi, laboratori o centri logistici.\nA differenza delle sedi secondarie, le unità locali non richiedono la presenza di un soggetto munito di poteri di rappresentanza verso i terzi. È sufficiente che vi si svolga in modo continuativo un'attività dell'impresa.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_sedi_operative_dettaglio",
    "label": "Se si, indicare: numero di sedi operative (unità locali) e, per ciascuna di esse: indirizzo + attività svolta + numero complessivo di dipendenti assegnati",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_sedi_operative_ri",
    "label": "Le sedi operative in Italia sono iscritte nel Registro Imprese",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_sedi_operative_ri_2",
    "label": "Le sedi operative all'estero sono iscritte nel Registro Imprese",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_ateco_attivita_prevalente",
    "label": "Codice ATECO attività prevalente + descrizione attività + sede/i in cui viene/vengono svolta/e",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_ateco_attivita_secondarie",
    "label": "Codice/i ATECO attività secondaria/e + descrizione attività secondaria/e + sede/i in cui viene/vengono svolta/e",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_capitale_sociale",
    "label": "Capitale sociale (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_compagine",
    "label": "Compagine societaria: soci (nome o ragione sociale/denominazione) + % partecipazione",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_diritti_particolari",
    "label": "Esistono diritti particolari dei soci?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Sono diritti speciali che lo statuto può attribuire a singoli soci, diversi e ulteriori rispetto a quelli standard spettanti a tutti i soci in proporzione alla quota posseduta. Possono riguardare sia la sfera patrimoniale sia quella amministrativa.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_diritti_particolari_det",
    "label": "Se si, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 19
  },
  {
    "fieldId": "m231_patti_parasociali",
    "label": "Esistono patti parasociali?",
    "type": "select",
    "options": [
      "Sì stipulati per iscritto",
      "Sì stipulati verbalmente",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "Sono accordi stipulati tra i soci (o tra alcuni di essi) al di fuori dello statuto, con i quali i partecipanti regolano convenzionalmente l'esercizio dei propri diritti sociali o aspetti della governance societaria. Sono disciplinati dall'art. 2341-bis c.c. e possono essere sia scritti sia — più raramente — verbali.\nIl Codice Civile individua tre categorie principali:\nSindacati di voto: i soci si impegnano a esercitare il diritto di voto in assemblea in modo concordato o secondo le indicazioni di un soggetto designato (es. votare compatti per la nomina di un determinato amministratore).\nSindacati di blocco: i soci limitano il trasferimento delle proprie azioni o quote, subordinandolo al gradimento degli altri aderenti, a diritti di prelazione reciproca o a divieti temporanei di cessione.\nPatti di controllo: i soci coordinano le proprie condotte per esercitare un'influenza dominante sulla società o per impedire che altri la acquisiscano.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 20
  },
  {
    "fieldId": "m231_patti_dettaglio",
    "label": "Se sì e stipulati per iscritto: oggetto + durata dei patti parasociali",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 21
  },
  {
    "fieldId": "m231_fatturato",
    "label": "Fatturato ultimo esercizio (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 22
  },
  {
    "fieldId": "m231_fatturato_trend",
    "label": "Trend fatturato ultimo triennio",
    "type": "select",
    "options": [
      "In crescita",
      "Stabile",
      "In calo",
      "Non disponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 23
  },
  {
    "fieldId": "m231_fatturato_trend_2",
    "label": "Trend fatturato ultimo triennio: importo",
    "type": "select",
    "options": [
      "In crescita",
      "Stabile",
      "In calo",
      "Non disponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 24
  },
  {
    "fieldId": "m231_attivo_patrimoniale",
    "label": "Totale attivo stato patrimoniale (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 25
  },
  {
    "fieldId": "m231_patrimonio_netto",
    "label": "Patrimonio netto (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 26
  },
  {
    "fieldId": "m231_indebitamento",
    "label": "Posizione finanziaria netta (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 27
  },
  {
    "fieldId": "m231_num_dipendenti",
    "label": "Numero totale dipendenti",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 28
  },
  {
    "fieldId": "m231_mercati_geo",
    "label": "Mercati di riferimento: Italia % + UE % + Extra UE %",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 29
  },
  {
    "fieldId": "m231_mercati_top5",
    "label": "Mercati di riferimento: top 5 Paesi vendite % + top 5 Paesi acquisti %",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 30
  },
  {
    "fieldId": "m231_clienti_principali",
    "label": "Concentrazione clientela: % fatturato top 5 clienti",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 31
  },
  {
    "fieldId": "m231_fornitori_principali",
    "label": "Concentrazione fornitori: % acquisti top 5 fornitori",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 32
  },
  {
    "fieldId": "m231_paesi_blacklist",
    "label": "La Società intrattiene rapporto con Paesi inseriti nella black-list?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Sono i rapporti commerciali, finanziari o operativi che la Società intrattiene con soggetti residenti o stabiliti in Paesi considerati a fiscalità privilegiata o ad alto rischio, inseriti in apposite liste (c.d. black-list) redatte da autorità nazionali e internazionali.\nEsistono diverse tipologie di liste, ciascuna con finalità e conseguenze specifiche:\n\nBlack-list fiscale: Paesi o territori con regime fiscale privilegiato, caratterizzati da un livello di tassazione sensibilmente inferiore a quello italiano o da carenza nello scambio di informazioni. Le operazioni con soggetti ivi residenti sono soggette a obblighi di documentazione rafforzata e a limitazioni nella deducibilità dei costi (art. 110, commi 9-bis e ss., D.P.R. 917/1986 — TUIR; D.M. 4 maggio 1999 e successivi aggiornamenti).\nBlack-list antiriciclaggio: Paesi ad alto rischio individuati dalla Commissione Europea e dal GAFI/FATF, nei confronti dei quali si applicano obblighi di adeguata verifica rafforzata della clientela (artt. 24 e 25, D.Lgs. 231/2007).\nListe di embargo e sanzioni internazionali: Paesi soggetti a misure restrittive adottate dall'UE, dall'ONU o dall'OFAC statunitense, che vietano o limitano determinate transazioni commerciali e finanziarie (Regolamenti UE in materia di misure restrittive)",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 33
  },
  {
    "fieldId": "m231_paesi_blacklist_det",
    "label": "Se sì, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_1",
    "sortOrder": 34
  },
  {
    "fieldId": "m231_gruppo_app",
    "label": "La Società appartiene a un Gruppo societario?",
    "type": "select",
    "options": [
      "No — società singola",
      "Sì — capogruppo",
      "Sì — controllata",
      "Sì — collegata",
      "Sì — partecipata"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_gruppo_mappa",
    "label": "In caso affermativo, esiste una mappa formalizzata e condivisa del Gruppo?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_gruppo_organigramma",
    "label": "In caso affermativo, esiste una Organigramma formalizzato di Gruppo?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_societa_controllate",
    "label": "Se la Società è capogruoppo: società controllate + ragione/denominazione sociale + sede + partita iva + % partecipazione capogruppo + attività",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_societa_controllante",
    "label": "Se la Società è controllata: società controllante + denominazione + sede + partita iva + % partecipazione controllante + attività",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_societa_collegate",
    "label": "Quali sono le società collegate e/o partecipate: denominazione/ragione sociale + sede + partita iva + % partecipazione + attività",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_rapporti_infragruppo",
    "label": "Rapporti infragruppo rilevanti",
    "type": "multiselect",
    "options": [
      "Servizi",
      "Lavori",
      "Finanziamenti",
      "Garanzie"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_rapporti_infragruppo_ruolo",
    "label": "La Società è soggetto attivo o passivo dei rapporti infragruppo",
    "type": "multiselect",
    "options": [
      "Soggetto attivo",
      "Soggetto passivo"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_rapporti_infragruppo_desc",
    "label": "Descrizione sintetica dei rapporti rilevanti",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_contratti_infragruppo_formalizzati",
    "label": "I contratti infragruppo sono formalizzati?",
    "type": "select",
    "options": [
      "Sì — tutti",
      "Sì — parzialmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_contratti_infragruppo_form",
    "label": "Quali sono i rapporti/contratti formalizzati?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_contratti_infragruppo_non_form",
    "label": "Quali sono i rapporti/contratti non formalizzati?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_a_2",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_sistema_amm_modello",
    "label": "Modello sistema di amministrazione",
    "type": "select",
    "options": [
      "Sistema tradizionale",
      "Sistema monistico",
      "Sistema dualistico"
    ],
    "required": true,
    "help": "È il sistema attraverso cui la Società organizza la propria gestione e il controllo interno. Il diritto societario italiano prevede tre modelli:\n\nTradizionale (default): l'amministrazione è affidata a un Amministratore Unico o a un Consiglio di Amministrazione (CdA), il controllo a un Collegio Sindacale o Sindaco Unico, e la revisione legale a un revisore esterno o alla stessa società di revisione (artt. 2380-bis e ss. c.c.).\nDualistico: l'assemblea nomina un Consiglio di Sorveglianza, che a sua volta nomina un Consiglio di Gestione. Il Consiglio di Sorveglianza svolge anche funzioni di controllo, assorbendo il ruolo del Collegio Sindacale (artt. 2409-octies e ss. c.c.).\nMonistico: il CdA è nominato dall'assemblea e al suo interno è costituito un Comitato per il Controllo sulla Gestione, composto da amministratori indipendenti. Non è previsto un organo di controllo esterno separato (artt. 2409-sexiesdecies e ss. c.c.).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_sistema_amm_tipo",
    "label": "Sistema di amministrazione",
    "type": "multiselect",
    "options": [
      "Amministratore Unico",
      "CdA con Presidente",
      "CdA collegiale senza deleghe",
      "AD",
      "Comitato Esecutivo",
      "Consiglio di Sorveglianza",
      "Consiglio di Gestione",
      "Direttore Generale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_au_nome",
    "label": "Amministratore Unico (se nominato): nome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_au_scadenza",
    "label": "Scadenza mandato Amministratore Unico",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_cda_composizione",
    "label": "Componenti CdA (se nominato): componenti + cariche + dipendenti/indipendenti + esecutivi/non esecutivi (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_cda_scadenza",
    "label": "Scadenza mandato CdA",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_presidente",
    "label": "Presidente CdA (se nominato): nome, poteri (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_ad",
    "label": "Amministratore/i Delegato/i (se nominato/i): nome + dipendente/indipendente + poteri  (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_frequenza_cda",
    "label": "N. riunioni CdA nell'ultimo anno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_cda_verbalizzazione",
    "label": "Le riunioni CdA sono regolarmente verbalizzate?",
    "type": "select",
    "options": [
      "Sì — sempre",
      "Sì — nella maggior parte dei casi",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_dg",
    "label": "Direttore Generale (se nominato): nome + poteri (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_ce_composizione",
    "label": "Comitato Esecutivo: componenti + ruoli",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_ce_scadenza",
    "label": "Scadenza mandato Comitato Esecutivo",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_frequenza_ce",
    "label": "N. riunioni Comitato Esecutivo nell'ultimo anno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_ce_verbalizzazione",
    "label": "Le riunioni del Comitato Esecutivo sono regolarmente verbalizzate?",
    "type": "select",
    "options": [
      "Sì — sempre",
      "Sì — nella maggior parte dei casi",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_cs_composizione",
    "label": "Consiglio di Sorvegliana: componenti + ruoli (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_cs_scadenza",
    "label": "Scadenza mandato Consiglio di Sorvegliana",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_frequenza_cs",
    "label": "N. riunioni Consiglio di Sorveglianza nell'ultimo anno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_cs_verbalizzazione",
    "label": "Le riunioni del Consiglio di Sorveglianza sono regolarmente verbalizzate?",
    "type": "select",
    "options": [
      "Sì — sempre",
      "Sì — nella maggior parte dei casi",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_cg_composizione",
    "label": "Consiglio di Gestione: componenti + ruoli (focus operativo e riporto)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 19
  },
  {
    "fieldId": "m231_cg_scadenza",
    "label": "Scadenza mandato Consiglio di Gestione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 20
  },
  {
    "fieldId": "m231_frequenza_cg",
    "label": "N. riunioni Consiglio di Gestione nell'ultimo anno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 21
  },
  {
    "fieldId": "m231_cg_verbalizzazione",
    "label": "Le riunioni del Consiglio di Gestione sono regolarmente verbalizzate?",
    "type": "select",
    "options": [
      "Sì — sempre",
      "Sì — nella maggior parte dei casi",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 22
  },
  {
    "fieldId": "m231_organo_controllo_int",
    "label": "Quali sono gli Organi di Controllo Interno della Società?",
    "type": "multiselect",
    "options": [
      "Collegio Sindacale",
      "Sindaco Unico",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 23
  },
  {
    "fieldId": "m231_collegio_sind_composizione",
    "label": "Collegio Sindacale: componenti + incarico",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 24
  },
  {
    "fieldId": "m231_collegio_sind_scadenza",
    "label": "Scadenza mandato Collegio Sindacale",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 25
  },
  {
    "fieldId": "m231_sindaco_unico_nome",
    "label": "Sindaco Unico: nome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 26
  },
  {
    "fieldId": "m231_sindaco_unico_scadenza",
    "label": "Scadenza mandato Sindaco Unico",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 27
  },
  {
    "fieldId": "m231_altri_controllo_int",
    "label": "Quali sono gli altri Organi di Controllo Interno",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 28
  },
  {
    "fieldId": "m231_altri_controllo_int_2",
    "label": "Scadenza altri Organi di Controllo Interno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 29
  },
  {
    "fieldId": "m231_organo_controllo_est",
    "label": "Quali sono gli Organi di Controllo Esterno della Società?",
    "type": "select",
    "options": [
      "Revisore",
      "Società di Revisione",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 30
  },
  {
    "fieldId": "m231_soc_revisione_nome",
    "label": "Società di Revisione: denominazione/ragione sociale",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 31
  },
  {
    "fieldId": "m231_soc_revisione_scadenza",
    "label": "Scadenza incarico Società di Revisione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 32
  },
  {
    "fieldId": "m231_revisore_nome",
    "label": "Revisore: nome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 33
  },
  {
    "fieldId": "m231_revisore_scadenza",
    "label": "Scadenza mandato Revisore",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 34
  },
  {
    "fieldId": "m231_altri_controllo_est",
    "label": "Quali sono gli altri Organi di Controllo Esterno",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 35
  },
  {
    "fieldId": "m231_altri_controllo_est_2",
    "label": "Scadenza altri Organi di Controllo Esterno",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 36
  },
  {
    "fieldId": "m231_assemblea_freq",
    "label": "N. Assemblee Soci nell'ultimo triennio",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_1",
    "sortOrder": 37
  },
  {
    "fieldId": "m231_procure_notarili_n",
    "label": "Numero procure notarili in essere",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_procure_notarili_elenco",
    "label": "Elenco procure notarili: procuratore + poteri + limiti + data conferimento + durata",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_procure_non_notarili",
    "label": "Procure NON notarili in essere",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_deleghe_funzione",
    "label": "Deleghe di funzione formali",
    "type": "multiselect",
    "options": [
      "Sicurezza",
      "Ambiente",
      "Privacy",
      "Qualità",
      "Sostenibilità",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_deleghe_operative",
    "label": "Deleghe operative interne: area + funzione + soggetto + oggetto + autorizzazioni spesa + limiti + riporto",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_limiti_spesa",
    "label": "Esiste una matrice limiti di spesa per livello/funzione?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_firma_congiunta",
    "label": "Sono previsti meccanismi di firma congiunta?",
    "type": "select",
    "options": [
      "Sì — sopra soglia",
      "Sì — solo alcune tipologie",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_firma_congiunta_det",
    "label": "Dettaglio atti con firma congiunta: soglie + funzione/soggetti",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_firma_digitale",
    "label": "Utilizzo firma digitale / elettronica qualificata?",
    "type": "select",
    "options": [
      "Sì — diffuso",
      "Sì — limitato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_firme_bancarie",
    "label": "Firme bancarie autorizzate: funzioni/soggetti + limiti + singola/congiunta",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_registro_procure",
    "label": "E' stato istituito un Registro Centralizzato delle Procure?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_ultima_revisione_procure",
    "label": "Data ultima revisione sistematica delle procure",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_coerenza_statuto_procure",
    "label": "Le procure sono coerenti con statuto e delibere CdA?",
    "type": "select",
    "options": [
      "Sì — verificato",
      "Probabilmente sì",
      "Non verificato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_2",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_policy_cdi",
    "label": "E' stata adottata una Policy sul Conflitto di Interessi?",
    "type": "select",
    "options": [
      "Sì — formalizzata e diffusa",
      "Sì — solo formale",
      "In redazione",
      "No"
    ],
    "required": true,
    "help": "È un documento interno con cui la Società disciplina le situazioni in cui un amministratore, un dirigente, un dipendente o un collaboratore si trova — o potrebbe trovarsi — in una condizione di contrasto tra il proprio interesse personale (diretto o indiretto) e l'interesse della Società.\nIl conflitto può essere patrimoniale (es. partecipazione in un fornitore), relazionale (es. vincoli familiari con una controparte contrattuale) o funzionale (es. cumulo di incarichi in società concorrenti).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_registro_cdi",
    "label": "E' stato istituito un Registro dei Conflitti di Interesse?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "In redazione",
      "No"
    ],
    "required": true,
    "help": "È un documento — cartaceo o digitale — in cui vengono annotate e conservate tutte le dichiarazioni rese da amministratori, dirigenti, dipendenti e collaboratori in merito a situazioni di conflitto di interessi, effettive o potenziali, rispetto all'attività della Società.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_obbligo_dichiarazione",
    "label": "Obbligo dichiarazione preventiva interessi per amministratori?",
    "type": "select",
    "options": [
      "Sì — formalizzato",
      "Sì — prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_operazioni_parti_correlate",
    "label": "Procedura operazioni con parti correlate?",
    "type": "select",
    "options": [
      "Sì — formalizzata",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": "È un documento interno che disciplina le modalità con cui la Società identifica, valuta, autorizza e monitora le operazioni compiute con soggetti legati alla Società stessa da un rapporto qualificato — le c.d. parti correlate.\nChi sono le parti correlate?\nSono soggetti che, per la posizione rivestita o per i legami esistenti, possono influenzare o essere influenzati dalla Società nelle decisioni economiche. Rientrano tipicamente: i soci di controllo o con influenza notevole; gli amministratori, i sindaci e i dirigenti con responsabilità strategiche (e i loro stretti familiari); le società controllate, collegate o sottoposte a comune controllo; le entità in cui i soggetti sopra indicati detengono partecipazioni rilevanti o incarichi direttivi.\nCosa disciplina la Procedura?\nI criteri per identificare le parti correlate e le operazioni rilevanti; i flussi informativi verso l'organo deliberante; la valutazione della congruità delle condizioni economiche dell'operazione (equivalenza a condizioni di mercato o arm's length); il ruolo degli amministratori indipendenti o dell'organo di controllo nel processo autorizzativo; i casi di esenzione (operazioni di importo esiguo, operazioni ordinarie a condizioni standard); gli obblighi di trasparenza e informativa in bilancio.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_parti_correlate_elenco",
    "label": "Operazioni significative con parti correlate (ultimo triennio)",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_incarichi_esterni",
    "label": "Amministratori con incarichi in altre società (se sì, indicare quali)?",
    "type": "select",
    "options": [
      "Sì — dichiarati",
      "Sì — non tutti dichiarati",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_divieto_concorrenza",
    "label": "Clausole di non concorrenza per amministratori/dirigenti?",
    "type": "select",
    "options": [
      "Sì — per tutti",
      "Sì — per alcuni",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_episodi_cdi",
    "label": "Episodi di conflitto di interessi rilevati?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_episodi_cdi_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_b_3",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_organigramma",
    "label": "Organigramma formalizzato e aggiornato?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "Solo informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_tipo_struttura",
    "label": "Tipologia di struttura organizzativa adottata",
    "type": "multiselect",
    "options": [
      "Funzionale",
      "Divisionale",
      "A matrice",
      "Per processi",
      "Semplice",
      "Mista"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_revisione_struttura",
    "label": "Data ultima revisione della struttura organizzativa",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_funzionigramma",
    "label": "Funzionigramma (job description per ruolo)?",
    "type": "select",
    "options": [
      "Sì — completo",
      "Sì — parziale",
      "No"
    ],
    "required": true,
    "help": "È il documento che descrive in modo analitico, per ciascuna posizione o ruolo previsto nell'organigramma, le funzioni, le responsabilità, i compiti operativi, i poteri decisionali e le relazioni gerarchiche e funzionali (riporto a chi, coordinamento con quali funzioni).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_aree_funzionali",
    "label": "Principali aree/direzioni funzionali",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_dirigenti",
    "label": "Numero e ruoli dei dirigenti",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_funzioni_coperte",
    "label": "Funzioni chiave coperte da responsabile dedicato",
    "type": "multiselect",
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
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_funzioni_vacanti",
    "label": "Funzioni chiave vacanti o coperte ad interim",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_resp_sostenibilita",
    "label": "È stato nominato un Responsabile Sostenibilità / ESG Manager?",
    "type": "select",
    "options": [
      "Sì — dedicato",
      "Sì — funzione condivisa con altro ruolo",
      "No",
      "In fase di nomina"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_comitato_sostenibilita",
    "label": "Esiste un Comitato Sostenibilità o una funzione ESG formalizzata nell'Organigramma?",
    "type": "select",
    "options": [
      "Sì — comitato dedicato",
      "Sì — integrato in altro comitato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_integrazione_esg_processi",
    "label": "Gli obiettivi ESG sono integrati nei processi operativi e nei KPI delle funzioni aziendali?",
    "type": "select",
    "options": [
      "Sì — in tutte le funzioni",
      "Sì — in alcune funzion i",
      "No",
      "In fase di implementazione"
    ],
    "required": true,
    "help": "Verificare se la Società ha tradotto i propri impegni in materia ambientale, sociale e di governance (ESG — Environmental, Social, Governance) in obiettivi concreti e misurabili, incorporandoli nei processi di lavoro quotidiani e nei sistemi di valutazione delle performance delle singole funzioni aziendali.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_sod_matrix",
    "label": "Matrice di segregazione dei compiti (SoD)?",
    "type": "select",
    "options": [
      "Sì — formalizzata e monitorata",
      "Sì — formalizzata non monitorata",
      "Solo informale",
      "No"
    ],
    "required": true,
    "help": "La Matrice di Segregazione dei Compiti (SoD — Segregation of Duties) è uno strumento organizzativo — tipicamente in formato tabellare — che mappa i processi aziendali critici e verifica che le attività incompatibili tra loro non siano concentrate in capo alla stessa persona, assicurando una separazione effettiva tra chi autorizza, chi esegue, chi registra e chi controlla.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_procedure_operative",
    "label": "Procedure operative interne formalizzate (elencare)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_procedure_aggiornamento",
    "label": "Le procedure sono periodicamente aggiornate?",
    "type": "select",
    "options": [
      "Sì — revisione annuale",
      "Sì — ad hoc",
      "Raramente",
      "Mai"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_mappatura_processi",
    "label": "Mappatura processi aziendali (BPM) effettuata?",
    "type": "select",
    "options": [
      "Sì — completa",
      "Sì — parziale",
      "No"
    ],
    "required": true,
    "help": "La mappatura dei processi aziendali (BPM — Business Process Management) è l'attività con cui la Società identifica, documenta e rappresenta in modo strutturato tutti i processi operativi che compongono la propria catena del valore, descrivendo per ciascuno le attività svolte, la sequenza logica, i soggetti coinvolti, gli input e gli output, i sistemi informativi utilizzati e i punti di controllo.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_tracciabilita",
    "label": "Processi decisionali tracciabili?",
    "type": "select",
    "options": [
      "Sì — workflow digitali",
      "Sì — verbali e minute",
      "Parzialmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_flussi_interfunzionali",
    "label": "Flussi informativi inter-funzionali formalizzati?",
    "type": "select",
    "options": [
      "Sì",
      "Parzialmente",
      "No"
    ],
    "required": true,
    "help": "Sono i canali e le modalità strutturate con cui le diverse funzioni aziendali si scambiano informazioni rilevanti per il corretto svolgimento delle rispettive attività e per il coordinamento operativo dell'organizzazione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_comitati_operativi",
    "label": "Comitati/riunioni operative periodiche formalizzate?",
    "type": "select",
    "options": [
      "Sì — con verbale",
      "Sì — senza verbale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_erp",
    "label": "Sistema ERP / gestionale in uso",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_strumenti_digitali",
    "label": "Altri strumenti digitali (CRM, HR, workflow, DMS)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 19
  },
  {
    "fieldId": "m231_internal_audit",
    "label": "Funzione di Internal Audit?",
    "type": "select",
    "options": [
      "Sì — interna dedicata",
      "Sì — esternalizzata",
      "Sì — parziale",
      "No"
    ],
    "required": true,
    "help": "È una funzione aziendale indipendente che svolge attività di verifica e valutazione sistematica sull'adeguatezza, l'efficacia e l'effettivo funzionamento del sistema di controllo interno, dei processi organizzativi, delle procedure e della gestione dei rischi.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 20
  },
  {
    "fieldId": "m231_compliance_function",
    "label": "Funzione Compliance dedicata?",
    "type": "select",
    "options": [
      "Sì — interna",
      "Sì — esterna",
      "No — integrata in Legal",
      "No"
    ],
    "required": true,
    "help": "È una funzione aziendale — distinta dalle funzioni operative e dalla funzione di Internal Audit — specificamente incaricata di presidiare la conformità dell'organizzazione alle normative esterne (leggi, regolamenti, disposizioni delle autorità di vigilanza) e alle regole interne (statuto, codice etico, procedure, policy) applicabili all'attività della Società.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_1",
    "sortOrder": 21
  },
  {
    "fieldId": "m231_dip_totale",
    "label": "Numero totale dipendenti full-time",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_dip_dirigenti",
    "label": "di cui dirigenti",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_dip_quadri",
    "label": "di cui quadri",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_dip_impiegati",
    "label": "di cui impiegati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_dip_operai",
    "label": "di cui operai",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_dip_determinato",
    "label": "Numero totale dipendenti part-time",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_dip_interinali",
    "label": "Lavoratori somministrati: numero + qualifiche",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_ccnl",
    "label": "CCNL applicato/i",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_contratti_integrativi",
    "label": "Contratti integrativi aziendali?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In negoziazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_relazioni_sindacali",
    "label": "Stato relazioni sindacali",
    "type": "select",
    "options": [
      "Buone / collaborative",
      "Nella norma",
      "Tese / conflittuali",
      "Nessuna rappresentanza"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_rsa_rsu",
    "label": "RSA/RSU presenti?",
    "type": "multiselect",
    "options": [
      "Sì — RSU",
      "Sì — RSA",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_contenziosi_lavoro",
    "label": "Contenziosi giuslavoristici in corso",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_turnover",
    "label": "Tasso di turnover annuo (%)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_piani_welfare",
    "label": "Piani welfare aziendale?",
    "type": "select",
    "options": [
      "Sì — strutturato",
      "Sì — base",
      "No"
    ],
    "required": true,
    "help": "Sono l'insieme strutturato di beni, servizi, prestazioni e benefit che la Società mette a disposizione dei propri dipendenti — in aggiunta alla retribuzione ordinaria — con finalità di benessere personale e familiare, conciliazione vita-lavoro e fidelizzazione del personale.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_regolamento_interno_lavoro",
    "label": "E' stato adottato un Regolamento Interno per la corretta gestione del rapporto di lavoro",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_smart_working",
    "label": "Policy smart working?",
    "type": "select",
    "options": [
      "Sì — formalizzata",
      "Sì — informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_codice_disciplinare",
    "label": "Codice Disciplinare affisso e aggiornato?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_formazione_obbligatoria",
    "label": "Formazione obbligatoria regolarmente erogata?",
    "type": "select",
    "options": [
      "Sì — tutta aggiornata",
      "Sì — parzialmente",
      "No — lacune significative",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_2",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_collab_cococo",
    "label": "Collaboratori coordinati e continuativi (numero)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_collab_autonomi",
    "label": "Collaboratori a P.IVA / professionisti ricorrenti (numero)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_agenti",
    "label": "Agenti / rappresentanti (numero)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_outsourcing",
    "label": "Attività esternalizzate",
    "type": "multiselect",
    "options": [
      "IT",
      "Contabilità",
      "Logistica",
      "HR",
      "Legale",
      "Sostenibilità",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_outsourcing_contratti",
    "label": "Rapporti in outsourcing formalizzati con contratto?",
    "type": "select",
    "options": [
      "Sì — tutti",
      "Sì — maggior parte",
      "Solo alcuni",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_clausole_231",
    "label": "Contratti con terzi contengono clausole 231 / compliance?",
    "type": "select",
    "options": [
      "Sì — sistematiche",
      "Sì — per i principali",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_clausole_privacy",
    "label": "Contratti con clausole privacy (art. 28 GDPR)?",
    "type": "select",
    "options": [
      "Sì — sistematiche",
      "Sì — per i principali",
      "Raramente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_verifica_fornitori",
    "label": "Processo qualifica / due diligence fornitori?",
    "type": "select",
    "options": [
      "Sì — strutturato",
      "Sì — informale",
      "No"
    ],
    "required": true,
    "help": "È la procedura strutturata con cui la Società valuta, seleziona e monitora nel tempo i propri fornitori e partner commerciali prima e durante il rapporto contrattuale, verificando che possiedano requisiti adeguati sotto il profilo della solidità economica, dell'affidabilità operativa, della conformità normativa e dell'integrità etica.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_albo_fornitori",
    "label": "Albo fornitori qualificati?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_rischio_somministrazione",
    "label": "Rischio somministrazione illecita / appalto non genuino?",
    "type": "select",
    "options": [
      "Basso",
      "Medio",
      "Alto",
      "Non valutato"
    ],
    "required": true,
    "help": "È il rischio che un contratto formalmente qualificato come appalto di servizi o di opera mascheri, nella sostanza, una mera fornitura di manodopera al di fuori dei canali legali, in violazione della disciplina sulla somministrazione di lavoro.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_c_3",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_l1_owner",
    "label": "Chi è il responsabile della funzione commerciale/vendite? (nome e ruolo)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l1_clienti_selezione",
    "label": "Prima di avviare un rapporto con un nuovo cliente, vengono svolte verifiche di affidabilità (es. visura camerale, referenze, internet search)?",
    "type": "select",
    "options": [
      "Sempre",
      "Nella maggior parte dei casi",
      "Raramente",
      "Mai"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l1_offerta_approvazione",
    "label": "Chi può firmare offerte e preventivi commerciali? È previsto un limite di valore oltre il quale serve una seconda firma o approvazione?",
    "type": "select",
    "options": [
      "Sì — con soglie differenziate",
      "Sì — unica soglia per tutti",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l1_offerta_det",
    "label": "Indicare: soglie + funzione/soggetto che approva + modalità (firma singola o congiunta)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l1_contratti_firma",
    "label": "Chi è autorizzato a firmare i contratti con i clienti? Il processo prevede una revisione legale prima della firma?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l1_sconti_autorizzazione",
    "label": "Chi può concedere sconti, condizioni particolari o proroghe di pagamento? Esistono regole o limiti formalizzati?",
    "type": "select",
    "options": [
      "Sì — formalizzato e applicato",
      "Sì — formalizzato ma poco applicato",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l1_agenti_commerciali",
    "label": "La Società si avvale di agenti, rappresentanti o procacciatori d'affari?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l1_agenti_det",
    "label": "Se sì: numero + come vengono selezionati + il rapporto è scritto + come vengono calcolate e pagate le provvigioni",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_l1_fatturazione_segregazione",
    "label": "Chi emette le fatture attive? La funzione di fatturazione è separata da chi gestisce il rapporto commerciale con il cliente?",
    "type": "select",
    "options": [
      "Sì — funzioni separate",
      "Parzialmente",
      "No — stessa persona/funzione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_l1_note_credito",
    "label": "Chi può emettere note di credito a favore dei clienti? Esistono regole o limiti formalizzati?",
    "type": "select",
    "options": [
      "Sì — formalizzato e applicato",
      "Sì — formalizzato ma poco applicato",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_l1_anomalie",
    "label": "Nell'ultimo triennio si sono verificate situazioni anomale nel ciclo attivo (es. richieste di pagamento in contanti, pressioni a emettere fatture irregolari, clienti con comportamenti insoliti)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_l1_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_1",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_l2_owner",
    "label": "Chi è il responsabile degli acquisti? (nome e ruolo)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l2_fornitori_selezione",
    "label": "Esiste un processo strutturato per la scelta dei fornitori (confronto offerte, albo qualificati, verifica affidabilità)?",
    "type": "select",
    "options": [
      "Sì — formalizzato e applicato",
      "Sì — formalizzato ma poco applicato",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l2_ordini_approvazione",
    "label": "Chi può emettere ordini di acquisto? Esistono soglie di spesa che richiedono autorizzazioni di livelli diversi?",
    "type": "select",
    "options": [
      "Sì — con soglie differenziate",
      "Sì — unica soglia per tutti",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l2_ordini_det",
    "label": "Indicare: soglie + funzione/soggetto autorizzante + modalità (firma singola o congiunta)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l2_segregazione_acquisti",
    "label": "La stessa persona può fare la richiesta di acquisto, approvare l'ordine e autorizzare il pagamento?",
    "type": "select",
    "options": [
      "No — funzioni sempre separate",
      "Parzialmente",
      "Sì — stessa persona per tutto"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l2_pagamenti_approvazione",
    "label": "Chi autorizza i pagamenti ai fornitori? È la stessa persona che ha approvato l'ordine?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l2_pagamenti_modalita",
    "label": "Principali modalità di pagamento usate con i fornitori",
    "type": "multiselect",
    "options": [
      "Bonifico bancario",
      "RiBa/SDD",
      "Carta di credito aziendale",
      "Contanti",
      "Assegno",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l2_consulenti_ricorrenti",
    "label": "La Società si avvale di consulenti o professionisti esterni in modo ricorrente? (es. legale, fiscale, tecnico, commerciale)",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_l2_consulenti_det",
    "label": "Se sì: in quali ambiti? Il rapporto è sempre formalizzato con contratto? Come vengono giustificate le prestazioni rese?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_l2_anomalie",
    "label": "Nell'ultimo triennio si sono verificate situazioni anomale nel ciclo passivo (es. fornitori sconosciuti o non verificati, pagamenti a soggetti diversi dal fornitore, richieste di pagamento su conti esteri o in contanti)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_l2_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_2",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_l3_owner",
    "label": "Chi gestisce operativamente la tesoreria e i flussi finanziari? (nome e ruolo)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l3_conti_numero",
    "label": "Quanti conti correnti bancari ha la Società e presso quali istituti?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l3_cassa_contanti",
    "label": "La Società gestisce un fondo cassa in contanti? Se sì, chi lo gestisce e come viene rendicontato?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l3_cassa_det",
    "label": "Se sì, descrivere: ammontare massimo + chi custodisce + frequenza rendiconto",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l3_finanziamenti",
    "label": "La Società accede a finanziamenti bancari o da altri soggetti (soci, holding, terzi)?",
    "type": "select",
    "options": [
      "Continuativa",
      "Frequente",
      "Occasionale",
      "Rara",
      "Assente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l3_finanziamenti_chi",
    "label": "Se sì, chi delibera e firma i contratti di finanziamento? Il processo è formalizzato e documentato?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l3_operazioni_infragruppo_fin",
    "label": "La Società effettua operazioni finanziarie con società del gruppo o con i soci (prestiti, anticipazioni, rimborsi di finanziamenti soci)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l3_operazioni_infragruppo_det",
    "label": "Se sì: tipologia + controparte + importi + formalizzazione contrattuale",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_l3_anomalie",
    "label": "Nell'ultimo triennio si sono verificate movimentazioni finanziarie anomale (es. pagamenti a soggetti sconosciuti, prelievi di contanti rilevanti, rimesse verso l'estero senza contratto a supporto)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_l3_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_3",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_l4_owner",
    "label": "Chi gestisce le risorse umane (HR)? (nome e ruolo — interno o esterno)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l4_assunzioni_chi",
    "label": "Chi decide di assumere una nuova risorsa e chi firma il contratto di lavoro?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l4_lavoratori_stranieri",
    "label": "La Società impiega lavoratori stranieri extra-UE? Se sì, vengono verificati i permessi di soggiorno?",
    "type": "select",
    "options": [
      "Sì — con verifiche sistematiche",
      "Sì — senza verifiche strutturate",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l4_retribuzioni_chi",
    "label": "Chi elabora le buste paga? Chi autorizza variazioni retributive (aumenti, premi, straordinari)?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l4_note_spese",
    "label": "Esiste una policy per il rimborso delle note spese?",
    "type": "select",
    "options": [
      "Sì — formalizzato e applicato",
      "Sì — formalizzato ma poco applicato",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l4_note_spese_det",
    "label": "Se sì: chi approva le note spese? Quali documenti giustificativi sono richiesti? Esistono soglie oltre cui serve autorizzazione aggiuntiva?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l4_anomalie",
    "label": "Nell'ultimo triennio si sono verificate irregolarità nella gestione del personale (es. lavoratori non regolarmente registrati, pagamenti fuori busta, irregolarità documentali)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l4_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_4",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_l5_owner",
    "label": "Chi è il responsabile delle operations/produzione/logistica? (nome e ruolo)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l5_attivita_desc",
    "label": "Descrivere sinteticamente le principali attività operative (produzione, lavorazione, trasformazione, logistica) e i luoghi in cui si svolgono",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l5_subappalto",
    "label": "La Società ricorre a subappalto o affida lavori/fasi produttive a terzi?",
    "type": "select",
    "options": [
      "Continuativa",
      "Frequente",
      "Occasionale",
      "Rara",
      "Assente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l5_subappalto_det",
    "label": "Se sì: in quali attività? Come vengono selezionati e verificati i subappaltatori? I contratti includono obblighi di rispetto delle normative (sicurezza, lavoro, ecc.)?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l5_rifiuti_desc",
    "label": "La Società produce rifiuti speciali o pericolosi? Chi gestisce lo smaltimento e con quale documentazione (FIR, MUD)?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l5_import_export",
    "label": "La Società effettua importazioni o esportazioni di beni?",
    "type": "select",
    "options": [
      "Continuativa",
      "Frequente",
      "Occasionale",
      "Rara",
      "Assente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l5_import_export_det",
    "label": "Se sì: tipologia di beni + Paesi coinvolti + chi gestisce le pratiche doganali",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l5_anomalie",
    "label": "Nell'ultimo triennio si sono verificate anomalie nelle operations (es. contestazioni doganali, smaltimenti irregolari, irregolarità su merci)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_l5_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_5",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_l6_owner",
    "label": "Chi gestisce la contabilità e gli adempimenti fiscali? (nome e ruolo — interno o commercialista esterno)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l6_dichiarazioni_chi",
    "label": "Chi predispone e chi firma le dichiarazioni fiscali? Prima della presentazione c'è una verifica interna?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l6_crediti_imposta",
    "label": "La Società utilizza crediti d'imposta o agevolazioni fiscali (es. credito R&D, Transizione 4.0, bonus edilizi, crediti ZES)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l6_crediti_det",
    "label": "Se sì: tipologia + importo + chi ha seguito la pratica + documentazione disponibile",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l6_transfer_pricing",
    "label": "La Società effettua operazioni infragruppo soggette a transfer pricing? Esiste documentazione idonea a supporto?",
    "type": "select",
    "options": [
      "Sì — con documentazione conforme",
      "Sì — senza documentazione",
      "No",
      "Non applicabile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l6_anomalie",
    "label": "Nell'ultimo triennio si sono verificate irregolarità contabili o fiscali (es. fatture dubbie ricevute o emesse, rettifiche contabili rilevanti non giustificate, eccepite dall'Agenzia delle Entrate o dalla GdF)?",
    "type": "select",
    "options": [
      "Sì — descrivere",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_l6_anomalie_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_6",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_l7_owner",
    "label": "Chi gestisce la comunicazione esterna e le relazioni istituzionali? (nome e ruolo)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_7",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l7_sponsorizzazioni_donazioni",
    "label": "La Società eroga sponsorizzazioni, donazioni o contributi a favore di soggetti terzi (associazioni, enti, eventi, persone fisiche)?",
    "type": "select",
    "options": [
      "Continuativa",
      "Frequente",
      "Occasionale",
      "Rara",
      "Assente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_7",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l7_sponsorizzazioni_det",
    "label": "Se sì: a favore di chi? Per quali importi? Chi autorizza? Sono previsti criteri formalizzati di selezione dei beneficiari?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_7",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l7_contributi_politici",
    "label": "La Società ha effettuato nell'ultimo triennio contributi, sponsorizzazioni o erogazioni a favore di partiti politici, candidati o fondazioni politiche?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_7",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l7_contributi_politici_det",
    "label": "Se sì: beneficiario + importo + modalità di pagamento",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_7",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l8_sistemi_principali",
    "label": "Quali sono i principali sistemi informativi in uso (ERP, CRM, gestionale contabile, piattaforme cloud, ecc.)?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_l8_accessi_profili",
    "label": "L'accesso ai sistemi è regolato da credenziali personali e profili utente differenziati per funzione e livello di responsabilità?",
    "type": "select",
    "options": [
      "Sì — sistematicamente",
      "Parzialmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_l8_accessi_esterni",
    "label": "Soggetti esterni (fornitori IT, consulenti, manutentori) hanno accesso ai sistemi aziendali? Se sì, come viene regolato e monitorato questo accesso?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_l8_licenze_software",
    "label": "Il software utilizzato è regolarmente licenziato? Viene effettuata una verifica periodica delle licenze?",
    "type": "select",
    "options": [
      "Sì — verificato periodicamente",
      "Sì — ma non verificato",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_l8_incidenti_it",
    "label": "Nell'ultimo triennio si sono verificati accessi non autorizzati, attacchi informatici o perdite di dati rilevanti?",
    "type": "select",
    "options": [
      "Sì — gravi",
      "Sì — minori",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_l8_incidenti_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_l_8",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_policy_anticorruzione",
    "label": "Policy anticorruzione?",
    "type": "select",
    "options": [
      "Sì — formalizzata e diffusa",
      "Sì — solo formale",
      "No",
      "Non so",
      "In redazione"
    ],
    "required": true,
    "help": "È il documento interno con cui la Società definisce i principi, le regole di condotta e i presidi organizzativi adottati per prevenire ogni forma di corruzione — attiva e passiva, pubblica e privata — nell'ambito della propria attività e dei rapporti con terzi.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_anti_bribery_scope",
    "label": "Copre normative estere (FCPA, UK Bribery Act)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente",
      "Non so"
    ],
    "required": true,
    "help": "Significa verificare se la Policy anticorruzione della Società tiene conto — oltre che della normativa italiana — anche delle principali legislazioni anticorruzione straniere a portata extraterritoriale, in particolare il Foreign Corrupt Practices Act statunitense (FCPA) e il Bribery Act 2010 del Regno Unito (UKBA).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_gifts_policy",
    "label": "Policy omaggi, regali e ospitalità?",
    "type": "select",
    "options": [
      "Sì — con soglie e registro",
      "Sì — generica",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_sponsorizzazioni",
    "label": "Policy sponsorizzazioni e donazioni?",
    "type": "select",
    "options": [
      "Sì — formalizzata",
      "Prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_agenti_intermediari",
    "label": "Due diligence su agenti e intermediari?",
    "type": "select",
    "options": [
      "Sì — sistematica",
      "Sì — occasionale",
      "No"
    ],
    "required": true,
    "help": "È il processo di verifica preventiva e continuativa che la Società conduce su agenti commerciali, intermediari, procacciatori d'affari, broker, consulenti commerciali e qualsiasi altro soggetto che operi per conto o nell'interesse della Società nei rapporti con terzi — in particolare con clienti, fornitori, pubbliche amministrazioni o controparti estere.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_rapporti_pa",
    "label": "Tipologia rapporti con la PA (appalti, autorizzazioni, contributi, concessioni, ispezioni)",
    "type": "multiselect",
    "options": [
      "Appalti",
      "Autorizzazioni",
      "Ccontributi",
      "Concessioni",
      "Ispezioni",
      "Project Financing",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_gare_appalti",
    "label": "La Società partecipa a gare d'appalto pubbliche?",
    "type": "select",
    "options": [
      "Sì — frequentemente",
      "Sì — occasionalmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_contributi_pubblici",
    "label": "La Società riceve contributi / finanziamenti pubblici?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In passato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_wb_canale",
    "label": "Canale whistleblowing attivato?",
    "type": "select",
    "options": [
      "Sì — piattaforma digitale",
      "Sì — email/PEC dedicata",
      "Sì — altro canale",
      "No",
      "Non obbligatorio"
    ],
    "required": true,
    "help": "Il Whistleblowing è il sistema interno attraverso cui dipendenti, collaboratori e altri soggetti qualificati possono segnalare in modo riservato — e, se lo desiderano, in forma anonima — violazioni di legge, illeciti, irregolarità o condotte contrarie al codice etico e alle procedure aziendali di cui siano venuti a conoscenza nel contesto lavorativo.\nLa disciplina è stata profondamente riformata dal D.Lgs. 24/2023, che ha recepito la Direttiva UE 2019/1937 e ha sostituito la precedente normativa frammentata (art. 6, comma 2-bis, D.Lgs. 231/2001 e art. 54-bis D.Lgs. 165/2001). La nuova disciplina si applica a tutti i soggetti del settore privato che:\nhanno impiegato nell'ultimo anno una media di almeno 50 lavoratori subordinati con contratti a tempo determinato o indeterminato; oppure\nhanno adottato un Modello 231, indipendentemente dal numero di dipendenti; oppure\noperano in settori regolamentati (servizi finanziari, sicurezza dei trasporti, tutela dell'ambiente).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_wb_tipologia",
    "label": "Tipologia canale whistleblowing",
    "type": "select",
    "options": [
      "Tradizionale",
      "Digitale",
      "Mista"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_wb_gestore",
    "label": "Chi gestisce le segnalazioni?",
    "type": "select",
    "options": [
      "OdV",
      "Responsabile compliance",
      "Comitato dedicato",
      "Soggetto esterno",
      "Non definito"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_wb_procedura",
    "label": "Esiste ina procedura scritta per gestione segnalazioni?",
    "type": "select",
    "options": [
      "Sì — completa",
      "Sì — da aggiornare",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_wb_informativa",
    "label": "Dipendenti e Collaboratori sono informati del canale e delle tutele?",
    "type": "select",
    "options": [
      "Sì — formazione e comunicazione",
      "Sì — solo comunicazione scritta",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_wb_segnalazioni",
    "label": "Segnalazioni ricevute nell'ultimo biennio (numero)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_wb_privacy_dpia",
    "label": "DPIA effettuata dalla Società sul canale whistleblowing?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "La DPIA (Data Protection Impact Assessment — Valutazione d'impatto sulla protezione dei dati) è l'analisi documentata con cui la Società valuta preventivamente i rischi che il trattamento dei dati personali connesso al canale whistleblowing può comportare per i diritti e le libertà delle persone coinvolte — segnalanti, segnalati, testimoni e facilitatori.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_privacy_gestione",
    "label": "La Società come gestisce la privacy?",
    "type": "select",
    "options": [
      "Modalità tradizionale/cartacea",
      "Modalità digitale",
      "Modalità mista"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_privacy_software",
    "label": "In caso di modalità digtale o mista, quale software viene utilizzato?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_dpo_nominato",
    "label": "DPO nominato?",
    "type": "select",
    "options": [
      "Sì — interno",
      "Sì — esterno",
      "No — non obbligatorio",
      "No — obbligatorio ma non nominato"
    ],
    "required": true,
    "help": "Il DPO — Data Protection Officer (Responsabile della Protezione dei Dati) è la figura professionale — interna o esterna all'organizzazione — incaricata di sorvegliare in modo indipendente la conformità della Società alla normativa in materia di protezione dei dati personali (GDPR e D.Lgs. 196/2003, come modificato dal D.Lgs. 101/2018).Quando la nomina è obbligatoria?\nL'art. 37 del Regolamento UE 2016/679 (GDPR) impone la designazione del DPO quando:\nil trattamento è effettuato da un'autorità pubblica o da un organismo pubblico (ad eccezione delle autorità giurisdizionali nell'esercizio delle funzioni giurisdizionali);\nle attività principali della Società consistono in trattamenti che, per natura, ambito o finalità, richiedono il monitoraggio regolare e sistematico degli interessati su larga scala (es. profilazione della clientela, videosorveglianza estesa, geolocalizzazione sistematica dei dipendenti, marketing comportamentale);\nle attività principali della Società consistono nel trattamento su larga scala di categorie particolari di dati (dati sanitari, biometrici, genetici, relativi a opinioni politiche, convinzioni religiose, appartenenza sindacale — art. 9 GDPR) o di dati relativi a condanne penali e reati (art. 10 GDPR).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_privacy_figure_referenti",
    "label": "Sono state individuate figure interne o esterne per la gestione della privacy?",
    "type": "select",
    "options": [
      "Sì — internamente",
      "Sì — esternamente",
      "Sì — sia interne che esterne",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_registro_trattamenti",
    "label": "La Società ha prediposto il Registro trattamenti ex art. 30 GDPR?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "No"
    ],
    "required": true,
    "help": "Il Registro dei Trattamenti è il documento — cartaceo o, più frequentemente, in formato elettronico — con cui la Società censisce e descrive in modo strutturato tutti i trattamenti di dati personali effettuati nell'ambito della propria attività, mantenendolo costantemente aggiornato e rendendolo disponibile su richiesta del Garante per la protezione dei dati personali.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_informative",
    "label": "Informative privacy predisposte (dipendenti, clienti, fornitori, sito)?",
    "type": "select",
    "options": [
      "Sì — tutte",
      "Sì — parziali",
      "No"
    ],
    "required": true,
    "help": "Sono i documenti con cui la Società comunica a ciascuna categoria di interessati — in modo chiaro, conciso e facilmente accessibile — quali dati personali raccoglie, per quali finalità, con quali modalità e per quanto tempo li tratta, nonché quali diritti spettano all'interessato stesso. L'informativa è l'espressione principale del principio di trasparenza, pilastro del GDPR.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_nomine_responsabili",
    "label": "Nomine responsabili trattamento ex art. 28 GDPR?",
    "type": "select",
    "options": [
      "Sì — tutti i fornitori",
      "Sì — principali",
      "No"
    ],
    "required": true,
    "help": "È l'atto formale — contratto o altro atto giuridico vincolante — con cui la Società, in qualità di Titolare del trattamento, designa i soggetti esterni (Responsabili esterni del trattamento) che trattano dati personali per suo conto, disciplinando obblighi, limiti e garanzie del trattamento affidato.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_dpia",
    "label": "DPIA (Valutazioni d'impatto) effettuate?",
    "type": "select",
    "options": [
      "Sì — per tutti i trattamenti a rischio",
      "Sì — parziali",
      "Non necessarie",
      "No"
    ],
    "required": true,
    "help": "La DPIA — Valutazioni d'impatto sulla protezione dei dati (art. 35 GDPR) è l'analisi documentata con cui la Società valuta preventivamente i rischi che uno specifico trattamento di dati personali può comportare per i diritti e le libertà delle persone coinvolte, individuando le misure idonee a mitigarli.Quando è obbligatoria?\nL'art. 35 GDPR impone la DPIA quando un trattamento, per natura, ambito, contesto o finalità, presenta un rischio elevato. In particolare:\nvalutazione sistematica e globale di aspetti personali basata su trattamento automatizzato, inclusa la profilazione, da cui derivano decisioni con effetti significativi sulle persone;\ntrattamento su larga scala di categorie particolari di dati (sanitari, biometrici, genetici — art. 9 GDPR) o di dati relativi a condanne penali (art. 10 GDPR);\nsorveglianza sistematica su larga scala di una zona accessibile al pubblico (es. videosorveglianza estesa).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_misure_sicurezza",
    "label": "Misure sicurezza tecniche e organizzative (art. 32 GDPR)?",
    "type": "select",
    "options": [
      "Sì — documentate",
      "Sì — non documentate",
      "Parziali",
      "Non valutate"
    ],
    "required": true,
    "help": "Sono l'insieme dei presidi — tecnologici e procedurali — che la Società adotta per garantire un livello di sicurezza adeguato al rischio connesso al trattamento dei dati personali, proteggendoli da accessi non autorizzati, perdita, distruzione, alterazione o divulgazione accidentale o illecita.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_data_breach",
    "label": "Procedura gestione data breach formalizzata?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "L'art. 4, n. 12, GDPR definisce la violazione dei dati personali (data breact) come qualsiasi evento — accidentale o illecito — che comporta la distruzione, la perdita, la modifica, la divulgazione non autorizzata o l'accesso non autorizzato ai dati personali trattati dalla Società. Non si limita agli attacchi informatici: è data breach anche lo smarrimento di un dispositivo aziendale non cifrato, l'invio di un'email contenente dati personali al destinatario sbagliato, il furto di documenti cartacei, l'accesso abusivo da parte di un dipendente non autorizzato, la cancellazione accidentale di un database senza backup, un attacco ransomware che rende i dati indisponibili.\nLa Procedura di gestione data breach (artt. 33-34 GDPR) è il documento interno che definisce le regole operative che la Società deve seguire in caso di violazione dei dati personali (data breach), disciplinando le fasi di rilevazione, valutazione, contenimento, notifica e documentazione dell'incidente.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_trasferimenti_extra_ue",
    "label": "Trasferimenti dati extra UE?",
    "type": "select",
    "options": [
      "Sì — con garanzie adeguate",
      "Sì — senza garanzie verificate",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_formazione_privacy",
    "label": "Formazione privacy erogata?",
    "type": "select",
    "options": [
      "Sì — periodica",
      "Sì — una tantum",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_sanzioni_garante",
    "label": "Sanzioni del Garante Privacy ricevute?",
    "type": "multiselect",
    "options": [
      "Sì",
      "No",
      "Procedimenti in corso"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_videosorveglianza",
    "label": "La Società utilizza sistemi/impianti di videosorveglianza?",
    "type": "select",
    "options": [
      "Sì — autorizzati ITL/accordo sindacale",
      "Sì — non autorizzati",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_videosorveglianza_det",
    "label": "Se sì, in quali ambienti?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_tracciamento_gps",
    "label": "La Società utilizza sistemi di tracciamento GPS di veicoli e mezzi?",
    "type": "select",
    "options": [
      "Sì — autorizzati ITL/accordo sindacale",
      "Sì — non autorizzati",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_tracciamento_gps_det",
    "label": "Se sì, per quali mezzi e/o veicoli",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_4",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_it_infrastruttura_server",
    "label": "L'impresa dispone di server fisici o virtuali dedicati?",
    "type": "multiselect",
    "options": [
      "Server fisici on-premise",
      "Server virtuali on-premise",
      "Cloud (AWS/Azure/Google)",
      "Hosting esterno",
      "Nessun server dedicato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_it_workstation",
    "label": "Numero di workstation/PC in dotazione",
    "type": "number",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_it_dispositivi_mobili",
    "label": "L'impresa fornisce dispositivi mobili aziendali (smartphone, tablet, laptop)?",
    "type": "select",
    "options": [
      "Sì, a tutti",
      "Sì, solo ad alcuni ruoli",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_it_dispositivi_mobili_n",
    "label": "Numero dispositivi mobili",
    "type": "number",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_it_byod",
    "label": "È consentito l'uso di dispositivi personali per scopi lavorativi?",
    "type": "select",
    "options": [
      "Sì, con policy formalizzata",
      "Sì, senza policy",
      "No",
      "Non definito"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_it_erp",
    "label": "L'impresa utilizza un sistema ERP (Enterprise Resource Planning)?",
    "type": "select",
    "options": [
      "Sì, integrato",
      "Sì, modulare",
      "No, software gestionali separati",
      "No",
      "In implementazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_it_crm",
    "label": "L'impresa utilizza un sistema CRM (Customer Relationship Management)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In implementazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_it_backup",
    "label": "È attivo un sistema di backup dei dati aziendali?",
    "type": "multiselect",
    "options": [
      "Sì, automatico e quotidiano",
      "Sì, periodico",
      "Sì, manuale",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_it_backup_modalita",
    "label": "Com evengono eseguiti i back-up?",
    "type": "multiselect",
    "options": [
      "Su server locale",
      "Su server in cloud",
      "Su hardisk esterno"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_it_disaster_recovery",
    "label": "Esiste un piano di Disaster Recovery e Business Continuity per i sistemi IT?",
    "type": "select",
    "options": [
      "Sì, formalizzato e testato",
      "Sì, formalizzato ma non testato",
      "In fase di sviluppo",
      "No"
    ],
    "required": true,
    "help": "Sono due documenti distinti ma complementari con cui la Società pianifica le azioni necessarie per garantire la continuità operativa dell'organizzazione e il ripristino dei sistemi informativi in caso di eventi avversi — naturali, tecnologici o dolosi — che ne compromettano la disponibilità.\nIl Business Continuity Plan (BCP) — è il piano di più ampio respiro che definisce le strategie, le procedure e le risorse necessarie affinché i processi aziendali critici possano proseguire — anche in modalità degradata — durante e dopo un evento disruptivo. Non riguarda solo l'IT ma l'intera organizzazione: sedi alternative, catena di comando in emergenza, comunicazione interna ed esterna, gestione del personale, rapporti con fornitori e clienti, adempimenti normativi e contrattuali urgenti.\nIl Disaster Recovery Plan (DRP) — è la componente tecnologica del BCP, focalizzata specificamente sul ripristino dell'infrastruttura informatica, delle applicazioni, dei database e delle comunicazioni digitali dopo un incidente grave. Definisce le modalità tecniche di recupero dei sistemi, le priorità di ripristino e i livelli di servizio garantiti.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_it_antivirus",
    "label": "Sono installati e aggiornati sistemi antivirus/antimalware su tutti i dispositivi?",
    "type": "select",
    "options": [
      "Sì, su tutti i dispositivi",
      "Sì, solo su alcuni",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_it_firewall",
    "label": "La rete aziendale è protetta da firewall?",
    "type": "multiselect",
    "options": [
      "Sì, firewall hardware",
      "Sì, firewall software",
      "Sì, entrambi",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_it_responsabile",
    "label": "È presente un Responsabile IT/CTO formalmente incaricato?",
    "type": "select",
    "options": [
      "Sì, interno",
      "Sì, esterno/consulente",
      "No, gestione informale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_it_amministratore_sistema",
    "label": "È stato nominato un Amministratore di Sistema?",
    "type": "select",
    "options": [
      "Sì, interno",
      "Sì, esterno",
      "No",
      "Non necessario"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_it_helpdesk",
    "label": "È attivo un servizio di assistenza IT (helpdesk) per il personale?",
    "type": "select",
    "options": [
      "Sì, interno",
      "Sì, esterno",
      "Sì, misto",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_it_formazione",
    "label": "Viene erogata formazione periodica al personale su sicurezza informatica e uso dei sistemi?",
    "type": "select",
    "options": [
      "Sì, regolarmente",
      "Sì, occasionalmente",
      "Solo in onboarding",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_nis2_ambito",
    "label": "La Società rientra nell'ambito di applicazione della Direttiva NIS 2 (Dir. UE 2022/2555, recepita con D.Lgs. 138/2024)?",
    "type": "select",
    "options": [
      "Sì — soggetto essenziale",
      "Sì — soggetto importante",
      "No",
      "In fase di valutazione",
      "Non so"
    ],
    "required": true,
    "help": "La Direttiva NIS 2 (Network and Information Security) è il quadro normativo europeo che stabilisce obblighi in materia di cybersicurezza per le imprese e gli enti che operano in settori considerati essenziali o importanti per il funzionamento dell'economia e della società. In Italia è stata recepita con il D.Lgs. 138/2024, in vigore dal 16 ottobre 2024.\nLa Direttiva si applica a due categorie di soggetti:\nSoggetti essenziali — imprese di grandi dimensioni (oltre 250 dipendenti o fatturato superiore a € 50 milioni o totale di bilancio superiore a € 43 milioni) operanti nei settori ad alta criticità: energia (elettricità, petrolio, gas, idrogeno, teleriscaldamento); trasporti (aereo, ferroviario, marittimo, stradale); settore bancario e infrastrutture dei mercati finanziari; settore sanitario (ospedali, laboratori, ricerca, produzione farmaceutica, dispositivi medici); acqua potabile e acque reflue; infrastrutture digitali (DNS, cloud computing, data center, CDN, servizi fiduciari, reti di comunicazione elettronica); gestione dei servizi ICT B2B; pubblica amministrazione; spazio.\nSoggetti importanti — imprese di medie dimensioni (oltre 50 dipendenti o fatturato superiore a € 10 milioni) operanti sia nei settori ad alta criticità sopra elencati sia in altri settori critici: servizi postali e di corriere; gestione dei rifiuti; fabbricazione, produzione e distribuzione di sostanze chimiche; produzione, trasformazione e distribuzione di alimenti; fabbricazione di dispositivi medici, computer, elettronica, apparecchiature elettriche, macchinari, autoveicoli e altri mezzi di trasporto; fornitori di servizi digitali (marketplace online, motori di ricerca, piattaforme di social networking); ricerca scientifica.\nIndipendentemente dalle dimensioni, rientrano sempre nell'ambito di applicazione: i fornitori di reti di comunicazione elettronica pubbliche o servizi di comunicazione elettronica accessibili al pubblico; i prestatori di servizi fiduciari; i registri di nomi di dominio di primo livello e i fornitori di servizi DNS; i soggetti identificati come critici ai sensi della Direttiva CER (UE 2022/2557).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_nis2_settore",
    "label": "Se sì, in quale settore/sottosettore rientra la Società ai sensi degli Allegati I-IV del D.Lgs. 138/2024?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_nis2_registrazione_acn",
    "label": "La Società ha effettuato la registrazione sulla piattaforma dell'ACN (Agenzia per la Cybersicurezza Nazionale)?",
    "type": "select",
    "options": [
      "Sì — completata",
      "Sì — in corso",
      "No — non ancora avviata",
      "Non applicabile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_nis2_punto_contatto",
    "label": "È stato designato un punto di contatto unico per la Società ai fini NIS 2?",
    "type": "select",
    "options": [
      "Sì — formalizzato",
      "Sì — informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 19
  },
  {
    "fieldId": "m231_nis2_risk_assessment_cyber",
    "label": "È stata effettuata una valutazione del rischio cyber conforme all'art. 24 D.Lgs. 138/2024 (misure di gestione dei rischi)?",
    "type": "select",
    "options": [
      "Sì — aggiornata negli ultimi 12 mesi",
      "Sì — oltre 12 mesi fa",
      "No — mai effettuata",
      "In corso"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 20
  },
  {
    "fieldId": "m231_nis2_misure_sicurezza",
    "label": "La Società ha adottato misure tecniche, operative e organizzative di gestione dei rischi di sicurezza informatica?",
    "type": "multiselect",
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
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 21
  },
  {
    "fieldId": "m231_nis2_incident_reporting",
    "label": "È stata predisposta una procedura di notifica degli incidenti significativi al CSIRT Italia (art. 25 D.Lgs. 138/2024)?",
    "type": "select",
    "options": [
      "Sì — formalizzata e testata",
      "Sì — formalizzata ma non testata",
      "No — in fase di predisposizione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 22
  },
  {
    "fieldId": "m231_nis2_incidenti_occorsi",
    "label": "Incidenti di sicurezza informatica significativi nell'ultimo triennio?",
    "type": "select",
    "options": [
      "Nessuno",
      "1-2 incidenti",
      "3-5 incidenti",
      "Oltre 5 incidenti"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 23
  },
  {
    "fieldId": "m231_nis2_supply_chain",
    "label": "È stata valutata la sicurezza della catena di approvvigionamento ICT (fornitori e prestatori di servizi diretti)?",
    "type": "select",
    "options": [
      "Sì — con clausole contrattuali specifiche",
      "Sì — valutazione informale",
      "No",
      "In corso di valutazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 24
  },
  {
    "fieldId": "m231_nis2_formazione_organo",
    "label": "L'Organo Amministrativo (CdA/AU) ha ricevuto formazione specifica in materia di cybersicurezza ai sensi dell'art. 23 D.Lgs. 138/2024?",
    "type": "select",
    "options": [
      "Sì — regolarmente",
      "Sì — una tantum",
      "No — mai",
      "In programma"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 25
  },
  {
    "fieldId": "m231_nis2_responsabilita_organo",
    "label": "L'Organo Amministrativo ha formalmente approvato le misure di gestione dei rischi cyber e ne supervisiona l'attuazione?",
    "type": "select",
    "options": [
      "Sì — con delibera formale",
      "Sì — informalmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 26
  },
  {
    "fieldId": "m231_nis2_audit_vulnerability",
    "label": "Sono stati effettuati audit di sicurezza o test di penetrazione (vulnerability assessment/penetration test)?",
    "type": "select",
    "options": [
      "Sì — negli ultimi 12 mesi",
      "Sì — oltre 12 mesi fa",
      "No — mai",
      "In programma"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 27
  },
  {
    "fieldId": "m231_com_piano_marketing",
    "label": "L'impresa ha un piano di marketing formalizzato?",
    "type": "select",
    "options": [
      "Sì, annuale",
      "Sì, pluriennale",
      "In fase di sviluppo",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 28
  },
  {
    "fieldId": "m231_com_responsabile_marketing",
    "label": "È presente un Responsabile Marketing/Comunicazione formalmente incaricato?",
    "type": "select",
    "options": [
      "Sì, interno",
      "Sì, esterno/agenzia",
      "No, gestione informale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 29
  },
  {
    "fieldId": "m231_com_sito_web",
    "label": "L'impresa ha un sito web aziendale?",
    "type": "select",
    "options": [
      "Sì, aggiornato regolarmente",
      "Sì, ma non aggiornato",
      "In sviluppo",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 30
  },
  {
    "fieldId": "m231_com_social_media",
    "label": "L'impresa è presente sui social media?",
    "type": "multiselect",
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
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 31
  },
  {
    "fieldId": "m231_com_social_policy",
    "label": "Esiste una policy aziendale per l'uso dei social media?",
    "type": "select",
    "options": [
      "Sì, formalizzata",
      "Sì, informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 32
  },
  {
    "fieldId": "m231_com_newsletter",
    "label": "L'impresa gestisce newsletter o comunicazioni periodiche ai clienti/stakeholder?",
    "type": "select",
    "options": [
      "Sì, regolarmente",
      "Sì, occasionalmente",
      "No",
      "In progetto"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_5",
    "sortOrder": 33
  },
  {
    "fieldId": "m231_sicurezza_mog",
    "label": "La Società ha adottato un modello/sistema formalizzato di gestione sulla prevenzione e controllo dei rischi salute e sicurezza ai sensi dell'art. 30 del D.Lgs. 81/08?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In fase di adozione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_sicurezza_organigramma",
    "label": "E' stato predisposto e formalizzato un Organigramma sulla Sicurezza",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In fase di adozione"
    ],
    "required": true,
    "help": "È la rappresentazione grafica e documentale della struttura organizzativa della Società specificamente dedicata alla gestione della salute e sicurezza nei luoghi di lavoro, che identifica tutti i soggetti coinvolti nel sistema prevenzionistico, i rispettivi ruoli, le relazioni gerarchiche e funzionali e le responsabilità attribuite a ciascuno.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_sicurezza_funzionigramma",
    "label": "E' stato predisposto e formalizzato un Funzionigramma sulla Sicurezza",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In fase di adozione"
    ],
    "required": true,
    "help": "È il documento che integra e completa l'organigramma della sicurezza, descrivendo in modo analitico — per ciascuna figura del sistema prevenzionistico — le specifiche funzioni, i compiti operativi, le responsabilità, i poteri e i limiti di intervento, le relazioni con le altre figure e gli obblighi di reportistica.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_datore_lavoro_identita",
    "label": "Nell'ambito aziendale, chi è il Datore di Lavoro ai sensi del D.Lgs. 81/08?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_datore_lavoro_formale",
    "label": "Il datore di Lavoro è individuato formalmente?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "Come si individua il datore di lavoro nelle società di capitali?\nL'art. 2, comma 1, lett. b), D.Lgs. 81/2008 definisce datore di lavoro il soggetto titolare del rapporto di lavoro o, comunque, il soggetto che ha la responsabilità dell'organizzazione dell'impresa o dell'unità produttiva in quanto esercita i poteri decisionali e di spesa. Nelle società con CdA, la giurisprudenza consolidata della Cassazione ha chiarito che:\nse il CdA ha conferito una delega gestoria in materia di sicurezza a uno o più amministratori, il datore di lavoro è l'amministratore delegato, a condizione che la delega gli attribuisca effettivi poteri di organizzazione, gestione e spesa in materia;\nin assenza di delega gestoria, la qualifica di datore di lavoro grava sull'intero CdA collegialmente, con responsabilità solidale di tutti i consiglieri;\nnelle S.r.l. con amministratore unico, il datore di lavoro è sempre l'amministratore unico.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_delega_81",
    "label": "La Società ha delegato le funzioni previste dall'art.16 D.Lgs. 81/08 (delega di funzioni)?",
    "type": "select",
    "options": [
      "Sì — formale con requisiti di legge",
      "Sì — informale",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "La delega di funzioni in materia di sicurezza sul lavoro (art. 16 D.Lgs. 81/2008)È l'atto formale con cui il datore di lavoro trasferisce a un altro soggetto — il delegato — l'esercizio di specifiche funzioni, compiti e responsabilità in materia di salute e sicurezza nei luoghi di lavoro, unitamente ai poteri organizzativi, gestionali e di spesa necessari per adempiervi.\nL'art. 17 D.Lgs. 81/2008 individua due obblighi indelegabili che restano in capo esclusivamente al datore di lavoro:\nla valutazione di tutti i rischi con la conseguente elaborazione del DVR (Documento di Valutazione dei Rischi);\nla designazione del RSPP (Responsabile del Servizio di Prevenzione e Protezione).\nQuesti obblighi non possono essere trasferiti in nessun caso, neppure mediante delega formalmente valida.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_delega_81_det",
    "label": "Se sì, a chi?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_delega_sicurezza_2381",
    "label": "La Società ha delegato la gestione della sicurezza ai sensi dell'art. 2381 c.c. (delega gestoria)?",
    "type": "select",
    "options": [
      "Sì — formale con requisiti di legge",
      "Sì — informale",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "La delega gestoria in materia di sicurezza (art. 2381 c.c.) è l'atto con cui il Consiglio di Amministrazione, ove lo statuto o l'assemblea lo consentano, delega le proprie attribuzioni — inclusa la gestione della sicurezza sul lavoro — a uno o più amministratori delegati o a un comitato esecutivo, determinando il contenuto, i limiti e le eventuali modalità di esercizio della delega.\nIn cosa si distingue dalla delega di funzioni ex art. 16 D.Lgs. 81/2008?\nSi tratta di due istituti giuridici diversi per natura, funzione e disciplina:\nDelega gestoria (art. 2381 c.c.) — è un atto di organizzazione interna dell'organo amministrativo, di natura societaria, con cui il CdA ripartisce al proprio interno le funzioni di gestione. L'amministratore delegato riceve il potere-dovere di gestire la materia delegata (es. sicurezza sul lavoro) e assume la qualifica di datore di lavoro ai fini del D.Lgs. 81/2008. Questa delega opera a livello apicale, tra organi societari.\nDelega di funzioni (art. 16 D.Lgs. 81/2008) — è un atto con cui il datore di lavoro (già individuato, anche per effetto della delega gestoria) trasferisce specifici compiti prevenzionistici a soggetti collocati nella linea operativa (dirigenti, preposti, responsabili di stabilimento o di cantiere). Opera a livello gestionale-operativo, all'interno dell'organizzazione aziendale.\nLe due deleghe possono — e tipicamente devono — coesistere: la delega gestoria individua chi è il datore di lavoro nell'ambito della struttura societaria; la delega di funzioni distribuisce gli obblighi prevenzionistici all'interno della struttura organizzativa.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_preposti_nominati",
    "label": "La Società ha nominato preposti in ambito sicurezza sul lavoro?",
    "type": "select",
    "options": [
      "Sì — formale con requisiti di legge",
      "Sì — informale",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "Il preposto è la persona che, in ragione delle competenze professionali e nei limiti dei poteri gerarchici e funzionali adeguati alla natura dell'incarico conferitogli, sovrintende all'attività lavorativa e garantisce l'attuazione delle direttive ricevute, controllandone la corretta esecuzione da parte dei lavoratori ed esercitando un funzionale potere di iniziativa (art. 2, comma 1, lett. e, D.Lgs. 81/2008).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_preposti_dettaglio",
    "label": "Se sì, chi ed in quali ambiti/aree?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_dvr",
    "label": "DVR redatto e aggiornato?",
    "type": "select",
    "options": [
      "Sì — aggiornato",
      "Sì — non aggiornato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_dvr_data",
    "label": "Data ultimo aggiornamento DVR",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_rspp",
    "label": "RSPP nominato?",
    "type": "select",
    "options": [
      "Sì — interno",
      "Sì — esterno",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_mc",
    "label": "Medico Competente nominato?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Non obbligatorio"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_rls",
    "label": "RLS eletto/designato?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_formazione_sicurezza",
    "label": "Formazione sicurezza (art. 37) regolarmente erogata e aggiornata?",
    "type": "select",
    "options": [
      "Sì — completa",
      "Sì — parziale / scadenze",
      "No — lacune significative"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_infortuni",
    "label": "Infortuni nell'ultimo triennio (numero e gravità)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_ispezioni_asl",
    "label": "Ispezioni ASL/INL nell'ultimo triennio?",
    "type": "select",
    "options": [
      "Sì — senza rilievi",
      "Sì — con prescrizioni",
      "Sì — con sanzioni",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_sanzioni_81",
    "label": "Sanzioni ricevute ex D.Lgs. 81/08?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_piano_emergenza",
    "label": "Piano emergenza e prove evacuazione?",
    "type": "select",
    "options": [
      "Sì — aggiornato con prove periodiche",
      "Sì — non aggiornato",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_6",
    "sortOrder": 19
  },
  {
    "fieldId": "m231_iso_9001",
    "label": "ISO 9001 (Qualità)",
    "type": "select",
    "options": [
      "Certificata — in corso di validità",
      "Certificata — in rinnovo",
      "In fase di certificazione",
      "Non certificata"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_iso_14001",
    "label": "ISO 14001 (Ambiente)",
    "type": "select",
    "options": [
      "Certificata",
      "In fase di certificazione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_iso_45001",
    "label": "ISO 45001 (Sicurezza sul lavoro)",
    "type": "select",
    "options": [
      "Certificata",
      "In fase di certificazione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_iso_27001",
    "label": "ISO 27001 (Sicurezza informazioni)",
    "type": "select",
    "options": [
      "Certificata",
      "In fase di certificazione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_iso_37001",
    "label": "ISO 37001 (Anticorruzione)",
    "type": "select",
    "options": [
      "Certificata",
      "In fase di certificazione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_iso_37301",
    "label": "ISO 37301 (Compliance integrata)",
    "type": "select",
    "options": [
      "Certificata",
      "In fase di certificazione",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_altre_certificazioni",
    "label": "Altre certificazioni / accreditamenti di settore",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_nc_aperte",
    "label": "Sono state rilevate non conformità in occasione degli ultimo audit?",
    "type": "select",
    "options": [
      "Sì — maggiori",
      "Sì — solo minori",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_rating_legalita",
    "label": "Rating di legalità AGCM",
    "type": "select",
    "options": [
      "Ottenuto",
      "Richiesto",
      "Non richiesto"
    ],
    "required": true,
    "help": "È un indicatore sintetico — espresso in \"stellette\" da una (★) a tre (★★★) — rilasciato dall'Autorità Garante della Concorrenza e del Mercato (AGCM) alle imprese italiane che ne facciano richiesta, attestante il rispetto di elevati standard di legalità nella conduzione dell'attività d'impresa.\nL'istituto è stato introdotto dall'art. 5-ter del D.L. 1/2012 (convertito con L. 27/2012) e disciplinato dal Regolamento attuativo dell'AGCM (Delibera 28 luglio 2020, n. 28361, e successive modifiche). Il rating ha durata biennale, è rinnovabile e può essere revocato o sospeso in caso di perdita dei requisiti.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_7",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_aia_aua",
    "label": "Autorizzazioni ambientali (AIA, AUA)?",
    "type": "select",
    "options": [
      "Sì — tutte in regola",
      "Sì — da rinnovare",
      "Non necessarie",
      "Non in regola"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_rifiuti",
    "label": "Gestione rifiuti conforme?",
    "type": "select",
    "options": [
      "Sì — conforme",
      "Sì — parzialmente",
      "Non conforme"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_emissioni",
    "label": "Monitoraggio emissioni CO2 (Scope 1-2-3)?",
    "type": "select",
    "options": [
      "Sì — Scope 1-2-3",
      "Sì — solo Scope 1-2",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_bilancio_sostenibilita",
    "label": "Report di sostenibilità redatto?",
    "type": "select",
    "options": [
      "Sì — conforme GRI/ESRS",
      "Sì — volontario",
      "No — obbligatorio (CSRD)",
      "No — non obbligatorio"
    ],
    "required": true,
    "help": "È il documento con cui la Società comunica in modo strutturato e standardizzato le proprie performance, i rischi, gli impatti e le strategie in materia ambientale, sociale e di governance (ESG — Environmental, Social, Governance), rivolgendosi agli stakeholder interni ed esterni: investitori, istituti di credito, clienti, fornitori, dipendenti, comunità locali e autorità di vigilanza.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_due_diligence_esg",
    "label": "La Società svolge due diligence ESG sulla catena di fornitura?",
    "type": "select",
    "options": [
      "Sì — strutturata",
      "Sì — parziale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_sanzioni_ambientali",
    "label": "Sanzioni ambientali ricevute?",
    "type": "multiselect",
    "options": [
      "Sì",
      "No",
      "Procedimenti in corso"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_obiettivi_sostenibilita",
    "label": "Obiettivi di sostenibilità formalizzati (SDGs, net-zero)?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_obiettivi_sostenibilita_sociale",
    "label": "La Società ha promosso o sostenuto iniziative benefit con impatto sociale per persone e/o comunità",
    "type": "textarea",
    "options": [
      "Sì",
      "No",
      "No ma intende promuoverle"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_8",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_aml_soggetto",
    "label": "La Società è soggetto obbligato ai sensi del D.Lgs. 231/2007?",
    "type": "select",
    "options": [
      "Sì — direttamente",
      "Sì — tramite gruppo",
      "No",
      "Non so"
    ],
    "required": true,
    "help": "Il D.Lgs. 231/2007 è la normativa italiana di recepimento delle Direttive europee in materia di prevenzione del riciclaggio di denaro e del finanziamento del terrorismo. Individua una serie di categorie di soggetti — c.d. soggetti obbligati — tenuti ad adottare specifici presidi preventivi.\nChi sono i soggetti obbligati?\nGli artt. 3 e 3-bis del D.Lgs. 231/2007 elencano tassativamente le categorie:\nIntermediari bancari e finanziari — banche, SIM, SGR, SICAV, istituti di pagamento, istituti di moneta elettronica, intermediari finanziari ex art. 106 TUB, società fiduciarie, Poste Italiane per l'attività finanziaria.\nProfessionisti — dottori commercialisti ed esperti contabili, consulenti del lavoro, notai, avvocati (quando assistono il cliente nella pianificazione o realizzazione di operazioni finanziarie o immobiliari o nella gestione di denaro, beni o attività), revisori legali e società di revisione.\nAltri operatori — agenti immobiliari, mediatori creditizi, recupero crediti, custodia e trasporto valori, commercio di oggetti preziosi (per operazioni pari o superiori a € 10.000), case d'asta, gallerie d'arte, operatori in valuta virtuale e prestatori di servizi di portafoglio digitale, agenzie di scommesse e gioco.\nQuali obblighi comporta?\nI soggetti obbligati devono adottare: adeguata verifica della clientela (Know Your Customer — identificazione del cliente, del titolare effettivo, verifica dello scopo e della natura del rapporto); conservazione dei dati e della documentazione per 10 anni; segnalazione di operazioni sospette (SOS) all'UIF — Unità di Informazione Finanziaria; astensione dall'operazione in caso di impossibilità di adempiere agli obblighi di adeguata verifica; autovalutazione del rischio di riciclaggio; adozione di procedure interne, formazione del personale e controlli interni.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_aml_responsabile",
    "label": "È stato nominato un Responsabile Antiriciclaggio?",
    "type": "select",
    "options": [
      "Sì — interno",
      "Sì — esterno",
      "No",
      "Non obbligatorio"
    ],
    "required": true,
    "help": "È il soggetto incaricato di presidiare il rispetto della normativa antiriciclaggio all'interno dell'organizzazione, assicurando che gli obblighi previsti dal D.Lgs. 231/2007 siano correttamente attuati e mantenuti nel tempo.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_aml_delegato_sos",
    "label": "È stato nominato un Delegato per le segnalazioni di operazioni sospette (SOS)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Il delegato per le segnalazioni di operazioni sospette (SOS) è  il soggetto formalmente incaricato di valutare e trasmettere all'UIF (Unità di Informazione Finanziaria presso la Banca d'Italia) le segnalazioni di operazioni sospette di riciclaggio o finanziamento del terrorismo rilevate nell'ambito dell'attività della Società.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_aml_adeguata_verifica",
    "label": "Sono applicate procedure di adeguata verifica della clientela?",
    "type": "select",
    "options": [
      "Sì — ordinaria e rafforzata",
      "Sì — solo ordinaria",
      "Parzialmente",
      "No"
    ],
    "required": true,
    "help": "È l'insieme delle procedure con cui il soggetto obbligato identifica il cliente, ne verifica l'identità, individua il titolare effettivo e acquisisce informazioni sullo scopo e sulla natura del rapporto continuativo o della prestazione professionale, al fine di prevenire l'utilizzo del sistema economico e finanziario a fini di riciclaggio o finanziamento del terrorismo.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_aml_titolare_effettivo",
    "label": "Viene identificato il titolare effettivo per tutte le operazioni rilevanti?",
    "type": "select",
    "options": [
      "Sì — sistematicamente",
      "Sì — per le principali",
      "Non sempre",
      "No"
    ],
    "required": true,
    "help": "Il titolare effettivo è la persona fisica che, in ultima istanza, possiede o controlla un'entità giuridica cliente, ovvero la persona fisica per conto della quale un'operazione o un'attività è realizzata (art. 1, comma 2, lett. pp, D.Lgs. 231/2007).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_aml_profilo_rischio",
    "label": "Viene effettuata la profilatura del rischio di riciclaggio della clientela?",
    "type": "select",
    "options": [
      "Sì — con scoring",
      "Sì — qualitativa",
      "No"
    ],
    "required": true,
    "help": "È il processo con cui il soggetto obbligato attribuisce a ciascun cliente un livello di rischio di riciclaggio e finanziamento del terrorismo (basso, medio, alto), sulla base di una valutazione combinata di più fattori, al fine di calibrare le misure di adeguata verifica e il livello di monitoraggio da applicare al rapporto.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_aml_monitoraggio_continuativo",
    "label": "È attivo un monitoraggio continuativo dei rapporti e delle operazioni?",
    "type": "select",
    "options": [
      "Sì — automatizzato",
      "Sì — manuale",
      "Parziale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_aml_conservazione",
    "label": "Sono rispettati gli obblighi di conservazione dei dati e dei documenti?",
    "type": "select",
    "options": [
      "Sì — archivio informatico conforme",
      "Sì — archivio cartaceo",
      "Sì — archivio misto cartaceo e digitale",
      "Parzialmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_aml_strumento_digitale",
    "label": "In caso di utiizzo di strumento digitale, di quale si tratta?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_aml_sos_inviate",
    "label": "Sono state inviate segnalazioni di operazioni sospette (SOS) nell'ultimo triennio?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Non so"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_aml_sos_numero",
    "label": "Se sì, indicare il numero e gli esiti",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_aml_procedure_interne",
    "label": "Esistono procedure interne formalizzate per la prevenzione del riciclaggio?",
    "type": "select",
    "options": [
      "Sì — aggiornate",
      "Sì — da aggiornare",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_aml_formazione",
    "label": "Viene erogata formazione antiriciclaggio al personale?",
    "type": "select",
    "options": [
      "Sì — periodica",
      "Sì — una tantum",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_aml_autovalutazione_rischio",
    "label": "È stata effettuata un'autovalutazione del rischio di riciclaggio?",
    "type": "select",
    "options": [
      "Sì — ultimo anno",
      "Sì — oltre 1 anno fa",
      "No"
    ],
    "required": true,
    "help": "È l'analisi documentata con cui il soggetto obbligato identifica, valuta e comprende il proprio livello di esposizione al rischio di essere utilizzato — consapevolmente o inconsapevolmente — come veicolo per operazioni di riciclaggio di denaro o finanziamento del terrorismo, al fine di adottare presidi proporzionati ed efficaci.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_aml_paesi_alto_rischio",
    "label": "L'impresa opera con controparti in Paesi ad alto rischio AML (liste GAFI/UE)?",
    "type": "select",
    "options": [
      "Sì — con misure rafforzate",
      "Sì — senza misure specifiche",
      "No"
    ],
    "required": true,
    "help": "Significa verificare se la Società intrattiene rapporti commerciali, finanziari o professionali con soggetti residenti, stabiliti o operanti in Paesi o giurisdizioni identificati come ad alto rischio di riciclaggio e finanziamento del terrorismo dalle principali autorità internazionali e dell'Unione Europea.\nQuali sono le liste di riferimento?\nLista GAFI/FATF — il Gruppo d'Azione Finanziaria Internazionale pubblica e aggiorna periodicamente due elenchi:\nLista nera (c.d. High-Risk Jurisdictions subject to a Call for Action) — Paesi con gravi carenze strategiche nei sistemi AML/CFT, nei confronti dei quali il GAFI invita tutti i Paesi membri ad applicare contromisure rafforzate. Attualmente comprende Paesi quali Myanmar, Iran e Corea del Nord.\nLista grigia (c.d. Jurisdictions under Increased Monitoring) — Paesi che presentano carenze strategiche ma che si sono impegnati con il GAFI a implementare un piano d'azione per risolverle. L'elenco è aggiornato periodicamente (tipicamente tre volte l'anno) e include un numero variabile di giurisdizioni.\nLista della Commissione Europea — la Commissione UE adotta, mediante Regolamento Delegato (da ultimo aggiornato con Reg. Delegato (UE) 2023/2070), un elenco autonomo di Paesi terzi ad alto rischio che presentano carenze strategiche nei rispettivi regimi nazionali di prevenzione del riciclaggio e del finanziamento del terrorismo. Tale elenco, pur ispirandosi alle valutazioni del GAFI, non coincide necessariamente con le liste GAFI e ha valore giuridico vincolante nell'ordinamento dell'Unione",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_aml_pep",
    "label": "Sono state identificate controparti PEP (Persone Esposte Politicamente)?",
    "type": "select",
    "options": [
      "Sì — con procedure dedicate",
      "Sì — senza procedure specifiche",
      "No"
    ],
    "required": true,
    "help": "Sono le persone fisiche che ricoprono o hanno ricoperto importanti cariche pubbliche, nonché i loro familiari stretti e le persone con cui intrattengono notoriamente stretti legami (c.d. close associates). La loro identificazione è un obbligo specifico dell'adeguata verifica rafforzata nell'ambito della normativa antiriciclaggio.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_aml_sanzioni_uif",
    "label": "Sanzioni ricevute da UIF, MEF o Autorità di Vigilanza in materia AML?",
    "type": "multiselect",
    "options": [
      "Sì",
      "No",
      "Procedimenti in corso"
    ],
    "required": true,
    "help": "Questa domanda verifica se la Società ha ricevuto provvedimenti sanzionatori da parte delle autorità competenti in materia di prevenzione del riciclaggio e del finanziamento del terrorismo, il che costituisce un indicatore significativo di inadeguatezza dei presidi antiriciclaggio dell'organizzazione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_aml_whistleblowing_aml",
    "label": "Esiste un canale interno per segnalazioni di sospetto riciclaggio (distinto dal WB 24/2023)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Integrato nel canale WB"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_aml_embargo_sanzioni",
    "label": "L'impresa verifica le liste di embargo e sanzioni internazionali (UE, OFAC, ONU)?",
    "type": "select",
    "options": [
      "Sì — sistematicamente",
      "Sì — occasionalmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_d_9",
    "sortOrder": 18
  },
  {
    "fieldId": "m231_pa_tipologia",
    "label": "Tipologie di rapporti con enti pubblici",
    "type": "multiselect",
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
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_pa_enti_riferimento",
    "label": "Principali enti pubblici con cui la Società intrattiene rapporti",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_pa_frequenza",
    "label": "Frequenza dei contatti con enti pubblici",
    "type": "select",
    "options": [
      "Quotidiana",
      "Settimanale",
      "Mensile",
      "Occasionale",
      "Rara"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_pa_soggetti_autorizzati",
    "label": "Sono individuati formalmente i soggetti autorizzati a intrattenere rapporti con la PA?",
    "type": "select",
    "options": [
      "Sì — con registro formale",
      "Sì — solo prassi interna",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_pa_procedura_rapporti",
    "label": "Esiste una procedura formalizzata per la gestione dei rapporti con funzionari pubblici?",
    "type": "select",
    "options": [
      "Sì — nel Modello 231",
      "Sì — procedura autonoma",
      "Solo prassi informale",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_pa_divieto_pagamenti",
    "label": "È previsto un divieto esplicito di pagamenti, utilità o vantaggi a funzionari pubblici?",
    "type": "select",
    "options": [
      "Sì — nel Codice Etico e nel Modello 231",
      "Sì — solo nel Codice Etico",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_pa_formazione_specifica",
    "label": "Il personale coinvolto nei rapporti con la PA riceve formazione anticorruzione specifica?",
    "type": "select",
    "options": [
      "Sì — periodica",
      "Sì — una tantum",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_pa_consulenti_intermediari",
    "label": "La Società si avvale di consulenti o intermediari per i rapporti con enti pubblici?",
    "type": "select",
    "options": [
      "Sì — con due diligence",
      "Sì — senza due diligence formalizzata",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_pa_gare_partecipazione",
    "label": "La Società partecipa a procedure di evidenza pubblica?",
    "type": "select",
    "options": [
      "Sì — frequentemente",
      "Sì — occasionalmente",
      "No",
      "In passato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_pa_gare_incidenza",
    "label": "Incidenza % degli appalti pubblici sul fatturato totale",
    "type": "select",
    "options": [
      "Oltre 50%",
      "25-50%",
      "10-25%",
      "Sotto 10%"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_pa_soa",
    "label": "Attestazione SOA in possesso?",
    "type": "select",
    "options": [
      "Sì — in corso di validità",
      "Sì — in rinnovo",
      "No — non necessaria",
      "No — in fase di ottenimento"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_pa_soa_det",
    "label": "Se sì, quali?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_pa_rating_anac",
    "label": "Rating di impresa ai sensi del D.Lgs. 36/2023 (Codice Contratti)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In valutazione"
    ],
    "required": true,
    "help": "È un sistema di valutazione reputazionale degli operatori economici che partecipano a procedure di affidamento di contratti pubblici, previsto dall'art. 222, comma 10, del D.Lgs. 36/2023, gestito dall'ANAC (Autorità Nazionale Anticorruzione) e finalizzato a misurare l'affidabilità complessiva dell'impresa sulla base di parametri oggettivi e verificabili.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_pa_subappalto",
    "label": "La Società opera come subappaltatore in contratti pubblici?",
    "type": "select",
    "options": [
      "Sì — frequentemente",
      "Sì — occasionalmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_pa_rti_consorzi",
    "label": "Partecipazione a gare in RTI o tramite consorzi?",
    "type": "multiselect",
    "options": [
      "Sì — come mandataria",
      "Sì — come mandante",
      "Sì — sia come mandante che come mandataria",
      "Sì — tramite consorzio",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_pa_tracciabilita",
    "label": "I pagamenti relativi a contratti pubblici rispettano la tracciabilità ex L. 136/2010?",
    "type": "select",
    "options": [
      "Sì — conti dedicati e CIG/CUP",
      "Sì — parzialmente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_pa_contributi_ricevuti",
    "label": "La Società ha ricevuto contributi, sovvenzioni o finanziamenti pubblici nell'ultimo triennio?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Richiesta in corso"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_pa_contributi_importo",
    "label": "Importo complessivo contributi pubblici ricevuti nell'ultimo triennio (€)",
    "type": "number",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_pa_trasparenza_124",
    "label": "Adempimento obblighi di pubblicazione contributi ex art. 1, co. 125-129, L. 124/2017?",
    "type": "multiselect",
    "options": [
      "Sì — in nota integrativa",
      "Sì — sul sito web",
      "No"
    ],
    "required": true,
    "help": "È l'obbligo di trasparenza imposto alle imprese che ricevono sovvenzioni, sussidi, vantaggi, contributi o aiuti in denaro o in natura da parte di pubbliche amministrazioni e da soggetti assimilati, consistente nella pubblicazione annuale delle informazioni relative agli importi ricevuti.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_pa_pnrr",
    "label": "La Società è beneficiaria diretta o indiretta di fondi PNRR?",
    "type": "multiselect",
    "options": [
      "Sì — beneficiaria diretta",
      "Sì — subappaltatore/fornitore",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_pa_crediti_imposta",
    "label": "La Società fruisce di crediti d'imposta o agevolazioni fiscali?",
    "type": "multiselect",
    "options": [
      "Sì",
      "No",
      "In gestione",
      "In passato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_pa_autorizzazioni",
    "label": "La Società opera in base ad autorizzazioni, licenze o concessioni pubbliche?",
    "type": "select",
    "options": [
      "Sì — tutte vigenti e in regola",
      "Sì — alcune in scadenza/rinnovo",
      "No — attività non soggetta",
      "Non in regola"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_pa_autorizzazioni_elenco",
    "label": "Elencare le principali autorizzazioni/concessioni (ente, oggetto, scadenza)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_pa_albi_registri",
    "label": "La Società è iscritta in albi o registri tenuti da enti pubblici",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In passato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_pa_albi_registri_det",
    "label": "Se sì, in quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_pa_antimafia",
    "label": "Informativa antimafia ex D.Lgs. 159/2011",
    "type": "select",
    "options": [
      "Sì — informativa liberatoria vigente",
      "Sì — comunicazione antimafia",
      "In rinnovo"
    ],
    "required": true,
    "help": "È il provvedimento rilasciato dal Prefetto che attesta, oltre all'assenza delle cause di decadenza, sospensione o divieto previste per la comunicazione antimafia, l'insussistenza di eventuali tentativi di infiltrazione mafiosa nell'impresa. Rappresenta il livello più approfondito di verifica antimafia previsto dall'ordinamento.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_pa_white_list",
    "label": "Iscrizione White List Prefettura",
    "type": "select",
    "options": [
      "Sì — in corso di validità",
      "In fase di iscrizione",
      "No — non applicabile",
      "No — non richiesta"
    ],
    "required": true,
    "help": "È l'iscrizione volontaria della Società nell'elenco dei fornitori, prestatori di servizi ed esecutori di lavori non soggetti a tentativi di infiltrazione mafiosa, istituito presso ciascuna Prefettura — Ufficio Territoriale del Governo ai sensi dell'art. 1, commi 52-57, L. 190/2012 e del D.P.C.M. 18 aprile 2013.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_4",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_pa_ispezioni_ricevute",
    "label": "Ispezioni, verifiche o accertamenti ricevuti da enti pubblici nell'ultimo triennio",
    "type": "multiselect",
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
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_pa_ispezioni_esito",
    "label": "Esito complessivo delle ispezioni ricevute",
    "type": "multiselect",
    "options": [
      "Tutte regolari",
      "Con prescrizioni adempiute",
      "Con prescrizioni pendenti",
      "Con sanzioni",
      "Con segnalazioni penali"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_pa_ispezioni_dettaglio",
    "label": "Dettaglio ispezioni rilevanti (ente, data, oggetto, esito)",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_pa_sanzioni_pa",
    "label": "Sanzioni amministrative ricevute da enti pubblici nell'ultimo triennio",
    "type": "multiselect",
    "options": [
      "Sì  No",
      "Procedimenti in corso"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_pa_sanzioni_dettaglio",
    "label": "Se sì, dettaglio (ente, importo, oggetto, stato)",
    "type": "textarea",
    "options": null,
    "required": false,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_e_5",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_risk_framework",
    "label": "Framework di risk management strutturato?",
    "type": "select",
    "options": [
      "Sì — ERM integrato",
      "Sì — parziale / settoriale",
      "Solo informale",
      "No"
    ],
    "required": true,
    "help": "È il sistema organico e formalizzato con cui la Società identifica, valuta, gestisce, monitora e comunica i rischi che possono compromettere il raggiungimento degli obiettivi aziendali, integrando la gestione del rischio nei processi decisionali e nella governance complessiva dell'organizzazione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_risk_owner",
    "label": "Responsabile del risk management",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_risk_mapping",
    "label": "Mappatura rischi aziendali effettuata?",
    "type": "select",
    "options": [
      "Sì — ultimo anno",
      "Sì — oltre 1 anno fa",
      "No — mai"
    ],
    "required": true,
    "help": "È l'attività sistematica con cui la Società identifica, censisce e classifica tutti i rischi significativi — interni ed esterni — che possono compromettere il raggiungimento degli obiettivi aziendali, la continuità operativa, la conformità normativa o la reputazione dell'organizzazione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_risk_categories",
    "label": "Categorie di rischio identificate (strategico, operativo, finanziario, compliance, reputazionale)",
    "type": "multiselect",
    "options": [
      "Strategico",
      "Operativo",
      "Finanziario",
      "Compliance",
      "Ambientale",
      "Reputazionale",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_risk_appetite",
    "label": "Risk appetite / tolerance definiti?",
    "type": "select",
    "options": [
      "Sì — formalizzati",
      "Solo informali",
      "No"
    ],
    "required": true,
    "help": "Sono i parametri con cui la Società definisce formalmente quanto rischio la Società è disposta ad assumersi nel perseguimento dei propri obiettivi strategici e operativi, e quali sono le soglie massime di rischio oltre le quali l'organizzazione non è disposta ad andare.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_business_continuity",
    "label": "Piano di Business Continuity (BCP)?",
    "type": "select",
    "options": [
      "Sì — testato",
      "Sì — non testato",
      "No"
    ],
    "required": true,
    "help": "È il documento strategico con cui la Società definisce le procedure, le risorse e le azioni necessarie per garantire la continuità delle funzioni aziendali critiche durante e dopo un evento avverso che ne comprometta il normale svolgimento, minimizzando l'impatto sull'operatività, sui clienti e sugli stakeholder.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_disaster_recovery",
    "label": "Piano di Disaster Recovery IT?",
    "type": "select",
    "options": [
      "Sì — testato",
      "Sì — non testato",
      "No"
    ],
    "required": true,
    "help": "È il documento operativo che definisce le procedure tecniche, le risorse e le tempistiche per il ripristino dell'infrastruttura informatica, delle applicazioni, dei dati e delle comunicazioni digitali della Società a seguito di un evento che ne comprometta la disponibilità.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_cyber_security",
    "label": "Valutazione rischio cyber security effettuata?",
    "type": "select",
    "options": [
      "Sì — recente",
      "Sì — non recente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_rischio_frode",
    "label": "Valutazione rischio frode effettuata?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_1",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_polizza_do",
    "label": "Polizza D&O (Directors & Officers)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In valutazione"
    ],
    "required": true,
    "help": "È la copertura assicurativa che protegge il patrimonio personale degli amministratori, dei sindaci, dei dirigenti e, in alcune formulazioni, della Società stessa, dai rischi economici derivanti da richieste di risarcimento per atti illeciti — colposi o presuntamente tali — commessi nell'esercizio delle rispettive funzioni gestorie o di controllo.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_do_massimale",
    "label": "Massimale D&O e principali esclusioni",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_polizza_rc",
    "label": "Polizza RC verso terzi?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_polizza_cyber",
    "label": "Polizza Cyber Risk?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "In valutazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_polizza_rc_prodotto",
    "label": "Polizza RC Prodotto?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_gap_analysis",
    "label": "Gap analysis sulle coperture effettuata?",
    "type": "select",
    "options": [
      "Sì — recente",
      "Sì — non recente",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_cont_civili",
    "label": "Contenziosi civili in corso (numero e valore indicativo)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_cont_lavoro",
    "label": "Contenziosi giuslavoristici in corso (numero e valore indicativo)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_cont_penali",
    "label": "Procedimenti penali in corso o passati",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Non disponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_cont_tributari",
    "label": "Contenziosi tributari in corso (numero e valore indicativo)",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_fondo_rischi",
    "label": "Fondi rischi e oneri accantonati a bilancio (€)",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_azione_responsabilita",
    "label": "Azioni responsabilità ex art. 2476/2393 c.c. in corso o passate?",
    "type": "multiselect",
    "options": [
      "Sì — in corso",
      "Sì — passate",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_uso_improprio_procure",
    "label": "Episodi uso improprio procure/deleghe?",
    "type": "select",
    "options": [
      "Sì — accertati",
      "Sì — sospetti",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_uso_improprio_det",
    "label": "Se sì, descrivere sinteticamente",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_f_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_contratti_standard",
    "label": "Sono stati predisposti modelli contrattuali standard e/o condizioni generali?",
    "type": "multiselect",
    "options": [
      "Sì — completi e aggiornati",
      "Sì — parziali",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_contratti_standard_det",
    "label": "Se sì, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_legal_review",
    "label": "Contratti soggetti a revisione legale prima della firma?",
    "type": "select",
    "options": [
      "Sempre — sopra soglia",
      "Spesso",
      "Raramente",
      "Mai"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_contratti_rilevanti",
    "label": "Contratti strategici in essere (appalti, partnership, JV, licenze)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_contratti_rilevanti_det",
    "label": "Se sì, quali i più importanti?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_garanzie_rilasciate",
    "label": "Garanzie rilasciate a terzi (fideiussioni, patronage, pegni)",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_contratti_rilevanti_det_2",
    "label": "Se sì, quali le più importanti?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_antiriciclaggio",
    "label": "Adempimenti antiriciclaggio applicabili?",
    "type": "select",
    "options": [
      "Sì — soggetto obbligato",
      "Sì — come controparte",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_marchi",
    "label": "Marchi registrati",
    "type": "multiselect",
    "options": [
      "Sì - nazionali",
      "Sì - europei",
      "Sì, internazionali",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_brevetti",
    "label": "Brevetti",
    "type": "multiselect",
    "options": [
      "Sì — nazionali",
      "Sì — europei",
      "Sì — internazionali",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_know_how",
    "label": "Know-how e segreti commerciali protetti?",
    "type": "multiselect",
    "options": [
      "Sì — con NDA e misure di protezione",
      "Sì — solo NDA",
      "Sì — non protetti",
      "No — non protetti"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_licenze_ricevute",
    "label": "Licenze IP ricevute da terzi (software, brevetti, marchi)",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_licenze_ricevute_det",
    "label": "Se sì, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_contenziosi_ip_corso",
    "label": "Contenziosi IP in corso?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_contenziosi_ip_passati",
    "label": "Contenziosi IP passati?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_nda_policy",
    "label": "Policy NDA / riservatezza sistematica?",
    "type": "select",
    "options": [
      "Sì — standard",
      "Solo per alcuni rapporti",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_g_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_mb_vision_mission",
    "label": "L'impresa, nella costruzione del proprio modello di business, ha definito la propria Vision e la propria Mission?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Sono le dichiarazioni formali con cui la Società definisce la propria identità strategica, comunicando all'interno e all'esterno il senso della propria esistenza e la direzione verso cui intende orientare il proprio sviluppo.\nQual è la differenza?\nVision — descrive l'aspirazione di lungo termine dell'impresa: dove vuole arrivare, quale posizione intende raggiungere nel mercato e nella società, quale futuro immagina per sé e per i propri stakeholder. È una proiezione ideale che orienta le scelte strategiche e ispira l'organizzazione. Risponde alla domanda: \"cosa vogliamo diventare?\".\nMission — descrive la ragion d'essere attuale dell'impresa: cosa fa, per chi lo fa, come lo fa e cosa +J375:J376la distingue dai concorrenti. È concreta, operativa e legata al presente. Risponde alla domanda: \"perché esistiamo e quale valore creiamo?\".",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_mb_strutturato",
    "label": "Il modello di business dell'impresa è stato strutturato e formalizzato? (verificare se sono stati utilizzati strumenti quali il Business Model Canvas o simili)",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_mb_comunicato",
    "label": "Si ritiene che il modello di business sia adeguatamente comunicato e condiviso all'interno dell'organizzazione?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_mg_responsabile_it",
    "label": "L'impresa ha identificato un responsabile IT?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_mg_sistema_integrato",
    "label": "L'impresa è dotata di un sistema informativo integrato (ad esempio, un ERP o altro sistema meno complesso)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_mg_orientato_obiettivi",
    "label": "Il sistema informativo dell'impresa è orientato ai suoi obiettivi?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_mg_flussi_attendibili",
    "label": "Il sistema informativo consente a tutti i livelli flussi attendibili, chiari e tempestivi?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_mg_protezione",
    "label": "Sono presenti meccanismi di protezione rispetto a violazioni (interne e/o esterne) del sistema informativo?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_mg_protezione_dati",
    "label": "Il sistema informativo consente la gestione e la protezione dei dati?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_mg_canali",
    "label": "Quali sono i canali che il sistema informativo aziendale predilige?",
    "type": "multiselect",
    "options": [
      "Email",
      "Cartelle condivise",
      "Software non integrato",
      "Software Integrato (ERP)",
      "Altro"
    ],
    "required": true,
    "help": "Sono gli strumenti, le piattaforme e le modalità attraverso cui le informazioni rilevanti per la gestione dell'impresa vengono raccolte, elaborate, trasmesse, archiviate e rese disponibili ai soggetti che ne necessitano per l'esercizio delle proprie funzioni, a tutti i livelli dell'organizzazione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_ao_organigramma",
    "label": "L’impresa è dotata di un Organigramma formalizzato e comunicato all’interno dell’organizzazione?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_ao_modello_struttura",
    "label": "In caso di riposta affermativa alla precedente domanda, qual è il modello di struttura organizzativa adottato?",
    "type": "select",
    "options": [
      "Semplice",
      "Funzionale",
      "Divisionale",
      "A matrice",
      "Per progetti",
      "Per processi",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_ao_funzionigramma",
    "label": "L'impresa è dotata di un Funzionigramma formalizzato e comunicato al suo interno?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_ao_mansionario",
    "label": "L'impresa è dotata di un mansionario formalizzato e comunicato al suo interno?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_ao_selezione_personale",
    "label": "Nei procedimenti di selezione del personale, l'impresa è dotata di procedure e/o di strumenti di analisi delle competenze dei candidati?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_ao_valutazione_competenze",
    "label": "L'impresa è dotata di sistemi di valutazione costante delle competenze delle risorse umane in relazione ai ruoli ricoperti?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_ao_formazione",
    "label": "L'impresa organizza corsi di formazione e di aggiornamento nell'ottica di un percorso di crescita professionale?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_ao_delega_poteri",
    "label": "Si ritiene che l'assegnazione di compiti e mansioni rispetti la corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_ao_procedure_operative",
    "label": "L'impresa è dotata di procedure operative e processi formalizzati (ciclo attivo, passivo, ecc.)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_ao_procedure_sostenibilita",
    "label": "L'impresa è dotata di procedure operative e processi formalizzati a supporto degli obiettivi di sostenibilità dell'attività?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_ao_procedure_autorizzative",
    "label": "L'impresa ha previsto procedure autorizzative in relazione a specifiche attività operative (ad esempio, accessi identificativi al sistema informativo, autorizzazione per spese superiori a determinati importi, ecc.)?",
    "type": "select",
    "options": [
      "Sì",
      "No",
      "Parzialmente"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_ao_scigr",
    "label": "È presente un sistema di controllo interno e gestione dei rischi (SCIGR)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Il Sistema di Controllo Interno e Gestione dei Rischi (SCIGR) è l'insieme strutturato di regole, procedure, strutture organizzative e strumenti che la Società adotta per identificare, misurare, gestire e monitorare i principali rischi aziendali, assicurando il conseguimento degli obiettivi strategici, operativi, di compliance e di reporting in modo conforme alle leggi, ai regolamenti e alle norme interne.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_ao_rischi_esg",
    "label": "Nell'ambito della gestione dei rischi aziendali, sono stati analizzati anche quelli relativi ai fattori ESG?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_ao_certificazioni",
    "label": "Sono state rilasciate certificazioni per l'esercizio di attività in specifici settori?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_ao_parita_genere",
    "label": "L'impresa ha adottato procedure e misure per ridurre il divario di genere?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Sono l'insieme di politiche, azioni concrete e strumenti organizzativi che la Società adotta per promuovere la parità di trattamento e di opportunità tra uomini e donne nell'ambiente di lavoro, contrastando ogni forma di discriminazione diretta o indiretta basata sul genere.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_ao_parita_genere_det",
    "label": "Se si, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_3",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_aa_poteri_formalizzati",
    "label": "Nel caso di costituzione di un consiglio di amministrazione, sono stati formalizzati i poteri e i compiti assegnati a ciascun componente?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_aa_corrispondenza_delega",
    "label": "Si ritiene che ci sia corrispondenza tra delega assegnata e poteri decisori in capo al delegato?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_aa_internal_audit",
    "label": "È presente una funzione di internal audit?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "È una funzione aziendale indipendente che svolge attività di verifica e valutazione sistematica sull'adeguatezza, l'efficacia e l'effettivo funzionamento del sistema di controllo interno, dei processi organizzativi, delle procedure e della gestione dei rischi.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_aa_organo_controllo_srl",
    "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un organo di controllo, anche monocratico?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_aa_revisore_srl",
    "label": "Nel caso di s.r.l., al ricorrere delle condizioni previste dalla normativa, è stato nominato un soggetto incaricato della revisione legale?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_aa_piano_industriale",
    "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di un piano industriale?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_aa_piani_operativi",
    "label": "L'organo di amministrazione o l'imprenditore agiscono in presenza di piani operativi?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_aa_funzioni_esterne",
    "label": "Esistono funzioni ricoperte da soggetti esterni all'organizzazione (ad esempio, responsabile finanziario, sicurezza, legale, privacy, ecc.)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_aa_funzioni_esterne_det",
    "label": "Se si, quali?",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_aa_parti_correlate",
    "label": "Sono presenti procedure o regolamenti per la gestione delle operazioni con parti correlate?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "È un documento interno che disciplina le modalità con cui la Società identifica, valuta, autorizza e monitora le operazioni compiute con soggetti legati alla Società stessa da un rapporto qualificato — le c.d. parti correlate.\nLe parti correlate sono soggetti che, per la posizione rivestita o per i legami esistenti, possono influenzare o essere influenzati dalla Società nelle decisioni economiche. Rientrano tipicamente: i soci di controllo o con influenza notevole; gli amministratori, i sindaci e i dirigenti con responsabilità strategiche (e i loro stretti familiari); le società controllate, collegate o sottoposte a comune controllo; le entità in cui i soggetti sopra indicati detengono partecipazioni rilevanti o incarichi direttivi.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_4",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_ac_sistema_integrato",
    "label": "L'impresa è dotata di un sistema informativo contabile integrato (ad esempio, si avvale di un unico software o più software per gli adempimenti contabili e fiscali)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_ac_esternalizzazione",
    "label": "L'impresa ha esternalizzato le procedure di registrazione e gestione delle operazioni contabili (contabilità interna o esterna)?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_ac_esternalizzazione_tipo",
    "label": "In caso di risposta affermativa alla precedente domanda, l'esternalizzazione delle procedure contabili è parziale o totale?",
    "type": "select",
    "options": [
      "Totale",
      "Parziale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_ac_trasferimento_dati",
    "label": "Nel caso di esternalizzazione parziale o totale, come avviene il trasferimento dei dati e delle informazioni?",
    "type": "multiselect",
    "options": [
      "Fax",
      "Email",
      "Condivisione di un sistema informativo",
      "Altro"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_ac_cadenza_aggiornamento",
    "label": "Con quale cadenza avviene l'aggiornamento della contabilità?",
    "type": "select",
    "options": [
      "Mensile",
      "Trimestrale",
      "Quadrimestrale",
      "Semestrale",
      "Annuale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_ac_bilanci_infrannuali",
    "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali di esercizio?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "I Bilanci infrannuali di esercizio sono le situazioni contabili periodiche — tipicamente trimestrali, quadrimestrali o semestrali — che la Società predispone nel corso dell'esercizio sociale prima della chiusura annuale del bilancio, al fine di monitorare con continuità l'andamento economico, patrimoniale e finanziario dell'impresa e di verificare la coerenza dei risultati effettivi con le previsioni di budget.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_ac_bilanci_infrannuali_periodicita",
    "label": "Se sì, con quale periodicità?",
    "type": "select",
    "options": [
      "Trimestrale",
      "Quadrimestrale",
      "Semestrale",
      "Annuale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_ac_bilanci_gestionali",
    "label": "L'impresa, a seguito dell'aggiornamento contabile, predispone bilanci infrannuali gestionali?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Bilanci infrannuali gestionaliSono le situazioni contabili e gestionali periodiche predisposte dalla Società — a differenza dei bilanci infrannuali di esercizio, che seguono lo schema civilistico — secondo logiche di contabilità analitica e di controllo di gestione, finalizzate a fornire al management e agli organi di governo una visione operativa, tempestiva e articolata dell'andamento aziendale.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_ac_analisi_bilancio",
    "label": "L'impresa è dotata di un sistema di analisi di bilancio comprensivo di indici e indicatori di natura reddituale, patrimoniale e finanziaria?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_ac_analisi_bilancio_indici",
    "label": "In caso di risposta affermativa, quali sono gli indici principali?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_ac_analisi_crisi",
    "label": "L'analisi degli indici e degli indicatori di cui alla precedente domanda è effettuata in un'ottica di continuità aziendale e ai fini della rilevazione tempestiva della crisi d'impresa?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_ac_controllo_gestione",
    "label": "L'impresa è dotata di un sistema di controllo di gestione?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Il Sistema di controllo di gestione è l'insieme strutturato di strumenti, processi, metodologie e flussi informativi con cui la Società pianifica gli obiettivi economici, finanziari e operativi, monitora sistematicamente i risultati conseguiti, analizza gli scostamenti rispetto alle previsioni e orienta le decisioni correttive, al fine di guidare la gestione verso il raggiungimento degli obiettivi strategici definiti dall'organo amministrativo.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 11
  },
  {
    "fieldId": "m231_ac_contabilita_analitica",
    "label": "L'impresa è dotata di un sistema di contabilità analitica?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Il Sistema di contabilità analitica (o contabilità industriale) è il sistema contabile che rileva, classifica e attribuisce i costi e i ricavi non solo per natura — come la contabilità generale — ma per destinazione: centro di costo, centro di ricavo, centro di profitto, prodotto, servizio, commessa, cliente, mercato, canale distributivo, progetto. Costituisce il fondamento informativo del controllo di gestione.",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 12
  },
  {
    "fieldId": "m231_ac_kpi",
    "label": "L'impresa è dotata di un sistema di KPI (Key Performance Indicator) relativi agli elementi più rilevanti della gestione?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": "Il Sistema di KPI (Key Performance Indicators) è l'insieme strutturato di indicatori quantitativi e qualitativi che la Società utilizza per misurare, monitorare e valutare le performance aziendali nelle dimensioni più rilevanti della gestione, collegando gli obiettivi strategici definiti dal CdA ai risultati operativi effettivamente conseguiti a tutti i livelli dell'organizzazione.\nI KPI sono metriche sintetiche, oggettive e misurabili che traducono gli obiettivi aziendali in parametri quantificabili e verificabili nel tempo. Un KPI efficace risponde ai criteri c.d. SMART: Specifico (misura un fenomeno definito), Misurabile (quantificabile con dati oggettivi), Achievable/Attuabile (raggiungibile con le risorse disponibili), Rilevante (collegato a un obiettivo strategico o operativo significativo) e Temporalmente definito (con un orizzonte di misurazione e una frequenza di aggiornamento prestabiliti).",
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 13
  },
  {
    "fieldId": "m231_ac_kpi_principali",
    "label": "In caso di risposta affermativa, quali sono gli indici principali?",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 14
  },
  {
    "fieldId": "m231_ac_budget_reporting",
    "label": "L'impresa è dotata di un sistema di budgeting e reporting?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 15
  },
  {
    "fieldId": "m231_ac_cadenza_reporting",
    "label": "In caso di risposta affermativa alla precedente domanda, con quale cadenza l'impresa gestisce la reportistica relativa agli scostamenti?",
    "type": "select",
    "options": [
      "Mensile",
      "Trimestrale",
      "Quadrimestrale",
      "Semestrale",
      "Annuale"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 16
  },
  {
    "fieldId": "m231_ac_aspetti_finanziari",
    "label": "L'impresa pone attenzione ad aspetti finanziari quali, ad esempio, piano di tesoreria a sei mesi, analisi dei flussi di cassa, valutazione della posizione finanziaria netta, ecc.?",
    "type": "select",
    "options": [
      "Sì",
      "No"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_h_5",
    "sortOrder": 17
  },
  {
    "fieldId": "m231_d_statuto",
    "label": "Statuto sociale vigente",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_visura",
    "label": "Visura camerale aggiornata",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_patti_parasociali",
    "label": "Patti parasociali (se esistenti)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_bilancio",
    "label": "Bilancio ultimo triennio",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_procure",
    "label": "Copia integrale procure notarili",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_deleghe",
    "label": "Deleghe interne e procure non notarili",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_verbali_cda",
    "label": "Verbali CdA ultimo triennio",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_verbali_assemblea",
    "label": "Verbali assemblee ultimo triennio",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_1",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_d_organigramma_soc",
    "label": "Organigramma societario",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_funzionigramma_soc",
    "label": "Funzionigramma societario",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_modello_231",
    "label": "Modello 231 completo (Parte Generale + Parti Speciali)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_codice_etico",
    "label": "Codice Etico",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_sistema_disciplinare",
    "label": "Sistema disciplinare 231 formalizzato",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_verbali_odv",
    "label": "Verbali OdV ultimo biennio",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_budget_odv",
    "label": "Budget autonomo OdV",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_anticorruzione",
    "label": "Policy anticorruzione e conflitto interessi",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_d_policy_omaggi",
    "label": "Policy omaggi, regali e ospitalità",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 8
  },
  {
    "fieldId": "m231_d_policy_whistleblowing",
    "label": "Policy whistleblowing",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 9
  },
  {
    "fieldId": "m231_d_registro_whistleblowing",
    "label": "Registro segnalazioni whistleblowing",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_2",
    "sortOrder": 10
  },
  {
    "fieldId": "m231_d_registro_trattamenti",
    "label": "Registro dei Trattamenti",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_privacy",
    "label": "Documentazione privacy completa (nomine, informative, consensi)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_istruzioni_privacy",
    "label": "Istruzioni operative privacy per il personale dipendente",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_dpia",
    "label": "DPIA - Data Protection Impact Assessment",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_procedura_breach",
    "label": "Procedura gestione data breach",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_registro_breach",
    "label": "Registro data breach",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_dvr",
    "label": "DVR e deleghe sicurezza",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_piano_emergenza",
    "label": "Piano emergenza (D.Lgs. 81/08)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_3",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_d_business_plan",
    "label": "Business plan",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_piano_industriale",
    "label": "Piano industriale/strategico pluriennale",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_piani_operativi",
    "label": "Piani operativi annuali",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_budget",
    "label": "Budget annuale",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_bilanci_infrannuali",
    "label": "Bilanci infrannuali/situation",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_piano_tesoreria",
    "label": "Piano tesoreria 6-12 mesi",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_dashboard_kpi",
    "label": "Dashboard KPI documentata",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_4",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_mappatura_it",
    "label": "Mappatura infrastruttura IT",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_dr_it",
    "label": "Piano Disaster Recovery IT",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_piano_marketing",
    "label": "Piano Marketing/Comunicazione",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_policy_social",
    "label": "Policy social media aziendali",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_doc_backup",
    "label": "Documentazione procedure backup",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_5",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_organigramma_sicurezza",
    "label": "Organigramma sicurezza",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_funzionigramma_sicurezza",
    "label": "Funzionigramma sicurezza",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_mog_81_2",
    "label": "MOG ex art. 30 D.Lgs. 81/08",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_mansionari",
    "label": "Mansionari dettagliati",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_policy_smartworking",
    "label": "Policy smart working/lavoro agile",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_contratti_outsourcing",
    "label": "Contratti outsourcing principali",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_procedure_operative",
    "label": "Procedure operative interne",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_6",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_contratti_fornitori",
    "label": "Contratti fornitori strategici (top 5)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_contratti_clienti",
    "label": "Contratti clienti principali (top 10)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_accordi_partnership",
    "label": "Accordi partnership/collaborazione",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_policy_nda",
    "label": "Policy NDA/riservatezza",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_d_modelli_contratti",
    "label": "Modelli contratti",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_d_modelli_offerte",
    "label": "Modelli offerte",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_d_condizioni_generali",
    "label": "Condizioni generali",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_d_polizze",
    "label": "Polizze D&O, RC e coperture assicurative",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_7",
    "sortOrder": 7
  },
  {
    "fieldId": "m231_d_whistleblowing",
    "label": "Procedura whistleblowing (D.Lgs. 24/2023)",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_8",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_d_certificazioni",
    "label": "Certificazioni ISO e audit report",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_8",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_d_sostenibilita",
    "label": "Report sostenibilità / ESG",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_8",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_d_matrice_poteri",
    "label": "Matrice poteri / sistema autorizzativo",
    "type": "select",
    "options": [
      "Disponibile",
      "Da reperirle",
      "Parzialmente disponibile",
      "Indisponibile"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_i_8",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_av_governance_adeguatezza",
    "label": "Come valuta complessivamente l'adeguatezza del sistema di governance della Società?",
    "type": "select",
    "options": [
      "Adeguato",
      "Parzialmente adeguato",
      "Da migliorare significativamente",
      "Inadeguato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_av_governance_criticita",
    "label": "Principali criticità percepite nel sistema di governance",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_av_compliance_adeguatezza",
    "label": "Come valuta il livello di conformità normativa complessivo della Società?",
    "type": "select",
    "options": [
      "Adeguato",
      "Parzialmente adeguato",
      "Da migliorare significativamente",
      "Inadeguato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_av_compliance_criticita",
    "label": "Principali aree di non conformità o criticità normative percepite",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_av_231_efficacia",
    "label": "Se adottato il Modello 231, come valuta la sua efficacia operativa?",
    "type": "select",
    "options": [
      "Efficace e aggiornato",
      "Formalmente adeguato ma poco operativo",
      "Formalmente adeguato ma applicato",
      "Da aggiornare"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_av_privacy_adeguatezza",
    "label": "Come valuta il livello di adeguatezza della gestione della privacy?",
    "type": "select",
    "options": [
      "Adeguato",
      "Parzialmente adeguato",
      "Da migliorare significativamente",
      "Inadeguato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_av_rischio_reputazionale",
    "label": "Come valuta il livello di rischio reputazionale della Società?",
    "type": "select",
    "options": [
      "Basso",
      "Medio",
      "Alto"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_1",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_av_assetti_org",
    "label": "Come valuta l'adeguatezza degli assetti organizzativi ex art. 2086 c.c.?",
    "type": "select",
    "options": [
      "Adeguati",
      "Parzialmente adeguati",
      "Da migliorare significativamente",
      "Inadeguati"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_av_assetti_amm",
    "label": "Come valuta l'adeguatezza degli assetti amministrativi?",
    "type": "select",
    "options": [
      "Adeguati",
      "Parzialmente adeguati",
      "Da migliorare significativamente",
      "Inadeguati"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_av_assetti_cont",
    "label": "Come valuta l'adeguatezza degli assetti contabili?",
    "type": "select",
    "options": [
      "Adeguati",
      "Parzialmente adeguati",
      "Da migliorare significativamente",
      "Inadeguati"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_av_continuita",
    "label": "Esistono segnali di rischio per la continuità aziendale?",
    "type": "select",
    "options": [
      "No — nessun segnale",
      "Sì — segnali deboli monitorati",
      "Sì — criticità in corso",
      "Non valutato"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_av_risorse_umane",
    "label": "Come valuta l'adeguatezza delle risorse umane rispetto agli obiettivi aziendali?",
    "type": "select",
    "options": [
      "Adeguate",
      "Parzialmente adeguate",
      "Insufficienti"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_av_sistemi_it",
    "label": "Come valuta l'adeguatezza dei sistemi informativi e della sicurezza IT?",
    "type": "select",
    "options": [
      "Adeguati",
      "Parzialmente adeguati",
      "Da migliorare significativamente",
      "Inadeguati"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_av_digitalizzazione",
    "label": "Quali sono le aree in cui ritiene opportuna una maggiore digitalizzazione?",
    "type": "select",
    "options": [
      "Adeguati",
      "Parzialmente adeguati",
      "Da migliorare significativamente",
      "Inadeguati"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_2",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_av_priorita_1",
    "label": "Prima priorità di intervento individuata",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_av_priorita_2",
    "label": "Seconda priorità di intervento individuata",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_av_priorita_3",
    "label": "Terza priorità di intervento individuata",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_av_budget_compliance",
    "label": "È previsto un budget dedicato per attività di compliance e governance?",
    "type": "select",
    "options": [
      "Sì — adeguato",
      "Sì — insufficiente",
      "No",
      "In fase di valutazione"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_av_tempistiche",
    "label": "Tempistiche attese per l'implementazione degli interventi prioritari",
    "type": "select",
    "options": [
      "Entro 3 mesi",
      "Entro 6 mesi",
      "Entro 12 mesi",
      "Oltre 12 mesi"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 4
  },
  {
    "fieldId": "m231_av_supporto_esterno",
    "label": "Si ritiene necessario il supporto di consulenti esterni per gli interventi individuati?",
    "type": "select",
    "options": [
      "Sì — per tutte le aree",
      "Sì — per alcune aree specifiche",
      "No — risorse interne sufficienti",
      "Da valutare dopo assessment"
    ],
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 5
  },
  {
    "fieldId": "m231_av_note_finali",
    "label": "Osservazioni finali e ulteriori elementi rilevanti non coperti dal questionario",
    "type": "textarea",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_j_3",
    "sortOrder": 6
  },
  {
    "fieldId": "m231_owner_a_nome",
    "label": "Owner Macro Area A. Identità e Struttura — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_1",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_a_ruolo",
    "label": "Owner Macro Area A. Identità e Struttura — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_1",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_a_email",
    "label": "Owner Macro Area A. Identità e Struttura — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_1",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_a_validazione",
    "label": "Owner Macro Area A. Identità e Struttura — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_1",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_b_nome",
    "label": "Owner Macro Area B. Governance — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_2",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_b_ruolo",
    "label": "Owner Macro Area B. Governance — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_2",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_b_email",
    "label": "Owner Macro Area B. Governance — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_2",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_b_validazione",
    "label": "Owner Macro Area B. Governance — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_2",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_c_nome",
    "label": "Owner Macro Area C. Organizzazione — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_3",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_c_ruolo",
    "label": "Owner Macro Area C. Organizzazione — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_3",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_c_email",
    "label": "Owner Macro Area C. Organizzazione — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_3",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_c_validazione",
    "label": "Owner Macro Area C. Organizzazione — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_3",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_l_nome",
    "label": "Owner Macro Area D. Processi Operativi — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_4",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_l_ruolo",
    "label": "Owner Macro Area D. Processi Operativi — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_4",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_l_email",
    "label": "Owner Macro Area D. Processi Operativi — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_4",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_l_validazione",
    "label": "Owner Macro Area D. Processi Operativi — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_4",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_d_nome",
    "label": "Owner Macro Area E. Compliance e Controlli — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_5",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_d_ruolo",
    "label": "Owner Macro Area E. Compliance e Controlli — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_5",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_d_email",
    "label": "Owner Macro Area E. Compliance e Controlli — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_5",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_d_validazione",
    "label": "Owner Macro Area E. Compliance e Controlli — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_5",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_e_nome",
    "label": "Owner Macro Area F. Rapporti con la PA — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_6",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_e_ruolo",
    "label": "Owner Macro Area F. Rapporti con la PA — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_6",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_e_email",
    "label": "Owner Macro Area F. Rapporti con la PA — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_6",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_e_validazione",
    "label": "Owner Macro Area F. Rapporti con la PA — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_6",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_f_nome",
    "label": "Owner Macro Area G. Risk Management — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_7",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_f_ruolo",
    "label": "Owner Macro Area G. Risk Management — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_7",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_f_email",
    "label": "Owner Macro Area G. Risk Management — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_7",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_f_validazione",
    "label": "Owner Macro Area G. Risk Management — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_7",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_g_nome",
    "label": "Owner Macro Area H. Rapporti Esterni — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_8",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_g_ruolo",
    "label": "Owner Macro Area H. Rapporti Esterni — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_8",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_g_email",
    "label": "Owner Macro Area H. Rapporti Esterni — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_8",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_g_validazione",
    "label": "Owner Macro Area H. Rapporti Esterni — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_8",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_h_nome",
    "label": "Owner Macro Area I. Adeguati Assetti — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_9",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_h_ruolo",
    "label": "Owner Macro Area I. Adeguati Assetti — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_9",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_h_email",
    "label": "Owner Macro Area I. Adeguati Assetti — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_9",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_h_validazione",
    "label": "Owner Macro Area I. Adeguati Assetti — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_9",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_i_nome",
    "label": "Owner Macro Area J. Documentazione — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_10",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_i_ruolo",
    "label": "Owner Macro Area J. Documentazione — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_10",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_i_email",
    "label": "Owner Macro Area J. Documentazione — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_10",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_i_validazione",
    "label": "Owner Macro Area J. Documentazione — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_10",
    "sortOrder": 3
  },
  {
    "fieldId": "m231_owner_j_nome",
    "label": "Owner Macro Area K. Autovalutazione — Nome e Cognome",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_11",
    "sortOrder": 0
  },
  {
    "fieldId": "m231_owner_j_ruolo",
    "label": "Owner Macro Area K. Autovalutazione — Ruolo/Funzione",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_11",
    "sortOrder": 1
  },
  {
    "fieldId": "m231_owner_j_email",
    "label": "Owner Macro Area K. Autovalutazione — Email",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_11",
    "sortOrder": 2
  },
  {
    "fieldId": "m231_owner_j_validazione",
    "label": "Owner Macro Area K. Autovalutazione — Data validazione dati",
    "type": "text",
    "options": null,
    "required": true,
    "help": null,
    "allowDocuments": true,
    "weight": 1,
    "sectionCode": "m231_k_11",
    "sortOrder": 3
  }
];

export class SeedCheckupQuestionModel2311774200000000 implements MigrationInterface {
  name = 'SeedCheckupQuestionModel2311774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let rows = await queryRunner.query('SELECT id FROM checkup_question_models WHERE code = ? LIMIT 1', [MODEL_CODE]);

    if (!rows.length) {
      await queryRunner.query(
        "INSERT INTO checkup_question_models (id, code, label, description, attivo, status, version, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, 1, 'draft', 1, NOW(), NOW())",
        [MODEL_CODE, MODEL_LABEL, MODEL_DESCRIPTION],
      );
      rows = await queryRunner.query('SELECT id FROM checkup_question_models WHERE code = ? LIMIT 1', [MODEL_CODE]);
    } else {
      await queryRunner.query(
        'UPDATE checkup_question_models SET label = ?, description = ?, attivo = 1, updatedAt = NOW() WHERE code = ?',
        [MODEL_LABEL, MODEL_DESCRIPTION, MODEL_CODE],
      );
    }

    const modelId = rows[0].id;
    await this.deleteModelStructure(queryRunner, modelId);

    const macroIds = new Map<string, number>();
    for (const macro of MACRO_AREAS) {
      await queryRunner.query(
        'INSERT INTO checkup_question_macro_areas (code, label, color, sortOrder, modelId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [macro.code, macro.label, macro.color, macro.sortOrder, modelId],
      );
      const [saved] = await queryRunner.query(
        'SELECT id FROM checkup_question_macro_areas WHERE code = ? AND modelId = ? LIMIT 1',
        [macro.code, modelId],
      );
      macroIds.set(macro.code, saved.id);
    }

    const sectionIds = new Map<string, number>();
    for (const section of SECTIONS) {
      const macroAreaId = macroIds.get(section.macroCode);
      if (!macroAreaId) throw new Error(`Macro area not found for section ${section.code}`);
      await queryRunner.query(
        'INSERT INTO checkup_question_sections (code, title, description, macroAreaId, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [section.code, section.title, section.description, macroAreaId, section.sortOrder],
      );
      const [saved] = await queryRunner.query('SELECT id FROM checkup_question_sections WHERE code = ? LIMIT 1', [section.code]);
      sectionIds.set(section.code, saved.id);
    }

    for (const field of FIELDS) {
      const sectionId = sectionIds.get(field.sectionCode);
      if (!sectionId) throw new Error(`Section not found for field ${field.fieldId}`);
      await queryRunner.query(
        'INSERT INTO checkup_question_fields (fieldId, label, type, options, required, help, allowDocuments, weight, sectionId, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [field.fieldId, field.label, field.type, field.options ? JSON.stringify(field.options) : null, field.required ? 1 : 0, field.help, field.allowDocuments ? 1 : 0, field.weight, sectionId, field.sortOrder],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query('SELECT id FROM checkup_question_models WHERE code = ? LIMIT 1', [MODEL_CODE]);
    if (!rows.length) return;

    await this.deleteModelStructure(queryRunner, rows[0].id);
    await queryRunner.query('DELETE FROM checkup_question_models WHERE id = ?', [rows[0].id]);
  }

  private async deleteModelStructure(queryRunner: QueryRunner, modelId: string): Promise<void> {
    await queryRunner.query(
      'DELETE f FROM checkup_question_fields f INNER JOIN checkup_question_sections s ON s.id = f.sectionId INNER JOIN checkup_question_macro_areas m ON m.id = s.macroAreaId WHERE m.modelId = ?',
      [modelId],
    );
    await queryRunner.query(
      'DELETE s FROM checkup_question_sections s INNER JOIN checkup_question_macro_areas m ON m.id = s.macroAreaId WHERE m.modelId = ?',
      [modelId],
    );
    await queryRunner.query('DELETE FROM checkup_question_macro_areas WHERE modelId = ?', [modelId]);
  }
}

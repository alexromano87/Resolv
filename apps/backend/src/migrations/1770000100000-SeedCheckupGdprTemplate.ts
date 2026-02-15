import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export class SeedCheckupGdprTemplate1770000100000 implements MigrationInterface {
  name = 'SeedCheckupGdprTemplate1770000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const templateId = uuidv4();

    // --- TEMPLATE ---
    await queryRunner.query(
      `INSERT INTO checkup_templates (id, nome, descrizione, versione) VALUES (?, ?, ?, ?)`,
      [templateId, 'Checkup GDPR', 'Questionario completo per la profilazione aziendale ai fini della compliance GDPR e analisi organizzativa', '1.0'],
    );

    // --- SEZIONI ---
    const sections: { id: string; codice: string; nome: string; descrizione: string; ordine: number }[] = [
      { id: uuidv4(), codice: 'PA', nome: 'Profilazione Azienda', descrizione: 'Dati generali, attività, organizzazione, concorrenza', ordine: 1 },
      { id: uuidv4(), codice: 'CA', nome: 'Ciclo Attivo', descrizione: 'Gestione amministrativa, legale e commerciale - Ciclo Attivo', ordine: 2 },
      { id: uuidv4(), codice: 'CP', nome: 'Ciclo Passivo', descrizione: 'Gestione amministrativa, legale e commerciale - Ciclo Passivo', ordine: 3 },
      { id: uuidv4(), codice: 'TR', nome: 'Trasporti', descrizione: 'Gestione trasporti acquisti e vendite', ordine: 4 },
      { id: uuidv4(), codice: 'IN', nome: 'Indebitamento', descrizione: 'Mutui, conti corrente, leasing, derivati, riscossione coattiva', ordine: 5 },
      { id: uuidv4(), codice: 'AL', nome: 'Area Legale', descrizione: 'Gestione vertenze legali', ordine: 6 },
      { id: uuidv4(), codice: 'IT', nome: 'Area IT', descrizione: 'Infrastruttura IT, hardware, software, reti, sicurezza dati', ordine: 7 },
      { id: uuidv4(), codice: 'PR', nome: 'Privacy', descrizione: 'Conformità privacy, informative, nomine, formazione', ordine: 8 },
    ];

    for (const s of sections) {
      await queryRunner.query(
        `INSERT INTO checkup_sections (id, templateId, codice, nome, descrizione, ordine) VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, templateId, s.codice, s.nome, s.descrizione, s.ordine],
      );
    }

    const sectionMap: Record<string, string> = {};
    for (const s of sections) {
      sectionMap[s.codice] = s.id;
    }

    // Helper per inserire domande
    const insertQ = async (
      sectionCode: string,
      testo: string,
      tipo: string,
      ordine: number,
      opts?: {
        opzioni?: string[];
        obbligatoria?: boolean;
        accettaDocumenti?: boolean;
        parentId?: string;
        parentConditionValue?: string;
      },
    ): Promise<string> => {
      const id = uuidv4();
      const sectionId = sectionMap[sectionCode];
      await queryRunner.query(
        `INSERT INTO checkup_questions (id, sectionId, testo, tipo, opzioni, ordine, obbligatoria, accettaDocumenti, parentQuestionId, parentConditionValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sectionId,
          testo,
          tipo,
          opts?.opzioni ? JSON.stringify(opts.opzioni) : null,
          ordine,
          opts?.obbligatoria ? 1 : 0,
          opts?.accettaDocumenti ? 1 : 0,
          opts?.parentId || null,
          opts?.parentConditionValue || null,
        ],
      );
      return id;
    };

    // =====================================================================
    // SEZIONE PA - PROFILAZIONE AZIENDA
    // =====================================================================
    let o = 1;

    // -- Dati Generali --
    await insertQ('PA', 'Nominativo Referente Profilazione Azienda', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Denominazione', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Titolare / Legale rappresentante', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Tipologia', 'choice', o++, { opzioni: ['SRL', 'SPA', 'SNC', 'SAS', 'Impresa individuale', 'Cooperativa', 'Altro'], obbligatoria: true });

    const qStartup = await insertQ('PA', "E' una start-up innovativa", 'yesno', o++);
    const qPmi = await insertQ('PA', "E' una PMI innovativa", 'yesno', o++);
    await insertQ('PA', 'Capitale sociale', 'text', o++);

    const qCapVersato = await insertQ('PA', 'Capitale interamente versato', 'yesno', o++);

    await insertQ('PA', 'Numero Soci', 'number', o++);
    await insertQ('PA', 'Nome/denominazione Soci (indicare per ciascun socio nome e quota c.s.)', 'text', o++);
    await insertQ('PA', 'Organo Amministrativo', 'text', o++);
    await insertQ('PA', 'Sede legale', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Codice fiscale', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Partita IVA', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'PEC aziendale', 'text', o++);
    await insertQ('PA', 'Mail aziendale', 'text', o++);
    await insertQ('PA', 'Sito web', 'text', o++);

    const qRevisione = await insertQ('PA', "L'azienda è soggetta a revisione legale", 'yesno', o++);
    await insertQ('PA', 'Tipo revisione', 'choice', o++, { opzioni: ['Revisore unico', 'Collegio sindacale'], parentId: qRevisione, parentConditionValue: 'SI' });

    await insertQ('PA', 'Quante sono le unità locali', 'number', o++);
    await insertQ('PA', 'Dove sono le unità locali', 'text', o++);
    await insertQ('PA', 'Quante sono le sedi secondarie', 'number', o++);
    await insertQ('PA', 'Dove sono le sedi secondarie', 'text', o++);

    const qSediRappr = await insertQ('PA', 'Le sedi secondarie hanno rappresentanza stabile', 'yesno', o++);
    await insertQ('PA', 'Se si, quali', 'text', o++, { parentId: qSediRappr, parentConditionValue: 'SI' });

    const qSediUe = await insertQ('PA', "Esistono sedi all'estero UE", 'yesno', o++);
    await insertQ('PA', 'Se si, dove (UE)', 'text', o++, { parentId: qSediUe, parentConditionValue: 'SI' });

    const qSediExtraUe = await insertQ('PA', "Esistono sedi all'estero EXTRA UE", 'yesno', o++);
    await insertQ('PA', 'Se si, dove (EXTRA UE)', 'text', o++, { parentId: qSediExtraUe, parentConditionValue: 'SI' });

    const qSediEstRappr = await insertQ('PA', 'Le sedi estere hanno rappresentanza stabile', 'yesno', o++);
    await insertQ('PA', 'Rappresentanza stabile UE', 'yesno', o++, { parentId: qSediEstRappr, parentConditionValue: 'SI' });
    await insertQ('PA', 'Rappresentanza stabile EXTRA UE', 'yesno', o++, { parentId: qSediEstRappr, parentConditionValue: 'SI' });

    const qControllo = await insertQ('PA', "L'Azienda è sottoposta a controllo e/o direzione e/o coordinamento", 'yesno', o++);
    await insertQ('PA', 'Se si, da chi', 'text', o++, { parentId: qControllo, parentConditionValue: 'SI' });
    await insertQ('PA', 'Sede controllante (UE/EXTRA UE e indirizzo)', 'text', o++, { parentId: qControllo, parentConditionValue: 'SI' });

    await insertQ('PA', 'Note (Dati Generali)', 'text', o++);

    // -- Attività --
    await insertQ('PA', 'Descrizione attività', 'text', o++, { obbligatoria: true });
    await insertQ('PA', 'Codice ATECO', 'text', o++, { obbligatoria: true });

    const qProduzione = await insertQ('PA', 'Produzione', 'yesno', o++);
    await insertQ('PA', 'Cosa produce', 'choice', o++, { opzioni: ['Beni', 'Servizi', 'Lavori', 'Altro'], parentId: qProduzione, parentConditionValue: 'SI' });
    await insertQ('PA', 'Descrizione processo produttivo', 'text', o++, { parentId: qProduzione, parentConditionValue: 'SI', accettaDocumenti: true });

    const qDistribuzione = await insertQ('PA', 'Distribuzione', 'yesno', o++);
    await insertQ('PA', 'Cosa distribuisce', 'choice', o++, { opzioni: ['Beni', 'Servizi', 'Lavori', 'Altro'], parentId: qDistribuzione, parentConditionValue: 'SI' });
    await insertQ('PA', 'Descrizione processo distributivo', 'text', o++, { parentId: qDistribuzione, parentConditionValue: 'SI', accettaDocumenti: true });

    const qB2B = await insertQ('PA', 'Vendita B2B', 'yesno', o++);
    await insertQ('PA', 'Cosa vende B2B', 'choice', o++, { opzioni: ['Beni', 'Servizi', 'Lavori', 'Altro'], parentId: qB2B, parentConditionValue: 'SI' });
    await insertQ('PA', 'Descrizione processo vendita B2B', 'text', o++, { parentId: qB2B, parentConditionValue: 'SI' });

    const qB2C = await insertQ('PA', 'Vendita B2C', 'yesno', o++);
    await insertQ('PA', 'Cosa vende B2C', 'choice', o++, { opzioni: ['Beni', 'Servizi', 'Lavori', 'Altro'], parentId: qB2C, parentConditionValue: 'SI' });
    await insertQ('PA', 'Descrizione processo vendita B2C', 'text', o++, { parentId: qB2C, parentConditionValue: 'SI' });

    await insertQ('PA', 'Note (Attività)', 'text', o++);

    // -- Organizzazione --
    const qOrganigramma = await insertQ('PA', 'Esiste un organigramma aziendale', 'yesno', o++, { accettaDocumenti: true });
    const q231 = await insertQ('PA', "E' stato adottato un modello di organizzazione e gestione ex D.Lgs. 231/2001", 'yesno', o++, { accettaDocumenti: true });
    const q81 = await insertQ('PA', "E' stato adottato uno specifico modello di organizzazione e gestione della sicurezza sul lavoro ex art. 30 D.Lgs. 81/2008", 'yesno', o++, { accettaDocumenti: true });
    const qDVR = await insertQ('PA', "E' stato redatto il Documento di Valutazione dei Rischi (DVR)", 'yesno', o++, { accettaDocumenti: true });
    const qDUVRI = await insertQ('PA', "E' stato redatto il Documento Unico di Valutazione dei Rischi da Interferenze (DUVRI)", 'yesno', o++, { accettaDocumenti: true });

    const qRSPP = await insertQ('PA', "E' stato nominato il RSPP", 'yesno', o++);
    await insertQ('PA', 'Il RSPP è interno o esterno', 'choice', o++, { opzioni: ['Interno', 'Esterno'], parentId: qRSPP, parentConditionValue: 'SI' });

    const qCertificata = await insertQ('PA', "L'Azienda è certificata", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('PA', 'Certificazioni (indicare certificazione, OdC, data rilascio, data aggiornamento)', 'text', o++, { parentId: qCertificata, parentConditionValue: 'SI', accettaDocumenti: true });

    await insertQ('PA', 'Quanti sono gli uffici presenti in azienda', 'number', o++);
    await insertQ('PA', 'Dettaglio uffici (numero, funzione)', 'text', o++);
    await insertQ('PA', 'Quanti sono i reparti produttivi/magazzino', 'number', o++);
    await insertQ('PA', 'Dettaglio reparti (numero, funzione)', 'text', o++);

    await insertQ('PA', 'Quanti sono i dipendenti', 'number', o++, { obbligatoria: true });
    await insertQ('PA', 'Di cui impiegati (totale, a termine, a tempo indeterminato)', 'text', o++);
    await insertQ('PA', 'Di cui quadri (totale, a termine, a tempo indeterminato)', 'text', o++);
    await insertQ('PA', 'Di cui dirigenti (totale, a termine, a tempo indeterminato)', 'text', o++);
    await insertQ('PA', 'Di cui operai (totale, a termine, a tempo indeterminato)', 'text', o++);
    await insertQ('PA', 'Di cui apprendisti (totale, a termine, a tempo indeterminato)', 'text', o++);

    await insertQ('PA', 'Dettaglio Impiegati (n.ro, ufficio/reparto, mansione, trattamento dati personali, dati trattati)', 'text', o++);
    await insertQ('PA', 'Dettaglio Quadri (n.ro, ufficio/reparto, mansione, trattamento dati personali, dati trattati)', 'text', o++);
    await insertQ('PA', 'Dettaglio Dirigenti (n.ro, ufficio/reparto, mansione, trattamento dati personali, dati trattati)', 'text', o++);
    await insertQ('PA', 'Dettaglio Operai (n.ro, ufficio/reparto, mansione, trattamento dati personali, dati trattati)', 'text', o++);

    await insertQ('PA', 'Documenti acquisiti dipendenti (tipologia, di chi, conservati in, trasmessi a, finalità)', 'text', o++, { accettaDocumenti: true });

    const qRapportiDiversi = await insertQ('PA', "L'Azienda ha in essere rapporti diversi da quelli di lavoro dipendente", 'yesno', o++);
    await insertQ('PA', 'Rapporti non dipendenti (n.ro, tipologia, oggetto, trattamento dati personali, dati trattati)', 'text', o++, { parentId: qRapportiDiversi, parentConditionValue: 'SI' });
    await insertQ('PA', 'Documenti acquisiti non dipendenti (tipologia, di chi, conservati in, trasmessi a, finalità)', 'text', o++, { parentId: qRapportiDiversi, parentConditionValue: 'SI', accettaDocumenti: true });

    const qConsulenti = await insertQ('PA', "L'Azienda si avvale di consulenti (professionisti e/o società) esterni", 'yesno', o++);
    await insertQ('PA', 'Consulenti esterni (n.ro, tipologia, oggetto, trattamento dati personali, dati trattati)', 'text', o++, { parentId: qConsulenti, parentConditionValue: 'SI' });

    const qReteComm = await insertQ('PA', 'Esiste una rete commerciale', 'yesno', o++);
    await insertQ('PA', 'Struttura rete commerciale (teleselling inbound/outbound, agenti mono/pluri mandatari, procacciatori, distributori, punti vendita diretti/indiretti, webselling, altro - con n.ro, trattamento dati, dati trattati)', 'text', o++, { parentId: qReteComm, parentConditionValue: 'SI' });

    await insertQ('PA', 'Note (Organizzazione)', 'text', o++);

    // -- Concorrenza --
    await insertQ('PA', 'Tipologia concorrenti (artigiani, soc. persone, soc. capitali - piccole/medie/grandi)', 'text', o++);
    await insertQ('PA', 'Localizzazione concorrenza e valore mercato (locale, provinciale, regionale, nazionale, UE, EXTRA UE)', 'text', o++);
    const qDatiConc = await insertQ('PA', 'Vengono trattati dati personali dei concorrenti', 'yesno', o++);
    await insertQ('PA', 'Note (Concorrenza)', 'text', o++);

    // =====================================================================
    // SEZIONE CA - CICLO ATTIVO
    // =====================================================================
    o = 1;

    await insertQ('CA', 'Nominativo Referente Azienda ciclo attivo', 'text', o++);

    // Anagrafica Clienti
    const qFascicoloCliente = await insertQ('CA', 'Esiste un fascicolo del Cliente', 'yesno', o++);
    const qSchedaCliente = await insertQ('CA', 'Esiste una scheda raccolta dati del Cliente', 'yesno', o++);
    await insertQ('CA', 'Dati trattati nella scheda cliente (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - indicare di chi)', 'text', o++, { parentId: qSchedaCliente, parentConditionValue: 'SI' });

    const qDocCliente = await insertQ('CA', 'Vengono acquisiti documenti del Cliente', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CA', 'Documenti acquisiti del Cliente (carta identità, tessera sanitaria, visura camerale, certificato P.IVA, certificato C.F., casellario giudiziale, casellario anag. trib., casellario ANAC, DURC, altro)', 'text', o++, { parentId: qDocCliente, parentConditionValue: 'SI' });

    const qRatingCliente = await insertQ('CA', "Esistono procedure per valutare l'affidabilità ed il rating del Cliente", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CA', 'Procedura di rating (quale, con quali strumenti, cadenza aggiornamenti)', 'text', o++, { parentId: qRatingCliente, parentConditionValue: 'SI' });

    await insertQ('CA', 'I Clienti sono soggetti residenti in (Italia, UE, EXTRA UE - specificare dove)', 'text', o++);
    await insertQ('CA', 'Note (Anagrafica Clienti)', 'text', o++);

    // Modulistica ciclo attivo
    const qModelliCA = await insertQ('CA', "L'Azienda ha predisposto modelli tipo per la gestione del ciclo attivo", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CA', 'Modelli esistenti (preventivi, offerte, contratti, altro - con numero protocollo, archiviazione, metodo CART/DIG, luogo)', 'text', o++, { parentId: qModelliCA, parentConditionValue: 'SI', accettaDocumenti: true });

    const qModelliDatiCA = await insertQ('CA', 'I modelli includono dati personali', 'yesno', o++);
    await insertQ('CA', 'Dati personali nei modelli (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - di chi)', 'text', o++, { parentId: qModelliDatiCA, parentConditionValue: 'SI' });

    const qProcModifCA = await insertQ('CA', "E' prevista una procedura per le modifiche dei modelli e delle procedure adottati", 'yesno', o++);
    await insertQ('CA', 'Quale procedura', 'text', o++, { parentId: qProcModifCA, parentConditionValue: 'SI', accettaDocumenti: true });

    const qClientiDatiCA = await insertQ('CA', 'I Clienti indicano nei loro moduli dati personali', 'yesno', o++);
    await insertQ('CA', 'Dati personali dei clienti nei moduli (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - di chi)', 'text', o++, { parentId: qClientiDatiCA, parentConditionValue: 'SI' });

    const qSoftwareCA = await insertQ('CA', 'Viene utilizzato un software per la generazione e gestione della modulistica', 'yesno', o++);
    await insertQ('CA', 'Quale software', 'text', o++, { parentId: qSoftwareCA, parentConditionValue: 'SI' });

    await insertQ('CA', 'Note (Modulistica ciclo attivo)', 'text', o++);

    // Gestione vendite
    await insertQ('CA', 'Il prezzo di vendita viene generato in base a (listino, quotazione, altro)', 'choice', o++, { opzioni: ['Listino', 'Quotazione', 'Altro'] });

    const qListiniCA = await insertQ('CA', 'Esiste uno o più listini prezzi di vendita', 'choice', o++, { opzioni: ['Uno', 'Più di uno', 'Nessuno'] });
    await insertQ('CA', 'Classificazione listini (per cliente, prodotto, agente, altro)', 'text', o++, { parentId: qListiniCA, parentConditionValue: 'Più di uno' });

    const qAggListCA = await insertQ('CA', 'Esiste una procedura di aggiornamento dei listini', 'yesno', o++, { accettaDocumenti: true });

    await insertQ('CA', 'Le vendite avvengono attraverso (preventivo, offerta, conferma ordine, contratto, ordine Cliente, e-commerce, altro - con dati personali, quali, mod. trasmissione)', 'text', o++);
    await insertQ('CA', 'Modalità di vendita (DDT con succ. fattura, fatt. accomp., fattura differita, altro - con dati personali, quali, mod. trasmissione)', 'text', o++);

    const qPeriodicaCA = await insertQ('CA', "L'emissione delle fatture di vendita avviene con una periodicità programmata", 'yesno', o++);
    await insertQ('CA', 'Periodicità (mensile, quindicinale, settimanale, giornaliera, altro)', 'choice', o++, { opzioni: ['Mensile', 'Quindicinale', 'Settimanale', 'Giornaliera', 'Altro'], parentId: qPeriodicaCA, parentConditionValue: 'SI' });

    await insertQ('CA', 'Metodi di pagamento ammessi (bonifico bancario, ri.ba., contrassegno, assegno, contanti, altro)', 'text', o++);

    const qMetodoUnivCA = await insertQ('CA', 'Esiste un metodo di pagamento univoco per ogni singolo cliente', 'yesno', o++);

    const qInsoluti = await insertQ('CA', 'Esiste una procedura di controllo degli insoluti / mancati incassi', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CA', 'Quale procedura insoluti', 'text', o++, { parentId: qInsoluti, parentConditionValue: 'SI' });

    const qRecuperoInsoluti = await insertQ('CA', 'Esiste una procedura standardizzata per la gestione ed il recupero degli insoluti', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CA', 'Quale procedura recupero', 'text', o++, { parentId: qRecuperoInsoluti, parentConditionValue: 'SI' });

    await insertQ('CA', 'Note (Gestione vendite)', 'text', o++);

    // =====================================================================
    // SEZIONE CP - CICLO PASSIVO
    // =====================================================================
    o = 1;

    await insertQ('CP', 'Nominativo Referente Azienda ciclo passivo', 'text', o++);

    const qFascicoloFornitore = await insertQ('CP', 'Esiste un fascicolo del Fornitore', 'yesno', o++);
    const qSchedaFornitore = await insertQ('CP', 'Esiste una scheda raccolta dati del Fornitore', 'yesno', o++);
    await insertQ('CP', 'Dati trattati nella scheda fornitore (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - indicare di chi)', 'text', o++, { parentId: qSchedaFornitore, parentConditionValue: 'SI' });

    const qDocFornitore = await insertQ('CP', 'Vengono acquisiti documenti del Fornitore', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CP', 'Documenti acquisiti del Fornitore (carta identità, tessera sanitaria, visura camerale, certificato P.IVA, certificato C.F., casellario giudiziale, casellario anag. trib., casellario ANAC, DURC)', 'text', o++, { parentId: qDocFornitore, parentConditionValue: 'SI' });

    const qRatingFornitore = await insertQ('CP', "Esistono procedure per valutare l'affidabilità ed il rating del Fornitore", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CP', 'Procedura rating fornitore (quale, con quali strumenti, cadenza aggiornamenti)', 'text', o++, { parentId: qRatingFornitore, parentConditionValue: 'SI' });

    await insertQ('CP', 'I Fornitori sono soggetti residenti in (Italia, UE, EXTRA UE - specificare dove)', 'text', o++);
    await insertQ('CP', 'Note (Anagrafica Fornitori)', 'text', o++);

    // Modulistica ciclo passivo
    const qModelliCP = await insertQ('CP', "L'Azienda ha predisposto modelli tipo per la gestione del ciclo passivo", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CP', 'Modelli esistenti (rich. preventivi, offerte, contratti, altro - con numero protocollo, archiviazione, metodo CART/DIG, luogo)', 'text', o++, { parentId: qModelliCP, parentConditionValue: 'SI', accettaDocumenti: true });

    const qModelliDatiCP = await insertQ('CP', 'I modelli includono dati personali', 'yesno', o++);
    await insertQ('CP', 'Dati personali nei modelli (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - di chi)', 'text', o++, { parentId: qModelliDatiCP, parentConditionValue: 'SI' });

    const qProcModifCP = await insertQ('CP', "E' prevista una procedura per le modifiche dei modelli e delle procedure adottati", 'yesno', o++);
    await insertQ('CP', 'Quale procedura', 'text', o++, { parentId: qProcModifCP, parentConditionValue: 'SI', accettaDocumenti: true });

    const qFornitoriDatiCP = await insertQ('CP', 'I Fornitori indicano nei loro moduli dati personali', 'yesno', o++);
    await insertQ('CP', 'Dati personali dei fornitori nei moduli (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - di chi)', 'text', o++, { parentId: qFornitoriDatiCP, parentConditionValue: 'SI' });

    const qSoftwareCP = await insertQ('CP', 'Viene utilizzato un software per la generazione e gestione della modulistica', 'yesno', o++);
    await insertQ('CP', 'Quale software', 'text', o++, { parentId: qSoftwareCP, parentConditionValue: 'SI' });

    await insertQ('CP', 'Note (Modulistica ciclo passivo)', 'text', o++);

    // Gestione acquisti
    await insertQ('CP', 'Il prezzo di acquisto viene generato in base a (listino, quotazione, altro)', 'choice', o++, { opzioni: ['Listino', 'Quotazione', 'Altro'] });

    const qListiniCP = await insertQ('CP', 'Esiste uno o più listini prezzi di acquisto', 'choice', o++, { opzioni: ['Uno', 'Più di uno', 'Nessuno'] });
    await insertQ('CP', 'Classificazione listini (per fornitore, prodotto, agente, altro)', 'text', o++, { parentId: qListiniCP, parentConditionValue: 'Più di uno' });

    const qAggListCP = await insertQ('CP', 'Esiste una procedura di aggiornamento dei listini', 'yesno', o++, { accettaDocumenti: true });

    await insertQ('CP', 'Gli acquisti avvengono attraverso (preventivo, offerta, conferma ordine, contratto, ordine, e-commerce, altro - con dati personali, quali, mod. trasmissione)', 'text', o++);
    await insertQ('CP', 'Modalità di acquisto (DDT con succ. fattura, fatt. accomp., fattura differita, altro - con dati personali, quali, mod. trasmissione)', 'text', o++);

    const qPeriodicaCP = await insertQ('CP', "L'emissione delle fatture di acquisto avviene con una periodicità programmata", 'yesno', o++);
    await insertQ('CP', 'Periodicità (mensile, quindicinale, settimanale, giornaliera, altro)', 'choice', o++, { opzioni: ['Mensile', 'Quindicinale', 'Settimanale', 'Giornaliera', 'Altro'], parentId: qPeriodicaCP, parentConditionValue: 'SI' });

    await insertQ('CP', 'Metodi di pagamento ammessi (bonifico bancario, ri.ba., contrassegno, assegno, contanti, altro)', 'text', o++);

    const qMetodoUnivCP = await insertQ('CP', 'Esiste un metodo di pagamento univoco per ogni singolo Fornitore', 'yesno', o++);

    const qControlPag = await insertQ('CP', 'Esiste una procedura di controllo dei pagamenti', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CP', 'Quale procedura controllo pagamenti', 'text', o++, { parentId: qControlPag, parentConditionValue: 'SI' });

    const qNonConf = await insertQ('CP', 'Esiste una procedura standardizzata per la gestione delle non conformità', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('CP', 'Quale procedura non conformità', 'text', o++, { parentId: qNonConf, parentConditionValue: 'SI' });

    const qDatiPersCP = await insertQ('CP', 'Vengono trattati dati personali', 'yesno', o++);
    await insertQ('CP', 'Dati personali trattati (nome/cognome, residenza, telefoni, cellulari, email, dati bancari, altro - di chi)', 'text', o++, { parentId: qDatiPersCP, parentConditionValue: 'SI' });

    await insertQ('CP', 'Note (Gestione acquisti)', 'text', o++);

    // =====================================================================
    // SEZIONE TR - TRASPORTI
    // =====================================================================
    o = 1;

    await insertQ('TR', 'Nominativo Referente Azienda trasporti', 'text', o++);

    await insertQ('TR', 'Acquisti - Mezzi propri (dati personali trattati, quali, di chi)', 'text', o++);
    await insertQ('TR', 'Acquisti - Corriere (dati personali trattati, quali, di chi)', 'text', o++);
    await insertQ('TR', 'Acquisti - Altro mezzo (dati personali trattati, quali, di chi)', 'text', o++);

    await insertQ('TR', 'Vendite - Mezzi propri (dati personali trattati, quali, di chi)', 'text', o++);
    await insertQ('TR', 'Vendite - Corriere (dati personali trattati, quali, di chi)', 'text', o++);
    await insertQ('TR', 'Vendite - Altro mezzo (dati personali trattati, quali, di chi)', 'text', o++);

    await insertQ('TR', 'Note (Trasporti)', 'text', o++);

    // =====================================================================
    // SEZIONE IN - INDEBITAMENTO
    // =====================================================================
    o = 1;

    await insertQ('IN', 'Nominativo Referente Azienda indebitamento', 'text', o++);

    // Mutui
    const qMutui = await insertQ('IN', "L'Azienda ha in essere contratti di mutuo", 'yesno', o++, { accettaDocumenti: true });

    const qGaranzieMutui = await insertQ('IN', 'Sono state rilasciate garanzie (mutui)', 'yesno', o++, { parentId: qMutui, parentConditionValue: 'SI' });
    await insertQ('IN', 'Garanzie mutui (ipoteca beni aziendali, ipoteca beni soci, ipoteca beni terzi, fideiussione soci, fideiussione terzi, altro)', 'text', o++, { parentId: qGaranzieMutui, parentConditionValue: 'SI', accettaDocumenti: true });

    const qAssicMutui = await insertQ('IN', 'Al mutuo sono stati abbinati contratti di assicurazione (incendio, scoppio, vita, infortunio, posto lavoro)', 'yesno', o++, { parentId: qMutui, parentConditionValue: 'SI' });
    await insertQ('IN', 'Quali assicurazioni abbinate al mutuo', 'text', o++, { parentId: qAssicMutui, parentConditionValue: 'SI', accettaDocumenti: true });

    const qDerivatoMutuo = await insertQ('IN', 'Al mutuo è stato abbinato un contratto derivato di copertura (es. Interest Rate Swap)', 'yesno', o++, { parentId: qMutui, parentConditionValue: 'SI', accettaDocumenti: true });

    await insertQ('IN', 'Note (Mutui)', 'text', o++);

    // Conti corrente
    const qCC = await insertQ('IN', "L'Azienda ha in essere rapporti di conto corrente", 'yesno', o++, { accettaDocumenti: true });

    const qGaranzieCC = await insertQ('IN', 'Sono state rilasciate garanzie (c/c)', 'yesno', o++, { parentId: qCC, parentConditionValue: 'SI' });
    await insertQ('IN', 'Garanzie c/c (ipoteca beni aziendali, ipoteca beni soci, ipoteca beni terzi, fideiussione soci, fideiussione terzi, altro)', 'text', o++, { parentId: qGaranzieCC, parentConditionValue: 'SI', accettaDocumenti: true });

    const qAssicCC = await insertQ('IN', 'Al c/c sono stati abbinati contratti di assicurazione', 'yesno', o++, { parentId: qCC, parentConditionValue: 'SI' });
    await insertQ('IN', 'Quali assicurazioni abbinate al c/c', 'text', o++, { parentId: qAssicCC, parentConditionValue: 'SI', accettaDocumenti: true });

    const qDerivatoCC = await insertQ('IN', 'Al c/c è stato abbinato un contratto derivato di copertura (es. Interest Rate Swap)', 'yesno', o++, { parentId: qCC, parentConditionValue: 'SI', accettaDocumenti: true });

    await insertQ('IN', 'Note (Conti corrente)', 'text', o++);

    // Leasing
    const qLeasing = await insertQ('IN', "L'Azienda ha in essere contratti di leasing", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('IN', 'Tipo leasing (immobiliare, mobiliare)', 'choice', o++, { opzioni: ['Immobiliare', 'Mobiliare', 'Entrambi'], parentId: qLeasing, parentConditionValue: 'SI' });
    await insertQ('IN', 'Note (Leasing)', 'text', o++);

    // Derivati
    const qDerivati = await insertQ('IN', "L'Azienda ha stipulato contratti derivati", 'yesno', o++, { accettaDocumenti: true });
    await insertQ('IN', 'Note (Derivati)', 'text', o++);

    // Riscossione coattiva
    const qRiscossione = await insertQ('IN', "L'Azienda ha carichi iscritti a ruolo gestiti dal Concessionario", 'yesno', o++, { accettaDocumenti: true });
    const qVincoli = await insertQ('IN', 'Ci sono vincoli reali sulle cartelle di pagamento', 'yesno', o++, { parentId: qRiscossione, parentConditionValue: 'SI' });
    const qAzioniEsec = await insertQ('IN', 'Sono state intraprese azioni esecutive', 'yesno', o++, { parentId: qRiscossione, parentConditionValue: 'SI' });
    const qCarichi = await insertQ('IN', 'I carichi sono gestiti', 'yesno', o++, { parentId: qRiscossione, parentConditionValue: 'SI' });
    await insertQ('IN', 'Note (Riscossione coattiva)', 'text', o++);

    // =====================================================================
    // SEZIONE AL - AREA LEGALE
    // =====================================================================
    o = 1;

    await insertQ('AL', 'Nominativo Referente Azienda area legale', 'text', o++);

    const qProcVertenze = await insertQ('AL', 'Esiste una procedura per la gestione delle vertenze legali', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('AL', 'Quale procedura vertenze', 'text', o++, { parentId: qProcVertenze, parentConditionValue: 'SI' });

    await insertQ('AL', 'Le vertenze legali vengono gestite da (dipendenti interni, collaboratori interni, consulenti esterni)', 'choice', o++, { opzioni: ['Dipendenti interni', 'Collaboratori interni', 'Consulenti esterni', 'Combinazione'] });

    const qVertenze3anni = await insertQ('AL', "L'Azienda è stata coinvolta negli ultimi tre anni in vertenze legali", 'yesno', o++);
    await insertQ('AL', 'Dettaglio vertenze (n. attive, n. passive, oggetto, pendenti/definite, stragiudiziali/giudiziali, esito positivo/negativo)', 'text', o++, { parentId: qVertenze3anni, parentConditionValue: 'SI', accettaDocumenti: true });

    await insertQ('AL', 'Note (Area Legale)', 'text', o++);

    // =====================================================================
    // SEZIONE IT - AREA IT
    // =====================================================================
    o = 1;

    await insertQ('IT', 'Nominativo Referente Azienda area IT', 'text', o++);

    // Hardware
    const qPC = await insertQ('IT', 'Sono presenti PC in azienda', 'yesno', o++);
    await insertQ('IT', 'PC fissi (quanti, dove sono, sono in rete)', 'text', o++, { parentId: qPC, parentConditionValue: 'SI' });
    await insertQ('IT', 'PC portatili (quanti, dove sono, sono in rete)', 'text', o++, { parentId: qPC, parentConditionValue: 'SI' });

    const qServer = await insertQ('IT', 'Sono presenti server in azienda', 'yesno', o++);
    await insertQ('IT', 'Server fisici (quanti, quali, dove ubicati, per cosa utilizzati, manutenzione, aggiornamento)', 'text', o++, { parentId: qServer, parentConditionValue: 'SI' });

    const qCloud = await insertQ('IT', 'Vengono utilizzati server cloud', 'yesno', o++);
    await insertQ('IT', 'Server cloud (fornitore, ubicazione, utilizzo, manutenzione, aggiornamento)', 'text', o++, { parentId: qCloud, parentConditionValue: 'SI' });

    const qTablet = await insertQ('IT', 'Vengono utilizzati tablet aziendali', 'yesno', o++);
    await insertQ('IT', 'Tablet (quanti, per cosa)', 'text', o++, { parentId: qTablet, parentConditionValue: 'SI' });

    const qSmartphone = await insertQ('IT', 'Vengono utilizzati smartphone aziendali', 'yesno', o++);
    await insertQ('IT', 'Smartphone (quanti, per cosa)', 'text', o++, { parentId: qSmartphone, parentConditionValue: 'SI' });

    const qBYOD = await insertQ('IT', 'Vengono utilizzati device personali per attività aziendali', 'yesno', o++);
    await insertQ('IT', 'Device personali (da chi, per cosa)', 'text', o++, { parentId: qBYOD, parentConditionValue: 'SI' });

    const qStampanti = await insertQ('IT', 'Sono presenti stampanti in azienda', 'yesno', o++);
    await insertQ('IT', 'Stampanti (quante, dove, quante a colori, quante scanner/fotocop., sono in rete)', 'text', o++, { parentId: qStampanti, parentConditionValue: 'SI' });

    const qEtichettatura = await insertQ('IT', 'Sono presenti stampanti per etichettatura', 'yesno', o++);
    await insertQ('IT', 'Stampanti etichettatura (quante, in rete)', 'text', o++, { parentId: qEtichettatura, parentConditionValue: 'SI' });

    const qScanner = await insertQ('IT', 'Sono presenti scanner in azienda', 'yesno', o++);
    await insertQ('IT', 'Scanner (quanti, dove, in rete)', 'text', o++, { parentId: qScanner, parentConditionValue: 'SI' });

    const qFotocop = await insertQ('IT', 'Sono presenti fotocopiatrici in azienda', 'yesno', o++);
    await insertQ('IT', 'Fotocopiatrici (quante, a colori, dove)', 'text', o++, { parentId: qFotocop, parentConditionValue: 'SI' });

    const qFaxFisici = await insertQ('IT', 'Sono presenti fax fisici in azienda', 'yesno', o++);
    await insertQ('IT', 'Fax fisici (quanti, dove, in rete)', 'text', o++, { parentId: qFaxFisici, parentConditionValue: 'SI' });

    const qFaxVirt = await insertQ('IT', 'Sono presenti fax virtuali in azienda', 'yesno', o++);
    await insertQ('IT', 'Fax virtuali (quanti, fornitore)', 'text', o++, { parentId: qFaxVirt, parentConditionValue: 'SI' });

    const qBarcode = await insertQ('IT', 'Sono presenti lettori Barcode e/o QRcode', 'yesno', o++);
    await insertQ('IT', 'Lettori (quanti Barcode, quanti QRcode)', 'text', o++, { parentId: qBarcode, parentConditionValue: 'SI' });

    const qCentralino = await insertQ('IT', "E' presente un centralino telefonico", 'yesno', o++);
    await insertQ('IT', 'Quanti telefoni fissi sono presenti', 'number', o++);
    await insertQ('IT', 'Quanti telefoni mobili aziendali sono attivi', 'number', o++);

    const qUPS = await insertQ('IT', 'Sono presenti gruppi di continuità (UPS)', 'yesno', o++);
    await insertQ('IT', 'UPS - dove si trovano', 'text', o++, { parentId: qUPS, parentConditionValue: 'SI' });

    const qPresenze = await insertQ('IT', "E' presente un sistema di controllo presenze", 'yesno', o++);
    await insertQ('IT', 'Tipo controllo presenze (manuale, badge, prossimità, biometrici, altro)', 'choice', o++, { opzioni: ['Manuale', 'Badge', 'Prossimità', 'Biometrici', 'Altro'], parentId: qPresenze, parentConditionValue: 'SI' });

    const qAccesso = await insertQ('IT', "E' presente un sistema di controllo accesso ai locali", 'yesno', o++);
    await insertQ('IT', 'Tipo controllo accesso (manuale, badge, prossimità, biometrici, altro)', 'choice', o++, { opzioni: ['Manuale', 'Badge', 'Prossimità', 'Biometrici', 'Altro'], parentId: qAccesso, parentConditionValue: 'SI' });

    const qAntintrus = await insertQ('IT', "E' presente un sistema di antintrusione", 'yesno', o++);
    await insertQ('IT', 'Tipo antintrusione (allarme, tvcc, videosorveglianza, altro)', 'choice', o++, { opzioni: ['Allarme', 'TVCC', 'Videosorveglianza', 'Altro'], parentId: qAntintrus, parentConditionValue: 'SI' });

    await insertQ('IT', 'Note (Hardware)', 'text', o++);

    // Software
    await insertQ('IT', 'Sistemi operativi utilizzati (Windows, Mac, altro - con licenze)', 'text', o++);

    const qDB = await insertQ('IT', 'Sono presenti Data Base', 'yesno', o++);
    await insertQ('IT', 'Quanti e quali database', 'text', o++, { parentId: qDB, parentConditionValue: 'SI' });

    const qOffice = await insertQ('IT', 'Vengono utilizzati applicativi Office', 'yesno', o++);
    await insertQ('IT', 'Applicativi Office (Word, Excel, PowerPoint, altro - con licenze)', 'text', o++, { parentId: qOffice, parentConditionValue: 'SI' });

    const qAltroSW = await insertQ('IT', 'Vengono utilizzati altri tipi di software (AutoCad, Photoshop ecc.)', 'yesno', o++);
    await insertQ('IT', 'Quali altri software (con licenze)', 'text', o++, { parentId: qAltroSW, parentConditionValue: 'SI' });

    const qBackupSW = await insertQ('IT', 'Sono presenti software per backup', 'yesno', o++);
    await insertQ('IT', 'Quali software backup (con licenze)', 'text', o++, { parentId: qBackupSW, parentConditionValue: 'SI' });

    const qAntivirus = await insertQ('IT', 'Sono presenti software antivirus/antintrusione', 'yesno', o++);
    await insertQ('IT', 'Quali antivirus (con licenze)', 'text', o++, { parentId: qAntivirus, parentConditionValue: 'SI' });

    const qGestionali = await insertQ('IT', 'Vengono utilizzati software gestionali (produzione, contabilità, magazzino, presenze, paghe ecc.)', 'yesno', o++);
    await insertQ('IT', 'Software gestionali (produttore, nome prodotto, moduli)', 'text', o++, { parentId: qGestionali, parentConditionValue: 'SI' });
    await insertQ('IT', 'Dati personali nei gestionali (prodotto, dati trattati, finalità)', 'text', o++, { parentId: qGestionali, parentConditionValue: 'SI' });

    await insertQ('IT', 'Note (Software)', 'text', o++);

    // Reti
    const qInternet = await insertQ('IT', "E' presente una connessione internet (ADSL, Fibra Ottica, Satellitare, Radio)", 'yesno', o++);
    await insertQ('IT', 'Connessione internet (fornitore, tipo)', 'text', o++, { parentId: qInternet, parentConditionValue: 'SI' });

    const qWifi = await insertQ('IT', "E' presente una rete Wi-Fi", 'yesno', o++);
    await insertQ('IT', 'Tipo rete (LAN, Wireless)', 'choice', o++, { opzioni: ['LAN', 'Wireless', 'Entrambe'], parentId: qWifi, parentConditionValue: 'SI' });

    const qSwitch = await insertQ('IT', 'Sono presenti switch di rete', 'yesno', o++);
    await insertQ('IT', 'Quanti switch', 'number', o++, { parentId: qSwitch, parentConditionValue: 'SI' });

    const qFirewall = await insertQ('IT', "E' presente un firewall", 'yesno', o++);
    await insertQ('IT', 'Quale firewall', 'text', o++, { parentId: qFirewall, parentConditionValue: 'SI' });

    await insertQ('IT', 'Note (Reti)', 'text', o++);

    // Comunicazione
    const qSitoWeb = await insertQ('IT', "L'Azienda ha un sito web", 'yesno', o++);
    await insertQ('IT', 'Sito web (nome dominio, proprietà azienda, hosting/provider, web master, policy privacy, certificato)', 'text', o++, { parentId: qSitoWeb, parentConditionValue: 'SI' });

    await insertQ('IT', 'Posta elettronica ordinaria (client di posta, server di posta, crittografia)', 'text', o++);
    await insertQ('IT', 'Posta elettronica certificata (client di posta, server di posta, crittografia)', 'text', o++);

    const qAltriCanali = await insertQ('IT', 'Vengono utilizzati altri sistemi/canali di trasmissione (es. wetransfer)', 'yesno', o++);
    await insertQ('IT', 'Quali altri canali', 'text', o++, { parentId: qAltriCanali, parentConditionValue: 'SI' });

    const qCartCond = await insertQ('IT', 'Vengono utilizzate cartelle condivise', 'yesno', o++);
    await insertQ('IT', 'Cartelle condivise (ufficio, da chi, per cosa, storage, dati personali, quali)', 'text', o++, { parentId: qCartCond, parentConditionValue: 'SI' });

    const qCloudCond = await insertQ('IT', 'Per la condivisione si usa il cloud', 'yesno', o++, { parentId: qCartCond, parentConditionValue: 'SI' });
    await insertQ('IT', 'Quale servizio cloud (Dropbox, Google Drive ecc.)', 'text', o++, { parentId: qCloudCond, parentConditionValue: 'SI' });

    const qChat = await insertQ('IT', 'Vengono utilizzate chat', 'yesno', o++);
    await insertQ('IT', 'Quali chat (Skype, Messenger, ecc.)', 'text', o++, { parentId: qChat, parentConditionValue: 'SI' });

    const qSocial = await insertQ('IT', 'Vengono utilizzati Social Network (Facebook, Twitter, LinkedIn etc)', 'yesno', o++);
    await insertQ('IT', 'Social network (quali, da chi, per cosa, dati personali, quali)', 'text', o++, { parentId: qSocial, parentConditionValue: 'SI' });

    await insertQ('IT', 'Informative GDPR ricevute (fornitore, servizio/prodotto, oggetto)', 'text', o++, { accettaDocumenti: true });
    await insertQ('IT', 'Informative GDPR non ricevute (fornitore, servizio/prodotto, oggetto)', 'text', o++);

    await insertQ('IT', 'Note (Comunicazione)', 'text', o++);

    // Sicurezza dati
    const qBackupProc = await insertQ('IT', 'Esistono procedure per il backup', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('IT', 'Metodo backup (harddisk esterni, chiavette USB, cloud, altro)', 'choice', o++, { opzioni: ['Harddisk esterni', 'Chiavette USB', 'Cloud', 'Altro'], parentId: qBackupProc, parentConditionValue: 'SI' });

    const qRecupero = await insertQ('IT', "E' stata verificata/testata la possibilità di recupero dei dati", 'yesno', o++);

    const qTestPeriodici = await insertQ('IT', 'Vengono eseguiti test periodici di funzionamento', 'yesno', o++);
    await insertQ('IT', 'Test periodici (da chi gestito, come eseguito, ogni quando)', 'text', o++, { parentId: qTestPeriodici, parentConditionValue: 'SI' });

    const qDR = await insertQ('IT', 'Esiste un Disaster Recovery', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('IT', 'Disaster Recovery (da chi gestito, come eseguito, viene testato)', 'text', o++, { parentId: qDR, parentConditionValue: 'SI' });

    const qGestUtenti = await insertQ('IT', 'Esiste un sistema di gestione degli utenti', 'yesno', o++);
    await insertQ('IT', 'Gestione utenti (chi gestisce, ruolo aziendale, cosa gestisce, come gestisce)', 'text', o++, { parentId: qGestUtenti, parentConditionValue: 'SI' });

    const qPassword = await insertQ('IT', 'Esiste uno specifico sistema/procedura di gestione password', 'yesno', o++, { accettaDocumenti: true });
    await insertQ('IT', 'Gestione password (chi gestisce, ruolo, come gestisce, composizione, aggiornamento, recupero)', 'text', o++, { parentId: qPassword, parentConditionValue: 'SI' });

    await insertQ('IT', 'Note (Sicurezza dati)', 'text', o++);

    // Contratti e licenze
    await insertQ('IT', 'Contratti manutenzione (fornitore, servizio/prodotto, oggetto)', 'text', o++, { accettaDocumenti: true });
    await insertQ('IT', 'Contratti assistenza (fornitore, servizio/prodotto, oggetto)', 'text', o++, { accettaDocumenti: true });

    await insertQ('IT', 'Note (Contratti e licenze)', 'text', o++);

    // =====================================================================
    // SEZIONE PR - PRIVACY
    // =====================================================================
    o = 1;

    await insertQ('PR', 'Nominativo Referente Azienda Privacy', 'text', o++);

    const qDPS = await insertQ('PR', "L'Azienda ha adottato il DPS secondo la precedente normativa", 'yesno', o++, { accettaDocumenti: true });
    const qRespPrivacy = await insertQ('PR', "E' stato nominato un Responsabile Privacy", 'yesno', o++);
    const qOrgPrivacy = await insertQ('PR', 'Esiste un organigramma privacy', 'yesno', o++, { accettaDocumenti: true });

    const qControllata = await insertQ('PR', 'La società è controllata', 'yesno', o++);
    await insertQ('PR', 'Da chi è controllata (indicare se UE o EXTRA UE)', 'text', o++, { parentId: qControllata, parentConditionValue: 'SI' });
    await insertQ('PR', 'Le controllanti sono compliance', 'yesno', o++, { parentId: qControllata, parentConditionValue: 'SI' });

    const qControllaAltre = await insertQ('PR', 'La società controlla o ha partecipazioni in altre società', 'yesno', o++);
    await insertQ('PR', 'Quali società controllate/partecipate (indicare se UE o EXTRA UE)', 'text', o++, { parentId: qControllaAltre, parentConditionValue: 'SI' });
    await insertQ('PR', 'Le società controllate o partecipate sono compliance', 'yesno', o++, { parentId: qControllaAltre, parentConditionValue: 'SI' });

    // Livello conoscenza
    await insertQ('PR', 'Livello conoscenza normativa - Soci (basso, medio, alto)', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });
    await insertQ('PR', 'Livello conoscenza normativa - Amministratori', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });
    await insertQ('PR', 'Livello conoscenza normativa - Dirigenti', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });
    await insertQ('PR', 'Livello conoscenza normativa - Quadri', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });
    await insertQ('PR', 'Livello conoscenza normativa - Impiegati', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });
    await insertQ('PR', 'Livello conoscenza normativa - Operai', 'choice', o++, { opzioni: ['Basso', 'Medio', 'Alto'] });

    // Attività informative e formative
    const qFormazione = await insertQ('PR', 'Attività informative e formative', 'yesno', o++, { accettaDocumenti: true });

    await insertQ('PR', 'Informative fornite - Dipendenti (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Informative fornite - Clienti (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Informative fornite - Fornitori (per cosa)', 'text', o++, { accettaDocumenti: true });

    await insertQ('PR', 'Informative ricevute - Consulenti esterni (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Informative ricevute - Clienti (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Informative ricevute - Fornitori (per cosa)', 'text', o++, { accettaDocumenti: true });

    await insertQ('PR', 'Nomine fatte - Dipendenti (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Nomine fatte - Consulenti esterni (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Nomine fatte - Fornitori (per cosa)', 'text', o++, { accettaDocumenti: true });

    await insertQ('PR', 'Nomine ricevute - Dipendenti (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Nomine ricevute - Consulenti esterni (per cosa)', 'text', o++, { accettaDocumenti: true });
    await insertQ('PR', 'Nomine ricevute - Fornitori (per cosa)', 'text', o++, { accettaDocumenti: true });

    await insertQ('PR', 'Note (Privacy)', 'text', o++);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rimuovi in ordine inverso per le FK
    await queryRunner.query(`DELETE FROM checkup_questions WHERE sectionId IN (SELECT id FROM checkup_sections WHERE templateId IN (SELECT id FROM checkup_templates WHERE nome = 'Checkup GDPR'))`);
    await queryRunner.query(`DELETE FROM checkup_sections WHERE templateId IN (SELECT id FROM checkup_templates WHERE nome = 'Checkup GDPR')`);
    await queryRunner.query(`DELETE FROM checkup_templates WHERE nome = 'Checkup GDPR'`);
  }
}

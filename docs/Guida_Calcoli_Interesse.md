# Guida Calcoli Interessi

Questa guida descrive le funzionalita' di calcolo interessi presenti in Resolv: calcolo con acconti, piani di ammortamento e gestione dei tassi.

## 1) Calcolo interessi con acconti
Percorso: Utilita' -> Interessi con acconti.

### Scopo
Calcolare gli interessi a scalare tenendo conto di acconti e crediti successivi, con gestione art. 1194 c.c.

### Input richiesti
- Credito iniziale.
- Intervallo date (dal/al).
- Tipo interessi: legale, moratorio o tasso fisso.
- Movimenti: acconto/credito, data, importo, descrizione (max 40 righe).

### Regole di calcolo
- Le date possono essere in qualsiasi ordine: il sistema le ordina automaticamente.
- Movimenti stesso giorno + stesso tipo + stessa descrizione vengono totalizzati.
- Art. 1194 c.c.:
  - Attivo: gli acconti decurtano prima gli interessi maturati e poi il capitale residuo.
  - Disattivo: gli acconti decurtano solo il capitale residuo.
- Nessun anatocismo.
- Per legale/moratorio il tasso e' letto dal database, con cambi di tasso se il periodo attraversa piu' validita'.

### Output
- Tasso applicato.
- Interessi totali e residui.
- Capitale residuo.
- Totale acconti e crediti aggiuntivi.

## 2) Interessi nei piani di ammortamento
Percorso: Dettaglio pratica -> Piano di ammortamento.

### Scopo
Generare piani di rientro con interessi e, se richiesto, capitalizzazione.

### Parametri principali
- Capitale, numero rate, periodicita'.
- Tipo interessi: legale/moratorio/fisso.
- Capitalizzazione: nessuna, trimestrale, semestrale, annuale.
- Opzioni moratori: pre-2013 (-1 punto), maggiorazione +2% o +4% per agroalimentare.
- Art. 1194 c.c. per la gestione acconti.

### Output
- Piano rate con interessi calcolati e capitale residuo.
- PDF con disclaimer sulla capitalizzazione e sulla non applicazione dell'anatocismo per i moratori.

## 3) Gestione tassi di interesse
Percorso: Admin -> Tassi di interesse.

### Fonti
- ECB (tasso MRO) -> Moratorio = BCE + 8.
- MEF comunicati.
- Fallback: avvocatoandreani.it (scraping).

### Flusso "Recupera tassi automaticamente"
- Il sistema recupera i tassi dalle fonti disponibili.
- Se la fonte e' affidabile e il tasso non esiste, viene auto-salvato.
- Se la fonte non e' affidabile, richiede approvazione manuale.
- Se il tasso esiste gia' per lo stesso periodo, viene marcato come "Saltato".

## Note legali e disclaimer
- Non e' applicato l'anatocismo nel calcolo con acconti e nei moratori.
- I risultati sono indicativi e vanno sempre verificati.

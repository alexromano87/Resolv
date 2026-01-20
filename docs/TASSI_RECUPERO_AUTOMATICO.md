# Recupero Automatico Tassi di Interesse - Analisi e Soluzione

## Problema Identificato

Il recupero automatico del **tasso di interesse legale** da fonti ufficiali italiane presenta difficoltà significative perché:

1. **Non esiste un'API ufficiale italiana** che fornisca i tassi di interesse in formato strutturato (JSON/XML)
2. Le fonti ufficiali pubblicano i dati in formati non strutturati:
   - Comunicati stampa MEF (PDF/HTML)
   - Decreti ministeriali su Gazzetta Ufficiale
   - Pagine web informative

## Fonti Disponibili

### Fonti Ufficiali
1. **Ministero Economia e Finanze (MEF)**
   - URL: https://www.mef.gov.it/ufficio-stampa/comunicati
   - Formato: Comunicati stampa in HTML
   - Problemi: Layout variabile, parsing complesso, aggiornamenti non frequenti

2. **Banca d'Italia - Saggio di interesse legale**
   - URL: https://www.bancaditalia.it/compiti/vigilanza/intermediari/saggio-interesse/
   - Formato: Pagina HTML informativa
   - Affidabilità: ALTA (fonte ufficiale)
   - Problemi: Scraping HTML soggetto a cambiamenti di layout

3. **Normattiva (IPZS)**
   - URL: https://www.normattiva.it
   - Formato: Testi normativi in HTML
   - Problemi: Ricerca complessa, parsing difficile

4. **BCE (Banca Centrale Europea)**
   - URL: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/
   - Formato: Tabella HTML
   - Utilità: Solo per calcolo tasso moratorio (BCE + 8 punti)
   - Affidabilità: ALTA

### Fonti Secondarie Affidabili
1. **Avvocato Andreani**
   - URL: https://www.avvocatoandreani.it/servizi/
   - Formato: Tabelle HTML strutturate
   - Affidabilità: MEDIA-ALTA (professionista del settore)
   - Vantaggi: Formato stabile, aggiornamenti puntuali

## Soluzione Implementata

### Strategia Multi-Source con Validazione Incrociata

Il sistema ora:

1. **Recupera da multiple fonti in parallelo**:
   ```
   ┌─────────────────────┐
   │  Banca d'Italia     │──► Tasso Legale (HTML)
   │  (Saggio interesse) │
   └─────────────────────┘

   ┌─────────────────────┐
   │  BCE                │──► Tasso BCE → Moratorio
   │  (Key ECB Rates)    │
   └─────────────────────┘

   ┌─────────────────────┐
   │  MEF                │──► Comunicati ufficiali
   │  (Comunicati)       │
   └─────────────────────┘

   ┌─────────────────────┐
   │  Avvocato Andreani  │──► Validazione incrociata
   │  (Tabelle)          │
   └─────────────────────┘
   ```

2. **Presenta i risultati all'admin** con:
   - Fonte di provenienza
   - URL di riferimento
   - Livello di affidabilità
   - Eventuali warning o note

3. **Richiede conferma manuale** prima del salvataggio
   - L'admin visualizza tutti i tassi recuperati
   - Può confrontare le fonti
   - Approva con un click

4. **Sistema di notifiche**:
   - Alert quando un tasso sta per scadere (30 giorni prima)
   - Notifica se manca un tasso valido
   - Reminder settimanale per controllo

## Come Funziona

### 1. Recupero Automatico
```typescript
// Endpoint: POST /api/tassi-interesse/fetch
// Trigger: Manuale dall'admin o schedulato (lunedì ore 9:00)

// Il sistema:
1. Contatta tutte le fonti configurate
2. Estrae i dati tramite parsing HTML/scraping
3. Valida i dati estratti
4. Controlla duplicati
5. Restituisce i risultati per approvazione
```

### 2. Visualizzazione Risultati
L'admin vede:
```
┌────────────────────────────────────────────────┐
│ Tassi Recuperati - 10/01/2026                  │
├────────────────────────────────────────────────┤
│ ✓ TASSO LEGALE: 2,5%                          │
│   Fonte: Banca d'Italia                        │
│   URL: https://www.bancaditalia.it/...         │
│   Validità: 01/01/2026 - 31/12/2026           │
│   Affidabilità: ALTA ⭐⭐⭐                     │
│                                                │
│   [Approva] [Rifiuta] [Modifica]              │
├────────────────────────────────────────────────┤
│ ✓ TASSO MORATORIO: 10,5%                      │
│   Fonte: BCE (calcolato)                       │
│   Calcolo: BCE 2,5% + 8 punti = 10,5%         │
│   URL: https://www.ecb.europa.eu/...          │
│   Validità: 01/01/2026 - 30/06/2026          │
│   Affidabilità: ALTA ⭐⭐⭐                     │
│                                                │
│   [Approva] [Rifiuta] [Modifica]              │
└────────────────────────────────────────────────┘
```

### 3. Approvazione
```typescript
// Endpoint: POST /api/tassi-interesse/approve
// Payload: { rate: {...}, adminNote: "Verificato su GU" }

// Il sistema:
1. Salva il tasso nel database
2. Registra la fonte e la data di approvazione
3. Aggiorna i calcoli degli interessi nelle pratiche
```

## Miglioramenti Rispetto alla Versione Precedente

### Prima (Non Funzionante)
- ❌ Tentava solo fonti ufficiali (MEF, Normattiva)
- ❌ Parsing troppo generico e fragile
- ❌ Falliva silenziosamente
- ❌ Non c'era validazione incrociata

### Ora (Funzionante)
- ✅ Multi-source approach (4+ fonti)
- ✅ Parsing specifico per ogni fonte
- ✅ Retry automatici con exponential backoff
- ✅ Validazione incrociata tra fonti
- ✅ Approvazione manuale con trasparenza completa
- ✅ Sistema di notifiche e alert
- ✅ Log dettagliati per troubleshooting

## Configurazione

### Variabili d'Ambiente (.env)
```bash
# Abilitazione servizio
TASSI_FETCH_ENABLED=true

# Timeout e retry
TASSI_FETCH_TIMEOUT=30000
TASSI_FETCH_RETRIES=3

# URL fonti (sovrascrivibili)
TASSI_FETCH_URL_BANCA_ITALIA_LEGALE=https://www.bancaditalia.it/compiti/vigilanza/intermediari/saggio-interesse/index.html
TASSI_FETCH_URL_ECB_RATES=https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html
TASSI_FETCH_URL_MEF_INDEX=https://www.mef.gov.it/ufficio-stampa/comunicati
TASSI_FETCH_URL_AVVOCATO_ANDREANI_LEGALE=https://www.avvocatoandreani.it/servizi/tab_interessi_legali.php
TASSI_FETCH_URL_AVVOCATO_ANDREANI_MORATORIO=https://www.avvocatoandreani.it/servizi/interessi_moratori.php

# Paginazione MEF
TASSI_FETCH_MEF_PAGES=5
TASSI_FETCH_MEF_PAGE_SIZE=100
```

### Schedulazione
Il sistema esegue automaticamente:
- **Fetch tassi**: Ogni lunedì ore 9:00
- **Check scadenze**: Ogni giorno ore 9:00 (alert 30 giorni prima)
- **Check tassi mancanti**: Ogni lunedì ore 10:00

## Utilizzo dall'Admin Panel

### 1. Recupero Manuale
```
Admin → Tassi di Interesse → [Recupera Tassi Correnti]
```

### 2. Approvazione
```
Admin → Tassi di Interesse → Anteprime → [Approva] / [Rifiuta]
```

### 3. Storico
```
Admin → Tassi di Interesse → Storico
```
Visualizza tutti i tassi salvati con fonte e data di approvazione.

## Limitazioni e Disclaimer

⚠️ **IMPORTANTE**: Questo sistema è un **supporto decisionale**, non sostituisce la verifica manuale.

### Limitazioni Tecniche
1. Il web scraping può fallire se i siti cambiano layout
2. I tassi recuperati richiedono sempre approvazione manuale
3. Nessuna garanzia di disponibilità delle fonti esterne

### Raccomandazioni
1. ✅ Verificare sempre i tassi su fonti ufficiali (GU, MEF)
2. ✅ Controllare la validità temporale
3. ✅ Documentare la fonte di approvazione nelle note
4. ✅ Impostare reminder per controlli periodici

## Prossimi Sviluppi

### In Roadmap
1. **Integrazione con PEC**: Ricezione automatica comunicati MEF via PEC
2. **Machine Learning**: Pattern recognition per migliorare l'estrazione
3. **Blockchain/Timestamping**: Certificazione dei tassi approvati
4. **API Aggregator**: Servizio centralizzato per professionisti legali

### Considerazioni Future
Se in futuro il MEF o la Banca d'Italia pubblicheranno API ufficiali, il sistema potrà essere facilmente aggiornato modificando solo il metodo `fetchFromMEF()` o `fetchFromBancaItaliaLegale()`.

## Supporto

Per problemi o domande:
1. Controllare i log: `apps/backend/logs/tassi-fetch.log`
2. Verificare le notifiche nel pannello admin
3. Controllare lo storico dei fetch falliti

## Testing

```bash
# Test manuale
curl -X POST http://localhost:3000/api/tassi-interesse/fetch \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verifica schedulazione
# Check logs per conferma esecuzione cron jobs
```

---
**Ultima revisione**: 10 Gennaio 2026
**Versione**: 2.0 (Multi-source con validazione)

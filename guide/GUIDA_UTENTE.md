# RESOLV - Guida Utente Completa

Sistema di gestione pratiche legali per studi professionali e recupero crediti.

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Tipologie di Utenti](#2-tipologie-di-utenti)
3. [Primi Passi](#3-primi-passi)
4. [Guida per Ruolo](#4-guida-per-ruolo)
5. [Gestione Pratiche](#5-gestione-pratiche)
6. [Gestione Clienti e Debitori](#6-gestione-clienti-e-debitori)
7. [Documenti e Alert](#7-documenti-e-alert)
8. [Funzionalità Avanzate](#8-funzionalità-avanzate)
9. [FAQ](#9-faq)

---

## 1. Introduzione

### 1.1 Cos'è Resolv

**Resolv** è una piattaforma web progettata per studi legali e professionisti del recupero crediti che permette di:

- 📁 **Gestire pratiche legali** con tracking completo delle fasi
- 💰 **Monitorare importi e recuperi** (capitali, anticipazioni, compensi)
- 👥 **Organizzare team** (avvocati, collaboratori, segreteria)
- 📊 **Condividere dashboard** con i clienti in modo controllato
- 🔒 **Proteggere i dati** con accessi multi-livello e audit completo

### 1.2 Architettura Multi-Studio

Resolv supporta **più studi legali** sulla stessa piattaforma con **isolamento completo** dei dati:

- Ogni studio vede SOLO i propri dati (clienti, debitori, pratiche)
- Gli amministratori di sistema gestiscono tutti gli studi
- I clienti vedono SOLO le proprie pratiche

### 1.3 Accesso alla Piattaforma

**URL**: `https://app.resolv.com` (o il dominio configurato)

**Requisiti browser:**
- Chrome/Edge 90+ (consigliato)
- Firefox 88+
- Safari 14+

---

## 2. Tipologie di Utenti

Resolv gestisce **6 tipi di utenti** con permessi diversi:

### 2.1 Ruoli e Permessi

| Ruolo | Descrizione | Accesso Principale |
|-------|-------------|-------------------|
| 🔧 **Amministratore** | Gestisce l'intera piattaforma | Tutti gli studi, backup, import/export, utenti |
| 👔 **Titolare Studio** | Proprietario dello studio legale | Gestione completa dello studio, pratiche, team |
| ⚖️ **Avvocato** | Professionista legale | Pratiche assegnate, fasi, movimenti finanziari |
| 📋 **Collaboratore** | Membro del team | Visualizzazione pratiche dello studio |
| 📞 **Segreteria** | Personale amministrativo | Assegnazione avvocati, creazione pratiche |
| 👤 **Cliente** | Creditore esterno | Solo le proprie pratiche in visualizzazione |

### 2.2 Cosa Può Fare Ogni Ruolo

#### 🔧 Amministratore
- ✅ Accesso a TUTTI i dati di TUTTI gli studi
- ✅ Creazione e gestione studi legali
- ✅ Creazione e gestione utenti (tutti i ruoli)
- ✅ Backup e restore del database
- ✅ Export/Import dati massivi (CSV, JSON)
- ✅ Visualizzazione audit log
- ✅ Manutenzione sistema (orphan data, riconciliazione)
- ❌ Non gestisce pratiche quotidianamente (ruolo sistemistico)

#### 👔 Titolare Studio
- ✅ Creazione e gestione pratiche dello studio
- ✅ Creazione clienti e debitori
- ✅ Gestione team dello studio (avvocati, collaboratori, segreteria)
- ✅ Assegnazione avvocati e collaboratori alle pratiche
- ✅ Cambio fasi pratiche
- ✅ Gestione completa dati finanziari
- ✅ Dashboard statistiche dello studio
- ❌ NO accesso a studi di altri
- ❌ NO funzioni admin (backup, audit log)

#### ⚖️ Avvocato
- ✅ Visualizzazione pratiche assegnate
- ✅ Cambio fasi pratiche assegnate
- ✅ Registrazione movimenti finanziari
- ✅ Modifica dettagli pratiche assegnate
- ✅ Creazione clienti e debitori (se necessario)
- ❌ NO creazione nuove pratiche (solo titolare/segreteria)
- ❌ NO visualizzazione pratiche non assegnate
- ❌ NO gestione utenti

#### 📋 Collaboratore (ruolo default)
- ✅ Visualizzazione pratiche dello studio
- ✅ Visualizzazione documenti
- ✅ Creazione alert e promemoria
- ❌ NO modifica pratiche
- ❌ NO cambio fasi
- ❌ NO gestione clienti/debitori
- ❌ Ruolo principalmente consultivo

#### 📞 Segreteria
- ✅ Creazione pratiche
- ✅ Creazione clienti e debitori
- ✅ **Assegnazione/Riassegnazione** avvocati e collaboratori alle pratiche
- ✅ Visualizzazione completa pratiche dello studio
- ❌ **NO cambio fasi** pratiche
- ❌ **NO modifica dati finanziari**
- ❌ Può modificare SOLO: avvocati assegnati, collaboratori assegnati

#### 👤 Cliente
- ✅ Dashboard personalizzata con statistiche proprie pratiche
- ✅ Visualizzazione pratiche dove è creditore
- ✅ Visualizzazione documenti (se abilitati dallo studio)
- ✅ Timeline fasi pratiche
- ❌ **NO modifica** alcuna
- ❌ **NO visualizzazione** pratiche di altri clienti
- ❌ Accesso controllato dalla configurazione dello studio

---

## 3. Primi Passi

### 3.1 Primo Accesso

#### Per Utenti Nuovi (Titolare Studio, Avvocato, etc.)

1. **Ricevi Email di Benvenuto**
   - L'amministratore o il titolare ti crea un account
   - Ricevi email con:
     - Indirizzo email di accesso
     - Password temporanea

2. **Accesso Iniziale**
   ```
   1. Vai su https://app.resolv.com/login
   2. Inserisci email e password temporanea
   3. (Opzionale) Sistema chiederà di abilitare 2FA
   4. Cambia password al primo accesso
   ```

3. **Configurazione Profilo**
   - Vai su **Impostazioni** (icona ingranaggio in alto a destra)
   - Completa:
     - Nome e cognome
     - Telefono
     - Preferenze notifiche
   - Configura **2FA** (Two-Factor Authentication):
     - Scegli canale: **Email** o **SMS**
     - Al login successivo riceverai codice a 6 cifre
     - Inserisci codice entro 5 minuti

#### Per Clienti Esterni

1. **Lo Studio Configura il Tuo Accesso**
   - Il titolare crea il tuo utente con ruolo "Cliente"
   - Associa il tuo account a uno o più clienti (creditori)
   - Abilita condivisione dashboard

2. **Ricevi Credenziali**
   - Email con link e password temporanea
   - Accedi via `https://app.resolv.com/login`

3. **Visualizza Dashboard Condivisa**
   - Dopo il login, vedi automaticamente `/dashboard-condivisa`
   - Vedi SOLO le pratiche dove sei creditore
   - Configurazione visibilità controllata dallo studio

### 3.2 Interfaccia Principale

#### Layout Applicazione

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  [Logo] Resolv    [Menu]  [Notifiche]  [Profilo ▾]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SIDEBAR           │         CONTENUTO PRINCIPALE      │
│                    │                                    │
│  • Dashboard       │   [Titolo Pagina]                 │
│  • Pratiche        │                                    │
│  • Clienti         │   [Filtri e Ricerca]              │
│  • Debitori        │                                    │
│  • Avvocati        │   [Tabella/Cards/Form]            │
│  • Documenti       │                                    │
│  • Alert           │   [Paginazione]                   │
│  • Ticket          │                                    │
│  • Ricerca         │                                    │
│  • Admin (se admin)│                                    │
│                    │                                    │
└────────────────────┴────────────────────────────────────┘
```

#### Menu Utente (Icona Profilo)

Cliccando sull'icona profilo (in alto a destra):

- **Il Mio Profilo** → Dati personali
- **Impostazioni** → Preferenze, 2FA, cambio password
- **Cambia Password** → Form cambio password
- **Logout** → Esci dall'applicazione
- **Logout da Tutti i Dispositivi** → Invalida tutte le sessioni

### 3.3 Sicurezza e Session

#### Durata Sessione

- **Sessione attiva**: 2 ore di inattività
- **Auto-logout**: dopo 2 ore senza interazione
- **Refresh automatico**: token aggiornato ogni 15 minuti

#### Two-Factor Authentication (2FA)

**Quando usarlo:**
- Obbligatorio per: Amministratori, Titolari Studio
- Consigliato per: Avvocati, Segreteria
- Opzionale per: Collaboratori, Clienti

**Come abilitare:**
1. **Impostazioni** → **Sicurezza**
2. Attiva **Two-Factor Authentication**
3. Scegli canale: **Email** o **SMS**
4. Salva

**Flusso login con 2FA:**
```
1. Inserisci email + password
2. Sistema invia codice a 6 cifre via Email/SMS
3. Inserisci codice entro 5 minuti
4. Accesso concesso
```

#### Gestione Password

**Requisiti password:**
- Minimo 6 caratteri (consigliato: 12+)
- Consigliato: mix maiuscole, minuscole, numeri, simboli

**Cambio password:**
1. **Impostazioni** → **Sicurezza** → **Cambia Password**
2. Inserisci password attuale
3. Inserisci nuova password (2 volte)
4. Salva

**Password dimenticata:**
1. Login page → **Password Dimenticata?**
2. Inserisci email
3. Ricevi email con link reset (valido 1 ora)
4. Clicca link, inserisci nuova password
5. Conferma

---

## 4. Guida per Ruolo

### 4.1 Guida per Amministratore

#### Dashboard Admin

**Accesso:** Menu → **Admin** → **Dashboard**

**Panoramica:**
- 📊 Statistiche globali: studi, utenti, pratiche
- 📈 Grafici trend mensili
- ⚠️ Alert sistema (spazio disco, errori)
- 🔄 Stato backup (ultimo backup, prossimo scheduled)

#### Gestione Studi

**Accesso:** Admin → **Studi**

**Operazioni:**

1. **Creare Nuovo Studio**
   ```
   1. Click "Nuovo Studio"
   2. Compila form:
      - Nome studio (richiesto)
      - Ragione sociale
      - P.IVA / CF
      - Indirizzo completo
      - Email, PEC, Telefono
   3. Salva
   ```

2. **Modificare Studio**
   - Click azione "Modifica" su studio
   - Aggiorna campi
   - Salva

3. **Disattivare Studio**
   - Click azione "Disattiva"
   - Conferma
   - ⚠️ **ATTENZIONE**: Disattiva anche tutti gli utenti dello studio

4. **Visualizzare Dettagli Studio**
   - Click sul nome studio
   - Vedi: utenti, pratiche, statistiche

#### Gestione Utenti Globale

**Accesso:** Admin → **Utenti**

**Operazioni:**

1. **Creare Utente**
   ```
   1. Click "Nuovo Utente"
   2. Compila:
      - Email (unique)
      - Nome e Cognome
      - Ruolo: admin | titolare_studio | avvocato | collaboratore | segreteria | cliente
      - Studio di appartenenza (se non admin)
      - Cliente associato (se ruolo = cliente)
      - Password temporanea
   3. Salva
   4. Sistema invia email con credenziali
   ```

2. **Modificare Utente**
   - Cambio ruolo
   - Assegnazione studio diverso
   - Attivazione/Disattivazione account

3. **Reset Password Utente**
   - Click "Reset Password"
   - Sistema invia email con link reset

4. **Logout Forzato**
   - Click "Logout Utente"
   - Incrementa tokenVersion (invalida tutti i token)

#### Backup e Restore

**Accesso:** Admin → **Backup**

**Dashboard Backup:**
- 📊 Statistiche: conteggio backup, spazio occupato
- 📅 Ultimo backup: data/ora
- 🕒 Prossimo backup schedulato: in X ore

**Operazioni:**

1. **Creare Backup Manuale**
   ```
   1. Click "Crea Backup"
   2. Conferma creazione
   3. Sistema:
      - Crea dump SQL del database
      - Salva in /backups/backup-YYYY-MM-DD.sql
      - Mostra notifica successo con dimensione file
   4. Tempo: 10-60 secondi (dipende da dati)
   ```

2. **Download Backup**
   ```
   1. Lista backup → Click "Download" su backup desiderato
   2. Browser scarica file .sql
   3. Usa per:
      - Backup esterno (S3, Google Drive)
      - Migrazione server
      - Disaster recovery
   ```

3. **Ripristinare Backup**
   ```
   ⚠️ OPERAZIONE CRITICA - SOVRASCRIVE TUTTI I DATI

   1. Click "Ripristina" su backup
   2. Conferma DOPPIA (modale warning)
   3. Sistema:
      - Disconnette tutti gli utenti
      - Esegue DROP + CREATE database
      - Importa dump SQL
      - Riavvia connessioni
   4. Tempo: 1-5 minuti
   5. Tutti gli utenti devono rifare login
   ```

4. **Cancellare Backup**
   - Click "Elimina"
   - Conferma
   - File .sql rimosso dal server

**Configurazione Backup Automatico:**

Nel file `.env`:
```bash
BACKUP_SCHEDULE_INTERVAL=86400000  # 24 ore (in millisecondi)
BACKUP_MAX_COUNT=30                # Mantieni ultimi 30 backup
```

**Best Practice:**
- ✅ Backup giornaliero automatico abilitato
- ✅ Download settimanale su storage esterno (S3, Dropbox)
- ✅ Test restore mensile su ambiente test
- ✅ Retention: 30 giorni (automatico)

#### Export Dati

**Accesso:** Admin → **Export Dati**

**Entità esportabili:**
- Pratiche
- Clienti
- Debitori
- Utenti
- Avvocati
- Movimenti Finanziari

**Formati disponibili:**
- **CSV** (Excel-compatible)
- **JSON** (programmazione)
- **XLSX** (Excel nativo)

**Processo Export:**
```
1. Seleziona entità (es: Pratiche)
2. Seleziona formato (es: CSV)
3. (Opzionale) Filtri:
   - Studio specifico
   - Range date
4. Click "Esporta"
5. Download automatico file
```

**Esempio CSV Pratiche:**
```csv
id,numeroPratica,clienteId,debitoreId,capitale,faseId,aperta
uuid-1,001/2024,cliente-1,debitore-1,50000.00,fase-affidamento,true
uuid-2,002/2024,cliente-2,debitore-2,30000.00,fase-chiusa,false
```

#### Import Dati

**Accesso:** Admin → **Import Dati**

**Modalità:**

1. **Import CSV**
   ```
   ⚠️ Validazione rigorosa: errori bloccano import

   1. Seleziona entità (Pratiche, Clienti, etc)
   2. Upload file CSV
   3. Sistema valida:
      - Header colonne corretto
      - Tipi dati (date, numeri, etc)
      - Foreign keys esistenti (clienteId, debitoreId)
   4. Se valido: import batch
   5. Se errori: mostra lista errori dettagliata
   ```

2. **Import Backup JSON**
   ```
   ⚠️ SOVRASCRIVE STUDIO COMPLETO

   1. Upload file JSON (generato da Export)
   2. Conferma studio destinazione
   3. Sistema importa tutte le entità collegate
   ```

**Template CSV:**
- Download template vuoto da interfaccia
- Compila su Excel
- Upload

#### Audit Log

**Accesso:** Admin → **Audit Log**

**Cosa viene tracciato:**
- 🔐 **LOGIN** / **LOGOUT**
- ➕ **CREATE** (pratiche, clienti, etc)
- ✏️ **UPDATE** (modifiche)
- 🗑️ **DELETE** (eliminazioni)
- 🔄 **CAMBIO_FASE** (pratiche)
- 📦 **BACKUP** / **RESTORE**
- 📤 **EXPORT** / 📥 **IMPORT**

**Filtri disponibili:**
- Utente (chi ha fatto l'azione)
- Tipo azione (CREATE, UPDATE, etc)
- Entità (Pratica, Cliente, etc)
- Range date
- Studio

**Informazioni per log:**
```json
{
  "id": "uuid",
  "userId": "uuid-utente",
  "userName": "Mario Rossi",
  "studioId": "uuid-studio",
  "action": "CREATE",
  "entityType": "Pratica",
  "entityId": "uuid-pratica",
  "description": "Creata pratica 003/2024",
  "metadata": {
    "clienteId": "uuid-cliente",
    "capitale": 50000
  },
  "ipAddress": "192.168.1.100",
  "timestamp": "2024-12-29T10:30:00.000Z"
}
```

**Utilizzo:**
- 🔍 Investigare modifiche sospette
- 📊 Report attività mensili
- 🛡️ Compliance GDPR/audit
- ⚠️ Debugging errori utenti

#### Maintenance

**Accesso:** Admin → **Maintenance**

**Funzioni:**

1. **Orphan Data Cleanup**
   ```
   Trova e gestisce dati "orfani" (senza relazioni valide):

   - Pratiche senza cliente
   - Pratiche senza debitore
   - Pratiche senza studio
   - Utenti senza studio
   - Documenti senza pratica

   Azioni:
   - Visualizza conteggio
   - Assegna manualmente a studio/cliente
   - Elimina definitivamente (irreversibile)
   ```

2. **Riconciliazione Database**
   ```
   - Ricalcola totali (importi recuperati, pratiche per cliente)
   - Ricostruisce indici full-text
   - Valida foreign keys
   ```

3. **Cache Invalidation**
   ```
   - Svuota cache Redis
   - Forza refresh dashboard
   ```

---

### 4.2 Guida per Titolare Studio

#### Dashboard Studio

**Accesso:** Dashboard (home)

**Widgets:**

1. **KPI Principali**
   - 📁 Pratiche Aperte: conteggio
   - ✅ Pratiche Chiuse (mese corrente)
   - 💰 Capitale in Recupero: €
   - 💵 Capitale Recuperato: €
   - 📊 Tasso Successo: %

2. **Grafici**
   - Trend pratiche aperte/chiuse (ultimi 6 mesi)
   - Pratiche per fase (torta)
   - Recuperi mensili (barre)

3. **Pratiche Recenti**
   - Ultime 10 pratiche create
   - Link veloce a dettaglio

4. **Scadenze Prossime**
   - Pratiche con dataScadenza nei prossimi 30 giorni
   - Alert evidenziati in rosso

#### Creazione Pratica

**Accesso:** Pratiche → **Nuova Pratica**

**Form Creazione:**

```
┌─────────────────────────────────────────┐
│  NUOVA PRATICA                          │
├─────────────────────────────────────────┤
│  1. DATI PRINCIPALI                     │
│     Cliente: [Select]   [+ Nuovo]      │
│     Debitore: [Select]  [+ Nuovo]      │
│     Fase Iniziale: [Affidamento ▾]     │
│                                         │
│  2. TEAM ASSEGNATO                      │
│     Avvocati: [Multi-select]           │
│     Collaboratori: [Multi-select]      │
│                                         │
│  3. IMPORTI INIZIALI                    │
│     Capitale: € [___]                  │
│     Anticipazioni: € [___]             │
│     Compensi Legali: € [___]           │
│                                         │
│  4. DATE E SCADENZE                     │
│     Data Affidamento: [____]           │
│     Data Scadenza: [____]              │
│                                         │
│  5. NOTE                                │
│     [Textarea]                         │
│                                         │
│  [Annulla]  [Salva Pratica]            │
└─────────────────────────────────────────┘
```

**Workflow:**

1. **Seleziona Cliente**
   - Se esiste: scegli da dropdown
   - Se nuovo: click "+ Nuovo Cliente"
     - Si apre modale
     - Compila dati cliente (vedi sezione Clienti)
     - Salva
     - Ritorna automaticamente al form pratica

2. **Seleziona Debitore**
   - Stesso flusso del cliente
   - Sistema suggerisce debitori già collegati al cliente (se esistono)

3. **Assegna Team**
   - **Avvocati**: multi-select
     - Seleziona 1+ avvocati che seguiranno la pratica
     - Ricevono notifiche cambio fase
   - **Collaboratori**: multi-select
     - Team di supporto
     - Accesso visualizzazione pratica

4. **Inserisci Importi**
   - **Capitale**: importo da recuperare dal debitore
   - **Anticipazioni**: spese anticipate dallo studio
   - **Compensi Legali**: onorari previsti

5. **Date**
   - **Data Affidamento**: quando il cliente ha affidato la pratica
   - **Data Scadenza**: deadline recupero (opzionale)

6. **Salva**
   - Sistema genera automaticamente **numeroPratica** (es: 001/2024)
   - Pratica inizia in fase "Affidamento" (configurabile)
   - Avvocati ricevono notifica email

#### Gestione Team Studio

**Accesso:** Admin Studio (sidebar) → **Team**

**Operazioni:**

1. **Invitare Nuovo Membro**
   ```
   1. Click "Invita Utente"
   2. Compila:
      - Email
      - Nome, Cognome
      - Ruolo: avvocato | collaboratore | segreteria
      - (Studio auto-assegnato)
   3. Salva
   4. Sistema invia email con credenziali
   ```

2. **Modificare Ruolo**
   ```
   Es: Collaboratore → Avvocato

   1. Click "Modifica" su utente
   2. Cambia ruolo
   3. Salva
   4. Utente riceve nuovi permessi al prossimo login
   ```

3. **Disattivare Utente**
   ```
   ⚠️ Utente non può più accedere
   ✅ Pratiche assegnate rimangono visibili

   1. Click "Disattiva"
   2. Conferma
   3. Utente riceve email notifica
   ```

#### Monitoraggio Finanziario

**Accesso:** Dashboard → **Report Finanziari**

**Report Disponibili:**

1. **Capitale per Fase**
   ```
   Fase                | Totale Capitale | Recuperato | %
   --------------------|-----------------|------------|----
   Affidamento         | € 100.000       | € 0        | 0%
   Sollecito Bonario   | € 250.000       | € 50.000   | 20%
   Azione Legale       | € 500.000       | € 200.000  | 40%
   Chiusa Positivo     | € 800.000       | € 750.000  | 94%
   ```

2. **Recuperi Mensili**
   - Grafico a barre: capitale recuperato per mese
   - Trend: confronto anno precedente

3. **Pratiche per Avvocato**
   ```
   Avvocato       | Pratiche | Capitale | Recuperato | Tasso
   ---------------|----------|----------|------------|-------
   Mario Rossi    | 25       | €500k    | €400k      | 80%
   Laura Bianchi  | 18       | €300k    | €180k      | 60%
   ```

#### Configurazione Condivisione Cliente

**Accesso:** Clienti → Dettaglio Cliente → **Condivisione Dashboard**

**Opzioni:**

```json
{
  "abilitata": true,
  "dashboard": {
    "stats": true,          // Mostra statistiche aggregate
    "kpi": true             // Mostra KPI (capitale, recuperato)
  },
  "pratiche": {
    "elenco": true,         // Lista pratiche
    "dettagli": true,       // Dettaglio singola pratica
    "documenti": false,     // Allegati pratica
    "timeline": true        // Storico fasi
  }
}
```

**Esempio configurazione:**
```
Cliente: ACME SRL
✅ Dashboard abilitata
✅ Mostra statistiche
✅ Elenco pratiche
✅ Timeline fasi
❌ Documenti nascosti
```

Il cliente vedrà:
- `/dashboard-condivisa`: KPI sue pratiche
- Elenco pratiche dove è creditore
- Timeline fasi per ogni pratica
- NO documenti allegati

---

### 4.3 Guida per Avvocato

#### Visualizzare Pratiche Assegnate

**Accesso:** Pratiche

**Filtri automatici:**
- Solo pratiche dove sei assegnato come avvocato
- Default: solo pratiche APERTE
- Ordinamento: dataAffidamento DESC

**Vista Elenco:**
```
┌──────────────────────────────────────────────────────────┐
│  PRATICHE ASSEGNATE (12)           [+ Nuova] [Filtri ▾] │
├──────────────────────────────────────────────────────────┤
│  N. Pratica  | Cliente      | Debitore   | Fase    | €  │
│  003/2024    | ACME SRL     | Mario R.   | Sollic. | 50k│
│  002/2024    | Beta SpA     | Laura B.   | Azione  | 30k│
│  001/2024    | Gamma SNC    | Paolo V.   | Chiusa  | 20k│
└──────────────────────────────────────────────────────────┘
```

**Filtri Avanzati:**
- Cliente
- Debitore
- Fase
- Range date (affidamento, scadenza)
- Importo (min-max)
- Aperta/Chiusa

#### Gestire Fase Pratica

**Accesso:** Dettaglio Pratica → **Cambia Fase**

**Flusso Cambio Fase:**

```
1. Visualizza pratica corrente
   Fase attuale: Sollecito Bonario

2. Click "Cambia Fase"
   Modale:
   ┌────────────────────────────────┐
   │  CAMBIO FASE                  │
   ├────────────────────────────────┤
   │  Fase Corrente:               │
   │  📌 Sollecito Bonario         │
   │                                │
   │  Nuova Fase:                  │
   │  [Select] ▾                   │
   │    - Affidamento              │
   │    - Sollecito Bonario        │
   │    ✓ Azione Legale            │
   │    - Opposizione              │
   │    - Pignoramento             │
   │    - Chiusa                   │
   │                                │
   │  Note (opzionale):            │
   │  [Textarea]                   │
   │                                │
   │  [Annulla]  [Conferma]        │
   └────────────────────────────────┘

3. Seleziona nuova fase: Azione Legale
4. Inserisci note: "Depositato ricorso Tribunale Roma"
5. Conferma

6. Sistema:
   - Aggiorna pratica.faseId = azione-legale
   - Aggiunge entry in storico:
     {
       daFase: "sollecito-bonario",
       aFase: "azione-legale",
       data: "2024-12-29T10:00:00Z",
       utenteId: "avvocato-id",
       note: "Depositato ricorso..."
     }
   - Notifica collaboratori assegnati
   - Notifica cliente (se configurato)
```

**Fasi Speciali:**

1. **Chiusura Pratica (Fase: Chiusa)**
   ```
   ⚠️ Richiede esito obbligatorio

   Modale aggiuntiva:
   Esito: [Positivo ▾] [Negativo ▾]

   Positivo: recupero riuscito
   Negativo: fallimento recupero (debitore insolvente, etc)

   Sistema:
   - pratica.aperta = false
   - pratica.esito = 'positivo'/'negativo'
   - pratica.dataChiusura = NOW()
   ```

2. **Opposizione**
   ```
   Se fase = "Opposizione":

   Campi aggiuntivi:
   - Data Opposizione
   - Tipo Opposizione
   - Tribunale
   - Note

   Salvato in: pratica.opposizione (JSON)
   ```

3. **Pignoramento**
   ```
   Se fase = "Pignoramento":

   Campi aggiuntivi:
   - Tipo Pignoramento (mobiliare/immobiliare/presso terzi)
   - Data Pignoramento
   - Ufficiale Giudiziario
   - Note

   Salvato in: pratica.pignoramento (JSON)
   ```

#### Registrare Movimenti Finanziari

**Accesso:** Dettaglio Pratica → Tab **Movimenti Finanziari**

**Tipi Movimento:**
- 💰 **Recupero Capitale**
- 💵 **Recupero Anticipazioni**
- ⚖️ **Liquidazione Compensi**
- 📊 **Recupero Interessi**

**Form Nuovo Movimento:**

```
┌───────────────────────────────────────┐
│  NUOVO MOVIMENTO FINANZIARIO          │
├───────────────────────────────────────┤
│  Tipo: [Recupero Capitale ▾]         │
│  Importo: € [_____]                  │
│  Data: [29/12/2024]                  │
│  Causale: [_________________]        │
│  Note: [Textarea]                    │
│                                       │
│  [Annulla]  [Salva]                  │
└───────────────────────────────────────┘
```

**Processo:**
```
1. Click "+ Nuovo Movimento"
2. Seleziona tipo: Recupero Capitale
3. Inserisci importo: € 10.000
4. Data: oggi (default)
5. Causale: "Bonifico debitore RID 12345"
6. Salva

Sistema aggiorna pratica:
- pratica.importoRecuperatoCapitale += 10.000
- Crea record MovimentoFinanziario
- Notifica titolare studio
- Aggiorna dashboard KPI
```

**Visualizzazione Movimenti:**
```
Data       | Tipo                  | Importo    | Causale
-----------|-----------------------|------------|---------
29/12/2024 | Recupero Capitale     | € 10.000   | Bonifico
15/12/2024 | Recupero Anticipazioni| €    500   | Rimborso spese
01/12/2024 | Liquidazione Compensi | €  2.000   | Fattura #123

TOTALI:
Capitale Recuperato: € 10.000 / € 50.000 (20%)
Anticipazioni Recuperate: € 500 / € 1.000 (50%)
Compensi Liquidati: € 2.000 / € 5.000 (40%)
```

#### Timeline Pratica

**Accesso:** Dettaglio Pratica → Tab **Timeline**

**Visualizzazione Cronologica:**

```
🔵 29/12/2024 - 10:30
   Cambiata fase: Sollecito Bonario → Azione Legale
   Utente: Mario Rossi (Avvocato)
   Note: Depositato ricorso Tribunale Roma

💰 29/12/2024 - 09:15
   Movimento Finanziario: Recupero Capitale
   Importo: € 10.000
   Utente: Mario Rossi

🔵 15/12/2024 - 14:20
   Cambiata fase: Affidamento → Sollecito Bonario
   Utente: Laura Bianchi (Segreteria)
   Note: Inviata raccomandata AR

📝 01/12/2024 - 11:00
   Pratica creata
   Utente: Studio Legale Rossi
   Numero: 003/2024
```

**Legenda Icone:**
- 🔵 Cambio fase
- 💰 Movimento finanziario
- 📎 Documento caricato
- 👥 Assegnazione team
- 📝 Nota aggiunta

---

### 4.4 Guida per Segreteria

#### Ruolo e Responsabilità

**Cosa PUOI fare:**
- ✅ Creare nuove pratiche
- ✅ Creare clienti e debitori
- ✅ **Assegnare/Riassegnare** avvocati alle pratiche
- ✅ **Assegnare/Riassegnare** collaboratori alle pratiche
- ✅ Visualizzare tutte le pratiche dello studio
- ✅ Creare alert e promemoria

**Cosa NON puoi fare:**
- ❌ **Cambiare fasi** pratiche
- ❌ **Modificare dati finanziari** (importi, movimenti)
- ❌ Modificare altri campi pratiche (solo assegnazioni)

#### Assegnare Avvocato a Pratica

**Scenario:** Un nuovo avvocato entra nello studio e deve prendere in carico pratiche esistenti

**Processo:**

```
1. Vai su Pratiche
2. Click su pratica da riassegnare (es: 003/2024)
3. Tab "Dettagli"
4. Sezione "Team Assegnato"

   Avvocati Attuali:
   🧑‍⚖️ Mario Rossi

   [+ Aggiungi Avvocato]  [✏️ Modifica]

5. Click "✏️ Modifica"
   Modal:
   ┌────────────────────────────────┐
   │  MODIFICA AVVOCATI ASSEGNATI  │
   ├────────────────────────────────┤
   │  Avvocati:                    │
   │  [x] Mario Rossi              │
   │  [x] Laura Bianchi  ← NUOVO   │
   │  [ ] Paolo Verdi              │
   │                                │
   │  [Annulla]  [Salva]           │
   └────────────────────────────────┘

6. Seleziona Laura Bianchi
7. Salva

Sistema:
- Aggiunge relazione pratica-avvocato
- Laura Bianchi riceve notifica email
- Laura vede pratica in "Pratiche Assegnate"
```

**Rimozione Avvocato:**
```
Stesso processo, deseleziona avvocato da rimuovere
⚠️ Avvocato rimosso non vede più la pratica
```

#### Gestire Collaboratori

**Assegnazione Collaboratori:**

Stesso flusso degli avvocati, sezione "Collaboratori Assegnati"

**Differenza Avvocato vs Collaboratore:**
- **Avvocato**: può modificare pratica e cambiare fasi
- **Collaboratore**: solo visualizzazione

#### Creare Alert/Promemoria

**Accesso:** Alert → **Nuovo Alert**

**Tipi Alert:**
- 📅 **Scadenza**: promemoria data scadenza pratica
- 📞 **Sollecito**: chiamare cliente/debitore
- 📝 **Documento**: caricare documento mancante
- ⚠️ **Urgente**: azione urgente richiesta

**Form:**
```
┌─────────────────────────────────────┐
│  NUOVO ALERT                        │
├─────────────────────────────────────┤
│  Tipo: [Scadenza ▾]                │
│  Pratica: [003/2024 ▾]             │
│  Data Scadenza: [31/12/2024]       │
│  Descrizione:                       │
│  [Scade termine opposizione]       │
│                                     │
│  Notifica a:                        │
│  [x] Me stessa                     │
│  [x] Avvocato assegnato            │
│  [ ] Titolare studio               │
│                                     │
│  [Annulla]  [Crea Alert]           │
└─────────────────────────────────────┘
```

**Notifiche:**
- Email 7 giorni prima
- Email 1 giorno prima
- Notifica in-app (campanella)

---

### 4.5 Guida per Collaboratore

#### Accesso Limitato

**Permessi:**
- ✅ **Visualizzare** pratiche dello studio
- ✅ **Leggere** documenti
- ✅ **Creare** alert/promemoria per sé
- ✅ **Visualizzare** dashboard studio
- ❌ **NO modifica** pratiche, clienti, debitori
- ❌ **NO cambio** fasi
- ❌ **NO creazione** pratiche

#### Visualizzazione Pratiche

**Accesso:** Pratiche

**Vista Read-Only:**
- Elenco pratiche dello studio
- Dettaglio pratica completo
- Timeline fasi
- Movimenti finanziari
- Documenti

**Nessun pulsante di modifica visibile**

#### Alert Personali

**Accesso:** Alert → **Nuovo Alert**

**Utilizzo:**
- Creare promemoria personali
- Es: "Richiamare cliente per aggiornamento pratica 003/2024"
- Alert visibili solo a te

---

### 4.6 Guida per Cliente

#### Dashboard Condivisa

**Accesso Automatico:** Dopo login, redirect a `/dashboard-condivisa`

**Contenuto (se abilitato dallo studio):**

```
┌──────────────────────────────────────────────────────┐
│  DASHBOARD CONDIVISA - ACME SRL                      │
├──────────────────────────────────────────────────────┤
│  STATISTICHE PRATICHE                                │
│  ┌───────────┬───────────┬───────────┬──────────┐   │
│  │ Aperte    │ Chiuse    │ Capitale  │ Recupero │   │
│  │   12      │    8      │  €500.000 │ €320.000 │   │
│  └───────────┴───────────┴───────────┴──────────┘   │
│                                                       │
│  PRATICHE                           [Filtra ▾]       │
│  ┌──────────────────────────────────────────────┐   │
│  │ N.      | Debitore   | Fase       | Importo │   │
│  │ 003/2024| Mario R.   | Azione Leg.| €50.000 │   │
│  │ 002/2024| Laura B.   | Chiusa ✅  | €30.000 │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  GRAFICI                                             │
│  [Grafico a Torta: Pratiche per Fase]               │
│  [Grafico Barre: Recuperi Mensili]                  │
└──────────────────────────────────────────────────────┘
```

**Cosa vedi:**
- ✅ Solo pratiche dove sei creditore (clienteId match)
- ✅ Statistiche aggregate tue pratiche
- ✅ Timeline fasi
- ✅ Importi (se abilitato)
- ❌ NO nomi avvocati (privacy)
- ❌ NO documenti interni studio
- ❌ NO movimenti finanziari dettagliati

#### Dettaglio Pratica Cliente

**Accesso:** Dashboard Condivisa → Click pratica

**Vista Ridotta:**
```
┌─────────────────────────────────────────┐
│  PRATICA 003/2024                       │
├─────────────────────────────────────────┤
│  Debitore: Mario Rossi                  │
│  Fase Attuale: Azione Legale            │
│  Data Affidamento: 01/12/2024           │
│  Importo: € 50.000                      │
│                                         │
│  TIMELINE                               │
│  🔵 29/12 - Azione Legale               │
│  🔵 15/12 - Sollecito Bonario           │
│  🔵 01/12 - Affidamento                 │
│                                         │
│  [← Torna alla Dashboard]              │
└─────────────────────────────────────────┘
```

**Cosa NON vedi:**
- Dati avvocato/collaboratori
- Movimenti finanziari dettagliati
- Documenti interni
- Note riservate

---

## 5. Gestione Pratiche

### 5.1 Ciclo di Vita Pratica

**Fasi Standard:**

```
1. Affidamento
   ↓
2. Sollecito Bonario (lettera AR, telefonate)
   ↓
3. Azione Legale (ricorso giudiziale)
   ↓ (opzionale)
4. Opposizione
   ↓ (opzionale)
5. Pignoramento
   ↓
6. Chiusa (ESITO: Positivo / Negativo)
```

**Stati Pratica:**
- **Aperta** (`aperta: true`): pratica in corso
- **Chiusa Positiva** (`aperta: false, esito: 'positivo'`): recupero riuscito
- **Chiusa Negativa** (`aperta: false, esito: 'negativo'`): recupero fallito
- **Disattivata** (`attivo: false`): pratica archiviata/cancellata (soft delete)

### 5.2 Campi Pratica Dettaglio

**Dati Identificativi:**
- **Numero Pratica**: generato auto (es: 001/2024, 002/2024...)
- **Cliente**: creditore che affida il recupero
- **Debitore**: soggetto debitore da cui recuperare
- **Studio**: studio legale proprietario

**Importi:**
- **Capitale**: somma da recuperare
- **Capitale Recuperato**: quanto già recuperato
- **Anticipazioni**: spese anticipate dallo studio
- **Anticipazioni Recuperate**: rimborsi ricevuti
- **Compensi Legali**: onorari maturati
- **Compensi Liquidati**: onorari già pagati
- **Interessi**: interessi di mora
- **Interessi Recuperati**: interessi già incassati

**Calcoli Automatici:**
```javascript
Saldo Capitale = Capitale - Capitale Recuperato
Saldo Anticipazioni = Anticipazioni - Anticipazioni Recuperate
Saldo Compensi = Compensi Legali - Compensi Liquidati
Totale da Recuperare = Saldo Capitale + Saldo Anticipazioni + Interessi
```

**Team:**
- **Avvocati**: professionisti assegnati (M2M)
- **Collaboratori**: team di supporto (M2M)

**Date:**
- **Data Affidamento**: quando il cliente ha affidato
- **Data Scadenza**: deadline (opzionale)
- **Data Chiusura**: quando è stata chiusa (auto-compilata)

**Metadati:**
- **Note**: campo libero per annotazioni
- **Storico Fasi**: JSON con history di tutti i cambi fase

### 5.3 Operazioni su Pratiche

#### Creare Pratica
- **Chi**: Admin, Titolare, Segreteria
- **Dove**: Pratiche → Nuova Pratica
- **Validazioni**: cliente e debitore obbligatori

#### Modificare Pratica
- **Chi**: Admin, Titolare, Avvocato (solo assegnate)
- **Dove**: Dettaglio Pratica → Modifica
- **Segreteria**: SOLO avvocati/collaboratori assegnati

#### Cambiare Fase
- **Chi**: Admin, Titolare, Avvocato
- **Dove**: Dettaglio Pratica → Cambia Fase
- **Tracciamento**: ogni cambio salvato in storico

#### Chiudere Pratica
- **Chi**: Admin, Titolare, Avvocato
- **Processo**: Cambia Fase → "Chiusa" → Seleziona Esito (Positivo/Negativo)
- **Effetto**: `aperta = false`, `dataChiusura = NOW()`

#### Cancellare Pratica
- **Chi**: Admin, Titolare
- **Tipo**: Soft Delete (`attivo = false`)
- **Effetto**: pratica nascosta da elenchi, dati conservati

#### Ripristinare Pratica
- **Chi**: Admin, Titolare
- **Dove**: Pratiche → Filtro "Mostra Disattivate" → Ripristina
- **Effetto**: `attivo = true`

### 5.4 Filtri e Ricerca

**Filtri Disponibili:**
- **Cliente**: dropdown con autocomplete
- **Debitore**: dropdown con autocomplete
- **Fase**: multi-select (Affidamento, Sollecito, etc)
- **Stato**: Aperte / Chiuse / Tutte
- **Avvocato Assegnato**: dropdown
- **Range Date Affidamento**: da - a
- **Range Importo Capitale**: min - max
- **Studio**: (solo admin) multi-select

**Ricerca Testuale:**
```
Cerca in: numeroPratica, cliente.ragioneSociale, debitore.cognome

Esempio: "003" → trova pratiche con numero contenente "003"
Esempio: "ACME" → trova pratiche con cliente "ACME SRL"
```

**Ordinamento:**
- Data Affidamento (DESC default)
- Numero Pratica
- Capitale
- Fase

### 5.5 Export Pratiche

**Accesso:** Pratiche → **Export**

**Formati:**
- CSV (Excel-compatible)
- XLSX (Excel nativo)
- JSON (programmazione)

**Campi Esportati:**
```csv
numeroPratica,cliente,debitore,fase,capitale,recuperato,aperta,dataAffidamento
001/2024,"ACME SRL","Mario Rossi",Azione Legale,50000,10000,true,2024-12-01
```

**Utilizzo:**
- Report mensili per cliente
- Analisi dati su Excel/Power BI
- Import in altri sistemi

---

## 6. Gestione Clienti e Debitori

### 6.1 Clienti (Creditori)

#### Creare Cliente

**Accesso:** Clienti → **Nuovo Cliente**

**Form:**
```
ANAGRAFICA
  Ragione Sociale: [__________]  (richiesto)
  Tipologia: [SRL ▾]
    - SRL
    - SPA
    - SRLS
    - SNC
    - SAS
    - Ditta Individuale
    - Professionista
    - Ente Pubblico
    - Altro

CODICI FISCALI
  Codice Fiscale: [__________]
  Partita IVA: [__________]

CONTATTI
  Email: [__________]
  PEC: [__________]
  Telefono: [__________]

REFERENTE
  Nome Referente: [__________]
  Email Referente: [__________]

INDIRIZZI
  Sede Legale: [__________]
  Sede Operativa: [__________]
  CAP: [_____]
  Città: [__________]
  Provincia: [__]

CONDIVISIONE DASHBOARD
  ✅ Abilita dashboard condivisa
  Configurazione:
    [x] Statistiche
    [x] Elenco Pratiche
    [ ] Documenti
    [x] Timeline Fasi

[Annulla]  [Salva Cliente]
```

**Validazioni:**
- Ragione Sociale obbligatoria
- Email formato valido
- P.IVA formato valido (opzionale)

#### Modificare Cliente

**Accesso:** Clienti → Click cliente → Modifica

**Campi Modificabili:**
- Tutti i campi anagrafica
- Configurazione condivisione dashboard

**Effetto Modifica:**
- Pratiche collegate aggiornano automaticamente relazione
- Se cambi email: utente cliente deve rifare login con nuova email

#### Collegare Cliente a Debitore

**Scenario:** Un cliente ha più debitori ricorrenti

**Accesso:** Clienti → Dettaglio Cliente → **Debitori Collegati**

**Processo:**
```
1. Tab "Debitori"
2. Click "+ Collega Debitore"
3. Seleziona debitore esistente
4. Salva

Sistema crea relazione ClienteDebitore (M2M)

Benefici:
- Quando crei pratica per questo cliente, sistema suggerisce debitori collegati
- Report: pratiche per combinazione Cliente-Debitore
```

#### Disattivare Cliente

**Effetto:**
- Cliente non visibile in elenchi
- Pratiche collegate rimangono attive
- Utente cliente NON può più accedere

### 6.2 Debitori

#### Tipologie Debitore

**Persona Fisica:**
```
Nome: Mario
Cognome: Rossi
Codice Fiscale: RSSMRA80A01H501Z
Data Nascita: 01/01/1980
Luogo Nascita: Roma
```

**Persona Giuridica:**
```
Ragione Sociale: Beta SpA
Partita IVA: 12345678901
Tipologia: SPA
Sede Legale: Via Roma 1, Roma
```

#### Creare Debitore

**Accesso:** Debitori → **Nuovo Debitore**

**Form:**
```
TIPO SOGGETTO
  ⚪ Persona Fisica  ⚪ Persona Giuridica

[SE PERSONA FISICA]
  Nome: [__________]
  Cognome: [__________]
  Codice Fiscale: [__________]
  Data Nascita: [__/__/____]
  Luogo Nascita: [__________]

[SE PERSONA GIURIDICA]
  Ragione Sociale: [__________]
  Partita IVA: [__________]
  Tipologia: [SRL ▾]
  Sede Legale: [__________]

CONTATTI (COMUNI)
  Email: [__________]
  Telefono: [__________]
  PEC: [__________]

[Annulla]  [Salva Debitore]
```

#### Ricerca Debitore

**Filtri:**
- Tipo Soggetto (Fisica/Giuridica)
- Cognome/Ragione Sociale (autocomplete)
- Codice Fiscale
- Partita IVA
- Studio (solo admin)

**Ricerca Avanzata:**
```
Cerca debitori collegati a cliente specifico:

1. Clienti → Dettaglio Cliente → Tab "Debitori"
2. Vedi lista debitori collegati
3. Utile per creare nuove pratiche
```

### 6.3 Avvocati

#### Differenza Utente Avvocato vs Avvocato

**Utente con Ruolo Avvocato:**
- Ha credenziali login
- Può accedere all'applicazione
- Vede pratiche assegnate
- Può cambiare fasi

**Avvocato (Anagrafica):**
- Professionista esterno/interno
- Non necessariamente ha account utente
- Può essere assegnato alle pratiche
- Anagrafica separata per tracking

#### Creare Avvocato

**Accesso:** Avvocati → **Nuovo Avvocato**

**Form:**
```
ANAGRAFICA
  Nome: [__________]
  Cognome: [__________]
  Codice Fiscale: [__________]

CONTATTI
  Email: [__________]
  Telefono: [__________]
  PEC: [__________]

PROFESSIONALE
  Numero Iscrizione Albo: [__________]
  Ordine: [Roma ▾]

INDIRIZZO
  Indirizzo Studio: [__________]
  CAP: [_____]
  Città: [__________]

[Annulla]  [Salva Avvocato]
```

#### Collegare Avvocato a Utente

**Scenario:** Avvocato esterno diventa dipendente dello studio

**Processo:**
```
1. Crea Utente (ruolo: avvocato)
2. Collega a anagrafica Avvocato esistente (opzionale)
```

**Utilizzo:**
- Se collegato: pratiche assegnate a utente appaiono in "Pratiche Avvocato X"
- Se non collegato: tracking separato

---

## 7. Documenti e Alert

### 7.1 Gestione Documenti

#### Upload Documento

**Accesso:** Dettaglio Pratica → Tab **Documenti** → **Carica Documento**

**Form:**
```
UPLOAD DOCUMENTO
  File: [Sfoglia...] (max 10MB)
    Formati supportati: PDF, DOC, DOCX, JPG, PNG, XLSX

  Categoria: [Contratto ▾]
    - Contratto
    - Fattura
    - Raccomandata AR
    - Sentenza
    - Atto Giudiziario
    - Corrispondenza
    - Altro

  Descrizione: [__________]

  Visibilità:
    [x] Interno Studio
    [ ] Condiviso con Cliente

[Annulla]  [Carica]
```

**Processo:**
```
1. Seleziona file locale
2. Scegli categoria
3. Descrizione (opzionale)
4. Se "Condiviso con Cliente": cliente vede documento in dashboard
5. Upload

Sistema:
- Salva file in /uploads/documents/
- Crea record Documento collegato a pratica
- Notifica team assegnato
```

**Limiti:**
- Dimensione max: 10MB per file
- Formati: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
- Storage: dipende da server (default: locale)

#### Download Documento

**Accesso:** Dettaglio Pratica → Tab Documenti → Click documento

**Processo:**
```
1. Click nome file
2. Browser scarica file
```

**Permessi:**
- Tutti i membri dello studio possono scaricare documenti interni
- Clienti scaricano SOLO documenti con flag "Condiviso"

#### Cancellare Documento

**Chi:** Admin, Titolare, Avvocato (pratica assegnata)

**Processo:**
```
1. Click azione "Elimina" su documento
2. Conferma
3. Sistema:
   - Cancella file da disco
   - Rimuove record Documento
   - Notifica team (opzionale)
```

### 7.2 Alert e Promemoria

#### Creare Alert

**Accesso:** Alert → **Nuovo Alert**

**Tipi:**
- 📅 **Scadenza**: reminder data scadenza pratica
- 📞 **Sollecito**: chiamare debitore/cliente
- 📝 **Documento Mancante**: caricare documento
- ⚠️ **Urgente**: azione critica

**Form:**
```
NUOVO ALERT
  Tipo: [Scadenza ▾]
  Pratica: [Select pratica]
  Data Scadenza: [__/__/____]
  Descrizione: [__________]

  Priorità:
    ⚪ Bassa  ⚪ Media  ⚪ Alta  ⚪ Urgente

  Notifica a:
    [x] Me stesso
    [x] Avvocato assegnato
    [ ] Titolare studio
    [ ] Segreteria

  Notifica quando:
    [x] 7 giorni prima
    [x] 1 giorno prima
    [x] Il giorno stesso (mattina)

[Annulla]  [Crea Alert]
```

**Notifiche:**
- **Email**: inviata ai destinatari selezionati
- **In-App**: campanella notifiche (header)
- **Dashboard**: widget "Scadenze Prossime"

#### Gestire Alert

**Visualizzazione Alert:**
```
DATA       | TIPO      | PRATICA  | DESCRIZIONE           | AZIONI
-----------|-----------|----------|-----------------------|--------
31/12/2024 | Scadenza  | 003/2024 | Termine opposizione   | ✅ ❌
15/01/2025 | Sollecito | 002/2024 | Chiamare debitore     | ✅ ❌
```

**Azioni:**
- ✅ **Completa**: marca come fatto
- ❌ **Elimina**: rimuovi alert
- ✏️ **Modifica**: cambia data/descrizione

**Filtri:**
- Range date
- Tipo alert
- Pratica
- Stato (Da Fare / Completati)

---

## 8. Funzionalità Avanzate

### 8.1 Ricerca Globale

**Accesso:** Menu → **Ricerca** (o CTRL+K)

**Entità ricercabili:**
- Pratiche (numero, cliente, debitore)
- Clienti (ragione sociale, P.IVA, CF)
- Debitori (nome, cognome, ragione sociale, CF)
- Documenti (nome file, descrizione)

**Sintassi:**
```
Ricerca semplice:
"003" → trova pratiche, documenti con "003"

Ricerca avanzata:
pratica:003 → solo pratiche
cliente:ACME → solo clienti ACME
debitore:Rossi → solo debitori Rossi
```

**Risultati:**
```
PRATICHE (3)
  003/2024 - ACME SRL vs Mario Rossi
  002/2024 - Beta SpA vs Laura Bianchi

CLIENTI (1)
  ACME SRL - P.IVA 12345678901

DOCUMENTI (2)
  contratto_003_2024.pdf
  fattura_003_2024.pdf
```

### 8.2 Dashboard Analytics

**Accesso:** Dashboard (home)

**KPI Cards:**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Pratiche    │ Capitale    │ Recuperato  │ Tasso       │
│ Aperte      │ in Recupero │             │ Successo    │
│             │             │             │             │
│    42       │ € 2.500.000 │ € 1.800.000 │    72%      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Grafici:**

1. **Pratiche per Fase** (Torta)
   ```
   Affidamento: 12 (28%)
   Sollecito: 18 (43%)
   Azione Legale: 10 (24%)
   Chiusa: 2 (5%)
   ```

2. **Trend Recuperi** (Linea)
   ```
   Gen: €100k
   Feb: €150k
   Mar: €200k
   ...
   ```

3. **Top Avvocati per Recupero** (Barre)
   ```
   Mario Rossi: €500k
   Laura Bianchi: €400k
   ...
   ```

**Filtri Dashboard:**
- Range Date: Ultimo Mese | Ultimi 3 Mesi | Anno Corrente | Personalizzato
- Studio (solo admin)
- Avvocato

### 8.3 Ticket/Segnalazioni

**Accesso:** Menu → **Ticket**

**Utilizzo:**
- Segnalare problemi tecnici
- Richiedere supporto
- Comunicazioni interne team

**Creare Ticket:**
```
NUOVO TICKET
  Oggetto: [__________]
  Categoria: [Tecnico ▾]
    - Tecnico (bug, errori)
    - Supporto (come fare X)
    - Richiesta Feature
    - Altro

  Priorità:
    ⚪ Bassa  ⚪ Media  ⚪ Alta  ⚪ Critica

  Descrizione: [Textarea]

[Annulla]  [Invia Ticket]
```

**Gestione Ticket (Admin):**
- Visualizza tutti ticket
- Assegna a utente
- Cambia stato: Aperto → In Lavorazione → Risolto → Chiuso
- Risponde via commenti

### 8.4 Impostazioni Profilo

**Accesso:** Icona Profilo → **Impostazioni**

**Sezioni:**

1. **Profilo Personale**
   ```
   Nome: [__________]
   Cognome: [__________]
   Email: [__________] (non modificabile)
   Telefono: [__________]
   ```

2. **Sicurezza**
   ```
   Cambia Password:
     Password Attuale: [____]
     Nuova Password: [____]
     Conferma Password: [____]

   Two-Factor Authentication:
     [x] Abilita 2FA
     Canale: ⚪ Email  ⚪ SMS
   ```

3. **Notifiche**
   ```
   Email Notifiche:
     [x] Nuove pratiche assegnate
     [x] Cambio fase pratiche
     [x] Movimenti finanziari
     [x] Alert scadenze
     [ ] Newsletter

   Push Notifiche (se PWA):
     [x] Alert urgenti
     [ ] Tutte le notifiche
   ```

4. **Preferenze**
   ```
   Lingua: [Italiano ▾]
   Fuso Orario: [Europe/Rome ▾]
   Formato Data: [DD/MM/YYYY ▾]
   Valuta: [EUR €]
   ```

---

## 9. FAQ

### 9.1 Domande Generali

**Q: Ho dimenticato la password, come recuperarla?**

A:
```
1. Login page → "Password Dimenticata?"
2. Inserisci email
3. Ricevi link reset (valido 1 ora)
4. Clicca link, imposta nuova password
5. Accedi con nuova password
```

**Q: Posso accedere da più dispositivi?**

A: Sì, puoi accedere contemporaneamente da PC, tablet, smartphone. Ogni dispositivo ha sessione separata. Usa "Logout da Tutti i Dispositivi" per invalidare tutte le sessioni.

**Q: Quanto dura la sessione?**

A: 2 ore di inattività. Dopo 2 ore senza interazione, logout automatico. Token aggiornato automaticamente ogni 15 minuti se attivo.

**Q: Posso esportare tutti i miei dati?**

A: Sì, Admin e Titolare possono esportare tutti i dati dello studio in CSV/XLSX/JSON tramite la pagina Export Dati.

### 9.2 Pratiche

**Q: Come creo una pratica?**

A: Pratiche → Nuova Pratica → Compila form (cliente, debitore obbligatori) → Salva. Il numero pratica è generato automaticamente.

**Q: Posso modificare una pratica dopo creazione?**

A: Sì, Admin/Titolare/Avvocato (se assegnato) possono modificare. Segreteria può modificare SOLO avvocati/collaboratori assegnati.

**Q: Come chiudo una pratica?**

A: Dettaglio Pratica → Cambia Fase → Seleziona "Chiusa" → Scegli Esito (Positivo/Negativo) → Conferma. Pratica diventa `aperta: false`.

**Q: Posso riaprire una pratica chiusa?**

A: Sì, Admin/Titolare possono cambiare fase da "Chiusa" a qualsiasi altra fase. Sistema imposta automaticamente `aperta: true`.

**Q: Cosa succede se elimino una pratica?**

A: Soft delete: pratica nascosta da elenchi ma dati conservati. Admin/Titolare possono ripristinare filtro "Mostra Disattivate" → Ripristina.

### 9.3 Utenti e Permessi

**Q: Qual è la differenza tra Avvocato e Collaboratore?**

A:
- **Avvocato**: modifica pratiche assegnate, cambia fasi, registra movimenti finanziari
- **Collaboratore**: solo visualizzazione pratiche dello studio, NO modifica

**Q: Segreteria può cambiare le fasi?**

A: NO. Segreteria può solo assegnare/riassegnare avvocati e collaboratori. Cambio fasi riservato a Admin, Titolare, Avvocato.

**Q: Cliente può modificare i dati?**

A: NO. Cliente ha accesso READ-ONLY alla dashboard condivisa con solo le proprie pratiche.

**Q: Come disattivo un utente?**

A: Admin → Utenti → Click utente → Disattiva. Utente non può più accedere, pratiche assegnate rimangono visibili agli altri.

### 9.4 Sicurezza

**Q: È obbligatorio il 2FA?**

A: Consigliato per Admin e Titolare. Opzionale per altri ruoli. Si abilita in Impostazioni → Sicurezza.

**Q: Dopo quanti tentativi falliti l'account si blocca?**

A: 5 tentativi falliti = lockout 15 minuti. Reset automatico dopo lockout o login riuscito.

**Q: I dati sono criptati?**

A: Sì, comunicazioni HTTPS (TLS 1.3), password con bcrypt (salt rounds: 10), database può essere encrypted at rest (configurazione server).

**Q: Posso vedere chi ha modificato una pratica?**

A: Sì, Admin può consultare Audit Log con tutte le azioni (chi, cosa, quando). Timeline pratica mostra storico cambi fase con utente.

### 9.5 Backup e Dati

**Q: I backup sono automatici?**

A: Sì, backup automatico ogni 24 ore (configurabile). Retention: 30 backup. Admin può creare backup manuali.

**Q: Posso ripristinare un backup?**

A: Sì, Admin → Backup → Click "Ripristina". **ATTENZIONE**: sovrascrive tutti i dati correnti. Tutti utenti disconnessi.

**Q: I file caricati sono inclusi nei backup?**

A: I backup SQL includono SOLO metadati documenti (nome, path). File fisici in /uploads devono essere backuppati separatamente (es: copia su S3).

**Q: Posso migrare i dati su altro server?**

A: Sì, Export Dati → JSON completo → Import su nuovo server. Oppure: Backup → Download SQL → Restore su nuova istanza.

---

## 10. Supporto e Contatti

### Supporto Tecnico

**Email**: support@resolv.legal

**Ticket**: Menu → Ticket → Nuovo Ticket

**Documentazione**: https://docs.resolv.legal

### Training

Sessioni di formazione disponibili:
- **Onboarding Admin**: 2 ore
- **Onboarding Titolare Studio**: 1.5 ore
- **Onboarding Team**: 1 ora

Contatta: training@resolv.legal

### Note Finali

Questa guida copre le funzionalità principali di Resolv v1.0. Per funzionalità avanzate, consulta la documentazione tecnica o contatta il supporto.

**Versione Guida**: 1.0 - Dicembre 2025

**Ultimo Aggiornamento**: 29/12/2025

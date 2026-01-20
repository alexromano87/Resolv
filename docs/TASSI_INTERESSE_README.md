# Sistema di Gestione Tassi di Interesse - Resolv

## 📋 Panoramica

Sistema completo per la gestione automatizzata dei tassi di interesse legali e moratori, con integrazione API BCE, notifiche automatiche e storico completo dal 2020 ad oggi.

## ✨ Funzionalità Implementate

### 1. **Pagina Admin Tassi di Interesse**
- 📍 **Percorso**: `/admin/tassi-interesse`
- 🔐 **Accesso**: Solo amministratori
- **Funzionalità**:
  - Visualizzazione tabellare di tutti i tassi configurati
  - Filtri per tipo (legale/moratorio) e validità temporale
  - CRUD completo (Crea, Modifica, Elimina)
  - Badge visivi per stato (Valido/Scaduto)
  - Grafico storico andamento tassi
  - Info box con formule di calcolo e normative

### 2. **Sistema di Notifiche Automatiche**

#### A. Notifica Scadenza Tassi
- **Quando**: Ogni giorno alle 9:00
- **Cosa**: Avvisa gli admin 30 giorni prima della scadenza di un tasso
- **Servizio**: `TassiMonitoraggioService.checkTassiInScadenza()`

#### B. Notifica Tassi Scaduti
- **Quando**: Ogni lunedì alle 10:00
- **Cosa**: Avvisa se manca un tasso valido per il periodo corrente
- **Servizio**: `TassiMonitoraggioService.checkTassiScaduti()`

#### C. Reminder Aggiornamento Semestrale (Moratori)
- **Quando**: 25 giugno e 25 dicembre alle 9:00
- **Cosa**: Promemoria per aggiornare il tasso moratorio
- **Servizio**: `TassiMonitoraggioService.reminderAggiornamentoSemestrale()`

#### D. Reminder Aggiornamento Annuale (Legali)
- **Quando**: 10 dicembre alle 9:00
- **Cosa**: Promemoria per aggiornare il tasso legale per l'anno successivo
- **Servizio**: `TassiMonitoraggioService.reminderAggiornamentoAnnuale()`

### 3. **Integrazione API BCE**

#### Monitoraggio Automatico
- **API Endpoint**: `https://data-api.ecb.europa.eu`
- **Dataset**: FM (Financial Market Data) - Main refinancing operations rate
- **Servizio**: `BceIntegrationService`

#### Job Schedulati
- **Settimanale**: Ogni lunedì alle 11:00 - Controllo tasso BCE
- **Mensile**: 1° giorno del mese alle 10:00 - Controllo approfondito

#### Calcolo Automatico Tasso Moratorio
- Formula: `Tasso Moratorio = Tasso BCE + 8%`
- Normativa: DLGS 192/2012 (per transazioni dopo 31/12/2012)
- Notifica automatica se c'è discrepanza con il tasso configurato

### 4. **API Backend**

#### Endpoint CRUD Tassi
```
POST   /tassi-interesse          # Crea nuovo tasso (Admin)
GET    /tassi-interesse          # Lista tutti i tassi
GET    /tassi-interesse/current  # Tassi validi oggi
GET    /tassi-interesse/by-tipo/:tipo  # Filtra per tipo
GET    /tassi-interesse/:id      # Dettaglio tasso
PATCH  /tassi-interesse/:id      # Modifica tasso (Admin)
DELETE /tassi-interesse/:id      # Elimina tasso (Admin)
```

#### Endpoint Monitoraggio
```
POST   /tassi-interesse/bce/check      # Verifica tasso BCE manualmente (Admin)
POST   /tassi-interesse/test-notifiche # Test sistema notifiche (Admin)
```

### 5. **Database e Storico**

#### Tabella: `tasso_interesse`
```sql
- id: uuid (PK)
- tipo: enum('legale', 'moratorio')
- tassoPercentuale: decimal(5,2)
- dataInizioValidita: date
- dataFineValidita: date (nullable)
- decretoRiferimento: varchar(500)
- note: text
- createdAt, updatedAt: timestamp
```

#### Storico Precaricato (Migration)
- **Tassi Legali**: 2020-2026 (6 record)
- **Tassi Moratori**: 2020-2025 (12 record semestrali)
- **Totale**: 18 record storici precaricati

**Highlights storici**:
- 2020-2021: Tassi legali allo 0.05% e 0.01% (periodo COVID)
- 2023: Picco tasso legale al 5% (inflazione)
- 2023: Picco tasso moratorio al 12.25% (BCE al 4.25%)
- 2026: Tasso legale all'1.6% (attuale)

## 📊 Formule di Calcolo

### Interesse Semplice (Legale e Moratorio)
```
I = C × S × N / 36500

Dove:
- I = Interesse maturato
- C = Capitale
- S = Tasso percentuale annuale
- N = Numero di giorni
- 36500 = Anno civile (365 giorni × 100)
```

### Interesse Composto (Piani Ammortamento)
Supporta capitalizzazione:
- Nessuna
- Trimestrale (1 gen, 1 apr, 1 lug, 1 ott)
- Semestrale (1 gen, 1 lug)
- Annuale (1 gen)

### Gestione Acconti (Art. 1194 C.C.)
Gli acconti vengono decurtati:
1. Prima dagli interessi maturati fino alla data dell'acconto
2. Poi dal capitale residuo

## 🗂️ Struttura File Creati/Modificati

### Backend
```
apps/backend/src/rate-ammortamento/
├── tasso-interesse.entity.ts              # Esistente
├── tassi-interesse.service.ts             # Esistente
├── tassi-interesse.controller.ts          # Modificato (+ endpoint BCE)
├── tassi-monitoraggio.service.ts          # NUOVO - Notifiche automatiche
├── bce-integration.service.ts             # NUOVO - Integrazione API BCE
├── rate-ammortamento.module.ts            # Modificato (+ nuovi servizi)
└── dto/
    ├── create-tasso-interesse.dto.ts      # Esistente
    └── update-tasso-interesse.dto.ts      # Esistente

apps/backend/src/migrations/
└── 1767440000000-SeedTassiInteresse.ts    # NUOVO - Seed storico tassi

apps/backend/package.json                   # Modificato (+ axios, @nestjs/axios)
```

### Frontend
```
apps/frontend/src/pages/
└── TassiInteressePage.tsx                 # NUOVO - Pagina admin completa

apps/frontend/src/components/
└── TassiStoricoChart.tsx                  # NUOVO - Grafico storico

apps/frontend/src/api/
└── tassi-interesse.ts                     # Esistente

apps/frontend/src/
├── App.tsx                                # Modificato (+ rotta tassi)
└── layout/AppLayout.tsx                   # Modificato (+ link menu)
```

## 🚀 Utilizzo

### Per gli Amministratori

#### 1. Accesso alla Pagina
1. Login come amministratore
2. Menu laterale → **Tassi di Interesse**
3. Oppure naviga a `/admin/tassi-interesse`

#### 2. Gestione Tassi
- **Crea nuovo tasso**: Click su "Nuovo Tasso"
- **Modifica tasso**: Click sull'icona matita
- **Elimina tasso**: Click sull'icona cestino
- **Visualizza grafico**: Click su "Mostra Grafico"

#### 3. Monitoraggio BCE
Esegui chiamata POST manuale:
```bash
curl -X POST http://localhost:3000/tassi-interesse/bce/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Risposta:
```json
{
  "success": true,
  "tassoBCE": 2.15,
  "tassoMoratorio": 10.15
}
```

#### 4. Test Notifiche
```bash
curl -X POST http://localhost:3000/tassi-interesse/test-notifiche \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Calendario Manutenzione Tassi

| Data | Azione | Tipo Tasso |
|------|--------|------------|
| 10-15 Dicembre | Verifica decreto MEF e aggiorna tasso legale per anno successivo | Legale |
| 25-31 Dicembre | Verifica tasso BCE e aggiorna tasso moratorio per semestre successivo | Moratorio |
| 25-30 Giugno | Verifica tasso BCE e aggiorna tasso moratorio per semestre successivo | Moratorio |

## 🔔 Notifiche

Le notifiche vengono visualizzate:
1. **Campanella** in alto a destra nell'header
2. **Sezione Notifiche** nella dashboard
3. **Email** (se configurato il servizio email)

Tipi di notifiche:
- `tasso_interesse_scadenza`: 30 giorni prima della scadenza
- `tasso_interesse_scaduto_critico`: Tasso scaduto senza sostituto
- `tasso_interesse_reminder_semestrale`: 25 giugno/dicembre
- `tasso_interesse_reminder_annuale`: 10 dicembre
- `bce_variazione_tasso`: Variazione significativa tasso BCE
- `bce_tasso_mancante`: Nessun tasso moratorio valido configurato

## 📈 Statistiche e Monitoraggio

### Dashboard Admin
Nella dashboard amministrativa verranno mostrate:
- Numero totale tassi configurati
- Tassi validi oggi
- Prossime scadenze
- Ultimo aggiornamento BCE

### Log Sistema
I servizi di monitoraggio logano automaticamente:
- Controlli schedulati eseguiti
- Tassi in scadenza rilevati
- Errori durante recupero API BCE
- Notifiche inviate agli admin

Verifica i log:
```bash
docker-compose logs backend | grep -i "tasso\|bce"
```

## 🛠️ Configurazione

### Variabili d'Ambiente (Opzionale)

```env
# API BCE (già configurato, nessuna key richiesta)
BCE_API_ENABLED=true

# Email per notifiche (opzionale)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@resolv.it
SMTP_PASS=your_password
```

### Disabilitare Integrazione BCE
Se non vuoi l'integrazione automatica con la BCE, commenta i cron job in:
```typescript
// apps/backend/src/rate-ammortamento/bce-integration.service.ts

// @Cron(CronExpression.EVERY_WEEK)
// async scheduledBCERateCheck() { ... }

// @Cron('0 10 1 * *')
// async monthlyBCERateCheck() { ... }
```

## 📚 Fonti Ufficiali

### Tassi Legali
- **Fonte**: Decreti MEF pubblicati in Gazzetta Ufficiale
- **Normativa**: Art. 1284 Codice Civile
- **Link**: [Gazzetta Ufficiale](https://www.gazzettaufficiale.it)

### Tassi Moratori
- **Fonte**: MEF - Pubblicazione semestrale GU
- **Normativa**: DLGS 192/2012 (modificato da DL 51/2015 e DLGS 198/2021)
- **Formula**: Tasso BCE + 8% (transazioni dopo 31/12/2012)
- **Link**: [MEF Tassi Moratori](https://www.mef.gov.it)

### Tasso BCE
- **Fonte**: Banca Centrale Europea
- **API**: [ECB Data Portal](https://data.ecb.europa.eu)
- **Dataset**: FM - Main refinancing operations rate

## 🧪 Testing

### Test Manuale Notifiche
```bash
# Backend deve essere in esecuzione
curl -X POST http://localhost:3000/tassi-interesse/test-notifiche \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Verifica le notifiche nella pagina Notifiche dell'admin.

### Test Integrazione BCE
```bash
curl -X POST http://localhost:3000/tassi-interesse/bce/check \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Verifica la risposta JSON con i tassi aggiornati.

## 🐛 Troubleshooting

### Problema: Notifiche non vengono inviate
**Soluzione**:
1. Verifica che `@nestjs/schedule` sia configurato in `app.module.ts`
2. Controlla i log: `docker-compose logs backend | grep -i cron`
3. Verifica presenza admin nel DB: `SELECT * FROM user WHERE ruolo = 'admin'`

### Problema: API BCE non risponde
**Soluzione**:
1. Verifica connessione internet del container
2. Testa endpoint manualmente: `curl https://data-api.ecb.europa.eu`
3. Controlla timeout configurato in `HttpModule` (default 10s)
4. Disabilita integrazione BCE se non necessaria

### Problema: Migration non si applica
**Soluzione**:
```bash
cd apps/backend
npm run migration:run
```

Se fallisce:
```bash
npm run migration:revert
npm run migration:run
```

## 📝 Note Tecniche

### Performance
- Query ottimizzate con index su `tipo`, `dataInizioValidita`, `dataFineValidita`
- Cache non necessario (dati aggiornati raramente)
- API BCE chiamata solo settimanalmente/mensilmente

### Sicurezza
- Tutti gli endpoint protetti da `JwtAuthGuard`
- Operazioni CRUD riservate ad `AdminGuard`
- Validazione input con `class-validator`
- Sanitizzazione output con TypeORM

### Scalabilità
- Sistema progettato per gestire 100+ anni di storico
- Supporto multi-studio (ogni studio vede gli stessi tassi)
- Notifiche asincrone tramite queue (se necessario in futuro)

## 🎯 Roadmap Futuro

Possibili miglioramenti:
- [ ] Dashboard widget "Prossime Scadenze Tassi"
- [ ] Export Excel storico completo tassi
- [ ] Grafici comparativi con inflazione
- [ ] Notifiche push mobile
- [ ] Integrazione automatica con Gazzetta Ufficiale (web scraping)
- [ ] API webhook per aggiornamenti esterni
- [ ] Supporto tassi personalizzati per cliente
- [ ] Calcolo automatico interessi in fatturazione

## 👥 Crediti

Sistema implementato per Resolv - Gestionale Studi Legali
Versione: 1.0.0
Data: Gennaio 2026

---

**Per assistenza o segnalazione bug, contatta il team di sviluppo.**

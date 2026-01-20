# 📖 Guida al Ripristino degli Studi Eliminati

## 🎯 Come Funziona il Soft Delete

Quando elimini uno studio dalla pagina "Gestione Studi Legali", **non viene cancellato definitivamente** dal database. Viene invece contrassegnato come eliminato (soft delete) e:

✅ **Viene creato un backup automatico** di tutti i dati dello studio
✅ **I dati rimangono nel database** ma non sono visibili nelle query normali
✅ **Tutti i record associati vengono disattivati** (utenti, clienti, pratiche, debitori, avvocati)
✅ **Puoi ripristinare lo studio** in qualsiasi momento, riattivando automaticamente tutti i dati associati

---

## 🔄 Come Ripristinare uno Studio Eliminato

### Opzione 1: Ripristino tramite Frontend (CONSIGLIATO)

**Percorso:** Admin → Gestione Studi Legali

**Procedura:**
1. Accedi come **admin** (admin@resolv.it)
2. Vai su **Admin → Gestione Studi Legali**
3. Cerca lo studio con il badge **"🗑️ Eliminato"**
4. Clicca sul pulsante verde **↻ Ripristina**
5. Conferma l'operazione nella finestra di dialogo

**Cosa succede quando ripristini:**
- ✅ Lo studio torna attivo (`deletedAt` = NULL, `attivo` = true)
- ✅ **TUTTI gli utenti** dello studio vengono riattivati (`attivo` = true)
- ✅ **TUTTI i clienti** vengono riattivati
- ✅ **TUTTE le pratiche** vengono riattivate
- ✅ **TUTTI i debitori** vengono riattivati
- ✅ **TUTTI gli avvocati** vengono riattivati

---

### Opzione 2: Ripristino tramite Backend API

**Endpoint:** `POST /studi/:id/restore`

**Requisiti:**
- Devi essere autenticato come **admin**
- Devi conoscere l'**ID dello studio** da ripristinare

**Esempio con curl:**
```bash
# 1. Fai login per ottenere il token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@resolv.it","password":"Admin123!"}' \
  | jq -r '.token')

# 2. Ripristina lo studio
curl -X POST http://localhost:3000/studi/STUDIO_ID/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Esempio con JavaScript/TypeScript (Frontend):**
```typescript
import { studiApi } from './api/studi';

// Ripristina lo studio
try {
  const studio = await studiApi.restore('STUDIO_ID');
  console.log('Studio ripristinato:', studio);
} catch (error) {
  console.error('Errore durante il ripristino:', error);
}
```

---

### Opzione 3: Ripristino tramite Database (per admin DB)

Se hai accesso diretto al database MySQL:

```sql
-- 1. Visualizza gli studi eliminati
SELECT
    id,
    nome,
    deletedAt,
    createdAt
FROM studi
WHERE deletedAt IS NOT NULL
ORDER BY deletedAt DESC;

-- 2. Ripristina uno studio specifico
UPDATE studi
SET deletedAt = NULL, attivo = true
WHERE id = 'STUDIO_ID_DA_RIPRISTINARE';

-- 3. Riattiva tutti i record associati
UPDATE users SET attivo = true WHERE studioId = 'STUDIO_ID_DA_RIPRISTINARE';
UPDATE clienti SET attivo = true WHERE studioId = 'STUDIO_ID_DA_RIPRISTINARE';
UPDATE pratiche SET attivo = true WHERE studioId = 'STUDIO_ID_DA_RIPRISTINARE';
UPDATE debitori SET attivo = true WHERE studioId = 'STUDIO_ID_DA_RIPRISTINARE';
UPDATE avvocati SET attivo = true WHERE studioId = 'STUDIO_ID_DA_RIPRISTINARE';

-- 4. Verifica che sia stato ripristinato
SELECT
    id,
    nome,
    attivo,
    deletedAt
FROM studi
WHERE id = 'STUDIO_ID_DA_RIPRISTINARE';
```

---

## 🗑️ Come Funziona l'Eliminazione (Soft Delete)

### Cosa Succede Quando Elimini uno Studio

Quando clicchi sul pulsante **Elimina** nella pagina "Gestione Studi Legali":

**STEP 1: Backup Automatico**
- Viene creato un file JSON di backup in `/backups/studi/`
- Il backup contiene TUTTI i dati dello studio: users, clienti, pratiche, debitori, avvocati

**STEP 2-6: Disattivazione Record Associati**
- TUTTI gli utenti dello studio vengono **disattivati** (`attivo` = false)
- TUTTI i clienti vengono **disattivati**
- TUTTE le pratiche vengono **disattivate**
- TUTTI i debitori vengono **disattivati**
- TUTTI gli avvocati vengono **disattivati**

**STEP 7: Soft Delete dello Studio**
- Lo studio viene contrassegnato come eliminato (`deletedAt` = timestamp corrente)
- Lo studio viene disattivato (`attivo` = false)

**IMPORTANTE:** Tutto avviene in una **transazione atomica**. Se qualcosa va storto, TUTTE le operazioni vengono annullate (rollback).

---

## 📋 Visualizzare gli Studi Eliminati

### Frontend - Lista Studi

Nella pagina **"Gestione Studi Legali"** (`/admin/studi`), gli studi eliminati vengono mostrati con:

1. **Badge "🗑️ Eliminato"** nella colonna Stato (NESSUN altro badge è visibile)
2. **Pulsante verde di ripristino** (icona ↻) al posto delle azioni normali (Edit, Toggle, Delete)

**Come ripristinare dal frontend:**
1. Accedi come admin
2. Vai su **Admin → Gestione Studi Legali**
3. Cerca lo studio con il badge "🗑️ Eliminato"
4. Clicca sul pulsante verde **↻ Ripristina**
5. Conferma l'operazione

---

### Backend - Query Database

```sql
-- Conta gli studi eliminati
SELECT COUNT(*) as studi_eliminati
FROM studi
WHERE deletedAt IS NOT NULL;

-- Lista completa degli studi eliminati con dettagli
SELECT
    id,
    nome,
    ragioneSociale,
    email,
    attivo,
    createdAt,
    deletedAt,
    DATEDIFF(NOW(), deletedAt) as giorni_da_eliminazione
FROM studi
WHERE deletedAt IS NOT NULL
ORDER BY deletedAt DESC;

-- Conta i record disattivati per uno studio specifico
SELECT
    'Users' as tipo,
    COUNT(*) as totale_disattivati
FROM users
WHERE studioId = 'STUDIO_ID' AND attivo = false

UNION ALL

SELECT
    'Clienti' as tipo,
    COUNT(*) as totale_disattivati
FROM clienti
WHERE studioId = 'STUDIO_ID' AND attivo = false

UNION ALL

SELECT
    'Pratiche' as tipo,
    COUNT(*) as totale_disattivati
FROM pratiche
WHERE studioId = 'STUDIO_ID' AND attivo = false

UNION ALL

SELECT
    'Debitori' as tipo,
    COUNT(*) as totale_disattivati
FROM debitori
WHERE studioId = 'STUDIO_ID' AND attivo = false

UNION ALL

SELECT
    'Avvocati' as tipo,
    COUNT(*) as totale_disattivati
FROM avvocati
WHERE studioId = 'STUDIO_ID' AND attivo = false;
```

---

## 💾 Backup Automatici

### Dove Vengono Salvati i Backup

Quando elimini uno studio, viene creato un backup JSON in:

```
/backups/studi/studio-NOME_STUDIO-TIMESTAMP.json
```

**Esempio:**
```
/backups/studi/studio-Studio-Legale-Rossi-2025-12-30T10-27-01-000Z.json
```

### Struttura del Backup

Il file JSON contiene:

```json
{
  "timestamp": "2025-12-30T10:27:01.000Z",
  "studio": {
    "id": "uuid-dello-studio",
    "nome": "Studio Legale Rossi",
    "ragioneSociale": "Studio Legale Rossi S.r.l.",
    // ... altri dati dello studio
  },
  "users": [
    // Tutti gli utenti dello studio (senza password)
  ],
  "clienti": [
    // Tutti i clienti
  ],
  "debitori": [
    // Tutti i debitori
  ],
  "avvocati": [
    // Tutti gli avvocati
  ],
  "pratiche": [
    // Tutte le pratiche con relazioni
  ],
  "metadata": {
    "totalRecords": 1234,
    "backupDate": "2025-12-30T10:27:01.000Z",
    "studioId": "uuid-dello-studio",
    "studioNome": "Studio Legale Rossi"
  }
}
```

### Ripristinare da Backup Manualmente

Se lo studio è stato eliminato definitivamente (hard delete), puoi usare il backup JSON per ripristinare i dati manualmente.

⚠️ **ATTENZIONE:** Questa operazione è complessa e dovrebbe essere eseguita solo da un amministratore esperto.

---

## 🗑️ Eliminazione Permanente (Hard Delete)

### ⚠️ ATTENZIONE: Questa operazione è IRREVERSIBILE!

Per eliminare definitivamente uno studio (inclusi tutti i dati):

**Endpoint:** `DELETE /studi/:id/permanent`

```bash
# ATTENZIONE: Questa operazione cancella DEFINITIVAMENTE tutti i dati!
curl -X DELETE http://localhost:3000/studi/STUDIO_ID/permanent \
  -H "Authorization: Bearer $TOKEN"
```

**Cosa viene eliminato:**
- ❌ Lo studio e tutti i suoi dati
- ❌ Tutti gli utenti dello studio
- ❌ Tutti i clienti
- ❌ Tutte le pratiche
- ❌ Tutti i debitori
- ❌ Tutti gli avvocati
- ❌ Tutti i documenti
- ❌ Tutte le comunicazioni
- ❌ Tutti gli audit log

**Il backup JSON rimane disponibile!** Puoi sempre recuperare i dati dal file di backup.

---

## 🔍 Verifica dello Stato

### Controllare se uno Studio è Eliminato

```typescript
// Via API
const studio = await studiApi.getOne('STUDIO_ID');
if (studio.deletedAt) {
  console.log('Studio eliminato il:', new Date(studio.deletedAt));
} else {
  console.log('Studio attivo');
}
```

```sql
-- Via Database
SELECT
    id,
    nome,
    CASE
        WHEN deletedAt IS NULL THEN 'ATTIVO'
        ELSE CONCAT('ELIMINATO il ', DATE_FORMAT(deletedAt, '%d/%m/%Y %H:%i'))
    END as stato
FROM studi
WHERE id = 'STUDIO_ID';
```

---

## 🔐 Permessi e Sicurezza

### Chi Può Ripristinare uno Studio?

Solo gli utenti con ruolo **admin** possono:
- ✅ Visualizzare gli studi eliminati
- ✅ Ripristinare uno studio eliminato
- ✅ Eliminare definitivamente uno studio

### Sicurezza

- 🔒 **Autenticazione richiesta:** Tutte le operazioni richiedono un token JWT valido
- 🔒 **Autorizzazione admin:** Solo gli admin possono accedere agli endpoint di ripristino
- 🔒 **Backup automatico:** Ogni eliminazione crea un backup di sicurezza
- 🔒 **Transazioni atomiche:** Tutte le operazioni sono atomiche (tutto o niente)
- 🔒 **Logging completo:** Tutte le operazioni sono registrate nei log

---

## 📊 Statistiche e Monitoraggio

### Visualizzare gli Studi Eliminati di Recente

```sql
-- Studi eliminati negli ultimi 30 giorni
SELECT
    nome,
    ragioneSociale,
    deletedAt,
    DATEDIFF(NOW(), deletedAt) as giorni_fa
FROM studi
WHERE deletedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY deletedAt DESC;
```

### Pulizia Automatica

**NON implementata di default**, ma puoi creare un cronjob per eliminare automaticamente gli studi soft-deleted dopo un periodo di retention (es. 90 giorni):

```typescript
// apps/backend/src/studi/studi.service.ts

@Cron('0 2 * * *') // Ogni notte alle 2:00
async cleanupOldDeletedStudios() {
  const RETENTION_DAYS = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  const oldStudios = await this.studioRepository.find({
    where: {
      deletedAt: LessThan(cutoffDate)
    },
    withDeleted: true,
  });

  for (const studio of oldStudios) {
    this.logger.log(`Eliminazione permanente dello studio ${studio.nome} (eliminato da ${RETENTION_DAYS} giorni)`);
    await this.permanentDelete(studio.id);
  }
}
```

---

## 🆘 Troubleshooting

### Problema: "Studio non trovato"

**Causa:** Lo studio potrebbe essere soft-deleted e non visibile nelle query normali.

**Soluzione:**
```sql
-- Cerca anche negli studi eliminati
SELECT * FROM studi WHERE id = 'STUDIO_ID'; -- Questo NON mostra soft-deleted

-- Soluzione: cerca in tutti i record
SELECT * FROM studi WHERE id = 'STUDIO_ID' AND deletedAt IS NOT NULL;
```

### Problema: "Errore durante il ripristino"

**Possibili cause:**
1. Lo studio non esiste
2. Lo studio non è stato eliminato (deletedAt = NULL)
3. Mancano permessi admin

**Verifica:**
```sql
SELECT
    id,
    nome,
    deletedAt,
    CASE
        WHEN deletedAt IS NULL THEN 'NON ELIMINATO - Non puoi ripristinarlo'
        ELSE 'ELIMINATO - Puoi ripristinarlo'
    END as stato
FROM studi
WHERE id = 'STUDIO_ID';
```

### Problema: Backup non creato

**Verifica:**
```bash
# Controlla i log del backend
docker logs resolv-backend | grep -i backup

# Controlla se la cartella backup esiste
ls -la /backups/studi/
```

### Problema: Record associati non disattivati

**Verifica:**
```sql
-- Controlla se ci sono record ancora attivi per uno studio eliminato
SELECT
    'Studio' as tipo,
    COUNT(*) as totale
FROM studi
WHERE id = 'STUDIO_ID' AND deletedAt IS NOT NULL

UNION ALL

SELECT
    'Users ancora attivi' as tipo,
    COUNT(*) as totale
FROM users
WHERE studioId = 'STUDIO_ID' AND attivo = true

UNION ALL

SELECT
    'Clienti ancora attivi' as tipo,
    COUNT(*) as totale
FROM clienti
WHERE studioId = 'STUDIO_ID' AND attivo = true;
```

**Soluzione:** Se trovi record ancora attivi, disattivali manualmente:
```sql
UPDATE users SET attivo = false WHERE studioId = 'STUDIO_ID';
UPDATE clienti SET attivo = false WHERE studioId = 'STUDIO_ID';
UPDATE pratiche SET attivo = false WHERE studioId = 'STUDIO_ID';
UPDATE debitori SET attivo = false WHERE studioId = 'STUDIO_ID';
UPDATE avvocati SET attivo = false WHERE studioId = 'STUDIO_ID';
```

---

## 📞 Supporto

Per ulteriori problemi:
1. Controlla i log: `docker logs resolv-backend`
2. Verifica la connessione al database
3. Controlla i permessi del file system per la cartella `/backups/`

---

## 🎯 Riepilogo Rapido

**Per eliminare uno studio:**
1. Admin → Gestione Studi Legali
2. Clicca su 🗑️ Elimina
3. Conferma l'operazione
4. ✅ Studio soft-deleted + backup creato + tutti i record associati disattivati

**Per ripristinare uno studio:**
1. Admin → Gestione Studi Legali
2. Trova lo studio con badge "🗑️ Eliminato"
3. Clicca su ↻ Ripristina
4. Conferma l'operazione
5. ✅ Studio ripristinato + tutti i record associati riattivati

---

**Data:** 30 Dicembre 2025
**Versione:** 2.0
**Funzionalità:** Soft Delete + Backup Automatico + Ripristino + Cascade Disattivazione/Riattivazione

# Sistema di Gestione Domande Checkup

## Panoramica

Il sistema di gestione domande permette al superadmin di personalizzare completamente le domande del pre-assessment checkup, inclusi i testi di aiuto (tooltip con "?").

## Struttura Dati

Il sistema è organizzato su tre livelli:

1. **Macro-Aree** (`QuestionMacroArea`)
   - Raggruppamenti di alto livello (es. "Identità e Struttura", "Governance")
   - Ogni macro-area ha un codice, label, colore e ordinamento

2. **Sezioni** (`QuestionSection`)
   - Sottogruppi all'interno di una macro-area (es. "Anagrafica Societaria")
   - Ogni sezione appartiene a una macro-area

3. **Domande/Campi** (`QuestionField`)
   - Singole domande del questionario
   - Ogni campo appartiene a una sezione
   - Proprietà principali:
     - `fieldId`: identificatore univoco
     - `label`: testo della domanda
     - `type`: tipo di input (text, textarea, select, radio, checkbox, date, etc.)
     - `options`: opzioni per select/radio/checkbox
     - `required`: se il campo è obbligatorio
     - `help`: **testo del tooltip che appare con il "?"**
     - `sortOrder`: ordine di visualizzazione

## Accesso alla Pagina di Gestione

### Requisiti
- Ruolo: **superadmin**
- URL: `https://checkup.resolv.legal/gestione-domande`

### Accesso tramite Menu
1. Login come superadmin
2. Vai su "Amministrazione"
3. Clicca su "Gestione Domande" nel menu laterale

## Utilizzo dell'Interfaccia

L'interfaccia è divisa in 3 colonne:

### 1. Colonna Macro-Aree (sinistra)
- Visualizza tutte le macro-aree
- Click su una macro-area per vedere le sue sezioni
- Pulsante "+" per aggiungere nuova macro-area
- Icone per modificare o eliminare

### 2. Colonna Sezioni (centro)
- Mostra le sezioni della macro-area selezionata
- Click su una sezione per vedere i suoi campi
- Pulsante "+" per aggiungere nuova sezione
- Icone per modificare o eliminare

### 3. Colonna Domande (destra)
- Mostra i campi della sezione selezionata
- Ogni campo mostra:
  - Label e fieldId
  - Tipo di campo
  - Badge "required" se obbligatorio
  - **Icona "?" con il testo di aiuto se presente**
- Pulsante "+" per aggiungere nuovo campo
- Icone per modificare o eliminare

## Modifica dei Tooltip (testi di aiuto)

Per modificare i tooltip delle domande:

1. Seleziona macro-area e sezione
2. Nella colonna domande, clicca sull'icona "matita" del campo da modificare
3. Nel form di modifica, cerca il campo **"Testo di aiuto (tooltip con "?")"**
4. Inserisci o modifica il testo
5. Clicca "Salva"

Il testo inserito apparirà come tooltip quando l'utente passa il mouse sul "?" accanto alla domanda.

## API Endpoints

### Macro-Aree
- `GET /checkup/question-management/macro-areas` - Lista tutte
- `GET /checkup/question-management/macro-areas/:id` - Dettaglio
- `POST /checkup/question-management/macro-areas` - Crea nuova
- `PUT /checkup/question-management/macro-areas/:id` - Aggiorna
- `DELETE /checkup/question-management/macro-areas/:id` - Elimina

### Sezioni
- `GET /checkup/question-management/sections` - Lista tutte
- `GET /checkup/question-management/sections/:id` - Dettaglio
- `GET /checkup/question-management/sections/by-macro/:macroAreaId` - Per macro-area
- `POST /checkup/question-management/sections` - Crea nuova
- `PUT /checkup/question-management/sections/:id` - Aggiorna
- `DELETE /checkup/question-management/sections/:id` - Elimina

### Campi
- `GET /checkup/question-management/fields` - Lista tutti
- `GET /checkup/question-management/fields/:id` - Dettaglio
- `GET /checkup/question-management/fields/by-section/:sectionId` - Per sezione
- `POST /checkup/question-management/fields` - Crea nuovo
- `PUT /checkup/question-management/fields/:id` - Aggiorna
- `DELETE /checkup/question-management/fields/:id` - Elimina

### Struttura Completa
- `GET /checkup/question-management/structure` - Restituisce l'intera struttura gerarchica

## Setup Iniziale

### 1. Creare le tabelle (già fatto con TypeORM sync)
Le entità vengono create automaticamente all'avvio del backend:
- `checkup_question_macro_areas`
- `checkup_question_sections`
- `checkup_question_fields`

### 2. Popolare con dati iniziali

Esegui il seed script per importare i dati dal file `preassessment.ts`:

```bash
cd apps/backend
npm run seed:questions
```

Questo script:
- Legge i dati da `apps/checkup-frontend/src/data/preassessment.ts`
- Popola il database con tutte le macro-aree, sezioni e campi
- Mantiene i testi di aiuto (help) esistenti

## Sviluppo

### Aggiungere un nuovo tipo di campo

1. Aggiorna il select in `ManageQuestionsPage.tsx`:
```tsx
<select value={editingField.type} ...>
  <option value="text">Text</option>
  <option value="nuovo_tipo">Nuovo Tipo</option>
</select>
```

2. Aggiorna il rendering in `PreassessmentPage.tsx` per gestire il nuovo tipo

### Test

Per testare il sistema:

1. Login come superadmin
2. Vai su Gestione Domande
3. Crea/modifica/elimina domande
4. Verifica che le modifiche appaiano nel questionario pre-assessment

## Note Tecniche

- **Cascade Delete**: Eliminando una macro-area vengono eliminate tutte le sezioni e campi associati
- **Unique Codes**: I codici di macro-aree e sezioni devono essere univoci
- **Sort Order**: I campi `sortOrder` determinano l'ordine di visualizzazione
- **JSON Options**: Le opzioni per select/radio/checkbox sono salvate come JSON array

## Sicurezza

- Solo gli utenti con ruolo `superadmin` possono accedere alla gestione domande
- Tutti gli endpoint sono protetti da JWT authentication
- Le eliminazioni richiedono conferma esplicita dall'utente

## Troubleshooting

### Le modifiche non appaiono nel questionario
- Assicurati che il frontend stia usando l'API invece del file statico `preassessment.ts`
- Verifica che il cache del browser sia stato svuotato
- Controlla i log del backend per errori API

### Errore "Macro area not found"
- Il database non è stato popolato con i dati iniziali
- Esegui `npm run seed:questions` nel backend

### Tooltip non visualizzato
- Verifica che il campo `help` sia stato salvato correttamente
- Controlla che il componente nel frontend gestisca correttamente il rendering del tooltip

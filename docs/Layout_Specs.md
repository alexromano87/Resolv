# Specifiche Layout Sistema

Questo documento definisce le regole di layout e stile da seguire per ogni nuova pagina, in modo da garantire coerenza visiva e funzionale in tutta la piattaforma.

## 1) Struttura generale pagina
- Wrapper principale: `max-w-7xl mx-auto p-6 space-y-6 wow-stagger`.
- Le sezioni principali devono essere in pannelli (`wow-panel`) o card (`wow-card`).
- Evitare wrapper con sfondi personalizzati locali se non necessari: usare la palette standard della piattaforma.

## 2) Header pagina
- Struttura standard:
  - `wow-card` con padding `p-6` (desktop `md:p-8`).
  - `wow-chip` per la categoria della pagina (es. "Amministrazione", "Operativita'", "Insight studio").
  - Titolo `h1` con classe `display-font` e colore `text-slate-900 dark:text-slate-50`.
  - Sottotitolo `p` con `text-sm text-slate-600 dark:text-slate-300`.
- Azioni principali a destra con bottoni standard.

## 3) Componenti base
### Card
- `wow-card` per sezioni principali, header o KPI.

### Panel
- `wow-panel` per contenuti interni, filtri, tabelle, grafici.

### Chip
- `wow-chip` per badge e categoria di pagina.

### Tabelle
- Tabelle dentro `wow-panel` con:
  - `divide-y divide-slate-200` (thead con `bg-slate-50`).
  - Riga hover: `hover:bg-slate-50/70`.
  - Testi primari `text-slate-900`, secondari `text-slate-500`.

## 4) Bottoni
- Primario: `wow-button`.
- Secondario/ghost: `wow-button-ghost`.
- Stato disabilitato: `disabled:opacity-50 disabled:cursor-not-allowed`.

## 5) Form & input
- Input e select:
  - `border-slate-200` + `dark:border-slate-700`.
  - Focus: `focus:ring-indigo-500`.
  - Background: `dark:bg-slate-950`.
- Label: `text-sm font-medium text-slate-700 dark:text-slate-300`.
- Helper text: `text-xs text-slate-500`.
- Droplist: usare sempre le dropdown custom della piattaforma (`CustomSelect` e relative varianti).
- Date/Datetime picker: usare i picker custom esistenti (es. `DateField`), non input native.

## 6) Modali
- Overlay: `fixed inset-0 bg-black/50`.
- Z-index: `z-[60]` (solo toast e conferme sopra).
- Contenuto:
  - `rounded-2xl shadow-2xl`.
  - `bg-white dark:bg-slate-900`.
- Bottoni in modale: `wow-button` e `wow-button-ghost`.
- Le modali devono essere renderizzate sopra tutta la finestra (BodyPortal), non ancorate ai container.

## 7) Tooltip & popover
- Tooltip base:
  - `rounded-xl border border-indigo-100/60 bg-white/95 shadow-sm`.
  - Dark mode: `dark:border-slate-700 dark:bg-slate-800/90`.

## 8) Alert / errori
- Error panel: `wow-panel` con `border-rose-200 bg-rose-50/80`.
- Icona rossa + testo `text-rose-700`.

## 9) Grafici
- Grafici in `wow-panel`.
- Titolo: `text-lg font-semibold text-slate-900 dark:text-slate-50`.
- Assi leggibili con `text-slate-500`.

## 10) Spaziature
- Spaziatura verticale principale: `space-y-6`.
- Sezioni interne: `space-y-4`.
- Margini ridotti: usare `gap-3` o `gap-4`.

## 11) Dark mode
- Tutti i testi primari devono avere variante `dark:`.
- Background pannelli: `dark:bg-slate-900` o `dark:bg-slate-950`.
- Bordi: `dark:border-slate-700`.

## 12) Z-index
- Modali: `z-[60]`.
- Toast/confirm: piu' alto di `z-[60]`.
- Evitare `z-[9999]`.

## 13) Icone
- Preferire `lucide-react`.
- Dimensione standard per azioni: 16-20px.
- Icone header: 24-32px.

## 14) Typography
- Titoli: `text-3xl font-semibold`.
- Sezioni: `text-lg font-semibold`.
- Testi: `text-sm` o `text-xs`.

## 15) Coerenza visiva
- Non introdurre palette personalizzate.
- Non introdurre font esterni.
- Allineare layout e componenti a pagine esistenti (es. Dashboard, Statistiche, Tickets).

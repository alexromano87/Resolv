import { FileText, ShieldCheck, Workflow, Users, ClipboardCheck, UploadCloud, Database, Bell, KeyRound } from 'lucide-react';

const SectionTitle = ({ icon: Icon, title }: { icon: typeof FileText; title: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
      <Icon className="h-4 w-4" />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
  </div>
);

export default function AdminCheckupHelpPage() {
  return (
    <div className="space-y-8">
      <div className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="wow-chip w-fit">Guida operativa</span>
            <h1 className="display-font text-3xl font-semibold text-slate-900">Help Pre‑Assessment (Superadmin)</h1>
            <p className="text-sm text-slate-600">
              Questa guida descrive in modo dettagliato il flusso corretto per configurare e gestire il modulo
              Pre‑Assessment in ambiente Superadmin. Segui i passaggi nell’ordine indicato per evitare incoerenze
              tra licenze, modelli e questionari.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/85 px-4 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_12px_30px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <FileText className="h-3.5 w-3.5" />
              Stampa PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="wow-panel p-6 space-y-4">
          <SectionTitle icon={Workflow} title="1. Flusso di configurazione (ordine consigliato)" />
          <p className="text-sm text-slate-600">
            Prima di attivare l’operatività, è fondamentale completare l’intera catena di configurazione.
            Ogni step dipende dal precedente: evitare salti riduce errori e dati mancanti nei checkup.
          </p>
          <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2">
            <li>Creare o importare un modello base in Gestione modelli.</li>
            <li>Definire macro‑aree, sezioni e campi domanda in Gestione domande.</li>
            <li>Verificare obbligatorietà, pesi e documenti per ciascun campo.</li>
            <li>Creare le licenze e associare i modelli alle licenze.</li>
            <li>Creare sublicenze e definire se i documenti sono richiesti per la sublicenza.</li>
            <li>Provisionare i licenziatari (studi) e assegnare licenze/sublicenze.</li>
            <li>Provisionare i sublicenziatari (clienti checkup) se previsti.</li>
            <li>Creare gli utenti e assegnare i ruoli (admin studio, segreteria, collaboratore).</li>
            <li>Eseguire un test completo del questionario da un utente licenziatario.</li>
          </ol>
        </section>

        <section className="wow-panel p-6 space-y-4">
          <SectionTitle icon={ClipboardCheck} title="2. Modelli e versioni" />
          <p className="text-sm text-slate-600">
            I modelli sono la base di tutto. Una modifica significativa richiede una nuova versione,
            così da preservare l’history dei checkup già avviati.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Usa Importa modello per duplicare rapidamente modelli simili.</li>
            <li>Evita modifiche strutturali su modelli già in uso.</li>
            <li>Documenta ogni variazione rilevante nella descrizione del modello.</li>
            <li>Conferma che le macro‑aree e le sezioni siano coerenti con gli obiettivi del checkup.</li>
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="wow-panel p-6 space-y-4">
          <SectionTitle icon={Users} title="3. Licenze e sublicenze" />
          <p className="text-sm text-slate-600">
            Le licenze definiscono i limiti e le risorse attivabili. Le sublicenze derivano dalla licenza
            principale e possono cambiare alcune opzioni operative.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Verifica sempre intestatario e scadenze prima dell’attivazione.</li>
            <li>Imposta il numero corretto di utenze per licenziatario e sublicenziatario.</li>
            <li>Per le sublicenze, conferma se è previsto l’upload dei documenti.</li>
            <li>Controlla il numero di sublicenze disponibili nella licenza madre.</li>
          </ul>
        </section>

        <section className="wow-panel p-6 space-y-4">
          <SectionTitle icon={KeyRound} title="4. Gestione utenti e ruoli" />
          <p className="text-sm text-slate-600">
            Ogni utente va associato allo studio corretto e a un ruolo. I ruoli governano cosa si può
            vedere e modificare nel questionario.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Admin studio: gestione utenti e configurazioni operative.</li>
            <li>Segreteria: supporto operativo e caricamenti.</li>
            <li>Collaboratore: compilazione e validazione dove previsto.</li>
          </ul>
        </section>
      </div>

      <section className="wow-panel p-6 space-y-4">
        <SectionTitle icon={UploadCloud} title="5. Documenti e compliance" />
        <p className="text-sm text-slate-600">
          L’upload documentale è vincolante per la qualità dei dati. Verifica che i campi obbligatori
          abbiano la documentazione attiva dove necessario.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
          <li>Attiva i documenti solo dove servono, per evitare carichi inutili agli utenti.</li>
          <li>Quando un campo è obbligatorio, assicurati che sia evidente nel questionario.</li>
          <li>Controlla i log di audit per verificare azioni critiche.</li>
        </ul>
      </section>

      <section className="wow-panel p-6 space-y-4">
        <SectionTitle icon={Database} title="6. Import/Export e Backup" />
        <p className="text-sm text-slate-600">
          Le operazioni di import/export sono pensate per ambienti controllati. Effettua sempre un backup
          prima di importazioni massive.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
          <li>Usa Export per snapshot periodiche da condividere o archiviare.</li>
          <li>Importa solo da sorgenti verificate per evitare incoerenze nei modelli.</li>
          <li>Conserva almeno un backup recente prima di ogni modifica strutturale.</li>
        </ul>
      </section>

      <section className="wow-panel p-6 space-y-4">
        <SectionTitle icon={Bell} title="7. Monitoraggio e audit" />
        <p className="text-sm text-slate-600">
          L’audit è fondamentale per la tracciabilità. I log consentono di ricostruire attività e responsabilità.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
          <li>Consulta i Log di Audit dopo operazioni amministrative rilevanti.</li>
          <li>Verifica i cambi di modello e la gestione dei permessi.</li>
          <li>Usa i log per supporto e investigazioni interne.</li>
        </ul>
      </section>

      <section className="wow-panel p-6 space-y-4">
        <SectionTitle icon={ShieldCheck} title="Checklist finale prima del go‑live" />
        <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2">
          <li>Modello pubblicato e verificato.</li>
          <li>Licenze create, intestatari corretti, scadenze verificate.</li>
          <li>Sublicenze configurate con opzioni documentali corrette.</li>
          <li>Ruoli utenti testati con account reali.</li>
          <li>Questionario testato end‑to‑end con un cliente di prova.</li>
          <li>Backup eseguito.</li>
        </ol>
      </section>
    </div>
  );
}

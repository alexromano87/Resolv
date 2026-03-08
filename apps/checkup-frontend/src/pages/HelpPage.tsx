import { BookOpen, ClipboardCheck, FileText, ShieldCheck, Users, AlertTriangle, UploadCloud, KeyRound, MessageCircle, ListChecks } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SectionTitle = ({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
      <Icon className="h-4 w-4" />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
  </div>
);

export default function HelpPage() {
  const { user } = useAuth();
  const isCliente = user?.ruolo === 'cliente';

  return (
    <div className="space-y-8">
      <div className="wow-card p-6 md:p-8">
        <span className="wow-chip w-fit">Guida operativa</span>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900 display-font">
          Help {isCliente ? 'Cliente' : 'Licenziatario'} Pre-Assessment
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Questa guida descrive in modo dettagliato come utilizzare il Pre-Assessment.
          Segui i passaggi nell’ordine indicato per evitare errori di compilazione e gestione.
        </p>
      </div>

      {isCliente ? (
        <>
          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={ClipboardCheck} title="1. Come iniziare" />
            <p className="text-sm text-slate-600">
              Dopo il login, accedi al checkup assegnato. Il sistema mostra lo stato di avanzamento e le
              sezioni da completare.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Verifica che il checkup sia quello corretto (nome cliente e data).</li>
              <li>Leggi le note del licenziatario se presenti.</li>
              <li>Compila le sezioni in ordine logico per evitare informazioni mancanti.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={FileText} title="2. Compilazione delle sezioni" />
            <p className="text-sm text-slate-600">
              Ogni sezione contiene campi obbligatori e opzionali. I campi obbligatori sono contrassegnati
              con asterisco.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Salva frequentemente: lo stato di avanzamento viene aggiornato in tempo reale.</li>
              <li>Usa i filtri (Tutti, Completati, Da completare, N/A) per gestire il lavoro.</li>
              <li>Se un campo non è applicabile, utilizza l’opzione N/A se disponibile.</li>
              <li>Concludi il checkup solo quando tutte le informazioni richieste sono complete.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={UploadCloud} title="3. Documenti e allegati" />
            <p className="text-sm text-slate-600">
              Alcuni campi richiedono documenti a supporto. Carica file chiari e pertinenti.
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>La dimensione massima consentita per ogni singolo file è di <strong>30 MB</strong>. File di dimensioni superiori verranno rifiutati dal sistema.</span>
            </div>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Controlla il formato richiesto: PDF, documenti Office (Word, Excel, PowerPoint), immagini (JPEG, PNG, GIF, WebP), testo o CSV.</li>
              <li>Evita file duplicati o incompleti.</li>
              <li>Rinomina i file in modo descrittivo (es. "Organigramma_2026.pdf").</li>
              <li>Se il caricamento fallisce, verifica che il file non superi i <strong>30 MB</strong> e che il formato sia tra quelli supportati.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={MessageCircle} title="4. Chat e comunicazioni" />
            <p className="text-sm text-slate-600">
              Usa la chat per chiarimenti con il licenziatario. I messaggi non sostituiscono i dati del checkup.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Specifica sempre la sezione a cui ti riferisci.</li>
              <li>Evita di condividere dati sensibili non necessari.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={ListChecks} title="Checklist prima della consegna" />
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2">
              <li>Tutti i campi obbligatori sono compilati.</li>
              <li>Gli allegati richiesti sono presenti.</li>
              <li>Le note sono state controllate per errori.</li>
              <li>Il riepilogo del completamento è superiore al 95%.</li>
            </ol>
          </section>
        </>
      ) : (
        <>
          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={Users} title="1. Gestione clienti" />
            <p className="text-sm text-slate-600">
              Accedi alla dashboard del licenziatario per visualizzare l’elenco clienti e lo stato dei checkup.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Usa la ricerca per individuare rapidamente un cliente.</li>
              <li>Apri il checkup corretto prima di effettuare modifiche.</li>
              <li>Verifica sempre il modello associato al cliente.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={ClipboardCheck} title="2. Compilazione e validazione" />
            <p className="text-sm text-slate-600">
              Il licenziatario coordina la compilazione e verifica la completezza dei dati.
              La valutazione del checkup avviene dopo la conclusione da parte del cliente.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Controlla i campi obbligatori prima della chiusura del questionario.</li>
              <li>Usa le note consulente per guidare il cliente.</li>
              <li>Non procedere alla valutazione se mancano allegati richiesti.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={KeyRound} title="3. Utenti e ruoli" />
            <p className="text-sm text-slate-600">
              Gestisci gli utenti dello studio e assegna i ruoli corretti per garantire accessi coerenti.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Admin studio: gestione utenti e configurazioni principali.</li>
              <li>Segreteria: supporto operativo e caricamenti.</li>
              <li>Collaboratore: compilazione e validazione dove previsto.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={UploadCloud} title="4. Gestione documenti" />
            <p className="text-sm text-slate-600">
              I documenti caricati dal cliente devono essere verificati per coerenza e completezza.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Verifica formato, data e pertinenza dei file.</li>
              <li>Il sistema accetta file fino a <strong>30 MB</strong> per allegato. Formati supportati: PDF, Office, immagini, testo e CSV.</li>
              <li>Se necessario, richiedi un nuovo caricamento tramite chat.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={ShieldCheck} title="5. Sicurezza e qualità dati" />
            <p className="text-sm text-slate-600">
              Mantieni standard elevati di qualità dati per report affidabili e auditabili.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Evita modifiche non concordate con il cliente.</li>
              <li>Documenta le eccezioni nelle note.</li>
              <li>Usa gli alert per tracciabilità interna.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={AlertTriangle} title="Troubleshooting rapido" />
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
              <li>Se il salvataggio fallisce, controlla la connessione e riprova.</li>
              <li>Se una sezione non è valida, verifica campi obbligatori e allegati.</li>
              <li>Se i dati sembrano incoerenti, ricarica il checkup.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

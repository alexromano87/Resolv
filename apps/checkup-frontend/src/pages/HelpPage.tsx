import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SectionTitle = ({ icon: Icon, title }: { icon: typeof BookOpen; title: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
      <Icon className="h-4 w-4" />
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
  </div>
);

const GuideSection = ({
  icon,
  title,
  intro,
  points,
}: {
  icon: typeof BookOpen;
  title: string;
  intro: string;
  points: string[];
}) => (
  <section className="wow-panel p-6 space-y-4">
    <SectionTitle icon={icon} title={title} />
    <p className="text-sm text-slate-600">{intro}</p>
    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
      {points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  </section>
);

export default function HelpPage() {
  const { user } = useAuth();
  const isCliente = user?.ruolo === 'cliente';

  return (
    <div className="space-y-8">
      <div className="wow-card p-6 md:p-8">
        <span className="wow-chip w-fit">Guida operativa</span>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900 display-font">
          Guida {isCliente ? 'Utente' : 'Licenziatario'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Una guida semplice per usare il software in modo corretto. Le funzioni disponibili cambiano in base al tuo ruolo:
          il licenziatario coordina il lavoro, il sublicenziatario compila il questionario e condivide i documenti richiesti.
        </p>
      </div>

      {isCliente ? (
        <>
          <GuideSection
            icon={ClipboardCheck}
            title="1. Da dove iniziare"
            intro="Dopo il login entri nell’ambiente del tuo questionario. Il tuo obiettivo è completare le sezioni assegnate in modo ordinato."
            points={[
              'Apri il questionario e controlla in alto il nome del cliente e lo stato di avanzamento.',
              'Usa la sidebar a sinistra per aprire le macroaree e passare rapidamente tra le sezioni.',
              'Compila una sezione alla volta: è il modo più semplice per non lasciare campi incompleti.',
              'Se collabori con altre persone, verifica sempre di essere nella sezione corretta prima di scrivere.',
            ]}
          />

          <GuideSection
            icon={FileText}
            title="2. Come compilare il questionario"
            intro="Ogni sezione contiene domande, campi testuali, selezioni o richieste documentali. La compilazione deve essere chiara e coerente."
            points={[
              'Rispondi in modo completo e concreto, evitando testi troppo generici.',
              'Se una domanda non si applica al tuo caso, usa l’opzione N/A quando disponibile.',
              'Controlla i dati inseriti prima di passare alla sezione successiva.',
              'Se hai un dubbio su una richiesta, fermati e usa la chat invece di inserire una risposta approssimativa.',
            ]}
          />

          <GuideSection
            icon={UploadCloud}
            title="3. Caricamento documenti"
            intro="Alcune risposte richiedono allegati di supporto. I documenti aiutano il licenziatario a verificare le informazioni inserite."
            points={[
              'Carica solo file pertinenti alla domanda o alla sezione in cui stai lavorando.',
              'Usa nomi file chiari, per esempio “Organigramma_2026.pdf” o “Policy_Accessi.pdf”.',
              'Il sistema accetta PDF, documenti Office, immagini, file di testo e CSV.',
              'La dimensione massima per ogni file è 30 MB.',
            ]}
          />

          <GuideSection
            icon={MessageCircle}
            title="4. Chat, ticket e richieste di chiarimento"
            intro="Se ti serve supporto, usa gli strumenti di comunicazione interni invece di lasciare il questionario incompleto o ambiguo."
            points={[
              'Usa la chat per richieste rapide collegate a una sezione specifica.',
              'Apri un ticket se il problema richiede una gestione più strutturata o un’azione del team.',
              'Quando scrivi, indica sempre la sezione o l’argomento a cui ti riferisci.',
              'Evita di inviare dati sensibili non necessari nei messaggi.',
            ]}
          />

          <GuideSection
            icon={CheckCircle2}
            title="5. Prima di considerare il lavoro concluso"
            intro="Prima di chiudere la sessione, fai un controllo veloce del lavoro svolto."
            points={[
              'Verifica che tutte le domande richieste abbiano una risposta oppure N/A.',
              'Controlla che gli allegati richiesti siano stati caricati correttamente.',
              'Rivedi le sezioni rimaste incomplete o con informazioni poco chiare.',
              'Se il licenziatario deve fare una revisione finale, assicurati di avergli lasciato tutte le informazioni utili.',
            ]}
          />

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={AlertTriangle} title="Problemi frequenti" />
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Se un file non viene caricato, controlla formato e dimensione.</li>
              <li>Se non trovi una sezione, apri la macroarea corretta dalla sidebar.</li>
              <li>Se una risposta non è chiara, aggiorna il campo prima di chiedere la revisione finale.</li>
              <li>Se la sessione scade, effettua di nuovo l’accesso e riprendi dal questionario.</li>
            </ul>
          </section>
        </>
      ) : (
        <>
          <GuideSection
            icon={Users}
            title="1. Il tuo ruolo nel software"
            intro="Il licenziatario usa la piattaforma per coordinare i clienti, monitorare l’avanzamento dei questionari e fare le verifiche finali."
            points={[
              'Dalla dashboard puoi vedere clienti, questionari, ticket, alert e chat.',
              'Il tuo compito principale è controllare che i dati inseriti dal sublicenziatario siano completi e coerenti.',
              'Usa le sezioni del menu per passare rapidamente tra attività operative e controllo dello stato dei lavori.',
              'Quando lavori su più clienti, entra sempre nel questionario corretto prima di modificare o validare qualcosa.',
            ]}
          />

          <GuideSection
            icon={ClipboardCheck}
            title="2. Come seguire un questionario"
            intro="Ogni questionario va seguito in due momenti: durante la compilazione e nella revisione finale."
            points={[
              'Durante la compilazione controlla lo stato delle sezioni e le eventuali richieste aperte.',
              'Usa la sidebar per aprire le macroaree e verificare rapidamente quali sezioni sono complete e quali no.',
              'Rivedi le risposte inserite dal sublicenziatario prima di considerare conclusa la raccolta dati.',
              'Se mancano informazioni o allegati, chiedi un’integrazione tramite chat o ticket.',
            ]}
          />

          <GuideSection
            icon={MessageCircle}
            title="3. Comunicazione con il sublicenziatario"
            intro="La qualità del lavoro dipende molto da richieste chiare e tracciabili."
            points={[
              'Usa la chat per chiarimenti rapidi su singole sezioni o singole domande.',
              'Usa ticket e alert quando vuoi tenere traccia di attività, anomalie o richieste da risolvere.',
              'Scrivi istruzioni brevi e precise: cosa manca, dove manca e cosa ti aspetti di ricevere.',
              'Dopo una risposta del sublicenziatario, torna nella sezione interessata e verifica che il punto sia davvero risolto.',
            ]}
          />

          <GuideSection
            icon={UploadCloud}
            title="4. Verifica dei documenti"
            intro="I documenti allegati servono a supportare il questionario. Devono essere leggibili, pertinenti e coerenti con le risposte inserite."
            points={[
              'Controlla che ogni documento corrisponda effettivamente alla sezione o al requisito richiesto.',
              'Se il file è incompleto, errato o non aggiornato, chiedi un nuovo caricamento.',
              'I formati supportati includono PDF, Office, immagini, testo e CSV.',
              'La dimensione massima di ogni file è 30 MB.',
            ]}
          />

          <GuideSection
            icon={KeyRound}
            title="5. Utenti e organizzazione del lavoro"
            intro="Se il tuo profilo lo consente, puoi organizzare il lavoro del team dello studio in modo più efficiente."
            points={[
              'Admin studio: gestisce utenti, ruoli e configurazioni operative principali.',
              'Segreteria: supporta le attività operative, i caricamenti e il monitoraggio.',
              'Collaboratore: lavora su sezioni, verifiche e validazioni secondo i permessi assegnati.',
              'Assegna a ciascuno il ruolo corretto per evitare accessi o modifiche non coerenti.',
            ]}
          />

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={ShieldCheck} title="Buone pratiche" />
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Controlla sempre completezza, coerenza e qualità dei dati prima della validazione finale.</li>
              <li>Non modificare contenuti del cliente senza un motivo chiaro e tracciabile.</li>
              <li>Usa note, ticket e chat per lasciare uno storico ordinato delle attività.</li>
              <li>Se qualcosa non torna, chiedi integrazione prima di procedere con il completamento del checkup.</li>
            </ul>
          </section>

          <section className="wow-panel p-6 space-y-4">
            <SectionTitle icon={AlertTriangle} title="Problemi frequenti" />
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Se una sezione risulta incompleta, controlla campi vuoti, N/A e allegati mancanti.</li>
              <li>Se un documento non è utilizzabile, richiedi un nuovo upload invece di procedere comunque.</li>
              <li>Se un cliente segnala un dubbio, usa chat o ticket per mantenere il confronto tracciato.</li>
              <li>Se non vedi dati aggiornati, ricarica il questionario e verifica lo stato corrente.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

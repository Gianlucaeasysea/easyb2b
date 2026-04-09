import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 9 Aprile 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Titolare del Trattamento</h2>
          <p>
            <strong>Easysea Srl</strong> — Startup Innovativa<br />
            Sede legale: Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />
            P.IVA / C.F.: IT15126351004<br />
            Capitale Sociale: € 13.781,28 i.v.<br />
            Email: <strong>business@easysea.org</strong><br />
            Sito web: <a href="https://easysea.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">easysea.org</a>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Dati Raccolti</h2>
          <p>Nell'ambito dell'attività B2B di distribuzione di accessori nautici innovativi, raccogliamo i seguenti dati personali:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dati identificativi e aziendali:</strong> nome, cognome, ragione sociale, P.IVA, codice fiscale, tipologia di attività commerciale (negozio nautico, charter, cantiere, distributore, etc.)</li>
            <li><strong>Dati di contatto:</strong> email aziendale, numero di telefono, indirizzo della sede e/o magazzino, sito web</li>
            <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, sistema operativo, pagine visitate, durata della sessione, cookie tecnici</li>
            <li><strong>Dati commerciali:</strong> storico ordini, condizioni di pagamento concordate, classe di sconto assegnata, listini personalizzati, fatture e documenti di trasporto</li>
            <li><strong>Dati di accesso al portale:</strong> credenziali di autenticazione (email e password cifrata), log di accesso, preferenze utente</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Finalità del Trattamento</h2>
          <p>I dati personali sono trattati per le seguenti finalità:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestione del rapporto contrattuale B2B, inclusa l'evasione degli ordini di accessori nautici (boat hook Jake™, winch handle Flipper™, etc.)</li>
            <li>Registrazione, gestione e manutenzione dell'account sul portale dealer riservato</li>
            <li>Applicazione di condizioni commerciali personalizzate (listini, sconti, termini di pagamento)</li>
            <li>Comunicazioni operative relative a ordini, spedizioni, disponibilità prodotti e aggiornamenti di catalogo</li>
            <li>Comunicazioni commerciali e promozionali su nuovi prodotti, promozioni e iniziative (previo consenso ove richiesto)</li>
            <li>Adempimenti contabili, fiscali e legali</li>
            <li>Miglioramento della piattaforma e analisi statistiche aggregate sull'utilizzo del portale</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Base Giuridica</h2>
          <p>Il trattamento dei dati è fondato su:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Esecuzione del contratto:</strong> per la gestione degli ordini, la fornitura dei prodotti e l'erogazione dei servizi del portale dealer</li>
            <li><strong>Adempimento di obblighi legali:</strong> per gli obblighi contabili, fiscali e normativi (conservazione fatture, registri IVA, etc.)</li>
            <li><strong>Legittimo interesse del Titolare:</strong> per il miglioramento dei servizi, la prevenzione frodi e la sicurezza della piattaforma</li>
            <li><strong>Consenso dell'interessato:</strong> per l'invio di comunicazioni commerciali e promozionali, revocabile in qualsiasi momento</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Conservazione dei Dati</h2>
          <p>I dati personali sono conservati per il tempo strettamente necessario al perseguimento delle finalità indicate:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dati contrattuali e contabili:</strong> 10 anni dalla cessazione del rapporto commerciale, come previsto dalla normativa fiscale e civilistica italiana (art. 2220 c.c.)</li>
            <li><strong>Dati di navigazione e cookie:</strong> massimo 24 mesi dalla raccolta</li>
            <li><strong>Dati del portale dealer:</strong> per tutta la durata del rapporto commerciale e fino a 12 mesi dalla chiusura dell'account</li>
            <li><strong>Dati per marketing:</strong> fino alla revoca del consenso</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Condivisione dei Dati</h2>
          <p>I dati potranno essere comunicati a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fornitori di servizi IT, cloud hosting e gestione della piattaforma (infrastruttura tecnica)</li>
            <li>Corrieri e spedizionieri per la consegna degli ordini (nazionali e internazionali)</li>
            <li>Consulenti fiscali, contabili e legali del Titolare</li>
            <li>Istituti bancari per la gestione dei pagamenti</li>
            <li>Autorità competenti ove richiesto dalla legge</li>
          </ul>
          <p>I dati non vengono ceduti a terzi per finalità di marketing senza il consenso esplicito dell'interessato. I dati potranno essere trasferiti verso paesi extra-UE solo in presenza di adeguate garanzie ai sensi degli artt. 44-49 del GDPR.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Diritti dell'Interessato</h2>
          <p>Ai sensi degli artt. 15-22 del Regolamento UE 2016/679 (GDPR), l'interessato ha diritto di:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accedere ai propri dati personali e ottenerne copia</li>
            <li>Richiederne la rettifica o l'aggiornamento</li>
            <li>Richiedere la cancellazione (diritto all'oblio), nei limiti previsti dalla legge</li>
            <li>Limitare il trattamento o opporsi ad esso</li>
            <li>Richiedere la portabilità dei dati in formato strutturato</li>
            <li>Revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento basato sul consenso prestato prima della revoca</li>
            <li>Proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>)</li>
          </ul>
          <p>Per esercitare i propri diritti, scrivere a: <strong>business@easysea.org</strong></p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Sicurezza</h2>
          <p>Easysea Srl adotta misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita, distruzione o divulgazione, incluse:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Crittografia dei dati in transito (TLS/SSL) e a riposo</li>
            <li>Autenticazione sicura con password cifrate e politiche di complessità</li>
            <li>Controllo degli accessi basato su ruoli (Role-Based Access Control)</li>
            <li>Monitoraggio e logging degli accessi alla piattaforma</li>
            <li>Backup periodici e procedure di disaster recovery</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;

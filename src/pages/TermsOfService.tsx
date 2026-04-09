import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Termini e Condizioni di Servizio</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 9 Aprile 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Informazioni Generali</h2>
          <p>Il presente sito web e la piattaforma B2B sono gestiti da:</p>
          <p>
            <strong>Easysea Srl</strong> — Startup Innovativa<br />
            Sede legale: Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />
            P.IVA / C.F.: IT15126351004<br />
            Capitale Sociale: € 13.781,28 i.v.<br />
            Email: <strong>business@easysea.org</strong><br />
            Sito web: <a href="https://easysea.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">easysea.org</a>
          </p>
          <p>Easysea progetta e distribuisce accessori nautici innovativi a livello mondiale, tra cui il boat hook Jake™ e il winch handle pieghevole Flipper™.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Ambito di Applicazione</h2>
          <p>I presenti Termini regolano l'accesso e l'utilizzo della piattaforma B2B di Easysea, inclusi il portale dealer, il catalogo prodotti, il sistema di ordini, il materiale marketing e tutti i servizi correlati. L'accesso alla piattaforma è riservato esclusivamente a operatori commerciali (B2B) preventivamente approvati da Easysea, quali negozi nautici, cantieri, charter company, distributori e rivenditori autorizzati.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Registrazione e Account</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>L'accesso al portale dealer richiede la compilazione del modulo "Become a Dealer" e la successiva approvazione da parte di Easysea</li>
            <li>Le credenziali di accesso (email e password) sono strettamente personali e non cedibili a terzi</li>
            <li>L'utente è responsabile della riservatezza delle proprie credenziali e di ogni attività svolta tramite il proprio account</li>
            <li>Easysea si riserva il diritto di sospendere o revocare l'accesso in caso di violazione dei presenti Termini, uso improprio della piattaforma o mancato rispetto degli accordi commerciali</li>
            <li>L'utente è tenuto a comunicare tempestivamente eventuali variazioni dei propri dati aziendali (ragione sociale, P.IVA, sede, etc.)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Ordini e Prezzi</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>I prezzi indicati sul portale sono prezzi B2B riservati ai dealer approvati, espressi al netto di IVA e spese di spedizione</li>
            <li>A ciascun dealer può essere assegnata una classe di sconto e/o un listino personalizzato, visibile nel proprio portale</li>
            <li>L'invio di un ordine tramite il portale costituisce una proposta d'acquisto vincolante da parte del dealer</li>
            <li>Easysea si riserva il diritto di accettare o rifiutare ordini a propria discrezione, in base a disponibilità di magazzino, solvibilità del cliente e altri fattori commerciali</li>
            <li>I prezzi possono essere soggetti a variazioni senza preavviso; fanno fede i prezzi visualizzati al momento della conferma dell'ordine</li>
            <li>L'ordine minimo e le condizioni specifiche possono variare in base agli accordi individuali con ciascun dealer</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Spedizioni e Consegne</h2>
          <p>Le spedizioni vengono effettuate tramite corrieri selezionati da Easysea verso destinazioni nazionali e internazionali. I tempi di consegna indicati sono stimati e non vincolanti. Easysea non è responsabile per ritardi imputabili al vettore, alla dogana o a cause di forza maggiore. Il tracking della spedizione, ove disponibile, sarà comunicato al dealer tramite il portale e/o via email.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Pagamenti</h2>
          <p>Le condizioni di pagamento (bonifico anticipato, 30/60/90 giorni data fattura, etc.) sono stabilite nell'accordo commerciale individuale tra Easysea e il dealer. In caso di mancato pagamento entro i termini concordati, Easysea si riserva il diritto di:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Sospendere le forniture e l'accesso al portale dealer</li>
            <li>Applicare interessi di mora secondo la normativa vigente (D.Lgs. 231/2002)</li>
            <li>Affidare il recupero del credito a soggetti terzi</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Proprietà Intellettuale</h2>
          <p>Tutti i contenuti del sito e della piattaforma (testi, immagini, loghi, marchi registrati — inclusi Jake™ e Flipper™ —, video, schede tecniche, materiale marketing, design dei prodotti) sono di proprietà esclusiva di Easysea Srl e sono protetti dalle leggi italiane, europee e internazionali sulla proprietà intellettuale. È vietata la riproduzione, distribuzione, modifica o utilizzo non autorizzato senza preventiva autorizzazione scritta di Easysea.</p>
          <p>Il materiale marketing scaricabile dal portale dealer è concesso in licenza d'uso limitata alla promozione dei prodotti Easysea nel territorio concordato.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Garanzia e Resi</h2>
          <p>I prodotti Easysea sono coperti da garanzia legale di conformità ai sensi della normativa vigente. Eventuali difetti di conformità devono essere segnalati per iscritto a <strong>business@easysea.org</strong> entro 8 giorni dalla consegna. Le condizioni di reso sono regolate dagli accordi commerciali individuali.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">9. Limitazione di Responsabilità</h2>
          <p>Easysea non garantisce la disponibilità ininterrotta della piattaforma e non sarà responsabile per danni diretti o indiretti derivanti dall'utilizzo o dall'impossibilità di utilizzo della stessa, inclusi danni da interruzione dell'attività commerciale, perdita di dati o mancato guadagno, salvo i casi di dolo o colpa grave previsti dalla legge.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">10. Riservatezza</h2>
          <p>Il dealer si impegna a mantenere riservati i prezzi, le condizioni commerciali, i listini e qualsiasi informazione riservata di cui venga a conoscenza tramite il portale. La violazione di tale obbligo può comportare la risoluzione immediata del rapporto commerciale.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">11. Legge Applicabile e Foro Competente</h2>
          <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia derivante dall'interpretazione o esecuzione dei presenti Termini sarà competente in via esclusiva il Foro di Bergamo, Italia.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">12. Contatti</h2>
          <p>Per qualsiasi domanda relativa ai presenti Termini:<br /><strong>business@easysea.org</strong></p>
          <p>Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />P.IVA IT15126351004</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;

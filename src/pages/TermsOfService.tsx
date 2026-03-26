import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Termini e Condizioni di Servizio</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 26 Marzo 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Informazioni Generali</h2>
          <p>Il presente sito web e la piattaforma B2B sono gestiti da:<br />
          <strong>Easysea Srl</strong><br />
          Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />
          P.IVA: IT15126351004 — Capitale Sociale: € 13.781,28</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Ambito di Applicazione</h2>
          <p>I presenti Termini regolano l'accesso e l'utilizzo della piattaforma B2B di Easysea, inclusi il portale dealer, il catalogo prodotti, il sistema di ordini e tutti i servizi correlati. L'accesso alla piattaforma è riservato esclusivamente a operatori commerciali (B2B).</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Registrazione e Account</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>L'accesso al portale dealer richiede credenziali fornite da Easysea previa approvazione della candidatura</li>
            <li>L'utente è responsabile della riservatezza delle proprie credenziali</li>
            <li>Easysea si riserva il diritto di sospendere o revocare l'accesso in caso di violazione dei presenti termini</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Ordini e Prezzi</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>I prezzi indicati sul portale sono prezzi B2B riservati, al netto di IVA e spese di spedizione</li>
            <li>L'invio di un ordine tramite il portale costituisce una proposta d'acquisto vincolante</li>
            <li>Easysea si riserva il diritto di accettare o rifiutare ordini a propria discrezione</li>
            <li>I prezzi possono essere soggetti a variazioni senza preavviso; fanno fede i prezzi al momento dell'ordine</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Spedizioni e Consegne</h2>
          <p>Le spedizioni vengono effettuate tramite corrieri selezionati. I tempi di consegna indicati sono stimati e non vincolanti. Easysea non è responsabile per ritardi imputabili al vettore o a cause di forza maggiore.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Pagamenti</h2>
          <p>Le condizioni di pagamento sono stabilite nell'accordo commerciale individuale tra Easysea e il dealer. In caso di mancato pagamento, Easysea si riserva il diritto di sospendere le forniture e l'accesso al portale.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Proprietà Intellettuale</h2>
          <p>Tutti i contenuti del sito (testi, immagini, loghi, marchi, video, design) sono di proprietà di Easysea Srl e sono protetti dalle leggi sulla proprietà intellettuale. È vietata la riproduzione, distribuzione o modifica senza autorizzazione scritta.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Limitazione di Responsabilità</h2>
          <p>Easysea non garantisce la disponibilità ininterrotta della piattaforma e non sarà responsabile per danni diretti o indiretti derivanti dall'utilizzo o dall'impossibilità di utilizzo della stessa, salvo i casi previsti dalla legge.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">9. Legge Applicabile e Foro Competente</h2>
          <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente in via esclusiva il Foro di Bergamo.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">10. Contatti</h2>
          <p>Per qualsiasi domanda relativa ai presenti Termini: <strong>b2b@easysea.org</strong></p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;

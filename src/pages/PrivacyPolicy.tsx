import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 26 Marzo 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Titolare del Trattamento</h2>
          <p>Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />P.IVA: IT15126351004<br />Email: b2b@easysea.org</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Dati Raccolti</h2>
          <p>Raccogliamo i seguenti dati personali:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dati identificativi:</strong> nome, cognome, ragione sociale, P.IVA</li>
            <li><strong>Dati di contatto:</strong> email, telefono, indirizzo</li>
            <li><strong>Dati di navigazione:</strong> indirizzo IP, browser, pagine visitate, cookie tecnici</li>
            <li><strong>Dati commerciali:</strong> ordini, storico acquisti, preferenze prodotto</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Finalità del Trattamento</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestione del rapporto contrattuale B2B e evasione ordini</li>
            <li>Registrazione e gestione dell'account sul portale dealer</li>
            <li>Comunicazioni commerciali e aggiornamenti su prodotti e promozioni</li>
            <li>Adempimenti legali e fiscali</li>
            <li>Miglioramento dei servizi e analisi statistiche aggregate</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Base Giuridica</h2>
          <p>Il trattamento dei dati è fondato su: esecuzione del contratto, adempimento di obblighi legali, legittimo interesse del Titolare e, ove necessario, il consenso dell'interessato.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Conservazione dei Dati</h2>
          <p>I dati personali sono conservati per il tempo necessario all'adempimento delle finalità sopra indicate e comunque non oltre i termini previsti dalla normativa fiscale e civilistica (10 anni per dati contabili). I dati di navigazione vengono cancellati entro 24 mesi.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Condivisione dei Dati</h2>
          <p>I dati potranno essere comunicati a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fornitori di servizi IT e hosting (infrastruttura cloud)</li>
            <li>Corrieri e spedizionieri per la consegna degli ordini</li>
            <li>Consulenti fiscali e legali</li>
            <li>Autorità competenti ove richiesto dalla legge</li>
          </ul>
          <p>I dati non vengono ceduti a terzi per finalità di marketing senza il consenso esplicito dell'interessato.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Diritti dell'Interessato</h2>
          <p>Ai sensi degli artt. 15-22 del GDPR (Regolamento UE 2016/679), l'interessato ha diritto di:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accedere ai propri dati personali</li>
            <li>Richiederne la rettifica o la cancellazione</li>
            <li>Limitare il trattamento o opporsi ad esso</li>
            <li>Richiedere la portabilità dei dati</li>
            <li>Revocare il consenso in qualsiasi momento</li>
            <li>Proporre reclamo al Garante per la Protezione dei Dati Personali</li>
          </ul>
          <p>Per esercitare i propri diritti, scrivere a: <strong>b2b@easysea.org</strong></p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Sicurezza</h2>
          <p>Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita, distruzione o divulgazione, inclusa la crittografia dei dati in transito e a riposo.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;

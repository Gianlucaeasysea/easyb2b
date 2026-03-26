import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 26 Marzo 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Cosa sono i Cookie</h2>
          <p>I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente durante la navigazione. Servono a migliorare l'esperienza di utilizzo del sito e a fornire informazioni al gestore.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Tipologie di Cookie Utilizzati</h2>
          
          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie Tecnici (necessari)</h3>
          <p>Indispensabili per il funzionamento del sito. Includono:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cookie di sessione per l'autenticazione al portale dealer</li>
            <li>Cookie per la gestione del carrello ordini</li>
            <li>Cookie per le preferenze di navigazione (lingua, tema)</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie Analitici</h3>
          <p>Utilizzati per raccogliere informazioni aggregate sull'utilizzo del sito (pagine visitate, durata sessione). Questi dati ci aiutano a migliorare la piattaforma.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie di Terze Parti</h3>
          <p>Il sito potrebbe includere contenuti di terze parti (es. video YouTube/Vimeo) che potrebbero installare propri cookie. Easysea non controlla questi cookie.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Durata dei Cookie</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cookie di sessione:</strong> vengono eliminati alla chiusura del browser</li>
            <li><strong>Cookie persistenti:</strong> rimangono sul dispositivo per un periodo definito (max 12 mesi) o fino alla cancellazione manuale</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Gestione dei Cookie</h2>
          <p>L'utente può gestire le preferenze sui cookie attraverso le impostazioni del proprio browser. La disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento del portale dealer.</p>
          <p>Per maggiori informazioni sulla gestione dei cookie nei principali browser:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Google Chrome: chrome://settings/cookies</li>
            <li>Mozilla Firefox: about:preferences#privacy</li>
            <li>Safari: Preferenze → Privacy</li>
            <li>Microsoft Edge: edge://settings/privacy</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Base Giuridica</h2>
          <p>I cookie tecnici sono installati sulla base del legittimo interesse del Titolare. Per i cookie analitici e di profilazione, ove utilizzati, verrà richiesto il consenso esplicito dell'utente tramite apposito banner.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Contatti</h2>
          <p>Per domande relative alla Cookie Policy: <strong>b2b@easysea.org</strong></p>
          <p>Titolare: Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italia — P.IVA IT15126351004</p>
        </section>
      </div>
    </div>
  </div>
);

export default CookiePolicy;

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Torna alla Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Ultimo aggiornamento: 9 Aprile 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Titolare del Trattamento</h2>
          <p>
            <strong>Easysea Srl</strong> — Startup Innovativa<br />
            Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />
            P.IVA: IT15126351004<br />
            Email: <strong>business@easysea.org</strong>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Cosa sono i Cookie</h2>
          <p>I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente durante la navigazione su un sito web. Servono a migliorare l'esperienza di utilizzo del sito, a memorizzare preferenze e a fornire informazioni utili al gestore del servizio.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Tipologie di Cookie Utilizzati</h2>
          
          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie Tecnici (necessari)</h3>
          <p>Indispensabili per il corretto funzionamento della piattaforma B2B. Non richiedono il consenso dell'utente. Includono:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cookie di sessione per l'autenticazione sicura al portale dealer</li>
            <li>Cookie per la gestione del carrello ordini e delle sessioni di acquisto</li>
            <li>Cookie per le preferenze di navigazione (tema chiaro/scuro)</li>
            <li>Cookie di sicurezza (protezione CSRF, prevenzione accessi non autorizzati)</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie Analitici</h3>
          <p>Utilizzati per raccogliere informazioni aggregate e anonime sull'utilizzo della piattaforma (pagine più visitate, durata media delle sessioni, funzionalità più utilizzate). Questi dati ci permettono di migliorare continuamente il servizio offerto ai nostri dealer.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Cookie di Terze Parti</h3>
          <p>La piattaforma potrebbe includere servizi di terze parti (es. provider di hosting, servizi di analisi) che potrebbero installare propri cookie. Easysea non controlla direttamente questi cookie e invita l'utente a consultare le rispettive informative.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Durata dei Cookie</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cookie di sessione:</strong> vengono automaticamente eliminati alla chiusura del browser</li>
            <li><strong>Cookie persistenti:</strong> rimangono sul dispositivo per un periodo definito (massimo 12 mesi) o fino alla cancellazione manuale da parte dell'utente</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Gestione dei Cookie</h2>
          <p>L'utente può gestire le preferenze sui cookie in qualsiasi momento attraverso le impostazioni del proprio browser. Si precisa che la disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento del portale dealer (impossibilità di effettuare login, perdita del carrello, etc.).</p>
          <p>Istruzioni per la gestione dei cookie nei principali browser:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Google Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
            <li><strong>Mozilla Firefox:</strong> Impostazioni → Privacy e sicurezza → Cookie e dati dei siti web</li>
            <li><strong>Apple Safari:</strong> Preferenze → Privacy → Gestisci dati siti web</li>
            <li><strong>Microsoft Edge:</strong> Impostazioni → Cookie e autorizzazioni sito → Gestisci ed elimina cookie</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Base Giuridica</h2>
          <p>I cookie tecnici sono installati sulla base del legittimo interesse del Titolare, in quanto necessari per l'erogazione del servizio richiesto dall'utente. Per i cookie analitici e di eventuale profilazione, ove utilizzati, verrà richiesto il consenso esplicito dell'utente tramite apposito banner al primo accesso alla piattaforma, in conformità con la normativa italiana (Provvedimento del Garante Privacy n. 229/2014) e il Regolamento UE 2016/679 (GDPR).</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Aggiornamenti</h2>
          <p>La presente Cookie Policy può essere aggiornata periodicamente per riflettere modifiche normative o variazioni nei servizi offerti. L'utente è invitato a consultare periodicamente questa pagina.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Contatti</h2>
          <p>Per domande relative alla Cookie Policy: <strong>business@easysea.org</strong></p>
          <p>Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italia<br />P.IVA IT15126351004</p>
        </section>
      </div>
    </div>
  </div>
);

export default CookiePolicy;

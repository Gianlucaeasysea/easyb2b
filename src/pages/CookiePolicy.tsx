import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: April 9, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Data Controller</h2>
          <p>
            <strong>Easysea Srl</strong> — Italian Innovative Startup<br />
            Via Per Curnasco 52, 24127 Bergamo (BG), Italy<br />
            VAT: IT15126351004<br />
            Email: <strong>business@easysea.org</strong>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. What Are Cookies</h2>
          <p>Cookies are small text files stored on the user's device while browsing a website. They are used to improve the browsing experience, remember preferences and provide useful information to the service provider.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Types of Cookies Used</h2>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Technical Cookies (necessary)</h3>
          <p>Essential for the proper functioning of the B2B platform. They do not require user consent. These include:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Session cookies for secure authentication to the dealer portal</li>
            <li>Cookies for shopping cart management and purchasing sessions</li>
            <li>Cookies for navigation preferences (light/dark theme)</li>
            <li>Security cookies (CSRF protection, unauthorized access prevention)</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Analytical Cookies</h3>
          <p>Used to collect aggregate and anonymous information about platform usage (most visited pages, average session duration, most used features). This data allows us to continuously improve the service offered to our dealers.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground mt-4">Third-Party Cookies</h3>
          <p>The platform may include third-party services (e.g., hosting providers, analytics services) that may install their own cookies. Easysea does not directly control these cookies and encourages users to consult the respective privacy policies.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Cookie Duration</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Session cookies:</strong> automatically deleted when the browser is closed</li>
            <li><strong>Persistent cookies:</strong> remain on the device for a defined period (maximum 12 months) or until manually deleted by the user</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Managing Cookies</h2>
          <p>Users can manage their cookie preferences at any time through their browser settings. Please note that disabling technical cookies may impair the functioning of the dealer portal (inability to log in, loss of shopping cart, etc.).</p>
          <p>Instructions for managing cookies in major browsers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
            <li><strong>Mozilla Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
            <li><strong>Apple Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Legal Basis</h2>
          <p>Technical cookies are installed based on the legitimate interest of the Controller, as they are necessary for providing the service requested by the user. For analytical cookies and any profiling cookies, where used, the user's explicit consent will be requested via a dedicated banner on first access to the platform, in compliance with Italian regulations (Privacy Authority Provision No. 229/2014) and EU Regulation 2016/679 (GDPR).</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Updates</h2>
          <p>This Cookie Policy may be updated periodically to reflect regulatory changes or variations in the services offered. Users are encouraged to review this page regularly.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Contact</h2>
          <p>For questions regarding this Cookie Policy: <strong>business@easysea.org</strong></p>
          <p>Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italy<br />VAT IT15126351004</p>
        </section>
      </div>
    </div>
  </div>
);

export default CookiePolicy;

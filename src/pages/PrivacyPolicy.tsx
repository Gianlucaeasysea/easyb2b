import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: April 9, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. Data Controller</h2>
          <p>
            <strong>Easysea Srl</strong> — Italian Innovative Startup<br />
            Registered office: Via Per Curnasco 52, 24127 Bergamo (BG), Italy<br />
            VAT / Tax ID: IT15126351004<br />
            Share Capital: € 13,781.28 fully paid-in<br />
            Email: <strong>business@easysea.org</strong><br />
            Website: <a href="https://easysea.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">easysea.org</a>
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Data Collected</h2>
          <p>In the course of our B2B distribution of innovative nautical accessories, we collect the following personal data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Identification and business data:</strong> name, surname, company name, VAT number, tax code, type of business activity (nautical shop, charter, shipyard, distributor, etc.)</li>
            <li><strong>Contact data:</strong> business email, phone number, office and/or warehouse address, website</li>
            <li><strong>Browsing data:</strong> IP address, browser type, operating system, pages visited, session duration, technical cookies</li>
            <li><strong>Commercial data:</strong> order history, agreed payment terms, assigned discount class, custom price lists, invoices and shipping documents</li>
            <li><strong>Portal access data:</strong> authentication credentials (email and encrypted password), access logs, user preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Purpose of Processing</h2>
          <p>Personal data is processed for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Management of the B2B contractual relationship, including fulfillment of orders for nautical accessories (boat hook Jake™, winch handle Flipper™, etc.)</li>
            <li>Registration, management and maintenance of the dealer portal account</li>
            <li>Application of customized commercial conditions (price lists, discounts, payment terms)</li>
            <li>Operational communications regarding orders, shipments, product availability and catalog updates</li>
            <li>Commercial and promotional communications about new products, promotions and initiatives (subject to consent where required)</li>
            <li>Accounting, tax and legal compliance</li>
            <li>Platform improvement and aggregate statistical analysis of portal usage</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Legal Basis</h2>
          <p>Data processing is based on:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Performance of contract:</strong> for managing orders, supplying products and providing dealer portal services</li>
            <li><strong>Legal obligations:</strong> for accounting, tax and regulatory compliance (invoice retention, VAT records, etc.)</li>
            <li><strong>Legitimate interest of the Controller:</strong> for service improvement, fraud prevention and platform security</li>
            <li><strong>Consent:</strong> for sending commercial and promotional communications, revocable at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Data Retention</h2>
          <p>Personal data is retained for the time strictly necessary to fulfill the stated purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Contractual and accounting data:</strong> 10 years from the end of the business relationship, as required by Italian tax and civil legislation (Art. 2220 Civil Code)</li>
            <li><strong>Browsing data and cookies:</strong> maximum 24 months from collection</li>
            <li><strong>Dealer portal data:</strong> for the duration of the business relationship and up to 12 months after account closure</li>
            <li><strong>Marketing data:</strong> until consent is withdrawn</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Data Sharing</h2>
          <p>Data may be shared with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>IT service providers, cloud hosting and platform management (technical infrastructure)</li>
            <li>Couriers and shipping carriers for order delivery (domestic and international)</li>
            <li>Tax, accounting and legal advisors of the Controller</li>
            <li>Banking institutions for payment processing</li>
            <li>Competent authorities where required by law</li>
          </ul>
          <p>Data is not shared with third parties for marketing purposes without the explicit consent of the data subject. Data may be transferred to non-EU countries only with adequate safeguards pursuant to Articles 44-49 of the GDPR.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Rights of the Data Subject</h2>
          <p>Pursuant to Articles 15-22 of EU Regulation 2016/679 (GDPR), the data subject has the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access their personal data and obtain a copy</li>
            <li>Request rectification or updating</li>
            <li>Request erasure (right to be forgotten), within the limits provided by law</li>
            <li>Restrict or object to processing</li>
            <li>Request data portability in a structured format</li>
            <li>Withdraw consent at any time, without affecting the lawfulness of processing based on consent given prior to withdrawal</li>
            <li>Lodge a complaint with the Italian Data Protection Authority (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>)</li>
          </ul>
          <p>To exercise your rights, write to: <strong>business@easysea.org</strong></p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Security</h2>
          <p>Easysea Srl adopts appropriate technical and organizational measures to protect personal data from unauthorized access, loss, destruction or disclosure, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
            <li>Secure authentication with encrypted passwords and complexity policies</li>
            <li>Role-Based Access Control (RBAC)</li>
            <li>Monitoring and logging of platform access</li>
            <li>Regular backups and disaster recovery procedures</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;

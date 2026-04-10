import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">Terms & Conditions of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: April 9, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/80">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">1. General Information</h2>
          <p>This website and the B2B platform are operated by:</p>
          <p>
            <strong>Easysea Srl</strong> — Italian Innovative Startup<br />
            Registered office: Via Per Curnasco 52, 24127 Bergamo (BG), Italy<br />
            VAT / Tax ID: IT15126351004<br />
            Share Capital: € 13,781.28 fully paid-in<br />
            Email: <strong>business@easysea.org</strong><br />
            Website: <a href="https://easysea.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">easysea.org</a>
          </p>
          <p>Easysea designs and distributes innovative nautical accessories worldwide, including the boat hook Jake™ and the folding winch handle Flipper™.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">2. Scope of Application</h2>
          <p>These Terms govern access to and use of the Easysea B2B platform, including the dealer portal, product catalog, order system, marketing materials and all related services. Access to the platform is reserved exclusively for business operators (B2B) previously approved by Easysea, such as nautical shops, shipyards, charter companies, distributors and authorized resellers.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">3. Registration and Account</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access to the dealer portal requires completing the "Become a Dealer" form and subsequent approval by Easysea</li>
            <li>Login credentials (email and password) are strictly personal and non-transferable</li>
            <li>The user is responsible for the confidentiality of their credentials and for all activities performed through their account</li>
            <li>Easysea reserves the right to suspend or revoke access in case of violation of these Terms, improper use of the platform or failure to comply with commercial agreements</li>
            <li>The user must promptly communicate any changes to their business data (company name, VAT number, registered office, etc.)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">4. Orders and Pricing</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Prices shown on the portal are B2B prices reserved for approved dealers, stated net of VAT and shipping costs</li>
            <li>Each dealer may be assigned a discount class and/or a custom price list, visible in their portal</li>
            <li>Submitting an order through the portal constitutes a binding purchase proposal by the dealer</li>
            <li>Easysea reserves the right to accept or reject orders at its discretion, based on stock availability, customer creditworthiness and other commercial factors</li>
            <li>Prices may be subject to change without notice; the prices displayed at the time of order confirmation shall prevail</li>
            <li>Minimum order requirements and specific conditions may vary based on individual agreements with each dealer</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">5. Shipping and Delivery</h2>
          <p>Shipments are made through carriers selected by Easysea to domestic and international destinations. Indicated delivery times are estimates and not binding. Easysea is not responsible for delays attributable to the carrier, customs or force majeure events. Shipment tracking, where available, will be communicated to the dealer through the portal and/or via email.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">6. Payments</h2>
          <p>Payment terms (advance bank transfer, 30/60/90 days from invoice date, etc.) are established in the individual commercial agreement between Easysea and the dealer. In case of non-payment within the agreed terms, Easysea reserves the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Suspend supplies and access to the dealer portal</li>
            <li>Apply late payment interest in accordance with applicable legislation (Italian Legislative Decree 231/2002)</li>
            <li>Assign debt recovery to third parties</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">7. Intellectual Property</h2>
          <p>All content on the website and platform (texts, images, logos, registered trademarks — including Jake™ and Flipper™ —, videos, technical sheets, marketing materials, product designs) are the exclusive property of Easysea Srl and are protected by Italian, European and international intellectual property laws. Reproduction, distribution, modification or unauthorized use is prohibited without prior written authorization from Easysea.</p>
          <p>Marketing materials downloadable from the dealer portal are granted under a limited license for the promotion of Easysea products within the agreed territory.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">8. Warranty and Returns</h2>
          <p>Easysea products are covered by the legal warranty of conformity under applicable regulations. Any defects of conformity must be reported in writing to <strong>business@easysea.org</strong> within 8 days of delivery. Return conditions are governed by individual commercial agreements.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">9. Limitation of Liability</h2>
          <p>Easysea does not guarantee uninterrupted availability of the platform and shall not be liable for direct or indirect damages arising from its use or inability to use it, including damages from business interruption, data loss or lost profits, except in cases of willful misconduct or gross negligence as provided by law.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">10. Confidentiality</h2>
          <p>The dealer undertakes to keep confidential all prices, commercial conditions, price lists and any proprietary information accessed through the portal. Violation of this obligation may result in immediate termination of the commercial relationship.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">11. Governing Law and Jurisdiction</h2>
          <p>These Terms are governed by Italian law. Any dispute arising from the interpretation or performance of these Terms shall be subject to the exclusive jurisdiction of the Court of Bergamo, Italy.</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">12. Contact</h2>
          <p>For any questions regarding these Terms:<br /><strong>business@easysea.org</strong></p>
          <p>Easysea Srl — Via Per Curnasco 52, 24127 Bergamo (BG), Italy<br />VAT IT15126351004</p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;

import { HelpCircle } from "lucide-react";

const DealerSupport = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Support</h1>
    <p className="text-sm text-muted-foreground mb-8">Need help? Contact your account manager</p>
    <div className="glass-card-solid p-8">
      <HelpCircle className="text-primary mb-4" size={32} />
      <h3 className="font-heading text-lg font-bold text-foreground mb-2">Contact Easysea Support</h3>
      <p className="text-sm text-muted-foreground mb-4">Our team is available Monday-Friday, 9:00-18:00 CET</p>
      <p className="text-sm text-foreground">📧 b2b@easysea.org</p>
      <p className="text-sm text-foreground">📱 WhatsApp: +39 02 1234567</p>
    </div>
  </div>
);

export default DealerSupport;

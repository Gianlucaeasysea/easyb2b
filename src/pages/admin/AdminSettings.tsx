import { Settings } from "lucide-react";

const AdminSettings = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Settings</h1>
    <p className="text-sm text-muted-foreground mb-8">Platform configuration</p>
    <div className="space-y-4">
      <div className="glass-card-solid p-6">
        <h3 className="font-heading font-bold text-foreground mb-2">Shopify Integration</h3>
        <p className="text-sm text-muted-foreground">Connect your Shopify store to sync products, pricing, and inventory.</p>
      </div>
      <div className="glass-card-solid p-6">
        <h3 className="font-heading font-bold text-foreground mb-2">Discount Classes</h3>
        <p className="text-sm text-muted-foreground">Configure discount tiers: A (-30%), B (-20%), C (-15%), D (-10%)</p>
      </div>
      <div className="glass-card-solid p-6">
        <h3 className="font-heading font-bold text-foreground mb-2">Notifications</h3>
        <p className="text-sm text-muted-foreground">Configure email, WhatsApp, and in-app notification settings.</p>
      </div>
    </div>
  </div>
);

export default AdminSettings;

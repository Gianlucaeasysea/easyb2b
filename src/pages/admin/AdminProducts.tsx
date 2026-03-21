import { Package } from "lucide-react";

const AdminProducts = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Products</h1>
    <p className="text-sm text-muted-foreground mb-8">Manage B2B product catalog (synced from Shopify)</p>
    <div className="text-center py-20 glass-card-solid">
      <Package className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">Products will be synced from your Shopify store. Configure the integration in Settings.</p>
    </div>
  </div>
);

export default AdminProducts;

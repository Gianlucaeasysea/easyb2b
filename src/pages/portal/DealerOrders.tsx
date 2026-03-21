import { ShoppingBag } from "lucide-react";

const DealerOrders = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">My Orders</h1>
    <p className="text-sm text-muted-foreground mb-8">View and track all your B2B orders</p>
    <div className="text-center py-20 glass-card-solid">
      <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">No orders yet. Browse the catalog to place your first order.</p>
    </div>
  </div>
);

export default DealerOrders;

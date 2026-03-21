import { Megaphone } from "lucide-react";

const DealerPromos = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Promotions</h1>
    <p className="text-sm text-muted-foreground mb-8">Active promotions and special offers for your tier</p>
    <div className="text-center py-20 glass-card-solid">
      <Megaphone className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">No active promotions at the moment. Check back soon!</p>
    </div>
  </div>
);

export default DealerPromos;

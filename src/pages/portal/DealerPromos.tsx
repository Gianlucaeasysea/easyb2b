import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Clock, Percent, Gift, ArrowRight, Sparkles } from "lucide-react";

const promos = [
  {
    id: 1,
    title: "Spring Season Kickoff",
    description: "Get an extra 10% off on all Cleaning products. Stock up before the boating season starts!",
    discount: "Extra 10%",
    category: "Cleaning",
    validUntil: "April 30, 2026",
    code: "SPRING10",
    active: true,
    featured: true,
  },
  {
    id: 2,
    title: "Complete Care Kit Bundle",
    description: "Order 3+ Complete Care Kits and get a 4th one free. Perfect for retail display.",
    discount: "Buy 3 Get 1",
    category: "Kits",
    validUntil: "May 15, 2026",
    code: "KIT4FREE",
    active: true,
    featured: false,
  },
  {
    id: 3,
    title: "Volume Tier Upgrade",
    description: "Place orders totaling €3,000+ this month and unlock Class B pricing permanently.",
    discount: "Tier Upgrade",
    category: "All Products",
    validUntil: "March 31, 2026",
    code: null,
    active: true,
    featured: false,
  },
  {
    id: 4,
    title: "New Product Launch — UV Protectant",
    description: "Introductory 25% off on the new UV Protectant Spray for the first 30 days after launch.",
    discount: "25% Off",
    category: "Protection",
    validUntil: "April 20, 2026",
    code: "UVLAUNCH",
    active: true,
    featured: false,
  },
  {
    id: 5,
    title: "Winter Clearance — Teak Oil",
    description: "Last season Teak Oil 1L at 40% off. Limited stock available.",
    discount: "40% Off",
    category: "Wood Care",
    validUntil: "Expired",
    code: "WINTER40",
    active: false,
    featured: false,
  },
];

const DealerPromos = () => {
  const activePromos = promos.filter(p => p.active);
  const expiredPromos = promos.filter(p => !p.active);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Promotions</h1>
        <p className="text-sm text-muted-foreground">Active promotions and special offers for your tier</p>
      </div>

      {/* Featured Promo */}
      {activePromos.filter(p => p.featured).map(promo => (
        <div key={promo.id} className="glass-card-solid p-6 mb-6 border border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 gradient-blue opacity-10 blur-[60px]" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl gradient-blue flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-primary-foreground" size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-lg font-bold text-foreground">{promo.title}</h3>
                <Badge className="bg-primary/20 text-primary border-0 text-xs">Featured</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-xs border-success text-success gap-1">
                  <Percent size={10} /> {promo.discount}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} /> Valid until {promo.validUntil}
                </span>
                {promo.code && (
                  <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-foreground">
                    Code: {promo.code}
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 gap-1 font-heading font-semibold flex-shrink-0">
              Shop Now <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ))}

      {/* Active Promos Grid */}
      <h2 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Active Offers ({activePromos.length})</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {activePromos.filter(p => !p.featured).map(promo => (
          <div key={promo.id} className="glass-card-solid p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                {promo.discount.includes("Buy") ? <Gift size={18} className="text-primary" /> : <Percent size={18} className="text-primary" />}
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-foreground text-sm">{promo.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3">{promo.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-xs border-success text-success">{promo.discount}</Badge>
                  <span className="text-xs text-muted-foreground">{promo.category}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} /> {promo.validUntil}
                  </span>
                </div>
                {promo.code && (
                  <div className="mt-2">
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-foreground">Code: {promo.code}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expired */}
      {expiredPromos.length > 0 && (
        <>
          <h2 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Expired</h2>
          <div className="space-y-2">
            {expiredPromos.map(promo => (
              <div key={promo.id} className="glass-card-solid p-4 opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Megaphone size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{promo.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DealerPromos;

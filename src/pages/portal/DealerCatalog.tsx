import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientMode } from "@/contexts/ClientModeContext";
import { Package, Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const DealerCatalog = () => {
  const { user } = useAuth();
  const { isClientMode } = useClientMode();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem, totalItems } = useCart();

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active_b2b", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const discountPct = { A: 30, B: 25, C: 20, D: 15 }[client?.discount_class || "D"] || 15;
  const categories = [...new Set(products?.map(p => p.category).filter(Boolean))] as string[];

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCat;
  }) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isClientMode ? "Our Products" : "Product Catalog"}
          </h1>
          {isClientMode ? (
            <p className="text-sm text-muted-foreground">Retail prices shown</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your B2B pricing: <span className="text-success font-semibold">-{discountPct}%</span> (Class {client?.discount_class || "D"})
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} products</Badge>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search by name or SKU..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={`rounded-lg text-xs ${!selectedCategory ? "bg-foreground text-background" : ""}`}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg text-xs ${selectedCategory === cat ? "bg-foreground text-background" : ""}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => {
            const retailPrice = Number(p.compare_at_price || p.price);
            const b2bPrice = Number(p.price) * (1 - discountPct / 100);
            const inStock = (p.stock_quantity ?? 0) > 0;

            return (
              <div key={p.id} className="glass-card-solid overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="aspect-square bg-secondary flex items-center justify-center relative">
                  {p.images && p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="text-muted-foreground" size={40} />
                  )}
                  {p.category && (
                    <Badge className="absolute top-2 left-2 text-[10px] bg-background/80 text-foreground border-0 backdrop-blur-sm">
                      {p.category}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{p.name}</h3>
                  {!isClientMode && p.sku && <p className="text-xs font-mono text-muted-foreground mb-1">{p.sku}</p>}
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}

                  {isClientMode ? (
                    /* CLIENT MODE: show only retail price */
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-heading text-lg font-bold text-foreground">€{retailPrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Retail price</p>
                      </div>
                      <span className={`text-xs font-heading font-semibold ${inStock ? "text-success" : "text-destructive"}`}>
                        {inStock ? "Available" : "Out of stock"}
                      </span>
                    </div>
                  ) : (
                    /* DEALER MODE: show B2B price with discount */
                    <>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground line-through">€{Number(p.price).toFixed(2)}</p>
                          <p className="font-heading text-lg font-bold text-foreground">€{b2bPrice.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-heading font-semibold ${inStock ? "text-success" : "text-destructive"}`}>
                            {inStock ? `${p.stock_quantity} in stock` : "Out of stock"}
                          </span>
                        </div>
                      </div>
                      <Button
                        disabled={!inStock}
                        size="sm"
                        className="w-full mt-3 rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold text-xs"
                      >
                        <ShoppingCart size={14} /> Add to Order
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerCatalog;

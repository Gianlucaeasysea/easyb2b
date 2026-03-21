import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const DealerCatalog = () => {
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active_b2b", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = products?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">Browse products with your B2B pricing</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search products..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No products found. The catalog will be synced from Shopify.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="glass-card-solid overflow-hidden group">
              <div className="aspect-square bg-secondary flex items-center justify-center">
                {p.images && p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-muted-foreground" size={40} />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-semibold text-foreground">{p.name}</h3>
                {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="font-heading font-bold text-foreground">€{Number(p.price).toFixed(2)}</p>
                  <span className={`text-xs font-heading font-semibold ${(p.stock_quantity ?? 0) > 0 ? "text-success" : "text-destructive"}`}>
                    {(p.stock_quantity ?? 0) > 0 ? `${p.stock_quantity} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerCatalog;

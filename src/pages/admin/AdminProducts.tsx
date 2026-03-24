import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active_b2b: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Prodotto aggiornato");
    },
  });

  const syncShopify = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync");
      if (error) throw error;

      const variants = data.products || [];
      let upserted = 0;
      for (const v of variants) {
        const { error: upsertErr } = await supabase.from("products").upsert(
          {
            shopify_id: v.shopify_variant_id,
            name: v.variant_title,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compare_at_price,
            stock_quantity: v.inventory_quantity,
            images: v.image ? [v.image] : null,
            active_b2b: true,
          } as any,
          { onConflict: "shopify_id" }
        );
        if (!upsertErr) upserted++;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(`Sincronizzati ${upserted} prodotti da Shopify`);
    } catch (err: any) {
      toast.error("Errore sync: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage B2B product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={syncShopify} disabled={syncing} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync..." : "Sync Shopify"}
          </Button>
          <Badge variant="outline" className="text-xs">{products?.length || 0} products</Badge>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search by name, SKU, or category..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Package className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Retail</TableHead>
                <TableHead className="text-xs text-right">Stock</TableHead>
                <TableHead className="text-xs">B2B Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-heading font-semibold text-sm">{p.name}</span>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell>
                    {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">€{Number(p.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">€{Number(p.compare_at_price || p.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-semibold ${(p.stock_quantity ?? 0) > 0 ? "text-success" : "text-destructive"}`}>
                      {p.stock_quantity ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: p.id, active: !p.active_b2b })}
                      className={`text-xs ${p.active_b2b ? "text-success" : "text-muted-foreground"}`}
                    >
                      {p.active_b2b ? "Active" : "Inactive"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;

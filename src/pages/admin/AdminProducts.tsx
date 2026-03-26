import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, RefreshCw, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Same mapping function
const getProductFamily = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes("kit easybarber")) return "kit-easybarber";
  if (n.includes("kit easyfurling")) return "kit-easyfurling";
  if (n.includes("kit easypreventer")) return "kit-easypreventer";
  if (n.includes("rope deflector")) return "rope-deflector";
  if (n.includes("way2") || n.includes("gangway")) return "way2";
  if (n.includes("spira") || n.includes("guardrail cover")) return "spira";
  if (n.includes("winch cover")) return "winch-cover";
  if (n.includes("flipper") && n.includes("carbon")) return "flipper-carbon";
  if (n.includes("flipper") && n.includes("max")) return "flipper-max";
  if (n.includes("flipper")) return "flipper";
  if (n.includes("snatch") || (n.includes("olli") && n.includes("block"))) return "olli-block";
  if (n.includes("solid ring")) return "olli-solid-ring";
  if (n.includes("low friction ring") || (n.includes("olli") && n.includes("ring"))) return "olli-ring";
  if (n.includes("sheathed loop")) return "sheathed-loop";
  if (n.includes("soft shackle")) return "soft-shackle";
  if (n.includes("covered loop")) return "covered-loop";
  if (n.includes("dyneema sheet") && n.includes("eye")) return "dyneema-sheet-eye";
  if (n.includes("dyneema sheet")) return "dyneema-sheet";
  if (n.includes("polyester sheet") && n.includes("eye")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet") && n.includes("olli")) return "polyester-sheet-eye";
  if (n.includes("polyester sheet")) return "polyester-sheet";
  if (n.includes("boat hook head") || n.includes("brush head") || n.includes("line-passing") || n.includes("linemaster") || n.includes("short pole") || n.includes("quick-release") || n.includes("fidlock")) return "jake-head";
  if (n.includes("jake")) return "jake";
  return null;
};

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"families" | "variants">("families");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: productDetails } = useQuery({
    queryKey: ["product-details"],
    queryFn: async () => {
      const { data } = await supabase.from("product_details").select("*").order("display_name");
      return data || [];
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
      const variants = (data.products || []).map((v: any) => ({
        shopify_id: v.shopify_variant_id,
        name: v.variant_title,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock_quantity: v.inventory_quantity,
        images: v.image ? [v.image] : null,
        active_b2b: true,
      }));
      if (variants.length > 0) {
        const { error: upsertErr } = await supabase.from("products").upsert(variants as any, { onConflict: "shopify_id" });
        if (upsertErr) throw upsertErr;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(`Sincronizzati ${variants.length} prodotti da Shopify`);
    } catch (err: any) {
      toast.error("Errore sync: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Build family data
  const familyMap = new Map<string, { detail: any; variants: any[]; totalStock: number; image: string | null }>();
  productDetails?.forEach(d => {
    familyMap.set(d.product_family, {
      detail: d,
      variants: [],
      totalStock: 0,
      image: (d.gallery_images as string[])?.[0] || null,
    });
  });

  products?.forEach(p => {
    const fam = getProductFamily(p.name);
    if (fam && familyMap.has(fam)) {
      const entry = familyMap.get(fam)!;
      entry.variants.push(p);
      entry.totalStock += (p.stock_quantity ?? 0);
      if (!entry.image && p.images?.[0]) entry.image = p.images[0];
    }
  });

  const familyEntries = Array.from(familyMap.entries()).filter(([key, val]) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return val.detail.display_name.toLowerCase().includes(s) ||
      key.includes(s) ||
      val.variants.some(v => v.sku?.toLowerCase().includes(s) || v.name.toLowerCase().includes(s));
  });

  const filteredVariants = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    (p as any).barcode?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage B2B product catalog & details</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("families")}
              className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                viewMode === "families" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Families ({productDetails?.length || 0})
            </button>
            <button
              onClick={() => setViewMode("variants")}
              className={`px-3 py-1.5 text-xs font-heading font-semibold transition-colors ${
                viewMode === "variants" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Variants ({products?.length || 0})
            </button>
          </div>
          <Button onClick={syncShopify} disabled={syncing} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync..." : "Sync Shopify"}
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search by name, SKU, or family..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : viewMode === "families" ? (
        /* Product Families View */
        familyEntries.length === 0 ? (
          <div className="text-center py-20 glass-card-solid">
            <Package className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground">No product families found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {familyEntries.map(([key, { detail, variants, totalStock, image }]) => {
              const hasSpecs = Object.keys((detail.specifications as Record<string, string>) || {}).length > 0;
              const hasDesc = !!detail.description;
              const hasTechSheet = !!detail.technical_sheet_url;

              return (
                <div
                  key={key}
                  className="glass-card-solid overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/products/${key}`)}
                >
                  <div className="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                    {image ? (
                      <img src={image} alt={detail.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-muted-foreground" size={40} />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {hasTechSheet && (
                        <Badge className="bg-primary/90 text-primary-foreground border-0 text-[9px]">
                          <FileText size={10} className="mr-0.5" /> PDF
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {detail.display_name}
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">{key}</p>

                    <div className="flex gap-1.5 flex-wrap mb-3">
                      <Badge variant="outline" className="text-[9px]">
                        {variants.length} variant{variants.length !== 1 ? "s" : ""}
                      </Badge>
                      {hasDesc && <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">Description</Badge>}
                      {hasSpecs && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">Specs</Badge>}
                      {!hasDesc && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">No Description</Badge>}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${totalStock > 0 ? "text-success" : "text-muted-foreground"}`}>
                        {totalStock} total stock
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* All Variants View */
        !filteredVariants.length ? (
          <div className="text-center py-20 glass-card-solid">
            <Package className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="glass-card-solid overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-heading text-muted-foreground">Product</th>
                  <th className="text-left p-3 text-xs font-heading text-muted-foreground">SKU</th>
                  <th className="text-left p-3 text-xs font-heading text-muted-foreground">Barcode</th>
                  <th className="text-left p-3 text-xs font-heading text-muted-foreground">Family</th>
                  <th className="text-right p-3 text-xs font-heading text-muted-foreground">Price</th>
                  <th className="text-right p-3 text-xs font-heading text-muted-foreground">Stock</th>
                  <th className="text-left p-3 text-xs font-heading text-muted-foreground">B2B</th>
                </tr>
              </thead>
              <tbody>
                {filteredVariants.map(p => {
                  const fam = getProductFamily(p.name);
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <span className="font-heading font-semibold text-sm text-foreground">{p.name}</span>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.sku || "—"}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{(p as any).barcode || "—"}</td>
                      <td className="p-3">
                        {fam ? (
                          <button
                            onClick={() => navigate(`/admin/products/${fam}`)}
                            className="text-xs text-primary hover:underline font-mono"
                          >
                            {fam}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-sm">€{Number(p.price || 0).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <span className={`text-xs font-semibold ${(p.stock_quantity ?? 0) > 0 ? "text-success" : "text-destructive"}`}>
                          {p.stock_quantity ?? 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive.mutate({ id: p.id, active: !p.active_b2b })}
                          className={`text-xs ${p.active_b2b ? "text-success" : "text-muted-foreground"}`}
                        >
                          {p.active_b2b ? "Active" : "Inactive"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default AdminProducts;

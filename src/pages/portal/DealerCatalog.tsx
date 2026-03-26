import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientMode } from "@/contexts/ClientModeContext";
import { Package, Search, ShoppingCart, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ProductDetailModal from "@/components/portal/ProductDetailModal";

// Map product names to product_family slugs
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

const DealerCatalog = () => {
  const { user } = useAuth();
  const { isClientMode } = useClientMode();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem, totalItems, items: cartItems } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Get price lists assigned to this client via junction table
  const { data: myPriceListItems } = useQuery({
    queryKey: ["my-price-list-items", client?.id],
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("price_list_clients")
        .select("price_list_id")
        .eq("client_id", client!.id);
      
      if (!assignments?.length) return [];

      const plIds = assignments.map(a => a.price_list_id);
      const { data: items, error } = await supabase
        .from("price_list_items")
        .select("*, products(*)")
        .in("price_list_id", plIds);
      
      if (error) throw error;
      return items || [];
    },
    enabled: !!client?.id,
  });

  // Fetch all product details
  const { data: productDetails } = useQuery({
    queryKey: ["product-details"],
    queryFn: async () => {
      const { data } = await supabase.from("product_details").select("*");
      return data || [];
    },
  });

  const detailsByFamily = new Map<string, any>();
  productDetails?.forEach(d => detailsByFamily.set(d.product_family, d));

  const getDetailForProduct = (product: any) => {
    const family = getProductFamily(product.name);
    return family ? detailsByFamily.get(family) : null;
  };

  // Build product map from price list items
  const priceListProductMap = new Map<string, { customPrice: number; product: any }>();
  myPriceListItems?.forEach(item => {
    const existing = priceListProductMap.get(item.product_id);
    if (!existing || item.custom_price < existing.customPrice) {
      priceListProductMap.set(item.product_id, {
        customPrice: item.custom_price,
        product: (item as any).products,
      });
    }
  });

  const hasPriceList = priceListProductMap.size > 0;
  const catalogProducts = hasPriceList
    ? Array.from(priceListProductMap.entries()).map(([id, { product }]) => product).filter(Boolean)
    : [];

  const MACRO_CATEGORIES = [
    { label: "Boat Hook", keywords: ["boat hook", "jake"] },
    { label: "Winch Handles", keywords: ["winch handle", "flipper"] },
    { label: "Rings & Blocks", keywords: ["ring", "block", "olli"] },
    { label: "Textile", keywords: ["textile", "dyneema", "loop", "shackle", "sheet"] },
    { label: "Covers & Guards", keywords: ["cover", "guard", "spira"] },
    { label: "Inflatable", keywords: ["inflatable", "way2", "gangway"] },
    { label: "Kits", keywords: ["kit"] },
  ];

  const getProductMacroCategory = (p: { name: string; category?: string | null }) => {
    const text = `${p.name} ${p.category || ""}`.toLowerCase();
    return MACRO_CATEGORIES.find(cat => cat.keywords.some(kw => text.includes(kw)))?.label || null;
  };

  const filtered = catalogProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !selectedCategory || getProductMacroCategory(p) === selectedCategory;
    return matchSearch && matchCat;
  });

  const categoryCounts = MACRO_CATEGORIES.map(cat => ({
    ...cat,
    count: catalogProducts.filter(p => getProductMacroCategory(p) === cat.label).length,
  })).filter(c => c.count > 0);

  const selectedDetail = selectedProduct ? getDetailForProduct(selectedProduct) : null;
  const selectedPlEntry = selectedProduct ? priceListProductMap.get(selectedProduct.id) : null;
  const selectedRetailPrice = selectedProduct ? Number(selectedProduct.compare_at_price || selectedProduct.price) : 0;
  const selectedB2bPrice = selectedPlEntry?.customPrice ?? Number(selectedProduct?.price || 0);
  const selectedDiscountPct = selectedRetailPrice > 0 ? Math.round((1 - selectedB2bPrice / Number(selectedProduct?.price || 1)) * 100) : 0;

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
              {hasPriceList
                ? `Your personalized B2B catalog — ${catalogProducts.length} products`
                : "No price list assigned yet. Contact your sales rep."}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <Link to="/portal/cart">
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold text-xs gap-1.5 rounded-lg">
                <ShoppingCart size={14} />
                Cart ({totalItems})
              </Button>
            </Link>
          )}
          <Badge variant="outline" className="text-xs">{filtered.length} products</Badge>
        </div>
      </div>

      {!hasPriceList ? (
        <div className="text-center py-20">
          <Package className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No price list has been assigned to your account yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Please contact your sales representative.</p>
        </div>
      ) : (
        <>
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
              {categoryCounts.map(cat => (
                <Button
                  key={cat.label}
                  variant={selectedCategory === cat.label ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.label)}
                  className={`rounded-lg text-xs ${selectedCategory === cat.label ? "bg-foreground text-background" : ""}`}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">No products found.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => {
                const plEntry = priceListProductMap.get(p.id);
                const retailPrice = Number(p.compare_at_price || p.price);
                const b2bPrice = plEntry?.customPrice ?? Number(p.price);
                const discountPct = retailPrice > 0 ? Math.round((1 - b2bPrice / Number(p.price)) * 100) : 0;
                const inStock = (p.stock_quantity ?? 0) > 0;
                const detail = getDetailForProduct(p);
                const leadTime = (detail as any)?.lead_time;

                return (
                  <div
                    key={p.id}
                    className="glass-card-solid overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedProduct(p)}
                  >
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
                      {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                      {(p as any).barcode && <p className="text-xs font-mono text-muted-foreground mb-1">EAN: {(p as any).barcode}</p>}
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}

                      {isClientMode ? (
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="font-heading text-lg font-bold text-foreground">€{retailPrice.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Retail price</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-heading font-bold ${inStock ? "text-success" : "text-destructive"}`}>
                              {inStock ? "Available" : "Esaurito"}
                            </span>
                            {!inStock && leadTime && (
                              <p className="text-[10px] font-semibold text-destructive/80">Rientro: {leadTime}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground line-through">€{Number(p.price).toFixed(2)}</p>
                              <p className="font-heading text-lg font-bold text-foreground">€{b2bPrice.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              {discountPct > 0 && (
                                <Badge variant="outline" className="text-[10px] bg-success/20 text-success border-0 mb-1">-{discountPct}%</Badge>
                              )}
                              <span className={`block text-xs font-heading font-bold ${inStock ? "text-success" : "text-destructive"}`}>
                                {inStock ? `${p.stock_quantity} in stock` : "Esaurito"}
                              </span>
                              {!inStock && leadTime && (
                                <span className="block text-[11px] font-semibold text-destructive/80">Rientro: {leadTime}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              disabled={!inStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                const curr = quantities[p.id] || 1;
                                if (curr > 1) setQuantities(prev => ({ ...prev, [p.id]: curr - 1 }));
                              }}
                            >
                              <Minus size={12} />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={p.stock_quantity ?? 999}
                              value={quantities[p.id] || 1}
                              onChange={(e) => {
                                e.stopPropagation();
                                const val = Math.max(1, Math.min(parseInt(e.target.value) || 1, p.stock_quantity ?? 999));
                                setQuantities(prev => ({ ...prev, [p.id]: val }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-14 text-center h-8 text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              disabled={!inStock || (quantities[p.id] || 1) >= (p.stock_quantity ?? 999)}
                              onClick={(e) => {
                                e.stopPropagation();
                                const curr = quantities[p.id] || 1;
                                setQuantities(prev => ({ ...prev, [p.id]: Math.min(curr + 1, p.stock_quantity ?? 999) }));
                              }}
                            >
                              <Plus size={12} />
                            </Button>
                            <Button
                              disabled={!inStock}
                              size="sm"
                              className="flex-1 rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                const qty = quantities[p.id] || 1;
                                addItem({
                                  productId: p.id,
                                  name: p.name,
                                  sku: p.sku,
                                  unitPrice: Number(p.price),
                                  b2bPrice,
                                  discountPct,
                                  stock: p.stock_quantity ?? 0,
                                  image: p.images?.[0] || null,
                                  quantity: qty,
                                });
                                toast.success(`${qty}x ${p.name} added`);
                                setQuantities(prev => ({ ...prev, [p.id]: 1 }));
                              }}
                            >
                              <ShoppingCart size={12} /> Add
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
          detail={selectedDetail}
          b2bPrice={selectedB2bPrice}
          retailPrice={selectedRetailPrice}
          discountPct={selectedDiscountPct}
          isClientMode={isClientMode}
          onAddToCart={() => {
            const plEntry = priceListProductMap.get(selectedProduct.id);
            const b2bPrice = plEntry?.customPrice ?? Number(selectedProduct.price);
            const discountPct = Number(selectedProduct.price) > 0 ? Math.round((1 - b2bPrice / Number(selectedProduct.price)) * 100) : 0;
            addItem({
              productId: selectedProduct.id,
              name: selectedProduct.name,
              sku: selectedProduct.sku,
              unitPrice: Number(selectedProduct.price),
              b2bPrice,
              discountPct,
              stock: selectedProduct.stock_quantity ?? 0,
              image: selectedProduct.images?.[0] || null,
            });
            toast.success(`${selectedProduct.name} added to cart`);
          }}
        />
      )}
    </div>
  );
};

export default DealerCatalog;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientMode } from "@/contexts/ClientModeContext";
import { AnimatePresence } from "framer-motion";
import { Package, Search, ShoppingCart, ShoppingBag, Minus, Plus, LayoutGrid, List, Check, Users } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ProductDetailModal from "@/components/portal/ProductDetailModal";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { CatalogSkeleton } from "@/components/portal/ui/PortalSkeleton";

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
  const { isClientMode, toggleClientMode } = useClientMode();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem, totalItems } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("catalog_view_mode");
    return saved === "list" ? "list" : "grid";
  });
  const [showRetailPrices, setShowRetailPrices] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("catalog_view_mode", mode);
  };

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get price lists assigned to this client via junction table
  const { data: myPriceListItems, isLoading: loadingPriceList } = useQuery({
    queryKey: ["my-price-list-items", client?.id],
    queryFn: async () => {
      // Prefer the primary price list; fall back to all assigned lists
      const { data: primaryAssignment } = await supabase
        .from("price_list_clients")
        .select("price_list_id")
        .eq("client_id", client!.id)
        .eq("is_primary", true)
        .maybeSingle();

      let plIds: string[];
      if (primaryAssignment) {
        plIds = [primaryAssignment.price_list_id];
      } else {
        const { data: allAssignments } = await supabase
          .from("price_list_clients")
          .select("price_list_id")
          .eq("client_id", client!.id);
        if (!allAssignments?.length) return [];
        plIds = allAssignments.map(a => a.price_list_id);
      }

      const { data: items, error } = await supabase
        .from("price_list_items")
        .select("*, products!inner(*)")
        .in("price_list_id", plIds);

      if (error) throw error;
      // Only keep items where the product exists and is active for B2B
      return (items || []).filter((item: any) => item.products && item.products.active_b2b === true);
    },
    enabled: !!client?.id,
  });

  // Fetch product details for enrichment
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

  // FIX 1 & 2: If no price list assigned, show empty state — never show fake products
  if (!loadingPriceList && myPriceListItems !== undefined && !hasPriceList) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Product Catalog</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Catalog not yet available</h2>
          <p className="text-muted-foreground max-w-md">
            Your personalized price list has not been assigned yet.
            Contact your sales representative or write to business@easysea.org to activate your catalog.
          </p>
        </div>
      </div>
    );
  }

  // Only show products from the price list (active_b2b already filtered above)
  const catalogProducts = Array.from(priceListProductMap.entries())
    .map(([, { product }]) => product)
    .filter(Boolean);

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
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase())) || ((p as any).barcode?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !selectedCategory || getProductMacroCategory(p) === selectedCategory;
    return matchSearch && matchCat;
  });

  const categoryCounts = MACRO_CATEGORIES.map(cat => ({
    ...cat,
    count: catalogProducts.filter(p => getProductMacroCategory(p) === cat.label).length,
  })).filter(c => c.count > 0);

  const selectedDetail = selectedProduct ? getDetailForProduct(selectedProduct) : null;
  const selectedPlEntry = selectedProduct ? priceListProductMap.get(selectedProduct.id) : null;
  const selectedRetailPriceGross = selectedProduct ? Number(selectedProduct.compare_at_price || selectedProduct.price) : 0;
  const selectedRetailPrice = selectedRetailPriceGross / 1.22; // scorporo IVA 22%
  
  const selectedB2bPrice = selectedPlEntry?.customPrice ?? 0;
  const selectedHasValidPrice = selectedB2bPrice > 0;
  const selectedDiscountPct = selectedHasValidPrice && selectedRetailPrice > 0 && selectedB2bPrice < selectedRetailPrice
    ? Math.round((1 - selectedB2bPrice / selectedRetailPrice) * 100)
    : 0;

  const handleAddToCart = (p: any) => {
    const plEntry = priceListProductMap.get(p.id);
    if (!plEntry || !plEntry.customPrice || plEntry.customPrice <= 0) {
      toast.error("This product has no valid B2B price in your price list");
      return;
    }
    const b2bPrice = plEntry.customPrice;
    const retailPriceGross = Number(p.compare_at_price || p.price || 0);
    const retailPrice = retailPriceGross / 1.22; // scorporo IVA 22%
    const discountPct = retailPrice > 0 && b2bPrice < retailPrice ? Math.round((1 - b2bPrice / retailPrice) * 100) : 0;
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
    setJustAdded(p.id);
    setTimeout(() => setJustAdded(null), 1200);
    setQuantities(prev => ({ ...prev, [p.id]: 1 }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isClientMode ? "Our Products" : "Product Catalog"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isClientMode
              ? "Retail prices shown"
              : `Your personalized B2B catalog — ${catalogProducts.length} products`}
          </p>
        </div>
        {!isClientMode && totalItems > 0 && (
          <div className="flex items-center gap-2">
            <Link to="/portal/cart">
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold text-xs gap-1.5 rounded-lg">
                <ShoppingCart size={14} />
                Cart (<span data-testid="cart-badge">{totalItems}</span>)
              </Button>
            </Link>
            <Badge variant="outline" className="text-xs">{filtered.length} products</Badge>
          </div>
        )}
        {isClientMode && (
          <Badge variant="outline" className="text-xs">{filtered.length} products</Badge>
        )}
      </div>

      {/* Client Mode Banner */}
      <AnimatePresence>
        {isClientMode && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4"
          >
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">Modalità Cliente attiva</p>
              <p className="text-xs text-muted-foreground">Stai visualizzando i prezzi pubblici del sito — sconti dealer nascosti</p>
            </div>
            <button
              onClick={toggleClientMode}
              className="text-xs text-primary hover:text-primary/70 font-medium flex-shrink-0"
            >
              Esci
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search, Filters, View Toggle, Retail Toggle */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search by name or SKU..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* View mode toggle */}
        {!isClientMode && (
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("grid")}
              className={viewMode === "grid" ? "bg-foreground text-background" : ""}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("list")}
              className={viewMode === "list" ? "bg-foreground text-background" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Retail price toggle */}
        {!isClientMode && (
          <div className="flex items-center gap-2">
            <Switch
              checked={showRetailPrices}
              onCheckedChange={setShowRetailPrices}
              id="retail-toggle"
            />
            <Label htmlFor="retail-toggle" className="text-sm cursor-pointer">Retail prices</Label>
          </div>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap mb-6">
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

      {loadingPriceList ? (
        <CatalogSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No products found.</p>
        </div>
      ) : viewMode === "list" && !isClientMode ? (
        /* LIST VIEW */
        <div className="space-y-0 border rounded-lg overflow-hidden">
          {filtered.map((p, i) => {
            const plEntry = priceListProductMap.get(p.id);
            const b2bPrice = plEntry?.customPrice ?? 0;
            const hasValidPrice = b2bPrice != null && b2bPrice > 0;
            const retailPriceGross = Number(p.compare_at_price || p.price || 0);
            const retailPrice = retailPriceGross / 1.22; // scorporo IVA 22%
            const discountPct = hasValidPrice && retailPrice > 0 && b2bPrice < retailPrice
              ? Math.round((1 - b2bPrice / retailPrice) * 100) : 0;
            const inStock = p.stock_quantity === null || p.stock_quantity > 0;
            const detail = getDetailForProduct(p);
            const leadTime = (detail as any)?.lead_time;

            return (
              <div
                key={p.id}
                data-testid="product-card"
                className={`flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors ${i > 0 ? "border-t" : ""}`}
                onClick={() => setSelectedProduct(p)}
              >
                {/* Image */}
                <div className="w-12 h-12 rounded bg-secondary flex-shrink-0 overflow-hidden">
                  <OptimizedImage
                    src={p.images?.[0]}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                </div>

                {/* Name + SKU */}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-semibold text-foreground truncate">{p.name}</p>
                  {p.sku && <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>}
                </div>

                {/* Stock */}
                <div className="flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] border-0 ${
                      !inStock ? "bg-destructive/10 text-destructive" :
                      (p.stock_quantity ?? 0) < 10 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-success/10 text-success"
                    }`}
                  >
                    {!inStock ? "Out of Stock" : (p.stock_quantity ?? 0) < 10 ? "Low Stock" : "In Stock"}
                  </Badge>
                  {!inStock && leadTime && (
                    <p className="text-[10px] text-destructive/80 font-semibold mt-0.5">{leadTime}</p>
                  )}
                </div>

                {/* Retail price (conditional) */}
                {showRetailPrices && (
                  <div className="flex-shrink-0 text-right w-20">
                    <p className="text-xs text-muted-foreground">Retail</p>
                    <p className="text-sm text-muted-foreground">€{retailPrice.toFixed(2)}</p>
                  </div>
                )}

                {/* B2B Price */}
                <div className="flex-shrink-0 text-right w-24">
                  {retailPrice > 0 && retailPrice !== b2bPrice && (
                    <p className="text-xs text-muted-foreground line-through">€{retailPrice.toFixed(2)}</p>
                  )}
                  <p className="font-heading text-base font-bold text-foreground">€{b2bPrice.toFixed(2)}</p>
                </div>

                {/* Discount */}
                <div className="flex-shrink-0 w-12 text-center">
                  {discountPct > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-success/20 text-success border-0">-{discountPct}%</Badge>
                  )}
                </div>

                {/* Quantity + Add */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <Input
                    type="number"
                    min={1}
                    max={p.stock_quantity ?? 999}
                    value={quantities[p.id] || 1}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(parseInt(e.target.value) || 1, p.stock_quantity ?? 999));
                      setQuantities(prev => ({ ...prev, [p.id]: val }));
                    }}
                    className="w-14 text-center h-8 text-sm"
                    disabled={!inStock || !hasValidPrice}
                  />
                  <Button
                    disabled={!inStock || !hasValidPrice}
                    size="sm"
                    className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold text-xs h-8 px-3"
                    onClick={() => handleAddToCart(p)}
                    title={!hasValidPrice ? 'No valid price in your price list' : undefined}
                  >
                    <ShoppingCart size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID VIEW */
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((p, i) => {
            const plEntry = priceListProductMap.get(p.id);
            const b2bPrice = plEntry?.customPrice ?? 0;
            const hasValidPrice = b2bPrice != null && b2bPrice > 0;
            const retailPriceGross = Number(p.compare_at_price || p.price || 0);
            const retailPrice = retailPriceGross / 1.22; // scorporo IVA 22%
            const discountPct = hasValidPrice && retailPrice > 0 && b2bPrice < retailPrice
              ? Math.round((1 - b2bPrice / retailPrice) * 100) : 0;
            const inStock = p.stock_quantity === null || p.stock_quantity > 0;
            const detail = getDetailForProduct(p);
            const leadTime = (detail as any)?.lead_time;
            const isJustAdded = justAdded === p.id;

            return (
              <motion.div
                key={p.id}
                variants={staggerItem}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                data-testid="product-card"
                className="glass-card-solid overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedProduct(p)}
              >
                <div className="aspect-square bg-secondary flex items-center justify-center relative">
                  <OptimizedImage
                    src={p.images?.[0]}
                    alt={p.name}
                    loading={i < 4 ? "eager" : "lazy"}
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
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
                        <p className="font-heading text-lg font-bold text-foreground">€{Number(p.compare_at_price || p.price).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Retail price</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-heading font-bold ${inStock ? "text-success" : "text-destructive"}`}>
                          {inStock ? "Available" : "Out of Stock"}
                        </span>
                        {!inStock && leadTime && (
                          <p className="text-[10px] font-semibold text-destructive/80">Restock: {leadTime}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end justify-between">
                        <div>
                          {p.compare_at_price && (
                            <p className="text-xs text-muted-foreground line-through">€{Number(p.compare_at_price).toFixed(2)}</p>
                          )}
                          <p className="font-heading text-lg font-bold text-foreground">€{b2bPrice.toFixed(2)}</p>
                          {showRetailPrices && p.price && (
                            <p className="text-xs text-muted-foreground">Retail: €{Number(p.price).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {discountPct > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-success/20 text-success border-0 mb-1">-{discountPct}%</Badge>
                          )}
                          <span className={`block text-xs font-heading font-bold ${inStock ? "text-success" : "text-destructive"}`}>
                            {inStock ? `${p.stock_quantity} in stock` : "Out of Stock"}
                          </span>
                          {!inStock && leadTime && (
                            <span className="block text-[11px] font-semibold text-destructive/80">Restock: {leadTime}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={!inStock || !hasValidPrice}
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
                          disabled={!inStock || !hasValidPrice}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          disabled={!inStock || !hasValidPrice || (quantities[p.id] || 1) >= (p.stock_quantity ?? 999)}
                          onClick={(e) => {
                            e.stopPropagation();
                            const curr = quantities[p.id] || 1;
                            setQuantities(prev => ({ ...prev, [p.id]: Math.min(curr + 1, p.stock_quantity ?? 999) }));
                          }}
                        >
                          <Plus size={12} />
                        </Button>
                        <motion.button
                          disabled={!inStock || !hasValidPrice}
                          className={`flex-1 rounded-lg gap-1.5 font-heading font-semibold text-xs h-8 flex items-center justify-center px-3 transition-colors ${
                            isJustAdded
                              ? 'bg-success text-success-foreground'
                              : 'bg-foreground text-background hover:bg-foreground/90'
                          }`}
                          animate={isJustAdded ? { scale: [1, 1.08, 1] } : {}}
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                        >
                          {isJustAdded ? (
                            <><Check size={12} /> Added!</>
                          ) : (
                            <><ShoppingCart size={12} /> Add</>
                          )}
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
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
          canAddToCart={selectedHasValidPrice && (selectedProduct?.stock_quantity === null || (selectedProduct?.stock_quantity ?? 0) > 0)}
          onAddToCart={() => {
            if (!selectedHasValidPrice) {
              toast.error("Cannot add: no valid B2B price");
              return;
            }
            handleAddToCart(selectedProduct);
          }}
        />
      )}
    </div>
  );
};

export default DealerCatalog;

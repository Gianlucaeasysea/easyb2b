import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Tag as TagIcon, Crown, RefreshCw, Search, Package, X,
  Users, Percent, ShoppingBag, BarChart3, Eye, Upload, Check
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";

import PriceListsTable from "@/components/admin/price-lists/PriceListsTable";
import PriceListEditor from "@/components/admin/price-lists/PriceListEditor";
import PriceListItemsTable from "@/components/admin/price-lists/PriceListItemsTable";
import PriceListImport from "@/components/admin/price-lists/PriceListImport";
import PriceListClientsAssignment from "@/components/admin/price-lists/PriceListClientsAssignment";
import { usePriceListImport } from "@/hooks/usePriceListImport";

const AdminPriceLists = () => {
  const qc = useQueryClient();
  const [showNewTier, setShowNewTier] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", label: "", discount_pct: 0, sort_order: 0 });
  const [listForm, setListForm] = useState({ name: "", description: "", discount_tier_id: "", client_id: "", base_discount_pct: 0 });
  const [editForm, setEditForm] = useState({ id: "", name: "", description: "", discount_tier_id: "" });
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [shopifySearch, setShopifySearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showManageClients, setShowManageClients] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const [bulkDiscount, setBulkDiscount] = useState("");

  // ─── Data queries ───
  const { data: tiers } = useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: priceLists } = useQuery({
    queryKey: ["price-lists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_lists").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-for-pricelist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, company_name").order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: priceListItems } = useQuery({
    queryKey: ["price-list-items", activeListId],
    enabled: !!activeListId,
    queryFn: async () => {
      const { data, error } = await supabase.from("price_list_items").select("*").eq("price_list_id", activeListId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: allListItemCounts } = useQuery({
    queryKey: ["price-list-item-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_list_items").select("price_list_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(i => { counts[i.price_list_id] = (counts[i.price_list_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: allListClientCounts } = useQuery({
    queryKey: ["price-list-client-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_list_clients").select("price_list_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(i => { counts[i.price_list_id] = (counts[i.price_list_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: priceListClients } = useQuery({
    queryKey: ["price-list-clients", activeListId],
    enabled: !!activeListId,
    queryFn: async () => {
      const { data, error } = await supabase.from("price_list_clients").select("*").eq("price_list_id", activeListId!);
      if (error) throw error;
      return data;
    },
  });

  // ─── Import hook ───
  const { importState, fileInputRef, handleFileUpload, setFieldMapping, setTargetListId, resetImport, executeImport } = usePriceListImport(products);

  // ─── Derived data ───
  const activeList = priceLists?.find(pl => pl.id === activeListId);
  const itemProductIds = new Set(priceListItems?.map(i => i.product_id) || []);
  const assignedClientIds = new Set(priceListClients?.map(c => c.client_id) || []);

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(shopifySearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(shopifySearch.toLowerCase())
  );

  const activeListStats = useMemo(() => {
    if (!priceListItems || !products) return { avgDiscount: 0, totalValue: 0 };
    let totalDiscount = 0, count = 0, totalValue = 0;
    priceListItems.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod?.price && prod.price > 0) {
        totalDiscount += (1 - item.custom_price / prod.price) * 100;
        count++;
      }
      totalValue += item.custom_price;
    });
    return { avgDiscount: count > 0 ? Math.round(totalDiscount / count) : 0, totalValue };
  }, [priceListItems, products]);

  // ─── Shopify Sync ───
  const syncShopify = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync");
      if (error) throw error;
      const variants = data.products || [];
      let upserted = 0;
      for (const v of variants) {
        const { error: upsertErr } = await supabase.from("products").upsert(
          { shopify_id: v.shopify_variant_id, name: v.variant_title, sku: v.sku, price: v.price, compare_at_price: v.compare_at_price, stock_quantity: v.inventory_quantity, images: v.image ? [v.image] : null, active_b2b: true } as any,
          { onConflict: "shopify_id" }
        );
        if (!upsertErr) upserted++;
      }
      qc.invalidateQueries({ queryKey: ["all-products"] });
      toast.success(`Sincronizzati ${upserted} prodotti da Shopify`);
    } catch (error) {
      showErrorToast(error, "AdminPriceLists.shopifySync");
    } finally {
      setSyncing(false);
    }
  };

  // ─── Mutations ───
  const createTier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discount_tiers").insert(tierForm as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-tiers"] });
      setShowNewTier(false);
      setTierForm({ name: "", label: "", discount_pct: 0, sort_order: 0 });
      toast.success("Classe di sconto creata");
    },
    onError: (error) => showErrorToast(error, "AdminPriceLists.createTier"),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-tiers"] });
      toast.success("Classe eliminata");
    },
  });

  const createList = useMutation({
    mutationFn: async () => {
      const payload: any = { name: listForm.name, description: listForm.description || null, discount_tier_id: listForm.discount_tier_id || null, client_id: listForm.client_id || null };
      const { data, error } = await supabase.from("price_lists").insert(payload).select().single();
      if (error) throw error;
      if (listForm.client_id) {
        await supabase.from("price_list_clients").insert({ price_list_id: data.id, client_id: listForm.client_id } as any);
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      if (listForm.base_discount_pct > 0 && products) {
        const discountFraction = 1 - listForm.base_discount_pct / 100;
        const items = products.filter(p => p.active_b2b && p.price).map(p => ({
          price_list_id: data.id, product_id: p.id,
          custom_price: Math.round(p.price! * discountFraction * 100) / 100,
        }));
        if (items.length > 0) {
          supabase.from("price_list_items").insert(items as any).then(({ error }) => {
            if (error) toast.error("Errore applicazione sconto: " + error.message);
            else {
              qc.invalidateQueries({ queryKey: ["price-list-items"] });
              qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
              toast.success(`Sconto ${listForm.base_discount_pct}% applicato a ${items.length} prodotti`);
            }
          });
        }
      }
      setShowNewList(false);
      setListForm({ name: "", description: "", discount_tier_id: "", client_id: "", base_discount_pct: 0 });
      setActiveListId(data.id);
      toast.success("Listino prezzi creato");
    },
    onError: (error) => showErrorToast(error, "AdminPriceLists.createList"),
  });

  const updateList = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("price_lists").update({
        name: editForm.name, description: editForm.description || null, discount_tier_id: editForm.discount_tier_id || null,
      } as any).eq("id", editForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      setShowEditList(false);
      toast.success("Listino aggiornato");
    },
    onError: (error) => showErrorToast(error, "AdminPriceLists.updateList"),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("price_list_items").delete().eq("price_list_id", id);
      await supabase.from("price_list_clients").delete().eq("price_list_id", id);
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      if (activeListId) setActiveListId(null);
      toast.success("Listino eliminato");
    },
  });

  const duplicateList = async (pl: any) => {
    try {
      const { data: newList, error: listErr } = await supabase.from("price_lists").insert({
        name: `${pl.name} (copia)`, description: pl.description || null, discount_tier_id: pl.discount_tier_id || null,
      } as any).select().single();
      if (listErr) throw listErr;
      const { data: items } = await supabase.from("price_list_items").select("*").eq("price_list_id", pl.id);
      if (items?.length) {
        await supabase.from("price_list_items").insert(items.map(i => ({ price_list_id: newList.id, product_id: i.product_id, custom_price: i.custom_price })) as any);
      }
      const { data: plClients } = await supabase.from("price_list_clients").select("*").eq("price_list_id", pl.id);
      if (plClients?.length) {
        await supabase.from("price_list_clients").insert(plClients.map(c => ({ price_list_id: newList.id, client_id: c.client_id })) as any);
      }
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      setActiveListId(newList.id);
      toast.success(`Listino "${pl.name}" duplicato`);
    } catch (error) {
      showErrorToast(error, "AdminPriceLists.duplicate");
    }
  };

  // ─── Client & item actions ───
  const addClientToList = async (clientId: string) => {
    if (!activeListId) return;
    const { error } = await supabase.from("price_list_clients").insert({ price_list_id: activeListId, client_id: clientId } as any);
    if (error) {
      if (error.code === "23505") toast.info("Cliente già assegnato");
      else toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["price-list-clients", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      toast.success("Cliente aggiunto al listino");
    }
  };

  const removeClientFromList = async (clientId: string) => {
    if (!activeListId) return;
    const { error } = await supabase.from("price_list_clients").delete().eq("price_list_id", activeListId).eq("client_id", clientId);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-clients", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      toast.success("Cliente rimosso dal listino");
    }
  };

  const removeProductFromList = async (itemId: string) => {
    const { error } = await supabase.from("price_list_items").delete().eq("id", itemId);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
    }
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    const { error } = await supabase.from("price_list_items").update({ custom_price: newPrice } as any).eq("id", itemId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
  };

  const applyBulkDiscount = async () => {
    if (!activeListId || !bulkDiscount || !priceListItems?.length) return;
    const pct = parseFloat(bulkDiscount);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Sconto non valido"); return; }
    const fraction = 1 - pct / 100;
    let updated = 0;
    for (const item of priceListItems) {
      const prod = products?.find(p => p.id === item.product_id);
      if (!prod?.price) continue;
      const newPrice = Math.round(prod.price * fraction * 100) / 100;
      const { error } = await supabase.from("price_list_items").update({ custom_price: newPrice } as any).eq("id", item.id);
      if (!error) updated++;
    }
    qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
    toast.success(`Sconto ${pct}% applicato a ${updated} prodotti`);
    setBulkDiscount("");
  };

  const addSelectedProducts = async () => {
    if (!activeListId || selectedProducts.size === 0) return;
    const tier = tiers?.find(t => t.id === activeList?.discount_tier_id);
    const discountFraction = tier ? 1 - tier.discount_pct / 100 : 1;
    const items = Array.from(selectedProducts).map(pid => {
      const prod = products?.find(p => p.id === pid);
      return { price_list_id: activeListId, product_id: pid, custom_price: Math.round((prod?.price || 0) * discountFraction * 100) / 100 };
    });
    const { error } = await supabase.from("price_list_items").upsert(items as any, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      setSelectedProducts(new Set());
      toast.success(`${items.length} prodotti aggiunti`);
    }
  };

  const addAllB2BProducts = async () => {
    if (!activeListId) return;
    const tier = tiers?.find(t => t.id === activeList?.discount_tier_id);
    const discountFraction = tier ? 1 - tier.discount_pct / 100 : 1;
    const available = products?.filter(p => p.active_b2b && p.price && !itemProductIds.has(p.id)) || [];
    if (available.length === 0) { toast.info("Nessun prodotto da aggiungere"); return; }
    const items = available.map(p => ({ price_list_id: activeListId, product_id: p.id, custom_price: Math.round((p.price || 0) * discountFraction * 100) / 100 }));
    const { error } = await supabase.from("price_list_items").upsert(items as any, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      toast.success(`${items.length} prodotti aggiunti al listino`);
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const selectAllFiltered = () => {
    const available = filteredProducts?.filter(p => !itemProductIds.has(p.id)) || [];
    setSelectedProducts(new Set(available.map(p => p.id)));
  };

  const tierColors: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    silver: "bg-gray-300/30 text-gray-600 border-gray-400/30",
    bronze: "bg-orange-400/20 text-orange-600 border-orange-400/30",
    standard: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Listini & Sconti</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestisci classi di sconto, listini prezzi e prodotti</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncShopify} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync..." : "Sync Shopify"}
          </Button>
          <span className="text-xs text-muted-foreground">{products?.length || 0} prodotti</span>
        </div>
      </div>

      {/* Discount Tiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            Classi di Sconto
          </CardTitle>
          <Dialog open={showNewTier} onOpenChange={setShowNewTier}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Nuova</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuova Classe di Sconto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome (ID)</Label><Input value={tierForm.name} onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))} placeholder="es. platinum" /></div>
                <div><Label>Etichetta</Label><Input value={tierForm.label} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} placeholder="es. Platinum" /></div>
                <div><Label>Sconto %</Label><Input type="number" value={tierForm.discount_pct} onChange={e => setTierForm(f => ({ ...f, discount_pct: Number(e.target.value) }))} /></div>
                <div><Label>Ordine</Label><Input type="number" value={tierForm.sort_order} onChange={e => setTierForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
                <Button onClick={() => createTier.mutate()} disabled={!tierForm.name || !tierForm.label}>Crea</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {tiers?.map(t => (
              <div key={t.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${tierColors[t.name] || "bg-muted text-muted-foreground border-border"}`}>
                <div>
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="ml-2 font-mono text-sm font-bold">-{t.discount_pct}%</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/20" onClick={() => deleteTier.mutate(t.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {!tiers?.length && <p className="text-sm text-muted-foreground">Nessuna classe di sconto.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Price Lists */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-primary" /> Listini Prezzi
            </h2>
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Importa CSV/XLSX">
                <Upload className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setShowNewList(true)}>
                <Plus className="h-3 w-3 mr-1" /> Nuovo
              </Button>
            </div>
          </div>

          <PriceListsTable
            priceLists={priceLists || []}
            tiers={tiers || []}
            allListItemCounts={allListItemCounts || {}}
            allListClientCounts={allListClientCounts || {}}
            selectedId={activeListId}
            onSelect={(id) => { setActiveListId(id); setSelectedProducts(new Set()); setActiveTab("items"); }}
            onDuplicate={duplicateList}
            onEdit={(pl) => {
              setEditForm({ id: pl.id, name: pl.name, description: pl.description || "", discount_tier_id: pl.discount_tier_id || "" });
              setShowEditList(true);
            }}
            onDelete={(id) => deleteList.mutate(id)}
          />
        </div>

        {/* Right: Detail view */}
        <div className="lg:col-span-8">
          {!activeListId || !activeList ? (
            <Card className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Seleziona un listino per visualizzare e gestire i prodotti</p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{activeList.name}</CardTitle>
                    {activeList.description && <p className="text-xs text-muted-foreground mt-0.5">{activeList.description}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowManageClients(true)} className="gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {assignedClientIds.size} Clienti
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{priceListItems?.length || 0}</span>
                    <span className="text-muted-foreground">prodotti</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Percent className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{activeListStats.avgDiscount}%</span>
                    <span className="text-muted-foreground">sconto medio</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">€{activeListStats.totalValue.toFixed(0)}</span>
                    <span className="text-muted-foreground">valore totale</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assignedClientIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Array.from(assignedClientIds).map(cid => {
                      const cl = clients?.find(c => c.id === cid);
                      return cl ? (
                        <Badge key={cid} variant="outline" className="text-xs gap-1 pr-1">
                          {cl.company_name}
                          <button onClick={() => removeClientFromList(cid)} className="ml-0.5 hover:text-destructive rounded-full p-0.5">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="items" className="gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Prodotti in listino ({priceListItems?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="add" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi prodotti
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="items">
                    <PriceListItemsTable
                      items={priceListItems || []}
                      products={products || []}
                      onUpdatePrice={updateItemPrice}
                      onRemoveItem={removeProductFromList}
                      onSwitchToAdd={() => setActiveTab("add")}
                      bulkDiscount={bulkDiscount}
                      onBulkDiscountChange={setBulkDiscount}
                      onApplyBulkDiscount={applyBulkDiscount}
                    />
                  </TabsContent>

                  <TabsContent value="add" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input placeholder="Cerca per nome o SKU..." className="pl-9 h-9" value={shopifySearch} onChange={e => setShopifySearch(e.target.value)} />
                      </div>
                      <Button size="sm" variant="outline" onClick={selectAllFiltered} className="text-xs h-9 whitespace-nowrap">Seleziona visibili</Button>
                      <Button size="sm" variant="outline" onClick={addAllB2BProducts} className="text-xs h-9 whitespace-nowrap gap-1">
                        <Package className="h-3 w-3" /> Tutti B2B
                      </Button>
                    </div>

                    {selectedProducts.size > 0 && (
                      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                        <span className="text-sm font-medium">{selectedProducts.size} prodotti selezionati</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedProducts(new Set())} className="text-xs h-8">Deseleziona</Button>
                          <Button size="sm" onClick={addSelectedProducts} className="gap-1 h-8"><Plus className="h-3 w-3" /> Aggiungi al listino</Button>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="max-h-[450px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredProducts?.filter(p => !itemProductIds.has(p.id)).slice(0, 80).map(p => {
                          const isSelected = selectedProducts.has(p.id);
                          return (
                            <div key={p.id} onClick={() => toggleProductSelection(p.id)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:bg-secondary/50"}`}>
                              <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
                              {p.images?.[0] && <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover bg-secondary shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {p.sku && <span className="font-mono">{p.sku}</span>}
                                  <span className="font-medium text-foreground">€{p.price?.toFixed(2) || "—"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {(filteredProducts?.filter(p => !itemProductIds.has(p.id)).length || 0) > 80 && (
                        <p className="text-xs text-muted-foreground mt-3 text-center">Mostrando 80 risultati. Usa la ricerca per filtrare.</p>
                      )}
                      {filteredProducts?.filter(p => !itemProductIds.has(p.id)).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Check className="h-6 w-6 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">Tutti i prodotti sono già nel listino</p>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PriceListEditor
        open={showNewList} onOpenChange={setShowNewList} mode="create"
        form={listForm} setForm={setListForm} tiers={tiers || []} clients={clients}
        onSave={() => createList.mutate()} isSaving={createList.isPending}
      />

      <PriceListEditor
        open={showEditList} onOpenChange={setShowEditList} mode="edit"
        form={editForm} setForm={setEditForm} tiers={tiers || []}
        onSave={() => updateList.mutate()} isSaving={updateList.isPending}
      />

      <PriceListImport
        importState={importState} priceLists={priceLists || []}
        onSetTargetListId={setTargetListId} onSetFieldMapping={setFieldMapping}
        onExecuteImport={executeImport} onCancel={resetImport}
      />

      <PriceListClientsAssignment
        open={showManageClients} onOpenChange={setShowManageClients}
        listName={activeList?.name || ""} assignedClientIds={assignedClientIds}
        clients={clients || []} onAssign={addClientToList} onUnassign={removeClientFromList}
      />
    </div>
  );
};

export default AdminPriceLists;

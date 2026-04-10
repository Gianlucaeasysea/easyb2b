import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, Tag, Crown, RefreshCw, Search, Package, Save, Upload,
  FileSpreadsheet, ArrowRight, Check, X, Pencil, Users, ChevronRight,
  Percent, ShoppingBag, BarChart3, Eye, Copy
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import * as XLSX from "xlsx";

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
  const [clientSearch, setClientSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [activeTab, setActiveTab] = useState("items");

  // Import state
  const [importStep, setImportStep] = useState<"idle" | "mapping">("idle");
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importTargetListId, setImportTargetListId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data, error } = await supabase
        .from("price_list_items")
        .select("*")
        .eq("price_list_id", activeListId!);
      if (error) throw error;
      return data;
    },
  });

  // All items counts per list
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

  // All client assignments counts per list
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
      const { data, error } = await supabase
        .from("price_list_clients")
        .select("*")
        .eq("price_list_id", activeListId!);
      if (error) throw error;
      return data;
    },
  });

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
      const payload: any = {
        name: listForm.name,
        description: listForm.description || null,
        discount_tier_id: listForm.discount_tier_id || null,
        client_id: listForm.client_id || null,
      };
      const { data, error } = await supabase.from("price_lists").insert(payload).select().single();
      if (error) throw error;
      if (listForm.client_id) {
        await supabase.from("price_list_clients").insert({
          price_list_id: data.id,
          client_id: listForm.client_id,
        } as any);
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      if (listForm.base_discount_pct > 0 && products) {
        const discountFraction = 1 - listForm.base_discount_pct / 100;
        const items = products.filter(p => p.active_b2b && p.price).map(p => ({
          price_list_id: data.id,
          product_id: p.id,
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
        name: editForm.name,
        description: editForm.description || null,
        discount_tier_id: editForm.discount_tier_id || null,
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
        name: `${pl.name} (copia)`,
        description: pl.description || null,
        discount_tier_id: pl.discount_tier_id || null,
      } as any).select().single();
      if (listErr) throw listErr;

      // Copy all items
      const { data: items } = await supabase.from("price_list_items").select("*").eq("price_list_id", pl.id);
      if (items?.length) {
        const newItems = items.map(i => ({
          price_list_id: newList.id,
          product_id: i.product_id,
          custom_price: i.custom_price,
        }));
        await supabase.from("price_list_items").insert(newItems as any);
      }

      // Copy client assignments
      const { data: plClients } = await supabase.from("price_list_clients").select("*").eq("price_list_id", pl.id);
      if (plClients?.length) {
        const newClients = plClients.map(c => ({
          price_list_id: newList.id,
          client_id: c.client_id,
        }));
        await supabase.from("price_list_clients").insert(newClients as any);
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

  // ─── Client management ───
  const addClientToList = async (clientId: string) => {
    if (!activeListId) return;
    const { error } = await supabase.from("price_list_clients").insert({
      price_list_id: activeListId,
      client_id: clientId,
    } as any);
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
    const { error } = await supabase.from("price_list_clients")
      .delete()
      .eq("price_list_id", activeListId)
      .eq("client_id", clientId);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-clients", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-client-counts"] });
      toast.success("Cliente rimosso dal listino");
    }
  };

  // ─── Price list item management ───
  const addSelectedProducts = async () => {
    if (!activeListId || selectedProducts.size === 0) return;
    const tier = tiers?.find(t => t.id === activeList?.discount_tier_id);
    const discountFraction = tier ? 1 - tier.discount_pct / 100 : 1;
    const items = Array.from(selectedProducts).map(pid => {
      const prod = products?.find(p => p.id === pid);
      return {
        price_list_id: activeListId,
        product_id: pid,
        custom_price: Math.round((prod?.price || 0) * discountFraction * 100) / 100,
      };
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
    const items = available.map(p => ({
      price_list_id: activeListId,
      product_id: p.id,
      custom_price: Math.round((p.price || 0) * discountFraction * 100) / 100,
    }));
    const { error } = await supabase.from("price_list_items").upsert(items as any, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      toast.success(`${items.length} prodotti aggiunti al listino`);
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

  // ─── Bulk discount on existing items ───
  const [bulkDiscount, setBulkDiscount] = useState("");
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

  // ─── Import CSV/XLSX ───
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (json.length === 0) { toast.error("File vuoto"); return; }
      const headers = Object.keys(json[0]);
      setImportHeaders(headers);
      setImportData(json);
      setFieldMapping({
        product_name: headers.find(h => /product|prodotto|nome/i.test(h)) || "",
        sku: headers.find(h => /sku|codice/i.test(h)) || "",
        price: headers.find(h => /price|prezzo|costo/i.test(h)) || "",
      });
      setImportStep("mapping");
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, []);

  const executeImport = async () => {
    if (!importTargetListId) { toast.error("Seleziona un listino"); return; }
    const nameCol = fieldMapping.product_name;
    const skuCol = fieldMapping.sku;
    const priceCol = fieldMapping.price;
    if (!priceCol) { toast.error("Mappa almeno il campo Prezzo"); return; }
    if (!nameCol && !skuCol) { toast.error("Mappa almeno Nome Prodotto o SKU"); return; }
    let matched = 0;
    const items: any[] = [];
    for (const row of importData) {
      const price = parseFloat(String(row[priceCol]).replace(",", "."));
      if (isNaN(price)) continue;
      let prod: typeof products extends (infer U)[] | undefined ? U | undefined : never = undefined;
      if (skuCol && row[skuCol]) prod = products?.find(p => p.sku?.toLowerCase() === String(row[skuCol]).toLowerCase().trim());
      if (!prod && nameCol && row[nameCol]) prod = products?.find(p => p.name.toLowerCase().includes(String(row[nameCol]).toLowerCase().trim()));
      if (prod) { items.push({ price_list_id: importTargetListId, product_id: prod.id, custom_price: price }); matched++; }
    }
    if (items.length === 0) { toast.error("Nessun prodotto trovato."); return; }
    const { error } = await supabase.from("price_list_items").upsert(items, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items"] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      toast.success(`Importati ${matched} prodotti nel listino`);
      setImportStep("idle");
      setImportData([]);
    }
  };

  const tierColors: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    silver: "bg-gray-300/30 text-gray-600 border-gray-400/30",
    bronze: "bg-orange-400/20 text-orange-600 border-orange-400/30",
    standard: "bg-muted text-muted-foreground border-border",
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(shopifySearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(shopifySearch.toLowerCase())
  );

  const activeList = priceLists?.find(pl => pl.id === activeListId);
  const itemProductIds = new Set(priceListItems?.map(i => i.product_id) || []);
  const assignedClientIds = new Set(priceListClients?.map(c => c.client_id) || []);

  const filteredItems = useMemo(() => {
    if (!priceListItems) return [];
    if (!itemSearch) return priceListItems;
    const q = itemSearch.toLowerCase();
    return priceListItems.filter(item => {
      const prod = products?.find(p => p.id === item.product_id);
      return prod?.name.toLowerCase().includes(q) || prod?.sku?.toLowerCase().includes(q);
    });
  }, [priceListItems, itemSearch, products]);

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const available = filteredProducts?.filter(p => !itemProductIds.has(p.id)) || [];
    setSelectedProducts(new Set(available.map(p => p.id)));
  };

  const openEdit = (pl: any) => {
    setEditForm({ id: pl.id, name: pl.name, description: pl.description || "", discount_tier_id: pl.discount_tier_id || "" });
    setShowEditList(true);
  };

  const filteredClients = clients?.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase())
  ) || [];

  // Stats for active list
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

      {/* Discount Tiers - compact */}
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

      {/* Main layout: list selector + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Price Lists */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" /> Listini Prezzi
            </h2>
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Importa CSV/XLSX">
                <Upload className="h-4 w-4" />
              </Button>
              <Dialog open={showNewList} onOpenChange={setShowNewList}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-3 w-3 mr-1" /> Nuovo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuovo Listino Prezzi</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome</Label><Input value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Listino Gold 2024" /></div>
                    <div><Label>Descrizione</Label><Textarea value={listForm.description} onChange={e => setListForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div>
                      <Label>Classe di Sconto</Label>
                      <Select value={listForm.discount_tier_id || "__none__"} onValueChange={v => setListForm(f => ({ ...f, discount_tier_id: v === "__none__" ? "" : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nessuna —</SelectItem>
                          {tiers?.map(t => <SelectItem key={t.id} value={t.id}>{t.label} ({t.discount_pct}%)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sconto Base % (auto su tutti i prodotti B2B)</Label>
                      <Input type="number" min={0} max={100} value={listForm.base_discount_pct} onChange={e => setListForm(f => ({ ...f, base_discount_pct: Number(e.target.value) }))} placeholder="es. 20" />
                    </div>
                    <div>
                      <Label>Primo cliente (opzionale)</Label>
                      <Select value={listForm.client_id || "__none__"} onValueChange={v => setListForm(f => ({ ...f, client_id: v === "__none__" ? "" : v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nessuno —</SelectItem>
                          {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => createList.mutate()} disabled={!listForm.name} className="w-full">Crea Listino</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2">
            {priceLists?.map(pl => {
              const tier = tiers?.find(t => t.id === pl.discount_tier_id);
              const isActive = activeListId === pl.id;
              const itemCount = allListItemCounts?.[pl.id] || 0;
              const clientCount = allListClientCounts?.[pl.id] || 0;
              return (
                <Card
                  key={pl.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary/30"}`}
                  onClick={() => { setActiveListId(isActive ? null : pl.id); setSelectedProducts(new Set()); setItemSearch(""); setActiveTab("items"); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{pl.name}</span>
                          {isActive && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        {pl.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{pl.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          {tier && (
                            <Badge variant="outline" className={`text-[10px] ${tierColors[tier.name] || ""}`}>
                              {tier.label} -{tier.discount_pct}%
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" /> {itemCount}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {clientCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateList(pl)} title="Duplica listino">
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pl)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteList.mutate(pl.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!priceLists?.length && (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessun listino creato</p>
              </div>
            )}
          </div>
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
                {/* Stats row */}
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
                {/* Assigned clients chips */}
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

                  <TabsContent value="items" className="space-y-4">
                    {/* Bulk actions bar */}
                    {priceListItems && priceListItems.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                          <Input
                            placeholder="Cerca nel listino..."
                            className="pl-9 h-9"
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            placeholder="Sconto %"
                            className="w-24 h-9"
                            value={bulkDiscount}
                            onChange={e => setBulkDiscount(e.target.value)}
                          />
                          <Button size="sm" variant="secondary" onClick={applyBulkDiscount} disabled={!bulkDiscount} className="h-9 gap-1">
                            <Percent className="h-3 w-3" /> Applica a tutti
                          </Button>
                        </div>
                      </div>
                    )}

                    {!priceListItems?.length ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm mb-3">Nessun prodotto nel listino</p>
                        <Button size="sm" variant="outline" onClick={() => setActiveTab("add")}>
                          <Plus className="h-3 w-3 mr-1" /> Aggiungi prodotti
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs w-[35%]">Prodotto</TableHead>
                              <TableHead className="text-xs w-[12%]">SKU</TableHead>
                              <TableHead className="text-xs w-[12%] text-right">Base</TableHead>
                              <TableHead className="text-xs w-[18%]">Prezzo Listino</TableHead>
                              <TableHead className="text-xs w-[12%] text-center">Sconto</TableHead>
                              <TableHead className="text-xs w-[5%]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map(item => {
                              const prod = products?.find(p => p.id === item.product_id);
                              const shopifyPrice = prod?.price || 0;
                              const discount = shopifyPrice > 0 ? Math.round((1 - item.custom_price / shopifyPrice) * 100) : 0;
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {prod?.images?.[0] && (
                                        <img src={prod.images[0]} alt="" className="h-8 w-8 rounded object-cover bg-secondary" />
                                      )}
                                      <span className="text-sm font-medium truncate">{prod?.name || "—"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-muted-foreground">{prod?.sku || "—"}</TableCell>
                                  <TableCell className="text-sm text-right text-muted-foreground">€{shopifyPrice.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="w-28 h-8 text-sm font-medium"
                                      defaultValue={item.custom_price}
                                      onBlur={e => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val !== item.custom_price) updateItemPrice(item.id, val);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={`text-xs ${discount > 0 ? "bg-green-500/10 text-green-600 border-green-500/30" : ""}`}>
                                      {discount > 0 ? `-${discount}%` : "—"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProductFromList(item.id)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="add" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input placeholder="Cerca per nome o SKU..." className="pl-9 h-9" value={shopifySearch} onChange={e => setShopifySearch(e.target.value)} />
                      </div>
                      <Button size="sm" variant="outline" onClick={selectAllFiltered} className="text-xs h-9 whitespace-nowrap">
                        Seleziona visibili
                      </Button>
                      <Button size="sm" variant="outline" onClick={addAllB2BProducts} className="text-xs h-9 whitespace-nowrap gap-1">
                        <Package className="h-3 w-3" /> Tutti B2B
                      </Button>
                    </div>

                    {selectedProducts.size > 0 && (
                      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                        <span className="text-sm font-medium">{selectedProducts.size} prodotti selezionati</span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedProducts(new Set())} className="text-xs h-8">
                            Deseleziona
                          </Button>
                          <Button size="sm" onClick={addSelectedProducts} className="gap-1 h-8">
                            <Plus className="h-3 w-3" /> Aggiungi al listino
                          </Button>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="max-h-[450px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredProducts?.filter(p => !itemProductIds.has(p.id)).slice(0, 80).map(p => {
                          const isSelected = selectedProducts.has(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleProductSelection(p.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:bg-secondary/50"}`}
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
                              {p.images?.[0] && (
                                <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover bg-secondary shrink-0" />
                              )}
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

      {/* Edit List Dialog */}
      <Dialog open={showEditList} onOpenChange={setShowEditList}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica Listino</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descrizione</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Classe di Sconto</Label>
              <Select value={editForm.discount_tier_id || "__none__"} onValueChange={v => setEditForm(f => ({ ...f, discount_tier_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nessuna —</SelectItem>
                  {tiers?.map(t => <SelectItem key={t.id} value={t.id}>{t.label} ({t.discount_pct}%)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateList.mutate()} disabled={!editForm.name} className="w-full">
              <Save className="h-4 w-4 mr-1" /> Salva Modifiche
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importStep !== "idle"} onOpenChange={open => { if (!open) setImportStep("idle"); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importa Listino da File
            </DialogTitle>
          </DialogHeader>
          {importStep === "mapping" && (
            <div className="space-y-6">
              <div>
                <Label>Listino di destinazione *</Label>
                <Select value={importTargetListId || "__none__"} onValueChange={v => setImportTargetListId(v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona listino..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Seleziona —</SelectItem>
                    {priceLists?.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Mappa i campi del file</h3>
                <p className="text-xs text-muted-foreground">{importData.length} righe · {importHeaders.length} colonne</p>
                {["product_name", "sku", "price"].map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <Label className="w-40 text-sm">
                      {field === "product_name" ? "Nome Prodotto" : field === "sku" ? "SKU" : "Prezzo"} {field === "price" && <span className="text-destructive">*</span>}
                    </Label>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select value={fieldMapping[field] || "__none__"} onValueChange={v => setFieldMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Non mappare —</SelectItem>
                        {importHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Anteprima ({Math.min(5, importData.length)} righe)</h3>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {importHeaders.slice(0, 6).map(h => (
                          <TableHead key={h} className="text-xs whitespace-nowrap">
                            {h}
                            {Object.values(fieldMapping).includes(h) && (
                              <Badge className="ml-1 bg-primary/20 text-primary text-[9px]">
                                {Object.entries(fieldMapping).find(([, v]) => v === h)?.[0] === "product_name" ? "Nome" : Object.entries(fieldMapping).find(([, v]) => v === h)?.[0] === "sku" ? "SKU" : "Prezzo"}
                              </Badge>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {importHeaders.slice(0, 6).map(h => (
                            <TableCell key={h} className="text-xs">{String(row[h] || "").substring(0, 30)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setImportStep("idle")}>Annulla</Button>
                <Button onClick={executeImport} disabled={!importTargetListId || !fieldMapping.price}>
                  <Check className="h-4 w-4 mr-1" /> Importa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Clients Dialog */}
      <Dialog open={showManageClients} onOpenChange={setShowManageClients}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gestisci Clienti — {activeList?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {assignedClientIds.size > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Clienti assegnati ({assignedClientIds.size})</Label>
                <div className="space-y-1 mt-2">
                  {Array.from(assignedClientIds).map(cid => {
                    const cl = clients?.find(c => c.id === cid);
                    return cl ? (
                      <div key={cid} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
                        <span className="text-sm font-medium">{cl.company_name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeClientFromList(cid)} className="text-destructive h-7">
                          <X className="h-3 w-3 mr-1" /> Rimuovi
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Aggiungi clienti</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input placeholder="Cerca cliente..." className="pl-9 h-9" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
              </div>
              <ScrollArea className="max-h-60">
                <div className="space-y-1">
                  {filteredClients.filter(c => !assignedClientIds.has(c.id)).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer" onClick={() => addClientToList(c.id)}>
                      <div>
                        <span className="text-sm font-medium">{c.company_name}</span>
                        
                      </div>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPriceLists;

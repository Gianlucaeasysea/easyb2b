import { useState, useRef, useCallback } from "react";
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
import { Plus, Trash2, Tag, Crown, RefreshCw, Search, Package, Save, Upload, FileSpreadsheet, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const AdminPriceLists = () => {
  const qc = useQueryClient();
  const [showNewTier, setShowNewTier] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", label: "", discount_pct: 0, sort_order: 0 });
  const [listForm, setListForm] = useState({ name: "", description: "", discount_tier_id: "", client_id: "", base_discount_pct: 0 });
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [shopifySearch, setShopifySearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Import state
  const [importStep, setImportStep] = useState<"idle" | "mapping" | "preview">("idle");
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
      const { data, error } = await supabase.from("clients").select("id, company_name, discount_class").order("company_name");
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
    } catch (err: any) {
      toast.error("Errore sync Shopify: " + err.message);
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
    onError: (e: any) => toast.error(e.message),
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
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      setShowNewList(false);

      // If base discount was set, apply it to all products
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
              toast.success(`Sconto ${listForm.base_discount_pct}% applicato a ${items.length} prodotti`);
            }
          });
        }
      }

      setListForm({ name: "", description: "", discount_tier_id: "", client_id: "", base_discount_pct: 0 });
      toast.success("Listino prezzi creato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("price_list_items").delete().eq("price_list_id", id);
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      if (activeListId) setActiveListId(null);
      toast.success("Listino eliminato");
    },
  });

  // ─── Price list item management ───
  const addProductToList = async (productId: string, customPrice: number) => {
    if (!activeListId) return;
    const { error } = await supabase.from("price_list_items").upsert(
      { price_list_id: activeListId, product_id: productId, custom_price: customPrice } as any,
      { onConflict: "price_list_id,product_id" }
    );
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      toast.success("Prodotto aggiunto");
    }
  };

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
      setSelectedProducts(new Set());
      toast.success(`${items.length} prodotti aggiunti`);
    }
  };

  const removeProductFromList = async (itemId: string) => {
    const { error } = await supabase.from("price_list_items").delete().eq("id", itemId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    const { error } = await supabase.from("price_list_items").update({ custom_price: newPrice } as any).eq("id", itemId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
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

      let prod = null;
      if (skuCol && row[skuCol]) {
        prod = products?.find(p => p.sku?.toLowerCase() === String(row[skuCol]).toLowerCase().trim());
      }
      if (!prod && nameCol && row[nameCol]) {
        prod = products?.find(p => p.name.toLowerCase().includes(String(row[nameCol]).toLowerCase().trim()));
      }
      if (prod) {
        items.push({ price_list_id: importTargetListId, product_id: prod.id, custom_price: price });
        matched++;
      }
    }

    if (items.length === 0) { toast.error("Nessun prodotto trovato. Controlla il mapping."); return; }

    const { error } = await supabase.from("price_list_items").upsert(items, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["price-list-items"] });
      toast.success(`Importati ${matched} prodotti nel listino`);
      setImportStep("idle");
      setImportData([]);
    }
  };

  const tierColors: Record<string, string> = {
    gold: "bg-yellow-500/20 text-yellow-600",
    silver: "bg-gray-300/30 text-gray-600",
    bronze: "bg-orange-400/20 text-orange-600",
    standard: "bg-muted text-muted-foreground",
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(shopifySearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(shopifySearch.toLowerCase())
  );

  const activeList = priceLists?.find((pl) => pl.id === activeListId);
  const itemProductIds = new Set(priceListItems?.map((i) => i.product_id) || []);

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

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Listini & Classi di Sconto</h1>
      <p className="text-sm text-muted-foreground mb-8">Gestisci classi di sconto, listini prezzi e sincronizza prodotti da Shopify</p>

      {/* Shopify Sync */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Prodotti Shopify
          </CardTitle>
          <Button onClick={syncShopify} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizzazione..." : "Sincronizza da Shopify"}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {products?.length || 0} prodotti nel database.
          </p>
        </CardContent>
      </Card>

      {/* Discount Tiers */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Classi di Sconto
          </CardTitle>
          <Dialog open={showNewTier} onOpenChange={setShowNewTier}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuova Classe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuova Classe di Sconto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome (ID)</Label><Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} placeholder="es. platinum" /></div>
                <div><Label>Etichetta</Label><Input value={tierForm.label} onChange={(e) => setTierForm((f) => ({ ...f, label: e.target.value }))} placeholder="es. Platinum" /></div>
                <div><Label>Sconto %</Label><Input type="number" value={tierForm.discount_pct} onChange={(e) => setTierForm((f) => ({ ...f, discount_pct: Number(e.target.value) }))} /></div>
                <div><Label>Ordine</Label><Input type="number" value={tierForm.sort_order} onChange={(e) => setTierForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
                <Button onClick={() => createTier.mutate()} disabled={!tierForm.name || !tierForm.label}>Crea</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Classe</TableHead><TableHead>Sconto</TableHead><TableHead>Ordine</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {tiers?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Badge className={tierColors[t.name] || "bg-muted text-muted-foreground"}>{t.label}</Badge></TableCell>
                  <TableCell className="font-mono">{t.discount_pct}%</TableCell>
                  <TableCell className="text-muted-foreground">{t.sort_order}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => deleteTier.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Price Lists */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            Listini Prezzi
          </CardTitle>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Importa CSV/XLSX
            </Button>
            <Dialog open={showNewList} onOpenChange={setShowNewList}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuovo Listino</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuovo Listino Prezzi</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={listForm.name} onChange={(e) => setListForm((f) => ({ ...f, name: e.target.value }))} placeholder="es. Listino Gold 2024" /></div>
                  <div><Label>Descrizione</Label><Textarea value={listForm.description} onChange={(e) => setListForm((f) => ({ ...f, description: e.target.value }))} /></div>
                  <div>
                    <Label>Classe di Sconto (opzionale)</Label>
                    <Select value={listForm.discount_tier_id || "__none__"} onValueChange={(v) => setListForm((f) => ({ ...f, discount_tier_id: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nessuna —</SelectItem>
                        {tiers?.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} ({t.discount_pct}%)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sconto Base % (applicato su tutti i prodotti)</Label>
                    <Input type="number" min={0} max={100} value={listForm.base_discount_pct} onChange={(e) => setListForm(f => ({ ...f, base_discount_pct: Number(e.target.value) }))} placeholder="es. 20" />
                    <p className="text-xs text-muted-foreground mt-1">Se impostato, applica automaticamente questo sconto a tutti i prodotti B2B attivi</p>
                  </div>
                  <div>
                    <Label>Cliente specifico (opzionale)</Label>
                    <Select value={listForm.client_id || "__none__"} onValueChange={(v) => setListForm((f) => ({ ...f, client_id: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Tutti (per classe) —</SelectItem>
                        {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createList.mutate()} disabled={!listForm.name}>Crea Listino</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!priceLists?.length ? (
            <p className="text-center text-muted-foreground py-8">Nessun listino prezzi ancora creato.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Classe/Cliente</TableHead><TableHead>Prodotti</TableHead><TableHead>Creato</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {priceLists.map((pl) => {
                  const tier = tiers?.find((t) => t.id === pl.discount_tier_id);
                  const client = clients?.find((c) => c.id === pl.client_id);
                  return (
                    <TableRow key={pl.id} className={`cursor-pointer ${activeListId === pl.id ? "bg-primary/10" : "hover:bg-secondary/50"}`} onClick={() => setActiveListId(activeListId === pl.id ? null : pl.id)}>
                      <TableCell className="font-medium">{pl.name}</TableCell>
                      <TableCell>
                        {tier && <Badge className={tierColors[tier.name] || "bg-muted text-muted-foreground"}>{tier.label} (-{tier.discount_pct}%)</Badge>}
                        {client && <span className="text-sm text-muted-foreground ml-2">{client.company_name}</span>}
                        {!tier && !client && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(pl.created_at).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteList.mutate(pl.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importStep !== "idle"} onOpenChange={(open) => { if (!open) setImportStep("idle"); }}>
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
                <Select value={importTargetListId || "__none__"} onValueChange={(v) => setImportTargetListId(v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona listino..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Seleziona —</SelectItem>
                    {priceLists?.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-foreground">Mappa i campi del file</h3>
                <p className="text-xs text-muted-foreground">Trovate {importData.length} righe con {importHeaders.length} colonne</p>

                {["product_name", "sku", "price"].map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <Label className="w-40 text-sm">
                      {field === "product_name" ? "Nome Prodotto" : field === "sku" ? "SKU" : "Prezzo"} {field === "price" && <span className="text-destructive">*</span>}
                    </Label>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Select value={fieldMapping[field] || "__none__"} onValueChange={(v) => setFieldMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Non mappare —</SelectItem>
                        {importHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-2">Anteprima dati ({Math.min(5, importData.length)} righe)</h3>
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

      {/* Active List Editor */}
      {activeListId && activeList && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Gestisci Prodotti — {activeList.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current items */}
            {priceListItems && priceListItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Prodotti nel listino ({priceListItems.length})</h4>
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Prodotto</TableHead>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">Prezzo Base</TableHead>
                        <TableHead className="text-xs">Prezzo Listino</TableHead>
                        <TableHead className="text-xs">Sconto</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceListItems.map((item) => {
                        const prod = products?.find((p) => p.id === item.product_id);
                        const shopifyPrice = prod?.price || 0;
                        const discount = shopifyPrice > 0 ? Math.round((1 - item.custom_price / shopifyPrice) * 100) : 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{prod?.name || "—"}</TableCell>
                            <TableCell className="text-xs font-mono">{prod?.sku || "—"}</TableCell>
                            <TableCell className="text-sm">€{shopifyPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-28 h-8 text-sm"
                                defaultValue={item.custom_price}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val !== item.custom_price) updateItemPrice(item.id, val);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${discount > 0 ? "bg-success/20 text-success" : ""}`}>
                                {discount > 0 ? `-${discount}%` : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProductFromList(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Add products - improved grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Aggiungi Prodotti al Listino</h4>
                <div className="flex items-center gap-2">
                  {selectedProducts.size > 0 && (
                    <Button size="sm" onClick={addSelectedProducts} className="gap-1">
                      <Plus className="h-3 w-3" /> Aggiungi {selectedProducts.size} selezionati
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={selectAllFiltered} className="text-xs">Seleziona tutti</Button>
                </div>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input placeholder="Cerca per nome o SKU..." className="pl-9 h-9" value={shopifySearch} onChange={(e) => setShopifySearch(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                {filteredProducts?.filter((p) => !itemProductIds.has(p.id)).slice(0, 60).map((p) => {
                  const isSelected = selectedProducts.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductSelection(p.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:bg-secondary/60"
                      }`}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {p.sku && <span className="font-mono">{p.sku}</span>}
                          <span>€{p.price?.toFixed(2) || "—"}</span>
                          <span>Stock: {p.stock_quantity ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(filteredProducts?.filter(p => !itemProductIds.has(p.id)).length || 0) > 60 && (
                <p className="text-xs text-muted-foreground mt-2">Mostrando 60 risultati. Usa la ricerca per filtrare.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPriceLists;

import { useState } from "react";
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
import { Plus, Trash2, Tag, Crown, RefreshCw, Search, Package, Save } from "lucide-react";
import { toast } from "sonner";

interface ShopifyVariant {
  shopify_product_id: string;
  shopify_variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  image: string | null;
}

const AdminPriceLists = () => {
  const qc = useQueryClient();
  const [showNewTier, setShowNewTier] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", label: "", discount_pct: 0, sort_order: 0 });
  const [listForm, setListForm] = useState({ name: "", description: "", discount_tier_id: "", client_id: "" });
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [shopifySearch, setShopifySearch] = useState("");
  const [syncing, setSyncing] = useState(false);

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

  // ─── Shopify Sync ───
  const syncShopify = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-sync");
      if (error) throw error;

      const variants: ShopifyVariant[] = data.products || [];
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
      const { error } = await supabase.from("price_lists").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      setShowNewList(false);
      setListForm({ name: "", description: "", discount_tier_id: "", client_id: "" });
      toast.success("Listino prezzi creato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
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
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
      toast.success("Prodotto aggiunto/aggiornato nel listino");
    }
  };

  const removeProductFromList = async (itemId: string) => {
    const { error } = await supabase.from("price_list_items").delete().eq("id", itemId);
    if (error) {
      toast.error(error.message);
    } else {
      qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
    }
  };

  const updateItemPrice = async (itemId: string, newPrice: number) => {
    const { error } = await supabase
      .from("price_list_items")
      .update({ custom_price: newPrice } as any)
      .eq("id", itemId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["price-list-items", activeListId] });
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
          <p className="text-sm text-muted-foreground mb-3">
            {products?.length || 0} prodotti nel database. Clicca "Sincronizza" per aggiornare SKU, nomi variante e quantità stock da Shopify.
          </p>
          {products && products.length > 0 && (
            <div className="overflow-x-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">SKU</TableHead>
                    <TableHead className="text-xs">Nome Variante</TableHead>
                    <TableHead className="text-xs">Prezzo</TableHead>
                    <TableHead className="text-xs">Stock</TableHead>
                    <TableHead className="text-xs">B2B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 20).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-mono">{p.sku || "—"}</TableCell>
                      <TableCell className="text-xs">{p.name}</TableCell>
                      <TableCell className="text-xs">€{p.price?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="text-xs">{p.stock_quantity ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${p.active_b2b ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                          {p.active_b2b ? "Sì" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {products.length > 20 && <p className="text-xs text-muted-foreground mt-2 px-2">...e altri {products.length - 20} prodotti</p>}
            </div>
          )}
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
        </CardHeader>
        <CardContent>
          {!priceLists?.length ? (
            <p className="text-center text-muted-foreground py-8">Nessun listino prezzi ancora creato.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Classe/Cliente</TableHead><TableHead>Creato</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {priceLists.map((pl) => {
                  const tier = tiers?.find((t) => t.id === pl.discount_tier_id);
                  const client = clients?.find((c) => c.id === pl.client_id);
                  return (
                    <TableRow key={pl.id} className={`cursor-pointer ${activeListId === pl.id ? "bg-primary/10" : "hover:bg-secondary/50"}`} onClick={() => setActiveListId(activeListId === pl.id ? null : pl.id)}>
                      <TableCell className="font-medium">{pl.name}</TableCell>
                      <TableCell>
                        {tier && <Badge className={tierColors[tier.name] || "bg-muted text-muted-foreground"}>{tier.label}</Badge>}
                        {client && <span className="text-sm text-muted-foreground ml-2">{client.company_name}</span>}
                        {!tier && !client && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Prodotto</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Prezzo Shopify</TableHead>
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
            )}

            {/* Add products */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Aggiungi Prodotti al Listino</h4>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input placeholder="Cerca per nome o SKU..." className="pl-9 h-9" value={shopifySearch} onChange={(e) => setShopifySearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Prodotto</TableHead>
                      <TableHead className="text-xs">Prezzo</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.filter((p) => !itemProductIds.has(p.id)).slice(0, 30).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-mono">{p.sku || "—"}</TableCell>
                        <TableCell className="text-xs">{p.name}</TableCell>
                        <TableCell className="text-xs">€{p.price?.toFixed(2) || "—"}</TableCell>
                        <TableCell className="text-xs">{p.stock_quantity ?? "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addProductToList(p.id, p.price || 0)}>
                            <Plus className="h-3 w-3 mr-1" /> Aggiungi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPriceLists;

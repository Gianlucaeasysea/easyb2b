import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Search, Plus, Minus, Trash2, AlertTriangle, Check, ShoppingBag, User, Package } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

interface OrderItem {
  product_id: string;
  name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  stock: number | null;
  image: string | null;
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepaid: "Prepagato",
  "30_days": "30 giorni",
  "60_days": "60 giorni",
  "90_days": "90 giorni",
  end_of_month: "Fine mese",
};

const CRMCreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch clients assigned to current sales user
  const { data: clients } = useQuery({
    queryKey: ["crm-create-order-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, address, payment_terms, zone")
        .eq("assigned_sales_id", user!.id)
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch price list for selected client
  const { data: clientPriceList } = useQuery({
    queryKey: ["crm-create-order-pricelist", selectedClientId],
    queryFn: async () => {
      // Check price_list_clients first
      const { data: plcData } = await supabase
        .from("price_list_clients")
        .select("price_list_id, price_lists(id, name)")
        .eq("client_id", selectedClientId!)
        .limit(1)
        .maybeSingle();
      if (plcData?.price_lists) return plcData.price_lists as { id: string; name: string };
      // Fallback: check price_lists.client_id
      const { data: plData } = await supabase
        .from("price_lists")
        .select("id, name")
        .eq("client_id", selectedClientId!)
        .limit(1)
        .maybeSingle();
      return plData ?? null;
    },
    enabled: !!selectedClientId,
  });

  // Fetch price list items
  const { data: priceListItems } = useQuery({
    queryKey: ["crm-create-order-prices", clientPriceList?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_list_items")
        .select("product_id, custom_price")
        .eq("price_list_id", clientPriceList!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!clientPriceList?.id,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["crm-create-order-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, price, images, stock_quantity, active_b2b")
        .eq("active_b2b", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: step === 2,
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    priceListItems?.forEach((i) => map.set(i.product_id, i.custom_price));
    return map;
  }, [priceListItems]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.zone?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const list = products.filter((p) => !items.some((i) => i.product_id === p.id));
    if (!productSearch.trim()) return list;
    const q = productSearch.toLowerCase();
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
  }, [products, productSearch, items]);

  const orderTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const addProduct = (product: NonNullable<typeof products>[0]) => {
    const price = priceMap.get(product.id) ?? product.price ?? 0;
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: price,
        quantity: 1,
        stock: product.stock_quantity,
        image: product.images?.[0] ?? null,
      },
    ]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i)));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const stockErrors = items.filter((i) => i.stock !== null && i.quantity > i.stock);
  const hasStockErrors = stockErrors.length > 0;

  const submitOrder = async (status: "draft" | "submitted") => {
    if (!selectedClientId || items.length === 0) return;
    if (status === "submitted" && hasStockErrors) return;

    setSubmitting(true);
    try {
      const orderItems = items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_pct: 0,
        subtotal: i.unit_price * i.quantity,
      }));

      const { data, error } = await supabase.rpc("create_order_with_items", {
        p_client_id: selectedClientId,
        p_status: status,
        p_notes: clientNotes || null,
        p_payment_terms: selectedClient?.payment_terms || null,
        p_order_type: "sales_manual",
        p_items: orderItems as any,
        p_internal_notes: internalNotes.trim() || null,
      });

      if (error) throw error;

      const orderId = (data as any)?.id;
      const orderCode = (data as any)?.order_code;

      // If submitted, send notifications
      if (status === "submitted" && orderId) {
        // Notify dealer
        await supabase.from("client_notifications").insert({
          client_id: selectedClientId,
          title: "Nuovo ordine creato",
          body: `Il tuo referente commerciale ha creato l'ordine #${orderCode || orderId.slice(0, 8)} per te. Controlla i dettagli nel portale.`,
          type: "order",
          order_id: orderId,
        });

        // Send admin notification via edge function
        try {
          await supabase.functions.invoke("send-order-notification", {
            body: { orderId, orderCode },
          });
        } catch {
          // Non-critical
        }
      }

      toast.success("Ordine creato con successo");
      navigate("/crm/orders");
    } catch (err: any) {
      toast.error("Errore nella creazione dell'ordine: " + (err.message || "errore sconosciuto"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crea Ordine</h1>
          <p className="text-muted-foreground text-sm">Crea un ordine per conto del cliente</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "Cliente", icon: User },
          { n: 2, label: "Prodotti", icon: Package },
          { n: 3, label: "Riepilogo", icon: Check },
        ].map(({ n, label, icon: Icon }) => (
          <div key={n} className="flex items-center gap-2">
            {n > 1 && <div className={`h-px w-8 ${step >= n ? "bg-primary" : "bg-border"}`} />}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                step === n ? "bg-primary text-primary-foreground" : step > n ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1 — Client Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente per nome, contatto o zona..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-2 max-h-[350px] overflow-y-auto">
            {filteredClients.map((c) => (
              <Card
                key={c.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${selectedClientId === c.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedClientId(c.id)}
              >
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{c.company_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.contact_name} {c.zone ? `• ${c.zone}` : ""}
                    </p>
                  </div>
                  {selectedClientId === c.id && <Check className="h-5 w-5 text-primary" />}
                </CardContent>
              </Card>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun cliente trovato</p>
            )}
          </div>

          {selectedClient && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-1">
                <p className="font-semibold">{selectedClient.company_name}</p>
                <p className="text-sm text-muted-foreground">{selectedClient.contact_name}</p>
                <div className="flex gap-4 text-sm mt-2">
                  <span>
                    <strong>Termini:</strong>{" "}
                    {PAYMENT_TERMS_LABELS[selectedClient.payment_terms || ""] || selectedClient.payment_terms || "—"}
                  </span>
                  <span>
                    <strong>Listino:</strong>{" "}
                    {clientPriceList ? (
                      <Badge variant="outline">{clientPriceList.name}</Badge>
                    ) : (
                      <span className="text-destructive font-medium">Non assegnato</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedClient && !clientPriceList && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Questo cliente non ha un listino prezzi.</p>
                <p>
                  Assegna un listino prima di creare l'ordine.{" "}
                  <button
                    className="underline font-medium"
                    onClick={() => navigate(`/crm/organizations/${selectedClientId}`)}
                  >
                    Vai al profilo organizzazione
                  </button>
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedClientId || !clientPriceList}>
              Avanti <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 — Products */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Product search & grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Catalogo Prodotti</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca prodotto per nome o SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto">
              <div className="grid gap-2">
                {filteredProducts.map((p) => {
                  const price = priceMap.get(p.id) ?? p.price ?? 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku || "—"} • €{price.toFixed(2)} •{" "}
                          {p.stock_quantity !== null ? (
                            p.stock_quantity > 0 ? (
                              <span className="text-green-600">{p.stock_quantity} disp.</span>
                            ) : (
                              <span className="text-destructive">Esaurito</span>
                            )
                          ) : (
                            "Stock N/D"
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addProduct(p)}
                        disabled={p.stock_quantity === 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nessun prodotto trovato</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Prodotti nell'ordine ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Aggiungi prodotti dal catalogo sopra</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodotto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Prezzo</TableHead>
                        <TableHead className="text-center w-[120px]">Quantità</TableHead>
                        <TableHead className="text-right">Subtotale</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const stockError = item.stock !== null && item.quantity > item.stock;
                        return (
                          <TableRow key={item.product_id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.sku || "—"}</TableCell>
                            <TableCell className="text-right">€{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                                  className="w-16 h-7 text-center text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              {stockError && (
                                <p className="text-xs text-destructive text-center mt-1">
                                  Disponibili solo {item.stock} unità
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              €{(item.unit_price * item.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.product_id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4 text-lg font-semibold">
                    Subtotale: €{orderTotal.toFixed(2)}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
            </Button>
            <Button onClick={() => setStep(3)} disabled={items.length === 0}>
              Avanti <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Summary */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Client summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-semibold">{selectedClient?.company_name}</p>
              <p className="text-sm text-muted-foreground">{selectedClient?.contact_name}</p>
              <p className="text-sm">
                Termini di pagamento:{" "}
                {PAYMENT_TERMS_LABELS[selectedClient?.payment_terms || ""] || selectedClient?.payment_terms || "—"}
              </p>
              <p className="text-sm">Listino: {clientPriceList?.name}</p>
            </CardContent>
          </Card>

          {/* Items summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Prodotti ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prodotto</TableHead>
                    <TableHead className="text-right">Prezzo</TableHead>
                    <TableHead className="text-center">Qtà</TableHead>
                    <TableHead className="text-right">Subtotale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">€{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">€{(item.unit_price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4 text-xl font-bold">Totale: €{orderTotal.toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Note per il cliente</label>
              <Textarea
                placeholder="Visibili al dealer nel dettaglio ordine..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note interne</label>
              <Textarea
                placeholder="Visibili solo ad admin e sales..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {hasStockErrors && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <p>Alcuni prodotti superano la disponibilità. Torna indietro e correggi le quantità prima di inviare.</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => submitOrder("draft")} disabled={submitting}>
                Salva come Bozza
              </Button>
              <Button onClick={() => submitOrder("submitted")} disabled={submitting || hasStockErrors}>
                Invia Ordine
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMCreateOrder;

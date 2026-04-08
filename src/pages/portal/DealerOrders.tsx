import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, ExternalLink, Clock, CheckCircle, Truck, Package,
  ChevronDown, ChevronUp, FileText, Download, Bell, Loader2, Send,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { ORDER_STATUSES, getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";
import { TablePagination } from "@/components/ui/TablePagination";

import { Copy, DollarSign, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";

const ORDER_PHASES = [
  { key: "submitted", label: "Inviato", icon: Send },
  { key: "confirmed", label: "Confermato", icon: CheckCircle },
  { key: "processing", label: "In Lavorazione", icon: Package },
  { key: "ready_to_ship", label: "In Preparazione", icon: Clock },
  { key: "shipped", label: "Spedito", icon: Truck },
  { key: "delivered", label: "Consegnato", icon: Package },
];

const STATUS_MESSAGES: Record<string, string> = {
  submitted: "Il tuo ordine è stato inviato ed è in attesa di conferma dal nostro team.",
  confirmed: "Il tuo ordine è stato confermato ed è in fase di revisione. Riceverai una conferma con la fattura a breve.",
  processing: "Il tuo ordine è stato confermato e la fattura è disponibile nei documenti. Stiamo preparando la spedizione.",
  ready_to_ship: "Il tuo ordine è pronto e sarà spedito a breve. Riceverai il tracking non appena disponibile.",
  shipped: "Il tuo ordine è stato spedito! Usa il link di tracking per seguire la consegna.",
  delivered: "Il tuo ordine è stato consegnato con successo.",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  order_confirmation: "Conferma Ordine",
  invoice: "Fattura",
  delivery_note: "DDT / Bolla di Spedizione",
  ddt: "DDT",
  credit_note: "Nota di Credito",
  proforma: "Proforma",
  warranty: "Certificato di Garanzia",
  other: "Altro",
};

const DealerOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [priceCheckData, setPriceCheckData] = useState<{
    order: any;
    items: { product_id: string; name: string; sku: string; quantity: number; originalPrice: number; currentPrice: number | null; available: boolean }[];
    originalTotal: number;
    newTotal: number;
    hasChanges: boolean;
  } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<any>(null);
  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders-full"],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku)), order_documents(id, file_name, file_path, doc_type, created_at)")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client,
  });

  const allOrders = orders || [];
  const totalPages = Math.max(1, Math.ceil(allOrders.length / pageSize));
  const sliceFrom = (page - 1) * pageSize;
  const pageData = allOrders.slice(sliceFrom, sliceFrom + pageSize);

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from("order-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getPhaseIndex = (status: string) => {
    if (status === "cancelled") return -2; // special cancelled marker
    const idx = ORDER_PHASES.findIndex(p => p.key === status);
    return idx >= 0 ? idx : -1;
  };

  // Step 1: Check prices before duplicating
  const handlePrepareDuplicate = async (order: any) => {
    if (!client) return;
    setDuplicatingId(order.id);
    try {
      const items = (order.order_items || []) as any[];
      if (!items.length) { toast.error("L'ordine non ha prodotti da duplicare"); return; }

      // Fetch current prices from client's price list
      const { data: priceListClients } = await supabase.from("price_list_clients").select("price_list_id").eq("client_id", client.id);
      const priceListIds = priceListClients?.map(plc => plc.price_list_id) || [];
      let priceMap: Record<string, number> = {};
      if (priceListIds.length > 0) {
        const { data: priceItems } = await supabase.from("price_list_items").select("product_id, custom_price").in("price_list_id", priceListIds);
        priceItems?.forEach(pi => { priceMap[pi.product_id] = Number(pi.custom_price); });
      }

      // Check product availability
      const productIds = items.map((i: any) => i.product_id);
      const { data: products } = await supabase.from("products").select("id, name, price, active_b2b, stock_quantity").in("id", productIds);
      const productMap = new Map(products?.map(p => [p.id, p]) || []);

      const comparisonItems = items.map((item: any) => {
        const product = productMap.get(item.product_id);
        const available = !!(product && product.active_b2b);
        const currentPrice = available ? (priceMap[item.product_id] ?? (product?.price ? Number(product.price) : null)) : null;
        return {
          product_id: item.product_id,
          name: item.products?.name || "Prodotto sconosciuto",
          sku: item.products?.sku || "—",
          quantity: item.quantity,
          originalPrice: Number(item.unit_price || 0),
          currentPrice,
          available,
        };
      });

      const originalTotal = comparisonItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
      const newTotal = comparisonItems.filter(i => i.available && i.currentPrice !== null).reduce((s, i) => s + (i.currentPrice! * i.quantity), 0);
      const hasChanges = comparisonItems.some(i => !i.available || i.currentPrice === null || i.currentPrice !== i.originalPrice);

      if (!hasChanges) {
        // No changes — duplicate directly
        await executeDuplicate(order, comparisonItems);
      } else {
        // Show price comparison dialog
        setPriceCheckData({ order, items: comparisonItems, originalTotal, newTotal, hasChanges });
      }
    } catch (error) {
      showErrorToast(error, "DealerOrders.prepareDuplicate");
    } finally {
      setDuplicatingId(null);
      
    }
  };

  // Step 2: Execute the actual duplication
  const executeDuplicate = async (order: any, comparisonItems?: typeof priceCheckData extends null ? never : NonNullable<typeof priceCheckData>["items"]) => {
    if (!client) return;
    setDuplicatingId(order.id);
    try {
      const itemsToUse = comparisonItems || priceCheckData?.items;
      if (!itemsToUse) return;

      const validItems = itemsToUse
        .filter(i => i.available && i.currentPrice !== null)
        .map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.currentPrice!,
          subtotal: i.currentPrice! * i.quantity,
        }));

      if (!validItems.length) { toast.error("Nessun prodotto disponibile per la duplicazione"); return; }

      const excludedCount = itemsToUse.length - validItems.length;

      const { data: newOrder, error: orderErr } = await supabase.rpc("create_order_with_items", {
        p_client_id: client.id,
        p_status: "draft",
        p_notes: `Duplicato da ordine ${(order as any).order_code || order.id.slice(0, 8)}`,
        p_payment_terms: (client as any).payment_terms || null,
        p_items: validItems,
      });
      if (orderErr) throw orderErr;

      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      const newCode = (newOrder as any)?.order_code || (newOrder as any)?.id?.slice(0, 8);
      if (excludedCount > 0) {
        toast.warning(`Ordine duplicato come bozza #${newCode}. ${excludedCount} prodotti non disponibili esclusi. Verificalo prima di inviarlo.`);
      } else {
        toast.success(`Ordine duplicato come bozza #${newCode}. Verificalo prima di inviarlo.`);
      }
    } catch (error) {
      showErrorToast(error, "DealerOrders.duplicate");
    } finally {
      setDuplicatingId(null);
      setPriceCheckData(null);
    }
  };

  // Cancel submitted order
  const handleCancelOrder = async (order: any) => {
    setCancellingId(order.id);
    try {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-orders-full"] });
      toast.success("Ordine annullato con successo");
    } catch (error) {
      showErrorToast(error, "DealerOrders.cancel");
    } finally {
      setCancellingId(null);
      setConfirmCancel(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">I Miei Ordini</h1>
          <p className="text-sm text-muted-foreground">Visualizza e traccia tutti i tuoi ordini B2B</p>
        </div>
        <Badge variant="outline" className="text-xs">{orders?.length || 0} ordini</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Caricamento ordini...
        </div>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun ordine ancora. Sfoglia il catalogo per effettuare il primo ordine.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
          {pageData.map(order => {
            const status = order.status || "draft";
            const statusLabel = getOrderStatusLabel(status);
            const statusColor = getOrderStatusColor(status);
            const statusMessage = STATUS_MESSAGES[status] || null;
            const isExpanded = expandedOrder === order.id;
            const docs = (order as any).order_documents || [];
            const items = (order.order_items || []) as any[];
            const shippingCost = Number((order as any).shipping_cost_client || 0);
            const phaseIdx = getPhaseIndex(status);
            const isPaid = (order as any).payment_status === "paid";
            const isCancelled = status === "cancelled";
            const isDraft = status === "draft";
            const isSubmitted = status === "submitted";

            return (
              <div key={order.id} className="glass-card-solid overflow-hidden">
                {/* Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      status === "delivered" ? "bg-success/10" :
                      status === "confirmed" || status === "processing" ? "bg-primary/10" :
                      "bg-muted"
                    }`}>
                      <Package size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground">
                        {(order as any).order_code || `Ordine #${order.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                        {items.length > 0 && <span className="ml-2">· {items.length} prodott{items.length > 1 ? "i" : "o"}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     {isDraft && <Badge className="border-0 text-xs bg-muted text-muted-foreground">Bozza</Badge>}
                    {isSubmitted && <Badge className="border-0 text-xs bg-blue-100 text-blue-700">Inviato - In attesa di conferma</Badge>}
                    {!isDraft && !isSubmitted && <Badge className={`border-0 text-xs ${statusColor}`}>{statusLabel}</Badge>}
                    <span className="font-heading font-bold text-foreground text-lg">
                      €{(Number(order.total_amount || 0) + shippingCost).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </span>
                    {isSubmitted && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-destructive hover:text-destructive/80 text-xs"
                        onClick={(e) => { e.stopPropagation(); setConfirmCancel(order); }}
                        title="Annulla Ordine"
                      >
                        <XCircle size={14} className="mr-1" /> Annulla
                      </Button>
                    )}
                    {!isCancelled && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                        disabled={duplicatingId === order.id}
                        onClick={(e) => { e.stopPropagation(); handlePrepareDuplicate(order); }}
                        title="Duplica Ordine"
                      >
                        {duplicatingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Status message */}
                    {statusMessage && (
                      <div className="px-5 py-3 bg-primary/5 border-b border-border flex items-start gap-3">
                        <Bell size={14} className="text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground">{statusMessage}</p>
                      </div>
                    )}

                    {/* Progress timeline */}
                    {isCancelled ? (
                      <div className="px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle size={16} />
                          <span className="text-sm font-semibold">Ordine Annullato</span>
                        </div>
                      </div>
                    ) : phaseIdx >= 0 && (
                      <div className="px-5 py-4 border-b border-border">
                        <div className="flex items-center justify-between">
                          {ORDER_PHASES.map((phase, i) => {
                            const isComplete = i <= phaseIdx;
                            const isCurrent = i === phaseIdx && !isPaid;
                            const PhaseIcon = phase.icon;
                            return (
                              <div key={phase.key} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                                    isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                                    isComplete ? "bg-success/20 text-success" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    <PhaseIcon size={14} />
                                  </div>
                                  <span className={`text-[9px] mt-1 text-center max-w-[70px] leading-tight ${
                                    isCurrent ? "font-bold text-primary" :
                                    isComplete ? "text-success" :
                                    "text-muted-foreground"
                                  }`}>{phase.label}</span>
                                </div>
                                {i < ORDER_PHASES.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                                    i < phaseIdx ? "bg-success" : "bg-border"
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                          {/* Pagato step */}
                          <div className="flex items-center flex-none">
                            <div className={`flex-1 h-0.5 w-6 mx-1 mt-[-14px] ${isPaid ? "bg-success" : "bg-border"}`} />
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                                isPaid ? "bg-success text-success-foreground ring-2 ring-success/30" : "bg-muted text-muted-foreground"
                              }`}>
                                <DollarSign size={14} />
                              </div>
                              <span className={`text-[9px] mt-1 text-center max-w-[70px] leading-tight ${
                                isPaid ? "font-bold text-success" : "text-muted-foreground"
                              }`}>Pagato</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tracking */}
                    {order.tracking_number && (
                      <div className="px-5 py-3 bg-secondary/30 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2">
                          <Truck size={14} className="text-primary" />
                          <span className="text-xs text-muted-foreground">Tracking: </span>
                          <span className="text-xs font-mono font-semibold text-foreground">{order.tracking_number}</span>
                        </div>
                        {order.tracking_url && (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                              Traccia spedizione <ExternalLink size={12} />
                            </Button>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="px-5 py-2 bg-secondary/20 border-b border-border">
                        <p className="text-xs text-muted-foreground"><span className="font-semibold">Le tue note:</span> {order.notes}</p>
                      </div>
                    )}

                    {/* Items */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Prodotto</TableHead>
                          <TableHead className="text-xs text-right">Qtà</TableHead>
                          <TableHead className="text-xs text-right">Prezzo</TableHead>
                          <TableHead className="text-xs text-right">Sconto</TableHead>
                          <TableHead className="text-xs text-right">Subtotale</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="text-sm font-heading font-semibold text-foreground">{item.products?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.products?.sku}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm text-success">{item.discount_pct ? `-${item.discount_pct}%` : "—"}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Totals */}
                    <div className="px-5 py-3 border-t border-border space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prodotti</span>
                        <span className="font-semibold text-foreground">€{Number(order.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spedizione</span>
                        <span className={shippingCost > 0 ? "font-semibold text-foreground" : "text-muted-foreground italic text-xs"}>
                          {shippingCost > 0 ? `€${shippingCost.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "In fase di calcolo"}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="font-heading font-bold text-foreground">Totale</span>
                        <span className="font-heading text-xl font-bold text-foreground">
                          €{(Number(order.total_amount || 0) + shippingCost).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="px-5 py-4 border-t border-border bg-secondary/20">
                      <h4 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <FileText size={14} /> Documenti
                      </h4>
                      {docs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nessun documento disponibile. I documenti saranno caricati dopo la conferma dell'ordine.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc: any) => (
                            <a
                              key={doc.id}
                              href={getDownloadUrl(doc.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3 hover:bg-background/80 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileText size={14} className="text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {doc.file_name} · {format(new Date(doc.created_at), "dd MMM yyyy")}
                                  </p>
                                </div>
                              </div>
                              <Download size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notification History */}
                    <div className="px-5 py-4 border-t border-border bg-secondary/10">
                      <h4 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <Bell size={14} /> Storico Notifiche
                      </h4>
                      <OrderEventsTimeline orderId={order.id} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={allOrders.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </>
      )}

      {/* Price Check Dialog */}
      <Dialog open={!!priceCheckData} onOpenChange={() => setPriceCheckData(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verifica prezzi prima di duplicare</DialogTitle>
          </DialogHeader>
          {priceCheckData && (
            <>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Prodotto</TableHead>
                      <TableHead className="text-xs text-right">Prezzo Orig.</TableHead>
                      <TableHead className="text-xs text-right">Prezzo Attuale</TableHead>
                      <TableHead className="text-xs text-right">Variazione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceCheckData.items.map((item) => {
                      const diff = item.available && item.currentPrice !== null ? item.currentPrice - item.originalPrice : null;
                      return (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <p className="text-xs font-medium">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">€{item.originalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {!item.available || item.currentPrice === null
                              ? <span className="text-destructive font-medium">Non disponibile</span>
                              : `€${item.currentPrice.toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {!item.available || item.currentPrice === null ? (
                              <span className="text-destructive">Rimosso</span>
                            ) : diff === 0 ? (
                              <span className="text-success">Invariato</span>
                            ) : diff! > 0 ? (
                              <span className="text-destructive">+€{diff!.toFixed(2)} ↑</span>
                            ) : (
                              <span className="text-success">-€{Math.abs(diff!).toFixed(2)} ↓</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between text-sm mt-2 p-3 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">
                  Totale originale: <span className="font-mono font-semibold text-foreground">€{priceCheckData.originalTotal.toFixed(2)}</span>
                </span>
                <span className="text-muted-foreground">
                  Nuovo totale: <span className="font-mono font-semibold text-primary">€{priceCheckData.newTotal.toFixed(2)}</span>
                </span>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPriceCheckData(null)}>Annulla</Button>
                <Button onClick={() => executeDuplicate(priceCheckData.order, priceCheckData.items)} disabled={!!duplicatingId}>
                  {duplicatingId ? "Duplicazione..." : "Duplica con prezzi attuali"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Dialog */}
      <Dialog open={!!confirmCancel} onOpenChange={() => setConfirmCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Annulla Ordine</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler annullare questo ordine? Questa azione non può essere annullata.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>Indietro</Button>
            <Button variant="destructive" onClick={() => handleCancelOrder(confirmCancel)} disabled={!!cancellingId}>
              {cancellingId ? "Annullamento..." : "Annulla Ordine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerOrders;

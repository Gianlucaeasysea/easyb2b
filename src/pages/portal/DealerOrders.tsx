import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, ExternalLink, Clock, CheckCircle, Truck, Package,
  ChevronDown, ChevronUp, FileText, Download, Bell, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { ORDER_STATUS_MAP, getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { PaginationControls } from "@/components/PaginationControls";

const ORDER_PHASES = [
  { key: "confirmed", label: "Ordine Ricevuto", icon: CheckCircle },
  { key: "processing", label: "Confermato", icon: Package },
  { key: "ready_to_ship", label: "In Preparazione", icon: Clock },
  { key: "shipped", label: "Pronto", icon: CheckCircle },
  { key: "delivered", label: "Consegnato", icon: Package },
];

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "Il tuo ordine è stato ricevuto ed è in fase di revisione. Riceverai una conferma con la fattura a breve.",
  processing: "Il tuo ordine è stato confermato e la fattura è disponibile nei documenti. Stiamo preparando la spedizione.",
  ready_to_ship: "Il tuo ordine è pronto e sarà spedito a breve. Riceverai il tracking non appena disponibile.",
  shipped: "Il tuo ordine è stato spedito! Usa il link di tracking per seguire la consegna.",
  delivered: "Il tuo ordine è stato consegnato con successo.",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  order_confirmation: "Conferma Ordine",
  invoice: "Fattura",
  delivery_note: "DDT / Bolla di Spedizione",
  warranty: "Certificato di Garanzia",
  other: "Altro",
};

const DealerOrders = () => {
  const { user } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
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

  const { pageData, page, totalPages, from, to, totalCount, nextPage, prevPage, goToPage } = usePaginatedData({ data: orders || [], pageSize: 20 });

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from("order-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getPhaseIndex = (status: string) => {
    const idx = ORDER_PHASES.findIndex(p => p.key === status);
    return idx >= 0 ? idx : -1;
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

            return (
              <div key={order.id} className="glass-card-solid overflow-hidden">
                {/* Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      status === "Delivered" || status === "delivered" ? "bg-success/10" :
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
                    <Badge className={`border-0 text-xs ${statusColor}`}>{statusLabel}</Badge>
                    <span className="font-heading font-bold text-foreground text-lg">
                      €{(Number(order.total_amount || 0) + shippingCost).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </span>
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
                    {phaseIdx >= 0 && (
                      <div className="px-5 py-4 border-b border-border">
                        <div className="flex items-center justify-between">
                          {ORDER_PHASES.map((phase, i) => {
                            const isComplete = i <= phaseIdx;
                            const isCurrent = i === phaseIdx;
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
                          {shippingCost > 0 ? `€${shippingCost.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "Da calcolare"}
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
        <PaginationControls page={page} totalPages={totalPages} from={from} to={to} totalCount={totalCount} onPrev={prevPage} onNext={nextPage} onGoTo={goToPage} />
      </>
      )}
    </div>
  );
};

export default DealerOrders;

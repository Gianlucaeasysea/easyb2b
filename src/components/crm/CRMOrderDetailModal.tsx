import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Calendar, Truck, FileText, Clock, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from "@/lib/constants";

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy", { locale: it }); } catch { return "—"; }
};

export const CRMOrderDetailModal = ({ open, onOpenChange, orderId }: CRMOrderDetailModalProps) => {
  const { data: order, isLoading } = useQuery({
    queryKey: ["crm-order-detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku, barcode, images))")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: documents } = useQuery({
    queryKey: ["crm-order-docs", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_documents")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!orderId && open,
  });

  const { data: events } = useQuery({
    queryKey: ["crm-order-events", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!orderId && open,
  });

  const handleDownloadDoc = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("order-documents").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const items = (order as any)?.order_items || [];
  const itemsTotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading || !order ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Caricamento...</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-lg flex items-center gap-2">
                <ShoppingBag size={18} />
                Ordine {(order as any).order_code || `#${order.id.slice(0, 8)}`}
              </DialogTitle>
            </DialogHeader>

            {/* Status & dates row */}
            <div className="flex flex-wrap gap-3 mt-2">
              <Badge className={`border-0 ${statusColors[(order as any).status || "draft"]}`}>
                {(order as any).status || "draft"}
              </Badge>
              {(order as any).payment_status && (
                <Badge className={`border-0 ${(order as any).payment_status === "Payed" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                  {(order as any).payment_status}
                </Badge>
              )}
              {(order as any).tracking_number && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Truck size={10} /> {(order as any).tracking_number}
                </Badge>
              )}
            </div>

            {/* Dates grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading flex items-center gap-1"><Calendar size={10} /> Data Ordine</p>
                <p className="text-sm font-semibold text-foreground mt-1">{fmtDate(order.created_at)}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading flex items-center gap-1"><Truck size={10} /> Consegna</p>
                <p className="text-sm font-semibold text-foreground mt-1">{fmtDate((order as any).delivery_date)}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading flex items-center gap-1"><Calendar size={10} /> Ritiro</p>
                <p className="text-sm font-semibold text-foreground mt-1">{fmtDate((order as any).pickup_date)}</p>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading flex items-center gap-1"><Calendar size={10} /> Pagamento</p>
                <p className="text-sm font-semibold text-foreground mt-1">{fmtDate((order as any).payed_date)}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-5">
              <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2 text-sm">
                <ShoppingBag size={14} /> Articoli ({items.length})
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Prodotto</TableHead>
                      <TableHead className="text-xs text-center">Qtà</TableHead>
                      <TableHead className="text-xs text-right">Prezzo Unit.</TableHead>
                      <TableHead className="text-xs text-right">Sconto</TableHead>
                      <TableHead className="text-xs text-right">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.products?.sku || "—"}</TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {item.products?.name || "Prodotto rimosso"}
                          {item.products?.barcode && (
                            <span className="block text-[10px] text-muted-foreground">EAN: {item.products.barcode}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                        <TableCell className="text-xs text-right font-mono">€{Number(item.unit_price || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs text-right">{item.discount_pct ? `${item.discount_pct}%` : "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold">€{Number(item.subtotal || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={5} className="text-xs font-semibold text-right text-foreground">Subtotale Prodotti</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-foreground">€{itemsTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                    {((order as any).shipping_cost_client || 0) > 0 && (
                      <TableRow className="bg-secondary/30">
                        <TableCell colSpan={5} className="text-xs text-right text-muted-foreground">Spedizione</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">€{Number((order as any).shipping_cost_client || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={5} className="text-sm font-bold text-right text-foreground">Totale Ordine</TableCell>
                      <TableCell className="text-sm text-right font-mono font-bold text-primary">€{Number(order.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Documents */}
            {documents && documents.length > 0 && (
              <div className="mt-5">
                <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <FileText size={14} /> Documenti ({documents.length})
                </h3>
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-primary" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{doc.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.doc_type} · {fmtDate(doc.created_at)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleDownloadDoc(doc.file_path, doc.file_name)}>
                        <Download size={12} /> Scarica
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking link */}
            {(order as any).tracking_url && (
              <div className="mt-4">
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.open((order as any).tracking_url, "_blank")}>
                  <ExternalLink size={12} /> Traccia Spedizione
                </Button>
              </div>
            )}

            {/* Notes */}
            {(order as any).notes && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Note Cliente</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(order as any).notes}</p>
              </div>
            )}

            {/* Timeline / Storyline */}
            {events && events.length > 0 && (
              <div className="mt-5">
                <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                  <Clock size={14} /> Storyline
                </h3>
                <div className="relative border-l-2 border-border ml-3 space-y-3">
                  {events.map((ev: any) => (
                    <div key={ev.id} className="ml-6 relative">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="p-2.5 bg-secondary/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">{ev.title}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(ev.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </span>
                        </div>
                        {ev.description && <p className="text-[11px] text-muted-foreground mt-1">{ev.description}</p>}
                        {ev.event_type && <Badge variant="outline" className="text-[10px] mt-1">{ev.event_type}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, Calendar, Truck, FileText, Download, ExternalLink, Building2, Mail, Handshake, Save } from "lucide-react";
import { format } from "date-fns";
import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from "@/lib/constants";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { toast } from "sonner";

interface CRMOrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  order_confirmation: "Order Confirmation",
  invoice: "Invoice", ddt: "DDT", credit_note: "Credit Note",
  proforma: "Proforma", delivery_note: "Delivery Note",
  warranty: "Warranty", other: "Other",
};
const docTypeLabel = (type: string) => DOC_TYPE_LABELS[type] || type;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};

export const CRMOrderDetailModal = ({ open, onOpenChange, orderId }: CRMOrderDetailModalProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [internalNotes, setInternalNotes] = useState("");
  const [notesChanged, setNotesChanged] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["crm-order-detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(id, company_name, contact_name, email), order_items(*, products(name, sku, barcode, images))")
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setInternalNotes((data as any).internal_notes || "");
        setNotesChanged(false);
      }
      return data;
    },
    enabled: !!orderId && open,
  });

  const { data: linkedDeal } = useQuery({
    queryKey: ["crm-order-linked-deal", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, stage")
        .eq("order_id", orderId!)
        .maybeSingle();
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

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ internal_notes: internalNotes }).eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Internal notes saved");
      setNotesChanged(false);
      queryClient.invalidateQueries({ queryKey: ["crm-order-detail", orderId] });
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const handleDownloadDoc = async (filePath: string) => {
    const { data } = await supabase.storage.from("order-documents").createSignedUrl(filePath, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const items = (order as any)?.order_items || [];
  const itemsTotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
  const client = (order as any)?.clients;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading || !order ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : (
          <>
            {/* HEADER */}
            <DialogHeader>
              <DialogTitle className="font-heading text-lg flex items-center gap-2">
                <ShoppingBag size={18} />
                Order {(order as any).order_code || `#${order.id.slice(0, 8)}`}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={`border-0 ${getOrderStatusColor((order as any).status || "draft")}`}>
                {getOrderStatusLabel((order as any).status || "draft")}
              </Badge>
              {(order as any).payment_status && (
                <Badge className={`border-0 ${getPaymentStatusColor((order as any).payment_status)}`}>
                  {getPaymentStatusLabel((order as any).payment_status)}
                </Badge>
              )}
              {(order as any).tracking_number && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Truck size={10} /> {(order as any).tracking_number}
                </Badge>
              )}
            </div>

            {/* Client info */}
            {client && (
              <div className="flex items-center gap-2 mt-2">
                <Building2 size={14} className="text-primary" />
                <button
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => { onOpenChange(false); navigate(`/crm/organizations/${client.id}`); }}
                >
                  {client.company_name}
                </button>
                {client.contact_name && <span className="text-xs text-muted-foreground">· {client.contact_name}</span>}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Order Date", icon: Calendar, value: fmtDate(order.created_at) },
                { label: "Delivery", icon: Truck, value: fmtDate((order as any).delivery_date) },
                { label: "Pickup", icon: Calendar, value: fmtDate((order as any).pickup_date) },
                { label: "Payment", icon: Calendar, value: fmtDate((order as any).payed_date) },
              ].map(d => (
                <div key={d.label} className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading flex items-center gap-1">
                    <d.icon size={10} /> {d.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">{d.value}</p>
                </div>
              ))}
            </div>

            {/* ORDER ITEMS TABLE */}
            <div className="mt-5">
              <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2 text-sm">
                <ShoppingBag size={14} /> Items ({items.length})
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs text-center">Qty</TableHead>
                      <TableHead className="text-xs text-right">Unit Price</TableHead>
                      <TableHead className="text-xs text-right">Discount</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs font-medium text-foreground">
                          {item.products?.name || "Removed product"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.products?.sku || "—"}</TableCell>
                        <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                        <TableCell className="text-xs text-right font-mono">€{Number(item.unit_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-xs text-right">{item.discount_pct ? `${item.discount_pct}%` : "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold">€{Number(item.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    {/* Summary rows */}
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={5} className="text-xs font-semibold text-right text-foreground">Product Subtotal</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-foreground">€{itemsTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={5} className="text-xs text-right text-muted-foreground">Shipping</TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">
                        {((order as any).shipping_cost_client || 0) > 0
                          ? `€${Number((order as any).shipping_cost_client).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "To be calculated"}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={5} className="text-sm font-bold text-right text-foreground">Order Total</TableCell>
                      <TableCell className="text-sm text-right font-mono font-bold text-primary">€{Number(order.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {(order as any).payment_terms && (
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium">Payment terms:</span> {(order as any).payment_terms}
                </p>
              )}
            </div>

            {/* Documents */}
            {documents && (
              <div className="mt-5">
                <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <FileText size={14} /> Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No documents available</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-primary" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{doc.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">{docTypeLabel(doc.doc_type)} · {fmtDate(doc.created_at)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleDownloadDoc(doc.file_path)}>
                          <Download size={12} /> Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {(order as any).notes && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Client Notes</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(order as any).notes}</p>
              </div>
            )}

            {/* Internal notes (editable for sales) */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-1">Internal Notes</p>
              <Textarea
                value={internalNotes}
                onChange={e => { setInternalNotes(e.target.value); setNotesChanged(true); }}
                placeholder="Add internal notes..."
                className="text-xs min-h-[60px]"
              />
              {notesChanged && (
                <Button size="sm" className="mt-2 gap-1 text-xs" onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending}>
                  <Save size={12} /> Save Notes
                </Button>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-5">
              <h3 className="font-heading font-bold text-foreground mb-3 text-sm">Timeline</h3>
              <OrderEventsTimeline orderId={orderId!} />
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              {client?.email && (
                <Button
                  variant="outline" size="sm" className="gap-1 text-xs"
                  onClick={() => { onOpenChange(false); navigate(`/crm/organizations/${client.id}`); }}
                >
                  <Mail size={12} /> Contact Client
                </Button>
              )}
              {client && (
                <Button
                  variant="outline" size="sm" className="gap-1 text-xs"
                  onClick={() => { onOpenChange(false); navigate(`/crm/organizations/${client.id}`); }}
                >
                  <Building2 size={12} /> Go to Organization
                </Button>
              )}
              {linkedDeal && (
                <Button
                  variant="outline" size="sm" className="gap-1 text-xs"
                  onClick={() => { onOpenChange(false); navigate("/crm/deals"); }}
                >
                  <Handshake size={12} /> Deal: {linkedDeal.title}
                </Button>
              )}
              {(order as any).tracking_url && (
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.open((order as any).tracking_url, "_blank")}>
                  <ExternalLink size={12} /> Track Shipment
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
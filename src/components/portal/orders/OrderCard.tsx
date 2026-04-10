import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package, ExternalLink, Clock, CheckCircle, Truck,
  ChevronDown, ChevronUp, FileText, Download, Bell, Loader2, Send,
  Copy, DollarSign, XCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/orders";
import React from "react";

const ORDER_PHASES = [
  { key: "submitted", label: "Submitted", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "ready_to_ship", label: "Ready to Ship", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
];

const STATUS_MESSAGES: Record<string, string> = {
  submitted: "Your order has been submitted and is awaiting confirmation from our team.",
  confirmed: "Your order has been confirmed and is under review. You will receive an invoice shortly.",
  processing: "Your order has been confirmed and the invoice is available in the documents section. We are preparing shipment.",
  ready_to_ship: "Your order is ready and will be shipped shortly. You will receive tracking information as soon as available.",
  shipped: "Your order has been shipped! Use the tracking link to follow the delivery.",
  delivered: "Your order has been delivered successfully.",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  order_confirmation: "Order Confirmation",
  invoice: "Invoice",
  delivery_note: "Delivery Note",
  ddt: "DDT",
  credit_note: "Credit Note",
  proforma: "Proforma",
  warranty: "Warranty Certificate",
  other: "Other",
};

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  isHighlighted: boolean;
  highlightRef?: React.Ref<HTMLDivElement>;
  duplicatingId: string | null;
  onToggleExpand: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
}

const getPhaseIndex = (status: string) => {
  if (status === "cancelled") return -2;
  const idx = ORDER_PHASES.findIndex((p) => p.key === status);
  return idx >= 0 ? idx : -1;
};

const handleDownloadDoc = async (filePath: string) => {
  const { data } = await supabase.storage.from("order-documents").createSignedUrl(filePath, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
};

const OrderCard = ({
  order,
  isExpanded,
  isHighlighted,
  highlightRef,
  duplicatingId,
  onToggleExpand,
  onCancel,
  onDuplicate,
}: OrderCardProps) => {
  const status = order.status || "draft";
  const statusLabel = getOrderStatusLabel(status);
  const statusColor = getOrderStatusColor(status);
  const statusMessage = STATUS_MESSAGES[status] || null;
  const docs = order.order_documents || [];
  const items = order.order_items || [];
  const isSalesOrder = order.order_type === "sales_manual";
  const shippingCost = Number(order.shipping_cost_client || 0);
  const phaseIdx = getPhaseIndex(status);
  const isPaid = order.payment_status === "paid";
  const isCancelled = status === "cancelled";
  const isDraft = status === "draft";
  const isSubmitted = status === "submitted";

  return (
    <div
      ref={highlightRef}
      className={`glass-card-solid overflow-hidden transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`}
    >
      {/* Header */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={onToggleExpand}
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
              {order.order_code || `Order #${order.id.slice(0, 8).toUpperCase()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
              {items.length > 0 && <span className="ml-2">· {items.length} product{items.length > 1 ? "s" : ""}</span>}
              {order.payment_due_date && (
                <span className="ml-2">· Due: <span className={`font-semibold ${
                  order.payment_status === "paid" ? "text-success" :
                  new Date(order.payment_due_date) < new Date() ? "text-destructive" :
                  differenceInDays(new Date(order.payment_due_date), new Date()) <= 7 ? "text-warning" :
                  "text-foreground"
                }`}>{format(new Date(order.payment_due_date), "dd/MM/yyyy")}</span></span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isDraft && <Badge className="border-0 text-xs bg-muted text-muted-foreground">Draft</Badge>}
          {isSubmitted && <Badge className="border-0 text-xs bg-blue-100 text-blue-700">Submitted - Awaiting confirmation</Badge>}
          {!isDraft && !isSubmitted && <Badge className={`border-0 text-xs ${statusColor}`}>{statusLabel}</Badge>}
          <span className="font-heading font-bold text-foreground text-lg">
            €{(Number(order.total_amount || 0) + shippingCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          {isSubmitted && (
            <Button
              variant="ghost" size="sm"
              className="h-7 text-destructive hover:text-destructive/80 text-xs"
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              title="Cancel Order"
            >
              <XCircle size={14} className="mr-1" /> Cancel
            </Button>
          )}
          {!isCancelled && (
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              disabled={duplicatingId === order.id}
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              title="Duplicate Order"
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
          {isSalesOrder && (
            <div className="px-5 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs text-muted-foreground italic">📋 Order created by sales representative</p>
            </div>
          )}

          {/* Progress timeline */}
          {isCancelled ? (
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle size={16} />
                <span className="text-sm font-semibold">Order Cancelled</span>
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
                {/* Paid step */}
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
                    }`}>Paid</span>
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
                    Track shipment <ExternalLink size={12} />
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="px-5 py-2 bg-secondary/20 border-b border-border">
              <p className="text-xs text-muted-foreground"><span className="font-semibold">Your notes:</span> {order.notes}</p>
            </div>
          )}

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Discount</TableHead>
                <TableHead className="text-xs text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
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
              <span className="text-muted-foreground">Products</span>
              <span className="font-semibold text-foreground">€{Number(order.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className={shippingCost > 0 ? "font-semibold text-foreground" : "text-muted-foreground italic text-xs"}>
                {shippingCost > 0 ? `€${shippingCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Being calculated"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-heading font-bold text-foreground">Total</span>
              <span className="font-heading text-xl font-bold text-foreground">
                €{(Number(order.total_amount || 0) + shippingCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Documents */}
          <div className="px-5 py-4 border-t border-border bg-secondary/20">
            <h4 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <FileText size={14} /> Documents
            </h4>
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No documents available. Documents will be uploaded after order confirmation.
              </p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDownloadDoc(doc.file_path)}
                    className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-3 hover:bg-background/80 transition-colors group w-full text-left"
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification History */}
          <div className="px-5 py-4 border-t border-border bg-secondary/10">
            <h4 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Bell size={14} /> Notification History
            </h4>
            <OrderEventsTimeline orderId={order.id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;

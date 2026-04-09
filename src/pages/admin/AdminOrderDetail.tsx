import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Clock, CheckCircle, Truck, Package, Mail, AlertTriangle, XCircle, CalendarClock } from "lucide-react";
import { addDays, lastDayOfMonth, addMonths, differenceInDays } from "date-fns";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import OrderDocuments from "@/components/OrderDocuments";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, getOrderStatusLabel, getOrderStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor, getAvailableTransitions, canTransitionTo,
} from "@/lib/constants";

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  prepaid: "Prepaid",
  "30_days": "Net 30",
  "60_days": "Net 60",
  "90_days": "Net 90",
  end_of_month: "End of Month",
};

const calculateDueDate = (paymentTerms: string | null, confirmedDate: Date): Date => {
  switch (paymentTerms) {
    case "prepaid": return confirmedDate;
    case "30_days": return addDays(confirmedDate, 30);
    case "60_days": return addDays(confirmedDate, 60);
    case "90_days": return addDays(confirmedDate, 90);
    case "end_of_month": return lastDayOfMonth(addMonths(confirmedDate, 1));
    default: return addDays(confirmedDate, 30);
  }
};
import type { Tables } from "@/integrations/supabase/types";

type OrderRow = Tables<"orders">;

interface OrderWithRelations extends OrderRow {
  clients: {
    company_name: string;
    country: string | null;
    contact_name: string | null;
    email: string | null;
  } | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    discount_pct: number | null;
    products: {
      name: string;
      sku: string | null;
    } | null;
  }>;
}

// statusOptions computed dynamically based on current order status

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, country, contact_name, email), order_items(*, products(name, sku))")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrderWithRelations;
    },
    enabled: !!id,
  });

  const [status, setStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [shippingCost, setShippingCost] = useState("");

  // Sync state when order loads
  const orderLoaded = order && !status;
  if (orderLoaded) {
    setStatus(order.status || "draft");
    setPaymentStatus(order.payment_status || "unpaid");
    setTrackingNumber(order.tracking_number || "");
    setTrackingUrl(order.tracking_url || "");
    setInternalNotes(order.internal_notes || "");
    setShippingCost(String(Number(order.shipping_cost_client || 0)));
  }

  const handleSave = async () => {
    if (!id) return;
    const previousStatus = order?.status || "draft";
    if (status !== previousStatus && !canTransitionTo(previousStatus, status)) {
      toast.error("Invalid status transition");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("orders").update({
        status,
        payment_status: paymentStatus,
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null,
        internal_notes: internalNotes || null,
        shipping_cost_client: parseFloat(shippingCost) || 0,
      }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-events", id] });
      toast.success("Order updated");

      // Log event on status change
      if (previousStatus !== status) {
        const statusLabel = getOrderStatusLabel(status);
        await supabase.from("order_events").insert({
          order_id: id,
          event_type: "status_change",
          title: `Status updated: ${statusLabel}`,
          description: trackingNumber ? `Tracking: ${trackingNumber}` : undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["order-events", id] });
      }

      // Send email notification + in-app notification on status change
      if (previousStatus !== status) {
        try {
          await supabase.functions.invoke('send-order-notification', {
            body: {
              orderId: id,
              orderCode: order?.order_code,
              type: 'status_update',
            },
          });
        } catch (emailErr) {
          showErrorToast(emailErr, "AdminOrderDetail.emailNotification");
        }

        // Create in-app notification for the dealer
        try {
          const statusLabel = getOrderStatusLabel(status);
          await supabase.from("client_notifications").insert({
            client_id: order?.client_id ?? "",
            title: `Order ${order?.order_code || ''} status updated: ${statusLabel}`,
            body: trackingNumber ? `Tracking: ${trackingNumber}` : `Your order status has been updated to "${statusLabel}".`,
            type: "order",
            order_id: id,
          });
        } catch (notifErr) {
          showErrorToast(notifErr, "AdminOrderDetail.inAppNotification");
        }
      }
    } catch (error) {
      showErrorToast(error, "AdminOrderDetail.save");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!id || !order) return;
    setSaving(true);
    try {
      const confirmedDate = new Date();
      const dueDate = calculateDueDate(order.payment_terms, confirmedDate);
      await supabase.from("orders").update({
        status: "confirmed",
        payment_due_date: format(dueDate, "yyyy-MM-dd"),
      }).eq("id", id);
      await supabase.from("order_events").insert({
        order_id: id, event_type: "status_change", title: "Status updated: Confirmed",
      });
      await supabase.from("client_notifications").insert({
        client_id: order.client_id,
        title: "Order confirmed",
        body: `Your order #${order.order_code || id.slice(0, 8)} has been confirmed and is being processed.`,
        type: "order", order_id: id,
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode: order.order_code, type: 'status_update' },
        });
      } catch {}
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setStatus("confirmed");
      toast.success("Order confirmed! Don't forget to upload the Order Confirmation document.", {
        action: { label: "Upload Now", onClick: () => {
          // Scroll to documents section
          document.querySelector('[data-documents-section]')?.scrollIntoView({ behavior: 'smooth' });
        }},
        duration: 8000,
      });
    } catch (error) {
      showErrorToast(error, "AdminOrderDetail.confirmOrder");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!id || !order || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await supabase.from("orders").update({ status: "cancelled", internal_notes: `Rejected: ${rejectReason}` }).eq("id", id);
      await supabase.from("order_events").insert({
        order_id: id, event_type: "status_change", title: "Order rejected", description: rejectReason,
      });
      await supabase.from("client_notifications").insert({
        client_id: order.client_id,
        title: "Order rejected",
        body: `Your order #${order.order_code || id.slice(0, 8)} has been rejected. Reason: ${rejectReason}`,
        type: "order", order_id: id,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setStatus("cancelled");
      setShowRejectDialog(false);
      toast.success("Order rejected");
    } catch (error) {
      showErrorToast(error, "AdminOrderDetail.rejectOrder");
    } finally {
      setRejecting(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground p-6">Loading...</p>;
  if (!order) return <p className="text-muted-foreground p-6">Order not found.</p>;

  const client = order.clients;
  const items = order.order_items || [];
  const currentStatus = order.status || "draft";
  const sc = { label: getOrderStatusLabel(currentStatus), color: getOrderStatusColor(currentStatus) };
  const productsTotal = Number(order.total_amount || 0);
  const shippingVal = parseFloat(shippingCost) || 0;

  return (
    <div className="max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground gap-1.5">
        <ArrowLeft size={14} /> Back
      </Button>

      {currentStatus === "submitted" && (
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              This order is awaiting confirmation
            </span>
            <div className="flex gap-2 ml-4">
              <Button size="sm" onClick={handleConfirmOrder} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                <CheckCircle size={14} /> Confirm Order
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)} className="gap-1">
                <XCircle size={14} /> Reject Order
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Order {order.order_code || `#${order.id.slice(0, 8).toUpperCase()}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client?.company_name} · {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <Badge className={`border-0 text-xs ${sc.color}`}>
          {sc.label}
        </Badge>
      </div>

      {/* Order management */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card-solid p-5 space-y-4">
          <h3 className="font-heading font-bold text-foreground text-sm">Order Management</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            {(() => {
              const transitions = getAvailableTransitions(order.status || "draft");
              if (transitions.length === 0) {
                return (
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${getOrderStatusColor(order.status || "draft")}`}>{getOrderStatusLabel(order.status || "draft")}</Badge>
                    <span className="text-xs text-muted-foreground italic">Final status — not editable</span>
                  </div>
                );
              }
              const options = [order.status || "draft", ...transitions];
              return (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-secondary border-border rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(s => (
                      <SelectItem key={s} value={s}>{getOrderStatusLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Payment Status</label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="bg-secondary border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_STATUSES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Shipping Cost (€) — visible to client</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={shippingCost}
              onChange={e => setShippingCost(e.target.value)}
              className="bg-secondary border-border rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tracking Number</label>
            <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="bg-secondary border-border rounded-lg" placeholder="e.g. 1Z999AA10123456784" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tracking URL</label>
            <Input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} className="bg-secondary border-border rounded-lg" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Internal Notes</label>
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="bg-secondary border-border rounded-lg resize-none" rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-3">Client & Order Info</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Company:</span> {client?.company_name}</p>
              <p><span className="text-muted-foreground">Contact:</span> {client?.contact_name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {client?.email || "—"}</p>
              <p><span className="text-muted-foreground">Country:</span> {client?.country || "—"}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
              <p><span className="text-muted-foreground">Payment:</span> <Badge className={`border-0 text-[10px] ml-1 ${getPaymentStatusColor(order.payment_status || "unpaid")}`}>{getPaymentStatusLabel(order.payment_status || "unpaid")}</Badge></p>
              <p><span className="text-muted-foreground">Paid Date:</span> {order.payed_date || "—"}</p>
              <p><span className="text-muted-foreground">Terms:</span> {PAYMENT_TERMS_LABELS[order.payment_terms || ""] || order.payment_terms || "—"}</p>
              {(order as any).payment_due_date && (
                <p>
                  <span className="text-muted-foreground">Payment Due:</span>{" "}
                  <span className="font-semibold">{format(new Date((order as any).payment_due_date), "dd/MM/yyyy")}</span>
                  {(() => {
                    const due = new Date((order as any).payment_due_date);
                    const today = new Date();
                    const overdue = due < today && order.payment_status !== "paid";
                    const daysOverdue = differenceInDays(today, due);
                    if (overdue) return <Badge variant="destructive" className="ml-2 text-[10px]">OVERDUE by {daysOverdue} days</Badge>;
                    return null;
                  })()}
                </p>
              )}
              <p><span className="text-muted-foreground">Delivery Date:</span> {order.delivery_date || "—"}</p>
            </div>
            {order.notes && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Client Notes:</p>
                <p className="text-sm text-foreground">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Payment due warning */}
          {order.payment_due_date && order.payment_status !== "paid" && (
            <div className={`p-4 rounded-lg flex items-center justify-between ${
              new Date(order.payment_due_date) < new Date() ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
            }`}>
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock size={16} />
                <span>Payment due: <strong>{format(new Date(order.payment_due_date), "dd MMM yyyy")}</strong></span>
                {new Date(order.payment_due_date) < new Date() && <Badge variant="destructive" className="text-[10px]">OVERDUE</Badge>}
              </div>
              {order.status === "delivered" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={async () => {
                    if (!client?.email) { toast.error("No client email"); return; }
                    try {
                      await supabase.functions.invoke("send-crm-email", {
                        body: {
                          to: client.email,
                          subject: `Payment reminder — Order ${order.order_code || order.id.slice(0, 8)}`,
                          body: `This is a friendly reminder that payment for order ${order.order_code || order.id.slice(0, 8)} (€${Number(order.total_amount || 0).toFixed(2)}) was due on ${format(new Date(order.payment_due_date!), "dd MMM yyyy")}. Please arrange payment at your earliest convenience.\n\nBest regards,\nEasysea B2B Team`,
                        },
                      });
                      // Log in communications
                      await supabase.from("client_communications").insert({
                        client_id: order.client_id,
                        recipient_email: client.email,
                        subject: `Payment reminder — Order ${order.order_code || order.id.slice(0, 8)}`,
                        body: `Payment reminder sent for €${Number(order.total_amount || 0).toFixed(2)}`,
                        sent_by: user?.id || "",
                        template_type: "payment_reminder",
                        order_id: order.id,
                      } as any);
                      toast.success("Payment reminder sent");
                    } catch (err) {
                      showErrorToast(err, "sendPaymentReminder");
                    }
                  }}
                >
                  <Mail size={12} /> Send Payment Reminder
                </Button>
              )}
            </div>
          )}

          <div className="glass-card-solid p-5" data-documents-section>
            <OrderDocuments orderId={order.id} />
          </div>

          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock size={14} /> Notification History
            </h3>
            <OrderEventsTimeline orderId={order.id} />
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="glass-card-solid overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Product</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <TableHead className="text-xs text-right">Unit Price</TableHead>
              <TableHead className="text-xs text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="text-sm font-heading font-semibold">{item.products?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.products?.sku}</p>
                </TableCell>
                <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No items linked to this order</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 py-3 border-t border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Products Subtotal</span>
            <span className="text-sm text-foreground">€{productsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Shipping Cost</span>
            {["submitted", "confirmed", "processing"].includes(currentStatus) ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={shippingCost}
                  onChange={e => setShippingCost(e.target.value)}
                  className="w-24 h-7 text-sm text-right bg-secondary border-border rounded-lg"
                  placeholder="0.00"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 gap-1 text-xs"
                  disabled={saving}
                  onClick={async () => {
                    if (!id) return;
                    setSaving(true);
                    try {
                      const shipVal = parseFloat(shippingCost) || 0;
                      const newTotal = productsTotal + shipVal;
                      const { error } = await supabase.from("orders").update({
                        shipping_cost_client: shipVal,
                        total_amount: newTotal,
                      }).eq("id", id);
                      if (error) throw error;
                      // Notify dealer
                      if (shipVal > 0) {
                        await supabase.from("client_notifications").insert({
                          client_id: order.client_id,
                          title: "Shipping calculated",
                          body: `The shipping cost for your order #${order.order_code || id.slice(0, 8)} is €${shipVal.toFixed(2)}. Updated total: €${newTotal.toFixed(2)}`,
                          type: "order",
                          order_id: id,
                        });
                      }
                      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
                      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                      toast.success(`Shipping cost updated: €${shipVal.toFixed(2)}`);
                    } catch (error) {
                      showErrorToast(error, "AdminOrderDetail.saveShipping");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <CheckCircle size={12} /> Save
                </Button>
              </div>
            ) : (
              <span className="text-sm text-foreground">{shippingVal > 0 ? `€${shippingVal.toFixed(2)}` : "—"}</span>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-heading font-bold text-foreground">Order Total</span>
            <span className="font-heading text-lg font-bold text-foreground">€{(productsTotal + (parseFloat(shippingCost) || 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Communications section */}
      {client?.email && (
        <div className="glass-card-solid p-5 mt-6">
          <ClientCommunications
            clientId={order.client_id}
            clientName={client.company_name || "Client"}
            clientEmail={client.email}
            orderId={order.id}
            orderCode={order.order_code}
          />
        </div>
      )}

      {/* Reject Order Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Rejection reason (required)</label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectOrder} disabled={rejecting || !rejectReason.trim()}>
              {rejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrderDetail;

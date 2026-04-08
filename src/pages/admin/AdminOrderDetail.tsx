import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, CheckCircle, Truck, Package, Mail } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import OrderDocuments from "@/components/OrderDocuments";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import { ClientCommunications } from "@/components/crm/ClientCommunications";
import {
  ORDER_STATUSES, PAYMENT_STATUSES, getOrderStatusLabel, getOrderStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor,
} from "@/lib/constants";
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

const statusOptions = Object.keys(ORDER_STATUSES);

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, country, contact_name, email), order_items(*, products(name, sku))")
        .eq("id", id!)
        .single();
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
    setSaving(true);
    try {
      const previousStatus = order?.status;
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
          title: `Stato aggiornato: ${statusLabel}`,
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
        <ArrowLeft size={14} /> Indietro
      </Button>

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
          <h3 className="font-heading font-bold text-foreground text-sm">Gestione Ordine</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-secondary border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{getOrderStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stato Pagamento</label>
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
            <label className="text-xs text-muted-foreground mb-1 block">Costo Spedizione (€) — visibile al cliente</label>
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
            <label className="text-xs text-muted-foreground mb-1 block">Note Interne</label>
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} className="bg-secondary border-border rounded-lg resize-none" rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </div>

        <div className="space-y-6">
          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-3">Info Cliente & Ordine</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Company:</span> {client?.company_name}</p>
              <p><span className="text-muted-foreground">Contact:</span> {client?.contact_name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {client?.email || "—"}</p>
              <p><span className="text-muted-foreground">Country:</span> {client?.country || "—"}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
              <p><span className="text-muted-foreground">Payment:</span> <Badge className={`border-0 text-[10px] ml-1 ${getPaymentStatusColor(order.payment_status || "unpaid")}`}>{getPaymentStatusLabel(order.payment_status || "unpaid")}</Badge></p>
              <p><span className="text-muted-foreground">Data Pagamento:</span> {order.payed_date || "—"}</p>
              <p><span className="text-muted-foreground">Delivery Date:</span> {order.delivery_date || "—"}</p>
            </div>
            {order.notes && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Note del Cliente:</p>
                <p className="text-sm text-foreground">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="glass-card-solid p-5">
            <OrderDocuments orderId={order.id} />
          </div>

          <div className="glass-card-solid p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Clock size={14} /> Storico Notifiche
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
        <div className="px-4 py-3 border-t border-border space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Prodotti</span>
            <span className="text-sm text-foreground">€{productsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Spedizione</span>
            <span className="text-sm text-foreground">{shippingVal > 0 ? `€${shippingVal.toFixed(2)}` : "Da calcolare"}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-heading font-bold text-foreground">Totale</span>
            <span className="font-heading text-lg font-bold text-foreground">€{(productsTotal + shippingVal).toFixed(2)}</span>
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
    </div>
  );
};

export default AdminOrderDetail;

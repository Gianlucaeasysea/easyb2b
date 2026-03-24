import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, CheckCircle, Truck, Package } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import OrderDocuments from "@/components/OrderDocuments";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-chart-4/20 text-chart-4", icon: CheckCircle },
  shipped: { label: "Shipped", color: "bg-primary/20 text-primary", icon: Truck },
  delivered: { label: "Delivered", color: "bg-success/20 text-success", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: Clock },
};

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
      return data;
    },
    enabled: !!id,
  });

  const [status, setStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Sync state when order loads
  const orderLoaded = order && !status;
  if (orderLoaded) {
    setStatus(order.status || "draft");
    setTrackingNumber(order.tracking_number || "");
    setTrackingUrl(order.tracking_url || "");
    setInternalNotes(order.internal_notes || "");
  }

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("orders").update({
        status,
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null,
        internal_notes: internalNotes || null,
      }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground p-6">Loading...</p>;
  if (!order) return <p className="text-muted-foreground p-6">Order not found.</p>;

  const client = order.clients as any;
  const items = (order.order_items || []) as any[];

  return (
    <div className="max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")} className="mb-4 text-muted-foreground gap-1.5">
        <ArrowLeft size={14} /> Back to Orders
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client?.company_name} · {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <Badge className={`border-0 text-xs ${statusConfig[order.status || "draft"]?.color}`}>
          {statusConfig[order.status || "draft"]?.label}
        </Badge>
      </div>

      {/* Order management */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card-solid p-5 space-y-4">
          <h3 className="font-heading font-bold text-foreground text-sm">Order Management</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-secondary border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <div className="glass-card-solid p-5">
          <h3 className="font-heading font-bold text-foreground text-sm mb-3">Client Info</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Company:</span> {client?.company_name}</p>
            <p><span className="text-muted-foreground">Contact:</span> {client?.contact_name || "—"}</p>
            <p><span className="text-muted-foreground">Email:</span> {client?.email || "—"}</p>
            <p><span className="text-muted-foreground">Country:</span> {client?.country || "—"}</p>
          </div>
          {order.notes && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Customer Notes:</p>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}

          {/* Documents section */}
          <div className="mt-4 pt-3 border-t border-border">
            <OrderDocuments orderId={order.id} />
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
              <TableHead className="text-xs text-right">Discount</TableHead>
              <TableHead className="text-xs text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="text-sm font-heading font-semibold">{item.products?.name || "—"}</p>
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
        <div className="px-4 py-3 border-t border-border flex justify-end">
          <span className="text-xs text-muted-foreground mr-3">Total</span>
          <span className="font-heading text-lg font-bold text-foreground">€{Number(order.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;

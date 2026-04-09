import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import OrderEventsTimeline from "@/components/OrderEventsTimeline";
import {
  getOrderStatusLabel, getOrderStatusColor,
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
    products: { name: string; sku: string | null } | null;
  }>;
}

const CRMOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["crm-order", id],
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

  const notes = internalNotes ?? order?.internal_notes ?? "";

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("orders").update({ internal_notes: notes || null }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["crm-order", id] });
      toast.success("Note salvate");
    } catch (err) {
      showErrorToast(err, "CRMOrderDetail.saveNotes");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground p-6">Caricamento...</p>;
  if (!order) return <p className="text-muted-foreground p-6">Ordine non trovato.</p>;

  const client = order.clients;
  const items = order.order_items || [];
  const productsTotal = Number(order.total_amount || 0);
  const shippingVal = Number(order.shipping_cost_client || 0);

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground gap-1.5">
        <ArrowLeft size={14} /> Indietro
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Ordine {order.order_code || `#${order.id.slice(0, 8).toUpperCase()}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client?.company_name} · {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <Badge className={`border-0 text-xs ${getOrderStatusColor(order.status || "draft")}`}>
          {getOrderStatusLabel(order.status || "draft")}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Client & order info */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-3">Info Cliente</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Azienda:</span> {client?.company_name}</p>
              <p><span className="text-muted-foreground">Contatto:</span> {client?.contact_name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {client?.email || "—"}</p>
              <p><span className="text-muted-foreground">Paese:</span> {client?.country || "—"}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Pagamento:</span>{" "}
                <Badge className={`border-0 text-[10px] ml-1 ${getPaymentStatusColor(order.payment_status || "unpaid")}`}>
                  {getPaymentStatusLabel(order.payment_status || "unpaid")}
                </Badge>
              </p>
              {order.payed_date && <p><span className="text-muted-foreground">Data Pagamento:</span> {order.payed_date}</p>}
              {order.delivery_date && <p><span className="text-muted-foreground">Consegna:</span> {order.delivery_date}</p>}
            </div>
            {order.notes && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Note del Cliente:</p>
                <p className="text-sm text-foreground">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Tracking */}
          {(order.tracking_number || order.tracking_url) && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-heading font-bold text-foreground text-sm mb-3">Spedizione</h3>
              {order.tracking_number && (
                <p className="text-sm"><span className="text-muted-foreground">Tracking:</span> <span className="font-mono">{order.tracking_number}</span></p>
              )}
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                  Traccia spedizione <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Internal notes - editable by sales */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-heading font-bold text-foreground text-sm mb-3">Note Interne</h3>
            <Textarea
              value={notes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="resize-none"
              rows={3}
              placeholder="Aggiungi note interne..."
            />
            <Button
              onClick={handleSaveNotes}
              disabled={saving}
              size="sm"
              className="mt-2"
            >
              {saving ? "Salvataggio..." : "Salva Note"}
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-heading font-bold text-foreground text-sm mb-4 flex items-center gap-2">
            <Clock size={14} /> Storico Notifiche
          </h3>
          <OrderEventsTimeline orderId={order.id} />
        </div>
      </div>

      {/* Order items */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Prodotto</TableHead>
              <TableHead className="text-xs text-right">Qtà</TableHead>
              <TableHead className="text-xs text-right">Prezzo Unit.</TableHead>
              <TableHead className="text-xs text-right">Sconto</TableHead>
              <TableHead className="text-xs text-right">Subtotale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="text-sm font-medium">{item.products?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.products?.sku}</p>
                </TableCell>
                <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                <TableCell className="text-right text-sm">€{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {item.discount_pct ? `${item.discount_pct}%` : "—"}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold">€{Number(item.subtotal).toFixed(2)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nessun articolo</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="px-4 py-3 border-t border-border space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Prodotti</span>
            <span className="text-sm">€{productsTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Spedizione</span>
            <span className="text-sm">{shippingVal > 0 ? `€${shippingVal.toFixed(2)}` : "Da calcolare"}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-heading font-bold">Totale</span>
            <span className="font-heading text-lg font-bold">€{(productsTotal + shippingVal).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMOrderDetail;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackagePlus, Eye, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";

const AdminNewOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-new-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, country, email), order_documents(id, doc_type)")
        .in("status", ["confirmed", "processing"])
        .or('order_type.is.null,order_type.not.in.("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const confirmOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id,
        event_type: "status_change",
        title: "Order confirmed",
        description: "The order has been confirmed and the client has been notified.",
      });
      await supabase.from("order_events").insert({
        order_id: id,
        event_type: "email_sent",
        title: "Confirmation email sent",
        description: "Order confirmation notification sent to the client.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (error) {
        showErrorToast(error, "AdminNewOrders.confirmEmail");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order confirmed and client notified");
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id,
        event_type: "order_rejected",
        title: "Order rejected",
        description: "The order has been rejected by the administrator.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (error) {
        showErrorToast(error, "AdminNewOrders.rejectEmail");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order rejected");
    },
  });

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy HH:mm"); }
    catch { return "—"; }
  };

  const hasInvoiceOrConfirmation = (docs: any[]) =>
    docs?.some(d => d.doc_type === "invoice" || d.doc_type === "order_confirmation");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">New Orders</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Orders just received from dealers — {orders?.length || 0} pending
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <PackagePlus className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No new orders pending.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const docs = (o as any).order_documents || [];
            const hasDocs = hasInvoiceOrConfirmation(docs);
            const phaseLabel = getOrderStatusLabel(o.status || "confirmed");
            const phaseColor = getOrderStatusColor(o.status || "confirmed");

            return (
              <div key={o.id} className="glass-card-solid p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                      </h3>
                      <Badge className={`border-0 text-[10px] ${phaseColor}`}>{phaseLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(o as any).clients?.company_name || "—"}
                      {(o as any).clients?.country && <span className="ml-2 text-xs">({(o as any).clients.country})</span>}
                      <span className="mx-2">·</span>
                      {fmtDate(o.created_at)}
                    </p>
                    {o.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{o.notes}"</p>}
                  </div>
                  <p className="font-heading text-xl font-bold text-foreground">
                    €{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="ml-auto flex items-center gap-2">
                    {o.status === "confirmed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={rejectOrder.isPending}
                        onClick={() => {
                          if (confirm("Are you sure you want to reject this order?"))
                            rejectOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" });
                        }}
                      >
                        <XCircle size={12} /> Reject
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 rounded-lg"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                    >
                      <Eye size={12} /> Detail
                    </Button>

                    {o.status === "confirmed" && (
                      <Button
                        size="sm"
                        disabled={!hasDocs || confirmOrder.isPending}
                        className="text-xs gap-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold"
                        onClick={() => confirmOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" })}
                        title={!hasDocs ? "Upload a document first (Invoice or Order Confirmation)" : ""}
                      >
                        {confirmOrder.isPending ? "..." : "Confirm & Send"}
                      </Button>
                    )}
                  </div>
                </div>

                {o.status === "confirmed" && !hasDocs && (
                  <p className="text-[11px] text-warning mt-2">
                    ⚠ Upload a document (Invoice or Order Confirmation) in the order detail to proceed.
                  </p>
                )}

                {docs.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    📎 {docs.length} document{docs.length > 1 ? "s" : ""} uploaded
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminNewOrders;

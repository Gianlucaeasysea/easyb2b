import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackagePlus, Eye, Truck } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

const phaseConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Nuovo Ordine", color: "bg-warning/20 text-warning" },
  processing: { label: "Confermato", color: "bg-chart-4/20 text-chart-4" },
};

const AdminNewOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shippingEdits, setShippingEdits] = useState<Record<string, string>>({});

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

  const updateShipping = useMutation({
    mutationFn: async ({ id, cost }: { id: string; cost: number }) => {
      const { error } = await supabase.from("orders").update({ shipping_cost_client: cost }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      toast.success("Shipping cost updated");
    },
  });

  const confirmOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", id);
      if (error) throw error;
      // Send confirmation email
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (e) {
        console.error("Email failed:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Ordine confermato e cliente notificato");
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
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Nuovi Ordini</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Ordini appena ricevuti dai dealer — {orders?.length || 0} in attesa
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <PackagePlus className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun nuovo ordine in arrivo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const docs = (o as any).order_documents || [];
            const hasDocs = hasInvoiceOrConfirmation(docs);
            const phase = phaseConfig[o.status || "confirmed"] || phaseConfig.confirmed;
            const shippingVal = shippingEdits[o.id] ?? String(Number((o as any).shipping_cost_client || 0));

            return (
              <div key={o.id} className="glass-card-solid p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                      </h3>
                      <Badge className={`border-0 text-[10px] ${phase.color}`}>{phase.label}</Badge>
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
                    €{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Shipping cost */}
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-muted-foreground" />
                    <label className="text-xs text-muted-foreground">Shipping €</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={shippingVal}
                      onChange={e => setShippingEdits(prev => ({ ...prev, [o.id]: e.target.value }))}
                      className="w-24 h-8 text-sm bg-secondary border-border rounded-lg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 rounded-lg"
                      onClick={() => updateShipping.mutate({ id: o.id, cost: parseFloat(shippingVal) || 0 })}
                    >
                      Save
                    </Button>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 rounded-lg"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                    >
                      <Eye size={12} /> Dettaglio
                    </Button>

                    {o.status === "confirmed" && (
                      <Button
                        size="sm"
                        disabled={!hasDocs || confirmOrder.isPending}
                        className="text-xs gap-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold"
                        onClick={() => confirmOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" })}
                        title={!hasDocs ? "Carica prima un documento (Invoice o Order Confirmation)" : ""}
                      >
                        {confirmOrder.isPending ? "..." : "Conferma & Invia"}
                      </Button>
                    )}
                  </div>
                </div>

                {o.status === "confirmed" && !hasDocs && (
                  <p className="text-[11px] text-warning mt-2">
                    ⚠ Carica un documento (Invoice o Order Confirmation) nel dettaglio ordine per poter confermare.
                  </p>
                )}

                {docs.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    📎 {docs.length} documento{docs.length > 1 ? "i" : ""} caricato{docs.length > 1 ? "i" : ""}
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

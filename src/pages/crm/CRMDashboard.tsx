import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Target, Activity, Calendar, Phone, Mail, MessageCircle, TrendingUp,
  Euro, CreditCard, Truck, ShoppingBag, Eye, XCircle, PackagePlus, Clock
} from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color?: string; sub?: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "gradient-blue"}`}>
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  processing: "bg-primary/20 text-primary",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  Delivered: "bg-success/20 text-success",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  Payed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const phaseConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Nuovo Ordine", color: "bg-warning/20 text-warning" },
  processing: { label: "Confermato", color: "bg-chart-4/20 text-chart-4" },
};

const typeIcons: Record<string, any> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Calendar, note: Activity,
};

const currentYearStart = `${new Date().getFullYear()}-01-01`;

const CRMDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [orderDateFrom, setOrderDateFrom] = useState(currentYearStart);
  const [orderDateTo, setOrderDateTo] = useState("");
  const [payedDateFrom, setPayedDateFrom] = useState(currentYearStart);
  const [payedDateTo, setPayedDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState(currentYearStart);
  const [deliveryDateTo, setDeliveryDateTo] = useState("");

  // Leads
  const { data: leads } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Activities
  const { data: activities } = useQuery({
    queryKey: ["crm-upcoming-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, leads(company_name, contact_name)")
        .is("completed_at", null)
        .order("scheduled_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // All orders (excluding B2C)
  const { data: orders } = useQuery({
    queryKey: ["crm-orders-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, clients(company_name, country, email), order_items(unit_price, quantity, discount_pct), order_documents(id, doc_type)")
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Calculate order product total (sum of line items)
  const getOrderProductTotal = (order: any) => {
    if (!order.order_items?.length) return Number(order.total_amount || 0);
    return order.order_items.reduce((sum: number, item: any) => {
      const price = Number(item.unit_price || 0);
      const qty = Number(item.quantity || 1);
      const discount = Number(item.discount_pct || 0);
      return sum + (price * qty * (1 - discount / 100));
    }, 0);
  };

  // Filtered KPI totals
  const totalOrdered = (orders || [])
    .filter(o => {
      if (!o.created_at) return false;
      const d = o.created_at.slice(0, 10);
      if (orderDateFrom && d < orderDateFrom) return false;
      if (orderDateTo && d > orderDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + getOrderProductTotal(o), 0);

  const totalPayed = (orders || [])
    .filter(o => {
      if (!(o as any).payed_date) return false;
      const d = String((o as any).payed_date).slice(0, 10);
      if (payedDateFrom && d < payedDateFrom) return false;
      if (payedDateTo && d > payedDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + getOrderProductTotal(o), 0);

  const totalDelivered = (orders || [])
    .filter(o => {
      if (!(o as any).delivery_date) return false;
      const d = String((o as any).delivery_date).slice(0, 10);
      if (deliveryDateFrom && d < deliveryDateFrom) return false;
      if (deliveryDateTo && d > deliveryDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + getOrderProductTotal(o), 0);

  // New orders (confirmed / processing)
  const newOrders = (orders || []).filter(o => ["confirmed", "processing"].includes(o.status || ""));

  const leadCount = leads?.length || 0;
  const openLeads = leads?.filter(l => !["won", "lost"].includes(l.status || "")).length || 0;
  const wonLeads = leads?.filter(l => l.status === "won").length || 0;
  const overdueActivities = activities?.filter(a => a.scheduled_at && isPast(new Date(a.scheduled_at))).length || 0;

  const pipelineStages = ["new", "contacted", "qualified", "proposal"];
  const pipelineCounts = pipelineStages.map(s => ({
    stage: s,
    count: leads?.filter(l => l.status === s).length || 0,
  }));

  // Mutations for new orders
  const confirmOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id, event_type: "status_change",
        title: "Ordine confermato", description: "L'ordine è stato confermato e il cliente è stato notificato.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (e) { console.error("Email failed:", e); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-orders-dash"] });
      toast.success("Ordine confermato e cliente notificato");
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id, event_type: "order_rejected",
        title: "Ordine rifiutato", description: "L'ordine è stato rifiutato.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (e) { console.error("Email failed:", e); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-orders-dash"] });
      toast.success("Ordine rifiutato");
    },
  });

  const hasInvoiceOrConfirmation = (docs: any[]) =>
    docs?.some((d: any) => d.doc_type === "invoice" || d.doc_type === "order_confirmation");

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy HH:mm"); } catch { return "—"; }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sales CRM</h1>
        <p className="text-sm text-muted-foreground">Overview pipeline, KPI e nuovi ordini</p>
      </div>

      {/* Pipeline stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Leads" value={String(leadCount)} />
        <StatCard icon={Target} label="Open Pipeline" value={String(openLeads)} color="bg-warning" />
        <StatCard icon={TrendingUp} label="Won" value={String(wonLeads)} color="bg-success" />
        <StatCard icon={Activity} label="Overdue Tasks" value={String(overdueActivities)} color={overdueActivities > 0 ? "bg-destructive" : "gradient-blue"} />
      </div>

      {/* Revenue KPI Cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Euro size={16} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Ordini Raccolti</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground mb-3">
            €{totalOrdered.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filtro per Order Date</p>
        </div>

        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-success" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Ordini Incassati</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-success mb-3">
            €{totalPayed.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={payedDateFrom} onChange={e => setPayedDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={payedDateTo} onChange={e => setPayedDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filtro per Payed Date</p>
        </div>

        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-chart-4" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Ordini Consegnati</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-chart-4 mb-3">
            €{totalDelivered.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={deliveryDateFrom} onChange={e => setDeliveryDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={deliveryDateTo} onChange={e => setDeliveryDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filtro per Delivery Date</p>
        </div>
      </div>

      {/* New Orders Section */}
      <div className="glass-card-solid p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
            <PackagePlus size={16} /> Nuovi Ordini ({newOrders.length})
          </h2>
        </div>
        {!newOrders.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <PackagePlus className="mx-auto mb-3 opacity-30" size={36} />
            <p className="text-sm">Nessun nuovo ordine in attesa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {newOrders.map(o => {
              const docs = (o as any).order_documents || [];
              const hasDocs = hasInvoiceOrConfirmation(docs);
              const phase = phaseConfig[o.status || "confirmed"] || phaseConfig.confirmed;
              return (
                <div key={o.id} className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-foreground">
                          {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                        </span>
                        <Badge className={`border-0 text-[10px] ${phase.color}`}>{phase.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(o as any).clients?.company_name || "—"}
                        {(o as any).clients?.country && <span className="ml-1">({(o as any).clients.country})</span>}
                        <span className="mx-1">·</span>
                        {fmtDate(o.created_at)}
                      </p>
                      {o.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{o.notes}"</p>}
                    </div>
                    <p className="font-heading text-lg font-bold text-foreground">
                      €{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {o.status === "confirmed" && (
                      <Button
                        variant="outline" size="sm"
                        className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={rejectOrder.isPending}
                        onClick={() => {
                          if (confirm("Sei sicuro di voler rifiutare questo ordine?"))
                            rejectOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" });
                        }}
                      >
                        <XCircle size={12} /> Rifiuta
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                      <Eye size={12} /> Dettaglio
                    </Button>
                    {o.status === "confirmed" && (
                      <Button
                        size="sm"
                        disabled={!hasDocs || confirmOrder.isPending}
                        className="text-xs gap-1 bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold"
                        onClick={() => confirmOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" })}
                        title={!hasDocs ? "Carica prima un documento (Invoice o Order Confirmation)" : ""}
                      >
                        {confirmOrder.isPending ? "..." : "Conferma & Invia"}
                      </Button>
                    )}
                  </div>
                  {o.status === "confirmed" && !hasDocs && (
                    <p className="text-[10px] text-warning mt-2">
                      ⚠ Carica un documento nel dettaglio ordine per poter confermare.
                    </p>
                  )}
                  {docs.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      📎 {docs.length} documento{docs.length > 1 ? "i" : ""} caricato{docs.length > 1 ? "i" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pipeline + Activities */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground">Pipeline</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/pipeline")}>View all →</Button>
          </div>
          <div className="space-y-3">
            {pipelineCounts.map(p => (
              <div key={p.stage} className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading w-24">{p.stage}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${leadCount ? (p.count / leadCount) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-mono text-foreground w-8 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground">Upcoming Activities</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/activities")}>View all →</Button>
          </div>
          <div className="space-y-2">
            {!activities?.length ? (
              <p className="text-sm text-muted-foreground">No upcoming activities.</p>
            ) : activities.map(a => {
              const Icon = typeIcons[a.type || "note"] || Activity;
              const isOverdue = a.scheduled_at && isPast(new Date(a.scheduled_at));
              const lead = a.leads as any;
              return (
                <div key={a.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    {lead && <p className="text-xs text-primary">{lead.company_name}</p>}
                  </div>
                  {a.scheduled_at && (
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {isToday(new Date(a.scheduled_at)) ? format(new Date(a.scheduled_at), "HH:mm") : format(new Date(a.scheduled_at), "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;

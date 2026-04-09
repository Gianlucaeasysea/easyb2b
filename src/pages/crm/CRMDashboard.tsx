import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Target, Activity, Calendar, Phone, Mail, MessageCircle, TrendingUp,
  Euro, CreditCard, Truck, ShoppingBag, Eye, XCircle, PackagePlus, Clock,
  AlertTriangle, RefreshCw, UserCheck, Building2, Handshake, CheckSquare, ListTodo, Video, MailOpen
} from "lucide-react";
import OrderDetailsTable from "@/components/crm/OrderDetailsTable";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";
import { format, isToday, isPast, differenceInDays, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const safeFormat = (d: string | null | undefined, fmt: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt) : "—";
};

const StatCard = ({ icon: Icon, label, value, color, sub }: { icon: typeof Users; label: string; value: string; color?: string; sub?: string }) => (
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


const typeIcons: Record<string, any> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Calendar, note: Activity,
};

const currentYearStart = `${new Date().getFullYear()}-01-01`;

const CRMDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [orderDateFrom, setOrderDateFrom] = useState(currentYearStart);
  const [orderDateTo, setOrderDateTo] = useState("");
  const [payedDateFrom, setPayedDateFrom] = useState(currentYearStart);
  const [payedDateTo, setPayedDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState(currentYearStart);
  const [deliveryDateTo, setDeliveryDateTo] = useState("");

  // All clients for lifecycle stats
  const { data: allClients } = useQuery({
    queryKey: ["crm-dashboard-all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, status, status_changed_at, last_order_date, days_since_last_order, next_reorder_expected_date, total_orders_count")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Activities with client/org context
  const { data: activities } = useQuery({
    queryKey: ["crm-upcoming-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, leads(company_name, contact_name), clients:client_id(id, company_name)")
        .is("completed_at", null)
        .order("scheduled_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // My Tasks
  const { data: myTasks } = useQuery({
    queryKey: ["crm-dashboard-my-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, clients:client_id(id, company_name)")
        .not("status", "in", '("completed","cancelled")')
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Deals for KPIs
  const { data: allDeals } = useQuery({
    queryKey: ["crm-dashboard-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id, stage, value, expected_close_date, closed_at, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

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

  const logCall = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from("activities").insert({
        client_id: clientId,
        title: "Follow-up call",
        type: "call",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Call activity logged");
      queryClient.invalidateQueries({ queryKey: ["crm-upcoming-activities"] });
    },
  });

  const getOrderProductTotal = (order: any) => {
    if (!order.order_items?.length) return Number(order.total_amount || 0);
    return order.order_items.reduce((sum: number, item: any) => {
      const price = Number(item.unit_price || 0);
      const qty = Number(item.quantity || 1);
      const discount = Number(item.discount_pct || 0);
      return sum + (price * qty * (1 - discount / 100));
    }, 0);
  };

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

  const newOrders = (orders || []).filter(o => ["confirmed", "processing"].includes(o.status || ""));
  const overdueActivities = activities?.filter(a => a.scheduled_at && isPast(new Date(a.scheduled_at))).length || 0;

  // Pipeline stats
  const activeClients = allClients?.filter(c => c.status === "active").length || 0;
  const atRiskClients = allClients?.filter(c => c.status === "at_risk").length || 0;
  const onboardingClients = allClients?.filter(c => c.status === "onboarding").length || 0;
  const totalOrgs = allClients?.length || 0;

  // TODAY'S ACTIONS / REMINDERS
  const reminders: { type: string; label: string; clientName: string; clientId: string }[] = [];
  
  allClients?.forEach(c => {
    if (c.next_reorder_expected_date) {
      const daysAway = differenceInDays(new Date(c.next_reorder_expected_date), new Date());
      if (daysAway <= 3) {
        reminders.push({
          type: "reorder",
          label: daysAway < 0 ? `Reorder ${Math.abs(daysAway)}d overdue` : `Reorder due in ${daysAway}d`,
          clientName: c.company_name,
          clientId: c.id,
        });
      }
    }
    if (c.status === "active" && c.days_since_last_order && c.days_since_last_order > 75) {
      reminders.push({
        type: "at_risk",
        label: `At risk — ${c.days_since_last_order}d inactive`,
        clientName: c.company_name,
        clientId: c.id,
      });
    }
    if (c.status === "onboarding" && c.status_changed_at) {
      const daysInOnboarding = differenceInDays(new Date(), new Date(c.status_changed_at));
      if (daysInOnboarding > 7 && (!c.total_orders_count || c.total_orders_count === 0)) {
        reminders.push({
          type: "onboarding_stalled",
          label: `Onboarding stalled — ${daysInOnboarding}d, no orders`,
          clientName: c.company_name,
          clientId: c.id,
        });
      }
    }
  });

  const confirmOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "processing" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id, event_type: "status_change",
        title: "Order confirmed", description: "The order has been confirmed and the client has been notified.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (e) { console.error("Email failed:", e); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-orders-dash"] });
      toast.success("Order confirmed and client notified");
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ id, orderCode }: { id: string; orderCode: string }) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_events").insert({
        order_id: id, event_type: "order_rejected",
        title: "Order rejected", description: "The order has been rejected.",
      });
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId: id, orderCode, type: 'status_update' },
        });
      } catch (e) { console.error("Email failed:", e); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-orders-dash"] });
      toast.success("Order rejected");
    },
  });

  const hasInvoiceOrConfirmation = (docs: any[]) =>
    docs?.some((d: any) => d.doc_type === "invoice" || d.doc_type === "order_confirmation");

  const reminderIcons: Record<string, any> = {
    reorder: RefreshCw,
    at_risk: AlertTriangle,
    onboarding_stalled: UserCheck,
  };

  const reminderColors: Record<string, string> = {
    reorder: "border-l-warning",
    at_risk: "border-l-destructive",
    onboarding_stalled: "border-l-chart-4",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sales CRM</h1>
        <p className="text-sm text-muted-foreground">Pipeline overview, KPIs and new orders</p>
      </div>

      {/* TODAY'S ACTIONS */}
      {reminders.length > 0 && (
        <div className="glass-card-solid p-6 mb-8 border-l-4 border-l-warning">
          <h2 className="font-heading font-bold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-warning" /> Today's Actions ({reminders.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminders.slice(0, 9).map((r, i) => {
              const Icon = reminderIcons[r.type] || AlertTriangle;
              return (
                <div key={i} className={`p-3 rounded-lg border border-border bg-secondary/30 border-l-4 ${reminderColors[r.type] || "border-l-primary"}`}>
                  <div className="flex items-start gap-2">
                    <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <button
                        className="text-xs font-heading font-bold text-foreground truncate hover:text-primary transition-colors text-left"
                        onClick={() => navigate(`/crm/organizations/${r.clientId}`)}
                      >
                        {r.clientName}
                      </button>
                      <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    </div>
                    <Button
                      variant="ghost" size="sm" className="h-6 px-2 text-[10px] shrink-0"
                      onClick={() => logCall.mutate(r.clientId)}
                    >
                      <Phone size={10} className="mr-1" /> Log Call
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Organizations" value={String(totalOrgs)} color="gradient-blue" sub={`${activeClients} active`} />
        <StatCard icon={Target} label="Onboarding" value={String(onboardingClients)} color="bg-warning" />
        <StatCard icon={AlertTriangle} label="At Risk" value={String(atRiskClients)} color={atRiskClients > 0 ? "bg-destructive" : "gradient-blue"} />
        <StatCard icon={Activity} label="Overdue Tasks" value={String(overdueActivities)} color={overdueActivities > 0 ? "bg-destructive" : "gradient-blue"} />
      </div>

      {/* Deals KPIs */}
      {(() => {
        const openDeals = allDeals?.filter(d => !["closed_won", "closed_lost"].includes(d.stage)) || [];
        const pipelineValue = openDeals.reduce((s, d) => s + Number(d.value || 0), 0);
        const wonDeals = allDeals?.filter(d => d.stage === "closed_won") || [];
        const lostDeals = allDeals?.filter(d => d.stage === "closed_lost") || [];
        const winRate = (wonDeals.length + lostDeals.length) > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
        const closingSoon = openDeals.filter(d => {
          if (!d.expected_close_date) return false;
          const days = differenceInDays(new Date(d.expected_close_date), new Date());
          return days <= 7;
        });
        return (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Handshake} label="Open Deals" value={String(openDeals.length)} color="gradient-blue" />
            <StatCard icon={Euro} label="Pipeline Value" value={`€${pipelineValue.toLocaleString("it-IT")}`} color="bg-primary" />
            <StatCard icon={TrendingUp} label="Win Rate" value={`${winRate}%`} color={winRate >= 50 ? "bg-success" : "bg-warning"} sub={`${wonDeals.length}W / ${lostDeals.length}L`} />
            <StatCard icon={Calendar} label="Closing This Week" value={String(closingSoon.length)} color={closingSoon.length > 0 ? "bg-warning" : "gradient-blue"} />
          </div>
        );
      })()}

      {/* Revenue KPI Cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Euro size={16} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground text-sm">Total Orders Collected</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground mb-3">
            €{totalOrdered.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filter by Order Date</p>
        </div>

        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-success" />
            <h3 className="font-heading font-bold text-foreground text-sm">Total Orders Collected (Paid)</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-success mb-3">
            €{totalPayed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={payedDateFrom} onChange={e => setPayedDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={payedDateTo} onChange={e => setPayedDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filter by Paid Date</p>
        </div>

        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-chart-4" />
            <h3 className="font-heading font-bold text-foreground text-sm">Total Orders Delivered</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-chart-4 mb-3">
            €{totalDelivered.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-2">
            <Input type="date" value={deliveryDateFrom} onChange={e => setDeliveryDateFrom(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
            <Input type="date" value={deliveryDateTo} onChange={e => setDeliveryDateTo(e.target.value)} className="text-xs bg-secondary border-border rounded-lg h-8" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Filter by Delivery Date</p>
        </div>
      </div>

      {/* New Orders Section */}
      <div className="glass-card-solid p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
            <PackagePlus size={16} /> New Orders ({newOrders.length})
          </h2>
        </div>
        {!newOrders.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <PackagePlus className="mx-auto mb-3 opacity-30" size={36} />
            <p className="text-sm">No new orders pending</p>
          </div>
        ) : (
          <div className="space-y-3">
            {newOrders.map(o => {
              const docs = (o as any).order_documents || [];
              const hasDocs = hasInvoiceOrConfirmation(docs);
              const phaseLabel = getOrderStatusLabel(o.status || "confirmed");
              const phaseColor = getOrderStatusColor(o.status || "confirmed");
              return (
                <div key={o.id} className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-foreground">
                          {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                        </span>
                        <Badge className={`border-0 text-[10px] ${phaseColor}`}>{phaseLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(o as any).clients?.company_name || "—"}
                        {(o as any).clients?.country && <span className="ml-1">({(o as any).clients.country})</span>}
                        <span className="mx-1">·</span>
                        {safeFormat(o.created_at, "dd/MM/yyyy HH:mm")}
                      </p>
                      {o.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{o.notes}"</p>}
                    </div>
                    <p className="font-heading text-lg font-bold text-foreground">
                      €{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {o.status === "confirmed" && (
                      <Button
                        variant="outline" size="sm"
                        className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={rejectOrder.isPending}
                        onClick={() => {
                        if (confirm("Are you sure you want to reject this order?"))
                            rejectOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" });
                        }}
                      >
                        <XCircle size={12} /> Reject
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                      <Eye size={12} /> Detail
                    </Button>
                    {o.status === "confirmed" && (
                      <Button
                        size="sm"
                        disabled={!hasDocs || confirmOrder.isPending}
                        className="text-xs gap-1 bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold"
                        onClick={() => confirmOrder.mutate({ id: o.id, orderCode: (o as any).order_code || "" })}
                        title={!hasDocs ? "Upload a document (Invoice or Order Confirmation) first" : ""}
                      >
                        {confirmOrder.isPending ? "..." : "Confirm & Send"}
                      </Button>
                    )}
                  </div>
                  {o.status === "confirmed" && !hasDocs && (
                    <p className="text-[10px] text-warning mt-2">
                      ⚠ Upload a document in order detail to confirm.
                    </p>
                  )}
                  {docs.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      📎 {docs.length} document{docs.length > 1 ? "s" : ""} uploaded
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lifecycle + Activities + Tasks */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground">Organization Lifecycle</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/pipeline")}>View all →</Button>
          </div>
          <div className="space-y-3">
            {["lead", "qualifying", "onboarding", "active", "at_risk", "churned"].map(s => {
              const count = allClients?.filter(c => c.status === s).length || 0;
              const total = totalOrgs || 1;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading w-24">{s.replace("_", " ")}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <span className="text-sm font-mono text-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
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
              const org = (a as any).clients;
              const lead = (a as any).leads;
              const orgName = org?.company_name || lead?.company_name;
              return (
                <div key={a.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    {orgName && (
                      <button
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        onClick={() => org?.id && navigate(`/crm/organizations/${org.id}`)}
                      >
                        <Building2 size={10} /> {orgName}
                      </button>
                    )}
                  </div>
                  {a.scheduled_at && (
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {isToday(new Date(a.scheduled_at)) ? safeFormat(a.scheduled_at, "HH:mm") : safeFormat(a.scheduled_at, "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
              <CheckSquare size={16} /> My Tasks
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/tasks")}>View all →</Button>
          </div>
          <div className="space-y-2">
            {!myTasks?.length ? (
              <p className="text-sm text-muted-foreground">No tasks due.</p>
            ) : myTasks.map(t => {
              const taskTypeIcons: Record<string, any> = { task: ListTodo, call: Phone, meeting: Video, follow_up: MailOpen, deadline: AlertTriangle };
              const Icon = taskTypeIcons[t.type || "task"] || ListTodo;
              const isOverdue = t.due_date && isPast(new Date(t.due_date));
              const org = (t as any).clients;
              return (
                <div key={t.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isOverdue ? "text-destructive" : "text-foreground"}`}>{t.title}</p>
                    {org && (
                      <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => navigate(`/crm/organizations/${org.id}`)}>
                        <Building2 size={10} /> {org.company_name}
                      </button>
                    )}
                  </div>
                  {t.due_date && (
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {isToday(new Date(t.due_date)) ? safeFormat(t.due_date, "HH:mm") : safeFormat(t.due_date, "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Order Details */}
      <div className="mt-8">
        <OrderDetailsTable title="Order Details (Live Sync)" />
      </div>
    </div>
  );
};

export default CRMDashboard;

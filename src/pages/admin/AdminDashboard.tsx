import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Package, FileText, TrendingUp, Globe, Euro, CreditCard, Truck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
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
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  Delivered: "bg-success/20 text-success",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  Payed: "bg-success/20 text-success",
  lost: "bg-destructive/20 text-destructive",
  Returned: "bg-destructive/20 text-destructive",
};

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [payedDateFrom, setPayedDateFrom] = useState("");
  const [payedDateTo, setPayedDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState("");
  const [deliveryDateTo, setDeliveryDateTo] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("gsheet-sync");
      if (error) throw error;
      toast.success(`Sync completata: ${data.newOrders} nuovi ordini, ${data.updatedOrders} aggiornati`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders-dash"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: any) {
      toast.error("Sync fallita: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const { data: clients } = useQuery({
    queryKey: ["admin-clients-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*");
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, clients(company_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: requestCount } = useQuery({
    queryKey: ["admin-request-count"],
    queryFn: async () => {
      const { count } = await supabase.from("distributor_requests").select("*", { count: "exact", head: true }).eq("status", "new");
      return count || 0;
    },
  });

  const { data: productCount } = useQuery({
    queryKey: ["admin-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Filtered totals
  const totalOrdered = (orders || [])
    .filter(o => {
      if (!o.created_at) return false;
      const d = o.created_at.slice(0, 10);
      if (orderDateFrom && d < orderDateFrom) return false;
      if (orderDateTo && d > orderDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalPayed = (orders || [])
    .filter(o => {
      if (!(o as any).payed_date) return false;
      const d = String((o as any).payed_date).slice(0, 10);
      if (payedDateFrom && d < payedDateFrom) return false;
      if (payedDateTo && d > payedDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalDelivered = (orders || [])
    .filter(o => {
      if (!(o as any).delivery_date) return false;
      const d = String((o as any).delivery_date).slice(0, 10);
      if (deliveryDateFrom && d < deliveryDateFrom) return false;
      if (deliveryDateTo && d > deliveryDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const activeClients = clients?.filter(c => c.status === "active").length || 0;
  const countries = [...new Set(clients?.map(c => c.country).filter(Boolean))].length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Easysea B2B Platform Overview</p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync Google Sheet"}
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Clients" value={String(activeClients)} sub={`${clients?.length || 0} total · ${countries} countries`} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={String(orders?.length || 0)} />
        <StatCard icon={FileText} label="New Requests" value={String(requestCount ?? 0)} sub="Awaiting review" />
        <StatCard icon={Package} label="Products" value={String(productCount ?? 0)} sub="Active in B2B catalog" />
      </div>

      {/* Filtered Revenue Cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        {/* Total Ordered */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Euro size={16} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Ordinato</h3>
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

        {/* Total Payed */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-success" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Pagato</h3>
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

        {/* Total Delivered */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-chart-4" />
            <h3 className="font-heading font-bold text-foreground text-sm">Totale Consegnato</h3>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><ShoppingBag size={16} /> Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {orders?.slice(0, 8).map(o => (
              <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 px-2 -mx-2 rounded">
                <div>
                  <p className="text-sm font-heading font-semibold text-foreground">{(o as any).clients?.company_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{(o as any).order_code || o.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"] || "bg-muted text-muted-foreground"}`}>{o.status}</Badge>
                  <span className="font-mono text-sm font-semibold text-foreground">€{Number(o.total_amount || 0).toFixed(0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Client Distribution */}
        <div className="glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Globe size={16} /> Clients by Region</h2>
            <Link to="/admin/clients" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {Object.entries(
              (clients || []).reduce<Record<string, { count: number; active: number }>>((acc, c) => {
                const zone = c.zone || "Other";
                if (!acc[zone]) acc[zone] = { count: 0, active: 0 };
                acc[zone].count++;
                if (c.status === "active") acc[zone].active++;
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([zone, stats]) => (
                <div key={zone} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{zone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{stats.active} active</span>
                    <Badge variant="outline" className="text-[10px]">{stats.count}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

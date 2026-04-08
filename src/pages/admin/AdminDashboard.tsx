import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Package, FileText, Euro, CreditCard, Truck, RefreshCw, Globe, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getOrderStatusLabel, getOrderStatusColor, ORDER_STATUS_CHART_COLORS } from "@/lib/constants";

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

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1"];

const currentYearStart = `${new Date().getFullYear()}-01-01`;

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [orderDateFrom, setOrderDateFrom] = useState(currentYearStart);
  const [orderDateTo, setOrderDateTo] = useState("");
  const [payedDateFrom, setPayedDateFrom] = useState(currentYearStart);
  const [payedDateTo, setPayedDateTo] = useState("");
  const [deliveryDateFrom, setDeliveryDateFrom] = useState(currentYearStart);
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
    } catch (error) {
      showErrorToast(error, "AdminDashboard.sync");
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
      const { data } = await supabase
        .from("orders")
        .select("*, clients(company_name)")
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
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

  // Top 10 products
  const { data: topProducts } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("product_id, quantity, products(name)");
      if (!data) return [];
      const map: Record<string, { name: string; qty: number }> = {};
      data.forEach((item: any) => {
        const name = item.products?.name || "Unknown";
        if (!map[item.product_id]) map[item.product_id] = { name, qty: 0 };
        map[item.product_id].qty += item.quantity;
      });
      return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
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
      if (!o.payed_date) return false;
      const d = String(o.payed_date).slice(0, 10);
      if (payedDateFrom && d < payedDateFrom) return false;
      if (payedDateTo && d > payedDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const totalDelivered = (orders || [])
    .filter(o => {
      if (!o.delivery_date) return false;
      const d = String(o.delivery_date).slice(0, 10);
      if (deliveryDateFrom && d < deliveryDateFrom) return false;
      if (deliveryDateTo && d > deliveryDateTo) return false;
      return true;
    })
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const activeClients = clients?.filter(c => c.status === "active").length || 0;
  const countries = [...new Set(clients?.map(c => c.country).filter(Boolean))].length;

  const recentOrders = (orders || []).filter(o => {
    const d = o.created_at?.slice(0, 10) || "";
    return d >= currentYearStart;
  });

  // Monthly revenue chart (last 12 months)
  const monthlyRevenue = (() => {
    const now = new Date();
    const months: { month: string; current: number; previous: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      const prevKey = format(new Date(d.getFullYear() - 1, d.getMonth(), 1), "yyyy-MM");
      const label = format(d, "MMM yy");
      const current = (orders || [])
        .filter(o => o.created_at?.slice(0, 7) === key)
        .reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const previous = (orders || [])
        .filter(o => o.created_at?.slice(0, 7) === prevKey)
        .reduce((s, o) => s + Number(o.total_amount || 0), 0);
      months.push({ month: label, current, previous });
    }
    return months;
  })();

  // Client distribution by discount class
  const discountDistribution = (() => {
    const map: Record<string, number> = {};
    (clients || []).forEach(c => {
      const cls = c.discount_class || "Standard";
      map[cls] = (map[cls] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Orders by status
  const ordersByStatus = (() => {
    const map: Record<string, number> = {};
    (orders || []).forEach(o => {
      const st = o.status || "draft";
      const label = getOrderStatusLabel(st);
      map[label] = (map[label] || 0) + 1;
    });
    // For fill colors, we need to reverse-lookup or use the original status key
    const colorByLabel: Record<string, string> = {};
    Object.entries(ORDER_STATUS_CHART_COLORS).forEach(([key, color]) => {
      colorByLabel[getOrderStatusLabel(key)] = color;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value, fill: colorByLabel[name] || "#9ca3af" }));
  })();

  // Late payments (payment_status not paid, created > 30 days ago)
  const latePayments = (orders || []).filter(o => {
    const isPending = !o.payed_date && o.payment_status !== "paid";
    const daysOld = differenceInDays(new Date(), new Date(o.created_at));
    return isPending && daysOld > 30 && Number(o.total_amount || 0) > 0;
  }).map(o => ({
    ...o,
    daysLate: differenceInDays(new Date(), new Date(o.created_at)),
  })).sort((a, b) => b.daysLate - a.daysLate).slice(0, 10);

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
        <StatCard icon={ShoppingBag} label="Orders (YTD)" value={String(recentOrders.length)} sub={`${orders?.length || 0} total`} />
        <StatCard icon={FileText} label="New Requests" value={String(requestCount ?? 0)} sub="Awaiting review" />
        <StatCard icon={Package} label="Products" value={String(productCount ?? 0)} sub="Active in B2B catalog" />
      </div>

      {/* Filtered Revenue Cards */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
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

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* 1. Monthly Revenue (full width) */}
        <div className="glass-card-solid p-5 lg:col-span-2">
          <h2 className="font-heading font-bold text-foreground mb-4">📈 Revenue Mensile (ultimi 12 mesi)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`€${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`, ""]} />
              <Legend />
              <Line type="monotone" dataKey="current" name="Anno corrente" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="previous" name="Anno precedente" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Top 10 Products */}
        <div className="glass-card-solid p-5">
          <h2 className="font-heading font-bold text-foreground mb-4">🏆 Top 10 Prodotti Venduti</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts || []} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => [v, "Quantità"]} />
              <Bar dataKey="qty" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3. Client Distribution by Discount Class */}
        <div className="glass-card-solid p-5">
          <h2 className="font-heading font-bold text-foreground mb-4">👥 Distribuzione Clienti per Classe Sconto</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={discountDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {discountDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v, "Clienti"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Orders by Status */}
        <div className="glass-card-solid p-5">
          <h2 className="font-heading font-bold text-foreground mb-4">📦 Ordini per Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                {ordersByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v, "Ordini"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 5. Late Payments Alert */}
        <div className={`glass-card-solid p-5 ${latePayments.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className={latePayments.length > 0 ? "text-destructive" : "text-success"} />
            Pagamenti in Ritardo ({">"}30gg)
          </h2>
          {latePayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-success font-medium">✓ Nessun pagamento in ritardo</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {latePayments.map(o => (
                <Link
                  key={o.id}
                  to={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-destructive/10 border border-destructive/20"
                >
                  <div>
                    <p className="text-sm font-heading font-semibold text-foreground">{(o as any).clients?.company_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{o.order_code || o.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-destructive">€{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-destructive/70">{o.daysLate} giorni</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card-solid p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><ShoppingBag size={16} /> Recent Orders ({new Date().getFullYear()})</h2>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentOrders.slice(0, 8).map(o => (
              <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 px-2 -mx-2 rounded">
                <div>
                  <p className="text-sm font-heading font-semibold text-foreground">{(o as any).clients?.company_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{o.order_code || o.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>{getOrderStatusLabel(o.status || "draft")}</Badge>
                  <span className="font-mono text-sm font-semibold text-foreground">€{Number(o.total_amount || 0).toFixed(0)}</span>
                </div>
              </Link>
            ))}
            {!recentOrders.length && <p className="text-sm text-muted-foreground py-4">No orders this year.</p>}
          </div>
        </div>

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

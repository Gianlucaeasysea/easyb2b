import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, TrendingUp, ArrowUpRight, Clock, CheckCircle, Truck, CreditCard, FileText, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { getOrderStatusLabel, getOrderStatusColor } from "@/lib/constants";

const DealerDashboard = () => {
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("client_id", client.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client,
  });

  const { data: productCount } = useQuery({
    queryKey: ["product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("active_b2b", true);
      return count || 0;
    },
  });

  const { data: priceList } = useQuery({
    queryKey: ["my-price-list", client?.id],
    queryFn: async () => {
      const { data: plcData } = await supabase
        .from("price_list_clients")
        .select("price_list_id, price_lists(*, discount_tiers(label, discount_pct))")
        .eq("client_id", client!.id)
        .limit(1)
        .maybeSingle();
      if (plcData?.price_lists) return plcData.price_lists as any;
      return null;
    },
    enabled: !!client,
  });

  const { data: discountTiers } = useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("discount_tiers").select("name, discount_pct, label").order("sort_order");
      return data || [];
    },
  });

  const activeOrders = orders?.filter(o => o.status !== "delivered" && o.status !== "draft") || [];
  const totalSpent = orders?.filter(o => o.status !== "draft").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const openInvoices = orders?.filter(o => o.status !== "draft" && o.payment_status !== "paid") || [];
  const openInvoiceTotal = openInvoices.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const monthlyTarget = 5000;
  const monthlyProgress = Math.min((totalSpent / monthlyTarget) * 100, 100);
  const discountClass = client?.discount_class || "D";
  const discountTier = discountTiers?.find(t => t.name === discountClass);
  const discountPct = discountTier?.discount_pct ?? 10;

  const statCards = [
    { icon: TrendingUp, label: "Discount Class", value: `Class ${discountClass}`, sub: `-${discountPct}% on all products` },
    { icon: ShoppingBag, label: "Active Orders", value: String(activeOrders.length), sub: `${orders?.length || 0} total orders` },
    { icon: FileText, label: "Open Invoices", value: String(openInvoices.length), sub: `€${openInvoiceTotal.toLocaleString()} outstanding` },
    { icon: Package, label: "Catalog", value: String(productCount), sub: "Available products" },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-heading font-bold mb-1">Dashboard</p>
        <h1 className="font-heading text-2xl font-black text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{client?.company_name || user?.email}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card-solid p-6 hover:border-primary/15 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center">
                <s.icon className="text-primary-foreground" size={16} />
              </div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-heading font-semibold">{s.label}</span>
            </div>
            <p className="font-heading text-2xl font-black text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-card-solid p-6 hover:border-primary/15 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={15} className="text-primary" />
            <h2 className="font-heading font-bold text-foreground text-sm">Assigned Price List</h2>
          </div>
          {priceList ? (
            <div>
              <p className="text-foreground font-heading font-bold">{priceList.name}</p>
              {priceList.description && <p className="text-[11px] text-muted-foreground mt-1">{priceList.description}</p>}
              {(priceList as any).discount_tiers?.[0] && (
                <Badge variant="outline" className="mt-2 text-[10px] font-heading rounded-full">
                  {(priceList as any).discount_tiers[0].label} — {(priceList as any).discount_tiers[0].discount_pct}% discount
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No price list assigned</p>
          )}
        </div>

        <div className="glass-card-solid p-6 hover:border-primary/15 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={15} className="text-primary" />
            <h2 className="font-heading font-bold text-foreground text-sm">Financial Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading">Total Ordered</p>
              <p className="font-heading font-black text-foreground text-lg">€{totalSpent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading">Outstanding</p>
              <p className="font-heading font-black text-warning text-lg">€{openInvoiceTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-solid p-6 mb-8 hover:border-primary/15 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <span className="text-lg">🏆</span> Monthly Goal
          </h2>
          <Link to="/portal/goals" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-heading font-semibold">
            View all <ArrowUpRight size={11} />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {totalSpent >= monthlyTarget
            ? "Congratulations! You've reached your monthly goal! 🎉"
            : `You need €${(monthlyTarget - totalSpent).toLocaleString()} more to unlock an additional 5% discount.`}
        </p>
        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <div className="gradient-blue h-full rounded-full transition-all duration-700" style={{ width: `${monthlyProgress}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 font-heading">€{totalSpent.toLocaleString()} / €{monthlyTarget.toLocaleString()}</p>
      </div>

      <div className="glass-card-solid p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-sm font-bold text-foreground">Recent Orders</h2>
          <Link to="/portal/orders" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-heading font-semibold">
            View all <ArrowUpRight size={11} />
          </Link>
        </div>
        {!orders?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No orders yet.</p>
        ) : (
          <div className="space-y-0">
            {orders.slice(0, 5).map(order => {
              const statusLabel = getOrderStatusLabel(order.status || "draft");
              const statusColor = getOrderStatusColor(order.status || "draft");
              return (
                <div key={order.id} className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Package size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-heading font-bold text-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`border-0 text-[10px] rounded-full font-heading ${statusColor}`}>{statusLabel}</Badge>
                    <span className="font-heading font-black text-foreground text-sm">€{Number(order.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerDashboard;

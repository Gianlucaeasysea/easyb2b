import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, Filter, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  Delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  Returned: "bg-destructive/20 text-destructive",
  lost: "bg-destructive/20 text-destructive",
  Payed: "bg-success/20 text-success",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
};

const paymentColors: Record<string, string> = {
  Payed: "bg-success/20 text-success",
  "To be paid": "bg-warning/20 text-warning",
  lost: "bg-destructive/20 text-destructive",
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, country)")
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const allStatuses = [...new Set(orders?.map(o => o.status).filter(Boolean) || [])];

  const filtered = orders?.filter(o => {
    const matchSearch =
      (o as any).clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      (o as any).order_code?.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const orderDate = o.created_at?.slice(0, 10) || "";
    const matchDateFrom = !dateFrom || orderDate >= dateFrom;
    const matchDateTo = !dateTo || orderDate <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  }) || [];

  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy"); }
    catch { return "—"; }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ordini · Fatturato: €{totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Cerca per cliente o codice ordine..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border rounded-lg">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {allStatuses.map(s => (
              <SelectItem key={s} value={s!}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] text-xs bg-secondary border-border rounded-lg h-9" placeholder="Da" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] text-xs bg-secondary border-border rounded-lg h-9" placeholder="A" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Business</TableHead>
                <TableHead className="text-xs">Order Code</TableHead>
                <TableHead className="text-xs">Order Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Shipping</TableHead>
                <TableHead className="text-xs">Payed Date</TableHead>
                <TableHead className="text-xs">Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <TableCell>
                    <span className="font-heading font-semibold text-sm">{(o as any).clients?.company_name || "—"}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"] || "bg-muted text-muted-foreground"}`}>
                      {o.status || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(o as any).payment_status ? (
                      <Badge className={`border-0 text-[10px] ${paymentColors[(o as any).payment_status] || "bg-muted text-muted-foreground"}`}>
                        {(o as any).payment_status}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    €{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {Number((o as any).shipping_cost_client || 0) > 0
                      ? `€${Number((o as any).shipping_cost_client).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate((o as any).payed_date)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate((o as any).delivery_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

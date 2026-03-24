import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-chart-4/20 text-chart-4",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, clients(company_name, country)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = orders?.filter(o => {
    const matchSearch = (o as any).clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.includes(search.toLowerCase()) ||
      o.tracking_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const totalRevenue = filtered.filter(o => o.status !== "draft").reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage and track all B2B orders</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Filtered Revenue</p>
          <p className="font-heading font-bold text-foreground">€{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search by client or order ID..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-secondary border-border rounded-lg">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Order ID</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Tracking</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <TableCell className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>
                    <span className="font-heading font-semibold text-sm">{(o as any).clients?.company_name}</span>
                    {(o as any).clients?.country && (
                      <p className="text-xs text-muted-foreground">{(o as any).clients?.country}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"]}`}>{o.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {o.tracking_number ? (
                      <span className="text-xs font-mono text-muted-foreground">{o.tracking_number}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">€{Number(o.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Search, Filter, CalendarIcon, Download, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");

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
      o.order_code?.toLowerCase().includes(search.toLowerCase()) ||
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

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  const bulkUpdate = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const { error } = await supabase.from("orders").update({ status: bulkStatus }).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`Status aggiornato per ${count} ordini`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCSV = () => {
    const rows = filtered.map(o => ({
      "Codice Ordine": o.order_code || o.id.slice(0, 8),
      "Organizzazione": (o as any).clients?.company_name || "",
      "Status": o.status || "",
      "Totale (€)": Number(o.total_amount || 0).toFixed(2),
      "Status Pagamento": o.payment_status || "",
      "Data Creazione": fmtDate(o.created_at),
      "Data Consegna": fmtDate(o.delivery_date),
      "Tracking Number": o.tracking_number || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordini");
    XLSX.writeFile(wb, `ordini_export_${format(new Date(), "yyyy-MM-dd")}.csv`, { bookType: "csv" });
    toast.success(`${rows.length} ordini esportati`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ordini · Fatturato: €{totalRevenue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download size={14} /> Esporta CSV
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium">{selected.size} ordini selezionati</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Cambia status a..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => bulkUpdate.mutate()} disabled={bulkUpdate.isPending}>
            Applica
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="gap-1">
            <X size={14} /> Deseleziona
          </Button>
        </div>
      )}

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
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] text-xs bg-secondary border-border rounded-lg h-9" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] text-xs bg-secondary border-border rounded-lg h-9" />
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
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
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
                <TableRow key={o.id} className="cursor-pointer hover:bg-secondary/50">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <span className="font-heading font-semibold text-sm">{(o as any).clients?.company_name || "—"}</span>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="font-mono text-xs text-muted-foreground">
                    {o.order_code || `#${o.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <Badge className={`border-0 text-[10px] ${statusColors[o.status || "draft"] || "bg-muted text-muted-foreground"}`}>
                      {o.status || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    {o.payment_status ? (
                      <Badge className={`border-0 text-[10px] ${paymentColors[o.payment_status] || "bg-muted text-muted-foreground"}`}>
                        {o.payment_status}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-right font-mono text-sm font-semibold">
                    €{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-right font-mono text-xs text-muted-foreground">
                    {Number(o.shipping_cost_client || 0) > 0
                      ? `€${Number(o.shipping_cost_client).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-muted-foreground">{fmtDate(o.payed_date)}</TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-muted-foreground">{fmtDate(o.delivery_date)}</TableCell>
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

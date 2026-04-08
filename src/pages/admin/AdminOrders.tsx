import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Search, Filter, CalendarIcon, Download, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ORDER_STATUS_MAP, getOrderStatusLabel, getOrderStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor,
} from "@/lib/constants";
import { TablePagination } from "@/components/ui/TablePagination";

const AdminOrders = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, dateFrom, dateTo]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", page, pageSize, statusFilter, dateFrom, dateTo, search],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, clients(company_name, country)", { count: "exact" })
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }
      // Text search via ilike on order_code or tracking_number
      if (search) {
        query = query.or(`order_code.ilike.%${search}%,tracking_number.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: data || [], totalCount: count || 0 };
    },
    placeholderData: (prev) => prev,
  });

  const orders = data?.orders || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Fetch all statuses for filter dropdown
  const { data: allStatuses } = useQuery({
    queryKey: ["admin-order-statuses"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status").not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")');
      return [...new Set(data?.map(o => o.status).filter(Boolean) || [])];
    },
  });

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
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map(o => o.id)));
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

  const exportCSV = async () => {
    // Fetch all for export (no pagination)
    let query = supabase.from("orders").select("*, clients(company_name)").not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")').order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (search) query = query.or(`order_code.ilike.%${search}%,tracking_number.ilike.%${search}%`);
    const { data: allOrders } = await query;

    const rows = (allOrders || []).map(o => ({
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

  const SkeletonRows = () => (
    <>
      {Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 10 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{totalCount} ordini</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
          <Download size={14} /> Esporta CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium">{selected.size} ordini selezionati</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Cambia status a..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => bulkUpdate.mutate()} disabled={bulkUpdate.isPending}>Applica</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="gap-1"><X size={14} /> Deseleziona</Button>
        </div>
      )}

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Cerca per codice ordine o tracking..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border rounded-lg">
            <Filter size={14} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(allStatuses || []).map(s => (
              <SelectItem key={s} value={s!}>{getOrderStatusLabel(s!)}</SelectItem>
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
        <div className="glass-card-solid overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox disabled /></TableHead>
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
            <TableBody><SkeletonRows /></TableBody>
          </Table>
        </div>
      ) : !orders.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div className={`glass-card-solid overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === orders.length && orders.length > 0} onCheckedChange={toggleAll} />
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
              {orders.map(o => (
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
                    <Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>
                      {getOrderStatusLabel(o.status || "draft")}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    {o.payment_status ? (
                      <Badge className={`border-0 text-[10px] ${getPaymentStatusColor(o.payment_status)}`}>
                        {getPaymentStatusLabel(o.payment_status)}
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
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

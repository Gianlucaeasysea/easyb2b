import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, lastDayOfMonth, addMonths } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Search, Filter, CalendarIcon, Download, CreditCard, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import * as XLSX from "xlsx";
import {
  ORDER_STATUSES, getOrderStatusLabel, getOrderStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor, canTransitionTo,
} from "@/lib/constants";
import { TablePagination } from "@/components/ui/TablePagination";
import BulkActionBar, { runBulkOperation, bulkResultToast } from "@/components/admin/BulkActionBar";

const AdminOrders = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk dialogs
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("confirmed");
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showTransitionWarning, setShowTransitionWarning] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState<{ valid: string[]; invalid: string[]; target: string }>({ valid: [], invalid: [], target: "" });

  useEffect(() => { setPage(1); }, [search, statusFilter, dateFrom, dateTo]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", page, pageSize, statusFilter, dateFrom, dateTo, search],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, clients(company_name, country)", { count: "exact" })
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });

      if (statusFilter === "overdue") {
        const today = new Date().toISOString().split("T")[0];
        query = query.lt("payment_due_date", today).neq("payment_status", "paid");
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
      if (search) query = query.or(`order_code.ilike.%${search}%,tracking_number.ilike.%${search}%`);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: data || [], totalCount: count || 0 };
    },
    placeholderData: (prev) => prev,
  });

  const orders = data?.orders || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  // Bulk: update status — with transition validation
  const handleBulkStatusCheck = () => {
    const ids = Array.from(selected);
    const selectedOrders = orders.filter(o => ids.includes(o.id));
    const valid: string[] = [];
    const invalid: string[] = [];
    selectedOrders.forEach(o => {
      if (canTransitionTo(o.status || "draft", bulkStatus)) valid.push(o.id);
      else invalid.push(o.id);
    });
    if (invalid.length > 0 && valid.length > 0) {
      setTransitionInfo({ valid, invalid, target: bulkStatus });
      setShowStatusDialog(false);
      setShowTransitionWarning(true);
    } else if (invalid.length > 0 && valid.length === 0) {
      toast.error(`None of the ${invalid.length} selected orders can transition to "${getOrderStatusLabel(bulkStatus)}".`);
    } else {
      executeBulkStatus(valid);
    }
  };

  const executeBulkStatus = async (ids: string[]) => {
    setBulkLoading(true);
    try {
      const result = await runBulkOperation(ids, async (id) => {
        const { error } = await supabase.from("orders").update({ status: bulkStatus }).eq("id", id);
        if (error) throw error;
      });
      const skipped = transitionInfo.invalid.length;
      if (skipped > 0) {
        toast.success(`Updated: ${result.ok} orders. Skipped: ${skipped} (incompatible status).`);
      } else {
        bulkResultToast(toast.success, toast.error, result, "ordini");
      }
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });

      // Send notifications to dealers for each updated order (fire-and-forget)
      supabase
        .from("orders")
        .select("id, order_code, client_id")
        .in("id", ids)
        .then(({ data: updatedOrders }) => {
          (updatedOrders ?? []).forEach(order => {
            supabase.functions.invoke("send-order-notification", {
              body: { orderId: order.id, type: "order_status_update", newStatus: bulkStatus },
            }).catch(err => console.error(`Notification failed for ${order.order_code}`, err));
          });
        });
    } catch (error) {
      showErrorToast(error, "AdminOrders.bulkStatus");
    } finally {
      setBulkLoading(false);
      setShowStatusDialog(false);
      setShowTransitionWarning(false);
      setTransitionInfo({ valid: [], invalid: [], target: "" });
    }
  };

  // Bulk: mark as paid
  const handleBulkPaid = async () => {
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      const today = format(new Date(), "yyyy-MM-dd");
      const result = await runBulkOperation(ids, async (id) => {
        const { error } = await supabase.from("orders").update({ payment_status: "paid", payed_date: today }).eq("id", id);
        if (error) throw error;
      });
      bulkResultToast(toast.success, toast.error, result, "ordini");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (error) {
      showErrorToast(error, "AdminOrders.bulkPaid");
    } finally {
      setBulkLoading(false);
      setShowPaidConfirm(false);
    }
  };

  // Export CSV — selected or all filtered
  const exportCSV = async (onlySelected = false) => {
    let exportOrders: any[] = [];

    if (onlySelected) {
      exportOrders = orders.filter(o => selected.has(o.id));
    } else {
      let query = supabase.from("orders").select("*, clients(company_name)").not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")').order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
      if (search) query = query.or(`order_code.ilike.%${search}%,tracking_number.ilike.%${search}%`);
      const { data: allOrders } = await query;
      exportOrders = allOrders || [];
    }

    const rows = exportOrders.map(o => ({
      "Order Code": o.order_code || o.id.slice(0, 8),
      "Organization": (o as any).clients?.company_name || "",
      "Status": o.status || "",
      "Total (€)": Number(o.total_amount || 0).toFixed(2),
      "Payment Status": o.payment_status || "",
      "Created Date": fmtDate(o.created_at),
      "Delivery Date": fmtDate(o.delivery_date),
      "Tracking Number": o.tracking_number || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_export_${format(new Date(), "yyyy-MM-dd")}.csv`, { bookType: "csv" });
    toast.success(`${rows.length} orders exported`);
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

  const tableHeaders = (
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
      <TableHead className="text-xs">Paid Date</TableHead>
      <TableHead className="text-xs">Due Date</TableHead>
      <TableHead className="text-xs">Delivery Date</TableHead>
      <TableHead className="text-xs w-10"></TableHead>
    </TableRow>
  );

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{totalCount} orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV(false)} className="gap-1">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Button
          variant={statusFilter === "submitted" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(statusFilter === "submitted" ? "all" : "submitted")}
          className={`gap-1.5 ${statusFilter === "submitted" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
        >
          <CheckCircle size={14} />
          To Confirm
        </Button>
        <Button
          variant={statusFilter === "overdue" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(statusFilter === "overdue" ? "all" : "overdue")}
          className={`gap-1.5 ${statusFilter === "overdue" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "text-destructive border-destructive/30"}`}
        >
          <AlertTriangle size={14} />
          Overdue Payments
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search by order code or tracking..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
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
            <TableHeader>{tableHeaders}</TableHeader>
            <TableBody><SkeletonRows /></TableBody>
          </Table>
        </div>
      ) : !orders.length ? (
        <div className="text-center py-20 glass-card-solid">
          <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div data-testid="admin-orders-list" className={`glass-card-solid overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
          <Table>
            <TableHeader>{tableHeaders}</TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id} data-testid="order-row" className="cursor-pointer hover:bg-secondary/50">
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
                    <div className="flex items-center gap-1.5">
                      <Badge className={`border-0 text-[10px] ${getOrderStatusColor(o.status || "draft")}`}>
                        {getOrderStatusLabel(o.status || "draft")}
                      </Badge>
                      {["confirmed", "processing"].includes(o.status || "") && !Number(o.shipping_cost_client) && (
                        <span title="Shipping cost not set yet">
                          <AlertTriangle size={14} className="text-orange-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    {o.payment_status ? (
                      <Badge className={`border-0 text-[10px] ${getPaymentStatusColor(o.payment_status)}`}>
                        {getPaymentStatusLabel(o.payment_status)}
                      </Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-right font-mono text-sm font-semibold">
                    €{Number(o.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-right font-mono text-xs text-muted-foreground">
                    {Number(o.shipping_cost_client || 0) > 0
                      ? `€${Number(o.shipping_cost_client).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-muted-foreground">{fmtDate(o.payed_date)}</TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    {(() => {
                      const dueDate = (o as any).payment_due_date;
                      if (!dueDate) return <span className="text-xs text-muted-foreground">—</span>;
                      const due = new Date(dueDate);
                      const isOverdue = due < new Date() && o.payment_status !== "paid";
                      const isPaid = o.payment_status === "paid";
                      return (
                        <span className={`text-xs font-mono ${isOverdue ? "text-destructive font-semibold" : isPaid ? "text-success" : "text-muted-foreground"}`}>
                          {fmtDate(dueDate)}
                          {isOverdue && <span className="ml-1 text-[10px]">⚠</span>}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/orders/${o.id}`)} className="text-xs text-muted-foreground">{fmtDate(o.delivery_date)}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canTransitionTo(o.status || "draft", "confirmed") && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Confirm Order"
                        onClick={async () => {
                          try {
                            const calcDueDate = (pt: string | null) => {
                              const now = new Date();
                              switch (pt) {
                                case "prepaid": return now;
                                case "60_days": return addDays(now, 60);
                                case "90_days": return addDays(now, 90);
                                case "end_of_month": return lastDayOfMonth(addMonths(now, 1));
                                default: return addDays(now, 30);
                              }
                            };
                            const dueDate = calcDueDate(o.payment_terms);
                            if (!canTransitionTo(o.status || "draft", "confirmed")) {
                              toast.error(`Cannot confirm order in "${getOrderStatusLabel(o.status || "draft")}" status.`);
                              return;
                            }
                            await supabase.from("orders").update({ status: "confirmed", payment_due_date: format(dueDate, "yyyy-MM-dd") }).eq("id", o.id);
                            await supabase.from("client_notifications").insert({
                              client_id: o.client_id,
                              title: "Order confirmed",
                              body: `Your order #${o.order_code || o.id.slice(0, 8)} has been confirmed and is being processed.`,
                              type: "order",
                              order_id: o.id,
                            });
                            await supabase.from("order_events").insert({
                              order_id: o.id,
                              event_type: "status_change",
                              title: "Status updated: Confirmed",
                            });
                            qc.invalidateQueries({ queryKey: ["admin-orders"] });
                            toast.success("Order confirmed");
                          } catch (error) {
                            showErrorToast(error, "AdminOrders.quickConfirm");
                          }
                        }}
                      >
                        <CheckCircle size={16} />
                      </Button>
                    )}
                  </TableCell>
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

      {/* Floating Bulk Action Bar */}
      <BulkActionBar count={selected.size} onDeselect={() => setSelected(new Set())}>
         <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={() => setShowStatusDialog(true)}>
          <RefreshCw size={14} /> Update Status
        </Button>
        <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={() => setShowPaidConfirm(true)}>
          <CreditCard size={14} /> Mark as Paid
        </Button>
        <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={() => exportCSV(true)}>
          <Download size={14} /> Export CSV
        </Button>
      </BulkActionBar>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Status ({selected.size} orders)</DialogTitle></DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkStatusCheck} disabled={bulkLoading}>
              {bulkLoading ? "Updating..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid Confirmation Dialog */}
      <Dialog open={showPaidConfirm} onOpenChange={setShowPaidConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark {selected.size} orders as paid with today's date?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaidConfirm(false)}>Cancel</Button>
            <Button onClick={handleBulkPaid} disabled={bulkLoading}>
              {bulkLoading ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Warning Dialog */}
      <Dialog open={showTransitionWarning} onOpenChange={setShowTransitionWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Warning</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {transitionInfo.invalid.length} of {transitionInfo.valid.length + transitionInfo.invalid.length} selected orders cannot transition to "{getOrderStatusLabel(transitionInfo.target)}".
            Current status is incompatible.
          </p>
          <p className="text-sm text-foreground font-medium">
            Proceed with the {transitionInfo.valid.length} valid orders?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransitionWarning(false)}>Cancel</Button>
            <Button onClick={() => executeBulkStatus(transitionInfo.valid)} disabled={bulkLoading}>
              {bulkLoading ? "Updating..." : `Proceed with ${transitionInfo.valid.length} orders`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;

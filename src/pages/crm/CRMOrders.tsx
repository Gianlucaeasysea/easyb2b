import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/TablePagination";
import { Package, Clock, Truck, CheckCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ORDER_STATUSES, getOrderStatusLabel, getOrderStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor,
} from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

type OrderRow = Tables<"orders"> & {
  clients: { company_name: string; contact_name: string | null } | null;
};

const statusFilterOptions = ["all", "submitted", "confirmed", "processing", "ready_to_ship", "shipped", "delivered", "cancelled"];
const paymentFilterOptions = ["all", "unpaid", "pending", "paid"];

const CRMOrders = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["crm-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, contact_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCode = o.order_code?.toLowerCase().includes(q);
        const matchClient = o.clients?.company_name?.toLowerCase().includes(q);
        if (!matchCode && !matchClient) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const { pageData, page, totalPages, totalCount, from, to, nextPage, prevPage, goToPage } =
    usePaginatedData({ data: filtered, pageSize: 25 });

  // Summary stats for current month
  const stats = useMemo(() => {
    if (!orders) return { monthTotal: 0, pending: 0, shipped: 0, delivered: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = orders.filter((o) => new Date(o.created_at) >= monthStart);
    return {
      monthTotal: thisMonth.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      pending: orders.filter((o) => ["submitted", "confirmed", "processing"].includes(o.status || "")).length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered" || o.status === "Delivered").length,
    };
  }, [orders]);

  const summaryCards = [
    { label: "Totale ordini questo mese", value: `€${stats.monthTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`, icon: Package, color: "text-primary" },
    { label: "Ordini in attesa", value: stats.pending, icon: Clock, color: "text-warning" },
    { label: "Ordini spediti", value: stats.shipped, icon: Truck, color: "text-chart-4" },
    { label: "Ordini consegnati", value: stats.delivered, icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Ordini</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${c.color}`}>
                <c.icon size={18} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-heading font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per n° ordine o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stato ordine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {statusFilterOptions.slice(1).map((s) => (
              <SelectItem key={s} value={s}>{getOrderStatusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stato pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i pagamenti</SelectItem>
            {paymentFilterOptions.slice(1).map((s) => (
              <SelectItem key={s} value={s}>{getPaymentStatusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">N° Ordine</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Stato Ordine</TableHead>
              <TableHead className="text-xs">Stato Pagamento</TableHead>
              <TableHead className="text-xs text-right">Totale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Caricamento...</TableCell></TableRow>
            ) : pageData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessun ordine trovato</TableCell></TableRow>
            ) : pageData.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => navigate(`/crm/orders/${order.id}`)}
              >
                <TableCell className="font-mono text-sm font-medium">
                  {order.order_code || `#${order.id.slice(0, 8).toUpperCase()}`}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{order.clients?.company_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{order.clients?.contact_name || ""}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "dd MMM yyyy", { locale: it })}
                </TableCell>
                <TableCell>
                  <Badge className={`border-0 text-[10px] ${getOrderStatusColor(order.status || "draft")}`}>
                    {getOrderStatusLabel(order.status || "draft")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`border-0 text-[10px] ${getPaymentStatusColor(order.payment_status || "unpaid")}`}>
                    {getPaymentStatusLabel(order.payment_status || "unpaid")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-sm">
                  €{Number(order.total_amount || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={25}
        onPageChange={goToPage}
      />
    </div>
  );
};

export default CRMOrders;

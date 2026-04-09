import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/TablePagination";
import { Package, Clock, Truck, CheckCircle, Search, ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getOrderStatusLabel, getOrderStatusColor, getPaymentStatusLabel, getPaymentStatusColor } from "@/lib/constants";
import { CRMOrderDetailModal } from "@/components/crm/CRMOrderDetailModal";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type OrderRow = Tables<"orders"> & {
  clients: { id: string; company_name: string; contact_name: string | null } | null;
  order_items: { id: string }[] | null;
};

type QuickFilter = "all" | "new" | "confirmed" | "in_progress" | "completed" | "cancelled";

const quickFilterConfig: { key: QuickFilter; label: string; statuses: string[] }[] = [
  { key: "all", label: "Tutti", statuses: [] },
  { key: "new", label: "Nuovi", statuses: ["submitted"] },
  { key: "confirmed", label: "Confermati", statuses: ["confirmed"] },
  { key: "in_progress", label: "In Corso", statuses: ["processing", "ready_to_ship", "shipped"] },
  { key: "completed", label: "Completati", statuses: ["delivered"] },
  { key: "cancelled", label: "Annullati", statuses: ["cancelled", "returned"] },
];

const CRMOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["crm-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(id, company_name, contact_name), order_items(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("crm-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["crm-orders"] });
        const newOrder = payload.new as any;
        if (newOrder.status === "submitted") {
          toast.info(`Nuovo ordine ${newOrder.order_code || "#" + newOrder.id?.slice(0, 8)} ricevuto`);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["crm-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Summary stats
  const stats = useMemo(() => {
    if (!orders) return { submitted: { count: 0, value: 0 }, confirmed: { count: 0, value: 0 }, inProgress: { count: 0, value: 0 }, completedMonth: { count: 0, value: 0 } };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const submitted = orders.filter(o => o.status === "submitted");
    const confirmed = orders.filter(o => o.status === "confirmed");
    const inProgress = orders.filter(o => ["processing", "ready_to_ship", "shipped"].includes(o.status || ""));
    const completedMonth = orders.filter(o => o.status === "delivered" && new Date(o.created_at) >= monthStart);
    const sum = (arr: typeof orders) => arr.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return {
      submitted: { count: submitted.length, value: sum(submitted) },
      confirmed: { count: confirmed.length, value: sum(confirmed) },
      inProgress: { count: inProgress.length, value: sum(inProgress) },
      completedMonth: { count: completedMonth.length, value: sum(completedMonth) },
    };
  }, [orders]);

  const summaryCards = [
    { key: "new" as QuickFilter, label: "Nuovi Ordini", count: stats.submitted.count, value: stats.submitted.value, icon: ShoppingBag, color: "text-blue-600", highlight: stats.submitted.count > 0 },
    { key: "confirmed" as QuickFilter, label: "Da Processare", count: stats.confirmed.count, value: stats.confirmed.value, icon: Clock, color: "text-warning" },
    { key: "in_progress" as QuickFilter, label: "In Corso", count: stats.inProgress.count, value: stats.inProgress.value, icon: Truck, color: "text-chart-4" },
    { key: "completed" as QuickFilter, label: "Completati (mese)", count: stats.completedMonth.count, value: stats.completedMonth.value, icon: CheckCircle, color: "text-success" },
  ];

  // Filtering
  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (quickFilter !== "all") {
        const cfg = quickFilterConfig.find(f => f.key === quickFilter);
        if (cfg && cfg.statuses.length > 0 && !cfg.statuses.includes(o.status || "")) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const matchCode = o.order_code?.toLowerCase().includes(q);
        const matchClient = o.clients?.company_name?.toLowerCase().includes(q);
        if (!matchCode && !matchClient) return false;
      }
      return true;
    });
  }, [orders, quickFilter, search]);

  const { pageData, page, totalPages, totalCount, goToPage } = usePaginatedData({ data: filtered, pageSize: 25 });

  const fmtCurrency = (v: number) => `€${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Ordini</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card
            key={c.key}
            className={`bg-card border-border cursor-pointer transition-all hover:shadow-md ${
              quickFilter === c.key ? "ring-2 ring-primary" : ""
            } ${c.highlight ? "border-blue-400 border-2" : ""}`}
            onClick={() => setQuickFilter(quickFilter === c.key ? "all" : c.key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${c.color} relative`}>
                <c.icon size={18} />
                {c.highlight && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-heading font-bold text-foreground">{c.count}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{fmtCurrency(c.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick filter tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {quickFilterConfig.map(f => (
            <button
              key={f.key}
              onClick={() => setQuickFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                quickFilter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per n° ordine o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Stato</TableHead>
              <TableHead className="text-xs">N° Ordine</TableHead>
              <TableHead className="text-xs">Cliente</TableHead>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs text-center">Prodotti</TableHead>
              <TableHead className="text-xs text-right">Totale</TableHead>
              <TableHead className="text-xs">Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Caricamento...</TableCell></TableRow>
            ) : pageData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessun ordine trovato</TableCell></TableRow>
            ) : pageData.map((order) => (
              <TableRow
                key={order.id}
                className={`cursor-pointer transition-colors ${
                  order.status === "submitted" ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/30" : "hover:bg-muted/50"
                }`}
                onClick={() => openOrder(order.id)}
              >
                <TableCell>
                  <Badge className={`border-0 text-[10px] ${getOrderStatusColor(order.status || "draft")}`}>
                    {getOrderStatusLabel(order.status || "draft")}
                  </Badge>
                </TableCell>
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
                <TableCell className="text-sm text-center text-muted-foreground">
                  {order.order_items?.length || 0}
                </TableCell>
                <TableCell className="text-right font-semibold text-sm">
                  €{Number(order.total_amount || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge className={`border-0 text-[10px] ${getPaymentStatusColor(order.payment_status || "unpaid")}`}>
                    {getPaymentStatusLabel(order.payment_status || "unpaid")}
                  </Badge>
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

      <CRMOrderDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default CRMOrders;

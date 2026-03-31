import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Package, Search, Filter } from "lucide-react";

const fmt = (d: string | null | undefined, f: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, f) : "—";
};

const statusBadge: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-warning/20 text-warning",
  processing: "bg-primary/20 text-primary",
  shipped: "bg-chart-2/20 text-chart-2",
  delivered: "bg-chart-4/20 text-chart-4",
  Delivered: "bg-chart-4/20 text-chart-4",
  cancelled: "bg-destructive/20 text-destructive",
  "To be prepared": "bg-warning/20 text-warning",
  Ready: "bg-chart-4/20 text-chart-4",
  "On the road": "bg-primary/20 text-primary",
  Payed: "bg-chart-4/20 text-chart-4",
};

interface OrderDetailsTableProps {
  limit?: number;
  showFilters?: boolean;
  title?: string;
}

const OrderDetailsTable = ({ limit, showFilters = true, title = "Dettaglio Ordini" }: OrderDetailsTableProps) => {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = limit || 20;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["order-details-live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_code, status, total_amount, created_at, payed_date, pickup_date, delivery_date, notes, order_type,
          clients(id, company_name, country),
          order_items(id, quantity, unit_price, discount_pct, subtotal, product_id, products(name, sku))
        `)
        .not("order_type", "in", '("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const filtered = (orders || []).filter(o => {
    if (search) {
      const q = search.toLowerCase();
      const matchCode = (o.order_code || "").toLowerCase().includes(q);
      const matchClient = ((o as any).clients?.company_name || "").toLowerCase().includes(q);
      const matchProducts = ((o as any).order_items || []).some((item: any) => 
        (item.products?.name || "").toLowerCase().includes(q) || (item.products?.sku || "").toLowerCase().includes(q)
      );
      if (!matchCode && !matchClient && !matchProducts) return false;
    }
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (dateFrom) {
      const d = (o.created_at || "").slice(0, 10);
      if (d < dateFrom) return false;
    }
    if (dateTo) {
      const d = (o.created_at || "").slice(0, 10);
      if (d > dateTo) return false;
    }
    return true;
  });

  const paginated = limit ? filtered.slice(0, limit) : filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
          <Package size={18} /> {title}
          <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length} ordini)</span>
        </h2>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente, codice, prodotto..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 text-sm bg-secondary border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <Filter size={12} className="mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="confirmed">Confermato</SelectItem>
              <SelectItem value="processing">In lavorazione</SelectItem>
              <SelectItem value="shipped">Spedito</SelectItem>
              <SelectItem value="delivered">Consegnato</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Payed">Pagato</SelectItem>
              <SelectItem value="cancelled">Annullato</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[150px] h-9 text-sm bg-secondary border-border" placeholder="Da" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[150px] h-9 text-sm bg-secondary border-border" placeholder="A" />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Caricamento ordini...</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-xs font-heading">Codice</TableHead>
                <TableHead className="text-xs font-heading">Cliente</TableHead>
                <TableHead className="text-xs font-heading">Prodotti</TableHead>
                <TableHead className="text-xs font-heading text-right">Totale</TableHead>
                <TableHead className="text-xs font-heading">Status</TableHead>
                <TableHead className="text-xs font-heading">Data Ordine</TableHead>
                <TableHead className="text-xs font-heading">Pagamento</TableHead>
                <TableHead className="text-xs font-heading">Ritiro</TableHead>
                <TableHead className="text-xs font-heading">Consegna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(o => {
                const items = (o as any).order_items || [];
                const client = (o as any).clients;
                const isExpanded = expandedOrder === o.id;
                const productSummary = items.length > 0
                  ? items.slice(0, 2).map((i: any) => i.products?.name || i.products?.sku || "—").join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "")
                  : "—";

                return (
                  <>
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                    >
                      <TableCell className="w-8 px-2">
                        {items.length > 0 && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{o.order_code || `#${o.id.slice(0, 8)}`}</TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium">{client?.company_name || "—"}</span>
                          {client?.country && <span className="text-xs text-muted-foreground ml-1">({client.country})</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{productSummary}</TableCell>
                      <TableCell className="text-right font-bold text-sm">€{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 text-[10px] ${statusBadge[o.status || "draft"] || "bg-muted text-muted-foreground"}`}>
                          {o.status || "draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(o.created_at, "dd/MM/yy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(o.payed_date, "dd/MM/yy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(o.pickup_date, "dd/MM/yy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(o.delivery_date, "dd/MM/yy")}</TableCell>
                    </TableRow>
                    {isExpanded && items.length > 0 && (
                      <TableRow key={`${o.id}-detail`} className="bg-muted/10">
                        <TableCell colSpan={10} className="p-0">
                          <div className="px-10 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left py-1 font-medium">Prodotto</th>
                                  <th className="text-left py-1 font-medium">SKU</th>
                                  <th className="text-right py-1 font-medium">Prezzo</th>
                                  <th className="text-right py-1 font-medium">Qtà</th>
                                  <th className="text-right py-1 font-medium">Sconto</th>
                                  <th className="text-right py-1 font-medium">Subtotale</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item: any) => (
                                  <tr key={item.id} className="border-t border-border/30">
                                    <td className="py-1.5 font-medium">{item.products?.name || "—"}</td>
                                    <td className="py-1.5 text-muted-foreground font-mono">{item.products?.sku || "—"}</td>
                                    <td className="py-1.5 text-right">€{Number(item.unit_price || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                                    <td className="py-1.5 text-right">{item.quantity}</td>
                                    <td className="py-1.5 text-right">{Number(item.discount_pct || 0)}%</td>
                                    <td className="py-1.5 text-right font-medium">€{Number(item.subtotal || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">Nessun ordine trovato</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Pagina {page + 1} di {totalPages} · {filtered.length} ordini totali
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prec</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Succ →</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsTable;

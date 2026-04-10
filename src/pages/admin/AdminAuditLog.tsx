import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/TablePagination";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, History } from "lucide-react";


const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: "Creazione", color: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  UPDATE: { label: "Modifica", color: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  DELETE: { label: "Eliminazione", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const TABLE_LABELS: Record<string, string> = {
  orders: "Ordini",
  clients: "Clienti",
  products: "Prodotti",
  price_lists: "Listini",
  user_roles: "Ruoli Utente",
};

const TRACKED_TABLES = ["orders", "clients", "products", "price_lists", "user_roles"];

const PAGE_SIZE = 25;

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  changed_by: string | null;
  created_at: string;
}

function DiffView({ oldData, newData, changedFields, action }: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[] | null;
  action: string;
}) {
  const skipFields = ["updated_at", "created_at"];

  if (action === "INSERT" && newData) {
    const entries = Object.entries(newData).filter(([k]) => !skipFields.includes(k));
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-2 py-0.5 px-2 rounded bg-chart-2/5 border border-chart-2/10">
            <span className="text-muted-foreground font-medium min-w-[120px]">{key}:</span>
            <span className="text-chart-2 break-all">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (action === "DELETE" && oldData) {
    const entries = Object.entries(oldData).filter(([k]) => !skipFields.includes(k));
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
        {entries.map(([key, val]) => (
          <div key={key} className="flex gap-2 py-0.5 px-2 rounded bg-destructive/5 border border-destructive/10">
            <span className="text-muted-foreground font-medium min-w-[120px]">{key}:</span>
            <span className="text-destructive line-through break-all">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // UPDATE
  if (!changedFields?.length) {
    return <p className="text-xs text-muted-foreground italic">Nessun campo modificato registrato.</p>;
  }

  return (
    <div className="space-y-1 text-xs">
      {changedFields.filter(f => !skipFields.includes(f)).map(field => (
        <div key={field} className="flex items-start gap-2 py-1 px-2 rounded bg-chart-4/5 border border-chart-4/10">
          <span className="text-muted-foreground font-medium min-w-[120px] shrink-0">{field}:</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-destructive/80 line-through break-all">
              {formatValue(oldData?.[field])}
            </span>
            <span className="text-chart-2 break-all">
              {formatValue(newData?.[field])}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

const AdminAuditLog = () => {
  const [page, setPage] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, tableFilter, actionFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data || []) as AuditLog[], total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const resetFilters = () => {
    setTableFilter("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History size={20} className="text-primary" />
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Log Attività</h1>
            <p className="text-sm text-muted-foreground">Audit trail delle modifiche ai record</p>
          </div>
        </div>
        {data?.total ? (
          <Badge variant="outline" className="text-xs">{data.total} eventi</Badge>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tabella</label>
          <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {TRACKED_TABLES.map(t => (
                <SelectItem key={t} value={t}>{TABLE_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Azione</label>
          <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="INSERT">Creazione</SelectItem>
              <SelectItem value="UPDATE">Modifica</SelectItem>
              <SelectItem value="DELETE">Eliminazione</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Da</label>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-36 h-9 text-xs" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">A</label>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-36 h-9 text-xs" />
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-9" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Tabella</TableHead>
              <TableHead className="text-xs">Azione</TableHead>
              <TableHead className="text-xs">Record ID</TableHead>
              <TableHead className="text-xs">Campi Modificati</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Caricamento...</TableCell></TableRow>
            ) : !data?.logs.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nessun evento trovato.</TableCell></TableRow>
            ) : (
              data.logs.map(log => {
                const isExpanded = expandedId === log.id;
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-muted text-muted-foreground" };
                return (
                  <TableRow key={log.id} className="group">
                    <TableCell colSpan={6} className="p-0">
                      <div
                        className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <div className="w-8 shrink-0">
                          {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-4 items-center text-xs">
                          <span className="text-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                          </span>
                          <span className="text-foreground font-medium">
                            {TABLE_LABELS[log.table_name] || log.table_name}
                          </span>
                          <span>
                            <Badge variant="outline" className={`text-[10px] ${actionInfo.color}`}>
                              {actionInfo.label}
                            </Badge>
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px] truncate">
                            {log.record_id.substring(0, 8)}…
                          </span>
                          <span className="text-muted-foreground">
                            {log.changed_fields?.length
                              ? log.changed_fields.filter(f => f !== "updated_at").join(", ")
                              : log.action === "INSERT" ? "nuovo record" : log.action === "DELETE" ? "eliminato" : "—"}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-12 pb-4 pt-1">
                          <DiffView
                            oldData={log.old_data as Record<string, unknown> | null}
                            newData={log.new_data as Record<string, unknown> | null}
                            changedFields={log.changed_fields}
                            action={log.action}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={data?.total || 0}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;

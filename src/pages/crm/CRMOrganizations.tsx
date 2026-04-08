import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Search, Building2, ChevronRight, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import * as XLSX from "xlsx";
import { deleteClientsCascade } from "@/lib/crmEntityActions";
import { TablePagination } from "@/components/ui/TablePagination";

const lifecycleStatuses = ["lead", "qualifying", "onboarding", "active", "at_risk", "churned", "disqualified"];

const statusLabel: Record<string, string> = {
  lead: "📋 Lead",
  qualifying: "🔍 Qualifying",
  onboarding: "🔄 Onboarding",
  active: "✅ Active",
  at_risk: "⚠️ At Risk",
  churned: "❌ Churned",
  disqualified: "🚫 Disqualified",
};

const statusColorClass: Record<string, string> = {
  lead: "bg-primary/20 text-primary",
  qualifying: "bg-warning/20 text-warning",
  onboarding: "bg-chart-4/20 text-chart-4",
  active: "bg-success/20 text-success",
  at_risk: "bg-destructive/20 text-destructive",
  churned: "bg-muted text-muted-foreground",
  disqualified: "bg-muted text-muted-foreground",
};

// Organization score: 0-100
const calcScore = (client: any, activitiesCount: number, platformAvgOrderValue: number) => {
  let score = 0;
  // Frequency: orders in last 90 days vs expected
  if (client.avg_order_frequency_days && client.avg_order_frequency_days > 0 && client.last_order_date) {
    const daysSince = client.days_since_last_order || 0;
    const ratio = Math.max(0, 1 - daysSince / (client.avg_order_frequency_days * 2));
    score += ratio * 25;
  }
  // Avg order value vs platform avg
  if (client.total_orders_count > 0 && platformAvgOrderValue > 0) {
    const avgVal = (client.total_orders_value || 0) / client.total_orders_count;
    const ratio = Math.min(1, avgVal / (platformAvgOrderValue * 1.5));
    score += ratio * 25;
  }
  // Days since last order (less = better)
  const daysInactive = client.days_since_last_order || 999;
  if (daysInactive < 120) {
    score += Math.max(0, (1 - daysInactive / 120)) * 25;
  }
  // Engagement
  score += Math.min(25, activitiesCount * 5);
  return Math.round(score);
};

const scoreColor = (score: number) => {
  if (score > 70) return "bg-success/20 text-success";
  if (score >= 40) return "bg-warning/20 text-warning";
  return "bg-destructive/20 text-destructive";
};

const CRMOrganizations = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterHasOrders, setFilterHasOrders] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterCountry, filterHasOrders]);

  const { data: clients } = useQuery({
    queryKey: ["crm-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, email, phone, zone, status, country, business_type, last_order_date, days_since_last_order, next_reorder_expected_date, total_orders_count, total_orders_value, avg_order_frequency_days, assigned_sales_id")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch primary contacts
  const { data: primaryContacts } = useQuery({
    queryKey: ["crm-org-primary-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("client_id, contact_name, email, is_primary")
        .order("is_primary", { ascending: false });
      if (error) throw error;
      // Group: first primary, else first
      const map: Record<string, { contact_name: string; email: string | null }> = {};
      data.forEach(c => {
        if (!map[c.client_id] || c.is_primary) {
          map[c.client_id] = { contact_name: c.contact_name, email: c.email };
        }
      });
      return map;
    },
  });

  const { data: contactCounts } = useQuery({
    queryKey: ["crm-org-contact-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_contacts").select("client_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(c => { counts[c.client_id] = (counts[c.client_id] || 0) + 1; });
      return counts;
    },
  });

  // Activity counts per client (last 30 days)
  const { data: activityCounts } = useQuery({
    queryKey: ["crm-org-activity-counts"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("activities")
        .select("client_id")
        .not("client_id", "is", null)
        .gte("created_at", thirtyDaysAgo);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(a => { if (a.client_id) counts[a.client_id] = (counts[a.client_id] || 0) + 1; });
      return counts;
    },
  });

  const deleteClients = useMutation({
    mutationFn: deleteClientsCascade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      setSelected(new Set());
      toast.success("Organizzazioni eliminate");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const countries = [...new Set(clients?.map(c => c.country).filter(Boolean) || [])].sort();

  // Platform average order value
  const platformAvgOrderValue = (() => {
    if (!clients?.length) return 0;
    const withOrders = clients.filter(c => (c.total_orders_count || 0) > 0);
    if (!withOrders.length) return 0;
    const totalVal = withOrders.reduce((s, c) => s + (c.total_orders_value || 0), 0);
    const totalCount = withOrders.reduce((s, c) => s + (c.total_orders_count || 0), 0);
    return totalCount > 0 ? totalVal / totalCount : 0;
  })();

  const filtered = clients?.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.company_name?.toLowerCase().includes(s) && !c.contact_name?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s)) return false;
    }
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterCountry !== "all" && c.country !== filterCountry) return false;
    if (filterHasOrders === "yes" && !(c.total_orders_count && c.total_orders_count > 0)) return false;
    if (filterHasOrders === "no" && (c.total_orders_count || 0) > 0) return false;
    return true;
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const sliceFrom = (page - 1) * pageSize;
  const pageData = filtered.slice(sliceFrom, sliceFrom + pageSize);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const exportCsv = () => {
    const rows = filtered.map(c => ({
      "Organizzazione": c.company_name,
      "Contatto Principale": primaryContacts?.[c.id]?.contact_name || c.contact_name || "",
      "Email": primaryContacts?.[c.id]?.email || c.email || "",
      "Telefono": c.phone || "",
      "Paese": c.country || "",
      "Zona": c.zone || "",
      "Status": c.status || "",
      "Ordini": c.total_orders_count || 0,
      "Valore Totale": c.total_orders_value || 0,
      "Ultimo Ordine": c.last_order_date || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Organizzazioni");
    XLSX.writeFile(wb, "organizzazioni.csv");
    toast.success("CSV esportato");
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const getReorderColor = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const daysAway = differenceInDays(d, new Date());
    if (daysAway < 0) return "text-destructive font-semibold";
    if (daysAway <= 7) return "text-warning font-semibold";
    return "text-success";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Organizzazioni</h1>
          <p className="text-sm text-muted-foreground">Gestisci aziende e dealer — click per contatti, ordini e dettagli</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => {
              if (confirm(`Eliminare ${selected.size} organizzazioni selezionate con tutti i dati associati?`)) deleteClients.mutate(Array.from(selected));
            }}>
              <Trash2 size={14} /> Elimina ({selected.size})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
          <Badge variant="outline" className="text-xs">{filtered.length} organizzazioni</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Cerca organizzazioni..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Status</SelectItem>
            {lifecycleStatuses.map(s => (
              <SelectItem key={s} value={s}>{statusLabel[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Paese" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Paesi</SelectItem>
            {countries.map(c => (
              <SelectItem key={c} value={c!}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterHasOrders} onValueChange={setFilterHasOrders}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Ordini" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="yes">Con Ordini</SelectItem>
            <SelectItem value="no">Senza Ordini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Building2 className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessuna organizzazione trovata.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Contatto Principale</TableHead>
                <TableHead>Contatti</TableHead>
                <TableHead>Paese</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Ultimo Ordine</TableHead>
                <TableHead>Next Reorder</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 && pageData.map(c => {
                const primary = primaryContacts?.[c.id];
                const cCount = contactCounts?.[c.id] || 0;
                const actCount = activityCounts?.[c.id] || 0;
                const score = calcScore(c, actCount, platformAvgOrderValue);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50">
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)} className="font-heading font-semibold">{c.company_name}</TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)} className="text-sm">
                      {primary?.contact_name || c.contact_name || "—"}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)}>
                      {cCount > 0 ? (
                        <Badge variant="outline" className="text-[10px]">{cCount}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)} className="text-muted-foreground text-sm">{c.country || c.zone || "—"}</TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)}>
                      <Badge className={`border-0 text-[10px] ${statusColorClass[c.status || "lead"] || "bg-muted text-muted-foreground"}`}>
                        {statusLabel[c.status || "lead"] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)}>
                      <Badge className={`border-0 text-[10px] ${scoreColor(score)}`}>{score}</Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)}>
                      {c.last_order_date ? (
                        <div className="text-xs">
                          <span className="text-foreground">{format(new Date(c.last_order_date), "dd/MM/yy")}</span>
                          <span className="text-muted-foreground ml-1">({c.days_since_last_order || 0}d fa)</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => navigate(`/crm/organizations/${c.id}`)}>
                      {c.next_reorder_expected_date ? (
                        <span className={`text-xs ${getReorderColor(c.next_reorder_expected_date)}`}>
                          {format(new Date(c.next_reorder_expected_date), "dd/MM/yy")}
                          {differenceInDays(new Date(c.next_reorder_expected_date), new Date()) < 0 && " (scaduto)"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {c.phone && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => openWhatsApp(c.phone!, c.contact_name || c.company_name)} title="WhatsApp">
                              <MessageCircle size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => window.open(`tel:${c.phone}`)} title="Chiama">
                              <Phone size={16} />
                            </Button>
                          </>
                        )}
                        {c.email && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => window.open(`mailto:${c.email}`)} title="Email">
                            <Mail size={16} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => {
                          if (confirm(`Eliminare "${c.company_name}" con tutti i dati associati?`)) deleteClients.mutate([c.id]);
                        }} title="Elimina">
                          <Trash2 size={14} />
                        </Button>
                        <ChevronRight size={16} className="text-muted-foreground ml-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls page={page} totalPages={totalPages} from={from} to={to} totalCount={totalCount} onPrev={prevPage} onNext={nextPage} onGoTo={goToPage} />
        </div>
      )}
    </div>
  );
};

export default CRMOrganizations;

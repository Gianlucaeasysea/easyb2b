import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, ArrowRight, Plus, Trash2, Settings2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { differenceInDays } from "date-fns";
import { deleteClientsCascade } from "@/lib/crmEntityActions";
import { TablePagination } from "@/components/ui/TablePagination";

const AdminClients = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [inactiveDays, setInactiveDays] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState("active");
  const [bulkDiscount, setBulkDiscount] = useState("standard");
  const [bulkType, setBulkType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [newClient, setNewClient] = useState({
    company_name: "", contact_name: "", email: "", phone: "",
    country: "", address: "", business_type: "", status: "active",
    discount_class: "standard", website: "", vat_number: "", zone: "", notes: "",
  });

  useEffect(() => { setPage(1); }, [search, inactiveDays]);

  const { data: queryResult, isLoading, isFetching } = useQuery({
    queryKey: ["admin-clients", page, pageSize, search],
    queryFn: async () => {
      let query = supabase.from("clients").select("*", { count: "exact" }).order("company_name");

      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,country.ilike.%${search}%,business_type.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { clients: data || [], totalCount: count || 0 };
    },
    placeholderData: (prev) => prev,
  });

  const clients = queryResult?.clients || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const { data: clientOrderStats } = useQuery({
    queryKey: ["admin-clients-order-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("client_id, created_at, total_amount").order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, { lastOrder: string | null; totalSpent: number }> = {};
      (data || []).forEach(o => {
        if (!map[o.client_id]) {
          map[o.client_id] = { lastOrder: o.created_at, totalSpent: 0 };
        }
        map[o.client_id].totalSpent += Number(o.total_amount || 0);
      });
      return map;
    },
  });

  const { data: discountTiers } = useQuery({
    queryKey: ["discount-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_tiers").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Apply inactive filter client-side since it depends on order stats
  const filtered = inactiveDays
    ? clients.filter(c => {
        const days = parseInt(inactiveDays);
        if (isNaN(days) || days <= 0) return true;
        const stats = clientOrderStats?.[c.id];
        if (!stats?.lastOrder) return true;
        return differenceInDays(new Date(), new Date(stats.lastOrder)) >= days;
      })
    : clients;

  const createClient = useMutation({
    mutationFn: async () => {
      if (!newClient.company_name) throw new Error("Company name is required");
      const { error } = await supabase.from("clients").insert({
        ...newClient,
        contact_name: newClient.contact_name || null,
        email: newClient.email || null,
        phone: newClient.phone || null,
        country: newClient.country || null,
        address: newClient.address || null,
        business_type: newClient.business_type || null,
        website: newClient.website || null,
        vat_number: newClient.vat_number || null,
        zone: newClient.zone || null,
        notes: newClient.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
      setShowCreate(false);
      setNewClient({ company_name: "", contact_name: "", email: "", phone: "", country: "", address: "", business_type: "", status: "active", discount_class: "standard", website: "", vat_number: "", zone: "", notes: "" });
      toast.success("Cliente creato");
    },
    onError: (error) => showErrorToast(error, "AdminClients.createClient"),
  });

  const executeBulk = async () => {
    if (selected.size === 0) { toast.error("Seleziona almeno un cliente"); return; }
    const ids = Array.from(selected);

    if (bulkAction === "delete") {
      try { await deleteClientsCascade(ids); } catch (error) { showErrorToast(error, "AdminClients.bulkDelete"); return; }
      toast.success(`${ids.length} clienti eliminati`);
    } else if (bulkAction === "status") {
      const { error } = await supabase.from("clients").update({ status: bulkStatus }).in("id", ids);
      if (error) { toast.error(error.message); return; }
      toast.success(`Stato aggiornato per ${ids.length} clienti`);
    } else if (bulkAction === "discount") {
      const { error } = await supabase.from("clients").update({ discount_class: bulkDiscount }).in("id", ids);
      if (error) { toast.error(error.message); return; }
      toast.success(`Classe sconto aggiornata per ${ids.length} clienti`);
    } else if (bulkAction === "type") {
      const { error } = await supabase.from("clients").update({ business_type: bulkType }).in("id", ids);
      if (error) { toast.error(error.message); return; }
      toast.success(`Tipo aggiornato per ${ids.length} clienti`);
    }

    setSelected(new Set());
    setShowBulk(false);
    setBulkAction("");
    qc.invalidateQueries({ queryKey: ["admin-clients"] });
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
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const statusLabel: Record<string, string> = {
    active: "✅ Attivo", inactive: "❌ Non Attivo", onboarding: "🔄 In Attivazione", lead: "📋 Lead", suspended: "⛔ Sospeso",
  };

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Clienti</h1>
          <p className="text-sm text-muted-foreground">Gestisci anagrafiche clienti B2B</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowBulk(true)} className="gap-1">
              <Settings2 size={14} /> Azioni ({selected.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
            <Plus size={14} /> Nuovo Cliente
          </Button>
          <Badge variant="outline" className="text-xs">{totalCount} clienti</Badge>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Cerca per azienda, contatto, paese, tipo..." className="pl-10 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          <Input
            type="number"
            placeholder="Inattivi da X giorni"
            value={inactiveDays}
            onChange={e => setInactiveDays(e.target.value)}
            className="w-[180px] text-xs bg-secondary border-border rounded-lg h-9"
          />
          {inactiveDays && (
            <Button variant="ghost" size="sm" onClick={() => setInactiveDays("")} className="h-8 px-2 text-xs">✕</Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox disabled /></TableHead>
                <TableHead>Azienda</TableHead><TableHead>Tipo</TableHead><TableHead>Paese</TableHead>
                <TableHead>Sconto</TableHead><TableHead>Ultimo Ordine</TableHead>
                <TableHead className="text-right">Totale Speso</TableHead><TableHead>Stato</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody><SkeletonRows /></TableBody>
          </Table>
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Users className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">{search ? "Nessun risultato." : "Nessun cliente."}</p>
        </div>
      ) : (
        <div className={`glass-card-solid overflow-hidden ${isFetching ? "opacity-60" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Azienda</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Paese</TableHead>
                <TableHead>Sconto</TableHead>
                <TableHead>Ultimo Ordine</TableHead>
                <TableHead className="text-right">Totale Speso</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    <span className="font-heading font-semibold">{c.company_name}</span>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    {c.business_type ? (
                      <Badge variant="outline" className="text-[10px]">{c.business_type}</Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    <span className="text-sm text-muted-foreground">{c.country || "—"}</span>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    <Badge variant="outline" className="font-mono text-[10px]">{discountTiers?.find(t => t.name === c.discount_class)?.label || c.discount_class}</Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    {(() => {
                      const stats = clientOrderStats?.[c.id];
                      if (!stats?.lastOrder) return <span className="text-xs text-muted-foreground">Mai</span>;
                      const days = differenceInDays(new Date(), new Date(stats.lastOrder));
                      const dateStr = new Date(stats.lastOrder).toLocaleDateString("it-IT");
                      return (
                        <div>
                          <span className="text-xs">{dateStr}</span>
                          <p className="text-[10px] text-muted-foreground">{days} giorni fa</p>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)} className="text-right">
                    <span className="font-mono text-sm">€{(clientOrderStats?.[c.id]?.totalSpent || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    <Badge className={`border-0 text-[10px] ${
                      c.status === "active" ? "bg-success/20 text-success" :
                      c.status === "onboarding" ? "bg-chart-4/20 text-chart-4" :
                      c.status === "lead" ? "bg-warning/20 text-warning" :
                      c.status === "inactive" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {statusLabel[c.status || "lead"] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/admin/clients/${c.id}`)}>
                    <ArrowRight size={14} className="text-muted-foreground" />
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

      {/* Create Client Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuovo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome Azienda *</Label><Input value={newClient.company_name} onChange={e => setNewClient(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Referente</Label><Input value={newClient.contact_name} onChange={e => setNewClient(f => ({ ...f, contact_name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={newClient.email} onChange={e => setNewClient(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefono</Label><Input value={newClient.phone} onChange={e => setNewClient(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Paese</Label><Input value={newClient.country} onChange={e => setNewClient(f => ({ ...f, country: e.target.value }))} placeholder="es. IT, DE, US" /></div>
            </div>
            <div><Label>Indirizzo</Label><Input value={newClient.address} onChange={e => setNewClient(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={newClient.business_type || "__none__"} onValueChange={v => setNewClient(f => ({ ...f, business_type: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Seleziona —</SelectItem>
                    <SelectItem value="Reseller">Reseller</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Rigger">Rigger</SelectItem>
                    <SelectItem value="Dropshipper">Dropshipper</SelectItem>
                    <SelectItem value="Boat Builder">Boat Builder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stato</Label>
                <Select value={newClient.status} onValueChange={v => setNewClient(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Attivo</SelectItem>
                    <SelectItem value="inactive">❌ Non Attivo</SelectItem>
                    <SelectItem value="onboarding">🔄 In Attivazione</SelectItem>
                    <SelectItem value="lead">📋 Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Classe Sconto</Label>
                 <Select value={newClient.discount_class} onValueChange={v => setNewClient(f => ({ ...f, discount_class: v }))}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     {discountTiers?.map(t => (
                       <SelectItem key={t.name} value={t.name}>{t.label} (-{t.discount_pct}%)</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              <div><Label>P.IVA</Label><Input value={newClient.vat_number} onChange={e => setNewClient(f => ({ ...f, vat_number: e.target.value }))} /></div>
            </div>
            <div><Label>Website</Label><Input value={newClient.website} onChange={e => setNewClient(f => ({ ...f, website: e.target.value }))} /></div>
            <Button onClick={() => createClient.mutate()} disabled={!newClient.company_name || createClient.isPending} className="w-full">
              Crea Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Azioni Bulk ({selected.size} selezionati)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger><SelectValue placeholder="Seleziona azione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Cambia Stato</SelectItem>
                <SelectItem value="discount">Cambia Classe Sconto</SelectItem>
                <SelectItem value="type">Cambia Tipo</SelectItem>
                <SelectItem value="delete">Elimina</SelectItem>
              </SelectContent>
            </Select>
            {bulkAction === "status" && (
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ Attivo</SelectItem>
                  <SelectItem value="inactive">❌ Non Attivo</SelectItem>
                  <SelectItem value="onboarding">🔄 In Attivazione</SelectItem>
                  <SelectItem value="lead">📋 Lead</SelectItem>
                  <SelectItem value="suspended">⛔ Sospeso</SelectItem>
                </SelectContent>
              </Select>
            )}
            {bulkAction === "discount" && (
              <Select value={bulkDiscount} onValueChange={setBulkDiscount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {discountTiers?.map(t => (
                    <SelectItem key={t.name} value={t.name}>{t.label} (-{t.discount_pct}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {bulkAction === "type" && (
              <Select value={bulkType || "__none__"} onValueChange={v => setBulkType(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nessuno —</SelectItem>
                  <SelectItem value="Reseller">Reseller</SelectItem>
                  <SelectItem value="Distributor">Distributor</SelectItem>
                  <SelectItem value="Rigger">Rigger</SelectItem>
                  <SelectItem value="Dropshipper">Dropshipper</SelectItem>
                  <SelectItem value="Boat Builder">Boat Builder</SelectItem>
                </SelectContent>
              </Select>
            )}
            {bulkAction === "delete" && (
              <p className="text-sm text-destructive">⚠️ Verranno eliminati {selected.size} clienti con tutti i dati associati (ordini, contatti, comunicazioni).</p>
            )}
            <Button onClick={executeBulk} disabled={!bulkAction} className="w-full" variant={bulkAction === "delete" ? "destructive" : "default"}>
              {bulkAction === "delete" ? `Elimina ${selected.size} clienti` : "Applica"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;

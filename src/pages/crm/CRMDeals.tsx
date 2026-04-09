import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkAndRunAutomations } from "@/hooks/useAutomations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Handshake, Plus, Search, Trash2, Building2, User, Calendar,
  TrendingUp, CheckCircle2, XCircle, Pencil, Save, X, ShoppingBag
} from "lucide-react";
import { useState } from "react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const stageConfig: Record<string, { label: string; color: string; prob: number }> = {
  draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800", prob: 10 },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", prob: 75 },
  closed_won: { label: "Won", color: "bg-success/20 text-success", prob: 100 },
  closed_lost: { label: "Lost", color: "bg-destructive/20 text-destructive", prob: 0 },
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isValid(dt) ? format(dt, "dd/MM/yyyy") : "—";
};

const fmtCurrency = (v: number | null) =>
  `€${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const emptyForm = {
  title: "", client_id: "", lead_id: "", contact_id: "",
  value: "", stage: "draft", probability: "10",
  expected_close_date: "", notes: "",
};

const CRMDeals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailDeal, setDetailDeal] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [bulkStage, setBulkStage] = useState("");
  const [bulkAssignTo, setBulkAssignTo] = useState("");

  const { data: deals, isLoading } = useQuery({
    queryKey: ["crm-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, clients:client_id(id, company_name), leads:lead_id(id, company_name), contact:contact_id(id, contact_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orgs } = useQuery({
    queryKey: ["crm-deal-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name").order("company_name");
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["crm-deal-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, company_name").order("company_name");
      return data || [];
    },
  });

  const { data: contactOptions } = useQuery({
    queryKey: ["crm-deal-contacts", form.client_id],
    queryFn: async () => {
      if (!form.client_id) return [];
      const { data } = await supabase.from("client_contacts").select("id, contact_name").eq("client_id", form.client_id);
      return data || [];
    },
    enabled: !!form.client_id,
  });

  // Detail: orders for the org
  const { data: detailOrders } = useQuery({
    queryKey: ["crm-deal-detail-orders", detailDeal?.client_id],
    queryFn: async () => {
      if (!detailDeal?.client_id) return [];
      const { data } = await supabase.from("orders").select("id, order_code, total_amount, status, created_at").eq("client_id", detailDeal.client_id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!detailDeal?.client_id,
  });

  // Detail: activities for this deal
  const { data: detailActivities } = useQuery({
    queryKey: ["crm-deal-activities", detailDeal?.id],
    queryFn: async () => {
      if (!detailDeal?.id) return [];
      const { data } = await supabase.from("activities").select("id, title, type, scheduled_at, completed_at, created_at").eq("lead_id", detailDeal.id).order("created_at", { ascending: false });
      // Also check if deal_id concept exists in tasks
      return data || [];
    },
    enabled: !!detailDeal?.id,
  });

  // Sales reps (profiles with sales/admin roles)
  const { data: salesReps } = useQuery({
    queryKey: ["crm-sales-reps"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "sales"]);
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, contact_name").in("user_id", userIds);
      return (profiles || []).map(p => ({ ...p, role: roles.find(r => r.user_id === p.user_id)?.role }));
    },
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        title: form.title,
        client_id: form.client_id || null,
        lead_id: form.lead_id || null,
        contact_id: form.contact_id || null,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: parseInt(form.probability) || 20,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
        assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Deal creato");
      setCreateOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const cleaned = { ...updates };
      if (cleaned.expected_close_date === "" || cleaned.expected_close_date === undefined) {
        cleaned.expected_close_date = null;
      }
      if (cleaned.notes === "") cleaned.notes = null;
      const { error } = await supabase.from("deals").update(cleaned).eq("id", id);
      if (error) throw error;
      return { id, updates: cleaned };
    },
    onSuccess: ({ id, updates }) => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      toast.success("Deal aggiornato");
      setEditing(false);
      if (updates.stage && detailDeal) {
        checkAndRunAutomations("deal_stage_changed", {
          deal_id: id,
          to_stage: updates.stage,
          deal_title: detailDeal.title,
          client_id: detailDeal.client_id || undefined,
        });
      }
      if (detailDeal) {
        const updated = deals?.find(d => d.id === detailDeal.id);
        if (updated) setDetailDeal({ ...updated, ...editForm });
      }
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("deals").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      setSelected(new Set());
      setDetailDeal(null);
      toast.success("Deal eliminati");
    },
  });

  const markWon = (id: string) => {
    updateDeal.mutate({ id, updates: { stage: "closed_won", probability: 100, closed_at: new Date().toISOString() } });
  };

  const confirmLost = () => {
    if (!lostDealId) return;
    updateDeal.mutate({ id: lostDealId, updates: { stage: "closed_lost", probability: 0, closed_at: new Date().toISOString(), lost_reason: lostReason } });
    setLostReasonOpen(false);
    setLostReason("");
    setLostDealId(null);
  };

  const onStageChange = (newStage: string) => {
    const prob = stageConfig[newStage]?.prob ?? 20;
    setForm(f => ({ ...f, stage: newStage, probability: String(prob) }));
  };

  const filtered = deals?.filter(d => {
    if (search) {
      const s = search.toLowerCase();
      if (!d.title.toLowerCase().includes(s) && !(d as any).clients?.company_name?.toLowerCase().includes(s)) return false;
    }
    if (filterStage !== "all" && d.stage !== filterStage) return false;
    if (filterOrg !== "all" && d.client_id !== filterOrg) return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      if (new Date(d.created_at!) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59);
      if (new Date(d.created_at!) > to) return false;
    }
    return true;
  });

  const bulkUpdateStage = useMutation({
    mutationFn: async (stage: string) => {
      const ids = Array.from(selected);
      const updates: any = { stage, probability: stageConfig[stage]?.prob ?? 20 };
      if (stage === "closed_won" || stage === "closed_lost") updates.closed_at = new Date().toISOString();
      const { error } = await supabase.from("deals").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, stage) => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      const ids = Array.from(selected);
      ids.forEach(id => {
        const deal = deals?.find(d => d.id === id);
        if (deal) {
          checkAndRunAutomations("deal_stage_changed", {
            deal_id: id, to_stage: stage, deal_title: deal.title, client_id: deal.client_id || undefined,
          });
        }
      });
      setSelected(new Set());
      setBulkStage("");
      toast.success("Stage aggiornato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAssign = useMutation({
    mutationFn: async (assignTo: string) => {
      const ids = Array.from(selected);
      const { error } = await supabase.from("deals").update({ assigned_to: assignTo }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals"] });
      setSelected(new Set());
      setBulkAssignTo("");
      toast.success("Assegnazione aggiornata");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const openDetail = (deal: any) => {
    setDetailDeal(deal);
    setEditing(false);
  };

  const startEdit = () => {
    setEditForm({
      title: detailDeal.title,
      value: detailDeal.value,
      stage: detailDeal.stage,
      probability: detailDeal.probability,
      expected_close_date: detailDeal.expected_close_date || "",
      notes: detailDeal.notes || "",
    });
    setEditing(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground">Manage sales opportunities and track deal progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/crm/deals/pipeline")} className="gap-1">
            <TrendingUp size={14} /> Pipeline View
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
                <Plus size={16} className="mr-2" /> Nuovo Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">Nuovo Deal</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Titolo *</Label>
                  <Input className="rounded-lg bg-secondary border-border" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Organizzazione</Label>
                    <Select value={form.client_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, client_id: v === "__none__" ? "" : v, lead_id: "", contact_id: "" }))}>
                      <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nessuna</SelectItem>
                        {orgs?.map(o => <SelectItem key={o.id} value={o.id}>{o.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contatto referente</Label>
                    <Select value={form.contact_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))} disabled={!form.client_id}>
                      <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nessuno</SelectItem>
                        {contactOptions?.map(c => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!form.client_id && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Oppure Lead</Label>
                    <Select value={form.lead_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, lead_id: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nessuno</SelectItem>
                        {leads?.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valore (€)</Label>
                    <Input type="number" className="rounded-lg bg-secondary border-border" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Data chiusura prevista</Label>
                    <Input type="date" className="rounded-lg bg-secondary border-border" value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</Label>
                    <Select value={form.stage} onValueChange={onStageChange}>
                      <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Probabilità (%)</Label>
                    <Input type="number" min="0" max="100" className="rounded-lg bg-secondary border-border" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note</Label>
                  <Textarea className="rounded-lg bg-secondary border-border" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button onClick={() => createDeal.mutate()} disabled={!form.title} className="w-full rounded-lg bg-foreground text-background font-heading font-semibold">Crea Deal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search deals..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-40 bg-secondary border-border rounded-lg"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-44 bg-secondary border-border rounded-lg"><SelectValue placeholder="Organizzazione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le org.</SelectItem>
            {orgs?.map(o => <SelectItem key={o.id} value={o.id}>{o.company_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" placeholder="Da" className="w-36 bg-secondary border-border rounded-lg text-xs" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        <Input type="date" placeholder="A" className="w-36 bg-secondary border-border rounded-lg text-xs" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        <Badge variant="outline" className="text-xs">{filtered?.length || 0} deals</Badge>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium">{selected.size} selezionati</span>
          <Select value={bulkStage} onValueChange={v => { setBulkStage(v); bulkUpdateStage.mutate(v); }}>
            <SelectTrigger className="w-40 h-8 text-xs bg-background"><SelectValue placeholder="Cambia stage" /></SelectTrigger>
            <SelectContent>
              {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {salesReps && salesReps.length > 0 && (
            <Select value={bulkAssignTo} onValueChange={v => { setBulkAssignTo(v); bulkAssign.mutate(v); }}>
              <SelectTrigger className="w-44 h-8 text-xs bg-background"><SelectValue placeholder="Assegna a" /></SelectTrigger>
              <SelectContent>
                {salesReps.map(r => <SelectItem key={r.user_id} value={r.user_id}>{r.contact_name || r.email || r.user_id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="destructive" size="sm" className="gap-1 h-8 text-xs" onClick={() => {
            if (confirm(`Eliminare ${selected.size} deal?`)) deleteDeal.mutate(Array.from(selected));
          }}>
            <Trash2 size={12} /> Elimina
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Handshake className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun deal trovato.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={() => {
                    if (selected.size === filtered.length) setSelected(new Set());
                    else setSelected(new Set(filtered.map(d => d.id)));
                  }} />
                </TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Contatto</TableHead>
                <TableHead className="text-right">Valore</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Prob.</TableHead>
                <TableHead>Chiusura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => {
                const org = (d as any).clients;
                const lead = (d as any).leads;
                const contact = (d as any).contact;
                const sc = stageConfig[d.stage] || stageConfig.draft;
                return (
                  <TableRow key={d.id} className="cursor-pointer">
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} />
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)} className="font-heading font-semibold">
                      <span className="flex items-center gap-1.5">
                        {d.title}
                        {(d as any).source === "order" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-primary/30 text-primary">
                            <ShoppingBag size={8} /> Da ordine
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)}>
                      {org ? (
                        <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={e => { e.stopPropagation(); navigate(`/crm/organizations/${org.id}`); }}>
                          <Building2 size={10} /> {org.company_name}
                        </button>
                      ) : lead ? (
                        <span className="text-xs text-muted-foreground">{lead.company_name} (lead)</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)} className="text-xs text-muted-foreground">
                      {contact?.contact_name || "—"}
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)} className="text-right font-mono font-semibold">
                      {fmtCurrency(d.value)}
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)}>
                      <Badge className={`border-0 text-[10px] ${sc.color}`}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)} className="text-right text-xs font-mono">
                      {d.probability}%
                    </TableCell>
                    <TableCell onClick={() => openDetail(d)} className="text-xs text-muted-foreground">
                      {fmtDate(d.expected_close_date)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!detailDeal} onOpenChange={open => { if (!open) setDetailDeal(null); }}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {detailDeal && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-lg">{detailDeal.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                {/* Stage + actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`border-0 ${stageConfig[detailDeal.stage]?.color}`}>
                    {stageConfig[detailDeal.stage]?.label}
                  </Badge>
                  {detailDeal.stage !== "closed_won" && detailDeal.stage !== "closed_lost" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-success border-success/30" onClick={() => markWon(detailDeal.id)}>
                        <CheckCircle2 size={12} /> Won
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive border-destructive/30" onClick={() => { setLostDealId(detailDeal.id); setLostReasonOpen(true); }}>
                        <XCircle size={12} /> Lost
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={startEdit}>
                        <Pencil size={12} /> Edit
                      </Button>
                    </>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Titolo</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.title} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Valore (€)</Label>
                        <Input type="number" className="h-9 text-sm bg-secondary border-border" value={editForm.value} onChange={e => setEditForm((f: any) => ({ ...f, value: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Probabilità</Label>
                        <Input type="number" min="0" max="100" className="h-9 text-sm bg-secondary border-border" value={editForm.probability} onChange={e => setEditForm((f: any) => ({ ...f, probability: parseInt(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Stage</Label>
                        <Select value={editForm.stage} onValueChange={v => setEditForm((f: any) => ({ ...f, stage: v, probability: stageConfig[v]?.prob ?? f.probability }))}>
                          <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Chiusura prevista</Label>
                        <Input type="date" className="h-9 text-sm bg-secondary border-border" value={editForm.expected_close_date} onChange={e => setEditForm((f: any) => ({ ...f, expected_close_date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
                      <Textarea className="text-sm bg-secondary border-border" value={editForm.notes} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateDeal.mutate({ id: detailDeal.id, updates: editForm })} className="bg-foreground text-background">
                        <Save size={14} className="mr-1" /> Salva
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X size={14} className="mr-1" /> Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Valore</p>
                        <p className="text-lg font-heading font-bold">{fmtCurrency(detailDeal.value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Probabilità</p>
                        <p className="text-lg font-heading font-bold">{detailDeal.probability}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Chiusura prevista</p>
                        <p className="text-sm">{fmtDate(detailDeal.expected_close_date)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Weighted Value</p>
                        <p className="text-sm font-mono">{fmtCurrency((detailDeal.value || 0) * (detailDeal.probability || 0) / 100)}</p>
                      </div>
                    </div>
                    {(detailDeal as any).clients && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Organizzazione</p>
                        <button className="text-sm text-primary hover:underline flex items-center gap-1 mt-1" onClick={() => navigate(`/crm/organizations/${(detailDeal as any).clients.id}`)}>
                          <Building2 size={12} /> {(detailDeal as any).clients.company_name}
                        </button>
                      </div>
                    )}
                    {(detailDeal as any).contact && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Contatto referente</p>
                        <p className="text-sm flex items-center gap-1"><User size={12} /> {(detailDeal as any).contact.contact_name}</p>
                      </div>
                    )}
                    {detailDeal.notes && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Note</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailDeal.notes}</p>
                      </div>
                    )}
                    {detailDeal.lost_reason && (
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground text-destructive">Motivo perdita</p>
                        <p className="text-sm text-destructive">{detailDeal.lost_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Activities linked to this deal */}
                {detailActivities && detailActivities.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Attività collegate</p>
                    <div className="space-y-1">
                      {detailActivities.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{a.type || "note"}</Badge>
                            <span className="font-medium">{a.title}</span>
                          </div>
                          <span className="text-muted-foreground">{fmtDate(a.scheduled_at || a.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organization orders */}
                {detailOrders && detailOrders.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-2">Ordini organizzazione</p>
                    <div className="space-y-1">
                      {detailOrders.map(o => (
                        <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                          <span className="font-mono">{o.order_code || o.id.slice(0, 8)}</span>
                          <span>{fmtDate(o.created_at)}</span>
                          <span className="font-mono">{fmtCurrency(o.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Lost reason dialog */}
      <Dialog open={lostReasonOpen} onOpenChange={setLostReasonOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-heading">Motivo perdita</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Perché si è perso il deal?" className="bg-secondary border-border" value={lostReason} onChange={e => setLostReason(e.target.value)} />
            <Button onClick={confirmLost} className="w-full bg-destructive text-destructive-foreground">Segna come Lost</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMDeals;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { checkAndRunAutomations } from "@/hooks/useAutomations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, Mail, MessageCircle, Search, Trash2, ArrowRight, LayoutList, Columns3, UserCheck, RefreshCw, FileText, Trophy, XCircle, UserPlus, CheckCircle, KeyRound } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";
import { differenceInDays } from "date-fns";

import { deleteLeadsCascade } from "@/lib/crmEntityActions";
import { TablePagination } from "@/components/ui/TablePagination";
import BulkActionBar, { runBulkOperation, bulkResultToast } from "@/components/admin/BulkActionBar";
import { toast as sonnerToast } from "sonner";

const LEAD_STAGES = [
  { value: "new", label: "New", color: "border-blue-500 text-blue-500", bg: "bg-blue-500/10", icon: UserPlus, columnColor: "border-t-blue-500" },
  { value: "contacted", label: "Contacted", color: "border-amber-500 text-amber-500", bg: "bg-amber-500/10", icon: Phone, columnColor: "border-t-amber-500" },
  { value: "qualified", label: "Qualified", color: "border-cyan-500 text-cyan-500", bg: "bg-cyan-500/10", icon: CheckCircle, columnColor: "border-t-cyan-500" },
  { value: "proposal", label: "Proposal", color: "border-purple-500 text-purple-500", bg: "bg-purple-500/10", icon: FileText, columnColor: "border-t-purple-500" },
  { value: "onboarding", label: "Onboarding", color: "border-orange-500 text-orange-500", bg: "bg-orange-500/10", icon: KeyRound, columnColor: "border-t-orange-500" },
  { value: "won", label: "Won", color: "border-emerald-500 text-emerald-500", bg: "bg-emerald-500/10", icon: Trophy, columnColor: "border-t-emerald-500" },
  { value: "lost", label: "Lost", color: "border-red-500 text-red-500", bg: "bg-red-500/10", icon: XCircle, columnColor: "border-t-red-500" },
];

const ALL_STATUS_COLORS: Record<string, string> = {
  new: "border-blue-500 text-blue-500",
  contacted: "border-amber-500 text-amber-500",
  qualified: "border-cyan-500 text-cyan-500",
  proposal: "border-purple-500 text-purple-500",
  onboarding: "border-orange-500 text-orange-500",
  won: "border-emerald-500 text-emerald-500",
  lost: "border-red-500 text-red-500",
};

const CRMLeads = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Tables<"leads"> | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [form, setForm] = useState({ company_name: "", contact_name: "", email: "", phone: "", zone: "", source: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk dialogs
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("contacted");
  const [bulkSalesId, setBulkSalesId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterZone]);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Sales users for assignment
  const { data: salesUsers } = useQuery({
    queryKey: ["sales-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "sales");
      if (error) throw error;
      if (!data?.length) return [];
      const ids = data.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, contact_name, email").in("user_id", ids);
      return profiles || [];
    },
  });

  const addLead = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("leads").insert({ ...form, status: "new", assigned_to: user?.id }).select().single();
      if (error) throw error;

      const { data: newClient } = await supabase.from("clients").insert({
        company_name: form.company_name,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        zone: form.zone || null,
        status: "lead",
        discount_class: "D",
      }).select().single();

      if (newClient && form.contact_name) {
        await supabase.from("client_contacts").insert({
          client_id: newClient.id,
          contact_name: form.contact_name,
          email: form.email || null,
          phone: form.phone || null,
          is_primary: true,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast({ title: "Lead + Organization added" });
      setOpen(false);
      setForm({ company_name: "", contact_name: "", email: "", phone: "", zone: "", source: "" });
      checkAndRunAutomations("lead_created", { lead_id: data.id, client_name: data.company_name });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    },
  });

  const convertToOrg = useMutation({
    mutationFn: async (lead: any) => {
      const { data: newClient, error: clientErr } = await supabase.from("clients").insert({
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        zone: lead.zone,
        status: "qualifying",
      }).select().single();
      if (clientErr) throw clientErr;

      if (lead.contact_name) {
        await supabase.from("client_contacts").insert({
          client_id: newClient.id,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          is_primary: true,
        });
      }

      await supabase.from("activities").update({ client_id: newClient.id }).eq("lead_id", lead.id);
      await supabase.from("leads").update({ status: "won" }).eq("id", lead.id);
      return newClient;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast({ title: "Lead convertito in organizzazione", description: newClient.company_name });
    },
    onError: (error) => showErrorToast(error, "CRMLeads.convertToOrg"),
  });

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const zones = [...new Set(leads?.map(l => l.zone).filter(Boolean) || [])].sort();

  const filtered = useMemo(() => leads?.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.company_name?.toLowerCase().includes(s) && !l.contact_name?.toLowerCase().includes(s) && !l.zone?.toLowerCase().includes(s) && !l.email?.toLowerCase().includes(s)) return false;
    }
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterZone !== "all" && l.zone !== filterZone) return false;
    return true;
  }), [leads, search, filterStatus, filterZone]);

  const filteredList = filtered || [];
  const listTotalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const listFrom = (page - 1) * pageSize;
  const pageLeads = filteredList.slice(listFrom, listFrom + pageSize);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === (filtered?.length || 0)) setSelected(new Set());
    else setSelected(new Set(filtered?.map(l => l.id) || []));
  };

  // Bulk: change status
  const handleBulkStatus = async () => {
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      const result = await runBulkOperation(ids, async (id) => {
        const { error } = await supabase.from("leads").update({ status: bulkStatus }).eq("id", id);
        if (error) throw error;
      });
      bulkResultToast(sonnerToast.success, sonnerToast.error, result, "lead");
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    } catch (error) {
      showErrorToast(error, "CRMLeads.bulkStatus");
    } finally {
      setBulkLoading(false);
      setShowStatusDialog(false);
    }
  };

  // Bulk: assign sales
  const handleBulkSales = async () => {
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      const result = await runBulkOperation(ids, async (id) => {
        const { error } = await supabase.from("leads").update({ assigned_to: bulkSalesId || null }).eq("id", id);
        if (error) throw error;
      });
      bulkResultToast(sonnerToast.success, sonnerToast.error, result, "lead");
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    } catch (error) {
      showErrorToast(error, "CRMLeads.bulkSales");
    } finally {
      setBulkLoading(false);
      setShowSalesDialog(false);
    }
  };

  // Bulk: delete
  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await deleteLeadsCascade(Array.from(selected));
      sonnerToast.success(`${selected.size} lead eliminati`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    } catch (error) {
      showErrorToast(error, "CRMLeads.bulkDelete");
    } finally {
      setBulkLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Kanban drag-drop
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const leadId = result.draggableId;
    updateLeadStatus.mutate({ id: leadId, status: newStatus });
  };

  const kanbanLeads = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    LEAD_STAGES.forEach(s => { grouped[s.value] = []; });
    filtered?.forEach(l => {
      const status = l.status || "new";
      if (grouped[status]) grouped[status].push(l);
      else grouped["new"]?.push(l);
    });
    return grouped;
  }, [filtered]);

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Pre-qualification contacts — manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none gap-1 h-8" onClick={() => setViewMode("list")}>
              <LayoutList size={14} /> Lista
            </Button>
            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none gap-1 h-8" onClick={() => setViewMode("kanban")}>
              <Columns3 size={14} /> Kanban
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
                <Plus size={16} className="mr-2" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-heading">New Lead</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company *</Label>
                  <Input className="rounded-lg bg-secondary border-border" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact</Label>
                    <Input className="rounded-lg bg-secondary border-border" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input className="rounded-lg bg-secondary border-border" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                    <Input className="rounded-lg bg-secondary border-border" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+39..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Region</Label>
                    <Input className="rounded-lg bg-secondary border-border" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Source</Label>
                  <Input className="rounded-lg bg-secondary border-border" placeholder="Website, Fair..." value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
                </div>
                <Button onClick={() => addLead.mutate()} disabled={!form.company_name} className="w-full rounded-lg bg-foreground text-background font-heading font-semibold">Add Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search leads..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {LEAD_STAGES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger className="w-40 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {zones.map(z => (
              <SelectItem key={z} value={z!}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{filtered?.length || 0} leads</Badge>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Users className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No leads found.</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageLeads.map(l => (
                <TableRow key={l.id} className="cursor-pointer">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                  </TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="font-heading font-semibold">{l.company_name}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)}>{l.contact_name}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="text-muted-foreground">{l.zone}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="text-muted-foreground">{l.source}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)}>
                    <Badge variant="outline" className={ALL_STATUS_COLORS[l.status || "new"] || ""}>{LEAD_STAGES.find(s => s.value === l.status)?.label || l.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {l.status !== "won" && l.status !== "lost" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => {
                          if (confirm(`Convertire "${l.company_name}" in organizzazione?`)) convertToOrg.mutate(l);
                        }} title="Convert to Organization">
                          <ArrowRight size={14} />
                        </Button>
                      )}
                      {l.phone && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => openWhatsApp(l.phone!, l.contact_name || l.company_name)} title="WhatsApp">
                            <MessageCircle size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => window.open(`tel:${l.phone}`, "_blank")} title="Call">
                            <Phone size={16} />
                          </Button>
                        </>
                      )}
                      {l.email && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => window.open(`mailto:${l.email}?subject=${encodeURIComponent("Easysea — Follow-up")}`, "_blank")} title="Email">
                          <Mail size={16} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => {
                        if (confirm(`Delete lead "${l.company_name}"?`)) deleteLeadsCascade([l.id]).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
                          sonnerToast.success("Lead deleted");
                        }).catch(err => showErrorToast(err, "CRMLeads.deleteSingle"));
                      }} title="Delete">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={page}
            totalPages={listTotalPages}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      ) : (
        /* ────── KANBAN VIEW ────── */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
            {LEAD_STAGES.map(stage => (
              <div key={stage.value} className={`min-w-[260px] w-[260px] flex-shrink-0 rounded-xl border border-border transition-colors ${stage.columnColor}`} style={{ borderTopWidth: "3px" }}>
                <div className="flex items-center justify-between p-3 pb-0 mb-3">
                  <h3 className={`text-xs font-heading font-bold uppercase tracking-wider ${stage.color.split(" ").find(c => c.startsWith("text-")) || "text-muted-foreground"}`}>{stage.label}</h3>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">{kanbanLeads[stage.value]?.length || 0}</Badge>
                </div>
                <Droppable droppableId={stage.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 pt-0 space-y-2 min-h-[calc(60vh-60px)] overflow-y-auto transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : "bg-secondary/30"}`}
                      style={{ maxHeight: "calc(60vh - 60px)" }}
                    >
                      {kanbanLeads[stage.value]?.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setDetailLead(lead)}
                              className={`glass-card-solid p-3 rounded-lg cursor-pointer hover:border-primary/30 transition-all ${snapshot.isDragging ? "shadow-lg border-primary/50" : ""}`}
                            >
                              <p className="font-heading font-semibold text-sm text-foreground truncate">{lead.company_name}</p>
                              {lead.contact_name && <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {lead.zone && <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{lead.zone}</span>}
                                {lead.source && <span className="text-[10px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">{lead.source}</span>}
                                {lead.updated_at && (
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    {differenceInDays(new Date(), new Date(lead.updated_at))}d
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                                {lead.email && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-warning" onClick={() => window.open(`mailto:${lead.email}?subject=${encodeURIComponent("Easysea — Follow-up")}`)}>
                                    <Mail size={12} />
                                  </Button>
                                )}
                                {lead.phone && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => window.open(`tel:${lead.phone}`)}>
                                      <Phone size={12} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-success" onClick={() => openWhatsApp(lead.phone!, lead.contact_name || lead.company_name)}>
                                      <MessageCircle size={12} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar count={selected.size} onDeselect={() => setSelected(new Set())}>
        <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={() => setShowSalesDialog(true)}>
          <UserCheck size={14} /> Assign to Sales
        </Button>
        <Button size="sm" variant="secondary" className="gap-1 h-8" onClick={() => setShowStatusDialog(true)}>
          <RefreshCw size={14} /> Change Status
        </Button>
        <Button size="sm" variant="destructive" className="gap-1 h-8" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 size={14} /> Delete
        </Button>
      </BulkActionBar>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Status ({selected.size} leads)</DialogTitle></DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkStatus} disabled={bulkLoading}>{bulkLoading ? "Updating..." : "Apply"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Sales Dialog */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign to Sales ({selected.size} leads)</DialogTitle></DialogHeader>
          <Select value={bulkSalesId} onValueChange={setBulkSalesId}>
            <SelectTrigger><SelectValue placeholder="Select sales rep..." /></SelectTrigger>
            <SelectContent>
              {salesUsers?.map(s => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.contact_name || s.email || s.user_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalesDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkSales} disabled={bulkLoading || !bulkSalesId}>{bulkLoading ? "Updating..." : "Apply"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
          <p className="text-sm text-destructive">⚠️ This will delete {selected.size} leads and all associated activities.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Deleting..." : `Delete ${selected.size} leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailPanel
        lead={detailLead}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
      />
    </div>
  );
};

export default CRMLeads;

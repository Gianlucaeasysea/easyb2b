import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, Mail, MessageCircle, Search, Trash2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";

const statusColors: Record<string, string> = {
  new: "border-primary text-primary",
  contacted: "border-warning text-warning",
  qualified: "border-success text-success",
  proposal: "border-chart-4 text-chart-4",
  won: "bg-success/20 text-success border-0",
  lost: "bg-destructive/20 text-destructive border-0",
};

const CRMLeads = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ company_name: "", contact_name: "", email: "", phone: "", zone: "", source: "" });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({ ...form, assigned_to: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead added" });
      setOpen(false);
      setForm({ company_name: "", contact_name: "", email: "", phone: "", zone: "", source: "" });
    },
  });

  // Convert lead to organization (client)
  const convertToOrg = useMutation({
    mutationFn: async (lead: any) => {
      // Create client from lead data
      const { data: newClient, error: clientErr } = await supabase.from("clients").insert({
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        zone: lead.zone,
        status: "qualifying",
      }).select().single();
      if (clientErr) throw clientErr;

      // Create primary contact if there's a contact name
      if (lead.contact_name) {
        await supabase.from("client_contacts").insert({
          client_id: newClient.id,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          is_primary: true,
        });
      }

      // Move activities from lead to client
      await supabase.from("activities").update({ client_id: newClient.id }).eq("lead_id", lead.id);

      // Update lead status
      await supabase.from("leads").update({ status: "won" }).eq("id", lead.id);

      return newClient;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead convertito in organizzazione", description: newClient.company_name });
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const deleteLeads = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await supabase.from("activities").delete().eq("lead_id", id);
      }
      const { error } = await supabase.from("leads").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setSelected(new Set());
      toast({ title: `${selected.size} lead eliminati` });
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const zones = [...new Set(leads?.map(l => l.zone).filter(Boolean) || [])].sort();

  const filtered = leads?.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.company_name?.toLowerCase().includes(s) && !l.contact_name?.toLowerCase().includes(s) && !l.zone?.toLowerCase().includes(s)) return false;
    }
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterZone !== "all" && l.zone !== filterZone) return false;
    return true;
  });

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Pre-qualification contacts — convert to Organizations when qualified</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => {
              if (confirm(`Eliminare ${selected.size} lead selezionati?`)) deleteLeads.mutate(Array.from(selected));
            }}>
              <Trash2 size={14} /> Elimina ({selected.size})
            </Button>
          )}
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
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["new", "contacted", "qualified", "proposal", "won", "lost"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
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
      ) : (
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
              {filtered.map(l => (
                <TableRow key={l.id} className="cursor-pointer">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                  </TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="font-heading font-semibold">{l.company_name}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)}>{l.contact_name}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="text-muted-foreground">{l.zone}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)} className="text-muted-foreground">{l.source}</TableCell>
                  <TableCell onClick={() => setDetailLead(l)}>
                    <Badge variant="outline" className={statusColors[l.status || "new"]}>{l.status}</Badge>
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
                        if (confirm(`Eliminare il lead "${l.company_name}"?`)) deleteLeads.mutate([l.id]);
                      }} title="Delete">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <LeadDetailPanel
        lead={detailLead}
        open={!!detailLead}
        onClose={() => setDetailLead(null)}
      />
    </div>
  );
};

export default CRMLeads;

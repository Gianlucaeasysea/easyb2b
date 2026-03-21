import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Phone, Mail, MessageCircle, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, string> = {
  new: "border-primary text-primary",
  contacted: "border-warning text-warning",
  qualified: "border-success text-success",
  proposal: "border-primary text-primary",
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Status updated" });
    },
  });

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const openEmail = (email: string, name: string) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent("Easysea — Follow-up")}&body=${encodeURIComponent(`Hi ${name},\n\nThank you for your interest in Easysea products.\n\nBest regards,\nEasysea Sales Team`)}`, "_blank");
  };

  const filtered = leads?.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.company_name?.toLowerCase().includes(s) || l.contact_name?.toLowerCase().includes(s) || l.zone?.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage and qualify potential dealers</p>
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

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search leads..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Users className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No leads yet. Add your first lead to get started.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetailLead(l)}>
                  <TableCell className="font-heading font-semibold">{l.company_name}</TableCell>
                  <TableCell>{l.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.zone}</TableCell>
                  <TableCell className="text-muted-foreground">{l.source}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[l.status || "new"]}>{l.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => openEmail(l.email!, l.contact_name || l.company_name)} title="Email">
                          <Mail size={16} />
                        </Button>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground ml-1" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          {detailLead && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{detailLead.company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground text-xs uppercase">Contact</span><p className="font-medium">{detailLead.contact_name || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Region</span><p className="font-medium">{detailLead.zone || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Email</span><p className="font-medium">{detailLead.email || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Phone</span><p className="font-medium">{detailLead.phone || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Source</span><p className="font-medium">{detailLead.source || "—"}</p></div>
                </div>
                {detailLead.notes && (
                  <div><span className="text-muted-foreground text-xs uppercase">Notes</span><p className="text-sm mt-1">{detailLead.notes}</p></div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Change Status</Label>
                  <Select value={detailLead.status || "new"} onValueChange={v => { updateStatus.mutate({ id: detailLead.id, status: v }); setDetailLead({ ...detailLead, status: v }); }}>
                    <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new", "contacted", "qualified", "proposal", "won", "lost"].map(s => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  {detailLead.phone && (
                    <>
                      <Button variant="outline" className="flex-1 rounded-lg" onClick={() => openWhatsApp(detailLead.phone, detailLead.contact_name || detailLead.company_name)}>
                        <MessageCircle size={16} className="mr-2" /> WhatsApp
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-lg" onClick={() => window.open(`tel:${detailLead.phone}`, "_blank")}>
                        <Phone size={16} className="mr-2" /> Call
                      </Button>
                    </>
                  )}
                  {detailLead.email && (
                    <Button variant="outline" className="flex-1 rounded-lg" onClick={() => openEmail(detailLead.email, detailLead.contact_name || detailLead.company_name)}>
                      <Mail size={16} className="mr-2" /> Email
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMLeads;

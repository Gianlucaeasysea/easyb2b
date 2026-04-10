import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkAndRunAutomations } from "@/hooks/useAutomations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format, isValid } from "date-fns";

const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : "—";
};
import {
  Phone, Mail, MessageCircle, StickyNote, Video,
  Plus, Check, Clock, User, Building, MapPin, Globe,
  Edit2, Save, X, Trash2,
} from "lucide-react";

const stages = ["new", "contacted", "qualified", "proposal", "onboarding", "won", "lost"];
const stageLabels: Record<string, string> = {
  new: "Nuovo",
  contacted: "Contattato",
  qualified: "Qualificato",
  proposal: "Proposta",
  onboarding: "Onboarding",
  won: "Vinto",
  lost: "Perso",
};
const statusColors: Record<string, string> = {
  new: "border-blue-500 text-blue-500",
  contacted: "border-amber-500 text-amber-500",
  qualified: "border-cyan-500 text-cyan-500",
  proposal: "border-purple-500 text-purple-500",
  onboarding: "border-orange-500 text-orange-500",
  won: "border-emerald-500 text-emerald-500",
  lost: "border-red-500 text-red-500",
};
const stageBarColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-amber-500",
  qualified: "bg-cyan-500",
  proposal: "bg-purple-500",
  onboarding: "bg-orange-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

const actTypeIcons: Record<string, any> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Video, note: StickyNote,
};

interface Props {
  lead: any;
  open: boolean;
  onClose: () => void;
}

const LeadDetailPanel = ({ lead, open, onClose }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [newNote, setNewNote] = useState("");
  const [newActType, setNewActType] = useState("note");
  const [newActTitle, setNewActTitle] = useState("");
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Reset local status when lead changes
  const currentStatus = localStatus ?? lead?.status ?? "new";

  // Fetch activities for this lead
  const { data: activities } = useQuery({
    queryKey: ["lead-activities", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!lead?.id,
  });

  const updateLead = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead updated" });
      setEditing(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
      if (error) throw error;
      return status;
    },
    onMutate: (newStatus) => {
      setLocalStatus(newStatus);
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Status updated" });
      checkAndRunAutomations("lead_stage_changed", {
        lead_id: lead.id,
        from_stage: lead.status,
        to_stage: newStatus,
        client_name: lead.company_name,
      });
    },
    onError: () => {
      setLocalStatus(null);
    },
  });

  const addActivity = useMutation({
    mutationFn: async ({ title, type, body }: { title: string; type: string; body?: string }) => {
      const { error } = await supabase.from("activities").insert({
        title,
        type,
        body,
        lead_id: lead.id,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead?.id] });
      toast({ title: "Activity added" });
      setNewNote("");
      setNewActTitle("");
    },
  });

  const addNote = () => {
    if (!newNote.trim()) return;
    // Append to lead notes + create activity
    const currentNotes = lead?.notes || "";
    const timestamp = safeFormat(new Date().toISOString(), "dd/MM/yyyy HH:mm");
    const updatedNotes = `[${timestamp}] ${newNote}\n${currentNotes}`;
    
    updateLead.mutate({ notes: updatedNotes });
    addActivity.mutate({ title: `Note: ${newNote.substring(0, 50)}`, type: "note", body: newNote });
  };

  const addActivityEntry = () => {
    if (!newActTitle.trim()) return;
    addActivity.mutate({ title: newActTitle, type: newActType });
  };

  const startEdit = () => {
    setEditForm({
      company_name: lead?.company_name || "",
      contact_name: lead?.contact_name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      zone: lead?.zone || "",
      source: lead?.source || "",
    });
    setEditing(true);
  };

  const openWhatsApp = () => {
    if (!lead?.phone) return;
    const clean = lead.phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${lead.contact_name || lead.company_name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const openEmail = () => {
    if (!lead?.email) return;
    window.open(`mailto:${lead.email}?subject=${encodeURIComponent("Easysea — Follow-up")}&body=${encodeURIComponent(`Hi ${lead.contact_name || lead.company_name},\n\nThank you for your interest.\n\nBest regards,\nEasysea Sales Team`)}`, "_blank");
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{lead.company_name}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={statusColors[currentStatus]}>
                  {stageLabels[currentStatus] || currentStatus}
                </Badge>
                {lead.source && (
                  <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  Created {safeFormat(lead.created_at, "dd MMM yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={startEdit} className="h-8 w-8">
                <Edit2 size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                if (confirm(`Eliminare il lead "${lead.company_name}"?`)) {
                  supabase.from("activities").delete().eq("lead_id", lead.id).then(() => {
                    supabase.from("leads").delete().eq("id", lead.id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
                      toast({ title: "Lead eliminato" });
                      onClose();
                    });
                  });
                }
              }}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4">
            {lead.phone && (
              <>
                <Button variant="outline" size="sm" className="text-xs" onClick={openWhatsApp}>
                  <MessageCircle size={14} className="mr-1" /> WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(`tel:${lead.phone}`)}>
                  <Phone size={14} className="mr-1" /> Call
                </Button>
              </>
            )}
            {lead.email && (
              <Button variant="outline" size="sm" className="text-xs" onClick={openEmail}>
                <Mail size={14} className="mr-1" /> Email
              </Button>
            )}
          </div>

          {/* Status pipeline stepper */}
          <div className="flex items-center gap-1 mt-4">
            {stages.map((s, i) => (
              <button
                key={s}
                onClick={() => updateStatus.mutate(s)}
                className={`flex-1 h-2 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                  stages.indexOf(currentStatus) >= i
                    ? stageBarColors[s] || "bg-primary"
                    : "bg-muted"
                }`}
                title={stageLabels[s] || s}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {stages.map(s => (
              <span key={s} className="text-[9px] text-muted-foreground flex-1 text-center">
                {stageLabels[s] || s}
              </span>
            ))}
          </div>
        </div>

        {/* Body tabs */}
        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-6">
            <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[350px]">
            {/* INFO TAB */}
            <TabsContent value="info" className="p-6 space-y-4 mt-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Company</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.company_name} onChange={e => setEditForm((f: any) => ({ ...f, company_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Contact</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.contact_name} onChange={e => setEditForm((f: any) => ({ ...f, contact_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.email} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Phone</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.phone} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Region</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.zone} onChange={e => setEditForm((f: any) => ({ ...f, zone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Source</Label>
                      <Input className="h-9 text-sm bg-secondary border-border" value={editForm.source} onChange={e => setEditForm((f: any) => ({ ...f, source: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateLead.mutate(editForm)} className="bg-foreground text-background">
                      <Save size={14} className="mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      <X size={14} className="mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={<Building size={14} />} label="Company" value={lead.company_name} />
                  <InfoRow icon={<User size={14} />} label="Contact" value={lead.contact_name} />
                  <InfoRow icon={<Mail size={14} />} label="Email" value={lead.email} />
                  <InfoRow icon={<Phone size={14} />} label="Phone" value={lead.phone} />
                  <InfoRow icon={<MapPin size={14} />} label="Region" value={lead.zone} />
                  <InfoRow icon={<Globe size={14} />} label="Source" value={lead.source} />
                </div>
              )}

              {/* Change status */}
              <div className="pt-2 border-t border-border">
                <Label className="text-[10px] uppercase text-muted-foreground">Change Status</Label>
                <Select value={currentStatus} onValueChange={v => updateStatus.mutate(v)}>
                  <SelectTrigger className="mt-1 bg-secondary border-border h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s} value={s}>{stageLabels[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* TIMELINE TAB */}
            <TabsContent value="timeline" className="p-6 mt-0">
              {/* Add activity */}
              <div className="flex gap-2 mb-4">
                <Select value={newActType} onValueChange={setNewActType}>
                  <SelectTrigger className="w-28 h-9 text-xs bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="email">✉️ Email</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="meeting">🎥 Meeting</SelectItem>
                    <SelectItem value="note">📝 Note</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Activity description..."
                  className="h-9 text-sm bg-secondary border-border flex-1"
                  value={newActTitle}
                  onChange={e => setNewActTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addActivityEntry()}
                />
                <Button size="sm" className="h-9 bg-foreground text-background" onClick={addActivityEntry} disabled={!newActTitle.trim()}>
                  <Plus size={14} />
                </Button>
              </div>

              {/* Timeline */}
              {!activities?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
              ) : (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {activities.map((act) => {
                    const Icon = actTypeIcons[act.type || "note"] || StickyNote;
                    return (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                          <Icon size={8} className="text-primary" />
                        </div>
                        <div className="glass-card-solid p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-heading font-semibold">{act.title}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {safeFormat(act.created_at, "dd MMM yyyy HH:mm")}
                            </span>
                          </div>
                          {act.body && <p className="text-xs text-muted-foreground mt-1">{act.body}</p>}
                          <Badge variant="outline" className="text-[9px] mt-2">{act.type}</Badge>
                          {act.completed_at && (
                            <Badge className="text-[9px] ml-1 bg-success/20 text-success border-0">
                              <Check size={8} className="mr-0.5" /> Done
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="p-6 mt-0">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    className="text-sm bg-secondary border-border min-h-[60px]"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()} className="bg-foreground text-background">
                  <Plus size={14} className="mr-1" /> Add Note
                </Button>

                {lead.notes ? (
                  <div className="mt-4 space-y-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">History</Label>
                    <div className="glass-card-solid p-4 text-sm whitespace-pre-wrap text-muted-foreground font-mono text-xs leading-relaxed">
                      {lead.notes}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  </div>
);

export default LeadDetailPanel;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Phone, Mail, MessageCircle, Video, StickyNote, Check, Calendar } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday, isFuture } from "date-fns";

const typeIcons: Record<string, any> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Video, note: StickyNote,
};
const typeColors: Record<string, string> = {
  call: "border-primary text-primary", email: "border-warning text-warning",
  whatsapp: "border-success text-success", meeting: "border-accent text-accent-foreground",
  note: "border-muted-foreground text-muted-foreground",
};

const CRMActivities = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({ title: "", type: "call", body: "", scheduled_at: "" });

  const { data: activities, isLoading } = useQuery({
    queryKey: ["crm-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, leads(company_name, contact_name, phone, email)")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        ...form,
        scheduled_at: form.scheduled_at || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-activities"] });
      toast({ title: "Activity created" });
      setOpen(false);
      setForm({ title: "", type: "call", body: "", scheduled_at: "" });
    },
  });

  const completeActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-activities"] }),
  });

  const filtered = activities?.filter(a => {
    if (filter === "all") return true;
    if (filter === "pending") return !a.completed_at;
    if (filter === "completed") return !!a.completed_at;
    if (filter === "overdue") return !a.completed_at && a.scheduled_at && isPast(new Date(a.scheduled_at));
    if (filter === "today") return a.scheduled_at && isToday(new Date(a.scheduled_at));
    return a.type === filter;
  });

  const quickAction = (activity: any) => {
    const lead = activity.leads;
    if (!lead) return;
    if (activity.type === "whatsapp" && lead.phone) {
      const clean = lead.phone.replace(/[^+\d]/g, "");
      window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${lead.contact_name || ""}, this is the Easysea sales team.`)}`, "_blank");
    } else if (activity.type === "email" && lead.email) {
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent("Easysea — Follow-up")}&body=${encodeURIComponent(`Hi ${lead.contact_name || ""},\n\n${activity.body || ""}\n\nBest regards,\nEasysea Sales Team`)}`, "_blank");
    } else if (activity.type === "call" && lead.phone) {
      window.open(`tel:${lead.phone}`, "_blank");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Activities</h1>
          <p className="text-sm text-muted-foreground">Track calls, emails, meetings, WhatsApp messages</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold">
              <Plus size={16} className="mr-2" /> New Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-heading">New Activity</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title *</Label>
                <Input className="rounded-lg bg-secondary border-border" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="rounded-lg bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Call</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      <SelectItem value="meeting">📹 Meeting</SelectItem>
                      <SelectItem value="note">📝 Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scheduled</Label>
                  <Input type="datetime-local" className="rounded-lg bg-secondary border-border" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Textarea className="rounded-lg bg-secondary border-border" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <Button onClick={() => addActivity.mutate()} disabled={!form.title} className="w-full rounded-lg bg-foreground text-background font-heading font-semibold">Create Activity</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "all", label: "All" }, { key: "pending", label: "Pending" },
          { key: "today", label: "Today" }, { key: "overdue", label: "Overdue" },
          { key: "completed", label: "Done" }, { key: "call", label: "📞 Calls" },
          { key: "email", label: "📧 Email" }, { key: "whatsapp", label: "💬 WhatsApp" },
          { key: "meeting", label: "📹 Meeting" },
        ].map(f => (
          <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" className="rounded-full text-xs" onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Activity className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No activities found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const Icon = typeIcons[a.type || "note"] || StickyNote;
            const isOverdue = !a.completed_at && a.scheduled_at && isPast(new Date(a.scheduled_at));
            const lead = a.leads as any;
            return (
              <div key={a.id} className={`glass-card-solid p-4 flex items-center gap-4 ${a.completed_at ? "opacity-60" : ""} ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${typeColors[a.type || "note"]}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-heading font-semibold text-sm ${a.completed_at ? "line-through text-muted-foreground" : "text-foreground"}`}>{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead && <span className="text-xs text-primary">{lead.company_name}</span>}
                    {a.scheduled_at && (
                      <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Calendar size={10} /> {format(new Date(a.scheduled_at), "MMM d, HH:mm")}
                      </span>
                    )}
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground mt-1 truncate">{a.body}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {!a.completed_at && (a.type === "whatsapp" || a.type === "call" || a.type === "email") && lead && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => quickAction(a)} title={`Open ${a.type}`}>
                      <Icon size={14} />
                    </Button>
                  )}
                  {!a.completed_at && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => completeActivity.mutate(a.id)} title="Mark done">
                      <Check size={14} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CRMActivities;

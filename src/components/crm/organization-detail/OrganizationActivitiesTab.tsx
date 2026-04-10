import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus } from "lucide-react";
import { useState } from "react";
import { fmtDate } from "./constants";

interface OrganizationActivitiesTabProps {
  activities: any[];
  contacts: any[];
  onAddActivity: (form: { title: string; type: string; body: string; contact_id: string }) => Promise<void>;
}

export function OrganizationActivitiesTab({ activities, contacts, onAddActivity }: OrganizationActivitiesTabProps) {
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [actForm, setActForm] = useState({ title: "", type: "call", body: "", contact_id: "" });

  const handleAdd = async () => {
    if (!actForm.title.trim()) return;
    try {
      await onAddActivity(actForm);
      setAddActivityOpen(false);
      setActForm({ title: "", type: "call", body: "", contact_id: "" });
    } catch { /* handled in hook */ }
  };

  return (
    <>
      <div className="glass-card-solid p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Clock size={16} /> Activities</h3>
          <Button size="sm" onClick={() => setAddActivityOpen(true)} className="gap-1"><Plus size={14} /> New Activity</Button>
        </div>
        {!activities?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activities recorded</p>
        ) : (
          <div className="relative border-l-2 border-border ml-3 space-y-3">
            {activities.map((a: any) => (
              <div key={a.id} className="ml-6 relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(a.created_at)}</span>
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {a.type && <Badge variant="outline" className="text-[10px]">{a.type}</Badge>}
                    {a.client_contacts?.contact_name && <Badge className="text-[10px] bg-chart-4/20 text-chart-4 border-0">{a.client_contacts.contact_name}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-heading">New Activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Title *</Label>
              <Input className="h-9 text-sm bg-secondary border-border" value={actForm.title} onChange={e => setActForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                <Select value={actForm.type} onValueChange={v => setActForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Call</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="meeting">📹 Meeting</SelectItem>
                    <SelectItem value="note">📝 Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Contact</Label>
                <Select value={actForm.contact_id || "__none__"} onValueChange={v => setActForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contacts?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
              <Textarea className="text-sm bg-secondary border-border min-h-[60px]" value={actForm.body} onChange={e => setActForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <Button onClick={handleAdd} disabled={!actForm.title.trim()} className="w-full">Aggiungi Attività</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

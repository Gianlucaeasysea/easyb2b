import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Star, Crown, Pencil, Trash2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { contactTypeColors, contactTypeLabels } from "./constants";

const emptyContactForm = {
  contact_name: "", email: "", phone: "", role: "", notes: "",
  job_title: "", department: "", contact_type: "general",
  preferred_channel: "email", linkedin_url: "", is_primary: false, is_decision_maker: false,
};

interface OrganizationContactsTabProps {
  contacts: any[];
  onSaveContact: (form: Record<string, any>, editId: string | null) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
}

export function OrganizationContactsTab({ contacts, onSaveContact, onDeleteContact }: OrganizationContactsTabProps) {
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ ...emptyContactForm });

  const resetAndClose = () => {
    setAddContactOpen(false);
    setEditContactId(null);
    setContactForm({ ...emptyContactForm });
  };

  const handleSave = async () => {
    if (!contactForm.contact_name.trim()) return;
    try {
      await onSaveContact(contactForm, editContactId);
      resetAndClose();
    } catch { /* error handled in hook */ }
  };

  const editContact = (c: any) => {
    setContactForm({
      contact_name: c.contact_name || "", email: c.email || "", phone: c.phone || "",
      role: c.role || "", notes: c.notes || "", job_title: c.job_title || "",
      department: c.department || "", contact_type: c.contact_type || "general",
      preferred_channel: c.preferred_channel || "email", linkedin_url: c.linkedin_url || "",
      is_primary: c.is_primary || false, is_decision_maker: c.is_decision_maker || false,
    });
    setEditContactId(c.id);
    setAddContactOpen(true);
  };

  return (
    <>
      <div className="glass-card-solid p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><Users size={16} /> Organization Contacts</h3>
          <Button size="sm" onClick={() => { setContactForm({ ...emptyContactForm }); setEditContactId(null); setAddContactOpen(true); }} className="gap-1">
            <Plus size={14} /> Add Contact
          </Button>
        </div>
        {!contacts?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No contacts registered. Add the first contact.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((c: any) => (
              <div key={c.id} className="p-4 bg-secondary/50 rounded-lg border border-border group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-heading font-semibold text-foreground">{c.contact_name}</p>
                      {c.is_primary && <span title="Primary"><Star size={12} className="text-warning" /></span>}
                      {c.is_decision_maker && <span title="Decision Maker"><Crown size={12} className="text-destructive" /></span>}
                    </div>
                    <Badge className={`border-0 text-[10px] ${contactTypeColors[c.contact_type || "general"]}`}>
                      {contactTypeLabels[c.contact_type || "general"]}
                    </Badge>
                    {c.job_title && <p className="text-xs text-muted-foreground mt-1">{c.job_title}{c.department ? ` · ${c.department}` : ""}</p>}
                    {c.email && <p className="text-xs text-muted-foreground mt-0.5"><Mail size={10} className="inline mr-1" />{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground mt-0.5"><Phone size={10} className="inline mr-1" />{c.phone}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">Channel: {c.preferred_channel || "email"}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => editContact(c)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("Delete this contact?")) onDeleteContact(c.id); }}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editContactId ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Name *</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.contact_name} onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Contact Type</Label>
                <Select value={contactForm.contact_type} onValueChange={v => setContactForm(f => ({ ...f, contact_type: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Phone</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Job Title</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.job_title} onChange={e => setContactForm(f => ({ ...f, job_title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Department</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.department} onChange={e => setContactForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Preferred Channel</Label>
                <Select value={contactForm.preferred_channel} onValueChange={v => setContactForm(f => ({ ...f, preferred_channel: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">LinkedIn URL</Label>
                <Input className="h-9 text-sm bg-secondary border-border" value={contactForm.linkedin_url} onChange={e => setContactForm(f => ({ ...f, linkedin_url: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={contactForm.is_primary} onCheckedChange={v => setContactForm(f => ({ ...f, is_primary: !!v }))} />
                <Star size={12} className="text-warning" /> Primary Contact
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={contactForm.is_decision_maker} onCheckedChange={v => setContactForm(f => ({ ...f, is_decision_maker: !!v }))} />
                <Crown size={12} className="text-destructive" /> Decision Maker
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Note</Label>
              <Textarea className="text-sm bg-secondary border-border min-h-[60px]" value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSave} className="w-full">{editContactId ? "Update Contact" : "Add Contact"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

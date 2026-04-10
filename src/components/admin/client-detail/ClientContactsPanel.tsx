import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, UserPlus, X } from "lucide-react";

interface Props {
  form: any;
  contacts: any[] | undefined;
  newContact: { contact_name: string; email: string; phone: string; role: string };
  setNewContact: (fn: (c: any) => any) => void;
  showAddContact: boolean;
  setShowAddContact: (v: boolean) => void;
  addContact: { mutate: () => void; isPending: boolean };
  removeContact: { mutate: (id: string) => void };
}

export const ClientContactsPanel = ({ form, contacts, newContact, setNewContact, showAddContact, setShowAddContact, addContact, removeContact }: Props) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-heading font-bold text-foreground flex items-center gap-2"><Phone size={16} /> Contacts</h2>
      <Button size="sm" variant="outline" onClick={() => setShowAddContact(true)} className="gap-1 text-xs"><UserPlus size={12} /> Add</Button>
    </div>
    {form.contact_name && (
      <div className="p-3 bg-secondary/50 rounded-lg mb-3 text-sm space-y-1">
        <p className="font-semibold text-foreground">{form.contact_name} <span className="text-muted-foreground font-normal text-xs">· Main</span></p>
        {form.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {form.email}</p>}
        {form.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {form.phone}</p>}
      </div>
    )}
    {contacts?.map(c => (
      <div key={c.id} className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{c.contact_name} {c.role && <span className="text-muted-foreground font-normal text-xs">· {c.role}</span>}</p>
            {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} /> {c.email}</p>}
            {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeContact.mutate(c.id)} className="text-destructive h-6 w-6 p-0"><X size={12} /></Button>
        </div>
      </div>
    ))}
    {showAddContact && (
      <div className="p-3 border border-border rounded-lg space-y-2 mt-3">
        <Input placeholder="Name *" value={newContact.contact_name} onChange={e => setNewContact(c => ({ ...c, contact_name: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <Input placeholder="Role" value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} className="bg-secondary border-border rounded-lg h-8 text-sm" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => addContact.mutate()} disabled={addContact.isPending} className="bg-foreground text-background text-xs flex-1">Save</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)} className="text-xs">Cancel</Button>
        </div>
      </div>
    )}
    {!contacts?.length && !form.contact_name && !showAddContact && (
      <p className="text-xs text-muted-foreground">No contacts added yet</p>
    )}
  </div>
);

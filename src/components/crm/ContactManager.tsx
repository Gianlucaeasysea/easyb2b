import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ContactManagerProps {
  clientId: string;
  clientMainEmail?: string | null;
  clientMainPhone?: string | null;
  clientMainContactName?: string | null;
}

interface ContactForm {
  contact_name: string;
  email: string;
  phone: string;
  role: string;
}

const emptyForm: ContactForm = { contact_name: "", email: "", phone: "", role: "" };

export const ContactManager = ({ clientId, clientMainEmail, clientMainPhone, clientMainContactName }: ContactManagerProps) => {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);

  const { data: contacts, refetch } = useQuery({
    queryKey: ["crm-client-contacts", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      return data || [];
    },
  });

  const invalidateAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["crm-client", clientId] });
    queryClient.invalidateQueries({ queryKey: ["client-communications", clientId] });
  };

  const handleAdd = async () => {
    if (!form.contact_name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }
    const { error } = await supabase.from("client_contacts").insert({
      client_id: clientId,
      contact_name: form.contact_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role.trim() || null,
    });
    if (error) {
      toast.error("Errore nel salvataggio");
      return;
    }

    // If this is the first contact and client has no main email, update client record
    if (form.email.trim()) {
      const { data: client } = await supabase.from("clients").select("email, contact_name").eq("id", clientId).single();
      if (client && !client.email) {
        await supabase.from("clients").update({
          email: form.email.trim(),
          contact_name: form.contact_name.trim(),
        }).eq("id", clientId);
      }
    }

    toast.success("Contatto aggiunto");
    setForm(emptyForm);
    setAdding(false);
    invalidateAll();
  };

  const handleEdit = async (contactId: string) => {
    const { error } = await supabase.from("client_contacts").update({
      contact_name: form.contact_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role.trim() || null,
    }).eq("id", contactId);
    if (error) {
      toast.error("Errore nell'aggiornamento");
      return;
    }
    toast.success("Contatto aggiornato");
    setEditingId(null);
    setForm(emptyForm);
    invalidateAll();
  };

  const handleDelete = async (contactId: string) => {
    const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
    if (error) {
      toast.error("Errore nella cancellazione");
      return;
    }
    toast.success("Contatto rimosso");
    invalidateAll();
  };

  const startEdit = (contact: any) => {
    setEditingId(contact.id);
    setAdding(false);
    setForm({
      contact_name: contact.contact_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  };

  const renderForm = (onSave: () => void) => (
    <div className="space-y-2 p-3 bg-secondary/50 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Nome *"
          value={form.contact_name}
          onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
          className="text-xs h-8"
        />
        <Input
          placeholder="Ruolo"
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="text-xs h-8"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="text-xs h-8"
        />
        <Input
          placeholder="Telefono"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="text-xs h-8"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs gap-1">
          <X size={12} /> Annulla
        </Button>
        <Button size="sm" onClick={onSave} className="h-7 text-xs gap-1">
          <Check size={12} /> Salva
        </Button>
      </div>
    </div>
  );

  return (
    <div className="glass-card-solid p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2 text-sm">
          <Users size={14} /> Contatti
        </h3>
        {!adding && !editingId && (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setForm(emptyForm); }} className="h-7 text-xs gap-1">
            <Plus size={12} /> Aggiungi
          </Button>
        )}
      </div>

      {/* Main contact (from clients table) */}
      {clientMainContactName && (
        <div className="p-3 bg-secondary/50 rounded-lg mb-2 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">
                {clientMainContactName}
                <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Principale</Badge>
              </p>
              {clientMainEmail && <p className="text-xs text-muted-foreground">{clientMainEmail}</p>}
              {clientMainPhone && <p className="text-xs text-muted-foreground">{clientMainPhone}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Additional contacts */}
      {contacts?.map(c => (
        <div key={c.id} className="mb-2">
          {editingId === c.id ? (
            renderForm(() => handleEdit(c.id))
          ) : (
            <div className="p-3 bg-secondary/50 rounded-lg text-sm group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {c.contact_name}
                    {c.role && <span className="text-muted-foreground text-xs ml-1">· {c.role}</span>}
                  </p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(c)}>
                    <Pencil size={12} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {adding && renderForm(handleAdd)}

      {!contacts?.length && !clientMainContactName && !adding && (
        <p className="text-xs text-muted-foreground">Nessun contatto registrato</p>
      )}
    </div>
  );
};

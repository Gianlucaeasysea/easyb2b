import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Building2, Plus, Trash2, Save, CreditCard, Mail, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DealerProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Client data
  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Contacts
  const { data: contacts } = useQuery({
    queryKey: ["my-contacts", client?.id],
    queryFn: async () => {
      const { data } = await supabase.from("client_contacts").select("*").eq("client_id", client!.id).order("created_at");
      return data || [];
    },
    enabled: !!client,
  });

  // Shipping addresses
  const { data: addresses } = useQuery({
    queryKey: ["my-addresses", client?.id],
    queryFn: async () => {
      const { data } = await supabase.from("client_shipping_addresses" as any).select("*").eq("client_id", client!.id).order("created_at");
      return (data as any[]) || [];
    },
    enabled: !!client,
  });

  // Bank details
  const { data: bankDetails } = useQuery({
    queryKey: ["my-bank", client?.id],
    queryFn: async () => {
      const { data } = await supabase.from("client_bank_details" as any).select("*").eq("client_id", client!.id).maybeSingle();
      return data as any;
    },
    enabled: !!client,
  });

  // Communications
  const { data: communications } = useQuery({
    queryKey: ["my-communications", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_communications")
        .select("*")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client,
  });

  // --- Contacts CRUD ---
  const [newContact, setNewContact] = useState({ contact_name: "", email: "", phone: "", role: "" });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!newContact.contact_name.trim()) throw new Error("Nome obbligatorio");
      const { error } = await supabase.from("client_contacts").insert({ ...newContact, client_id: client!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
      setNewContact({ contact_name: "", email: "", phone: "", role: "" });
      toast.success("Contatto aggiunto");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
      toast.success("Contatto rimosso");
    },
  });

  // --- Addresses CRUD ---
  const [newAddr, setNewAddr] = useState({ label: "", address_line: "", city: "", province: "", postal_code: "", country: "" });

  const addAddress = useMutation({
    mutationFn: async () => {
      if (!newAddr.address_line.trim()) throw new Error("Indirizzo obbligatorio");
      const { error } = await supabase.from("client_shipping_addresses" as any).insert({ ...newAddr, client_id: client!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      setNewAddr({ label: "", address_line: "", city: "", province: "", postal_code: "", country: "" });
      toast.success("Indirizzo aggiunto");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_shipping_addresses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-addresses"] });
      toast.success("Indirizzo rimosso");
    },
  });

  // --- Bank Details ---
  const [bank, setBank] = useState({ bank_name: "", iban: "", swift_bic: "", account_holder: "" });
  const bankLoaded = bankDetails !== undefined;

  const saveBank = useMutation({
    mutationFn: async () => {
      if (bankDetails?.id) {
        const { error } = await supabase.from("client_bank_details" as any).update(bank as any).eq("id", bankDetails.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_bank_details" as any).insert({ ...bank, client_id: client!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bank"] });
      toast.success("Dati bancari salvati");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Sync bank state when data loads
  if (bankLoaded && bankDetails && bank.iban === "" && bankDetails.iban) {
    setBank({ bank_name: bankDetails.bank_name || "", iban: bankDetails.iban || "", swift_bic: bankDetails.swift_bic || "", account_holder: bankDetails.account_holder || "" });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">{client?.company_name || user?.email}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><Building2 size={14} /> Profile</TabsTrigger>
          <TabsTrigger value="communications" className="gap-1.5 text-xs"><Mail size={14} /> Communications ({communications?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* Company Info (read-only) */}
          <div className="glass-card-solid p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-primary" />
              <h2 className="font-heading font-bold text-foreground text-sm">Company Info</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground text-xs">Company</span><p className="text-foreground">{client?.company_name || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">VAT</span><p className="text-foreground">{client?.vat_number || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Email</span><p className="text-foreground">{client?.email || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Phone</span><p className="text-foreground">{client?.phone || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Address</span><p className="text-foreground">{client?.address || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Discount Class</span>
                <Badge variant="outline" className="mt-1">{client?.discount_class || "standard"}</Badge>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="glass-card-solid p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-primary" />
              <h2 className="font-heading font-bold text-foreground text-sm">Contacts</h2>
              <Badge variant="outline" className="text-[10px]">{contacts?.length || 0}</Badge>
            </div>
            {contacts?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{c.contact_name}</span>
                  {c.role && <span className="text-muted-foreground ml-2 text-xs">({c.role})</span>}
                  <p className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteContact.mutate(c.id)} className="text-destructive"><Trash2 size={14} /></Button>
              </div>
            ))}
            <div className="grid sm:grid-cols-4 gap-2 mt-4">
              <Input placeholder="Name *" value={newContact.contact_name} onChange={e => setNewContact(p => ({ ...p, contact_name: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="Email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="Phone" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} className="bg-secondary border-border text-sm" />
              <div className="flex gap-2">
                <Input placeholder="Role" value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} className="bg-secondary border-border text-sm flex-1" />
                <Button size="sm" onClick={() => addContact.mutate()} className="bg-foreground text-background"><Plus size={14} /></Button>
              </div>
            </div>
          </div>

          {/* Shipping Addresses */}
          <div className="glass-card-solid p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-primary" />
              <h2 className="font-heading font-bold text-foreground text-sm">Shipping Addresses</h2>
              <Badge variant="outline" className="text-[10px]">{addresses?.length || 0}</Badge>
            </div>
            {addresses?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{a.label || "Address"}</span>
                  {a.is_default && <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0">Default</Badge>}
                  <p className="text-xs text-muted-foreground">{[a.address_line, a.city, a.province, a.postal_code, a.country].filter(Boolean).join(", ")}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteAddress.mutate(a.id)} className="text-destructive"><Trash2 size={14} /></Button>
              </div>
            ))}
            <div className="grid sm:grid-cols-3 gap-2 mt-4">
              <Input placeholder="Label (e.g. Main)" value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="Address *" value={newAddr.address_line} onChange={e => setNewAddr(p => ({ ...p, address_line: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="City" value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="Province" value={newAddr.province} onChange={e => setNewAddr(p => ({ ...p, province: e.target.value }))} className="bg-secondary border-border text-sm" />
              <Input placeholder="Postal Code" value={newAddr.postal_code} onChange={e => setNewAddr(p => ({ ...p, postal_code: e.target.value }))} className="bg-secondary border-border text-sm" />
              <div className="flex gap-2">
                <Input placeholder="Country" value={newAddr.country} onChange={e => setNewAddr(p => ({ ...p, country: e.target.value }))} className="bg-secondary border-border text-sm flex-1" />
                <Button size="sm" onClick={() => addAddress.mutate()} className="bg-foreground text-background"><Plus size={14} /></Button>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="glass-card-solid p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-primary" />
              <h2 className="font-heading font-bold text-foreground text-sm">Bank Details</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Account Holder</label>
                <Input value={bank.account_holder} onChange={e => setBank(p => ({ ...p, account_holder: e.target.value }))} className="bg-secondary border-border text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bank Name</label>
                <Input value={bank.bank_name} onChange={e => setBank(p => ({ ...p, bank_name: e.target.value }))} className="bg-secondary border-border text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">IBAN</label>
                <Input value={bank.iban} onChange={e => setBank(p => ({ ...p, iban: e.target.value }))} className="bg-secondary border-border text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">SWIFT / BIC</label>
                <Input value={bank.swift_bic} onChange={e => setBank(p => ({ ...p, swift_bic: e.target.value }))} className="bg-secondary border-border text-sm" />
              </div>
            </div>
            <Button onClick={() => saveBank.mutate()} className="mt-4 bg-foreground text-background hover:bg-foreground/90 gap-1.5 font-heading font-semibold">
              <Save size={14} /> Save Bank Details
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="communications">
          <div className="glass-card-solid p-6">
            <div className="flex items-center gap-2 mb-6">
              <Mail size={16} className="text-primary" />
              <h2 className="font-heading font-bold text-foreground text-sm">Communication History</h2>
              <Badge variant="outline" className="text-[10px]">{communications?.length || 0} messages</Badge>
            </div>
            {!communications?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No communications yet.</p>
                <p className="text-xs mt-1">Messages from your account manager will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communications.map((comm: any) => {
                  const isInbound = comm.direction === "inbound";
                  const metadata = comm.metadata as any;
                  const ccList = metadata?.cc || [];
                  return (
                    <div key={comm.id} className={`rounded-lg border p-4 ${isInbound ? "bg-primary/5 border-primary/20" : "bg-secondary/50 border-border"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isInbound ? "bg-primary/10" : "bg-muted"}`}>
                            {isInbound ? <ArrowDownLeft size={14} className="text-primary" /> : <ArrowUpRight size={14} className="text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{comm.subject}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {isInbound ? "From: " : "To: "}{comm.recipient_email}
                              {ccList.length > 0 && <span className="ml-2">CC: {ccList.join(", ")}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${isInbound ? "border-primary/30 text-primary" : ""}`}>
                            {isInbound ? "Received" : "Sent"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {format(new Date(comm.created_at), "dd MMM yyyy, HH:mm")}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-foreground/80 mt-2 pl-9">
                        {comm.body.length > 300 ? (
                          <p className="whitespace-pre-wrap">{comm.body.slice(0, 300)}...</p>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: comm.body.replace(/\n/g, "<br/>") }} />
                        )}
                      </div>
                      {comm.order_id && (
                        <div className="mt-2 pl-9">
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                            Order related
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DealerProfile;

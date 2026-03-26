import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Search, Building2, ChevronRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

const CRMContacts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterHasOrders, setFilterHasOrders] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: clients } = useQuery({
    queryKey: ["crm-contacts-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, email, phone, zone, status, country, business_type")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: contactCounts } = useQuery({
    queryKey: ["crm-contacts-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_contacts").select("client_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(c => { counts[c.client_id] = (counts[c.client_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: orderCounts } = useQuery({
    queryKey: ["crm-contacts-order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("client_id").not("order_type", "in", "(\"B2C\",\"MANUAL B2C\",\"CUSTOM\")");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(o => { counts[o.client_id] = (counts[o.client_id] || 0) + 1; });
      return counts;
    },
  });

  const deleteClients = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { data: orders } = await supabase.from("orders").select("id").eq("client_id", id);
        if (orders?.length) {
          const orderIds = orders.map(o => o.id);
          await supabase.from("order_items").delete().in("order_id", orderIds);
          await supabase.from("order_documents").delete().in("order_id", orderIds);
          await supabase.from("order_events").delete().in("order_id", orderIds);
          await supabase.from("orders").delete().eq("client_id", id);
        }
        await supabase.from("client_contacts").delete().eq("client_id", id);
        await supabase.from("client_communications").delete().eq("client_id", id);
        await supabase.from("client_shipping_addresses").delete().eq("client_id", id);
        await supabase.from("client_documents").delete().eq("client_id", id);
        await supabase.from("client_notifications").delete().eq("client_id", id);
        await supabase.from("client_notification_preferences").delete().eq("client_id", id);
        await supabase.from("activities").delete().eq("client_id", id);
        await supabase.from("price_list_clients").delete().eq("client_id", id);
      }
      const { error } = await supabase.from("clients").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      setSelected(new Set());
      toast.success("Clienti eliminati");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Get unique countries for filter
  const countries = [...new Set(clients?.map(c => c.country).filter(Boolean) || [])].sort();
  const statuses = [...new Set(clients?.map(c => c.status).filter(Boolean) || [])].sort();

  const filtered = clients?.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.company_name?.toLowerCase().includes(s) && !c.contact_name?.toLowerCase().includes(s) && !c.email?.toLowerCase().includes(s)) return false;
    }
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterCountry !== "all" && c.country !== filterCountry) return false;
    if (filterHasOrders === "yes" && !(orderCounts?.[c.id])) return false;
    if (filterHasOrders === "no" && (orderCounts?.[c.id] || 0) > 0) return false;
    return true;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const openWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/[^+\d]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}?text=${encodeURIComponent(`Hi ${name}, this is the Easysea sales team.`)}`, "_blank");
  };

  const openEmail = (email: string, name: string) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent(`Easysea — Follow-up`)}&body=${encodeURIComponent(`Hi ${name},\n\nThank you for your interest in Easysea products.\n\nBest regards,\nEasysea Sales Team`)}`, "_blank");
  };

  const openPhone = (phone: string) => {
    window.open(`tel:${phone}`, "_blank");
  };

  const statusLabel: Record<string, string> = {
    active: "✅ Attivo", inactive: "❌ Non Attivo", onboarding: "🔄 In Attivazione", lead: "📋 Lead", suspended: "⛔ Sospeso",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">All client companies — click to view contacts, orders and details</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" className="gap-1" onClick={() => {
              if (confirm(`Eliminare ${selected.size} clienti selezionati con tutti i dati associati?`)) deleteClients.mutate(Array.from(selected));
            }}>
              <Trash2 size={14} /> Elimina ({selected.size})
            </Button>
          )}
          <Badge variant="outline" className="text-xs">{filtered.length} companies</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search companies..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s!}>{statusLabel[s!] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => (
              <SelectItem key={c} value={c!}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterHasOrders} onValueChange={setFilterHasOrders}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">With Orders</SelectItem>
            <SelectItem value="no">No Orders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Building2 className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No clients found.</p>
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
                <TableHead>Main Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)} className="font-heading font-semibold">{c.company_name}</TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)} className="text-sm">{c.contact_name || "—"}</TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)} className="text-muted-foreground text-xs">{c.email || "—"}</TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)} className="text-muted-foreground text-sm">{c.country || c.zone || "—"}</TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                    <Badge className={`border-0 text-[10px] ${
                      c.status === "active" ? "bg-success/20 text-success" :
                      c.status === "inactive" ? "bg-destructive/20 text-destructive" :
                      c.status === "onboarding" ? "bg-warning/20 text-warning" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {statusLabel[c.status || "lead"] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                    <Badge variant="outline" className="text-[10px]">{(contactCounts?.[c.id] || 0)} contacts</Badge>
                  </TableCell>
                  <TableCell onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                    {(orderCounts?.[c.id] || 0) > 0 ? (
                      <Badge className="bg-success/20 text-success border-0 text-[10px]">{orderCounts?.[c.id]} orders</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {c.phone && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => openWhatsApp(c.phone!, c.contact_name || c.company_name)} title="WhatsApp">
                            <MessageCircle size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openPhone(c.phone!)} title="Call">
                            <Phone size={16} />
                          </Button>
                        </>
                      )}
                      {c.email && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => openEmail(c.email!, c.contact_name || c.company_name)} title="Email">
                          <Mail size={16} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => {
                        if (confirm(`Eliminare "${c.company_name}" con tutti i dati associati?`)) deleteClients.mutate([c.id]);
                      }} title="Delete">
                        <Trash2 size={14} />
                      </Button>
                      <ChevronRight size={16} className="text-muted-foreground ml-1" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CRMContacts;

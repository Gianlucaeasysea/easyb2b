import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Search, Building2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const CRMContacts = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["crm-contacts-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, email, phone, zone, status, country")
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

  const filtered = clients?.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.company_name?.toLowerCase().includes(s) || c.contact_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s);
  }) || [];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">All client companies — click to view contacts, orders and details</p>
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} companies</Badge>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search companies..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
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
                <TableHead>Company</TableHead>
                <TableHead>Main Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                  <TableCell className="font-heading font-semibold">{c.company_name}</TableCell>
                  <TableCell className="text-sm">{c.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.zone || c.country || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{(contactCounts?.[c.id] || 0)} contacts</Badge>
                  </TableCell>
                  <TableCell>
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

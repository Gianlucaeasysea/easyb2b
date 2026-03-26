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
  const [search, setSearch] = useState("");

  const { data: leads } = useQuery({
    queryKey: ["crm-contacts-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, company_name, contact_name, email, phone, zone, status, source").order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["crm-contacts-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, company_name, contact_name, email, phone, zone, status, country").order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const allContacts = [
    ...(leads?.map(l => ({ ...l, type: "lead" as const })) || []),
    ...(clients?.map(c => ({ ...c, type: "client" as const })) || []),
  ].filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.company_name?.toLowerCase().includes(s) || c.contact_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s);
  });

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
          <h1 className="font-heading text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground">All contacts from leads and clients — call, email, or WhatsApp directly</p>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input placeholder="Search contacts..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {!allContacts.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Building2 className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No contacts found.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allContacts.map(c => (
                <TableRow key={`${c.type}-${c.id}`}>
                  <TableCell className="font-heading font-semibold">{c.company_name}</TableCell>
                  <TableCell>{c.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{c.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{c.zone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.type === "client" ? "border-success text-success" : "border-primary text-primary"}>
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Phone, Mail, MessageCircle, Linkedin, Globe, Crown, Star, Download } from "lucide-react";
import { useState } from "react";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { PaginationControls } from "@/components/PaginationControls";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format, isValid } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const contactTypeColors: Record<string, string> = {
  decision_maker: "bg-destructive/20 text-destructive",
  buyer: "bg-primary/20 text-primary",
  operations: "bg-success/20 text-success",
  accounting: "bg-warning/20 text-warning",
  technical: "bg-chart-4/20 text-chart-4",
  general: "bg-muted text-muted-foreground",
};

const contactTypeLabels: Record<string, string> = {
  decision_maker: "Decision Maker",
  buyer: "Buyer",
  operations: "Operations",
  accounting: "Accounting",
  technical: "Technical",
  general: "General",
};

const channelIcons: Record<string, any> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
};

const safeFmt = (d: string | null | undefined, fmt: string) => {
  if (!d) return "—";
  const date = new Date(d);
  return isValid(date) ? format(date, fmt) : "—";
};

const CRMContactsPeople = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const { data: contacts } = useQuery({
    queryKey: ["crm-all-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*, clients(id, company_name)")
        .order("contact_name");
      if (error) throw error;
      return data;
    },
  });

  // Activities for selected contact
  const { data: contactActivities } = useQuery({
    queryKey: ["crm-contact-activities", selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact?.id) return [];
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!selectedContact?.id,
  });

  // Communications for selected contact
  const { data: contactComms } = useQuery({
    queryKey: ["crm-contact-comms", selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact?.id) return [];
      const { data } = await supabase
        .from("client_communications")
        .select("*")
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!selectedContact?.id,
  });

  const organizations = [...new Set(contacts?.map(c => (c as any).clients?.company_name).filter(Boolean) || [])].sort();

  const filtered = contacts?.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !c.contact_name?.toLowerCase().includes(s) &&
        !c.email?.toLowerCase().includes(s) &&
        !(c as any).clients?.company_name?.toLowerCase().includes(s) &&
        !(c as any).job_title?.toLowerCase().includes(s)
      ) return false;
    }
    if (filterOrg !== "all" && (c as any).clients?.company_name !== filterOrg) return false;
    if (filterType !== "all" && (c as any).contact_type !== filterType) return false;
    if (filterChannel !== "all" && (c as any).preferred_channel !== filterChannel) return false;
    return true;
  }) || [];

  const { pageData, page, totalPages, from, to, totalCount, nextPage, prevPage, goToPage } = usePaginatedData({ data: filtered, pageSize: 25 });

  const exportCsv = () => {
    const rows = filtered.map(c => ({
      "Nome": c.contact_name,
      "Organizzazione": (c as any).clients?.company_name || "",
      "Ruolo": contactTypeLabels[(c as any).contact_type || "general"] || "",
      "Job Title": (c as any).job_title || "",
      "Email": c.email || "",
      "Telefono": c.phone || "",
      "Canale Preferito": (c as any).preferred_channel || "",
      "Ultimo Contatto": (c as any).last_contacted_at || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatti");
    XLSX.writeFile(wb, "contatti.csv");
    toast.success("CSV esportato");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Contatti</h1>
          <p className="text-sm text-muted-foreground">Tutte le persone di contatto trasversali alle organizzazioni</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
          <Badge variant="outline" className="text-xs">{filtered.length} contatti</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Cerca contatti..." className="pl-9 rounded-lg bg-secondary border-border" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-44 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Organizzazione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Org.</SelectItem>
            {organizations.map(o => (
              <SelectItem key={o} value={o!}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Ruolo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Ruoli</SelectItem>
            {Object.entries(contactTypeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-36 bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Canale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Canali</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Telefono</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filtered.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Users className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun contatto trovato.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Canale</TableHead>
                <TableHead>Ultimo Contatto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map(c => {
                const ChannelIcon = channelIcons[(c as any).preferred_channel || "email"] || Mail;
                const lastContactedAt = (c as any).last_contacted_at;
                const daysAgo = lastContactedAt ? differenceInDays(new Date(), new Date(lastContactedAt)) : null;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedContact(c)}>
                    <TableCell className="font-heading font-semibold">
                      <div className="flex items-center gap-1.5">
                        {c.contact_name}
                        {(c as any).is_decision_maker && <span title="Decision Maker"><Crown size={12} className="text-destructive" /></span>}
                        {(c as any).is_primary && <span title="Primary"><Star size={12} className="text-warning" /></span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/crm/organizations/${(c as any).clients?.id}`); }}
                      >
                        {(c as any).clients?.company_name || "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-[10px] ${contactTypeColors[(c as any).contact_type || "general"]}`}>
                        {contactTypeLabels[(c as any).contact_type || "general"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(c as any).job_title || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell>
                      <span title={(c as any).preferred_channel || "email"}><ChannelIcon size={14} className="text-muted-foreground" /></span>
                    </TableCell>
                    <TableCell>
                      {lastContactedAt ? (
                        <div className="text-xs">
                          <span className={daysAgo !== null && daysAgo > 30 ? "text-destructive" : "text-muted-foreground"}>
                            {safeFmt(lastContactedAt, "dd/MM/yy")}
                          </span>
                          {daysAgo !== null && <span className="text-muted-foreground ml-1">({daysAgo}d fa)</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls page={page} totalPages={totalPages} from={from} to={to} totalCount={totalCount} onPrev={prevPage} onNext={nextPage} onGoTo={goToPage} />
        </div>
      )}

      {/* Contact Detail Slide-over */}
      <Sheet open={!!selectedContact} onOpenChange={(open) => { if (!open) setSelectedContact(null); }}>
        <SheetContent className="w-[450px] sm:w-[500px]">
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading flex items-center gap-2">
                  {selectedContact.contact_name}
                  {(selectedContact as any).is_decision_maker && <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">Decision Maker</Badge>}
                  {(selectedContact as any).is_primary && <Badge className="bg-warning/20 text-warning border-0 text-[10px]">Primary</Badge>}
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-6 pr-2">
                  {/* Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-heading">Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Organizzazione</p>
                        <button className="text-primary hover:underline font-medium" onClick={() => { setSelectedContact(null); navigate(`/crm/organizations/${selectedContact.client_id}`); }}>
                          {(selectedContact as any).clients?.company_name}
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ruolo</p>
                        <Badge className={`border-0 text-[10px] ${contactTypeColors[(selectedContact as any).contact_type || "general"]}`}>
                          {contactTypeLabels[(selectedContact as any).contact_type || "general"]}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Job Title</p>
                        <p className="font-medium">{(selectedContact as any).job_title || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Dipartimento</p>
                        <p className="font-medium">{(selectedContact as any).department || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedContact.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Telefono</p>
                        <p className="font-medium">{selectedContact.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Canale Preferito</p>
                        <p className="font-medium capitalize">{(selectedContact as any).preferred_channel || "email"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">LinkedIn</p>
                        {(selectedContact as any).linkedin_url ? (
                          <a href={(selectedContact as any).linkedin_url} target="_blank" className="text-primary hover:underline text-xs">{(selectedContact as any).linkedin_url}</a>
                        ) : <p className="font-medium">—</p>}
                      </div>
                    </div>
                    {selectedContact.notes && (
                      <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground mt-2">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Note</p>
                        {selectedContact.notes}
                      </div>
                    )}
                  </div>

                  {/* Activities */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-2">Attività ({contactActivities?.length || 0})</h4>
                    {!contactActivities?.length ? (
                      <p className="text-xs text-muted-foreground italic">Nessuna attività collegata</p>
                    ) : (
                      <div className="space-y-2">
                        {contactActivities.map(a => (
                          <div key={a.id} className="p-2 bg-secondary/50 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <p className="font-semibold text-foreground text-xs">{a.title}</p>
                              <span className="text-[10px] text-muted-foreground">{safeFmt(a.created_at, "dd/MM/yy")}</span>
                            </div>
                            {a.body && <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>}
                            {a.type && <Badge variant="outline" className="text-[9px] mt-1">{a.type}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Communications */}
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-heading mb-2">Comunicazioni ({contactComms?.length || 0})</h4>
                    {!contactComms?.length ? (
                      <p className="text-xs text-muted-foreground italic">Nessuna comunicazione collegata</p>
                    ) : (
                      <div className="space-y-2">
                        {contactComms.map(c => (
                          <div key={c.id} className="p-2 bg-secondary/50 rounded-lg text-sm">
                            <div className="flex justify-between">
                              <p className="font-semibold text-foreground text-xs">{c.subject}</p>
                              <span className="text-[10px] text-muted-foreground">{safeFmt(c.created_at, "dd/MM/yy")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CRMContactsPeople;

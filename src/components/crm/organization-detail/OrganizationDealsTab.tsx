import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Handshake, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { crmQueryKeys } from "@/lib/queryKeys";
import { stageColors, stageLabels, fmtDate } from "./constants";

interface OrganizationDealsTabProps {
  clientId: string;
  clientName: string;
  contacts: any[];
  navigate: (path: string) => void;
}

export function OrganizationDealsTab({ clientId, clientName, contacts, navigate }: OrganizationDealsTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", contact_id: "", value: "", stage: "draft", probability: "10", expected_close_date: "", notes: "" });

  const { data: deals } = useQuery({
    queryKey: crmQueryKeys.organizations.deals(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, contact:contact_id(contact_name)").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        title: form.title, client_id: clientId, contact_id: form.contact_id || null,
        value: parseFloat(form.value) || 0, stage: form.stage, probability: parseInt(form.probability) || 20,
        expected_close_date: form.expected_close_date || null, notes: form.notes || null, assigned_to: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmQueryKeys.organizations.deals(clientId) });
      queryClient.invalidateQueries({ queryKey: crmQueryKeys.deals.all });
      toast.success("Deal created");
      setCreateOpen(false);
      setForm({ title: "", contact_id: "", value: "", stage: "draft", probability: "10", expected_close_date: "", notes: "" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-foreground">Deals ({deals?.length || 0})</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button size="sm" className="gap-1 bg-foreground text-background" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Deal
          </Button>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-heading">New Deal for {clientName}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Title *</Label>
                <Input className="h-9 bg-secondary border-border" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Value (€)</Label>
                  <Input type="number" className="h-9 bg-secondary border-border" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Contact</Label>
                  <Select value={form.contact_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, contact_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.contact_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Stage</Label>
                  <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v, probability: String({ draft: 10, confirmed: 75, closed_won: 100, closed_lost: 0 }[v] ?? 10) }))}>
                    <SelectTrigger className="h-9 bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Expected close</Label>
                  <Input type="date" className="h-9 bg-secondary border-border" value={form.expected_close_date} onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => createDeal.mutate()} disabled={!form.title} className="w-full bg-foreground text-background">Create Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {!deals?.length ? (
        <div className="text-center py-10 glass-card-solid">
          <Handshake className="mx-auto text-muted-foreground mb-3 opacity-30" size={36} />
          <p className="text-sm text-muted-foreground">No deals for this organization</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map(d => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate("/crm/deals")}>
                  <TableCell className="font-heading font-semibold text-sm">{d.title}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-[10px] ${stageColors[d.stage] || "bg-muted text-muted-foreground"}`}>
                      {stageLabels[d.stage] || d.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">€{Number(d.value || 0).toLocaleString("en-US")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(d as any).contact?.contact_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(d.expected_close_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

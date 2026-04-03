import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Check, X, ArrowRight, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";

const CRMRequests = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["crm-dealer-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("distributor_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("distributor_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-dealer-requests"] });
      toast({ title: "Request updated" });
    },
  });

  const convertToLead = useMutation({
    mutationFn: async (request: any) => {
      // 1. Create organization (client) with status "lead"
      const { data: newClient, error: clientErr } = await supabase.from("clients").insert({
        company_name: request.company_name,
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        country: (request as any).country || null,
        vat_number: (request as any).vat_number || null,
        business_type: request.business_type || null,
        website: request.website || null,
        status: "lead",
      }).select().single();
      if (clientErr) throw clientErr;

      // 2. Create primary contact
      if (request.contact_name) {
        await supabase.from("client_contacts").insert({
          client_id: newClient.id,
          contact_name: request.contact_name,
          email: request.email,
          phone: request.phone,
          is_primary: true,
        });
      }

      // 3. Create lead linked to the organization
      const { error: leadErr } = await supabase.from("leads").insert({
        company_name: request.company_name,
        contact_name: request.contact_name,
        email: request.email,
        phone: request.phone,
        zone: request.zone,
        source: "Dealer Application",
        status: "request",
        notes: `[Dealer Request] Business type: ${request.business_type || "—"}\nWebsite: ${request.website || "—"}\nCountry: ${(request as any).country || "—"}\nVAT: ${(request as any).vat_number || "—"}\nMessage: ${request.message || "—"}`,
        assigned_to: user?.id,
      });
      if (leadErr) throw leadErr;

      // 4. Mark request as converted
      await supabase.from("distributor_requests").update({ status: "converted" }).eq("id", request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-dealer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast({ title: "Lead + Organization created from request!" });
      setSelectedRequest(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const newRequests = requests?.filter(r => r.status === "new") || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dealer Requests</h1>
          <p className="text-sm text-muted-foreground">Incoming applications from the "Become a Dealer" form</p>
        </div>
        <div className="flex items-center gap-2">
          {newRequests.length > 0 && (
            <Badge className="bg-warning/20 text-warning border-0">{newRequests.length} new</Badge>
          )}
          <Badge variant="outline" className="text-xs">{requests?.length || 0} total</Badge>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !requests?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <FileText className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No dealer requests yet.</p>
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
                <TableHead>Country</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelectedRequest(r)}>
                  <TableCell className="font-heading font-semibold">{r.company_name}</TableCell>
                  <TableCell className="text-sm">{r.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.phone}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.zone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{(r as any).country || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.business_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      r.status === "new" ? "border-warning text-warning" :
                      r.status === "approved" || r.status === "converted" ? "bg-success/20 text-success border-0" :
                      r.status === "rejected" ? "bg-destructive/20 text-destructive border-0" : ""
                    }>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {r.status === "new" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-success hover:text-success h-8 gap-1" onClick={() => convertToLead.mutate(r)} title="Convert to Lead + Organization">
                            <ArrowRight size={14} /> Pipeline
                          </Button>
                          <Button size="sm" variant="ghost" className="text-warning hover:text-warning h-8 gap-1" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })} title="Approve">
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })} title="Reject">
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {r.status === "converted" && <Badge className="bg-success/20 text-success border-0 text-[10px]">In Pipeline</Badge>}
                      {r.status === "approved" && <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Approvato</Badge>}
                      {r.status === "rejected" && <Badge className="bg-destructive/20 text-destructive border-0 text-[10px]">Rifiutato</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{selectedRequest.company_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground text-xs uppercase">Contact</span><p className="font-medium">{selectedRequest.contact_name}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Email</span><p className="font-medium">{selectedRequest.email}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Phone</span><p className="font-medium">{selectedRequest.phone}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Region</span><p className="font-medium">{selectedRequest.zone || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Country</span><p className="font-medium">{(selectedRequest as any).country || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Business Type</span><p className="font-medium">{selectedRequest.business_type || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Website</span><p className="font-medium">{selectedRequest.website || "—"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">VAT ID</span><p className="font-medium">{(selectedRequest as any).vat_number || "—"}</p></div>
                </div>
                {selectedRequest.message && (
                  <div>
                    <span className="text-muted-foreground text-xs uppercase">Message</span>
                    <p className="text-sm mt-1 p-3 bg-secondary/50 rounded-lg">{selectedRequest.message}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Received: {format(new Date(selectedRequest.created_at), "dd MMM yyyy HH:mm")}
                </div>
                {selectedRequest.status === "new" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button className="flex-1 gap-1 bg-foreground text-background" onClick={() => convertToLead.mutate(selectedRequest)}>
                      <ArrowRight size={14} /> Open in Pipeline
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => {
                      updateStatus.mutate({ id: selectedRequest.id, status: "approved" });
                      setSelectedRequest(null);
                    }}>
                      <Check size={14} /> Approva
                    </Button>
                    <Button variant="outline" className="gap-1 text-destructive" onClick={() => {
                      updateStatus.mutate({ id: selectedRequest.id, status: "rejected" });
                      setSelectedRequest(null);
                    }}>
                      <X size={14} /> Rifiuta
                    </Button>
                  </div>
                )}
                {selectedRequest.status !== "new" && (
                  <div className="pt-2 border-t border-border">
                    <Badge className={
                      selectedRequest.status === "converted" ? "bg-success/20 text-success border-0" :
                      selectedRequest.status === "approved" ? "bg-primary/20 text-primary border-0" :
                      "bg-destructive/20 text-destructive border-0"
                    }>{selectedRequest.status === "converted" ? "In Pipeline" : selectedRequest.status === "approved" ? "Approvato" : "Rifiutato"}</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMRequests;

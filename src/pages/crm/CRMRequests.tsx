import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Check, X, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { convertRequestToPipeline } from "@/lib/crmEntityActions";

const CRMRequests = () => {
  const { toast } = useToast();
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
    onSuccess: (_, variables) => {
      if (selectedRequest?.id === variables.id) {
        setSelectedRequest((prev: any) => prev ? { ...prev, status: variables.status } : prev);
      }
      queryClient.invalidateQueries({ queryKey: ["crm-dealer-requests"] });
      toast({ title: variables.status === "approved" ? "Request approved" : "Request updated" });
    },
  });

  const convertToLead = useMutation({
    mutationFn: async (request: any) => convertRequestToPipeline(request.id),
    onSuccess: () => {
      if (selectedRequest?.id) {
        setSelectedRequest((prev: any) => prev ? { ...prev, status: "converted" } : prev);
      }
      queryClient.invalidateQueries({ queryKey: ["crm-dealer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-organizations"] });
      toast({ title: "Lead + Organization created from request!" });
      setSelectedRequest(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const newRequests = requests?.filter(r => r.status === "new") || [];
  const approvedRequests = requests?.filter(r => r.status === "approved") || [];

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
          {approvedRequests.length > 0 && (
            <Badge className="bg-success/20 text-success border-0">{approvedRequests.length} approved</Badge>
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
                          <Button size="sm" variant="ghost" className="text-success hover:text-success h-8 gap-1" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })} title="Approva richiesta">
                            <Check size={14} /> Approva
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })} title="Reject">
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="ghost" className="text-success hover:text-success h-8 gap-1" onClick={() => convertToLead.mutate(r)} title="Inserisci in pipeline">
                          <Building2 size={14} /> Pipeline
                        </Button>
                      )}
                      {r.status === "converted" && <Badge className="bg-success/20 text-success border-0 text-[10px]">In Pipeline</Badge>}
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
                    <Button className="flex-1 gap-1 bg-foreground text-background" onClick={() => updateStatus.mutate({ id: selectedRequest.id, status: "approved" })}>
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
                {selectedRequest.status === "approved" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button className="flex-1 gap-1 bg-foreground text-background" onClick={() => convertToLead.mutate(selectedRequest)}>
                      <Building2 size={14} /> Inserisci in Pipeline
                    </Button>
                  </div>
                )}
                {selectedRequest.status !== "new" && selectedRequest.status !== "approved" && (
                  <div className="pt-2 border-t border-border">
                    <Badge className={
                      selectedRequest.status === "converted" ? "bg-success/20 text-success border-0" :
                      "bg-destructive/20 text-destructive border-0"
                    }>{selectedRequest.status === "converted" ? "In Pipeline" : "Rifiutato"}</Badge>
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

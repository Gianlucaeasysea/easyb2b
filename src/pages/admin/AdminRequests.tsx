import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests"],
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
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast({ title: "Request updated" });
    },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Dealer Requests</h1>
      <p className="text-sm text-muted-foreground mb-8">Review and manage incoming dealer applications</p>

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
                <TableHead>Region</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-heading font-semibold">{r.company_name}</TableCell>
                  <TableCell>{r.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.email}</TableCell>
                  <TableCell className="text-muted-foreground">{r.zone}</TableCell>
                  <TableCell className="text-muted-foreground">{r.business_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "new" ? "border-primary text-primary" : ""}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "new" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>
                          <X size={14} />
                        </Button>
                      </div>
                    )}
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

export default AdminRequests;

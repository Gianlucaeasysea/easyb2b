import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const AdminClients = () => {
  const { data: clients, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Clients</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage B2B dealer accounts</p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !clients?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <Users className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">No clients yet. Approve dealer requests to add clients.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-heading font-semibold">{c.company_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.country || c.zone}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{c.discount_class}</Badge></TableCell>
                  <TableCell>
                    <Badge className={c.status === "active" ? "bg-success/20 text-success border-0" : "bg-warning/20 text-warning border-0"}>
                      {c.status}
                    </Badge>
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

export default AdminClients;

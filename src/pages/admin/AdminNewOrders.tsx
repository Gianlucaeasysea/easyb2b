import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackagePlus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const AdminNewOrders = () => {
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-new-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, clients(company_name, country)")
        .in("status", ["draft", "confirmed"])
        .or('order_type.is.null,order_type.not.in.("MANUAL B2C","B2C","CUSTOM")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy HH:mm"); }
    catch { return "—"; }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Nuovi Ordini</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Ordini appena ricevuti dai dealer — {orders?.length || 0} in attesa
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !orders?.length ? (
        <div className="text-center py-20 glass-card-solid">
          <PackagePlus className="mx-auto text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground">Nessun nuovo ordine in arrivo.</p>
        </div>
      ) : (
        <div className="glass-card-solid overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Dealer</TableHead>
                <TableHead className="text-xs">Codice Ordine</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Stato</TableHead>
                <TableHead className="text-xs text-right">Totale</TableHead>
                <TableHead className="text-xs">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <TableCell>
                    <span className="font-heading font-semibold text-sm">
                      {(o as any).clients?.company_name || "—"}
                    </span>
                    {(o as any).clients?.country && (
                      <span className="text-xs text-muted-foreground ml-2">{(o as any).clients.country}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {(o as any).order_code || `#${o.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</TableCell>
                  <TableCell>
                    <Badge
                      className={`border-0 text-[10px] ${
                        o.status === "draft"
                          ? "bg-warning/20 text-warning"
                          : "bg-chart-4/20 text-chart-4"
                      }`}
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    €{Number(o.total_amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {o.notes || "—"}
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

export default AdminNewOrders;

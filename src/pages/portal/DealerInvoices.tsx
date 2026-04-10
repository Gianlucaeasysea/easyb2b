import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Receipt, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const paymentTermsDays: Record<string, number> = {
  prepaid: 0,
  "30_days": 30,
  "60_days": 60,
  "90_days": 90,
  end_of_month: 30,
};

const paymentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  partial: { label: "Partial", variant: "secondary" },
};

const DealerInvoices = () => {
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dealer-invoices", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, created_at, total_amount, payment_status, payment_terms, payment_due_date, payed_date, status, shipping_cost_client")
        .eq("client_id", client!.id)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: invoiceDocs = [] } = useQuery({
    queryKey: ["dealer-invoice-docs", client?.id],
    queryFn: async () => {
      if (!orders.length) return [];
      const orderIds = orders.map(o => o.id);
      const { data } = await supabase
        .from("order_documents")
        .select("id, order_id, file_name, file_path, doc_type, created_at")
        .in("order_id", orderIds)
        .eq("doc_type", "invoice");
      return data || [];
    },
    enabled: orders.length > 0,
  });

  const handleDownload = async (filePath: string, _fileName: string) => {
    const { data, error } = await supabase.storage.from("order-documents").createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Error downloading document");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const getDueDate = (order: any) => {
    if (order.payment_due_date) return new Date(order.payment_due_date);
    const days = paymentTermsDays[order.payment_terms] ?? 30;
    return addDays(new Date(order.created_at), days);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const aOverdue = a.payment_status !== "paid" && getDueDate(a) < new Date();
    const bOverdue = b.payment_status !== "paid" && getDueDate(b) < new Date();
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getInvoiceForOrder = (orderId: string) => invoiceDocs.filter(d => d.order_id === orderId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Invoices & Payments</h1>
        <p className="text-sm text-muted-foreground">View payment status and download invoices</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !orders.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No orders with invoices available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedOrders.map(order => {
            const ps = paymentStatusLabels[order.payment_status || "unpaid"] || paymentStatusLabels.unpaid;
            const dueDate = getDueDate(order);
            const isOverdue = order.payment_status !== "paid" && dueDate < new Date();
            const docs = getInvoiceForOrder(order.id);

            return (
              <div key={order.id} className="glass-card-solid p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-heading font-bold text-sm text-foreground">
                        {order.order_code || order.id.slice(0, 8)}
                      </span>
                      <Badge variant={ps.variant} className="text-[10px]">
                        {order.payment_status === "paid" && <CheckCircle size={10} className="mr-1" />}
                        {isOverdue && <AlertCircle size={10} className="mr-1" />}
                        {ps.label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Date: {format(new Date(order.created_at), "dd/MM/yyyy")}</span>
                      <span>Total: €{Number(order.total_amount || 0).toFixed(2)}</span>
                      <span>Due: {format(dueDate, "dd/MM/yyyy")}</span>
                      {order.payed_date && (
                        <span className="text-success">Paid on: {format(new Date(order.payed_date), "dd/MM/yyyy")}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {docs.length > 0 ? (
                      docs.map(doc => (
                        <Button
                          key={doc.id}
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => handleDownload(doc.file_path, doc.file_name)}
                        >
                          <Download size={12} /> Invoice
                        </Button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerInvoices;

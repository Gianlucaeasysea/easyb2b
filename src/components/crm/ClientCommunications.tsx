import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Send, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { ComposeEmailDialog } from "./ComposeEmailDialog";

interface ClientCommunicationsProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
}

const templateLabels: Record<string, string> = {
  order_update: "📦 Aggiornamento Ordine",
  payment_reminder: "💰 Sollecito Pagamento",
  custom: "✉️ Personalizzato",
};

export const ClientCommunications = ({ clientId, clientName, clientEmail }: ClientCommunicationsProps) => {
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: communications, isLoading, refetch } = useQuery({
    queryKey: ["client-communications", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_communications")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
          <Mail size={16} /> Comunicazioni
        </h3>
        <Button
          size="sm"
          onClick={() => setComposeOpen(true)}
          className="gap-1 text-xs"
          disabled={!clientEmail}
        >
          <Send size={12} /> Nuova Email
        </Button>
      </div>

      {!clientEmail && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-xs text-warning">⚠️ Il cliente non ha un indirizzo email configurato</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : !communications?.length ? (
        <div className="p-8 text-center text-muted-foreground">
          <Mail size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessuna comunicazione inviata</p>
        </div>
      ) : (
        <div className="space-y-2">
          {communications.map((comm: any) => (
            <div
              key={comm.id}
              className="p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={`text-[10px] border-0 ${
                        comm.status === "sent"
                          ? "bg-success/20 text-success"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {comm.status === "sent" ? "Inviata" : "Errore"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {templateLabels[comm.template_type] || comm.template_type}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {comm.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {comm.body?.replace(/<[^>]*>/g, "").slice(0, 150)}
                  </p>
                  {comm.error_message && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {comm.error_message}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(comm.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    → {comm.recipient_email}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        onSent={() => refetch()}
      />
    </div>
  );
};

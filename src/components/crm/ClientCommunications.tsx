import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Send, Clock, AlertCircle, ArrowUpRight, ArrowDownLeft, RefreshCw, Link2, CheckCircle2, Filter } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useMemo } from "react";
import { ComposeEmailDialog } from "./ComposeEmailDialog";
import { toast } from "sonner";
import { requestGmailAuthorizationCode } from "@/lib/gmailOAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientCommunicationsProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  contactEmails?: string[];
}

interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string | null;
  updatedAt?: string | null;
}

const templateLabels: Record<string, string> = {
  order_update: "📦 Aggiornamento Ordine",
  payment_reminder: "💰 Sollecito Pagamento",
  custom: "✉️ Personalizzato",
  inbound: "📥 Ricevuta",
};

export const ClientCommunications = ({ clientId, clientName, clientEmail, contactEmails = [] }: ClientCommunicationsProps) => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [filterEmail, setFilterEmail] = useState<string>("all");

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

  const { data: gmailStatus, refetch: refetchGmailStatus } = useQuery({
    queryKey: ["gmail-connection-status"],
    queryFn: async (): Promise<GmailConnectionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return { connected: false };
      const { data, error } = await supabase.functions.invoke("gmail-connection-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) return { connected: false };
      return (data as GmailConnectionStatus) ?? { connected: false };
    },
    staleTime: 30000,
  });

  const gmailConnected = gmailStatus?.connected ?? false;

  // Collect all unique emails that appear in communications
  const allEmails = useMemo(() => {
    const emailSet = new Set<string>();
    if (clientEmail) emailSet.add(clientEmail.toLowerCase());
    contactEmails.forEach(e => { if (e) emailSet.add(e.toLowerCase()); });
    communications?.forEach(c => {
      if (c.recipient_email) emailSet.add(c.recipient_email.toLowerCase());
    });
    // Remove business email from filter options
    emailSet.delete("business@easysea.org");
    return Array.from(emailSet).sort();
  }, [communications, clientEmail, contactEmails]);

  const filteredCommunications = useMemo(() => {
    if (!communications) return [];
    if (filterEmail === "all") return communications;
    return communications.filter(c =>
      c.recipient_email?.toLowerCase() === filterEmail
    );
  }, [communications, filterEmail]);

  // Group by gmail_thread_id for visual threading
  const groupedByThread = useMemo(() => {
    const threads = new Map<string, any[]>();
    const standalone: any[] = [];
    for (const c of filteredCommunications) {
      if (c.gmail_thread_id) {
        const existing = threads.get(c.gmail_thread_id) || [];
        existing.push(c);
        threads.set(c.gmail_thread_id, existing);
      } else {
        standalone.push(c);
      }
    }
    // Sort threads by most recent message
    const threadGroups = Array.from(threads.values()).map(msgs => {
      msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return msgs;
    });
    threadGroups.sort((a, b) => new Date(b[b.length - 1].created_at).getTime() - new Date(a[a.length - 1].created_at).getTime());

    // Interleave standalone items by date
    const result: (any[] | any)[] = [];
    let tIdx = 0, sIdx = 0;
    const sortedStandalone = [...standalone].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    while (tIdx < threadGroups.length || sIdx < sortedStandalone.length) {
      const threadDate = tIdx < threadGroups.length ? new Date(threadGroups[tIdx][threadGroups[tIdx].length - 1].created_at).getTime() : -Infinity;
      const standaloneDate = sIdx < sortedStandalone.length ? new Date(sortedStandalone[sIdx].created_at).getTime() : -Infinity;

      if (threadDate >= standaloneDate) {
        result.push(threadGroups[tIdx]);
        tIdx++;
      } else {
        result.push([sortedStandalone[sIdx]]);
        sIdx++;
      }
    }
    return result;
  }, [filteredCommunications]);

  const handleConnectGmail = async () => {
    if (connectingGmail) return;
    setConnectingGmail(true);
    try {
      const { code, redirectUri } = await requestGmailAuthorizationCode();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessione non valida.");
      const { data, error } = await supabase.functions.invoke("gmail-exchange-code", {
        body: { code, redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}`, "X-Requested-With": "XmlHttpRequest" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.details || data.error);
      toast.success("Gmail collegato con successo!");
      await refetchGmailStatus();
    } catch (err: any) {
      console.error("Gmail connect error:", err);
      toast.error(err?.message || "Errore durante il collegamento Gmail");
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleSync = async () => {
    if (!gmailConnected) {
      await handleConnectGmail();
      return;
    }
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("gmail-sync-inbox", {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result?.needs_auth) {
        toast.error("Il token Gmail non è più valido. Ricollega Gmail.");
        await refetchGmailStatus();
        return;
      }
      toast.success(`Sincronizzazione completata: ${result?.synced || 0} nuove email importate`);
      await Promise.all([refetch(), refetchGmailStatus()]);
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const renderMessage = (comm: any, isThreaded = false) => {
    const isInbound = comm.direction === "inbound";
    return (
      <div
        key={comm.id}
        className={`p-4 rounded-lg border transition-colors ${
          isThreaded ? "ml-4 border-l-2" : ""
        } ${
          isInbound
            ? "bg-primary/5 border-primary/20 hover:border-primary/40"
            : "bg-secondary/50 border-border hover:border-primary/20"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isInbound ? (
                <Badge className="text-[10px] border-0 bg-primary/20 text-primary gap-1">
                  <ArrowDownLeft size={8} /> Ricevuta
                </Badge>
              ) : (
                <Badge
                  className={`text-[10px] border-0 gap-1 ${
                    comm.status === "sent" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  }`}
                >
                  <ArrowUpRight size={8} />
                  {comm.status === "sent" ? "Inviata" : comm.status === "received" ? "Ricevuta" : "Errore"}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {templateLabels[comm.template_type] || comm.template_type}
              </Badge>
              {comm.recipient_email && comm.recipient_email !== "business@easysea.org" && (
                <Badge variant="outline" className="text-[10px] bg-accent/10">
                  {comm.recipient_email}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{comm.subject}</p>
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
              {isInbound ? `← ${comm.recipient_email}` : `→ ${comm.recipient_email}`}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
          <Mail size={16} /> Comunicazioni
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {gmailConnected ? (
            <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/10 text-primary text-[10px]">
              <CheckCircle2 size={10} /> Gmail connesso
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1 text-xs">
              {connectingGmail ? <RefreshCw size={12} className="animate-spin" /> : <Link2 size={12} />}
              {connectingGmail ? "Collegamento..." : "Collega Gmail"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || connectingGmail || !gmailConnected} className="gap-1 text-xs">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizzazione..." : "Sincronizza"}
          </Button>
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1 text-xs" disabled={!clientEmail}>
            <Send size={12} /> Nuova Email
          </Button>
        </div>
      </div>

      {/* Email filter */}
      {allEmails.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <Select value={filterEmail} onValueChange={setFilterEmail}>
            <SelectTrigger className="w-64 h-8 text-xs">
              <SelectValue placeholder="Tutti i contatti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i contatti ({communications?.length || 0})</SelectItem>
              {allEmails.map(email => {
                const count = communications?.filter(c => c.recipient_email?.toLowerCase() === email).length || 0;
                return (
                  <SelectItem key={email} value={email}>
                    {email} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {!gmailConnected && (
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            📧 Gmail non ancora collegato. Clicca "Collega Gmail" per iniziare.
          </p>
        </div>
      )}

      {!clientEmail && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-xs text-warning">⚠️ Il cliente non ha un indirizzo email configurato</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : !groupedByThread.length ? (
        <div className="p-8 text-center text-muted-foreground">
          <Mail size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessuna comunicazione</p>
          <p className="text-xs mt-1">
            {gmailConnected
              ? 'Clicca "Sincronizza" per importare le email'
              : 'Collega Gmail per importare le email'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByThread.map((thread, idx) => {
            if (thread.length === 1) {
              return renderMessage(thread[0]);
            }
            // Thread with multiple messages
            return (
              <div key={`thread-${idx}`} className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Thread · {thread.length} messaggi
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {thread.map((msg: any, i: number) => renderMessage(msg, i > 0))}
              </div>
            );
          })}
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

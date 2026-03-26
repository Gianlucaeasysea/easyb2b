import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail, Send, Clock, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Link2, CheckCircle2, Filter, ChevronDown, ChevronRight, MessageSquare, Reply
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useMemo } from "react";
import { ComposeEmailDialog } from "./ComposeEmailDialog";
import { toast } from "sonner";
import { requestGmailAuthorizationCode } from "@/lib/gmailOAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClientCommunicationsProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  contactEmails?: string[];
  orderId?: string;
  orderCode?: string;
}

interface GmailConnectionStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string | null;
  updatedAt?: string | null;
}

const templateLabels: Record<string, string> = {
  order_update: "📦 Order Update",
  payment_reminder: "💰 Payment Reminder",
  custom: "✉️ Custom",
  inbound: "📥 Received",
};

export const ClientCommunications = ({ clientId, clientName, clientEmail, contactEmails = [], orderId, orderCode }: ClientCommunicationsProps) => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [filterEmail, setFilterEmail] = useState<string>("all");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [openEmail, setOpenEmail] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<{ to: string; subject: string; threadId?: string } | null>(null);

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

  const allEmails = useMemo(() => {
    const emailSet = new Set<string>();
    if (clientEmail) emailSet.add(clientEmail.toLowerCase());
    contactEmails.forEach(e => { if (e) emailSet.add(e.toLowerCase()); });
    communications?.forEach(c => {
      if (c.recipient_email) emailSet.add(c.recipient_email.toLowerCase());
    });
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

  // Group by gmail_thread_id
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
    const threadGroups = Array.from(threads.entries()).map(([threadId, msgs]) => {
      msgs.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { threadId, msgs, lastDate: new Date(msgs[msgs.length - 1].created_at).getTime() };
    });
    threadGroups.sort((a, b) => b.lastDate - a.lastDate);

    const sortedStandalone = [...standalone].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const merged: any[] = [];
    let tIdx = 0, sIdx = 0;

    while (tIdx < threadGroups.length || sIdx < sortedStandalone.length) {
      const threadDate = tIdx < threadGroups.length ? threadGroups[tIdx].lastDate : -Infinity;
      const standaloneDate = sIdx < sortedStandalone.length ? new Date(sortedStandalone[sIdx].created_at).getTime() : -Infinity;

      if (threadDate >= standaloneDate) {
        merged.push({ type: "thread" as const, ...threadGroups[tIdx] });
        tIdx++;
      } else {
        merged.push({ type: "single" as const, msg: sortedStandalone[sIdx], threadId: sortedStandalone[sIdx].id });
        sIdx++;
      }
    }
    return merged;
  }, [filteredCommunications]);

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      next.has(threadId) ? next.delete(threadId) : next.add(threadId);
      return next;
    });
  };

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
      toast.error(err?.message || "Errore durante il collegamento Gmail");
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleSync = async () => {
    if (!gmailConnected) { await handleConnectGmail(); return; }
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
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const handleReply = (comm: any) => {
    // Determine who to reply to
    const replyEmail = comm.direction === "inbound"
      ? (comm.metadata as any)?.from ? extractEmailFromHeader((comm.metadata as any).from) : comm.recipient_email
      : comm.recipient_email;
    const replySubject = comm.subject?.startsWith("Re:") ? comm.subject : `Re: ${comm.subject}`;
    setReplyTo({ to: replyEmail, subject: replySubject, threadId: comm.gmail_thread_id });
    setOpenEmail(null);
    setComposeOpen(true);
  };

  const extractEmailFromHeader = (header: string): string => {
    const match = header.match(/<([^>]+)>/);
    return match ? match[1] : header.trim();
  };

  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "";

  const getMetadataDisplay = (comm: any) => {
    const meta = comm.metadata as any;
    if (!meta) return null;
    return { from: meta.from, to: meta.to, cc: meta.cc };
  };

  const renderMessageRow = (comm: any, compact = false) => {
    const isInbound = comm.direction === "inbound";
    const preview = stripHtml(comm.body || "").slice(0, 120);
    const meta = getMetadataDisplay(comm);

    return (
      <div
        key={comm.id}
        onClick={() => setOpenEmail(comm)}
        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
          compact ? "ml-6 border-l-2" : ""
        } ${
          isInbound
            ? "bg-primary/5 border-primary/20 hover:border-primary/40"
            : "bg-secondary/30 border-border hover:border-primary/20"
        }`}
      >
        <div className="flex items-center gap-2 mb-0.5">
          {isInbound ? (
            <ArrowDownLeft size={10} className="text-primary shrink-0" />
          ) : (
            <ArrowUpRight size={10} className="text-success shrink-0" />
          )}
          <span className="text-xs font-semibold text-foreground truncate flex-1">{comm.subject}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(new Date(comm.created_at), "dd MMM HH:mm", { locale: it })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate pl-[18px]">{preview}</p>
        <div className="pl-[18px] space-y-0.5 mt-0.5">
          {meta?.from && (
            <span className="text-[10px] text-muted-foreground block truncate">
              Da: {meta.from}
            </span>
          )}
          {meta?.to && (
            <span className="text-[10px] text-muted-foreground block truncate">
              A: {meta.to}
            </span>
          )}
          {meta?.cc && (
            <span className="text-[10px] text-muted-foreground block truncate">
              CC: {meta.cc}
            </span>
          )}
          {!meta && comm.recipient_email && comm.recipient_email !== "business@easysea.org" && (
            <span className="text-[10px] text-muted-foreground block">
              {isInbound ? `← da ${comm.recipient_email}` : `→ a ${comm.recipient_email}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
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
            {syncing ? "Sync..." : "Sincronizza"}
          </Button>
          <Button size="sm" onClick={() => { setReplyTo(null); setComposeOpen(true); }} className="gap-1 text-xs" disabled={!clientEmail}>
            <Send size={12} /> Nuova Email
          </Button>
        </div>
      </div>

      {/* Filter */}
      {allEmails.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <Select value={filterEmail} onValueChange={setFilterEmail}>
            <SelectTrigger className="w-72 h-8 text-xs">
              <SelectValue placeholder="Tutti i contatti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i contatti ({communications?.length || 0})</SelectItem>
              {allEmails.map(email => {
                const count = communications?.filter(c => c.recipient_email?.toLowerCase() === email).length || 0;
                return (
                  <SelectItem key={email} value={email}>{email} ({count})</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {!gmailConnected && (
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">📧 Gmail non collegato. Clicca "Collega Gmail" per iniziare.</p>
        </div>
      )}

      {/* Email list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : !groupedByThread.length ? (
        <div className="p-8 text-center text-muted-foreground">
          <Mail size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessuna comunicazione</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupedByThread.map((item: any) => {
            if (item.type === "single") {
              return renderMessageRow(item.msg);
            }
            const { threadId, msgs } = item;
            const isExpanded = expandedThreads.has(threadId);
            const lastMsg = msgs[msgs.length - 1];
            const firstSubject = msgs[0].subject;

            return (
              <div key={threadId} className="rounded-lg border border-border overflow-hidden">
                <div
                  className="flex items-center gap-2 p-3 bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => toggleThread(threadId)}
                >
                  {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  <MessageSquare size={12} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground truncate flex-1">{firstSubject}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{msgs.length} msg</Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(lastMsg.created_at), "dd MMM HH:mm", { locale: it })}
                  </span>
                </div>

                {isExpanded && (
                  <div className="p-2 space-y-1 bg-background">
                    {msgs.map((msg: any, i: number) => renderMessageRow(msg, i > 0))}
                  </div>
                )}

                {!isExpanded && (
                  <div
                    className="px-3 py-2 bg-background cursor-pointer hover:bg-secondary/20"
                    onClick={() => setOpenEmail(lastMsg)}
                  >
                    <div className="flex items-center gap-2">
                      {lastMsg.direction === "inbound" ? (
                        <ArrowDownLeft size={10} className="text-primary" />
                      ) : (
                        <ArrowUpRight size={10} className="text-success" />
                      )}
                      <p className="text-[11px] text-muted-foreground truncate">
                        {stripHtml(lastMsg.body || "").slice(0, 100)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Email Reader Dialog */}
      <Dialog open={!!openEmail} onOpenChange={(open) => { if (!open) setOpenEmail(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-base flex items-center gap-2">
              {openEmail?.direction === "inbound" ? (
                <ArrowDownLeft size={16} className="text-primary" />
              ) : (
                <ArrowUpRight size={16} className="text-success" />
              )}
              {openEmail?.subject}
            </DialogTitle>
            <div className="space-y-1 text-xs text-muted-foreground mt-1">
              <div className="flex items-center gap-2">
                <Clock size={10} />
                {openEmail && format(new Date(openEmail.created_at), "dd MMMM yyyy, HH:mm", { locale: it })}
              </div>
              {(openEmail?.metadata as any)?.from && (
                <p><span className="font-medium text-foreground">Da:</span> {(openEmail.metadata as any).from}</p>
              )}
              {(openEmail?.metadata as any)?.to && (
                <p><span className="font-medium text-foreground">A:</span> {(openEmail.metadata as any).to}</p>
              )}
              {(openEmail?.metadata as any)?.cc && (
                <p><span className="font-medium text-foreground">CC:</span> {(openEmail.metadata as any).cc}</p>
              )}
              {!(openEmail?.metadata as any)?.from && openEmail?.recipient_email && (
                <p>
                  {openEmail?.direction === "inbound"
                    ? `Da: ${openEmail?.recipient_email}`
                    : `A: ${openEmail?.recipient_email}`
                  }
                </p>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-2">
            <div className="pr-4">
              {openEmail?.body?.includes("<") ? (
                <div
                  className="prose prose-sm max-w-none text-foreground [&_a]:text-primary"
                  dangerouslySetInnerHTML={{ __html: openEmail.body }}
                />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{openEmail?.body}</p>
              )}
            </div>
          </ScrollArea>
          {/* Reply button */}
          <div className="flex justify-end pt-3 border-t border-border">
            <Button size="sm" onClick={() => handleReply(openEmail)} className="gap-1.5">
              <Reply size={14} /> Rispondi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        orderId={orderId}
        orderCode={orderCode}
        initialTo={replyTo?.to}
        initialSubject={replyTo?.subject}
        onSent={() => refetch()}
      />
    </div>
  );
};
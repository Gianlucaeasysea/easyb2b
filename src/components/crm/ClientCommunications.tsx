import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Send, Clock, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Link2, CheckCircle2, Filter, ChevronDown, ChevronRight, MessageSquare, Reply, User
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useMemo } from "react";
import { ComposeEmailDialog } from "./ComposeEmailDialog";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
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

export const ClientCommunications = ({ clientId, clientName, clientEmail, contactEmails = [], orderId, orderCode }: ClientCommunicationsProps) => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [filterEmail, setFilterEmail] = useState<string>("all");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [openEmail, setOpenEmail] = useState<Tables<"client_communications"> | null>(null);
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

  type CommRow = Tables<"client_communications">;
  interface EmailMetadata { from?: string; to?: string; cc?: string; [key: string]: unknown }
  const getMeta = (comm: CommRow): EmailMetadata | null => comm.metadata as EmailMetadata | null;

  const groupedByThread = useMemo(() => {
    const threads = new Map<string, CommRow[]>();
    const standalone: CommRow[] = [];
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
      msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { threadId, msgs, lastDate: new Date(msgs[msgs.length - 1].created_at).getTime() };
    });
    threadGroups.sort((a, b) => b.lastDate - a.lastDate);
    const sortedStandalone = [...standalone].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    type MergedItem = { type: "thread"; threadId: string; msgs: CommRow[]; lastDate: number } | { type: "single"; msg: CommRow; threadId: string };
    const merged: MergedItem[] = [];
    let tIdx = 0, sIdx = 0;
    while (tIdx < threadGroups.length || sIdx < sortedStandalone.length) {
      const threadDate = tIdx < threadGroups.length ? threadGroups[tIdx].lastDate : -Infinity;
      const standaloneDate = sIdx < sortedStandalone.length ? new Date(sortedStandalone[sIdx].created_at).getTime() : -Infinity;
      if (threadDate >= standaloneDate) {
        merged.push({ type: "thread", ...threadGroups[tIdx] });
        tIdx++;
      } else {
        merged.push({ type: "single", msg: sortedStandalone[sIdx], threadId: sortedStandalone[sIdx].id });
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
    } catch (error) {
      showErrorToast(error, "ClientCommunications.connectGmail");
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
    } catch (error) {
      showErrorToast(error, "ClientCommunications.syncGmail");
    } finally {
      setSyncing(false);
    }
  };

  const handleReply = (comm: CommRow) => {
    const meta = getMeta(comm);
    const replyEmail = comm.direction === "inbound"
      ? meta?.from ? extractEmailFromHeader(meta.from) : comm.recipient_email
      : comm.recipient_email;
    const replySubject = comm.subject?.startsWith("Re:") ? comm.subject : `Re: ${comm.subject}`;
    setReplyTo({ to: replyEmail, subject: replySubject, threadId: comm.gmail_thread_id || undefined });
    setOpenEmail(null);
    setComposeOpen(true);
  };

  const extractEmailFromHeader = (header: string): string => {
    const match = header.match(/<([^>]+)>/);
    return match ? match[1] : header.trim();
  };

  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "";

  const formatHeaderName = (header: string) => {
    // Show just the name or email nicely
    const match = header.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
    if (match) return match[1].trim();
    return header.replace(/<[^>]+>/, "").trim() || header;
  };

  const renderEmailCard = (comm: CommRow, isNested = false) => {
    const isInbound = comm.direction === "inbound";
    const meta = getMeta(comm);
    const preview = stripHtml(comm.body || "").slice(0, 150);

    return (
      <div
        key={comm.id}
        onClick={() => setOpenEmail(comm)}
        className={`group cursor-pointer transition-all rounded-lg border ${isNested ? "ml-4" : ""} ${
          isInbound
            ? "border-primary/20 hover:border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06]"
            : "border-border hover:border-primary/30 bg-card hover:bg-secondary/40"
        }`}
      >
        <div className="p-4">
          {/* Top row: direction + subject + date */}
          <div className="flex items-start gap-3 mb-2">
            <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${isInbound ? "bg-primary/10" : "bg-muted"}`}>
              {isInbound ? <ArrowDownLeft size={12} className="text-primary" /> : <ArrowUpRight size={12} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-between">
                <h4 className="text-sm font-semibold text-foreground truncate">{comm.subject}</h4>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(comm.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                </span>
              </div>
              {/* From / To / CC metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {meta?.from && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground/70">From:</span> {formatHeaderName(meta.from)}
                  </span>
                )}
                {meta?.to && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground/70">To:</span> {formatHeaderName(meta.to)}
                  </span>
                )}
                {meta?.cc && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground/70">CC:</span> {meta.cc}
                  </span>
                )}
                {!meta && comm.recipient_email && (
                  <span>{isInbound ? `From: ${comm.recipient_email}` : `To: ${comm.recipient_email}`}</span>
                )}
              </div>
            </div>
          </div>
          {/* Preview */}
          <p className="text-xs text-muted-foreground line-clamp-2 ml-[36px]">{preview}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
          <Mail size={16} /> Communications
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {gmailConnected ? (
            <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/10 text-primary text-[10px]">
              <CheckCircle2 size={10} /> Gmail connected
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1 text-xs">
              {connectingGmail ? <RefreshCw size={12} className="animate-spin" /> : <Link2 size={12} />}
              {connectingGmail ? "Connecting..." : "Connect Gmail"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || connectingGmail || !gmailConnected} className="gap-1 text-xs">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>
          <Button size="sm" onClick={() => { setReplyTo(null); setComposeOpen(true); }} className="gap-1 text-xs" disabled={!clientEmail}>
            <Send size={12} /> New Email
          </Button>
        </div>
      </div>

      {/* Filter */}
      {allEmails.length > 1 && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <Select value={filterEmail} onValueChange={setFilterEmail}>
            <SelectTrigger className="w-80 h-9 text-xs">
              <SelectValue placeholder="All contacts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contacts ({communications?.length || 0})</SelectItem>
              {allEmails.map(email => {
                const count = communications?.filter(c => c.recipient_email?.toLowerCase() === email).length || 0;
                return <SelectItem key={email} value={email}>{email} ({count})</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {!gmailConnected && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
          <Mail size={24} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Gmail not connected. Click "Connect Gmail" to start syncing emails.</p>
        </div>
      )}

      {/* Email list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={16} className="animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : !groupedByThread.length ? (
        <div className="py-12 text-center">
          <Mail size={36} className="mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No communications yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Send an email or sync Gmail to see conversations here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupedByThread.map((item) => {
            if (item.type === "single") {
              return renderEmailCard(item.msg);
            }
            const { threadId, msgs } = item;
            const isExpanded = expandedThreads.has(threadId);
            const lastMsg = msgs[msgs.length - 1];
            const firstSubject = msgs[0].subject;
            const inboundCount = msgs.filter((m) => m.direction === "inbound").length;
            const outboundCount = msgs.filter((m) => m.direction === "outbound").length;

            return (
              <div key={threadId} className="rounded-lg border border-border overflow-hidden bg-card">
                {/* Thread header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 cursor-pointer transition-colors"
                  onClick={() => toggleThread(threadId)}
                >
                  <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
                    <MessageSquare size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{firstSubject}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {msgs.length} messages
                      </span>
                      {inboundCount > 0 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 border-primary/20">
                          <ArrowDownLeft size={8} /> {inboundCount} in
                        </Badge>
                      )}
                      {outboundCount > 0 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                          <ArrowUpRight size={8} /> {outboundCount} out
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(lastMsg.created_at), "dd MMM, HH:mm", { locale: it })}
                  </span>
                  {isExpanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
                </div>

                {/* Expanded: all messages */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border pt-3 bg-secondary/10">
                    {msgs.map((msg) => renderEmailCard(msg, true))}
                  </div>
                )}

                {/* Collapsed: preview of last message */}
                {!isExpanded && (
                  <div
                    className="px-4 py-2.5 bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors border-t border-border"
                    onClick={() => setOpenEmail(lastMsg)}
                  >
                    <div className="flex items-center gap-2 ml-[36px]">
                      {lastMsg.direction === "inbound" ? (
                        <ArrowDownLeft size={10} className="text-primary shrink-0" />
                      ) : (
                        <ArrowUpRight size={10} className="text-muted-foreground shrink-0" />
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {stripHtml(lastMsg.body || "").slice(0, 120)}
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
                <div className="p-1.5 rounded-full bg-primary/10 shrink-0"><ArrowDownLeft size={14} className="text-primary" /></div>
              ) : (
                <div className="p-1.5 rounded-full bg-muted shrink-0"><ArrowUpRight size={14} className="text-muted-foreground" /></div>
              )}
              <span className="truncate">{openEmail?.subject}</span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Email metadata */}
          <div className="rounded-lg bg-secondary/30 border border-border p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={12} />
              <span>{openEmail && format(new Date(openEmail.created_at), "dd MMMM yyyy, HH:mm", { locale: it })}</span>
            </div>
            <Separator />
            {(() => {
              const meta = openEmail ? getMeta(openEmail) : null;
              return (
                <>
                  {meta?.from && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-foreground w-10 shrink-0">From:</span>
                      <span className="text-muted-foreground break-all">{meta.from}</span>
                    </div>
                  )}
                  {meta?.to && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-foreground w-10 shrink-0">To:</span>
                      <span className="text-muted-foreground break-all">{meta.to}</span>
                    </div>
                  )}
                  {meta?.cc && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-foreground w-10 shrink-0">CC:</span>
                      <span className="text-muted-foreground break-all">{meta.cc}</span>
                    </div>
                  )}
                  {!meta?.from && openEmail?.recipient_email && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-foreground w-10 shrink-0">
                        {openEmail?.direction === "inbound" ? "From:" : "To:"}
                      </span>
                      <span className="text-muted-foreground">{openEmail?.recipient_email}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Email body */}
          <ScrollArea className="flex-1 mt-2">
            <div className="pr-4">
              {openEmail?.body?.includes("<") ? (
                <div
                  className="prose prose-sm max-w-none text-foreground [&_a]:text-primary"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(openEmail.body) }}
                />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{openEmail?.body}</p>
              )}
            </div>
          </ScrollArea>
          
          {/* Reply */}
          <div className="flex justify-end pt-3 border-t border-border">
            <Button size="sm" onClick={() => handleReply(openEmail)} className="gap-1.5">
              <Reply size={14} /> Reply
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

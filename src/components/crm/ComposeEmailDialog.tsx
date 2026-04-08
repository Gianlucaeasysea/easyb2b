import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Send, Sparkles, Loader2, Users, Plus, X, Variable, Save, Clock, AlertTriangle, Paperclip, FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandler";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import TiptapEditor from "./TiptapEditor";

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail: string;
  orderId?: string;
  orderCode?: string;
  orderStatus?: string;
  orderTotal?: number;
  trackingNumber?: string;
  initialTo?: string;
  initialSubject?: string;
  onSent?: () => void;
}

const MERGE_VARS = [
  { key: "{{nome_contatto}}", label: "Nome contatto" },
  { key: "{{azienda}}", label: "Azienda" },
  { key: "{{ultimo_ordine}}", label: "Ultimo ordine" },
  { key: "{{sconto_assegnato}}", label: "Sconto assegnato" },
];

export const ComposeEmailDialog = ({
  open, onOpenChange, clientId, clientName, clientEmail,
  orderId, orderCode, orderStatus, orderTotal, trackingNumber,
  initialTo, initialSubject, onSent,
}: ComposeEmailDialogProps) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(clientEmail);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [customCc, setCustomCc] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("__none__");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [showSchedule, setShowSchedule] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; path: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch contacts for this client
  const { data: contacts } = useQuery({
    queryKey: ["client-contacts-compose", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("client_contacts").select("contact_name, email, role, preferred_channel").eq("client_id", clientId).not("email", "is", null);
      return data || [];
    },
    enabled: open,
  });

  // Fetch email templates from DB
  const { data: dbTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("email_templates").select("*").order("name");
      return data || [];
    },
    enabled: open,
  });

  // Fetch last order for merge vars
  const { data: lastOrder } = useQuery({
    queryKey: ["client-last-order", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("order_code").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Fetch client discount class
  const { data: clientData } = useQuery({
    queryKey: ["client-detail-compose", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("discount_class, company_name").eq("id", clientId).maybeSingle();
      return data;
    },
    enabled: open,
  });

  const selectedContact = contacts?.find(c => c.email === selectedRecipient);
  const preferredChannel = selectedContact?.preferred_channel;
  const showChannelWarning = preferredChannel && preferredChannel !== "email" && preferredChannel !== "";

  const availableEmails = (() => {
    const emails: { email: string; label: string }[] = [];
    if (clientEmail) emails.push({ email: clientEmail, label: `${clientName} (Main)` });
    for (const c of (contacts || [])) {
      if (c.email && c.email.toLowerCase() !== clientEmail?.toLowerCase()) {
        emails.push({ email: c.email, label: `${c.contact_name}${c.role ? ` · ${c.role}` : ""}` });
      }
    }
    return emails;
  })();

  useEffect(() => {
    if (open) {
      setSelectedRecipient(initialTo || clientEmail);
      setCcEmails([]);
      setCustomCc("");
      setSelectedTemplateId("__none__");
      setScheduleDate(undefined);
      setShowSchedule(false);
      setAttachments([]);
      if (initialSubject) {
        setSubject(initialSubject);
        setBody("");
      } else if (orderCode) {
        setSubject(`Re: Order ${orderCode}`);
        setBody("");
      } else {
        setSubject("");
        setBody("");
      }
    }
  }, [open, clientEmail, initialTo, initialSubject, orderCode]);

  const resolveMergeVars = (text: string) => {
    const contactName = selectedContact?.contact_name || clientName;
    const companyName = clientData?.company_name || clientName;
    const lastOrderCode = orderCode || lastOrder?.order_code || "N/A";
    const discount = clientData?.discount_class || "Standard";
    return text
      .replace(/\{\{nome_contatto\}\}/g, contactName)
      .replace(/\{\{azienda\}\}/g, companyName)
      .replace(/\{\{ultimo_ordine\}\}/g, lastOrderCode)
      .replace(/\{\{sconto_assegnato\}\}/g, discount);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "__none__") return;
    const tpl = dbTemplates?.find(t => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const insertVariable = (varKey: string) => {
    setBody(prev => prev + varKey);
  };

  const toggleCc = (email: string) => {
    setCcEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };
  const addCustomCc = () => {
    const email = customCc.trim();
    if (!email || !email.includes("@")) return;
    if (!ccEmails.includes(email)) setCcEmails(prev => [...prev, email]);
    setCustomCc("");
  };
  const removeCc = (email: string) => setCcEmails(prev => prev.filter(e => e !== email));

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autenticato");
      const { data, error } = await supabase.functions.invoke("generate-email-draft", {
        body: {
          template_type: "custom",
          context: {
            client_name: clientName, order_code: orderCode, order_status: orderStatus,
            order_total: orderTotal, tracking_number: trackingNumber, custom_prompt: customPrompt,
          },
        },
      });
      if (error) throw error;
      setBody(data.draft || "");
      setSubject(data.subject || subject || "");
      toast.success("Bozza AI generata");
    } catch (error) {
      showErrorToast(error, "ComposeEmailDialog.generateDraft");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (mode: "send" | "draft" | "schedule") => {
    if (mode !== "draft" && (!subject.trim() || !body.trim())) {
      toast.error("Compila oggetto e corpo email");
      return;
    }
    if (!selectedRecipient) {
      toast.error("Seleziona un destinatario");
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autenticato");

      const resolvedBody = resolveMergeVars(body);
      const resolvedSubject = resolveMergeVars(subject);
      const htmlBody = resolvedBody.includes("<") ? resolvedBody : `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${resolvedBody.replace(/\n/g, "<br/>")}</div>`;

      if (mode === "draft") {
        // Save as draft in client_communications
        const { error } = await supabase.from("client_communications").insert({
          client_id: clientId,
          subject: resolvedSubject || "(Bozza senza oggetto)",
          body: htmlBody || "(vuoto)",
          direction: "outbound",
          template_type: "custom",
          sent_by: session.user.id,
          recipient_email: selectedRecipient,
          status: "draft",
          order_id: orderId || null,
        });
        if (error) throw error;
        toast.success("Bozza salvata!");
      } else if (mode === "schedule") {
        if (!scheduleDate) {
          toast.error("Seleziona una data per la programmazione");
          setSending(false);
          return;
        }
        const { error } = await supabase.from("client_communications").insert({
          client_id: clientId,
          subject: resolvedSubject,
          body: htmlBody,
          direction: "outbound",
          template_type: "custom",
          sent_by: session.user.id,
          recipient_email: selectedRecipient,
          status: "scheduled",
          order_id: orderId || null,
          scheduled_at: scheduleDate.toISOString(),
        });
        if (error) throw error;
        toast.success(`Email programmata per ${format(scheduleDate, "dd/MM/yyyy HH:mm", { locale: it })}`);
      } else {
        // Send immediately
        const bccList = ["g.scotto@easysea.org", ...ccEmails].join(", ");
        const { data, error } = await supabase.functions.invoke("send-crm-email", {
          body: {
            to: selectedRecipient, subject: resolvedSubject, html: htmlBody,
            text: resolvedBody.replace(/<[^>]*>/g, ""),
            client_id: clientId, order_id: orderId, template_type: "custom",
            cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined, bcc: bccList,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Update last_contacted_at for matched contact
        if (selectedContact) {
          await supabase.from("client_contacts").update({ last_contacted_at: new Date().toISOString() }).eq("email", selectedRecipient).eq("client_id", clientId);
        }
        toast.success("Email inviata con successo!");
      }

      setSubject("");
      setBody("");
      setCustomPrompt("");
      setCcEmails([]);
      onOpenChange(false);
      onSent?.();
    } catch (error) {
      showErrorToast(error, "ComposeEmailDialog.send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Send size={18} /> {initialSubject ? "Rispondi" : "Componi Email"}
            {orderCode && <Badge className="bg-primary/15 text-primary border-0 ml-2">Ordine {orderCode}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template selector */}
          <div>
            <Label className="text-xs text-muted-foreground">Usa template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="mt-1 bg-secondary border-border">
                <SelectValue placeholder="Seleziona template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nessun template</SelectItem>
                {(dbTemplates || []).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient selector */}
          <div>
            <Label className="text-xs text-muted-foreground">A:</Label>
            {availableEmails.length > 1 ? (
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue placeholder="Seleziona destinatario" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmails.map(e => (
                    <SelectItem key={e.email} value={e.email}>
                      <span className="flex items-center gap-2">{e.label} <span className="text-muted-foreground text-xs">({e.email})</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground mt-1 p-2 bg-secondary rounded-lg">{clientName} ({selectedRecipient})</p>
            )}
            {showChannelWarning && (
              <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                <AlertTriangle size={14} /> Questo contatto preferisce essere contattato via <strong>{preferredChannel}</strong>
              </div>
            )}
          </div>

          {/* CC section */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users size={12} /> CC (opzionale)</Label>
            <div className="mt-1 space-y-2">
              {availableEmails.filter(e => e.email !== selectedRecipient).map(e => (
                <label key={e.email} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 p-1.5 rounded">
                  <Checkbox checked={ccEmails.includes(e.email)} onCheckedChange={() => toggleCc(e.email)} />
                  <span>{e.label}</span>
                  <span className="text-xs text-muted-foreground">({e.email})</span>
                </label>
              ))}
              <div className="flex gap-2">
                <Input value={customCc} onChange={e => setCustomCc(e.target.value)} placeholder="Aggiungi CC..." className="text-xs h-8 bg-secondary border-border" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomCc(); } }} />
                <Button size="sm" variant="outline" onClick={addCustomCc} className="h-8 text-xs gap-1" disabled={!customCc.includes("@")}><Plus size={12} /> Aggiungi</Button>
              </div>
              {ccEmails.filter(e => !availableEmails.some(ae => ae.email === e)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ccEmails.filter(e => !availableEmails.some(ae => ae.email === e)).map(email => (
                    <Badge key={email} variant="outline" className="text-xs gap-1">{email}<button onClick={() => removeCc(email)} className="hover:text-destructive"><X size={10} /></button></Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI prompt */}
          <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles size={12} className="text-primary" /> Istruzioni AI (opzionale)</Label>
            <Input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Es. 'ordine in ritardo di 5 giorni, chiedere pazienza'" className="bg-background border-border text-sm" />
            <Button size="sm" variant="outline" onClick={handleGenerateDraft} disabled={generating} className="gap-1 text-xs">
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generating ? "Generazione..." : "Genera Bozza AI"}
            </Button>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs text-muted-foreground">Oggetto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Oggetto email..." className="mt-1 bg-secondary border-border" />
          </div>

          {/* Body with merge vars */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Corpo</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1"><Variable size={10} /> Inserisci variabile</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {MERGE_VARS.map(v => (
                    <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key)}>
                      {v.label} <span className="ml-auto text-muted-foreground text-[10px]">{v.key}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-1">
              <TiptapEditor content={body} onChange={setBody} placeholder="Scrivi il contenuto dell'email..." />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={async (e) => {
              const files = e.target.files;
              if (!files) return;
              if (attachments.length + files.length > 5) { toast.error("Max 5 allegati"); return; }
              setUploading(true);
              try {
                for (const file of Array.from(files)) {
                  if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} supera 10MB`); continue; }
                  const path = `${clientId}/${Date.now()}-${file.name}`;
                  const { error } = await supabase.storage.from("email-attachments").upload(path, file);
                  if (error) throw error;
                  setAttachments(prev => [...prev, { name: file.name, path, size: file.size }]);
                }
              } catch (error) {
                showErrorToast(error, "ComposeEmailDialog.uploadAttachment");
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }} />
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading || attachments.length >= 5}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
              {uploading ? "Caricamento..." : "Allega file"}
            </Button>
            <span className="text-[10px] text-muted-foreground ml-2">Max 5 file, 10MB ciascuno</span>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="outline" className="gap-1 text-xs">
                    <FileIcon size={10} /> {a.name} ({(a.size / 1024).toFixed(0)}KB)
                    <button onClick={async () => {
                      await supabase.storage.from("email-attachments").remove([a.path]);
                      setAttachments(prev => prev.filter((_, idx) => idx !== i));
                    }} className="hover:text-destructive ml-1"><X size={10} /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Schedule picker */}
          {showSchedule && (
            <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> Programma invio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-sm">
                    {scheduleDate ? format(scheduleDate, "dd/MM/yyyy HH:mm", { locale: it }) : "Seleziona data e ora..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} disabled={(d) => d < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSend("draft")} disabled={sending} className="gap-1 text-xs">
                <Save size={12} /> Salva bozza
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowSchedule(!showSchedule); }} className="gap-1 text-xs">
                <Clock size={12} /> Programma
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              {showSchedule && scheduleDate ? (
                <Button onClick={() => handleSend("schedule")} disabled={sending || !subject.trim() || !body.trim() || !selectedRecipient} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                  {sending ? "Programmazione..." : "Programma invio"}
                </Button>
              ) : (
                <Button onClick={() => handleSend("send")} disabled={sending || !subject.trim() || !body.trim() || !selectedRecipient} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? "Invio..." : "Invia ora"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

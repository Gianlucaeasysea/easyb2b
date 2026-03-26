import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Sparkles, Loader2, Users, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const TEMPLATES = [
  { value: "order_update", label: "📦 Order Update" },
  { value: "payment_reminder", label: "💰 Payment Reminder" },
  { value: "custom", label: "✉️ Custom Message" },
];

const TEMPLATE_BODIES: Record<string, (ctx: { clientName: string; orderCode?: string }) => { subject: string; body: string }> = {
  order_update: (ctx) => ({
    subject: ctx.orderCode ? `Order ${ctx.orderCode} — Status Update` : `Order Status Update`,
    body: `Dear ${ctx.clientName},\n\nWe would like to update you regarding your order${ctx.orderCode ? ` ${ctx.orderCode}` : ''}.\n\n[Please describe the update here]\n\nShould you have any questions, please do not hesitate to contact us.\n\nBest regards,\nEasySea Team`,
  }),
  payment_reminder: (ctx) => ({
    subject: ctx.orderCode ? `Payment Reminder — Order ${ctx.orderCode}` : `Payment Reminder`,
    body: `Dear ${ctx.clientName},\n\nThis is a friendly reminder regarding the outstanding payment for your order${ctx.orderCode ? ` ${ctx.orderCode}` : ''}.\n\nWe kindly ask you to arrange the payment at your earliest convenience. If payment has already been made, please disregard this message.\n\nFor any questions regarding your invoice or payment terms, please reach out to us.\n\nBest regards,\nEasySea Team`,
  }),
  custom: () => ({ subject: "", body: "" }),
};

export const ComposeEmailDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientEmail,
  orderId,
  orderCode,
  orderStatus,
  orderTotal,
  trackingNumber,
  initialTo,
  initialSubject,
  onSent,
}: ComposeEmailDialogProps) => {
  const [templateType, setTemplateType] = useState("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(clientEmail);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [customCc, setCustomCc] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["client-contacts-compose", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_contacts")
        .select("contact_name, email, role")
        .eq("client_id", clientId)
        .not("email", "is", null);
      return data || [];
    },
    enabled: open,
  });

  const availableEmails = (() => {
    const emails: { email: string; label: string }[] = [];
    if (clientEmail) {
      emails.push({ email: clientEmail, label: `${clientName} (Main)` });
    }
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
      if (initialSubject) {
        setSubject(initialSubject);
        setBody("");
        setTemplateType("custom");
      } else if (orderCode) {
        setSubject(`Re: Order ${orderCode}`);
        setBody("");
      } else {
        setSubject("");
        setBody("");
      }
    }
  }, [open, clientEmail, initialTo, initialSubject, orderCode]);

  // Apply template when changed
  const handleTemplateChange = (value: string) => {
    setTemplateType(value);
    const generator = TEMPLATE_BODIES[value];
    if (generator) {
      const { subject: tSubject, body: tBody } = generator({ clientName, orderCode });
      if (tSubject) setSubject(tSubject);
      if (tBody) setBody(tBody);
    }
  };

  const toggleCc = (email: string) => {
    setCcEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const addCustomCc = () => {
    const email = customCc.trim();
    if (!email || !email.includes("@")) return;
    if (!ccEmails.includes(email)) {
      setCcEmails(prev => [...prev, email]);
    }
    setCustomCc("");
  };

  const removeCc = (email: string) => {
    setCcEmails(prev => prev.filter(e => e !== email));
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autenticato");
      const { data, error } = await supabase.functions.invoke("generate-email-draft", {
        body: {
          template_type: templateType,
          context: {
            client_name: clientName,
            order_code: orderCode,
            order_status: orderStatus,
            order_total: orderTotal,
            tracking_number: trackingNumber,
            custom_prompt: customPrompt,
          },
        },
      });
      if (error) throw error;
      setBody(data.draft || "");
      setSubject(data.subject || "");
      toast.success("AI draft generated");
    } catch (err: any) {
      toast.error("Draft generation error: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in subject and body");
      return;
    }
    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const htmlBody = body.includes("<") ? body : `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${body.replace(/\n/g, "<br/>")}</div>`;

      const bccList = ["g.scotto@easysea.org", ...ccEmails].join(", ");

      const { data, error } = await supabase.functions.invoke("send-crm-email", {
        body: {
          to: selectedRecipient,
          subject,
          html: htmlBody,
          text: body.replace(/<[^>]*>/g, ""),
          client_id: clientId,
          order_id: orderId,
          template_type: templateType,
          cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
          bcc: bccList,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Email sent successfully!");
      setSubject("");
      setBody("");
      setCustomPrompt("");
      setCcEmails([]);
      onOpenChange(false);
      onSent?.();
    } catch (err: any) {
      toast.error("Send error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Send size={18} /> {initialSubject ? "Reply" : "Send Email"}
            {orderCode && (
              <Badge className="bg-primary/15 text-primary border-0 ml-2">Order {orderCode}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipient selector */}
          <div>
            <Label className="text-xs text-muted-foreground">To:</Label>
            {availableEmails.length > 1 ? (
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmails.map(e => (
                    <SelectItem key={e.email} value={e.email}>
                      <span className="flex items-center gap-2">
                        {e.label} <span className="text-muted-foreground text-xs">({e.email})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground mt-1 p-2 bg-secondary rounded-lg">
                {clientName} ({selectedRecipient})
              </p>
            )}
          </div>

          {/* CC section */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={12} /> CC (optional)
            </Label>
            <div className="mt-1 space-y-2">
              {availableEmails
                .filter(e => e.email !== selectedRecipient)
                .map(e => (
                  <label key={e.email} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 p-1.5 rounded">
                    <Checkbox
                      checked={ccEmails.includes(e.email)}
                      onCheckedChange={() => toggleCc(e.email)}
                    />
                    <span>{e.label}</span>
                    <span className="text-xs text-muted-foreground">({e.email})</span>
                  </label>
                ))}

              <div className="flex gap-2">
                <Input
                  value={customCc}
                  onChange={e => setCustomCc(e.target.value)}
                  placeholder="Add CC email..."
                  className="text-xs h-8 bg-secondary border-border"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomCc(); } }}
                />
                <Button size="sm" variant="outline" onClick={addCustomCc} className="h-8 text-xs gap-1" disabled={!customCc.includes("@")}>
                  <Plus size={12} /> Add
                </Button>
              </div>

              {ccEmails.filter(e => !availableEmails.some(ae => ae.email === e)).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ccEmails
                    .filter(e => !availableEmails.some(ae => ae.email === e))
                    .map(email => (
                      <Badge key={email} variant="outline" className="text-xs gap-1">
                        {email}
                        <button onClick={() => removeCc(email)} className="hover:text-destructive">
                          <X size={10} />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Template */}
          <div>
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={templateType} onValueChange={handleTemplateChange}>
              <SelectTrigger className="mt-1 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI prompt */}
          <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles size={12} className="text-primary" /> AI Instructions (optional)
            </Label>
            <Input
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="E.g. 'order delayed by 5 days, ask for patience'"
              className="bg-background border-border text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleGenerateDraft} disabled={generating} className="gap-1 text-xs">
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generating ? "Generating..." : "Generate AI Draft"}
            </Button>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="mt-1 bg-secondary border-border"
            />
          </div>

          {/* Body */}
          <div>
            <Label className="text-xs text-muted-foreground">Body</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your email content..."
              className="mt-1 bg-secondary border-border min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim() || !selectedRecipient}
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
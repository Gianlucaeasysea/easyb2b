import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2 } from "lucide-react";
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
  onSent?: () => void;
}

const TEMPLATES = [
  { value: "order_update", label: "📦 Aggiornamento Ordine" },
  { value: "payment_reminder", label: "💰 Sollecito Pagamento" },
  { value: "custom", label: "✉️ Messaggio Personalizzato" },
];

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
  onSent,
}: ComposeEmailDialogProps) => {
  const [templateType, setTemplateType] = useState("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

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
      toast.success("Bozza generata dall'AI");
    } catch (err: any) {
      toast.error("Errore generazione bozza: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Compila oggetto e corpo dell'email");
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autenticato");

      // Wrap body in simple HTML if it's plain text
      const htmlBody = body.includes("<") ? body : `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${body.replace(/\n/g, "<br/>")}</div>`;

      const { data, error } = await supabase.functions.invoke("send-crm-email", {
        body: {
          to: clientEmail,
          subject,
          html: htmlBody,
          text: body.replace(/<[^>]*>/g, ""),
          client_id: clientId,
          order_id: orderId,
          template_type: templateType,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Email inviata con successo!");
      setSubject("");
      setBody("");
      setCustomPrompt("");
      onOpenChange(false);
      onSent?.();
    } catch (err: any) {
      toast.error("Errore invio: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <Send size={18} /> Invia Email
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            A: <span className="font-semibold text-foreground">{clientName}</span> ({clientEmail})
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Template */}
          <div>
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger className="mt-1 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order context badge */}
          {orderCode && (
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-0">
                Ordine {orderCode}
              </Badge>
              {orderStatus && (
                <Badge variant="outline" className="text-xs">
                  {orderStatus}
                </Badge>
              )}
            </div>
          )}

          {/* AI prompt */}
          <div className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles size={12} className="text-primary" /> Istruzioni per l'AI (opzionale)
            </Label>
            <Input
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Es: 'ordine in ritardo di 5 giorni, chiedi pazienza'"
              className="bg-background border-border text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateDraft}
              disabled={generating}
              className="gap-1 text-xs"
            >
              {generating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {generating ? "Generazione..." : "Genera Bozza AI"}
            </Button>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs text-muted-foreground">Oggetto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto dell'email..."
              className="mt-1 bg-secondary border-border"
            />
          </div>

          {/* Body */}
          <div>
            <Label className="text-xs text-muted-foreground">Corpo Email</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Scrivi il contenuto dell'email..."
              className="mt-1 bg-secondary border-border min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending ? "Invio..." : "Invia Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

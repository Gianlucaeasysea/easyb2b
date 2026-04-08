import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const DOC_TYPES = [
  { value: "invoice", label: "Fattura" },
  { value: "ddt", label: "DDT" },
  { value: "credit_note", label: "Nota di Credito" },
  { value: "proforma", label: "Proforma" },
  { value: "other", label: "Altro" },
];

interface OrderDocumentsProps {
  orderId: string;
  readOnly?: boolean;
}

const OrderDocuments = ({ orderId, readOnly = false }: OrderDocumentsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("invoice");
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<any>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["order-documents", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_documents")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Il file non può superare i 10MB");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${orderId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("order-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("order_documents").insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        doc_type: docType,
        uploaded_by: user.id,
        note: uploadNote.trim() || null,
      } as any);

      if (dbError) throw dbError;

      const docLabel = DOC_TYPES.find(d => d.value === docType)?.label || docType;

      // Log event
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "document_uploaded",
        title: `Documento caricato: ${docLabel}`,
        description: file.name,
      });

      queryClient.invalidateQueries({ queryKey: ["order-documents", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
      toast.success("Documento caricato");

      // Send email notification
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: { orderId, type: 'documents_uploaded' },
        });
      } catch (emailErr) {
        console.error("Document notification email failed:", emailErr);
      }

      // In-app notification for dealer
      try {
        const { data: order } = await supabase.from("orders").select("client_id, order_code").eq("id", orderId).maybeSingle();
        if (order?.client_id) {
          await supabase.from("client_notifications").insert({
            client_id: order.client_id,
            title: `Nuovo documento disponibile`,
            body: `${docLabel} caricata per l'ordine #${order.order_code || orderId.slice(0, 8)}`,
            type: "document",
            order_id: orderId,
          });
        }
      } catch (notifErr) {
        console.error("In-app notification failed:", notifErr);
      }

      setUploadNote("");
    } catch (err: any) {
      toast.error("Errore upload: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    try {
      await supabase.storage.from("order-documents").remove([deleteDoc.file_path]);
      await supabase.from("order_documents").delete().eq("id", deleteDoc.id);
      queryClient.invalidateQueries({ queryKey: ["order-documents", orderId] });
      toast.success("Documento eliminato");
    } catch (err: any) {
      toast.error("Errore eliminazione: " + err.message);
    } finally {
      setDeleteDoc(null);
    }
  };

  const handleDownload = async (filePath: string) => {
    const { data } = supabase.storage.from("order-documents").getPublicUrl(filePath);
    if (data?.publicUrl) window.open(data.publicUrl, "_blank");
  };

  const docTypeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  return (
    <div>
      <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText size={14} /> Documenti
      </h4>

      {/* Upload section (admin only) */}
      {!readOnly && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary border-border rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs gap-1.5 rounded-lg"
            >
              <Upload size={12} />
              {uploading ? "Caricamento..." : "Carica Documento"}
            </Button>
          </div>
          <Textarea
            value={uploadNote}
            onChange={e => setUploadNote(e.target.value)}
            placeholder="Nota opzionale..."
            className="text-xs min-h-[40px] resize-none bg-secondary border-border"
          />
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento documenti...</p>
      ) : !documents?.length ? (
        <p className="text-xs text-muted-foreground italic">Nessun documento disponibile</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {docTypeLabel(doc.doc_type)} · {format(new Date(doc.created_at), "dd MMM yyyy", { locale: it })}
                    {(doc as any).note && ` · ${(doc as any).note}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleDownload(doc.file_path)}>
                  <Download size={12} />
                </Button>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDoc(doc)}>
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDoc} onOpenChange={(open) => { if (!open) setDeleteDoc(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Elimina Documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare <strong>{deleteDoc?.file_name}</strong>? Questa azione non può essere annullata.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteDoc(null)}>Annulla</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDocuments;

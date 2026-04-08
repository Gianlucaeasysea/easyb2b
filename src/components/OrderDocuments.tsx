import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const DOC_TYPES = [
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "invoice", label: "Invoice" },
  { value: "delivery_note", label: "Delivery Note (DDT)" },
  { value: "warranty", label: "Warranty Certificate" },
  { value: "other", label: "Other" },
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
      });

      if (dbError) throw dbError;

      // Log event
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "document_uploaded",
        title: `Documento caricato: ${DOC_TYPES.find(d => d.value === docType)?.label || docType}`,
        description: file.name,
      });

      queryClient.invalidateQueries({ queryKey: ["order-documents", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-events", orderId] });
      toast.success("Document uploaded successfully");

      // Send email notification to client about new document
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            orderId,
            type: 'documents_uploaded',
          },
        });
      } catch (emailErr) {
        console.error("Document notification email failed:", emailErr);
      }

      // Create in-app notification for the dealer
      try {
        const { data: order } = await supabase.from("orders").select("client_id").eq("id", orderId).maybeSingle();
        if (order?.client_id) {
          await supabase.from("client_notifications").insert({
            client_id: order.client_id,
            title: `New document available: ${DOC_TYPES.find(d => d.value === docType)?.label || docType}`,
            body: file.name,
            type: "document",
            order_id: orderId,
          });
        }
      } catch (notifErr) {
        console.error("In-app notification failed:", notifErr);
      }
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: any) => {
    try {
      await supabase.storage.from("order-documents").remove([doc.file_path]);
      await supabase.from("order_documents").delete().eq("id", doc.id);
      queryClient.invalidateQueries({ queryKey: ["order-documents", orderId] });
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from("order-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const docTypeLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  return (
    <div className="mt-4">
      <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText size={14} /> Documents
      </h4>

      {/* Upload section (admin only) */}
      {!readOnly && (
        <div className="flex items-center gap-2 mb-3">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-secondary border-border rounded-lg">
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
            accept=".pdf,.doc,.docx,.xls,.xlsx"
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
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading documents...</p>
      ) : !documents?.length ? (
        <p className="text-xs text-muted-foreground italic">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {docTypeLabel(doc.doc_type)} · {format(new Date(doc.created_at), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={getDownloadUrl(doc.file_path)} target="_blank" rel="noopener noreferrer" download>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                    <Download size={12} />
                  </Button>
                </a>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderDocuments;

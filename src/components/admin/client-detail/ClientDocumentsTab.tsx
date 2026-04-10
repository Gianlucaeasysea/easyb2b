import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import React from "react";

const DOC_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "price_list", label: "Price List (PDF)" },
  { value: "marketing", label: "Marketing Material" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

interface Props {
  clientDocs: any[] | undefined;
  docCategory: string;
  setDocCategory: (v: string) => void;
  docTitle: string;
  setDocTitle: (v: string) => void;
  uploadingDoc: boolean;
  docInputRef: React.RefObject<HTMLInputElement>;
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteDoc: (doc: any) => void;
  handleDocDownload: (filePath: string) => void;
}

export const ClientDocumentsTab = ({ clientDocs, docCategory, setDocCategory, docTitle, setDocTitle, uploadingDoc, docInputRef, handleDocUpload, deleteDoc, handleDocDownload }: Props) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="font-heading font-bold text-foreground flex items-center gap-2">
        <FileText size={16} /> Client Documents
      </h2>
      <Badge variant="outline" className="text-xs">{clientDocs?.length || 0} files</Badge>
    </div>

    <div className="p-4 bg-secondary/50 rounded-lg border border-border mb-6 space-y-3">
      <p className="text-xs font-semibold text-foreground">Upload New Document</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] text-muted-foreground mb-1 block">Title (optional)</label>
          <Input placeholder="e.g. Q1 2026 Price List" value={docTitle} onChange={e => setDocTitle(e.target.value)} className="bg-background border-border rounded-lg h-8 text-xs" />
        </div>
        <div className="min-w-[160px]">
          <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
          <Select value={docCategory} onValueChange={setDocCategory}>
            <SelectTrigger className="bg-background border-border rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.zip" />
          <Button variant="outline" size="sm" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc} className="gap-1.5 text-xs h-8 rounded-lg">
            <Upload size={12} />
            {uploadingDoc ? "Uploading..." : "Select & Upload"}
          </Button>
        </div>
      </div>
    </div>

    {!clientDocs?.length ? (
      <div className="text-center py-10 text-muted-foreground">
        <FileText size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No documents uploaded yet.</p>
        <p className="text-xs mt-1">Upload contracts, price lists, or marketing materials for this client.</p>
      </div>
    ) : (
      <div className="space-y-2">
        {clientDocs.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{doc.title || doc.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {DOC_CATEGORIES.find(c => c.value === doc.doc_category)?.label || doc.doc_category}
                  {" · "}{doc.file_name}
                  {" · "}{format(new Date(doc.created_at), "dd MMM yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="text-[10px]">
                {DOC_CATEGORIES.find(c => c.value === doc.doc_category)?.label || doc.doc_category}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleDocDownload(doc.file_path)}>
                <Download size={12} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDoc(doc)}>
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

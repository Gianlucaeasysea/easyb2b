import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { fmtDate } from "./constants";

interface OrganizationDocumentsTabProps {
  documents: any[];
}

export function OrganizationDocumentsTab({ documents }: OrganizationDocumentsTabProps) {
  return (
    <div className="glass-card-solid p-6">
      <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><FileText size={16} /> Documenti</h3>
      {!documents?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">File Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="text-sm font-medium">{d.file_name || d.title || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{d.doc_type || d.doc_category || "other"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(d.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

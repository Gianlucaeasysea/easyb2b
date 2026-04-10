import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, ArrowRight, Check } from "lucide-react";
import type { ImportState } from "@/hooks/usePriceListImport";
import { ImportValidationReport } from "./ImportValidationReport";

interface PriceListImportProps {
  importState: ImportState;
  priceLists: any[];
  onSetTargetListId: (id: string | null) => void;
  onSetFieldMapping: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onRunValidation: () => void;
  onExecuteImport: () => void;
  onCancel: () => void;
}

export default function PriceListImport({
  importState, priceLists, onSetTargetListId, onSetFieldMapping, onRunValidation, onExecuteImport, onCancel,
}: PriceListImportProps) {
  const { step, data, headers, fieldMapping, targetListId, validationResult, isImporting } = importState;

  return (
    <Dialog open={step !== "idle"} onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {step === "validation" ? "Validazione Import" : "Importa Listino da File"}
          </DialogTitle>
        </DialogHeader>

        {step === "validation" && validationResult && (
          <ImportValidationReport
            result={validationResult}
            onConfirm={onExecuteImport}
            onCancel={onCancel}
            isImporting={isImporting}
          />
        )}

        {step === "mapping" && (
          <div className="space-y-6">
            <div>
              <Label>Listino di destinazione *</Label>
              <Select value={targetListId || "__none__"} onValueChange={v => onSetTargetListId(v === "__none__" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona listino..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Seleziona —</SelectItem>
                  {priceLists?.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Mappa i campi del file</h3>
              <p className="text-xs text-muted-foreground">{data.length} righe · {headers.length} colonne</p>
              {["product_name", "sku", "price"].map(field => (
                <div key={field} className="flex items-center gap-3">
                  <Label className="w-40 text-sm">
                    {field === "product_name" ? "Nome Prodotto" : field === "sku" ? "SKU" : "Prezzo"} {field === "price" && <span className="text-destructive">*</span>}
                  </Label>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Select value={fieldMapping[field] || "__none__"} onValueChange={v => onSetFieldMapping(m => ({ ...m, [field]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Non mappare —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Anteprima ({Math.min(5, data.length)} righe)</h3>
              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.slice(0, 6).map(h => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">
                          {h}
                          {Object.values(fieldMapping).includes(h) && (
                            <Badge className="ml-1 bg-primary/20 text-primary text-[9px]">
                              {Object.entries(fieldMapping).find(([, v]) => v === h)?.[0] === "product_name" ? "Nome" : Object.entries(fieldMapping).find(([, v]) => v === h)?.[0] === "sku" ? "SKU" : "Prezzo"}
                            </Badge>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {headers.slice(0, 6).map(h => (
                          <TableCell key={h} className="text-xs">{String(row[h] || "").substring(0, 30)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onCancel}>Annulla</Button>
              <Button onClick={onRunValidation} disabled={!targetListId || !fieldMapping.price}>
                <Check className="h-4 w-4 mr-1" /> Valida e Importa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

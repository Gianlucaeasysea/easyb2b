import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ImportType = "clients" | "orders";

interface FieldMapping {
  fileColumn: string;
  platformField: string;
}

const CLIENT_FIELDS = [
  { key: "company_name", label: "Nome Business", required: true, aliases: ["business", "ragione sociale", "company", "azienda"] },
  { key: "business_type", label: "Type", required: false, aliases: ["type", "tipo", "business type"] },
  { key: "status", label: "Status", required: false, aliases: ["status", "stato"] },
  { key: "country", label: "Country", required: false, aliases: ["country", "paese", "nazione"] },
  { key: "address", label: "Address", required: false, aliases: ["address", "indirizzo"] },
  { key: "contact_name", label: "Contact Person", required: false, aliases: ["name", "contact person", "nome contatto", "contact name", "nome"] },
  { key: "contact_email", label: "Contact Email", required: false, aliases: ["email", "e-mail", "contact email", "mail"] },
  { key: "contact_phone", label: "Contact Phone", required: false, aliases: ["phone", "telefono", "contact phone", "tel"] },
  { key: "contact_role", label: "Contact Role", required: false, aliases: ["role", "ruolo", "contact role"] },
  { key: "website", label: "Website", required: false, aliases: ["website", "sito", "sito web", "url"] },
  { key: "vat_number", label: "P.IVA", required: false, aliases: ["p.iva", "vat", "vat number", "partita iva"] },
  { key: "zone", label: "Zona", required: false, aliases: ["zone", "zona", "area"] },
  { key: "discount_class", label: "Classe Dealer", required: false, aliases: ["discount class", "classe", "classe dealer"] },
  { key: "notes", label: "Note", required: false, aliases: ["notes", "note", "commenti"] },
];

const ORDER_FIELDS = [
  { key: "client_company", label: "Azienda Cliente", required: true },
  { key: "status", label: "Stato", required: false },
  { key: "created_at", label: "Data Ordine", required: false },
  { key: "total_amount", label: "Totale", required: false },
  { key: "notes", label: "Note", required: false },
  { key: "tracking_number", label: "N. Tracking", required: false },
  { key: "product_name", label: "Nome Prodotto", required: false },
  { key: "quantity", label: "Quantità", required: false },
  { key: "unit_price", label: "Prezzo Unitario", required: false },
];

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function DataImporter() {
  const [importType, setImportType] = useState<ImportType>("clients");
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const fields = importType === "clients" ? CLIENT_FIELDS : ORDER_FIELDS;

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (!json.length) {
        toast.error("Il file è vuoto");
        return;
      }

      const cols = Object.keys(json[0]);
      setFileColumns(cols);
      setRawData(json);

      // Auto-map by aliases (exact match on normalized column name)
      const autoMap: Record<string, string> = {};
      const usedCols = new Set<string>();
      fields.forEach((f) => {
        const aliases: string[] = (f as any).aliases || [f.label.toLowerCase()];
        const match = cols.find(
          (c) => !usedCols.has(c) && aliases.some(
            (a) => c.toLowerCase().trim() === a.toLowerCase().trim()
          )
        );
        if (match) {
          autoMap[f.key] = match;
          usedCols.add(match);
        }
      });
      setMappings(autoMap);
      setStep("mapping");
    };
    reader.readAsBinaryString(file);
  }, [fields]);

  const validate = useCallback(() => {
    const errs: ValidationError[] = [];
    const requiredFields = fields.filter((f) => f.required);

    rawData.forEach((row, i) => {
      requiredFields.forEach((f) => {
        const col = mappings[f.key];
        if (!col || !row[col] || String(row[col]).trim() === "") {
          errs.push({ row: i + 1, field: f.label, message: "Campo obbligatorio mancante" });
        }
      });
    });

    setErrors(errs);
    setStep("preview");
  }, [rawData, mappings, fields]);

  const getMappedData = useCallback(() => {
    return rawData.map((row) => {
      const mapped: Record<string, any> = {};
      Object.entries(mappings).forEach(([field, col]) => {
        if (col) mapped[field] = row[col];
      });
      return mapped;
    });
  }, [rawData, mappings]);

  const doImport = useCallback(async () => {
    setStep("importing");
    const mapped = getMappedData();

    try {
      if (importType === "clients") {
        // Group rows by company_name to support multiple contacts per client
        const clientGroups = new Map<string, Record<string, any>[]>();
        mapped.forEach((r) => {
          const key = String(r.company_name || "").trim().toLowerCase();
          if (!key) return;
          if (!clientGroups.has(key)) clientGroups.set(key, []);
          clientGroups.get(key)!.push(r);
        });

        let count = 0;
        for (const [, rows] of clientGroups) {
          const first = rows[0];
          const rawStatus = first.status ? String(first.status).trim().toLowerCase() : "active";
          const validStatuses = ["active", "lead", "inactive"];
          const status = validStatuses.includes(rawStatus) ? rawStatus : "active";

          const rawDiscount = first.discount_class ? String(first.discount_class).trim().toUpperCase() : "D";
          const validDiscounts = ["A", "B", "C", "D", "custom"];
          const discount_class = validDiscounts.includes(rawDiscount) ? rawDiscount : "D";

          const clientRow = {
            company_name: String(first.company_name || ""),
            business_type: first.business_type ? String(first.business_type) : null,
            vat_number: first.vat_number ? String(first.vat_number) : null,
            address: first.address ? String(first.address) : null,
            country: first.country ? String(first.country) : null,
            zone: first.zone ? String(first.zone) : null,
            website: first.website ? String(first.website) : null,
            discount_class,
            status,
            notes: first.notes ? String(first.notes) : null,
          };

          const { data: client, error } = await supabase
            .from("clients")
            .insert(clientRow as any)
            .select("id")
            .single();
          if (error) throw error;

          // Insert all contacts for this client
          const contacts = rows
            .filter((r) => r.contact_name || r.contact_email || r.contact_phone || r.contact_role)
            .map((r) => ({
              client_id: client.id,
              contact_name: String(r.contact_name || r.company_name || "Contatto principale"),
              email: r.contact_email ? String(r.contact_email) : null,
              phone: r.contact_phone ? String(r.contact_phone) : null,
              role: r.contact_role ? String(r.contact_role) : null,
            }));

          if (contacts.length) {
            const { error: cErr } = await supabase.from("client_contacts").insert(contacts as any);
            if (cErr) throw cErr;
          }
          count++;
        }
        setImportedCount(count);
      } else {
        // Orders: first resolve client IDs, then insert
        const { data: clients } = await supabase.from("clients").select("id, company_name");
        const clientMap = new Map(clients?.map((c) => [c.company_name.toLowerCase(), c.id]) || []);

        let count = 0;
        for (const row of mapped) {
          const clientId = clientMap.get(String(row.client_company || "").toLowerCase());
          if (!clientId) continue;

          const { data: order, error } = await supabase
            .from("orders")
            .insert({
              client_id: clientId,
              status: row.status || "completed",
              total_amount: row.total_amount ? Number(row.total_amount) : 0,
              notes: row.notes || null,
              tracking_number: row.tracking_number || null,
              created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
            } as any)
            .select("id")
            .single();

          if (error) throw error;

          if (row.product_name && order) {
            const { data: products } = await supabase
              .from("products")
              .select("id")
              .ilike("name", `%${row.product_name}%`)
              .limit(1);

            if (products?.length) {
              await supabase.from("order_items").insert({
                order_id: order.id,
                product_id: products[0].id,
                quantity: Number(row.quantity) || 1,
                unit_price: Number(row.unit_price) || 0,
                subtotal: (Number(row.quantity) || 1) * (Number(row.unit_price) || 0),
              } as any);
            }
          }
          count++;
        }
        setImportedCount(count);
      }

      setStep("done");
      toast.success(`Importazione completata: ${importedCount || "tutti i"} record importati`);
    } catch (err: any) {
      toast.error("Errore durante l'importazione: " + err.message);
      setStep("preview");
    }
  }, [getMappedData, importType]);

  const reset = () => {
    setStep("upload");
    setFileColumns([]);
    setRawData([]);
    setMappings({});
    setErrors([]);
    setImportedCount(0);
  };

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="flex gap-3">
        <Button
          variant={importType === "clients" ? "default" : "outline"}
          onClick={() => { setImportType("clients"); reset(); }}
        >
          Anagrafica Clienti
        </Button>
        <Button
          variant={importType === "orders" ? "default" : "outline"}
          onClick={() => { setImportType("orders"); reset(); }}
        >
          Storico Ordini
        </Button>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <span className="text-sm text-muted-foreground">
                Trascina o clicca per caricare un file <strong>CSV</strong> o <strong>XLSX</strong>
              </span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Mapping Colonne ({rawData.length} righe trovate)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-40 text-sm font-medium text-foreground">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </span>
                <Select value={mappings[f.key] || "__none__"} onValueChange={(v) => setMappings((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="— Non mappato —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Non mappato —</SelectItem>
                    {fileColumns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mappings[f.key] && <CheckCircle2 className="h-4 w-4 text-success" />}
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={reset}>Annulla</Button>
              <Button onClick={validate}>Continua</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {errors.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  {errors.length} errori di validazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-sm text-destructive">
                      Riga {e.row}: {e.field} — {e.message}
                    </p>
                  ))}
                  {errors.length > 20 && (
                    <p className="text-sm text-muted-foreground">...e altri {errors.length - 20} errori</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Preview — {rawData.length} record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      {fields.filter((f) => mappings[f.key]).map((f) => (
                        <TableHead key={f.key} className="text-xs">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {fields.filter((f) => mappings[f.key]).map((f) => (
                          <TableCell key={f.key} className="text-xs">
                            {row[mappings[f.key]] ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rawData.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2">...mostrando le prime 10 righe di {rawData.length}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("mapping")}>← Torna al Mapping</Button>
            <Button onClick={doImport} disabled={errors.some((e) => fields.find((f) => f.label === e.field)?.required)}>
              Importa {rawData.length} record
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importazione in corso...</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Card className="border-success/50">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-lg font-semibold text-foreground">Importazione completata!</p>
            <p className="text-muted-foreground">{importedCount} record importati con successo</p>
            <Button onClick={reset}>Nuova importazione</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

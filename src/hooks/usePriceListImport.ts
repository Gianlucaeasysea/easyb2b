import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ERROR_MESSAGES } from "@/lib/errorMessages";
import { validateImportRows, type ParsedImportRow, type ValidationResult } from "@/lib/priceListImportValidator";

export interface ParsedRow {
  [key: string]: any;
}

export interface ImportState {
  step: "idle" | "mapping" | "validation";
  data: ParsedRow[];
  headers: string[];
  fieldMapping: Record<string, string>;
  targetListId: string | null;
  validationResult: ValidationResult | null;
  isImporting: boolean;
}

export function usePriceListImport(products: any[] | undefined) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importState, setImportState] = useState<ImportState>({
    step: "idle",
    data: [],
    headers: [],
    fieldMapping: {},
    targetListId: null,
    validationResult: null,
    isImporting: false,
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (json.length === 0) { toast.error(ERROR_MESSAGES.FILE_EMPTY); return; }
      const headers = Object.keys(json[0]);
      setImportState({
        step: "mapping",
        data: json,
        headers,
        fieldMapping: {
          product_name: headers.find(h => /product|prodotto|nome/i.test(h)) || "",
          sku: headers.find(h => /sku|codice/i.test(h)) || "",
          price: headers.find(h => /price|prezzo|costo/i.test(h)) || "",
        },
        targetListId: null,
        validationResult: null,
        isImporting: false,
      });
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, []);

  const setFieldMapping = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setImportState(prev => ({ ...prev, fieldMapping: updater(prev.fieldMapping) }));
  };

  const setTargetListId = (id: string | null) => {
    setImportState(prev => ({ ...prev, targetListId: id }));
  };

  const resetImport = () => {
    setImportState({ step: "idle", data: [], headers: [], fieldMapping: {}, targetListId: null, validationResult: null, isImporting: false });
  };

  const runValidation = () => {
    const { fieldMapping, data, targetListId } = importState;
    if (!targetListId) { toast.error(ERROR_MESSAGES.PRICE_LIST_SELECT_REQUIRED); return; }
    const skuCol = fieldMapping.sku;
    const priceCol = fieldMapping.price;
    if (!priceCol) { toast.error(ERROR_MESSAGES.PRICE_LIST_MAP_PRICE); return; }
    if (!skuCol && !fieldMapping.product_name) { toast.error(ERROR_MESSAGES.PRICE_LIST_MAP_IDENTIFIER); return; }

    const existingSkus = new Set((products || []).filter(p => p.sku).map(p => p.sku!.toUpperCase()));

    const parsedRows: ParsedImportRow[] = data.map((row, i) => ({
      rowNumber: i + 2, // +2 because row 1 is header
      sku: skuCol ? String(row[skuCol] || '').trim() : '',
      price: String(row[priceCol] || ''),
    }));

    const result = validateImportRows(parsedRows, existingSkus);
    setImportState(prev => ({ ...prev, step: "validation", validationResult: result }));
  };

  const executeImport = async () => {
    const { targetListId, fieldMapping, validationResult } = importState;
    if (!targetListId || !validationResult) return;

    setImportState(prev => ({ ...prev, isImporting: true }));

    const nameCol = fieldMapping.product_name;
    const skuCol = fieldMapping.sku;
    let matched = 0;
    const items: any[] = [];

    for (const row of validationResult.valid) {
      const price = row.normalizedPrice;
      if (price == null) continue;

      let prod: any = undefined;
      if (skuCol && row.sku) {
        prod = products?.find(p => p.sku?.toUpperCase() === row.sku.toUpperCase());
      }
      // Fallback to name matching from original data
      if (!prod && nameCol) {
        const originalRow = importState.data[row.rowNumber - 2];
        if (originalRow && originalRow[nameCol]) {
          prod = products?.find(p => p.name.toLowerCase().includes(String(originalRow[nameCol]).toLowerCase().trim()));
        }
      }
      if (prod) {
        items.push({ price_list_id: targetListId, product_id: prod.id, custom_price: price });
        matched++;
      }
    }

    if (items.length === 0) {
      toast.error(ERROR_MESSAGES.PRICE_LIST_NO_MATCH);
      setImportState(prev => ({ ...prev, isImporting: false }));
      return;
    }

    const { error } = await supabase.from("price_list_items").upsert(items, { onConflict: "price_list_id,product_id" });
    if (error) {
      toast.error(ERROR_MESSAGES.PRICE_LIST_IMPORT_FAILED);
      setImportState(prev => ({ ...prev, isImporting: false }));
    } else {
      qc.invalidateQueries({ queryKey: ["price-list-items"] });
      qc.invalidateQueries({ queryKey: ["price-list-item-counts"] });
      toast.success(`Importati ${matched} prodotti nel listino`);
      resetImport();
    }
  };

  return {
    importState,
    fileInputRef,
    handleFileUpload,
    setFieldMapping,
    setTargetListId,
    resetImport,
    runValidation,
    executeImport,
  };
}

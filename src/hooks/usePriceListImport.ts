import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ParsedRow {
  [key: string]: any;
}

export interface ImportState {
  step: "idle" | "mapping";
  data: ParsedRow[];
  headers: string[];
  fieldMapping: Record<string, string>;
  targetListId: string | null;
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
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      if (json.length === 0) { toast.error("File vuoto"); return; }
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
    setImportState({ step: "idle", data: [], headers: [], fieldMapping: {}, targetListId: null });
  };

  const normalizePrice = (value: string): number => {
    return parseFloat(String(value).replace(",", "."));
  };

  const executeImport = async () => {
    const { targetListId, fieldMapping, data } = importState;
    if (!targetListId) { toast.error("Seleziona un listino"); return; }
    const nameCol = fieldMapping.product_name;
    const skuCol = fieldMapping.sku;
    const priceCol = fieldMapping.price;
    if (!priceCol) { toast.error("Mappa almeno il campo Prezzo"); return; }
    if (!nameCol && !skuCol) { toast.error("Mappa almeno Nome Prodotto o SKU"); return; }
    let matched = 0;
    const items: any[] = [];
    for (const row of data) {
      const price = normalizePrice(String(row[priceCol]));
      if (isNaN(price)) continue;
      let prod: any = undefined;
      if (skuCol && row[skuCol]) prod = products?.find(p => p.sku?.toLowerCase() === String(row[skuCol]).toLowerCase().trim());
      if (!prod && nameCol && row[nameCol]) prod = products?.find(p => p.name.toLowerCase().includes(String(row[nameCol]).toLowerCase().trim()));
      if (prod) { items.push({ price_list_id: targetListId, product_id: prod.id, custom_price: price }); matched++; }
    }
    if (items.length === 0) { toast.error("Nessun prodotto trovato."); return; }
    const { error } = await supabase.from("price_list_items").upsert(items, { onConflict: "price_list_id,product_id" });
    if (error) toast.error(error.message);
    else {
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
    executeImport,
  };
}

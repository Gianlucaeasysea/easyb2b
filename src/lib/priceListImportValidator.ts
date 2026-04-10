export interface ParsedImportRow {
  rowNumber: number;
  sku: string;
  price: string;
  normalizedPrice?: number;
}

export interface ValidationError {
  rowNumber: number;
  sku: string;
  field: 'sku' | 'price';
  message: string;
}

export interface ValidationResult {
  valid: ParsedImportRow[];
  errors: ValidationError[];
  warnings: ValidationError[];
  duplicateSkus: string[];
}

const MIN_PRICE = 0.01;
const MAX_PRICE = 999999.99;

export function normalizePrice(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.trim().replace(/[€$£\s]/g, '');

  // European format: "1.234,56"
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }

  // Comma decimal: "123,45"
  if (/^\d+(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  // Standard dot decimal: "123.45"
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateImportRows(
  rows: ParsedImportRow[],
  existingSkus: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const seenSkus = new Map<string, number>();
  const valid: ParsedImportRow[] = [];
  const duplicateSkus: string[] = [];

  for (const row of rows) {
    let rowHasError = false;

    if (!row.sku || row.sku.trim() === '') {
      errors.push({ rowNumber: row.rowNumber, sku: row.sku, field: 'sku', message: 'SKU mancante' });
      rowHasError = true;
    } else {
      const normalizedSku = row.sku.trim().toUpperCase();

      if (seenSkus.has(normalizedSku)) {
        warnings.push({
          rowNumber: row.rowNumber, sku: normalizedSku, field: 'sku',
          message: `SKU duplicato (già presente alla riga ${seenSkus.get(normalizedSku)}) — verrà usato l'ultimo valore`,
        });
        duplicateSkus.push(normalizedSku);
      } else {
        seenSkus.set(normalizedSku, row.rowNumber);
      }

      if (existingSkus.size > 0 && !existingSkus.has(normalizedSku)) {
        warnings.push({
          rowNumber: row.rowNumber, sku: normalizedSku, field: 'sku',
          message: 'SKU non trovato nel catalogo prodotti — verrà ignorato',
        });
        rowHasError = true;
      }
    }

    const normalizedPrice = normalizePrice(row.price);
    if (normalizedPrice === null) {
      errors.push({ rowNumber: row.rowNumber, sku: row.sku, field: 'price', message: `Prezzo non valido: "${row.price}"` });
      rowHasError = true;
    } else if (normalizedPrice < MIN_PRICE) {
      errors.push({ rowNumber: row.rowNumber, sku: row.sku, field: 'price', message: `Prezzo troppo basso: ${normalizedPrice} (minimo: ${MIN_PRICE})` });
      rowHasError = true;
    } else if (normalizedPrice > MAX_PRICE) {
      errors.push({ rowNumber: row.rowNumber, sku: row.sku, field: 'price', message: `Prezzo troppo alto: ${normalizedPrice} (massimo: ${MAX_PRICE})` });
      rowHasError = true;
    } else {
      row.normalizedPrice = roundToTwoDecimals(normalizedPrice);
    }

    if (!rowHasError) {
      valid.push(row);
    }
  }

  return { valid, errors, warnings, duplicateSkus };
}

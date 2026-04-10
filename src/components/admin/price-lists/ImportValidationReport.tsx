import { ValidationResult } from '@/lib/priceListImportValidator';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  result: ValidationResult;
  totalRows: number;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

export function ImportValidationReport({ result, totalRows, onConfirm, onCancel, isImporting }: Props) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;
  const canImport = result.valid.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-center">
          <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{result.valid.length}</div>
          <div className="text-sm text-green-600 dark:text-green-500">Righe valide</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg text-center">
          <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</div>
          <div className="text-sm text-red-600 dark:text-red-500">Errori</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg text-center">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{result.warnings.length}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-500">Avvisi</div>
        </div>
      </div>

      {hasErrors && (
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-40 overflow-y-auto">
          <h4 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
            <XCircle className="h-4 w-4" /> Errori (queste righe non verranno importate)
          </h4>
          {result.errors.map((err, i) => (
            <div key={i} className="text-sm text-red-600 dark:text-red-400">
              Riga {err.rowNumber} — {err.sku}: {err.message}
            </div>
          ))}
        </div>
      )}

      {hasWarnings && (
        <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-h-40 overflow-y-auto">
          <h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Avvisi
          </h4>
          {result.warnings.map((warn, i) => (
            <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
              Riga {warn.rowNumber} — {warn.sku}: {warn.message}
            </div>
          ))}
        </div>
      )}

      {result.duplicateSkus.length > 0 && (
        <p className="text-xs text-muted-foreground">
          SKU duplicati trovati: {result.duplicateSkus.join(', ')}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>Annulla</Button>
        {canImport && (
          <Button onClick={onConfirm} disabled={isImporting}>
            {isImporting ? 'Importazione...' : `Importa ${result.valid.length} prodotti`}
          </Button>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onDeselect: () => void;
  children: React.ReactNode;
}

const BulkActionBar = ({ count, onDeselect, children }: BulkActionBarProps) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-xl shadow-black/20 animate-in slide-in-from-bottom-4 duration-300">
      <span className="text-sm font-heading font-semibold text-foreground whitespace-nowrap">
        {count} selezionati
      </span>
      <div className="h-5 w-px bg-border" />
      <div className="flex items-center gap-2 flex-wrap">
        {children}
      </div>
      <div className="h-5 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onDeselect} className="gap-1 text-muted-foreground hover:text-foreground h-8">
        <X size={14} /> Deseleziona
      </Button>
    </div>
  );
};

export default BulkActionBar;

/**
 * Run a bulk operation with Promise.allSettled and return summary.
 */
export async function runBulkOperation<T>(
  ids: string[],
  operation: (id: string) => Promise<T>,
): Promise<{ ok: number; errors: number }> {
  const results = await Promise.allSettled(ids.map(id => operation(id)));
  const ok = results.filter(r => r.status === "fulfilled").length;
  const errors = results.filter(r => r.status === "rejected").length;
  return { ok, errors };
}

export function bulkResultToast(
  toast: (msg: string) => void,
  toastError: (msg: string) => void,
  result: { ok: number; errors: number },
  label: string,
) {
  if (result.errors === 0) {
    toast(`${result.ok} ${label} updated`);
  } else {
    toastError(`Completed: ${result.ok}, Errors: ${result.errors}`);
  }
}

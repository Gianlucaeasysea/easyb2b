import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PriceCheckData } from "@/types/orders";

interface PriceCheckDialogProps {
  data: PriceCheckData | null;
  duplicating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PriceCheckDialog = ({ data, duplicating, onConfirm, onCancel }: PriceCheckDialogProps) => (
  <Dialog open={!!data} onOpenChange={() => onCancel()}>
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Price check before duplicating</DialogTitle>
      </DialogHeader>
      {data && (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-right">Orig. Price</TableHead>
                  <TableHead className="text-xs text-right">Current Price</TableHead>
                  <TableHead className="text-xs text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => {
                  const diff = item.available && item.currentPrice !== null ? item.currentPrice - item.originalPrice : null;
                  return (
                    <TableRow key={item.product_id}>
                      <TableCell>
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">€{item.originalPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {!item.available || item.currentPrice === null
                          ? <span className="text-destructive font-medium">Unavailable</span>
                          : `€${item.currentPrice.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {!item.available || item.currentPrice === null ? (
                          <span className="text-destructive">Removed</span>
                        ) : diff === 0 ? (
                          <span className="text-success">Unchanged</span>
                        ) : diff! > 0 ? (
                          <span className="text-destructive">+€{diff!.toFixed(2)} ↑</span>
                        ) : (
                          <span className="text-success">-€{Math.abs(diff!).toFixed(2)} ↓</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between text-sm mt-2 p-3 bg-secondary/50 rounded-lg">
            <span className="text-muted-foreground">
              Original total: <span className="font-mono font-semibold text-foreground">€{data.originalTotal.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              New total: <span className="font-mono font-semibold text-primary">€{data.newTotal.toFixed(2)}</span>
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={onConfirm} disabled={duplicating}>
              {duplicating ? "Duplicating..." : "Duplicate with current prices"}
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default PriceCheckDialog;

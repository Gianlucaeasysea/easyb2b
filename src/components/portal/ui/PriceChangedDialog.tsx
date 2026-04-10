import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PriceChangedDialog({ isOpen, warnings, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Order changes detected
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            Some changes were detected since you added these products:
          </p>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm flex items-start gap-2 bg-yellow-500/10 rounded-lg px-3 py-2">
                <span className="text-yellow-500 mt-0.5">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground pt-1">
            Do you want to proceed with the updated order?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm & Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

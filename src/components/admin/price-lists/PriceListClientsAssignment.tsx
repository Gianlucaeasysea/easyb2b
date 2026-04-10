import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X } from "lucide-react";

interface PriceListClientsAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  assignedClientIds: Set<string>;
  clients: any[];
  onAssign: (clientId: string) => Promise<void>;
  onUnassign: (clientId: string) => Promise<void>;
}

export default function PriceListClientsAssignment({
  open, onOpenChange, listName, assignedClientIds, clients, onAssign, onUnassign,
}: PriceListClientsAssignmentProps) {
  const [clientSearch, setClientSearch] = useState("");

  const filteredClients = clients?.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gestisci Clienti — {listName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {assignedClientIds.size > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Clienti assegnati ({assignedClientIds.size})</Label>
              <div className="space-y-1 mt-2">
                {Array.from(assignedClientIds).map(cid => {
                  const cl = clients?.find(c => c.id === cid);
                  return cl ? (
                    <div key={cid} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
                      <span className="text-sm font-medium">{cl.company_name}</span>
                      <Button variant="ghost" size="sm" onClick={() => onUnassign(cid)} className="text-destructive h-7">
                        <X className="h-3 w-3 mr-1" /> Rimuovi
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Aggiungi clienti</Label>
            <div className="relative mt-2 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input placeholder="Cerca cliente..." className="pl-9 h-9" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            </div>
            <ScrollArea className="max-h-60">
              <div className="space-y-1">
                {filteredClients.filter(c => !assignedClientIds.has(c.id)).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer" onClick={() => onAssign(c.id)}>
                    <div>
                      <span className="text-sm font-medium">{c.company_name}</span>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

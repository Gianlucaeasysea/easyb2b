import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

interface PriceListEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: any;
  setForm: (updater: (prev: any) => any) => void;
  tiers: any[];
  clients?: any[];
  onSave: () => void;
  isSaving: boolean;
}

export default function PriceListEditor({
  open, onOpenChange, mode, form, setForm, tiers, clients, onSave, isSaving,
}: PriceListEditorProps) {
  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "Nuovo Listino Prezzi" : "Modifica Listino"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="es. Listino Gold 2024"
            />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label>Classe di Sconto</Label>
            <Select
              value={form.discount_tier_id || "__none__"}
              onValueChange={v => setForm(f => ({ ...f, discount_tier_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nessuna —</SelectItem>
                {tiers?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label} ({t.discount_pct}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCreate && (
            <>
              <div>
                <Label>Sconto Base % (auto su tutti i prodotti B2B)</Label>
                <Input
                  type="number" min={0} max={100}
                  value={form.base_discount_pct}
                  onChange={e => setForm(f => ({ ...f, base_discount_pct: Number(e.target.value) }))}
                  placeholder="es. 20"
                />
              </div>
              <div>
                <Label>Primo cliente (opzionale)</Label>
                <Select
                  value={form.client_id || "__none__"}
                  onValueChange={v => setForm(f => ({ ...f, client_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nessuno —</SelectItem>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <Button onClick={onSave} disabled={!form.name || isSaving} className="w-full">
            {isCreate ? "Crea Listino" : <><Save className="h-4 w-4 mr-1" /> Salva Modifiche</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

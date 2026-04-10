import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Save } from "lucide-react";

interface Props {
  bank: { bank_name: string; iban: string; swift_bic: string; account_holder: string };
  setBank: (fn: (b: any) => any) => void;
  saveBank: { mutate: () => void; isPending: boolean };
}

export const ClientBankPanel = ({ bank, setBank, saveBank }: Props) => (
  <div className="glass-card-solid p-6">
    <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><CreditCard size={16} /> Bank Details</h2>
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Account Holder</Label>
        <Input value={bank.account_holder} onChange={e => setBank(b => ({ ...b, account_holder: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Bank Name</Label>
        <Input value={bank.bank_name} onChange={e => setBank(b => ({ ...b, bank_name: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">IBAN</Label>
        <Input value={bank.iban} onChange={e => setBank(b => ({ ...b, iban: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">SWIFT / BIC</Label>
        <Input value={bank.swift_bic} onChange={e => setBank(b => ({ ...b, swift_bic: e.target.value }))} className="mt-1 bg-secondary border-border rounded-lg" />
      </div>
      <Button size="sm" onClick={() => saveBank.mutate()} disabled={saveBank.isPending} className="w-full bg-foreground text-background hover:bg-foreground/90 gap-1 font-heading font-semibold">
        <Save size={14} /> Save Bank Details
      </Button>
    </div>
  </div>
);

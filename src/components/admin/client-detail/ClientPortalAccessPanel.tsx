import { Button } from "@/components/ui/button";
import { KeyRound, UserPlus, Copy, Check } from "lucide-react";

interface Props {
  client: any;
  copied: string | null;
  copyToClipboard: (text: string, label: string) => void;
  resetDealerPassword: (email: string) => void;
  onCreateAccount: () => void;
}

export const ClientPortalAccessPanel = ({ client, copied, copyToClipboard, resetDealerPassword, onCreateAccount }: Props) => (
  <div className="glass-card-solid p-6">
    <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2"><KeyRound size={16} /> Portal Access</h2>
    {client?.user_id ? (
      <div className="space-y-3">
        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
          <p className="text-xs text-success font-semibold mb-2">✅ Account Active</p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-foreground">{client.email}</p>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(client.email || "", "email")}>
                  {copied === "email" ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => resetDealerPassword(client.email)}>
                <KeyRound size={12} /> Reset Password
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">No portal account created</p>
        <Button size="sm" onClick={onCreateAccount} className="w-full gap-1" disabled={!client?.email}>
          <UserPlus size={14} /> Create Dealer Account
        </Button>
        {!client?.email && <p className="text-[10px] text-destructive">⚠️ Please add an email to the client first</p>}
      </div>
    )}
  </div>
);

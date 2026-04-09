import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Shield, MailX, Trash2, Plus, Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  admin: "🔑 Admin",
  sales: "📈 Sales",
  operations: "⚙️ Operations",
  dealer: "🏪 Dealer",
};

const AdminSettings = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [confirmRole, setConfirmRole] = useState<{ userId: string; email: string; oldRole: string; newRole: string } | null>(null);
  const [newSuppressEmail, setNewSuppressEmail] = useState("");
  const [showAddSuppress, setShowAddSuppress] = useState(false);
  const [newToEmail, setNewToEmail] = useState("");
  const [newBccEmail, setNewBccEmail] = useState("");

  // User roles with profiles
  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      const { data: profiles } = await supabase.from("profiles").select("*");
      return (roles || []).map(r => {
        const profile = profiles?.find(p => p.user_id === r.user_id);
        return {
          ...r,
          email: profile?.email || r.user_id.slice(0, 8) + "…",
          name: profile?.contact_name || profile?.company_name || "—",
        };
      });
    },
  });

  // Suppressed emails
  const { data: suppressedEmails } = useQuery({
    queryKey: ["admin-suppressed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppressed_emails").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ruolo aggiornato");
      setConfirmRole(null);
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeSuppress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppressed_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email rimossa dalla lista di soppressione");
      qc.invalidateQueries({ queryKey: ["admin-suppressed-emails"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addSuppress = useMutation({
    mutationFn: async () => {
      if (!newSuppressEmail) throw new Error("Email richiesta");
      const { error } = await supabase.from("suppressed_emails").insert({
        email: newSuppressEmail.toLowerCase().trim(),
        reason: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email aggiunta alla lista di soppressione");
      setNewSuppressEmail("");
      setShowAddSuppress(false);
      qc.invalidateQueries({ queryKey: ["admin-suppressed-emails"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Notification email config
  const { data: notifEmails } = useQuery({
    queryKey: ["admin-notif-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "notification_emails")
        .single();
      if (error) throw error;
      return (data?.value || { to: [], bcc: [] }) as { to: string[]; bcc: string[] };
    },
  });

  const saveNotifEmails = useMutation({
    mutationFn: async (val: { to: string[]; bcc: string[] }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: val as any, updated_at: new Date().toISOString() })
        .eq("key", "notification_emails");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Destinatari notifiche aggiornati");
      qc.invalidateQueries({ queryKey: ["admin-notif-emails"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmail = (type: "to" | "bcc", email: string) => {
    if (!isValidEmail(email)) { toast.error("Email non valida"); return; }
    const current = notifEmails || { to: [], bcc: [] };
    if (current[type].includes(email.toLowerCase())) { toast.error("Email già presente"); return; }
    saveNotifEmails.mutate({ ...current, [type]: [...current[type], email.toLowerCase()] });
    if (type === "to") setNewToEmail(""); else setNewBccEmail("");
  };

  const removeEmail = (type: "to" | "bcc", email: string) => {
    const current = notifEmails || { to: [], bcc: [] };
    saveNotifEmails.mutate({ ...current, [type]: current[type].filter(e => e !== email) });
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">Platform configuration</p>

      <div className="space-y-8">
        {/* Existing cards */}
        <div className="glass-card-solid p-6">
          <h3 className="font-heading font-bold text-foreground mb-2">Shopify Integration</h3>
          <p className="text-sm text-muted-foreground">Connect your Shopify store to sync products, pricing, and inventory.</p>
        </div>
        <div className="glass-card-solid p-6">
          <h3 className="font-heading font-bold text-foreground mb-2">Discount Classes</h3>
          <p className="text-sm text-muted-foreground">Configure discount tiers: A (-30%), B (-20%), C (-15%), D (-10%)</p>
        </div>
        <div className="glass-card-solid p-6">
          <h3 className="font-heading font-bold text-foreground mb-2">Notifications</h3>
          <p className="text-sm text-muted-foreground">Configure email, WhatsApp, and in-app notification settings.</p>
        </div>

        {/* Notification Email Recipients */}
        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={18} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground">Email Notifications</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Recipients for email notifications on new orders and updates.</p>

          {/* TO recipients */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-foreground mb-2">Recipients (TO)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {notifEmails?.to?.map(email => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs py-1 px-2">
                  {email}
                  <button onClick={() => removeEmail("to", email)} className="ml-1 hover:text-destructive"><X size={12} /></button>
                </Badge>
              ))}
              {!notifEmails?.to?.length && <span className="text-xs text-muted-foreground italic">No recipients</span>}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Add email..."
                value={newToEmail}
                onChange={e => setNewToEmail(e.target.value)}
                className="h-8 text-xs max-w-xs"
                onKeyDown={e => e.key === "Enter" && newToEmail && addEmail("to", newToEmail)}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => addEmail("to", newToEmail)} disabled={!newToEmail}>
                <Plus size={12} /> Add
              </Button>
            </div>
          </div>

          {/* BCC recipients */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Blind Carbon Copy (BCC)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {notifEmails?.bcc?.map(email => (
                <Badge key={email} variant="outline" className="gap-1 text-xs py-1 px-2">
                  {email}
                  <button onClick={() => removeEmail("bcc", email)} className="ml-1 hover:text-destructive"><X size={12} /></button>
                </Badge>
              ))}
              {!notifEmails?.bcc?.length && <span className="text-xs text-muted-foreground italic">No BCC recipients</span>}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Add BCC email..."
                value={newBccEmail}
                onChange={e => setNewBccEmail(e.target.value)}
                className="h-8 text-xs max-w-xs"
                onKeyDown={e => e.key === "Enter" && newBccEmail && addEmail("bcc", newBccEmail)}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => addEmail("bcc", newBccEmail)} disabled={!newBccEmail}>
                <Plus size={12} /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="glass-card-solid p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-primary" />
            <h3 className="font-heading font-bold text-foreground">User Role Management</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles?.map(ur => {
                  const isCurrentUser = ur.user_id === user?.id;
                  return (
                    <TableRow key={ur.id}>
                      <TableCell className="text-sm">{ur.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ur.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{roleLabels[ur.role] || ur.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ur.role}
                          onValueChange={(v) => {
                            if (isCurrentUser && ur.role === "admin" && v !== "admin") {
                              toast.error("You cannot remove the admin role from your own account");
                              return;
                            }
                            setConfirmRole({ userId: ur.user_id, email: ur.email, oldRole: ur.role, newRole: v });
                          }}
                        >
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="dealer">Dealer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Email Suppression */}
        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MailX size={18} className="text-destructive" />
              <h3 className="font-heading font-bold text-foreground">Suppressed Emails</h3>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddSuppress(true)} className="gap-1">
              <Plus size={14} /> Add
            </Button>
          </div>
          {!suppressedEmails?.length ? (
            <p className="text-sm text-muted-foreground py-4">No suppressed emails.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressedEmails.map(se => (
                    <TableRow key={se.id}>
                      <TableCell className="text-sm font-mono">{se.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{se.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(se.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeSuppress.mutate(se.id)} className="text-destructive hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Role Change Dialog */}
      <Dialog open={!!confirmRole} onOpenChange={() => setConfirmRole(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Role Change</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to change the role of <strong>{confirmRole?.email}</strong> from{" "}
            <Badge variant="outline" className="text-xs">{roleLabels[confirmRole?.oldRole || ""]}</Badge> to{" "}
            <Badge variant="outline" className="text-xs">{roleLabels[confirmRole?.newRole || ""]}</Badge>?
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setConfirmRole(null)}>Cancel</Button>
            <Button onClick={() => confirmRole && changeRole.mutate({ userId: confirmRole.userId, newRole: confirmRole.newRole })} disabled={changeRole.isPending}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Suppress Email Dialog */}
      <Dialog open={showAddSuppress} onOpenChange={setShowAddSuppress}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Suppressed Email</DialogTitle></DialogHeader>
          <Input
            type="email"
            placeholder="email@example.com"
            value={newSuppressEmail}
            onChange={e => setNewSuppressEmail(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setShowAddSuppress(false)}>Cancel</Button>
            <Button onClick={() => addSuppress.mutate()} disabled={!newSuppressEmail || addSuppress.isPending}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;

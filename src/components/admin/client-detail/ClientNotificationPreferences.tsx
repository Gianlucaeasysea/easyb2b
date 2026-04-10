import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  { key: "account_credentials", label: "Account Credentials", description: "Email with portal access credentials", category: "Account" },
  { key: "dealer_request_confirmation", label: "Dealer Request Confirmation", description: "Confirmation email after submitting 'Become a Dealer' form", category: "Account" },
  { key: "order_received", label: "Order Received", description: "Order receipt confirmation from portal", category: "Orders" },
  { key: "order_confirmed", label: "Order Confirmed", description: "Order confirmation and approval notification", category: "Orders" },
  { key: "order_status_update", label: "Order Status Update", description: "Order status changes (shipped, processing, etc.)", category: "Orders" },
  { key: "order_documents_ready", label: "Documents Ready", description: "New documents uploaded (invoice, DDT, packing list)", category: "Orders" },
  { key: "shipping_update", label: "Shipping Update", description: "Tracking number and delivery notifications", category: "Shipping" },
  { key: "promotional_updates", label: "Promos & News", description: "Promotions, new products, and special offers", category: "Marketing" },
];

export const ClientNotificationPreferences = ({ clientId }: { clientId: string }) => {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["client-notification-prefs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notification_preferences")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const togglePref = useMutation({
    mutationFn: async ({ type, enabled }: { type: string; enabled: boolean }) => {
      const existing = prefs?.find(p => p.notification_type === type);
      if (existing) {
        const { error } = await supabase
          .from("client_notification_preferences")
          .update({ enabled })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_notification_preferences")
          .insert({ client_id: clientId, notification_type: type, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notification-prefs", clientId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isEnabled = (type: string) => {
    const pref = prefs?.find(p => p.notification_type === type);
    return pref ? pref.enabled : true;
  };

  return (
    <div className="glass-card-solid p-6">
      <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
        <Bell size={16} /> Notifications
      </h2>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-4">
          {["Account", "Orders", "Shipping", "Marketing"].map(cat => {
            const items = NOTIFICATION_TYPES.filter(nt => nt.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{cat}</p>
                <div className="space-y-2">
                  {items.map(nt => (
                    <div key={nt.key} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{nt.label}</p>
                        <p className="text-xs text-muted-foreground">{nt.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled(nt.key)}
                        onCheckedChange={(checked) => togglePref.mutate({ type: nt.key, enabled: checked })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, FileText, Package, Info, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText size={16} className="text-primary" />,
  order: <Package size={16} className="text-primary" />,
  info: <Info size={16} className="text-muted-foreground" />,
};

const formatDateGroup = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
};

const DealerNotifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications?.filter(n => !n.read).map(n => n.id) || [];
      if (!unreadIds.length) return;
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      toast.success("All notifications marked as read");
    },
  });

  const markRead = async (id: string) => {
    await supabase.from("client_notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["client-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  // Group by date
  const grouped: Record<string, typeof notifications> = {};
  notifications?.forEach(n => {
    const key = format(new Date(n.created_at), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(n);
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-primary" />
          <h1 className="text-xl font-heading font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => markAllRead.mutate()}>
            <CheckCheck size={14} /> Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !notifications?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {formatDateGroup(dateKey)}
              </p>
              <div className="space-y-1.5">
                {items!.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      n.read
                        ? "bg-background border-border hover:bg-muted/30"
                        : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                    }`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.order_id) navigate(`/portal/orders`);
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {typeIcons[n.type] || typeIcons.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? "text-foreground" : "text-foreground font-semibold"}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "HH:mm")}
                      </p>
                    </div>
                    {n.order_id && (
                      <ExternalLink size={12} className="text-muted-foreground mt-1 shrink-0" />
                    )}
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerNotifications;

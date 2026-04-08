import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, FileText, Package, Info, CheckCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { showErrorToast } from "@/lib/errorHandler";
import { useState } from "react";

const typeIcons: Record<string, React.ReactNode> = {
  order: <Package size={14} className="text-primary" />,
  document: <FileText size={14} className="text-primary" />,
  info: <Info size={14} className="text-muted-foreground" />,
  new_order: <Package size={14} className="text-chart-2" />,
  new_request: <UserPlus size={14} className="text-chart-4" />,
  payment_received: <Package size={14} className="text-chart-1" />,
  lead_assigned: <UserPlus size={14} className="text-chart-3" />,
  new_message: <FileText size={14} className="text-chart-5" />,
};

interface NotificationsDropdownProps {
  /** The base path for the "see all" link, e.g. "/admin" or "/crm" */
  basePath: string;
  /** Role filter: only show notifications targeting this role */
  targetRole: string;
}

export function NotificationsDropdown({ basePath, targetRole }: NotificationsDropdownProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryKey = ["notifications", targetRole];

  const { data: notifications = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      // Fetch notifications for this role or targeted to this user
      const { data, error } = await supabase
        .from("client_notifications")
        .select("*")
        .or(`target_role.eq.${targetRole},target_user_id.eq.${user?.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (!unreadIds.length) return;
      const { error } = await supabase
        .from("client_notifications")
        .update({ read: true })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => showErrorToast(error, "NotificationsDropdown.markAllRead"),
  });

  const handleClick = async (n: typeof notifications[0]) => {
    if (!n.read) {
      await supabase.from("client_notifications").update({ read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey });
    }
    setOpen(false);
    // Navigate based on notification type
    if (n.order_id) {
      navigate(`${basePath}/orders/${n.order_id}`);
    } else if (n.type === "new_request" || n.type === "info") {
      if (basePath === "/crm") navigate("/crm/requests");
      else navigate(`${basePath}/requests`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-heading font-semibold text-foreground">Notifiche</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck size={12} /> Segna tutto come letto
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nessuna notifica</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-2.5 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${
                  n.read ? "hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcons[n.type] || typeIcons.info}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.read ? "text-foreground" : "text-foreground font-semibold"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(new Date(n.created_at), "dd/MM HH:mm")}
                  </p>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

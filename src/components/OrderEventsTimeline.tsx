import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Clock, CheckCircle, Truck, Package, FileText, XCircle, Bell, Mail,
} from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
  order_created: Package,
  status_change: CheckCircle,
  document_uploaded: FileText,
  email_sent: Mail,
  shipping_update: Truck,
  order_rejected: XCircle,
  notification: Bell,
};

const EVENT_COLORS: Record<string, string> = {
  order_created: "bg-primary/15 text-primary",
  status_change: "bg-chart-4/15 text-chart-4",
  document_uploaded: "bg-warning/15 text-warning",
  email_sent: "bg-success/15 text-success",
  shipping_update: "bg-primary/15 text-primary",
  order_rejected: "bg-destructive/15 text-destructive",
  notification: "bg-muted text-muted-foreground",
};

const OrderEventsTimeline = ({ orderId }: { orderId: string }) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ["order-events", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Caricamento...</p>;
  if (!events?.length) return <p className="text-xs text-muted-foreground italic">Nessun evento registrato.</p>;

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = EVENT_ICONS[event.event_type] || Clock;
        const colorClass = EVENT_COLORS[event.event_type] || "bg-muted text-muted-foreground";
        const isLast = i === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon size={13} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border min-h-[20px]" />}
            </div>
            <div className="pb-4 pt-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight">{event.title}</p>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderEventsTimeline;

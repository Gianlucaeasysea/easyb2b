import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNewOrderNotifications() {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setNewOrderCount((prev) => prev + 1);
          // Invalidate the admin-new-orders query so the list refreshes
          queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          toast.info("📦 Nuovo ordine ricevuto!", {
            description: `Order #${(payload.new as any).order_code || (payload.new as any).id?.slice(0, 8)}`,
            action: { label: "Vedi", onClick: () => window.location.assign(`/admin/orders/${(payload.new as any).id}`) },
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const resetCount = () => setNewOrderCount(0);

  return { newOrderCount, resetCount };
}

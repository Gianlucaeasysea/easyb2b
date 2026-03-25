import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNewOrderNotifications() {
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setNewOrderCount((prev) => prev + 1);
          toast.info("📦 Nuovo ordine ricevuto!", {
            description: `Order #${(payload.new as any).order_code || (payload.new as any).id?.slice(0, 8)}`,
            action: { label: "Vedi", onClick: () => window.location.assign(`/admin/orders/${(payload.new as any).id}`) },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetCount = () => setNewOrderCount(0);

  return { newOrderCount, resetCount };
}

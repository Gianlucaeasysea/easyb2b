import { ShoppingBag, TrendingUp, CalendarDays, BarChart3, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { fmtDate } from "./constants";
import type { Tables } from "@/integrations/supabase/types";

interface OrganizationStatsBarProps {
  client: Tables<"clients">;
  totalOrders: number;
  totalSpent: number;
}

export function OrganizationStatsBar({ client, totalOrders, totalSpent }: OrganizationStatsBarProps) {
  const lastOrderDate = client.last_order_date;
  const daysSinceLastOrder = client.days_since_last_order;
  const avgFrequency = client.avg_order_frequency_days;
  const nextReorder = client.next_reorder_expected_date;
  const nextReorderDays = nextReorder ? differenceInDays(new Date(nextReorder), new Date()) : null;

  return (
    <div className="grid sm:grid-cols-5 gap-4 mb-6">
      <div className="glass-card-solid p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag size={14} className="text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Ordini</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">{client.total_orders_count || totalOrders}</p>
      </div>
      <div className="glass-card-solid p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Fatturato</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">€{(client.total_orders_value || totalSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="glass-card-solid p-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={14} className="text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Ultimo Ordine</span>
        </div>
        <p className="font-heading text-sm font-bold text-foreground">{lastOrderDate ? fmtDate(lastOrderDate) : "—"}</p>
        {daysSinceLastOrder != null && <p className="text-[10px] text-muted-foreground">{daysSinceLastOrder}d fa</p>}
      </div>
      <div className="glass-card-solid p-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={14} className="text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Freq. Media</span>
        </div>
        <p className="font-heading text-xl font-bold text-foreground">{avgFrequency ? `${avgFrequency}d` : "—"}</p>
      </div>
      <div className="glass-card-solid p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={14} className={nextReorderDays !== null && nextReorderDays < 0 ? "text-destructive" : nextReorderDays !== null && nextReorderDays <= 7 ? "text-warning" : "text-success"} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">Next Reorder</span>
        </div>
        {nextReorder ? (
          <>
            <p className={`font-heading text-sm font-bold ${nextReorderDays !== null && nextReorderDays < 0 ? "text-destructive" : nextReorderDays !== null && nextReorderDays <= 7 ? "text-warning" : "text-success"}`}>
              {fmtDate(nextReorder)}
            </p>
            <p className="text-[10px] text-muted-foreground">{nextReorderDays !== null && nextReorderDays < 0 ? `${Math.abs(nextReorderDays)}d overdue` : `in ${nextReorderDays}d`}</p>
          </>
        ) : (
          <p className="font-heading text-sm font-bold text-muted-foreground">—</p>
        )}
      </div>
    </div>
  );
}

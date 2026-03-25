import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Target, Star, TrendingUp, Award, Zap, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tiers = [
  { name: "standard", label: "Standard", discount: 10, minSpend: 0, color: "text-muted-foreground" },
  { name: "bronze", label: "Bronze", discount: 15, minSpend: 2000, color: "text-chart-4" },
  { name: "silver", label: "Silver", discount: 20, minSpend: 5000, color: "text-primary" },
  { name: "gold", label: "Gold", discount: 30, minSpend: 10000, color: "text-warning" },
];

const achievements = [
  { id: 1, title: "First Order", description: "Place your first B2B order", icon: Zap, unlocked: true },
  { id: 2, title: "Repeat Buyer", description: "Place 5 orders in total", icon: TrendingUp, unlocked: true, progress: "5/5" },
  { id: 3, title: "Big Spender", description: "Spend €5,000+ in a single month", icon: Award, unlocked: false, progress: "€3,020/€5,000" },
  { id: 4, title: "Full Catalog", description: "Order from every product category", icon: Star, unlocked: false, progress: "4/5 categories" },
  { id: 5, title: "Loyalty Champion", description: "Be active for 6+ consecutive months", icon: Trophy, unlocked: false, progress: "2/6 months" },
];

const DealerGoals = () => {
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      if (!client) return [];
      const { data } = await supabase.from("orders").select("*").eq("client_id", client.id).neq("status", "draft");
      return data || [];
    },
    enabled: !!client,
  });

  const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
  const currentTier = tiers.find(t => t.name === (client?.discount_class || "D")) || tiers[0];
  const currentTierIndex = tiers.indexOf(currentTier);
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const progressToNext = nextTier ? Math.min((totalSpent / nextTier.minSpend) * 100, 100) : 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Goals & Rewards</h1>
        <p className="text-sm text-muted-foreground">Track your progress and unlock better pricing tiers</p>
      </div>

      {/* Current Tier */}
      <div className="glass-card-solid p-6 mb-6 border border-primary/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center">
            <Trophy className="text-primary-foreground" size={28} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Current Tier</p>
            <h2 className="font-heading text-2xl font-bold text-foreground">Class {currentTier.name} — {currentTier.label}</h2>
            <p className="text-sm text-success font-semibold">-{currentTier.discount}% on all products</p>
          </div>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Progress to Class {nextTier.name} ({nextTier.label})</span>
              <span className="text-xs font-semibold text-foreground">€{totalSpent.toLocaleString()} / €{nextTier.minSpend.toLocaleString()}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div className="gradient-blue h-3 rounded-full transition-all duration-500" style={{ width: `${progressToNext}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Spend €{(nextTier.minSpend - totalSpent).toLocaleString()} more to unlock -{nextTier.discount}% discount
            </p>
          </div>
        )}
      </div>

      {/* Tier Roadmap */}
      <h2 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Tier Roadmap</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {tiers.map((tier, i) => {
          const isCurrentOrPast = i <= currentTierIndex;
          return (
            <div key={tier.name} className={`glass-card-solid p-4 ${i === currentTierIndex ? "border border-primary/40" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCurrentOrPast ? (
                  <Star size={16} className={tier.color} fill={i === currentTierIndex ? "currentColor" : "none"} />
                ) : (
                  <Lock size={16} className="text-muted-foreground" />
                )}
                <span className={`font-heading font-bold text-sm ${isCurrentOrPast ? "text-foreground" : "text-muted-foreground"}`}>
                  Class {tier.name}
                </span>
              </div>
              <p className={`text-xs ${isCurrentOrPast ? "text-foreground" : "text-muted-foreground"}`}>{tier.label}</p>
              <p className={`text-lg font-heading font-bold mt-1 ${isCurrentOrPast ? "text-success" : "text-muted-foreground"}`}>-{tier.discount}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tier.minSpend === 0 ? "Starting tier" : `€${tier.minSpend.toLocaleString()} spent`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <h2 className="font-heading text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
        Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {achievements.map(a => {
          const Icon = a.icon;
          return (
            <div key={a.id} className={`glass-card-solid p-4 flex items-center gap-4 ${!a.unlocked ? "opacity-50" : ""}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.unlocked ? "gradient-blue" : "bg-secondary"}`}>
                <Icon size={20} className={a.unlocked ? "text-primary-foreground" : "text-muted-foreground"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-sm text-foreground">{a.title}</h3>
                  {a.unlocked && <Badge className="bg-success/20 text-success border-0 text-[10px]">Unlocked</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {a.progress && <p className="text-xs text-primary mt-1">{a.progress}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealerGoals;

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, Activity, Calendar, Phone, Mail, MessageCircle, TrendingUp, Trophy, Flame, Star, Zap, Award } from "lucide-react";
import { format, isToday, isPast, startOfMonth, endOfMonth } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "gradient-blue"}`}>
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const typeIcons: Record<string, any> = {
  call: Phone, email: Mail, whatsapp: MessageCircle, meeting: Calendar, note: Activity,
};

const CRMDashboard = () => {
  const navigate = useNavigate();

  const { data: leads } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["crm-upcoming-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, leads(company_name, contact_name)")
        .is("completed_at", null)
        .order("scheduled_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const leadCount = leads?.length || 0;
  const openLeads = leads?.filter(l => !["won", "lost"].includes(l.status || "")).length || 0;
  const wonLeads = leads?.filter(l => l.status === "won").length || 0;
  const overdueActivities = activities?.filter(a => a.scheduled_at && isPast(new Date(a.scheduled_at))).length || 0;

  const pipelineStages = ["new", "contacted", "qualified", "proposal"];
  const pipelineCounts = pipelineStages.map(s => ({
    stage: s,
    count: leads?.filter(l => l.status === s).length || 0,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sales CRM</h1>
        <p className="text-sm text-muted-foreground">Overview of your sales pipeline and activities</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Leads" value={String(leadCount)} />
        <StatCard icon={Target} label="Open Pipeline" value={String(openLeads)} color="bg-warning" />
        <StatCard icon={TrendingUp} label="Won" value={String(wonLeads)} color="bg-success" />
        <StatCard icon={Activity} label="Overdue Tasks" value={String(overdueActivities)} color={overdueActivities > 0 ? "bg-destructive" : "gradient-blue"} />
      </div>

      {/* Gamification Section */}
      <div className="glass-card-solid p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
            <Trophy className="text-primary-foreground" size={18} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground">Your Goals</h2>
            <p className="text-xs text-muted-foreground">Monthly performance tracker</p>
          </div>
        </div>

        {(() => {
          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          const monthLeads = leads?.filter(l => new Date(l.created_at) >= monthStart && new Date(l.created_at) <= monthEnd).length || 0;
          const monthWon = leads?.filter(l => l.status === "won" && new Date(l.updated_at) >= monthStart).length || 0;
          const monthContacted = leads?.filter(l => l.status !== "new" && new Date(l.updated_at) >= monthStart).length || 0;

          const goals = [
            { label: "New Leads", icon: Users, current: monthLeads, target: 15, color: "bg-primary" },
            { label: "Deals Won", icon: Star, current: monthWon, target: 5, color: "bg-success" },
            { label: "Leads Contacted", icon: Zap, current: monthContacted, target: 20, color: "bg-warning" },
          ];

          const totalPoints = (monthLeads * 10) + (monthWon * 50) + (monthContacted * 5);
          const level = totalPoints < 100 ? "Bronze" : totalPoints < 300 ? "Silver" : totalPoints < 600 ? "Gold" : "Platinum";
          const levelColors: Record<string, string> = {
            Bronze: "text-orange-400", Silver: "text-muted-foreground", Gold: "text-yellow-400", Platinum: "text-primary"
          };
          const levelEmoji: Record<string, string> = {
            Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎"
          };

          // Achievements
          const achievements = [
            { label: "First Blood", desc: "Win your first deal", unlocked: wonLeads > 0, icon: "🎯" },
            { label: "Pipeline Builder", desc: "10+ leads in pipeline", unlocked: openLeads >= 10, icon: "🔨" },
            { label: "Closer", desc: "5+ deals won", unlocked: wonLeads >= 5, icon: "🏆" },
            { label: "Streak", desc: "Contact 20+ leads/month", unlocked: monthContacted >= 20, icon: "🔥" },
          ];

          return (
            <>
              {/* Level & Points */}
              <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-secondary/50">
                <span className="text-3xl">{levelEmoji[level]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-heading font-bold text-lg ${levelColors[level]}`}>{level}</span>
                    <span className="text-xs text-muted-foreground">• {totalPoints} pts this month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +10 per lead • +50 per deal won • +5 per contact
                  </p>
                </div>
                <div className="text-right">
                  <Flame size={20} className="text-warning inline-block" />
                </div>
              </div>

              {/* Goal progress bars */}
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {goals.map(g => {
                  const pct = Math.min((g.current / g.target) * 100, 100);
                  const remaining = Math.max(g.target - g.current, 0);
                  const Icon = g.icon;
                  return (
                    <div key={g.label} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-muted-foreground" />
                        <span className="text-xs font-heading font-semibold uppercase tracking-wider">{g.label}</span>
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="font-heading text-2xl font-bold text-foreground">{g.current}</span>
                        <span className="text-sm text-muted-foreground mb-0.5">/ {g.target}</span>
                      </div>
                      <Progress value={pct} className="h-2 mb-2" />
                      {remaining > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="text-warning font-semibold">{remaining} more</span> to reach goal
                        </p>
                      ) : (
                        <p className="text-xs text-success font-semibold flex items-center gap-1">
                          <Award size={12} /> Goal reached! 🎉
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Achievements */}
              <div>
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-muted-foreground mb-3">Achievements</h3>
                <div className="flex gap-3 flex-wrap">
                  {achievements.map(a => (
                    <div
                      key={a.label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        a.unlocked
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/50 bg-secondary/20 opacity-50 grayscale"
                      }`}
                    >
                      <span className="text-lg">{a.icon}</span>
                      <div>
                        <p className="text-xs font-heading font-semibold">{a.label}</p>
                        <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pipeline Summary */}
        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground">Pipeline</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/pipeline")}>View all →</Button>
          </div>
          <div className="space-y-3">
            {pipelineCounts.map(p => (
              <div key={p.stage} className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading w-24">{p.stage}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${leadCount ? (p.count / leadCount) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-mono text-foreground w-8 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Activities */}
        <div className="glass-card-solid p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-foreground">Upcoming Activities</h2>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/crm/activities")}>View all →</Button>
          </div>
          <div className="space-y-2">
            {!activities?.length ? (
              <p className="text-sm text-muted-foreground">No upcoming activities.</p>
            ) : activities.map(a => {
              const Icon = typeIcons[a.type || "note"] || Activity;
              const isOverdue = a.scheduled_at && isPast(new Date(a.scheduled_at));
              const lead = a.leads as any;
              return (
                <div key={a.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    {lead && <p className="text-xs text-primary">{lead.company_name}</p>}
                  </div>
                  {a.scheduled_at && (
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {isToday(new Date(a.scheduled_at)) ? format(new Date(a.scheduled_at), "HH:mm") : format(new Date(a.scheduled_at), "MMM d")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;

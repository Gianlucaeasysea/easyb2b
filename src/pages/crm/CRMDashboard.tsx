import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, Activity, Calendar, Phone, Mail, MessageCircle, TrendingUp } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
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

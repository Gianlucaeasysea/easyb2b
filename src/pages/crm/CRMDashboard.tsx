import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, Activity } from "lucide-react";

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const CRMDashboard = () => {
  const { data: leadCount } = useQuery({
    queryKey: ["crm-lead-count"],
    queryFn: async () => {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: activityCount } = useQuery({
    queryKey: ["crm-activity-count"],
    queryFn: async () => {
      const { count } = await supabase.from("activities").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sales CRM</h1>
        <p className="text-sm text-muted-foreground">Manage leads, pipeline, and activities</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Leads" value={String(leadCount ?? 0)} />
        <StatCard icon={Target} label="Open Opportunities" value="0" />
        <StatCard icon={Activity} label="Activities" value={String(activityCount ?? 0)} />
      </div>
    </div>
  );
};

export default CRMDashboard;

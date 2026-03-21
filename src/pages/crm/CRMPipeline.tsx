import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const stageLabels: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost"
};
const stageColors: Record<string, string> = {
  new: "border-l-primary", contacted: "border-l-warning", qualified: "border-l-success",
  proposal: "border-l-primary", won: "border-l-success", lost: "border-l-destructive"
};

const CRMPipeline = () => {
  const { data: leads } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const grouped = stages.reduce((acc, s) => {
    acc[s] = leads?.filter(l => l.status === s) || [];
    return acc;
  }, {} as Record<string, typeof leads>);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Pipeline</h1>
      <p className="text-sm text-muted-foreground mb-8">Visual pipeline of your leads</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map(stage => (
          <div key={stage} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-wider">{stageLabels[stage]}</span>
              <span className="text-xs text-muted-foreground font-mono">{grouped[stage]?.length || 0}</span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {grouped[stage]?.map(lead => (
                <div key={lead.id} className={`glass-card-solid p-3 border-l-2 ${stageColors[stage]}`}>
                  <p className="text-xs font-heading font-semibold text-foreground truncate">{lead.company_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{lead.contact_name}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CRMPipeline;

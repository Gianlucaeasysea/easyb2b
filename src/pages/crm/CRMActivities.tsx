import { Activity } from "lucide-react";

const CRMActivities = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Activities</h1>
    <p className="text-sm text-muted-foreground mb-8">Track calls, emails, meetings, and notes</p>
    <div className="text-center py-20 glass-card-solid">
      <Activity className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">No activities yet. Log your first activity on a lead or client.</p>
    </div>
  </div>
);

export default CRMActivities;

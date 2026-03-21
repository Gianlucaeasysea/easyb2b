import { Trophy } from "lucide-react";

const DealerGoals = () => (
  <div>
    <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Goals & Rewards</h1>
    <p className="text-sm text-muted-foreground mb-8">Track your progress and unlock rewards</p>
    <div className="text-center py-20 glass-card-solid">
      <Trophy className="mx-auto text-muted-foreground mb-4" size={48} />
      <p className="text-muted-foreground">Gamification goals will appear here once configured by your account manager.</p>
    </div>
  </div>
);

export default DealerGoals;

import { useAuth } from "@/contexts/AuthContext";
import { Package, ShoppingBag, TrendingUp, Trophy } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="glass-card-solid p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center">
        <Icon className="text-primary-foreground" size={18} />
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-heading">{label}</span>
    </div>
    <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const DealerDashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} label="Discount Class" value="B" sub="-20% on all products" />
        <StatCard icon={ShoppingBag} label="Active Orders" value="3" sub="Last order: Mar 15" />
        <StatCard icon={Package} label="Catalog Updates" value="5" sub="New products this month" />
        <StatCard icon={Trophy} label="Monthly Goal" value="76%" sub="€3,800 / €5,000" />
      </div>

      <div className="glass-card-solid p-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4">🏆 Monthly Goal</h2>
        <p className="text-sm text-muted-foreground mb-4">You need €1,200 more to unlock 5% extra discount on your next order!</p>
        <div className="w-full bg-secondary rounded-full h-3">
          <div className="gradient-blue h-3 rounded-full transition-all" style={{ width: "76%" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">€3,800 / €5,000</p>
      </div>
    </div>
  );
};

export default DealerDashboard;

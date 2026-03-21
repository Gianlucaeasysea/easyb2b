import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn } from "lucide-react";
import logo from "@/assets/easysea-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Supabase Auth login — to be implemented
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full gradient-blue opacity-5 blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md px-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="glass-card-solid p-8">
          <div className="text-center mb-8">
            <img src={logo} alt="Easysea" className="h-8 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Access your B2B dealer portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" required className="rounded-lg bg-secondary border-border" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              <Input type="password" required className="rounded-lg bg-secondary border-border" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-bold py-6">
              <LogIn size={18} className="mr-2" /> Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Access is restricted to authorized dealers.<br />
            <Link to="/become-a-dealer" className="text-primary hover:underline">Apply to become a dealer</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

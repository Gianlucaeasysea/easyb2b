import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import logo from "@/assets/easysea-logo.png";

const Login = () => {
  const { user, role, signInWithEmail, signInWithMagicLink } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("magic");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Redirect if already logged in
  if (user && role) {
    if (role === "dealer") return <Navigate to="/portal" replace />;
    if (role === "admin" || role === "operations") return <Navigate to="/admin" replace />;
    if (role === "sales") return <Navigate to="/crm" replace />;
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMagicSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
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

          {magicSent ? (
            <div className="text-center py-8">
              <Mail className="mx-auto text-primary mb-4" size={48} />
              <h3 className="font-heading text-lg font-bold text-foreground mb-2">Check your email</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a magic link to <strong className="text-foreground">{email}</strong>
              </p>
              <Button variant="outline" size="sm" onClick={() => setMagicSent(false)} className="rounded-lg border-border text-foreground">
                Try another email
              </Button>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex gap-1 mb-6 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setMode("magic")}
                  className={`flex-1 text-xs font-heading font-semibold py-2 rounded-md transition-colors ${mode === "magic" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  Magic Link
                </button>
                <button
                  onClick={() => setMode("password")}
                  className={`flex-1 text-xs font-heading font-semibold py-2 rounded-md transition-colors ${mode === "password" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  Password
                </button>
              </div>

              <form onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" required className="rounded-lg bg-secondary border-border" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                {mode === "password" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                      <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                    </div>
                    <Input type="password" required className="rounded-lg bg-secondary border-border" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                )}

                <Button type="submit" size="lg" disabled={loading} className="w-full rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-bold py-6">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : mode === "magic" ? (
                    <><Mail size={18} className="mr-2" /> Send Magic Link</>
                  ) : (
                    <><LogIn size={18} className="mr-2" /> Sign In</>
                  )}
                </Button>
              </form>
            </>
          )}

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

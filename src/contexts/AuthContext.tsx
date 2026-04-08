import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "admin" | "dealer" | "sales" | "operations";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleError: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  retryRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_CACHE_PREFIX = "user_role_";
const ROLE_TIMEOUT_MS = 8000;

const getCachedRole = (userId: string): AppRole | null => {
  try {
    const cached = sessionStorage.getItem(`${ROLE_CACHE_PREFIX}${userId}`);
    if (cached && ["admin", "dealer", "sales", "operations"].includes(cached)) {
      return cached as AppRole;
    }
  } catch {}
  return null;
};

const setCachedRole = (userId: string, role: AppRole) => {
  try {
    sessionStorage.setItem(`${ROLE_CACHE_PREFIX}${userId}`, role);
  } catch {}
};

const clearCachedRole = (userId?: string) => {
  try {
    if (userId) {
      sessionStorage.removeItem(`${ROLE_CACHE_PREFIX}${userId}`);
    }
    // Clear all role keys on logout
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(ROLE_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState(false);

  const fetchRoleWithRetry = useCallback(async (userId: string, retries = 3): Promise<AppRole | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
        if (error) throw error;
        const fetched = data as AppRole | null;
        if (fetched) {
          setCachedRole(userId, fetched);
          return fetched;
        }
        return null;
      } catch (err) {
        console.error(`[AuthContext] fetchRole attempt ${attempt}/${retries} failed:`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
    // All retries exhausted
    toast.error("Impossibile caricare il ruolo utente. Riprova.");
    return null;
  }, []);

  const loadRole = useCallback(async (userId: string) => {
    setRoleError(false);

    // Use cached role immediately if available
    const cached = getCachedRole(userId);
    if (cached) {
      setRole(cached);
    }

    // Set up a timeout
    const timeoutId = window.setTimeout(() => {
      if (!role && !cached) {
        setRoleError(true);
        setLoading(false);
        toast.error("Impossibile caricare il ruolo utente. Riprova.");
      }
    }, ROLE_TIMEOUT_MS);

    const fetched = await fetchRoleWithRetry(userId);

    clearTimeout(timeoutId);

    if (fetched) {
      setRole(fetched);
      setRoleError(false);
    } else if (!cached) {
      setRoleError(true);
    }

    setLoading(false);
  }, [fetchRoleWithRetry]);

  const retryRole = useCallback(() => {
    if (user) {
      setLoading(true);
      setRoleError(false);
      loadRole(user.id);
    }
  }, [user, loadRole]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadRole(session.user.id);
        } else {
          setRole(null);
          setRoleError(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setRoleError(false);
    clearCachedRole(userId);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, roleError, signInWithEmail, signInWithMagicLink, signOut, retryRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ERROR_MESSAGES } from "@/lib/errorMessages";

type AppRole = "admin" | "dealer" | "sales" | "operations";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleError: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null; emailExists: boolean }>;
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

  const VALID_ROLES: AppRole[] = ["admin", "dealer", "sales", "operations"];

  const fetchRoleWithRetry = useCallback(async (userId: string, retries = 3): Promise<AppRole | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
        if (error) throw error;
        if (data && VALID_ROLES.includes(data as AppRole)) {
          const validRole = data as AppRole;
          setCachedRole(userId, validRole);
          return validRole;
        }
        return null;
      } catch (err) {
        logger.error("AuthContext", `fetchRole attempt ${attempt}/${retries} failed`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
    // All retries exhausted
    toast.error(ERROR_MESSAGES.AUTH_ROLE_LOAD_FAILED);
    return null;
  }, []);

  const loadRole = useCallback(async (userId: string) => {
    setRoleError(false);

    const cached = getCachedRole(userId);
    let resolvedRole: AppRole | null = cached;

    if (cached) {
      setRole(cached);
      setLoading(false);
    }

    const timeoutId = window.setTimeout(() => {
      if (!resolvedRole) {
        setRoleError(true);
        setLoading(false);
        toast.error(ERROR_MESSAGES.AUTH_ROLE_LOAD_FAILED);
      }
    }, ROLE_TIMEOUT_MS);

    try {
      const fetched = await fetchRoleWithRetry(userId);
      resolvedRole = fetched;

      if (fetched) {
        setRole(fetched);
        setRoleError(false);
      } else if (!cached) {
        setRoleError(true);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [fetchRoleWithRetry]);

  const retryRole = useCallback(() => {
    if (user) {
      setLoading(true);
      setRoleError(false);
      void loadRole(user.id);
    }
  }, [user, loadRole]);

  useEffect(() => {
    let mounted = true;

    const handleSession = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        void loadRole(nextSession.user.id);
      } else {
        setRole(null);
        setRoleError(false);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        handleSession(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadRole]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithMagicLink = async (email: string): Promise<{ error: Error | null; emailExists: boolean }> => {
    const trimmedEmail = email.toLowerCase().trim();

    // Step 1: Verify email exists in registered profiles
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (lookupError) {
      logger.error("AuthContext", "Profile lookup error", lookupError);
    }

    // If no profile found and no lookup error, block sending
    if (!lookupError && !profile) {
      return { error: new Error('EMAIL_NOT_FOUND'), emailExists: false };
    }

    // Step 2: Email exists — send magic link
    const productionUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${productionUrl}/portal`,
        shouldCreateUser: false,
      },
    });

    return { error, emailExists: true };
  };

  const signOut = async () => {
    const userId = user?.id;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setRoleError(false);
    clearCachedRole(userId);
    // Clear cart storage for this user
    try {
      if (userId) localStorage.removeItem(`easysea_cart_${userId}`);
    } catch {}
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

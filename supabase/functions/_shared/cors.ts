const DEFAULT_APP_ORIGIN = "https://b2b.easysea.org";

const configuredOrigin =
  Deno.env.get("ALLOWED_ORIGIN") ||
  Deno.env.get("APP_URL") ||
  DEFAULT_APP_ORIGIN;

const allowedOrigins = [
  configuredOrigin,
  DEFAULT_APP_ORIGIN,
  "https://easyb2b.lovable.app",
  "https://id-preview--e6574ffd-7ed8-4e30-b8a7-79b96a9a13af.lovable.app",
  "https://e6574ffd-7ed8-4e30-b8a7-79b96a9a13af.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
].filter((value): value is string => Boolean(value));

const isTrustedOrigin = (origin: string) => {
  if (!origin) return false;

  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (!["https:", "http:"].includes(protocol)) return false;

    return (
      hostname.endsWith(".lovable.app") ||
      hostname.endsWith(".lovableproject.com") ||
      hostname.endsWith(".easysea.org") ||
      hostname === "localhost"
    );
  } catch {
    return false;
  }
};

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = isTrustedOrigin(origin) ? origin : configuredOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

// Backward-compatible export for functions not yet migrated to getCorsHeaders
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const allowedOrigins = [
  Deno.env.get("ALLOWED_ORIGIN") || "https://easyb2b.lovable.app",
  "https://id-preview--e6574ffd-7ed8-4e30-b8a7-79b96a9a13af.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const isAllowed = allowedOrigins.some(
    (allowed) => origin === allowed || origin.startsWith(allowed)
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

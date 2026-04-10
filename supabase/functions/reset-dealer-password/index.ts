import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin or sales
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    const { data: isSales } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "sales" });
    if (!isAdmin && !isSales) throw new Error("Not authorized");

    const { email } = await req.json();
    if (!email) throw new Error("Missing email");

    // Generate a password reset link via Supabase Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://easyb2b.lovable.app/login" },
    });
    if (error) throw error;

    // Send recovery email via Gmail
    const { data: tokenData } = await supabaseAdmin.from("gmail_tokens").select("*").limit(1).single();
    if (tokenData) {
      let accessToken = tokenData.access_token;
      if (new Date(tokenData.expires_at) < new Date()) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokenData.refresh_token,
            client_id: Deno.env.get("GOOGLE_CLIENT_ID") || Deno.env.get("CLIENTI_ID") || "",
            client_secret: Deno.env.get("CLIENT_SECRET") || "",
          }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          await supabaseAdmin.from("gmail_tokens").update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
          }).eq("id", tokenData.id);
        }
      }

      const recoveryLink = data?.properties?.action_link || "https://easyb2b.lovable.app/login";

      const subject = "EasySea - Reset Password Portale Dealer";
      const body = `Ciao,

Hai ricevuto una richiesta di reset della password per il tuo account sul Portale Dealer EasySea.

Clicca sul link qui sotto per impostare una nuova password:
${recoveryLink}

Se non hai richiesto il reset, puoi ignorare questa email.

Il Team EasySea`;

      const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
      const rawMessage = `From: EasySea <business@easysea.org>\r\nTo: ${email}\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
      const encoded = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (!gmailRes.ok) {
        const gmailError = await gmailRes.text();
        console.error("Gmail API error sending recovery email:", gmailError);
        throw new Error(`Gmail API error: ${gmailRes.status}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reset-dealer-password error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

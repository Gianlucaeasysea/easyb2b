import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { cleanupOrphanedDealerAccountByEmail } from "../_shared/dealer-account-cleanup.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateInput(body: any): string | null {
  const { action, client_id, email, password } = body;

  if (action && action !== "create" && action !== "delete") {
    return "Invalid action. Must be 'create' or 'delete'.";
  }

  if (action === "delete") {
    if (!client_id || typeof client_id !== "string") return "Missing or invalid client_id";
    return null;
  }

  // CREATE
  if (!client_id || typeof client_id !== "string") return "Missing or invalid client_id";
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) return "Missing or invalid email";
  if (!password || typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters";
  if (email.length > 255) return "Email too long";

  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validationError = validateInput(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, email, password, action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate caller via Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    const { data: isSales } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "sales" });
    if (!isAdmin && !isSales) throw new Error("Not authorized");

    // DELETE action
    if (action === "delete") {
      if (!client_id) throw new Error("Missing client_id");

      const { data: clientData } = await supabaseAdmin.from("clients").select("user_id, email").eq("id", client_id).single();
      if (!clientData?.user_id) throw new Error("Nessun account dealer collegato a questa organizzazione");

      const userId = clientData.user_id;

      // Remove role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      // Unlink client
      await supabaseAdmin.from("clients").update({ user_id: null }).eq("id", client_id);
      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      // Delete auth user
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteErr) console.warn("Error deleting auth user:", deleteErr.message);

      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE action (default)
    await cleanupOrphanedDealerAccountByEmail(supabaseAdmin, email, client_id);

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    const userId = newUser.user.id;

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "dealer" });
    if (roleErr) throw roleErr;

    const { error: linkErr } = await supabaseAdmin.from("clients").update({ user_id: userId }).eq("id", client_id);
    if (linkErr) throw linkErr;

    const { error: profErr } = await supabaseAdmin.from("profiles").upsert({ user_id: userId, email }, { onConflict: "user_id" });
    if (profErr) console.warn("Profile creation warning:", profErr.message);

    // Send credentials email
    let emailSent = false;
    try {
      const portalUrl = Deno.env.get("APP_URL") || "https://b2b.easysea.org";
      const loginUrl = `${portalUrl}/login`;
      await sendCredentialsEmail(supabaseAdmin, email, password, loginUrl);
      emailSent = true;
    } catch (emailErr) {
      console.error("Failed to send credentials email:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, email_sent: emailSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-dealer-account error:", e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendCredentialsEmail(supabaseAdmin: any, email: string, password: string, portalUrl: string) {
  const { data: tokenData } = await supabaseAdmin.from("gmail_tokens").select("*").limit(1).single();
  if (!tokenData) {
    console.warn("No Gmail tokens found, credentials email not sent");
    return;
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || Deno.env.get("CLIENTI_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || Deno.env.get("CLIENT_SECRET") || "";

  async function refreshToken(): Promise<string | null> {
    if (!clientId || !clientSecret) return null;
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const data = await refreshRes.json();
    if (data.access_token) {
      await supabaseAdmin.from("gmail_tokens").update({
        access_token: data.access_token,
        expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
      }).eq("id", tokenData.id);
      return data.access_token;
    }
    console.error("Gmail token refresh failed:", JSON.stringify(data));
    return null;
  }

  let accessToken = tokenData.access_token;
  if (new Date(tokenData.expires_at) < new Date()) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      console.warn("Token refresh failed, skipping credentials email");
      return;
    }
    accessToken = refreshed;
  }

  const subject = "Easysea - Your Dealer Portal Credentials";
  const htmlBody = `
<html><body style="font-family: Arial, sans-serif; color: #333;">
<p>Welcome to the Easysea Dealer Portal!</p>
<p>Your account has been created. Here are your login credentials:</p>
<p><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${password}</p>
<p>Login here: <a href="${portalUrl}" style="color: #0066cc; text-decoration: underline;">${portalUrl}</a></p>
<p>Please change your password after your first login.</p>
<p>Best regards,<br/>The Easysea Team</p>
</body></html>`;

  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const rawMessage = `From: Easysea <business@easysea.org>\r\nTo: ${email}\r\nBcc: g.scotto@easysea.org\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlBody}`;
  const encoded = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  async function sendRaw(token: string): Promise<Response> {
    return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encoded }),
    });
  }

  let gmailRes = await sendRaw(accessToken);
  // Auto-retry on 401
  if (gmailRes.status === 401) {
    await gmailRes.text();
    console.log("Gmail 401, refreshing token and retrying...");
    const refreshed = await refreshToken();
    if (refreshed) {
      accessToken = refreshed;
      gmailRes = await sendRaw(accessToken);
    }
  }

  if (!gmailRes.ok) {
    const errText = await gmailRes.text();
    console.error("Gmail API error sending credentials:", errText);
    // Don't throw - account was created successfully, just email failed
  } else {
    await gmailRes.json();
  }
}

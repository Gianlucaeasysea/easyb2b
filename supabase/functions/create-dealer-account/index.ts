import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { cleanupOrphanedDealerAccountByEmail } from "../_shared/dealer-account-cleanup.ts";

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

    const requestBody = await req.json();
    const { client_id, email, password, access_token } = requestBody ?? {};
    if (!client_id || !email || !password) throw new Error("Missing fields");

    // Verify caller is admin or sales
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader || (access_token ? `Bearer ${access_token}` : null);
    if (!bearerToken) throw new Error("Not authenticated");

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: bearerToken } } }
    );
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    const { data: isSales } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "sales",
    });
    if (!isAdmin && !isSales) throw new Error("Not authorized");

    await cleanupOrphanedDealerAccountByEmail(supabaseAdmin, email, client_id);

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;

    const userId = newUser.user.id;

    // Assign dealer role
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "dealer",
    });
    if (roleErr) throw roleErr;

    // Link client to user (password is only stored in Supabase Auth)
    const { error: linkErr } = await supabaseAdmin.from("clients").update({
      user_id: userId,
    }).eq("id", client_id);
    if (linkErr) throw linkErr;

    // Create profile
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      email,
    }, { onConflict: "user_id" });
    if (profErr) console.warn("Profile creation warning:", profErr.message);

    // Send credentials email to the dealer
    try {
      const portalUrl = "https://easyb2b.lovable.app/login";
      await sendCredentialsEmail(supabaseAdmin, email, password, portalUrl);
    } catch (emailErr) {
      console.error("Failed to send credentials email:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
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

  let accessToken = tokenData.access_token;
  if (new Date(tokenData.expires_at) < new Date()) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
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

  const subject = "EasySea — Your Dealer Portal Credentials";
  const body = `Welcome to the EasySea Dealer Portal!

Your account has been created. Here are your login credentials:

Email: ${email}
Password: ${password}

Login here: ${portalUrl}

Please change your password after your first login.

Best regards,
The EasySea Team`;

  const rawMessage = `From: EasySea <business@easysea.org>\r\nTo: ${email}\r\nBcc: g.scotto@easysea.org\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
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
    const errText = await gmailRes.text();
    console.error("Gmail API error sending credentials:", errText);
    throw new Error(`Gmail API error: ${gmailRes.status}`);
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STAFF_EMAILS = [
  "g.scotto@easysea.org",
  "business@easysea.org",
  "gianluca@easysea.org",
];

function validateInput(body: any): string | null {
  const { companyName, contactName, email, phone } = body;
  if (!companyName || typeof companyName !== "string" || companyName.trim().length < 2 || companyName.length > 200) {
    return "Company name is required (2-200 characters)";
  }
  if (!contactName || typeof contactName !== "string" || contactName.trim().length < 2 || contactName.length > 100) {
    return "Contact name is required (2-100 characters)";
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 255) {
    return "A valid email is required";
  }
  if (!phone || typeof phone !== "string" || phone.trim().length < 5 || phone.length > 30) {
    return "A valid phone number is required";
  }
  return null;
}

function getOAuthCredentials() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || Deno.env.get("CLIENTI_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || Deno.env.get("CLIENT_SECRET") || "";
  return { clientId, clientSecret };
}

async function refreshAccessToken(
  supabaseAdmin: any,
  tokenRow: any,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  console.log("Refreshing Gmail access token...");
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRow.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await refreshRes.json();
  if (data.access_token) {
    console.log("Token refresh successful");
    await supabaseAdmin.from("gmail_tokens").update({
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    }).eq("id", tokenRow.id);
    return data.access_token;
  }
  console.error("Token refresh failed:", JSON.stringify(data));
  return null;
}

async function sendGmail(accessToken: string, fromEmail: string, fromName: string, to: string, subject: string, body: string) {
  // RFC 2047 encode subject for UTF-8 safety
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const rawMessage = `From: ${fromName} <${fromEmail}>\r\nTo: ${to}\r\nSubject: ${encodedSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!gmailRes.ok) {
    const errText = await gmailRes.text();
    console.error(`Gmail API error sending to ${to} (${gmailRes.status}):`, errText);
    return { ok: false, status: gmailRes.status, error: errText };
  }

  await gmailRes.json();
  return { ok: true, status: 200, error: null };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const validationError = validateInput(body);
    if (validationError) {
      return json({ error: validationError }, 400);
    }

    const { companyName, contactName, email, phone, zone, country, businessType, website, message, vatNumber } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenData } = await supabaseAdmin.from("gmail_tokens").select("*").limit(1).single();

    if (!tokenData) {
      console.warn("No Gmail tokens found, skipping email send");
      return json({ success: true, skipped: true, reason: "no_gmail_tokens" });
    }

    const { clientId, clientSecret } = getOAuthCredentials();
    if (!clientId || !clientSecret) {
      console.warn("Missing Google OAuth credentials (CLIENTI_ID / CLIENT_SECRET)");
      return json({ success: true, skipped: true, reason: "missing_oauth_credentials" });
    }

    // Get a valid access token — refresh if expired
    let accessToken = tokenData.access_token;
    const tokenExpired = new Date(tokenData.expires_at) < new Date();
    if (tokenExpired) {
      const refreshed = await refreshAccessToken(supabaseAdmin, tokenData, clientId, clientSecret);
      if (!refreshed) {
        return json({ success: true, skipped: true, reason: "token_refresh_failed" });
      }
      accessToken = refreshed;
    }

    const fromEmail = "business@easysea.org";
    const fromName = "Easysea B2B";

    // Helper: send with auto-retry on 401
    async function sendWithRetry(to: string, subject: string, emailBody: string): Promise<{ ok: boolean; error?: string }> {
      let result = await sendGmail(accessToken, fromEmail, fromName, to, subject, emailBody);
      if (!result.ok && result.status === 401) {
        console.log("Got 401, forcing token refresh and retrying...");
        const refreshed = await refreshAccessToken(supabaseAdmin, tokenData, clientId, clientSecret);
        if (refreshed) {
          accessToken = refreshed;
          result = await sendGmail(accessToken, fromEmail, fromName, to, subject, emailBody);
        }
      }
      return { ok: result.ok, error: result.ok ? undefined : (result.error || "unknown") };
    }

    const emailErrors: string[] = [];

    // 1. Confirmation to customer
    const clientSubject = "We received your dealer application — Easysea";
    const clientBody = `Dear ${contactName},

Thank you for applying to become an Easysea dealer. Our team will review your application and contact you within 48 hours.

Best regards,
The Easysea Team
business@easysea.org`;

    const clientResult = await sendWithRetry(email, clientSubject, clientBody);
    if (!clientResult.ok) emailErrors.push(`client: ${clientResult.error}`);

    // 2. Notification to staff
    const staffSubject = `New dealer application — ${companyName}`;
    const staffBody = `NEW DEALER APPLICATION

Company: ${companyName}
Contact: ${contactName}
Email: ${email}
Phone: ${phone}
Region: ${zone || "—"}
Country: ${country || "—"}
Business Type: ${businessType || "—"}
Website: ${website || "—"}
VAT ID: ${vatNumber || "—"}

Message:
${message || "(no message)"}

---
Review in the CRM: Dealer Requests section`;

    for (const staffEmail of STAFF_EMAILS) {
      const r = await sendWithRetry(staffEmail, staffSubject, staffBody);
      if (!r.ok) emailErrors.push(`staff(${staffEmail}): ${r.error}`);
    }

    return json({
      success: true,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (e) {
    console.error("send-dealer-request-notification error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});

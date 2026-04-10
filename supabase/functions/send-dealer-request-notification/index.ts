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

    const { companyName, contactName, email, phone, zone, country, businessType, website, message, vatNumber } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenData } = await supabaseAdmin.from("gmail_tokens").select("*").limit(1).single();

    if (!tokenData) {
      console.warn("No Gmail tokens found, skipping email send");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const fromEmail = "business@easysea.org";
    const fromName = "Easysea B2B";

    // 1. Send confirmation email to customer
    const clientSubject = "We received your dealer application — Easysea";
    const clientBody = `Dear ${contactName},

Thank you for applying to become an Easysea dealer. Our team will review your application and contact you within 48 hours.

Best regards,
The Easysea Team
business@easysea.org`;

    await sendGmail(accessToken, fromEmail, fromName, email, clientSubject, clientBody);

    // 2. Send notification to ALL staff
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
      await sendGmail(accessToken, fromEmail, fromName, staffEmail, staffSubject, staffBody);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-dealer-request-notification error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendGmail(accessToken: string, fromEmail: string, fromName: string, to: string, subject: string, body: string) {
  const rawMessage = `From: ${fromName} <${fromEmail}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
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
    console.error(`Gmail API error sending to ${to}:`, errText);
    throw new Error(`Gmail API error: ${gmailRes.status}`);
  }

  return await gmailRes.json();
}

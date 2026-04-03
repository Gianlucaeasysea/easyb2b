import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { companyName, contactName, email, phone, zone, country, businessType, website, message, vatNumber } = body;

    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_APP_PASSWORD) {
      console.warn("GMAIL_APP_PASSWORD not set, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = "business@easysea.org";

    // 1. Confirmation email to the applicant
    const clientSubject = "EasySea — Application Received";
    const clientBody = `Dear ${contactName},

Thank you for your interest in becoming an EasySea dealer!

We have received your application for ${companyName} and our sales team will review it within 2 business days.

We will contact you at this email address or at ${phone} to discuss the next steps.

Best regards,
The EasySea Team
business@easysea.org`;

    await sendEmail(fromEmail, GMAIL_APP_PASSWORD, email, clientSubject, clientBody);

    // 2. Internal notification to sales team
    const salesSubject = `🆕 New Dealer Application: ${companyName}`;
    const salesBody = `NEW DEALER APPLICATION

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

    // Send to sales with CC to Giuseppe
    await sendEmail(fromEmail, GMAIL_APP_PASSWORD, "business@easysea.org", salesSubject, salesBody, "g.scotto@easysea.org");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-dealer-request-notification error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendEmail(from: string, password: string, to: string, subject: string, body: string, cc?: string) {
  const headers: Record<string, string> = {
    From: `EasySea <${from}>`,
    To: to,
    Subject: subject,
    "MIME-Version": "1.0",
    "Content-Type": "text/plain; charset=UTF-8",
  };
  if (cc) headers["Cc"] = cc;

  const raw = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n" + body;
  const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // Use Gmail SMTP via API
  const smtpPayload = {
    from,
    to: cc ? [to, cc] : [to],
    subject,
    text: body,
  };

  // Simple SMTP send using fetch to Gmail API
  const credentials = btoa(`${from}:${password}`);

  const response = await fetch("https://smtp-relay.gmail.com:587", {
    method: "POST",
    headers: { "Authorization": `Basic ${credentials}` },
    body: JSON.stringify(smtpPayload),
  }).catch(() => null);

  // Fallback: use nodemailer-compatible approach via raw SMTP
  // Since Deno edge functions can't do raw SMTP, use the Gmail REST API approach
  // that's already configured in the project via gmail tokens

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check for gmail tokens
  const { data: tokenData } = await supabaseAdmin.from("gmail_tokens").select("*").limit(1).single();

  if (tokenData) {
    // Refresh token if needed
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

    // Build raw email
    let rawHeaders = `From: EasySea <${from}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8`;
    if (cc) rawHeaders += `\r\nCc: ${cc}`;
    const rawMessage = rawHeaders + "\r\n\r\n" + body;
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
      console.error("Gmail API error:", errText);
      throw new Error(`Gmail API error: ${gmailRes.status}`);
    }

    return await gmailRes.json();
  }

  console.warn("No Gmail tokens found, email not sent");
  return null;
}

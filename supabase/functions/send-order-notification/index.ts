import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fallback values if DB lookup fails
const FALLBACK_ADMIN_EMAILS = ["business@easysea.org", "gianluca@easysea.org"];
const FALLBACK_BCC_EMAIL = "g.scotto@easysea.org";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { orderId, orderCode, type } = await req.json();

    if (!orderId || !type) {
      return new Response(JSON.stringify({ error: "Missing orderId or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, clients(company_name, contact_name, email)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("*, products(name, sku)")
      .eq("order_id", orderId);

    const client = order.clients as any;
    const code = order.order_code || orderCode || `#${orderId.slice(0, 8).toUpperCase()}`;
    const clientEmail = client?.email;
    const clientName = client?.contact_name || client?.company_name || "Customer";
    const companyName = client?.company_name || "—";
    const totalAmount = Number(order.total_amount || 0).toFixed(2);

    const itemsHtml = buildItemsTableHtml(orderItems || []);

    const sends: { templateName: string; recipientEmail: string; idempotencyKey: string; templateData: Record<string, any> }[] = [];

    const pushClientEmail = (templateName: string, templateData: Record<string, any>, idempotencyKey: string) => {
      if (clientEmail) {
        sends.push({ templateName, recipientEmail: clientEmail, idempotencyKey, templateData });
        sends.push({ templateName, recipientEmail: BCC_EMAIL, idempotencyKey: `${idempotencyKey}-bcc`, templateData });
      }
    };

    if (type === "order_received") {
      pushClientEmail("order-received", { clientName, orderCode: code, itemsHtml, totalAmount, notes: order.notes }, `order-received-client-${orderId}`);
      ADMIN_EMAILS.forEach(email => {
        sends.push({
          templateName: "order-received-admin",
          recipientEmail: email,
          idempotencyKey: `order-received-admin-${email}-${orderId}`,
          templateData: { orderCode: code, companyName, clientName, clientEmail: clientEmail || "no email", itemsHtml, totalAmount, notes: order.notes },
        });
      });
    } else if (type === "order_confirmed") {
      pushClientEmail("order-confirmed", { clientName, orderCode: code, totalAmount }, `order-confirmed-${orderId}`);
    } else if (type === "status_update") {
      pushClientEmail("order-status-update", { clientName, orderCode: code, status: order.status, trackingNumber: order.tracking_number, trackingUrl: order.tracking_url }, `order-status-${orderId}-${order.status}`);
    } else if (type === "documents_uploaded") {
      pushClientEmail("order-documents-ready", { clientName, orderCode: code }, `order-docs-${orderId}-${Date.now()}`);
    }

    const results = [];
    for (const send of sends) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "apikey": SUPABASE_SERVICE_KEY,
          },
          body: JSON.stringify(send),
        });
        const body = await res.text();
        if (!res.ok) {
          console.error(`Failed to send ${send.templateName} to ${send.recipientEmail}: ${res.status} ${body}`);
          results.push({ to: send.recipientEmail, template: send.templateName, status: "failed", error: body });
        } else {
          results.push({ to: send.recipientEmail, template: send.templateName, status: "queued" });
        }
      } catch (err) {
        console.error(`Error sending ${send.templateName}:`, err);
        results.push({ to: send.recipientEmail, template: send.templateName, status: "failed", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in send-order-notification:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildItemsTableHtml(items: any[]): string {
  if (!items.length) return "";
  const rows = items.map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${item.products?.name || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">€${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">€${Number(item.subtotal).toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;">Product</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;">Unit Price</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

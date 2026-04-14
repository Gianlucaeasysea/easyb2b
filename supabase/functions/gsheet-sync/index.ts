import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const SHEET_ID = "1S_Si86x7GdKAuRdRkx5wFK231lGnujChZtFXwo9tMzg";
const GID = "724823086";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

type SheetRow = Record<string, string>;

type ExistingOrderRow = {
  id: string;
  created_at: string;
  order_code: string | null;
  total_amount: number | null;
  order_type: string | null;
  payed_date: string | null;
  payment_status: string | null;
  status: string | null;
  client_id: string;
  clients?: { company_name: string | null } | null;
};

function decodeCsv(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
}

function parseCSV(text: string): SheetRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));
  return rows.slice(1).map((values) => {
    const record: SheetRow = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

function parseEuroPrice(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/€/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function parseDate(val: string): string | null {
  if (!val || val === "-" || val === "—") return null;
  const trimmed = val.trim();
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function normalizeText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[™®]/g, "").replace(/\u200b/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeCompanyName(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeOrderCode(value: string): string {
  return normalizeCompanyName(value).replace(/\bno\b/g, "").replace(/\bn\b/g, "").replace(/\bof\b/g, "").replace(/\bdel\b/g, "").replace(/\s+/g, " ").trim();
}

function normalizeProductName(name: string): string {
  return normalizeText(name);
}

function buildFallbackKey(companyName: string, totalAmount: number, orderType: string | null, referenceDate: string | null, status: string | null, paymentStatus: string | null): string | null {
  const normalizedCompany = normalizeCompanyName(companyName);
  if (!normalizedCompany) return null;
  const normalizedOrderType = normalizeText(orderType || "");
  if (totalAmount > 0) {
    return `${normalizedCompany}|amount|${totalAmount.toFixed(2)}|${normalizedOrderType}`;
  }
  const normalizedStatus = normalizeText(status || "");
  const normalizedPaymentStatus = normalizeText(paymentStatus || "");
  const normalizedReferenceDate = referenceDate || "";
  if (!normalizedReferenceDate && !normalizedStatus && !normalizedPaymentStatus) return null;
  return `${normalizedCompany}|zero|${normalizedOrderType}|${normalizedReferenceDate}|${normalizedStatus}|${normalizedPaymentStatus}`;
}

function resolveOrderTimestamp(orderDate: string | null, payedDate: string | null, pickupDate: string | null, deliveryDate: string | null): string | null {
  return orderDate || payedDate || pickupDate || deliveryDate;
}

function shouldSkipRow(row: SheetRow): boolean {
  const type = (row["Type"] || "").trim().toUpperCase();
  const typeOrder = (row["Type order"] || "").trim().toUpperCase();
  return type === "B2C" || type === "CUSTOM" || typeOrder.includes("B2C") || typeOrder === "CUSTOM";
}

function mapOrderStatus(raw: string): string {
  const lower = raw.toLowerCase().trim();
  const statusMap: Record<string, string> = {
    "delivered": "delivered",
    "shipped": "shipped",
    "processing": "processing",
    "confirmed": "confirmed",
    "submitted": "submitted",
    "ready to ship": "ready_to_ship",
    "ready_to_ship": "ready_to_ship",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "returned": "returned",
    "draft": "draft",
    "lost": "cancelled",
    "to be prepared": "processing",
    "to be shipped": "ready_to_ship",
    "in progress": "processing",
    "in production": "processing",
    "waiting": "confirmed",
    "pending": "submitted",
  };
  return statusMap[lower] || "confirmed";
}

function mapPaymentStatus(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  const paymentMap: Record<string, string> = {
    "paid": "paid",
    "payed": "paid",
    "unpaid": "unpaid",
    "pending": "pending",
    "to be paid": "unpaid",
    "to be invoiced": "unpaid",
    "lost": "unpaid",
    "partial": "pending",
  };
  return paymentMap[lower] || "unpaid";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const csvResp = await fetch(CSV_URL);
    if (!csvResp.ok) throw new Error(`Failed to fetch sheet: ${csvResp.status}`);

    const csvBuffer = await csvResp.arrayBuffer();
    const csvText = decodeCsv(csvBuffer);
    const rows = parseCSV(csvText).filter((row) => !shouldSkipRow(row));

    console.log(`Fetched ${rows.length} valid rows from Google Sheet`);

    const { data: existingClients } = await supabase.from("clients").select("id, company_name");
    const clientMap = new Map<string, string>();
    (existingClients || []).forEach((client: any) => {
      clientMap.set(normalizeCompanyName(client.company_name || ""), client.id);
    });

    const { data: existingProducts } = await supabase.from("products").select("id, name");
    const productMap = new Map<string, string>();
    (existingProducts || []).forEach((product: any) => {
      productMap.set(normalizeProductName(product.name || ""), product.id);
    });

    const { data: existingOrders } = await supabase
      .from("orders")
      .select("id, created_at, order_code, total_amount, order_type, payed_date, payment_status, status, client_id, clients(company_name)");

    const exactOrderMap = new Map<string, string>();
    const normalizedOrderMap = new Map<string, string>();
    const fallbackOrderMap = new Map<string, string[]>();

    (existingOrders as ExistingOrderRow[] | null)?.forEach((order) => {
      if (!order.order_code) return;
      const exactCode = order.order_code.trim();
      exactOrderMap.set(exactCode, order.id);
      const normalizedCode = normalizeOrderCode(exactCode);
      if (normalizedCode && !normalizedOrderMap.has(normalizedCode)) {
        normalizedOrderMap.set(normalizedCode, order.id);
      }
      const companyName = order.clients?.company_name || "";
      const fallbackKey = buildFallbackKey(companyName, Number(order.total_amount || 0), order.order_type, order.payed_date || order.created_at?.slice(0, 10) || null, order.status, order.payment_status);
      if (fallbackKey) {
        const ids = fallbackOrderMap.get(fallbackKey) || [];
        ids.push(order.id);
        fallbackOrderMap.set(fallbackKey, ids);
      }
    });

    const orderGroups = new Map<string, SheetRow[]>();
    for (const row of rows) {
      const code = row["Code"]?.trim();
      const business = row["Business"]?.trim();
      if (!code || !business) continue;
      if (!orderGroups.has(code)) orderGroups.set(code, []);
      orderGroups.get(code)!.push(row);
    }

    let newOrders = 0;
    let updatedOrders = 0;
    let newProducts = 0;
    let newClients = 0;
    let normalizedMatches = 0;
    let fallbackMatches = 0;

    for (const [orderCode, orderRows] of orderGroups) {
      const firstRow = orderRows[0];
      const business = firstRow["Business"]?.trim();
      if (!business) continue;

      const normalizedBusiness = normalizeCompanyName(business);
      let clientId = clientMap.get(normalizedBusiness);
      if (!clientId) {
        const country = firstRow["Country"]?.trim() || null;
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ company_name: business, country, status: "active" })
          .select("id")
          .single();

        if (clientErr || !newClient) {
          console.error(`Failed to create client ${business}:`, clientErr);
          continue;
        }

        clientId = newClient.id;
        clientMap.set(normalizedBusiness, clientId);
        newClients++;
      }

      let itemsTotal = 0;
      const items: { product: string; qty: number; price: number }[] = [];
      for (const row of orderRows) {
        const product = row["Product"]?.trim();
        const qtyStr = row["Outcoming. Q.ty"]?.trim();
        const priceStr = row["Price"]?.trim();
        if (!product) continue;
        const qty = parseInt(qtyStr) || 0;
        const price = parseEuroPrice(priceStr);
        items.push({ product, qty, price });
        itemsTotal += price;
      }
      itemsTotal = Math.round(itemsTotal * 100) / 100;

      const shippingClient = parseEuroPrice(firstRow["Client Shipping costs"] || "");
      const shippingEasysea = parseEuroPrice(firstRow["Shipping costs (EASYSEA)"] || "");
      const rawStatus = firstRow["Status order"]?.trim() || "draft";
      const status = mapOrderStatus(rawStatus);
      const rawPaymentStatus = firstRow["Status Payement"]?.trim() || null;
      const paymentStatus = mapPaymentStatus(rawPaymentStatus);
      const orderDate = parseDate(firstRow["Order date"]?.trim() || "");
      const payedDate = parseDate(firstRow["Payed date"]?.trim() || "");
      const deliveryDate = parseDate(firstRow["Delivery Date"]?.trim() || "");
      const pickupDate = parseDate(firstRow["Pick Up Date"]?.trim() || "");
      const effectiveOrderDate = resolveOrderTimestamp(orderDate, payedDate, pickupDate, deliveryDate);
      const trackingUrl = firstRow["Tracking"]?.trim() || null;
      const notes = firstRow["Notes"]?.trim() || null;
      const orderType = firstRow["Type order"]?.trim() || null;

      const orderData = {
        client_id: clientId,
        order_code: orderCode,
        total_amount: itemsTotal,
        shipping_cost_client: shippingClient || 0,
        shipping_cost_easysea: shippingEasysea || 0,
        status,
        payment_status: paymentStatus,
        payed_date: payedDate,
        delivery_date: deliveryDate,
        pickup_date: pickupDate,
        tracking_url: trackingUrl,
        notes,
        order_type: orderType,
        ...(effectiveOrderDate ? { created_at: new Date(`${effectiveOrderDate}T12:00:00Z`).toISOString() } : {}),
      };

      let orderId = exactOrderMap.get(orderCode);
      if (!orderId) {
        const normalizedCode = normalizeOrderCode(orderCode);
        orderId = normalizedOrderMap.get(normalizedCode);
        if (orderId) normalizedMatches++;
      }

      if (!orderId) {
        const fallbackKey = buildFallbackKey(business, itemsTotal, orderType, payedDate || effectiveOrderDate, status, paymentStatus);
        const fallbackIds = fallbackKey ? fallbackOrderMap.get(fallbackKey) || [] : [];
        if (fallbackIds.length === 1) {
          orderId = fallbackIds[0];
          fallbackMatches++;
        }
      }

      if (orderId) {
        const { error: updateError } = await supabase.from("orders").update(orderData).eq("id", orderId);
        if (updateError) {
          console.error(`Failed to update order ${orderCode}:`, updateError);
          continue;
        }
        updatedOrders++;
      } else {
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert(orderData)
          .select("id")
          .single();

        if (orderErr || !newOrder) {
          console.error(`Failed to create order ${orderCode}:`, orderErr);
          continue;
        }

        orderId = newOrder.id;
        newOrders++;
      }

      exactOrderMap.set(orderCode, orderId);
      normalizedOrderMap.set(normalizeOrderCode(orderCode), orderId);
      const fallbackKey = buildFallbackKey(business, itemsTotal, orderType, payedDate || effectiveOrderDate, status, paymentStatus);
      if (fallbackKey) {
        fallbackOrderMap.set(fallbackKey, [orderId]);
      }

      await supabase.from("order_items").delete().eq("order_id", orderId);

      for (const item of items) {
        if (!item.product || item.qty === 0) continue;

        const normName = normalizeProductName(item.product);
        let productId = productMap.get(normName);
        if (!productId) {
          const { data: newProd, error: prodErr } = await supabase
            .from("products")
            .insert({ name: item.product })
            .select("id")
            .single();

          if (prodErr || !newProd) {
            console.error(`Failed to create product ${item.product}:`, prodErr);
            continue;
          }

          productId = newProd.id;
          productMap.set(normName, productId);
          newProducts++;
        }

        const unitPrice = item.qty > 0 ? item.price / item.qty : 0;
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_id: productId,
          quantity: item.qty,
          unit_price: Math.round(unitPrice * 100) / 100,
          subtotal: Math.round(item.price * 100) / 100,
        });
      }
    }

    const summary = {
      success: true,
      totalRows: rows.length,
      totalOrders: orderGroups.size,
      newOrders,
      updatedOrders,
      newProducts,
      newClients,
      normalizedMatches,
      fallbackMatches,
      syncedAt: new Date().toISOString(),
    };

    console.log("Sync complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEET_ID = "1S_Si86x7GdKAuRdRkx5wFK231lGnujChZtFXwo9tMzg";
const GID = "724823086";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  
  // Parse header - handle quoted fields
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

function parseEuroPrice(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/€/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(val: string): string | null {
  if (!val || val === "-" || val === "—") return null;
  // Try DD/MM/YYYY
  const dmy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

function normalizeProductName(name: string): string {
  return name.replace(/™/g, "").replace(/®/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch CSV from Google Sheet
    const csvResp = await fetch(CSV_URL);
    if (!csvResp.ok) throw new Error(`Failed to fetch sheet: ${csvResp.status}`);
    const csvText = await csvResp.text();
    const rows = parseCSV(csvText);

    console.log(`Fetched ${rows.length} rows from Google Sheet`);

    // Get existing clients
    const { data: existingClients } = await supabase.from("clients").select("id, company_name");
    const clientMap = new Map<string, string>();
    (existingClients || []).forEach((c: any) => {
      clientMap.set(c.company_name.toLowerCase().trim(), c.id);
    });

    // Get existing products
    const { data: existingProducts } = await supabase.from("products").select("id, name");
    const productMap = new Map<string, string>();
    (existingProducts || []).forEach((p: any) => {
      productMap.set(normalizeProductName(p.name), p.id);
    });

    // Get existing orders
    const { data: existingOrders } = await supabase.from("orders").select("id, order_code");
    const orderMap = new Map<string, string>();
    (existingOrders || []).forEach((o: any) => {
      if (o.order_code) orderMap.set(o.order_code, o.id);
    });

    // Group rows by order code
    const orderGroups = new Map<string, typeof rows>();
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

    for (const [orderCode, orderRows] of orderGroups) {
      const firstRow = orderRows[0];
      const business = firstRow["Business"]?.trim();
      if (!business) continue;

      // Find or create client
      let clientId = clientMap.get(business.toLowerCase().trim());
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
        clientMap.set(business.toLowerCase().trim(), clientId);
        newClients++;
      }

      // Calculate order totals from items
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

      const shippingClient = parseEuroPrice(firstRow["Client Shipping costs"] || "");
      const shippingEasysea = parseEuroPrice(firstRow["Shipping costs (EASYSEA)"] || "");
      const status = firstRow["Status order"]?.trim() || "draft";
      const paymentStatus = firstRow["Status Payement"]?.trim() || null;
      const orderDate = parseDate(firstRow["Order date"]?.trim() || "");
      const payedDate = parseDate(firstRow["Payed date"]?.trim() || "");
      const deliveryDate = parseDate(firstRow["Delivery Date"]?.trim() || "");
      const pickupDate = parseDate(firstRow["Pick Up Date"]?.trim() || "");
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
        ...(orderDate ? { created_at: new Date(orderDate + "T12:00:00Z").toISOString() } : {}),
      };

      let orderId: string;

      if (orderMap.has(orderCode)) {
        // Update existing order
        orderId = orderMap.get(orderCode)!;
        const { created_at, ...updateData } = orderData as any;
        await supabase.from("orders").update(updateData).eq("id", orderId);
        updatedOrders++;
      } else {
        // Create new order
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
        orderMap.set(orderCode, orderId);
        newOrders++;
      }

      // Sync order items - delete existing and recreate
      await supabase.from("order_items").delete().eq("order_id", orderId);

      for (const item of items) {
        if (!item.product || item.qty === 0) continue;

        // Find or create product
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
      syncedAt: new Date().toISOString(),
    };

    console.log("Sync complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

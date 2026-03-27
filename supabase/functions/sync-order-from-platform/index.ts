import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      platform_order_id,
      platform_client_id,
      order_date,
      status,
      total_value,
      items,
    } = body;

    if (!platform_client_id || !order_date || !total_value) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: platform_client_id, order_date, total_value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the client by platform_client_id
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, status, total_orders_count, total_orders_value")
      .eq("platform_client_id", platform_client_id)
      .single();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found for platform_client_id: " + platform_client_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        client_id: client.id,
        order_code: platform_order_id || null,
        created_at: order_date,
        status: status || "confirmed",
        total_amount: total_value,
        order_type: "B2B",
        notes: `Synced from platform (${platform_order_id || "no-id"})`,
      })
      .select("id")
      .single();

    if (orderErr) {
      return new Response(
        JSON.stringify({ error: "Failed to insert order", details: orderErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert order items if provided
    if (items?.length && order) {
      for (const item of items) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          subtotal: (item.quantity || 1) * (item.unit_price || 0),
        });
      }
    }

    // Recalculate client order stats
    const { data: allOrders } = await supabase
      .from("orders")
      .select("created_at, total_amount")
      .eq("client_id", client.id)
      .not("status", "in", '("cancelled","draft")')
      .order("created_at", { ascending: true });

    const orderCount = allOrders?.length || 0;
    const orderTotal = allOrders?.reduce((s, o) => s + Number(o.total_amount || 0), 0) || 0;
    const lastOrder = allOrders?.[allOrders.length - 1];
    const lastOrderDate = lastOrder?.created_at?.slice(0, 10) || null;
    const lastOrderValue = Number(lastOrder?.total_amount || 0);

    // Calculate avg frequency
    let avgFrequency: number | null = null;
    if (allOrders && allOrders.length >= 2) {
      const dates = allOrders.map((o) => new Date(o.created_at).getTime());
      let totalDiff = 0;
      for (let i = 1; i < dates.length; i++) {
        totalDiff += dates[i] - dates[i - 1];
      }
      avgFrequency = Math.round(totalDiff / (dates.length - 1) / (1000 * 60 * 60 * 24));
    }

    // Update client
    const newStatus = client.status === "onboarding" ? "active" : client.status;

    await supabase
      .from("clients")
      .update({
        last_order_date: lastOrderDate,
        last_order_value: lastOrderValue,
        total_orders_count: orderCount,
        total_orders_value: orderTotal,
        avg_order_frequency_days: avgFrequency,
        status: newStatus,
      })
      .eq("id", client.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order?.id,
        client_id: client.id,
        updated_status: newStatus,
        stats: { orderCount, orderTotal, lastOrderDate, avgFrequency },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

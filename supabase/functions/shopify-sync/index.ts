import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeStoreDomain = (value: string) => {
  const cleaned = value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hostname = cleaned.split("/")[0];
  return hostname.includes(".") ? hostname : `${hostname}.myshopify.com`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  const SHOPIFY_STORE_DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (!SHOPIFY_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SHOPIFY_STORE_DOMAIN) {
    return new Response(JSON.stringify({ error: "SHOPIFY_STORE_DOMAIN is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const storeDomain = normalizeStoreDomain(SHOPIFY_STORE_DOMAIN);

  try {
    const allProducts: any[] = [];
    let pageInfo: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const params = new URLSearchParams({ limit: "250" });
      if (pageInfo) {
        params.set("page_info", pageInfo);
      } else {
        params.set("fields", "id,title,variants,images,status");
      }

      const url = `https://${storeDomain}/admin/api/2024-01/products.json?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error [${res.status}] for ${storeDomain}: ${body}`);
      }

      const data = await res.json();
      allProducts.push(...(data.products || []));

      const linkHeader = res.headers.get("Link") || "";
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
      pageInfo = nextMatch?.[1] ?? null;
      hasNext = Boolean(pageInfo);
    }

    const variants = allProducts.flatMap((p: any) =>
      (p.variants || []).map((v: any) => ({
        shopify_product_id: String(p.id),
        shopify_variant_id: String(v.id),
        product_title: p.title,
        variant_title: v.title === "Default Title" ? p.title : `${p.title} - ${v.title}`,
        sku: v.sku || "",
        barcode: v.barcode || null,
        price: parseFloat(v.price) || 0,
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        inventory_quantity: v.inventory_quantity || 0,
        image: p.images?.[0]?.src || null,
      })),
    );

    return new Response(JSON.stringify({ products: variants, total: variants.length, storeDomain }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Shopify sync error:", error);
    return new Response(JSON.stringify({ error: error.message, storeDomain }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
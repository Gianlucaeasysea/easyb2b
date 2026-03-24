import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  const SHOPIFY_STORE_DOMAIN = Deno.env.get('SHOPIFY_STORE_DOMAIN');

  if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_STORE_DOMAIN) {
    return new Response(JSON.stringify({ error: 'Shopify credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const allProducts: any[] = [];
    let pageInfo: string | null = null;
    let hasNext = true;

    while (hasNext) {
      let url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,title,variants,images,status`;
      if (pageInfo) {
        url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`;
      }

      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shopify API error [${res.status}]: ${body}`);
      }

      const data = await res.json();
      allProducts.push(...(data.products || []));

      // Check Link header for pagination
      const linkHeader = res.headers.get('Link') || '';
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        pageInfo = nextMatch[1];
      } else {
        hasNext = false;
      }
    }

    // Flatten variants
    const variants = allProducts.flatMap((p: any) =>
      (p.variants || []).map((v: any) => ({
        shopify_product_id: String(p.id),
        shopify_variant_id: String(v.id),
        product_title: p.title,
        variant_title: v.title === 'Default Title' ? p.title : `${p.title} - ${v.title}`,
        sku: v.sku || '',
        price: parseFloat(v.price) || 0,
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        inventory_quantity: v.inventory_quantity || 0,
        image: p.images?.[0]?.src || null,
      }))
    );

    return new Response(JSON.stringify({ products: variants, total: variants.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

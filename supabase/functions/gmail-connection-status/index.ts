import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const { data: role } = await supabase.rpc('get_user_role', { _user_id: user.id })

  if (!role || !['admin', 'sales'].includes(role)) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from('gmail_tokens')
    .select('email, expires_at, updated_at')
    .eq('email', 'business@easysea.org')
    .maybeSingle()

  if (tokenError) {
    console.error('Failed to read gmail_tokens:', tokenError)
    return jsonResponse({ error: 'Failed to read connection status' }, 500)
  }

  return jsonResponse({
    connected: !!tokenRow,
    email: tokenRow?.email ?? 'business@easysea.org',
    expiresAt: tokenRow?.expires_at ?? null,
    updatedAt: tokenRow?.updated_at ?? null,
  })
})

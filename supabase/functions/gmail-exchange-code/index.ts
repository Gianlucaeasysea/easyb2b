import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGmailOAuthConfig } from '../_shared/gmail-oauth-config.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

function toOrigin(value: string | null) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const DEFAULT_APP_URL = 'https://b2b.easysea.org'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const requestedWith = req.headers.get('x-requested-with')
  if (requestedWith?.toLowerCase() !== 'xmlhttprequest') {
    return jsonResponse({ error: 'Invalid request source' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  let oauthConfig
  try {
    oauthConfig = getGmailOAuthConfig()
  } catch (error) {
    console.error('Missing Gmail OAuth config:', error)
    return jsonResponse({ error: 'Missing Gmail OAuth configuration' }, 500)
  }

  let payload: { code?: string; redirectUri?: string }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!payload.code) {
    return jsonResponse({ error: 'Missing authorization code' }, 400)
  }

  const requestOrigin = toOrigin(req.headers.get('origin'))
  const redirectUri = toOrigin(payload.redirectUri ?? null) ?? requestOrigin

  if (!redirectUri) {
    return jsonResponse({ error: 'Missing redirect URI origin' }, 400)
  }

  const allowedOrigins = new Set(
    [requestOrigin, toOrigin(Deno.env.get('APP_URL')), toOrigin(DEFAULT_APP_URL)].filter(
      (value): value is string => Boolean(value)
    )
  )

  if (!allowedOrigins.has(redirectUri)) {
    return jsonResponse({ error: 'Redirect URI origin not allowed' }, 400)
  }

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

  const { data: existingTokenRow } = await supabase
    .from('gmail_tokens')
    .select('id, refresh_token')
    .eq('email', 'business@easysea.org')
    .maybeSingle()

  console.log('Exchanging Google auth code using popup flow origin:', redirectUri)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: payload.code,
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', JSON.stringify(tokenData))
    return jsonResponse({
      error: 'Token exchange failed',
      details: tokenData.error_description || tokenData.error || 'Unknown Google OAuth error',
    }, 400)
  }

  const refreshToken = tokenData.refresh_token ?? existingTokenRow?.refresh_token

  if (!refreshToken) {
    return jsonResponse({
      error: 'Missing refresh token',
      details: 'Google non ha restituito un refresh token. Revoca l\'accesso all\'app nelle autorizzazioni Google e riprova.',
    }, 400)
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error: dbError } = await supabase
    .from('gmail_tokens')
    .upsert({
      email: 'business@easysea.org',
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (dbError) {
    console.error('DB save error:', JSON.stringify(dbError))
    return jsonResponse({ error: 'Failed to save Gmail tokens' }, 500)
  }

  return jsonResponse({
    success: true,
    connected: true,
    email: 'business@easysea.org',
    expiresAt,
  })
})

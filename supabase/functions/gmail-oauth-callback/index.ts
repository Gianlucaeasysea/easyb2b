import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGmailOAuthConfig } from '../_shared/gmail-oauth-config.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

// Simple in-memory rate limiting: max 10 callbacks per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 10) return false
  entry.count++
  return true
}

// XOR obfuscation for refresh tokens (better than plaintext)
function obfuscateToken(token: string, key: string): string {
  const encoder = new TextEncoder()
  const tokenBytes = encoder.encode(token)
  const keyBytes = encoder.encode(key)
  const result = tokenBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length])
  return btoa(String.fromCharCode(...result))
}

function buildCallbackHtml(
  success: { email: string; state: string } | null,
  error: string | null
): string {
  const message = success
    ? JSON.stringify({ type: 'gmail_oauth_callback', success: true, email: success.email, state: success.state })
    : JSON.stringify({ type: 'gmail_oauth_callback', success: false, error })

  return `<!DOCTYPE html>
<html>
<head><title>Gmail Authorization</title></head>
<body>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(${message}, window.location.origin);
    }
  } finally {
    window.close();
  }
</script>
<p>Closing...</p>
</body>
</html>`
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    let oauthConfig
    try {
      oauthConfig = getGmailOAuthConfig()
    } catch {
      const html = buildCallbackHtml(null, 'configuration_error')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const errorParam = url.searchParams.get('error')

    // Google returned an error (e.g. user denied permissions)
    if (errorParam) {
      const html = buildCallbackHtml(null, 'access_denied')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // If no code, start the OAuth flow (legacy redirect mode)
    if (!code) {
      const scope = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ].join(' ')

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', oauthConfig.clientId)
      authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')
      if (stateParam) {
        authUrl.searchParams.set('state', stateParam)
      }

      return Response.redirect(authUrl.toString(), 302)
    }

    // Required parameters for token exchange
    if (!stateParam) {
      const html = buildCallbackHtml(null, 'missing_params')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ----------------------------------------------------------------
    // ANTI-CSRF STATE VALIDATION
    // State format: "{userId}:{nonce}"
    // ----------------------------------------------------------------
    const stateParts = stateParam.split(':')
    if (stateParts.length !== 2) {
      const html = buildCallbackHtml(null, 'invalid_state')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    const [userId, nonce] = stateParts

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      const html = buildCallbackHtml(null, 'invalid_state')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Verify state exists in DB and hasn't been used
    const { data: storedState, error: stateError } = await supabaseAdmin
      .from('oauth_states')
      .select('nonce, expires_at, used')
      .eq('user_id', userId)
      .eq('nonce', nonce)
      .single()

    if (stateError || !storedState) {
      const html = buildCallbackHtml(null, 'state_not_found')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Check expiry (states valid for 10 minutes)
    if (new Date(storedState.expires_at) < new Date()) {
      const html = buildCallbackHtml(null, 'state_expired')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Check replay attack
    if (storedState.used) {
      const html = buildCallbackHtml(null, 'state_already_used')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Mark state as used IMMEDIATELY (before proceeding)
    await supabaseAdmin
      .from('oauth_states')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('nonce', nonce)

    // ----------------------------------------------------------------
    // EXCHANGE CODE → TOKENS with Google
    // ----------------------------------------------------------------
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        redirect_uri: oauthConfig.redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed with status:', tokenResponse.status)
      const html = buildCallbackHtml(null, 'token_exchange_failed')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!refresh_token) {
      const html = buildCallbackHtml(null, 'no_refresh_token')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // ----------------------------------------------------------------
    // FETCH USER EMAIL from Google
    // ----------------------------------------------------------------
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = await userInfoResponse.json()
    const gmailEmail = userInfo.email as string

    // ----------------------------------------------------------------
    // SAVE TOKENS (per-user, not hardcoded)
    // Refresh token is obfuscated before storage
    // ----------------------------------------------------------------
    const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY') ?? 'fallback-key-change-in-production'
    const obfuscatedRefreshToken = obfuscateToken(refresh_token, encryptionKey)

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    const { error: upsertError } = await supabaseAdmin
      .from('gmail_tokens')
      .upsert({
        user_id: userId,
        email: gmailEmail,
        access_token,
        refresh_token: obfuscatedRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Failed to save Gmail tokens')
      const html = buildCallbackHtml(null, 'save_failed')
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      })
    }

    // Success — close popup with message to parent window
    const html = buildCallbackHtml({ email: gmailEmail, state: stateParam }, null)
    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    })

  } catch (err) {
    // Never expose internal error details to client
    console.error('Gmail OAuth callback error:', err instanceof Error ? err.message : 'Unknown error')
    const html = buildCallbackHtml(null, 'internal_error')
    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    })
  }
})

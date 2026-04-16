import { createClient } from 'npm:@supabase/supabase-js@2'

const GMAIL_EMAIL = 'business@easysea.org'

/**
 * Deobfuscate a token that was XOR-obfuscated before storage.
 */
export function deobfuscateToken(obfuscated: string, key: string): string {
  const raw = atob(obfuscated)
  const bytes = new Uint8Array([...raw].map(c => c.charCodeAt(0)))
  const keyBytes = new TextEncoder().encode(key)
  const result = bytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length])
  return new TextDecoder().decode(result)
}

/**
 * Get a valid Gmail access token, refreshing if needed.
 * Returns the access token string.
 */
export async function getValidGmailAccessToken(): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: tokenRow, error } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('email', GMAIL_EMAIL)
    .maybeSingle()

  if (error || !tokenRow) {
    throw new Error('Gmail not connected — no token found')
  }

  // Check if token is still valid (with 2-min buffer)
  if (new Date(tokenRow.expires_at) > new Date(Date.now() + 120_000)) {
    return tokenRow.access_token
  }

  // Need to refresh
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY') ?? 'fallback-key-change-in-production'
  const { clientId, clientSecret } = getOAuthConfig()

  // Try to deobfuscate; if it looks like a raw Google token, use as-is
  let refreshToken: string
  const storedToken = tokenRow.refresh_token
  if (storedToken.startsWith('1//') || storedToken.startsWith('1/')) {
    // Already plaintext Google refresh token
    refreshToken = storedToken
  } else {
    refreshToken = deobfuscateToken(storedToken, encryptionKey)
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${data.error || JSON.stringify(data)}`)
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  await supabase
    .from('gmail_tokens')
    .update({
      access_token: data.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenRow.id)

  console.log(`Gmail token refreshed successfully, new expiry: ${newExpiresAt}`)
  return data.access_token
}

function getOAuthConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? Deno.env.get('CLIENTI_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? Deno.env.get('CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('Missing Gmail OAuth configuration')
  }
  return { clientId, clientSecret }
}

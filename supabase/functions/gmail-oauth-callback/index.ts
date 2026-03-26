import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGmailOAuthConfig } from '../_shared/gmail-oauth-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let oauthConfig
  try {
    oauthConfig = getGmailOAuthConfig()
  } catch (error) {
    console.error('Missing Gmail OAuth config:', error)
    return new Response(
      `<html><body><h2>Configurazione Gmail incompleta</h2><p>Mancano le credenziali OAuth necessarie per collegare Gmail.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    )
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return new Response(`<html><body><h2>Errore OAuth: ${error}</h2><p>Chiudi questa finestra e riprova.</p></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!code) {
    // Start OAuth flow
    const scope = 'https://www.googleapis.com/auth/gmail.readonly'
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', oauthConfig.clientId)
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('login_hint', 'business@easysea.org')

    return Response.redirect(authUrl.toString(), 302)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokenData)
    return new Response(`<html><body><h2>Errore scambio token</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  // Upsert tokens (one row for the account)
  const { error: dbError } = await supabase
    .from('gmail_tokens')
    .upsert({
      email: 'business@easysea.org',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      user_id: '00000000-0000-0000-0000-000000000000', // system-level
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (dbError) {
    console.error('DB save error:', dbError)
    return new Response(`<html><body><h2>Errore salvataggio token</h2><pre>${JSON.stringify(dbError)}</pre></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return new Response(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h2>✅ Gmail collegato con successo!</h2>
      <p>L'account business@easysea.org è ora connesso al CRM.</p>
      <p>Puoi chiudere questa finestra.</p>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } })
})

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGmailOAuthConfig } from '../_shared/gmail-oauth-config.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

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

  const appUrl = Deno.env.get('APP_URL') || 'https://easyb2b.lovable.app'

  if (error) {
    console.error('OAuth error from Google:', error)
    const redirectUrl = `${appUrl}/crm/contacts?gmail_status=error&gmail_error=${encodeURIComponent(error)}`
    return Response.redirect(redirectUrl, 302)
  }

  if (!code) {
    console.log('Starting Gmail OAuth flow...')
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
    authUrl.searchParams.set('login_hint', 'business@easysea.org')

    console.log('Redirecting to Google with redirect_uri:', oauthConfig.redirectUri)
    return Response.redirect(authUrl.toString(), 302)
  }

  console.log('Received authorization code, exchanging for tokens...')

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
    console.error('Token exchange failed:', JSON.stringify(tokenData))
    const redirectUrl = `${appUrl}/crm/contacts?gmail_status=error&gmail_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Token exchange failed')}`
    return Response.redirect(redirectUrl, 302)
  }

  console.log('Token exchange successful, saving to database...')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error: dbError } = await supabase
    .from('gmail_tokens')
    .upsert({
      email: 'business@easysea.org',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      user_id: '00000000-0000-0000-0000-000000000000',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (dbError) {
    console.error('DB save error:', JSON.stringify(dbError))
    const redirectUrl = `${appUrl}/crm/contacts?gmail_status=error&gmail_error=${encodeURIComponent('Errore salvataggio token')}`
    return Response.redirect(redirectUrl, 302)
  }

  console.log('Gmail tokens saved successfully!')

  const redirectUrl = `${appUrl}/crm/contacts?gmail_status=success`
  return Response.redirect(redirectUrl, 302)
})

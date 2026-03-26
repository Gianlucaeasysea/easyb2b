export function getGmailOAuthConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? Deno.env.get('CLIENTI_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? Deno.env.get('CLIENT_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  if (!clientId || !clientSecret || !supabaseUrl) {
    throw new Error('Missing Gmail OAuth configuration')
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${supabaseUrl}/functions/v1/gmail-oauth-callback`,
  }
}
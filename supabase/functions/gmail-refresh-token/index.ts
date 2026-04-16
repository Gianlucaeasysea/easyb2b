import { getCorsHeaders } from '../_shared/cors.ts'
import { getValidGmailAccessToken } from '../_shared/gmail-token-utils.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const accessToken = await getValidGmailAccessToken()
    return new Response(
      JSON.stringify({ success: true, message: 'Gmail token is valid', tokenPreview: accessToken.slice(0, 8) + '...' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Gmail token refresh failed:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

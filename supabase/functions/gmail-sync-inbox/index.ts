import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshTokenIfNeeded(supabase: any, tokenRow: any): Promise<string> {
  if (new Date(tokenRow.expires_at) > new Date(Date.now() + 60000)) {
    return tokenRow.access_token
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase
    .from('gmail_tokens')
    .update({ access_token: data.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  return data.access_token
}

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : headerValue.toLowerCase().trim()
}

function decodeBody(body: any): string {
  if (body?.data) {
    try {
      const decoded = atob(body.data.replace(/-/g, '+').replace(/_/g, '/'))
      return decoded
    } catch { return '' }
  }
  return ''
}

function extractTextFromParts(parts: any[]): { text: string; html: string } {
  let text = ''
  let html = ''
  for (const part of parts) {
    if (part.mimeType === 'text/plain') text += decodeBody(part.body)
    else if (part.mimeType === 'text/html') html += decodeBody(part.body)
    else if (part.parts) {
      const sub = extractTextFromParts(part.parts)
      text += sub.text
      html += sub.html
    }
  }
  return { text, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Auth check
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check role
  const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id })
  if (!roleData || !['admin', 'sales'].includes(roleData)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get Gmail token
  const { data: tokenRow } = await supabase
    .from('gmail_tokens')
    .select('*')
    .eq('email', 'business@easysea.org')
    .single()

  if (!tokenRow) {
    return new Response(JSON.stringify({ error: 'Gmail not connected', needs_auth: true }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let accessToken: string
  try {
    accessToken = await refreshTokenIfNeeded(supabase, tokenRow)
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Token refresh failed', details: err.message, needs_auth: true }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get clients with email
  const { data: clients } = await supabase
    .from('clients')
    .select('id, email, company_name')
    .not('email', 'is', null)

  if (!clients?.length) {
    return new Response(JSON.stringify({ synced: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const clientEmailMap = new Map<string, { id: string; name: string }>()
  for (const c of clients) {
    if (c.email) clientEmailMap.set(c.email.toLowerCase(), { id: c.id, name: c.company_name })
  }

  // Fetch recent messages (last 50)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const listData = await listRes.json()

  if (!listData.messages?.length) {
    return new Response(JSON.stringify({ synced: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let synced = 0

  for (const msg of listData.messages) {
    // Check if already imported
    const { data: existing } = await supabase
      .from('client_communications')
      .select('id')
      .eq('gmail_message_id', msg.id)
      .maybeSingle()

    if (existing) continue

    // Fetch full message
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const msgData = await msgRes.json()

    const headers = msgData.payload?.headers || []
    const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || ''
    const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(nessun oggetto)'
    const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || ''

    const senderEmail = extractEmail(from)
    const client = clientEmailMap.get(senderEmail)

    if (!client) continue // Not from a known client

    // Extract body
    let bodyContent = ''
    if (msgData.payload?.parts) {
      const { html, text } = extractTextFromParts(msgData.payload.parts)
      bodyContent = html || text
    } else {
      bodyContent = decodeBody(msgData.payload?.body) || ''
    }

    // Insert as inbound communication
    await supabase.from('client_communications').insert({
      client_id: client.id,
      subject,
      body: bodyContent || '(contenuto vuoto)',
      direction: 'inbound',
      template_type: 'inbound',
      sent_by: user.id,
      recipient_email: 'business@easysea.org',
      status: 'received',
      gmail_message_id: msg.id,
      gmail_thread_id: msgData.threadId || null,
      created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
    })

    synced++
  }

  return new Response(JSON.stringify({ synced }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

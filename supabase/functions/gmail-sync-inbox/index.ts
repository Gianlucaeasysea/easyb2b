import { createClient } from 'npm:@supabase/supabase-js@2'
import { getGmailOAuthConfig } from '../_shared/gmail-oauth-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshTokenIfNeeded(supabase: any, tokenRow: any): Promise<string> {
  if (new Date(tokenRow.expires_at) > new Date(Date.now() + 60000)) {
    return tokenRow.access_token
  }
  const { clientId, clientSecret } = getGmailOAuthConfig()
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
      return atob(body.data.replace(/-/g, '+').replace(/_/g, '/'))
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

  // Build email→client map from BOTH clients.email AND client_contacts.email
  const { data: clients } = await supabase
    .from('clients')
    .select('id, email, company_name')
    .not('email', 'is', null)

  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('client_id, email, contact_name')
    .not('email', 'is', null)

  // Build a map: email -> { clientId, clientName }
  const emailToClient = new Map<string, { id: string; name: string }>()

  for (const c of (clients || [])) {
    if (c.email) {
      emailToClient.set(c.email.toLowerCase(), { id: c.id, name: c.company_name })
    }
  }
  for (const cc of (clientContacts || [])) {
    if (cc.email) {
      const parentClient = (clients || []).find(c => c.id === cc.client_id)
      emailToClient.set(cc.email.toLowerCase(), {
        id: cc.client_id,
        name: parentClient?.company_name || cc.contact_name || 'Unknown',
      })
    }
  }

  if (emailToClient.size === 0) {
    return new Response(JSON.stringify({ synced: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Collect unique emails to search for
  const allEmails = Array.from(emailToClient.keys())
  let synced = 0
  const processedMessageIds = new Set<string>()

  // Search Gmail for each client email (batch emails into groups to reduce API calls)
  // Gmail query: from:email OR to:email
  const BATCH_SIZE = 5 // search 5 emails at a time
  for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
    const batch = allEmails.slice(i, i + BATCH_SIZE)
    const queryParts = batch.map(e => `from:${e} OR to:${e}`).join(' OR ')
    const query = encodeURIComponent(queryParts)

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${query}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const listData = await listRes.json()

    if (!listData.messages?.length) continue

    for (const msg of listData.messages) {
      if (processedMessageIds.has(msg.id)) continue
      processedMessageIds.add(msg.id)

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
      const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || ''
      const cc = headers.find((h: any) => h.name.toLowerCase() === 'cc')?.value || ''
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(nessun oggetto)'
      const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || ''

      const senderEmail = extractEmail(from)
      const recipientEmail = extractEmail(to)

      // Determine direction and match client
      let client = emailToClient.get(senderEmail)
      let direction = 'inbound'
      let contactEmail = senderEmail

      if (!client) {
        client = emailToClient.get(recipientEmail)
        if (client) {
          direction = 'outbound'
          contactEmail = recipientEmail
        }
      }

      // Also check CC for client match
      if (!client && cc) {
        const ccParts = cc.split(',').map((e: string) => extractEmail(e.trim()))
        for (const ccEmail of ccParts) {
          client = emailToClient.get(ccEmail)
          if (client) {
            direction = 'inbound'
            contactEmail = ccEmail
            break
          }
        }
      }

      if (!client) continue

      // Extract body
      let bodyContent = ''
      if (msgData.payload?.parts) {
        const { html, text } = extractTextFromParts(msgData.payload.parts)
        bodyContent = html || text
      } else {
        bodyContent = decodeBody(msgData.payload?.body) || ''
      }

      // Store from/to/cc in metadata for display
      const emailMetadata: Record<string, any> = { from, to }
      if (cc) emailMetadata.cc = cc

      await supabase.from('client_communications').insert({
        client_id: client.id,
        subject,
        body: bodyContent || '(contenuto vuoto)',
        direction,
        template_type: direction === 'inbound' ? 'inbound' : 'custom',
        sent_by: user.id,
        recipient_email: contactEmail,
        status: direction === 'inbound' ? 'received' : 'sent',
        gmail_message_id: msg.id,
        gmail_thread_id: msgData.threadId || null,
        metadata: emailMetadata,
        created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      })

      synced++
    }
  }

  return new Response(JSON.stringify({ synced, searched_emails: allEmails.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getValidGmailAccessToken } from '../_shared/gmail-token-utils.ts'

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
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

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

  let accessToken: string
  try {
    accessToken = await getValidGmailAccessToken()
  } catch (err: any) {
    console.error('Token refresh failed:', err)
    return new Response(JSON.stringify({ error: 'Token refresh failed', needs_auth: true }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, email, company_name')
    .not('email', 'is', null)

  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('client_id, email, contact_name')
    .not('email', 'is', null)

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

  const allEmails = Array.from(emailToClient.keys())
  let synced = 0
  const processedMessageIds = new Set<string>()

  const BATCH_SIZE = 5
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

      const { data: existing } = await supabase
        .from('client_communications')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle()

      if (existing) continue

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

      let bodyContent = ''
      if (msgData.payload?.parts) {
        const { html, text } = extractTextFromParts(msgData.payload.parts)
        bodyContent = html || text
      } else {
        bodyContent = decodeBody(msgData.payload?.body) || ''
      }

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

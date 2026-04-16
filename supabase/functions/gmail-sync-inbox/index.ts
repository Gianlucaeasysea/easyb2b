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

const MAX_EXECUTION_MS = 120_000 // 120s hard cap (buffer before 150s timeout)
const MAX_MESSAGES_PER_RUN = 100

Deno.serve(async (req) => {
  const startTime = Date.now()
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

  // Build email→client map
  const [{ data: clients }, { data: clientContacts }] = await Promise.all([
    supabase.from('clients').select('id, email, company_name').not('email', 'is', null),
    supabase.from('client_contacts').select('client_id, email, contact_name').not('email', 'is', null),
  ])

  const emailToClient = new Map<string, { id: string; name: string }>()
  for (const c of (clients || [])) {
    if (c.email) emailToClient.set(c.email.toLowerCase(), { id: c.id, name: c.company_name })
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

  // Use a single broad query instead of per-batch queries
  const allEmails = Array.from(emailToClient.keys())
  let synced = 0
  let timedOut = false
  const processedMessageIds = new Set<string>()

  // Process in batches of emails for the query, but cap total messages
  const BATCH_SIZE = 10
  for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
    if (Date.now() - startTime > MAX_EXECUTION_MS || synced >= MAX_MESSAGES_PER_RUN) {
      timedOut = true
      break
    }

    const batch = allEmails.slice(i, i + BATCH_SIZE)
    const queryParts = batch.map(e => `from:${e} OR to:${e}`).join(' OR ')
    const query = encodeURIComponent(queryParts)

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${query}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const listData = await listRes.json()

    if (!listData.messages?.length) continue

    // Batch-check which gmail_message_ids already exist
    const msgIds = listData.messages
      .filter((m: any) => !processedMessageIds.has(m.id))
      .map((m: any) => m.id)
    
    if (msgIds.length === 0) continue

    const { data: existingRows } = await supabase
      .from('client_communications')
      .select('gmail_message_id')
      .in('gmail_message_id', msgIds)

    const existingIds = new Set((existingRows || []).map(r => r.gmail_message_id))

    const newMsgIds = msgIds.filter((id: string) => !existingIds.has(id))

    // Fetch new messages in parallel (up to 5 concurrent)
    const CONCURRENT = 5
    for (let j = 0; j < newMsgIds.length; j += CONCURRENT) {
      if (Date.now() - startTime > MAX_EXECUTION_MS || synced >= MAX_MESSAGES_PER_RUN) {
        timedOut = true
        break
      }

      const chunk = newMsgIds.slice(j, j + CONCURRENT)
      const msgResults = await Promise.all(
        chunk.map((id: string) =>
          fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).then(r => r.json()).then(data => ({ id, data }))
        )
      )

      const inserts: any[] = []

      for (const { id, data: msgData } of msgResults) {
        processedMessageIds.add(id)
        if (!msgData.payload) continue

        const headers = msgData.payload.headers || []
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || ''
        const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || ''
        const cc = headers.find((h: any) => h.name.toLowerCase() === 'cc')?.value || ''
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(no subject)'
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
        if (msgData.payload.parts) {
          const { html, text } = extractTextFromParts(msgData.payload.parts)
          bodyContent = html || text
        } else {
          bodyContent = decodeBody(msgData.payload.body) || ''
        }

        const emailMetadata: Record<string, any> = { from, to }
        if (cc) emailMetadata.cc = cc

        inserts.push({
          client_id: client.id,
          subject,
          body: bodyContent || '(empty)',
          direction,
          template_type: direction === 'inbound' ? 'inbound' : 'custom',
          sent_by: user.id,
          recipient_email: contactEmail,
          status: direction === 'inbound' ? 'received' : 'sent',
          gmail_message_id: id,
          gmail_thread_id: msgData.threadId || null,
          metadata: emailMetadata,
          created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        })
      }

      if (inserts.length > 0) {
        await supabase.from('client_communications').insert(inserts)
        synced += inserts.length
      }
    }

    if (timedOut) break
  }

  return new Response(JSON.stringify({ synced, searched_emails: allEmails.length, timedOut }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

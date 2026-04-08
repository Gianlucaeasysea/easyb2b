import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

const GMAIL_USER = 'business@easysea.org'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')

  if (!gmailPassword) {
    return new Response(JSON.stringify({ error: 'Gmail not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: roleData } = await adminClient.rpc('get_user_role', { _user_id: user.id })
  if (!roleData || !['admin', 'sales'].includes(roleData)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { to, subject, html, text, client_id, order_id, template_type, bcc, cc, idempotency_key, contact_id } = body

  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html/text' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Idempotency check: if key provided and already sent, return early
  if (idempotency_key) {
    const { data: existing } = await adminClient
      .from('client_communications')
      .select('id, status')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle()

    if (existing?.status === 'sent') {
      console.log(`Idempotency hit: ${idempotency_key} already sent`)
      return new Response(JSON.stringify({ success: true, deduplicated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Generate a unique key if not provided
  const commKey = idempotency_key || crypto.randomUUID()

  // Insert pending record BEFORE attempting send
  const { data: commRecord, error: insertError } = await adminClient
    .from('client_communications')
    .insert({
      client_id,
      order_id: order_id || null,
      contact_id: contact_id || null,
      subject,
      body: html || text,
      template_type: template_type || 'custom',
      sent_by: user.id,
      recipient_email: to,
      status: 'pending',
      idempotency_key: commKey,
      attempts: 0,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to create communication record:', insertError)
    return new Response(JSON.stringify({ error: 'Failed to create communication record' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const commId = commRecord.id
  const MAX_RETRIES = 3
  let lastError: string | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Send attempt ${attempt}/${MAX_RETRIES} for comm ${commId}`)

      const client = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: { username: GMAIL_USER, password: gmailPassword },
        },
      })

      await client.send({
        from: `EasySea <${GMAIL_USER}>`,
        to,
        cc: cc || undefined,
        bcc: bcc || 'g.scotto@easysea.org',
        subject,
        content: text || '',
        html: html || undefined,
      })

      await client.close()

      // Success: update record
      await adminClient
        .from('client_communications')
        .update({ status: 'sent', attempts: attempt, error_details: null })
        .eq('id', commId)

      console.log(`Email sent successfully on attempt ${attempt}`)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err: any) {
      lastError = err.message || String(err)
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError)

      // Update attempts count
      await adminClient
        .from('client_communications')
        .update({ attempts: attempt })
        .eq('id', commId)

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
  }

  // All retries exhausted
  await adminClient
    .from('client_communications')
    .update({ status: 'failed', error_details: lastError, error_message: lastError })
    .eq('id', commId)

  console.error(`All ${MAX_RETRIES} attempts failed for comm ${commId}`)
  return new Response(JSON.stringify({ error: 'Failed to send email after retries', details: lastError }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

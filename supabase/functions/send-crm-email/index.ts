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

  const { to, subject, html, text, client_id, order_id, template_type, bcc, cc } = body

  if (!to || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html/text' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
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

    await adminClient.from('client_communications').insert({
      client_id,
      order_id: order_id || null,
      subject,
      body: html || text,
      template_type: template_type || 'custom',
      sent_by: user.id,
      recipient_email: to,
      status: 'sent',
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Email send failed:', err)

    await adminClient.from('client_communications').insert({
      client_id,
      order_id: order_id || null,
      subject,
      body: html || text,
      template_type: template_type || 'custom',
      sent_by: user.id,
      recipient_email: to,
      status: 'failed',
      error_message: err.message,
    })

    return new Response(JSON.stringify({ error: 'Failed to send email', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

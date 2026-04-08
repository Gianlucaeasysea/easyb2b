import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

async function callLovableAi({
  lovableApiKey,
  messages,
  model,
}: {
  lovableApiKey: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  model: string
}) {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 429) throw new Error('Rate limits exceeded, please try again in a moment.')
    if (response.status === 402) throw new Error('Lovable AI credits required. Please top up workspace usage to continue.')
    throw new Error(`AI gateway error [${response.status}]: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
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

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { template_type, context } = body

  const systemPrompt = `Sei un assistente commerciale di EasySea, azienda che produce e distribuisce prodotti nautici B2B.
Scrivi email professionali, cordiali e concise in italiano.
Il mittente è business@easysea.org (EasySea).
NON includere oggetto nell'output, solo il corpo dell'email.
Usa un tono professionale ma amichevole.
Rispondi SOLO con il testo dell'email in formato HTML semplice (usa <p>, <strong>, <br> - no <html>/<body>).`

  let userPrompt = ''

  switch (template_type) {
    case 'order_update':
      userPrompt = `Scrivi un'email di aggiornamento ordine per il cliente ${context.client_name || ''}.
Ordine: ${context.order_code || ''}
Stato attuale: ${context.order_status || ''}
${context.tracking_number ? `Tracking: ${context.tracking_number}` : ''}
${context.additional_info || ''}`
      break
    case 'payment_reminder':
      userPrompt = `Scrivi un sollecito di pagamento cortese ma fermo per il cliente ${context.client_name || ''}.
Ordine: ${context.order_code || ''}
Importo: €${context.order_total || '0'}
${context.additional_info || ''}`
      break
    case 'custom':
      userPrompt = `Scrivi un'email per il cliente ${context.client_name || ''}.
Contesto: ${context.custom_prompt || 'messaggio generico di follow-up'}
${context.additional_info || ''}`
      break
    default:
      userPrompt = `Scrivi un'email professionale per il cliente ${context.client_name || ''}.
${context.custom_prompt || 'Follow-up commerciale generico.'}`
  }

  try {
    const draft = await callLovableAi({
      lovableApiKey,
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const suggestedSubject = await callLovableAi({
      lovableApiKey,
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'Genera SOLO l\'oggetto dell\'email (una riga, senza virgolette). Professionale e conciso.' },
        { role: 'user', content: `Template: ${template_type}. Cliente: ${context.client_name || ''}. Ordine: ${context.order_code || ''}. Contesto: ${context.custom_prompt || ''}` },
      ],
    })

    return new Response(JSON.stringify({ draft, subject: suggestedSubject || 'Aggiornamento da EasySea' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('AI draft generation failed:', err)
    return new Response(JSON.stringify({ error: 'Failed to generate draft', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

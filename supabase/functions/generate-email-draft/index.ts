import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')

  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Auth
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
  // context: { client_name, order_code, order_status, order_total, custom_prompt, ... }

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
    const aiResponse = await fetch('https://ai.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const draft = aiData.choices?.[0]?.message?.content || ''

    // Generate subject suggestion
    const subjectResponse = await fetch('https://ai.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Genera SOLO l\'oggetto dell\'email (una riga, senza virgolette). Professionale e conciso.' },
          { role: 'user', content: `Template: ${template_type}. Cliente: ${context.client_name || ''}. Ordine: ${context.order_code || ''}. Contesto: ${context.custom_prompt || ''}` },
        ],
      }),
    })

    const subjectData = await subjectResponse.json()
    const suggestedSubject = subjectData.choices?.[0]?.message?.content?.trim() || 'Aggiornamento da EasySea'

    return new Response(JSON.stringify({ draft, subject: suggestedSubject }), {
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

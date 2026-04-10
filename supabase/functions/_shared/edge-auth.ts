import { createClient } from 'npm:@supabase/supabase-js@2'

interface AuthResult {
  authenticated: boolean
  userId?: string
  method?: 'jwt' | 'service_key' | 'supabase_key'
}

/**
 * Verifies authentication for edge functions.
 * Accepts:
 *  1. x-service-api-key header (server-to-server)
 *  2. Bearer JWT token (authenticated user)
 *  3. Supabase anon/service key (internal calls)
 */
export async function verifyEdgeAuth(req: Request): Promise<AuthResult> {
  const serviceApiKey = Deno.env.get('SERVICE_API_KEY')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  // 1. Check x-service-api-key header
  const apiKeyHeader = req.headers.get('x-service-api-key')
  if (apiKeyHeader && serviceApiKey && apiKeyHeader === serviceApiKey) {
    return { authenticated: true, method: 'service_key' }
  }

  // 2. Check Authorization header
  const authHeader = req.headers.get('Authorization') || req.headers.get('apikey') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return { authenticated: false }
  }

  // 2a. Check if it's a Supabase system key
  if (token === supabaseAnonKey || token === supabaseServiceKey) {
    return { authenticated: true, method: 'supabase_key' }
  }

  // 2b. Verify as JWT
  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false }
  }

  const tmpClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await tmpClient.auth.getUser(token)

  if (error || !user) {
    return { authenticated: false }
  }

  return { authenticated: true, userId: user.id, method: 'jwt' }
}

/**
 * Creates a 401 Unauthorized response with CORS headers.
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

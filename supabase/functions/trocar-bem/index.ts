import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('TROCARBEM_API_TOKEN')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'TROCARBEM_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { codLocal, codigosTombamento } = body

    if (!codLocal || !codigosTombamento || !Array.isArray(codigosTombamento)) {
      return new Response(
        JSON.stringify({ error: 'codLocal (string) and codigosTombamento (array) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📡 Calling trocarLocalBemList - codLocal: ${codLocal}, items: ${codigosTombamento.length}`)

    const response = await fetch('https://ws-sale-teste.segsat.com/segsale/tombamento/trocarLocalBemList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({ codLocal, codigosTombamento }),
    })

    const responseText = await response.text()
    console.log(`✅ trocarLocalBemList response (${response.status}):`, responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: responseData,
      }),
      { status: response.ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ trocarLocalBemList error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

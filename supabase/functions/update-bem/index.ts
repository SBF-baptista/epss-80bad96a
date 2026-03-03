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
    const token = Deno.env.get('LOCALBEM_API_TOKEN')
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'LOCALBEM_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { numbem, codtombamento } = body

    if (!numbem || !codtombamento) {
      return new Response(
        JSON.stringify({ error: 'numbem and codtombamento are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // API expects numbem as number, codtombamento as string
    const numbemInt = typeof numbem === 'string' ? parseInt(numbem, 10) : numbem
    if (isNaN(numbemInt)) {
      return new Response(
        JSON.stringify({ error: 'numbem must be a valid number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📡 Calling updateBem - numbem: ${numbemInt} (number), codtombamento: ${codtombamento}`)

    const response = await fetch('https://ws-sale-teste.segsat.com/segsale/tombamento/updateBem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({ numbem: numbemInt, codtombamento: String(codtombamento) }),
    })

    const responseText = await response.text()
    console.log(`✅ updateBem response (${response.status}):`, responseText)

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
        upstreamStatus: response.status,
        upstreamOk: response.ok,
        data: responseData,
      }),
      {
        // Não propaga 5xx do serviço externo como erro técnico da Edge Function
        // para evitar "Edge function returned 502" no frontend em erros de negócio.
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ updateBem error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

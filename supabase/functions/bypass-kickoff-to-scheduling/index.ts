// Bypass Kickoff → cria unidade diretamente na Frota (fluxo simplificado).
//
// Fluxo:
//   1. Autentica usuário (admin ou email em kickoff_bypass_allowed_users).
//   2. Marca incoming_vehicles.kickoff_completed = true (remove da lista de pendentes).
//   3. Grava kickoff_bypass_log (auditoria imutável).
//   4. Chama POST /api/unidade da Frota (mesma lógica HMAC de create-frota-unidade).
//   5. Insere linha em frota_units_pending_imei com status apropriado.
//
// NÃO cria snapshot em kickoff_history, NÃO cria/atualiza registro em customers,
// NÃO seta homologation_status='homologado'.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BypassRequest {
  incoming_vehicle_ids: string[]
  justification: string
}

interface VehicleResult {
  incoming_vehicle_id: string
  status: 'success' | 'error'
  bypass_log_id?: string
  pending_imei_id?: string
  frota_status?: 'aguardando_imei' | 'erro_criacao'
  frota_response?: unknown
  error_message?: string
}

const CRIAR_VEICULO_PATH = '/api/unidade'

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')

async function sha256Hex(data: string) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)))
}
async function hmacSha256Hex(secret: string, content: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(content)))
}

function mapTipoContrato(usage?: string | null): 'TELEMETRIA' | 'MENSALISTA' {
  const u = String(usage ?? '').toLowerCase()
  if (u.includes('telemetr')) return 'TELEMETRIA'
  return 'MENSALISTA'
}

async function callFrotaCreateUnit(plate: string, tipoContrato: 'TELEMETRIA' | 'MENSALISTA') {
  const apiKey = Deno.env.get('FROTA_SEGSALE_API_KEY')
  const baseUrl = Deno.env.get('FROTA_SEGSALE_BASE_URL') ||
    'https://frota-auto-aityd.ondigitalocean.app'
  if (!apiKey) {
    return { ok: false, status: 0, response: { error: 'FROTA_SEGSALE_API_KEY ausente' }, request: null }
  }
  const payload = { placa: plate, dispositivo: 'NT20', tipoContrato }
  const rawBody = JSON.stringify(payload)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = crypto.randomUUID()
  const bodyHash = await sha256Hex(rawBody)
  const canonical = `POST\n${CRIAR_VEICULO_PATH}\n${timestamp}\n${nonce}\n${bodyHash}`
  const signature = await hmacSha256Hex(apiKey, canonical)

  try {
    const resp = await fetch(`${baseUrl}${CRIAR_VEICULO_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
      },
      body: rawBody,
    })
    const text = await resp.text()
    let parsed: unknown = text
    try { parsed = JSON.parse(text) } catch { /* keep text */ }
    return { ok: resp.ok, status: resp.status, response: parsed, request: payload }
  } catch (netErr) {
    return {
      ok: false,
      status: 0,
      response: { error: `Erro de rede: ${netErr instanceof Error ? netErr.message : String(netErr)}` },
      request: payload,
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const userId = claimsData.claims.sub as string
    const userEmail = (claimsData.claims.email as string | undefined) ?? null

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Authorization: admin OR email in allowed list
    const { data: isAdmin, error: adminErr } = await admin.rpc('has_role', {
      _user_id: userId, _role: 'admin',
    })
    if (adminErr) return json({ error: 'Falha ao verificar permissão' }, 500)

    let emailAllowed = false
    if (!isAdmin && userEmail) {
      const { data: allowedRow, error: allowedErr } = await admin
        .from('kickoff_bypass_allowed_users')
        .select('email')
        .ilike('email', userEmail)
        .maybeSingle()
      if (allowedErr) return json({ error: 'Falha ao verificar permissão' }, 500)
      emailAllowed = !!allowedRow
    }

    if (!isAdmin && !emailAllowed) {
      return json({ error: 'Você não tem permissão para executar o bypass do Kickoff.' }, 403)
    }

    let body: BypassRequest
    try { body = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }

    const ids = Array.isArray(body?.incoming_vehicle_ids)
      ? body.incoming_vehicle_ids.filter((v) => typeof v === 'string' && v.trim().length > 0)
      : []
    const justification = typeof body?.justification === 'string' ? body.justification.trim() : ''

    if (ids.length === 0) return json({ error: 'Informe ao menos um incoming_vehicle_id.' }, 400)
    if (justification.length < 10) return json({ error: 'A justificativa deve ter pelo menos 10 caracteres.' }, 400)

    const results: VehicleResult[] = []

    for (const vehicleId of ids) {
      try {
        const { data: iv, error: ivErr } = await admin
          .from('incoming_vehicles')
          .select('*')
          .eq('id', vehicleId)
          .maybeSingle()

        if (ivErr) throw new Error(`Falha ao buscar veículo: ${ivErr.message}`)
        if (!iv) {
          results.push({ incoming_vehicle_id: vehicleId, status: 'error', error_message: 'Veículo não encontrado' })
          continue
        }
        if (iv.kickoff_completed === true) {
          results.push({ incoming_vehicle_id: vehicleId, status: 'error', error_message: 'Kickoff já concluído para este veículo' })
          continue
        }

        // 1. Marca kickoff_completed=true (remove da lista de pendentes).
        //    NÃO seta homologation_status para evitar disparar auto_schedule_from_incoming_vehicle.
        const bypassStamp = ` | Kickoff bypass (fluxo Frota) por ${userEmail ?? userId} em ${new Date().toISOString()}. Justificativa: ${justification}`
        const { error: updErr } = await admin
          .from('incoming_vehicles')
          .update({
            kickoff_completed: true,
            processing_notes: (iv.processing_notes ?? '') + bypassStamp,
          })
          .eq('id', vehicleId)
        if (updErr) throw new Error(`Falha ao atualizar veículo: ${updErr.message}`)

        // 2. Auditoria imutável.
        const { data: logRow, error: logErr } = await admin
          .from('kickoff_bypass_log')
          .insert({
            incoming_vehicle_id: iv.id,
            plate: iv.plate,
            brand: iv.brand,
            model: iv.vehicle,
            company_name: iv.company_name,
            performed_by: userId,
            performed_by_email: userEmail,
            justification,
            resulting_customer_id: null,
          })
          .select('id')
          .single()
        if (logErr) throw new Error(`Falha ao registrar auditoria: ${logErr.message}`)

        // 3. Chama Frota /api/unidade.
        const plate = String(iv.plate ?? '').trim().toUpperCase()
        const tipoContrato = mapTipoContrato(iv.usage_type)
        let frotaResult: Awaited<ReturnType<typeof callFrotaCreateUnit>> = {
          ok: false, status: 0, response: { error: 'Placa ausente' }, request: null,
        }
        if (plate) {
          frotaResult = await callFrotaCreateUnit(plate, tipoContrato)
        }

        // 4. Grava linha em frota_units_pending_imei (sucesso OU erro).
        const pendingStatus: 'aguardando_imei' | 'erro_criacao' = frotaResult.ok ? 'aguardando_imei' : 'erro_criacao'
        const { data: pendingRow, error: pendingErr } = await admin
          .from('frota_units_pending_imei')
          .insert({
            incoming_vehicle_id: iv.id,
            plate,
            brand: iv.brand,
            model: iv.vehicle,
            company_name: iv.company_name,
            status: pendingStatus,
            frota_response: {
              ok: frotaResult.ok,
              http_status: frotaResult.status,
              response: frotaResult.response,
              request: frotaResult.request,
              tipo_contrato: tipoContrato,
            },
            created_by: userId,
          })
          .select('id')
          .single()
        if (pendingErr) throw new Error(`Falha ao registrar unidade pendente de IMEI: ${pendingErr.message}`)

        // 5. app_logs (crítico).
        await admin.rpc('log_action_extended', {
          p_action: 'kickoff_bypass_frota_unit',
          p_module: 'kickoff',
          p_details: `Bypass Kickoff → Frota. Placa ${plate || '(sem placa)'} · ${iv.brand} ${iv.vehicle}. Frota status: ${pendingStatus}. Justificativa: ${justification}`,
          p_action_type: 'update',
          p_origin: 'web',
          p_impact_level: 'critical',
          p_status: frotaResult.ok ? 'success' : 'error',
          p_entity_type: 'incoming_vehicle',
          p_entity_id: iv.id,
          p_entity_name: `${plate} ${iv.brand} ${iv.vehicle}`.trim(),
          p_new_state: {
            justification,
            bypass_log_id: logRow.id,
            pending_imei_id: pendingRow.id,
            frota_status: pendingStatus,
            frota_http_status: frotaResult.status,
          },
          p_is_critical: true,
          p_is_reversible: false,
        })

        results.push({
          incoming_vehicle_id: vehicleId,
          status: 'success',
          bypass_log_id: logRow.id,
          pending_imei_id: pendingRow.id,
          frota_status: pendingStatus,
          frota_response: frotaResult.response,
        })
      } catch (err) {
        console.error('bypass vehicle error', vehicleId, err)
        results.push({
          incoming_vehicle_id: vehicleId,
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Erro desconhecido',
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length
    return json({
      success: successCount > 0,
      total: results.length,
      success_count: successCount,
      error_count: results.length - successCount,
      results,
    }, 200)
  } catch (err) {
    console.error('bypass-kickoff-to-scheduling fatal', err)
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

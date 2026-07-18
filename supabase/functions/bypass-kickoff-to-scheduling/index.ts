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
  customer_id?: string | null
  bypass_log_id?: string
  error_message?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    // ---------- Auth ----------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const userId = claimsData.claims.sub as string
    const userEmail = (claimsData.claims.email as string | undefined) ?? null

    // Service-role client for all DB writes/reads (RLS bypass; we do our own auth check).
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ---------- Authorization check (backend, do not trust frontend) ----------
    const { data: hasAccess, error: accessErr } = await admin.rpc('has_module_access', {
      _user_id: userId,
      _module: 'kickoff_bypass',
      _min_permission: 'edit',
    })
    if (accessErr) {
      console.error('has_module_access error', accessErr)
      return json({ error: 'Falha ao verificar permissão' }, 500)
    }
    if (!hasAccess) {
      return json({ error: 'Você não tem permissão para executar o bypass do Kickoff.' }, 403)
    }

    // ---------- Input validation ----------
    let body: BypassRequest
    try {
      body = await req.json()
    } catch {
      return json({ error: 'JSON inválido' }, 400)
    }

    const ids = Array.isArray(body?.incoming_vehicle_ids)
      ? body.incoming_vehicle_ids.filter((v) => typeof v === 'string' && v.trim().length > 0)
      : []
    const justification = typeof body?.justification === 'string' ? body.justification.trim() : ''

    if (ids.length === 0) {
      return json({ error: 'Informe ao menos um incoming_vehicle_id.' }, 400)
    }
    if (justification.length < 10) {
      return json({ error: 'A justificativa deve ter pelo menos 10 caracteres.' }, 400)
    }

    // ---------- Process each vehicle ----------
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
          results.push({
            incoming_vehicle_id: vehicleId,
            status: 'error',
            error_message: 'Veículo não encontrado',
          })
          continue
        }
        if (iv.kickoff_completed === true) {
          results.push({
            incoming_vehicle_id: vehicleId,
            status: 'error',
            error_message: 'Kickoff já concluído para este veículo',
          })
          continue
        }

        // Update the incoming_vehicle: mark kickoff completed and force homologado so the
        // existing auto_schedule_from_incoming_vehicle trigger creates/updates the Planning
        // customer with show_in_planning=true (reusing the same logic as the normal flow).
        const bypassStamp = ` | Kickoff bypass executado por ${userEmail ?? userId} em ${new Date().toISOString()}. Justificativa: ${justification}`
        const { error: updErr } = await admin
          .from('incoming_vehicles')
          .update({
            kickoff_completed: true,
            homologation_status: 'homologado',
            processing_notes: (iv.processing_notes ?? '') + bypassStamp,
          })
          .eq('id', vehicleId)
        if (updErr) throw new Error(`Falha ao atualizar veículo: ${updErr.message}`)

        // Recover the customer created/updated by the trigger (best effort).
        let customerId: string | null = null
        if (iv.sale_summary_id) {
          const { data: cust } = await admin
            .from('customers')
            .select('id')
            .eq('sale_summary_id', iv.sale_summary_id)
            .maybeSingle()
          customerId = cust?.id ?? null
        }

        // Snapshot in kickoff_history (one row per vehicle, minimal payload — the historic
        // details of a normal kickoff are collected in the modal; here we register that the
        // vehicle was fast-tracked).
        if (iv.sale_summary_id) {
          await admin.from('kickoff_history').insert({
            sale_summary_id: iv.sale_summary_id,
            company_name: iv.company_name ?? 'Cliente não identificado',
            total_vehicles: 1,
            vehicles_data: [
              {
                incoming_vehicle_id: iv.id,
                plate: iv.plate,
                brand: iv.brand,
                model: iv.vehicle,
                year: iv.year,
              },
            ],
            kickoff_notes: `[BYPASS] ${justification}`,
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
        }

        // Immutable audit row.
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
            resulting_customer_id: customerId,
          })
          .select('id')
          .single()
        if (logErr) throw new Error(`Falha ao registrar auditoria: ${logErr.message}`)

        // Global app_logs entry (critical, non-reversible).
        await admin.rpc('log_action_extended', {
          p_action: 'kickoff_bypass',
          p_module: 'kickoff',
          p_details: `Bypass de Kickoff para Agendamento. Veículo ${iv.plate ?? '(sem placa)'} - ${iv.brand} ${iv.vehicle}. Justificativa: ${justification}`,
          p_action_type: 'update',
          p_origin: 'web',
          p_impact_level: 'critical',
          p_status: 'success',
          p_entity_type: 'incoming_vehicle',
          p_entity_id: iv.id,
          p_entity_name: `${iv.plate ?? ''} ${iv.brand} ${iv.vehicle}`.trim(),
          p_new_state: { justification, bypass_log_id: logRow.id, customer_id: customerId },
          p_is_critical: true,
          p_is_reversible: false,
        })

        results.push({
          incoming_vehicle_id: vehicleId,
          status: 'success',
          customer_id: customerId,
          bypass_log_id: logRow.id,
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

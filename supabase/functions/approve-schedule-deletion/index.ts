// Edge Function: approve-schedule-deletion
// Aprova ou rejeita uma solicitação de exclusão de agendamento.
// Em aprovação: chama a API externa de desativação e, com sucesso, exclui o agendamento.
// Em rejeição: apenas registra a decisão. Sempre retorna 200 (erros no corpo).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEACTIVATE_URL = "https://frota-auto-aityd.ondigitalocean.app/api/unidade/status";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ ok: false, error: "Não autenticado" }, 200);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ ok: false, error: "Sessão inválida" });
    }
    const userId = userData.user.id;

    // Verifica se é admin ou tem permissão de aprovar em schedule_deletion_approval
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    let allowed = !!isAdmin;
    if (!allowed) {
      const { data: canApprove } = await admin.rpc("can_approve_module", {
        _user_id: userId,
        _module: "schedule_deletion_approval",
      });
      allowed = !!canApprove;
    }
    if (!allowed) return json({ ok: false, error: "Sem permissão para decidir solicitações" });

    const body = await req.json().catch(() => ({}));
    const requestId: string | undefined = body?.requestId;
    const decision: string = String(body?.decision ?? "").toLowerCase();
    const motivo: string = String(body?.motivo ?? "").trim();

    if (!requestId) return json({ ok: false, error: "requestId obrigatório" });
    if (decision !== "aprovar" && decision !== "rejeitar") {
      return json({ ok: false, error: "decision deve ser 'aprovar' ou 'rejeitar'" });
    }
    if (!motivo) return json({ ok: false, error: "Motivo é obrigatório" });

    const { data: request, error: reqErr } = await admin
      .from("solicitacoes_exclusao_agendamento")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr || !request) return json({ ok: false, error: "Solicitação não encontrada" });
    if (request.status !== "pendente") {
      return json({ ok: false, error: `Solicitação já ${request.status}` });
    }

    // Rejeição: apenas marcar e liberar o agendamento
    if (decision === "rejeitar") {
      await admin
        .from("solicitacoes_exclusao_agendamento")
        .update({
          status: "rejeitado",
          decidido_por: userId,
          decidido_em: new Date().toISOString(),
          motivo,
        })
        .eq("id", requestId);

      if (request.agendamento_id) {
        await admin
          .from("installation_schedules")
          .update({ deletion_request_status: null })
          .eq("id", request.agendamento_id);
      }
      return json({ ok: true, status: "rejeitado" });
    }

    // Aprovação: chamar API externa
    const payload = {
      filialContrato: request.filial_contrato,
      ativo: false,
      tipoContrato: request.tipo_contrato,
    };

    let apiResp: unknown = null;
    let apiOk = false;
    let apiStatus = 0;
    let apiErrorMsg: string | null = null;

    try {
      const resp = await fetch(DEACTIVATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      apiStatus = resp.status;
      const text = await resp.text();
      try {
        apiResp = JSON.parse(text);
      } catch {
        apiResp = text;
      }
      apiOk = resp.ok &&
        typeof apiResp === "object" &&
        apiResp !== null &&
        (apiResp as Record<string, unknown>).ativo === false;
    } catch (err) {
      apiErrorMsg = err instanceof Error ? err.message : String(err);
    }

    if (!apiOk) {
      console.error("[approve-schedule-deletion] API falhou", {
        requestId,
        status: apiStatus,
        apiResp,
        apiErrorMsg,
      });
      return json({
        ok: false,
        error: apiErrorMsg || `API respondeu ${apiStatus} sem confirmar desativação`,
        api_status: apiStatus,
        api_response: apiResp,
        request: payload,
      });
    }

    // Sucesso: marcar aprovado, salvar retorno e excluir agendamento
    await admin
      .from("solicitacoes_exclusao_agendamento")
      .update({
        status: "aprovado",
        decidido_por: userId,
        decidido_em: new Date().toISOString(),
        motivo,
        resultado_api: apiResp as unknown as Record<string, unknown>,
      })
      .eq("id", requestId);

    if (request.agendamento_id) {
      // Buscar kit_schedule_id para reverter status se aplicável (mesmo comportamento antigo)
      const { data: sched } = await admin
        .from("installation_schedules")
        .select("kit_schedule_id")
        .eq("id", request.agendamento_id)
        .maybeSingle();

      await admin.from("installation_schedules").delete().eq("id", request.agendamento_id);

      if (sched?.kit_schedule_id) {
        await admin
          .from("kit_schedules")
          .update({ status: "shipped" })
          .eq("id", sched.kit_schedule_id);
      }
    }

    return json({ ok: true, status: "aprovado", api_response: apiResp });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[approve-schedule-deletion] ERROR", msg);
    return json({ ok: false, error: msg });
  }
});

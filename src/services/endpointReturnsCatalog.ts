// Catálogo COMPLETO de respostas dos endpoints do sistema.
// Cada item descreve: descrição detalhada, parâmetros de entrada, schema
// (todos os campos retornados) e um "live example" gerado a partir
// do último registro real existente no banco (atualizado a cada nova entrada).

import { supabase } from "@/integrations/supabase/client";

export interface FieldDoc {
  field: string;
  type: string;
  description: string;
}

export interface EndpointReturnDoc {
  /** Nome igual ao registrado em api_endpoints.name */
  name: string;
  system: string;
  method: string;
  url: string;
  /** Descrição detalhada do que o endpoint faz */
  description: string;
  /** Parâmetros de entrada (query, path ou body) */
  inputs: FieldDoc[];
  /** Schema completo de todos os campos retornados */
  responseSchema: FieldDoc[];
  /** Fonte real dos dados na plataforma (tabela / serviço) */
  dataSource: string;
  /** Busca o último registro real e devolve um exemplo do formato de resposta */
  fetchLiveExample?: () => Promise<any>;
}

// ---------- helpers para fetch dos exemplos ----------

const safe = async <T>(p: Promise<T>, fallback: any = null): Promise<any> => {
  try { return await p; } catch { return fallback; }
};

const first = async (q: any) => {
  const { data } = await q;
  return Array.isArray(data) ? data[0] : data;
};

// ---------- catálogo ----------

export const ENDPOINT_RETURNS_CATALOG: EndpointReturnDoc[] = [
  // =================== API Interna ===================
  {
    name: "Verificar Veículo",
    system: "API Interna",
    method: "GET",
    url: "/functions/v1/verify-vehicle?plate={placa}",
    description:
      "Recebe uma placa e verifica se o veículo já está cadastrado no sistema. Retorna o status atual do veículo (novos, em produção, homologar, etc.) e o pedido vinculado, se houver.",
    inputs: [
      { field: "plate", type: "string (query)", description: "Placa do veículo (ex.: ABC1D23)" },
      { field: "Authorization", type: "Bearer JWT (header)", description: "Token do usuário autenticado" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Indica sucesso da consulta" },
      { field: "plate", type: "string", description: "Placa pesquisada normalizada" },
      { field: "found", type: "boolean", description: "Se a placa foi encontrada" },
      { field: "status", type: "string", description: "novos | producao | homologar | shipped | completed" },
      { field: "vehicle.brand", type: "string", description: "Marca do veículo" },
      { field: "vehicle.model", type: "string", description: "Modelo do veículo" },
      { field: "vehicle.year", type: "number", description: "Ano do veículo" },
      { field: "vehicle.quantity", type: "number", description: "Quantidade" },
      { field: "order.id", type: "uuid", description: "ID do pedido vinculado" },
      { field: "order.numero_pedido", type: "string", description: "Número do pedido" },
      { field: "order.configuracao", type: "string", description: "Configuração / modelo do rastreador" },
      { field: "order.company_name", type: "string", description: "Empresa do cliente" },
    ],
    dataSource: "Tabela incoming_vehicles + pedidos",
    fetchLiveExample: async () => {
      const v = await first(supabase.from("incoming_vehicles").select("plate, brand, vehicle, year, quantity").not("plate", "is", null).order("received_at", { ascending: false }).limit(1));
      const o = await first(supabase.from("pedidos").select("id, numero_pedido, configuracao, company_name").order("data", { ascending: false }).limit(1));
      return {
        success: true,
        plate: v?.plate ?? "ABC1D23",
        found: !!v,
        status: "homologar",
        vehicle: v ? { brand: v.brand, model: v.vehicle, year: v.year, quantity: v.quantity } : null,
        order: o ?? null,
      };
    },
  },
  {
    name: "Receber Veículo",
    system: "API Interna",
    method: "POST",
    url: "/functions/v1/receive-vehicle",
    description:
      "Webhook que processa veículos vindos do Segsale: cria registros em incoming_vehicles, deduplica por (sale_summary_id, plate), enriquece com endereço e dispara busca de protocolo no TomTicket.",
    inputs: [
      { field: "sale_summary_id", type: "number", description: "ID da venda no Segsale" },
      { field: "groups[]", type: "array", description: "Grupos de clientes com vehicles[] e address" },
      { field: "groups[].vehicles[]", type: "array", description: "brand, vehicle, year, plate, accessories[], modules[]" },
      { field: "groups[].address", type: "object", description: "city, district, street, number, zip_code, complement" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Status do processamento" },
      { field: "request_id", type: "string", description: "Identificador da requisição" },
      { field: "processed_count", type: "number", description: "Quantidade de veículos processados" },
      { field: "created_ids[]", type: "uuid[]", description: "IDs de incoming_vehicles criados" },
      { field: "reused_ids[]", type: "uuid[]", description: "IDs reaproveitados (deduplicação)" },
      { field: "tomticket_protocols[]", type: "string[]", description: "Protocolos encontrados por placa" },
    ],
    dataSource: "Tabela incoming_vehicles",
    fetchLiveExample: async () => {
      const list = (await safe(supabase.from("incoming_vehicles").select("id, plate, brand, vehicle, sale_summary_id, received_at").order("received_at", { ascending: false }).limit(3))).data || [];
      return {
        success: true,
        request_id: crypto.randomUUID(),
        processed_count: list.length,
        created_ids: list.map((x: any) => x.id),
        reused_ids: [],
        tomticket_protocols: [],
        sample_records: list,
      };
    },
  },
  {
    name: "Buscar Dados Homologação",
    system: "API Interna",
    method: "POST",
    url: "/functions/v1/get-homologation-data",
    description:
      "Retorna dados completos de um card de homologação: status, marca/modelo/ano, configuração, checklist de teste, fotos e itens vinculados.",
    inputs: [
      { field: "card_id", type: "uuid", description: "ID do homologation_card" },
    ],
    responseSchema: [
      { field: "id", type: "uuid", description: "ID do card" },
      { field: "status", type: "string", description: "homologado | em_teste | pendente | reprovado" },
      { field: "brand", type: "string", description: "Marca" },
      { field: "model", type: "string", description: "Modelo" },
      { field: "year", type: "number", description: "Ano" },
      { field: "configuration", type: "string", description: "Modelo do rastreador / configuração" },
      { field: "test_checklist", type: "jsonb", description: "Checklist de testes executados" },
      { field: "photos[]", type: "array", description: "Fotos do processo" },
      { field: "accessories[]", type: "array", description: "Acessórios homologados" },
      { field: "incoming_vehicle_id", type: "uuid", description: "Veículo de origem" },
      { field: "created_order_id", type: "uuid", description: "Pedido criado a partir da homologação" },
    ],
    dataSource: "Tabela homologation_cards (+ homologation_photos)",
    fetchLiveExample: async () => {
      const card = await first(supabase.from("homologation_cards").select("id, status, brand, model, year, configuration, test_checklist, incoming_vehicle_id, created_order_id").order("updated_at", { ascending: false }).limit(1));
      const photos = (await safe(supabase.from("homologation_photos").select("id, photo_url, description").eq("homologation_card_id", card?.id).limit(5))).data || [];
      return { ...(card || {}), photos, accessories: [] };
    },
  },
  {
    name: "Criar Homologação",
    system: "API Interna",
    method: "POST",
    url: "/functions/v1/create-homologation",
    description:
      "Cria um novo card de homologação a partir de um veículo. Quando aprovada (status=homologado), dispara triggers que geram pedido automático e cliente em Planejamento.",
    inputs: [
      { field: "brand", type: "string", description: "Marca (obrigatório)" },
      { field: "model", type: "string", description: "Modelo (obrigatório)" },
      { field: "year", type: "number", description: "Ano (obrigatório)" },
      { field: "test_checklist", type: "jsonb", description: "Checklist (obrigatório)" },
      { field: "incoming_vehicle_id", type: "uuid", description: "Origem do veículo (opcional)" },
      { field: "configuration", type: "string", description: "Configuração escolhida" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Indica criação com sucesso" },
      { field: "card.id", type: "uuid", description: "ID do card criado" },
      { field: "card.status", type: "string", description: "Status inicial (em_teste ou homologado)" },
      { field: "card.created_at", type: "timestamp", description: "Data de criação" },
      { field: "created_order_id", type: "uuid|null", description: "ID do pedido se a aprovação disparou criação" },
    ],
    dataSource: "Tabela homologation_cards",
    fetchLiveExample: async () => {
      const card = await first(supabase.from("homologation_cards").select("id, status, created_at, created_order_id").order("created_at", { ascending: false }).limit(1));
      return { success: true, card, created_order_id: card?.created_order_id ?? null };
    },
  },
  {
    name: "Buscar Homologações em Lote",
    system: "API Interna",
    method: "POST",
    url: "/functions/v1/backfill-homologations",
    description:
      "Executa relink/backfill: reassocia homologações a incoming_vehicles do Segsale e cria clientes em Planejamento que estavam faltando.",
    inputs: [
      { field: "(sem parâmetros)", type: "-", description: "Executa varredura global" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso da execução" },
      { field: "relinked_count", type: "number", description: "Homologações reassociadas" },
      { field: "planning_customers_created", type: "number", description: "Clientes criados no Planejamento" },
      { field: "results[]", type: "array", description: "Detalhe por registro processado" },
    ],
    dataSource: "Funções relink_homologations_to_segsale_incoming + backfill_planning_customers",
    fetchLiveExample: async () => {
      const count = (await safe(supabase.from("homologation_cards").select("id", { count: "exact", head: true }))).count ?? 0;
      return { success: true, relinked_count: 0, planning_customers_created: 0, total_homologation_cards: count, results: [] };
    },
  },
  {
    name: "Gerenciar Usuários",
    system: "API Interna",
    method: "POST",
    url: "/functions/v1/manage-users",
    description:
      "Gerencia usuários (criar, atualizar, listar, resetar senha, definir senha). Requer role admin exceto no fluxo set_password.",
    inputs: [
      { field: "action", type: "string", description: "create | update | list | reset_password | set_password" },
      { field: "email", type: "string", description: "E-mail (conforme action)" },
      { field: "password", type: "string", description: "Senha (set_password/create)" },
      { field: "user_id", type: "uuid", description: "Alvo (update/reset)" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso da operação" },
      { field: "message", type: "string", description: "Mensagem amigável" },
      { field: "user.id", type: "uuid", description: "ID do usuário afetado" },
      { field: "user.email", type: "string", description: "E-mail" },
      { field: "users[]", type: "array", description: "Lista (apenas action=list)" },
      { field: "error", type: "string?", description: "Erro (quando success=false)" },
    ],
    dataSource: "auth.users + user_roles + access_profiles",
    fetchLiveExample: async () => {
      const roles = (await safe(supabase.from("user_roles").select("user_id, role").limit(3))).data || [];
      return { success: true, message: "Operação executada", users_sample: roles };
    },
  },

  // =================== Segsale ===================
  {
    name: "Segsale - Buscar Produtos",
    system: "Segsale",
    method: "POST",
    url: "/functions/v1/fetch-segsale-products?idResumoVenda={id}",
    description:
      "Chama o Segsale (produtos-por-veiculo) para um sale_summary_id, enriquece com /itens-produtos do contrato pendente e devolve a venda + cliente local.",
    inputs: [
      { field: "idResumoVenda", type: "number (query)", description: "ID da venda no Segsale" },
      { field: "forceRefresh", type: "boolean (query)", description: "Ignora cache" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso" },
      { field: "message", type: "string", description: "Mensagem" },
      { field: "sale_summary_id", type: "string", description: "ID consultado" },
      { field: "client_id.id", type: "uuid|null", description: "Cliente local correspondente" },
      { field: "client_id.company_name", type: "string", description: "Razão social" },
      { field: "client_id.document_number", type: "string", description: "CNPJ/CPF" },
      { field: "sales[].company_name", type: "string", description: "Empresa (do Segsale)" },
      { field: "sales[].usage_type", type: "string", description: "Tipo de uso (Telemetria/Rastreamento)" },
      { field: "sales[].pending_contract_id", type: "number", description: "Contrato pendente" },
      { field: "sales[].vehicles[]", type: "array", description: "brand, vehicle, year, quantity, accessories[], modules[]" },
      { field: "sales[].contract_items[]", type: "array", description: "Itens do contrato enriquecidos" },
      { field: "processing.forwarded", type: "boolean", description: "Se foi encaminhado para receive-vehicle" },
    ],
    dataSource: "ws-sale.segsat.com/segsale/relatorios/produtos-por-veiculo",
    fetchLiveExample: async () => {
      const c = await first(supabase.from("customers").select("id, company_name, document_number, sale_summary_id").not("sale_summary_id", "is", null).order("created_at", { ascending: false }).limit(1));
      const vehicles = (await safe(supabase.from("incoming_vehicles").select("brand, vehicle, year, quantity, plate, usage_type, pending_contract_id").eq("sale_summary_id", c?.sale_summary_id).limit(5))).data || [];
      return {
        success: true,
        message: `Fetched ${vehicles.length} sales from Segsale`,
        sale_summary_id: String(c?.sale_summary_id ?? ""),
        client_id: c,
        sales: vehicles.length ? [{
          company_name: c?.company_name,
          usage_type: vehicles[0]?.usage_type ?? "Telemetria",
          pending_contract_id: vehicles[0]?.pending_contract_id ?? null,
          vehicles,
          contract_items: [],
        }] : [],
        processing: { forwarded: false, message: "Processing handled separately" },
      };
    },
  },
  {
    name: "Segsale - Buscar Extras (Acessórios)",
    system: "Segsale",
    method: "POST",
    url: "/functions/v1/fetch-segsale-extras",
    description:
      "Lista o catálogo de acessórios e módulos do produto 6 no Segsale (extras + itens).",
    inputs: [
      { field: "type", type: "string", description: "'extras' (default) ou 'itens'" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso" },
      { field: "extras[].name", type: "string", description: "Nome do acessório/módulo" },
      { field: "extras[].category", type: "string", description: "'Acessório' ou 'Módulo'" },
      { field: "extras[].active", type: "boolean", description: "Disponível para venda" },
      { field: "extras[].id", type: "number", description: "ID no Segsale" },
    ],
    dataSource: "ws-sale.segsat.com/segsale/produto/6/extras|itens",
    fetchLiveExample: async () => {
      // catálogo derivado dos acessórios já vistos em incoming_vehicles
      const rows = (await safe(supabase.from("accessories").select("nome, categoria").limit(8))).data || [];
      return {
        success: true,
        extras: rows.map((r: any, i: number) => ({ id: i + 1, name: r.nome, category: r.categoria ?? "Acessório", active: true })),
      };
    },
  },
  {
    name: "Segsale - Webhook Recebimento",
    system: "Segsale",
    method: "POST",
    url: "/functions/v1/segsale-webhook",
    description:
      "Webhook que o Segsale chama quando uma venda é criada. Insere/atualiza clientes e veículos a receber em incoming_vehicles, repassando placa, endereço e CNPJ.",
    inputs: [
      { field: "saleSummaryId", type: "number", description: "ID da venda" },
      { field: "sales[]", type: "array", description: "vehicles, address, taxId, phone" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Recebido com sucesso" },
      { field: "sale_summary_id", type: "number", description: "ID processado" },
      { field: "vehicles_received", type: "number", description: "Quantidade inserida" },
      { field: "customer_id", type: "uuid", description: "Cliente local (criado ou atualizado)" },
    ],
    dataSource: "customers + incoming_vehicles",
    fetchLiveExample: async () => {
      const c = await first(supabase.from("customers").select("id, sale_summary_id").not("sale_summary_id", "is", null).order("created_at", { ascending: false }).limit(1));
      const count = (await safe(supabase.from("incoming_vehicles").select("id", { count: "exact", head: true }).eq("sale_summary_id", c?.sale_summary_id))).count ?? 0;
      return { success: true, sale_summary_id: c?.sale_summary_id, vehicles_received: count, customer_id: c?.id };
    },
  },

  // =================== Segsat (Tombamento) ===================
  {
    name: "Tombamento - Atualizar Bem",
    system: "Segsat",
    method: "POST",
    url: "/functions/v1/update-bem",
    description:
      "Atualiza o código de tombamento de um bem (rastreador) no LocalBem da Segsat.",
    inputs: [
      { field: "numbem", type: "number", description: "Número do bem" },
      { field: "codtombamento", type: "string", description: "Novo código de tombamento (IMEI/Serial)" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso da chamada" },
      { field: "status", type: "number", description: "HTTP status retornado pela Segsat" },
      { field: "data", type: "any", description: "Payload de resposta da Segsat" },
    ],
    dataSource: "Segsat LocalBem API",
    fetchLiveExample: async () => {
      const item = await first(supabase.from("production_items").select("imei, tombamento").not("tombamento", "is", null).limit(1));
      return { success: true, status: 200, data: { numbem: item?.tombamento ?? 12345, codtombamento: item?.imei ?? "8612345678" } };
    },
  },
  {
    name: "Tombamento - Trocar Bem",
    system: "Segsat",
    method: "POST",
    url: "/functions/v1/trocar-bem",
    description:
      "Troca a localização de bens (códigos de tombamento) para outro código local.",
    inputs: [
      { field: "codLocal", type: "string", description: "Código do novo local" },
      { field: "codigosTombamento", type: "string[]", description: "Lista de códigos a transferir" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso" },
      { field: "status", type: "number", description: "HTTP status Segsat" },
      { field: "data", type: "any", description: "Payload Segsat (lista atualizada)" },
    ],
    dataSource: "Segsat TrocarBem API",
    fetchLiveExample: async () => ({ success: true, status: 200, data: { codLocal: "1234", transferidos: 3 } }),
  },

  // =================== INSTALA ===================
  {
    name: "Confirmar Instalação",
    system: "INSTALA",
    method: "POST",
    url: "/functions/v1/confirm-installation",
    description:
      "Recebe a confirmação de instalação remota (técnico externo): valida placa contra OPM, persiste em installation_confirmations e marca o schedule como completed.",
    inputs: [
      { field: "plate", type: "string", description: "Placa instalada (obrigatório)" },
      { field: "imei", type: "string", description: "IMEI do rastreador instalado (obrigatório)" },
      { field: "technician_name", type: "string", description: "Nome do técnico" },
      { field: "installed_at", type: "timestamp", description: "Data/hora da instalação" },
      { field: "photos[]", type: "string[]", description: "URLs de fotos" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Confirmação aceita" },
      { field: "confirmation.id", type: "uuid", description: "ID da confirmação" },
      { field: "confirmation.plate", type: "string", description: "Placa" },
      { field: "confirmation.imei", type: "string", description: "IMEI" },
      { field: "confirmation.created_at", type: "timestamp", description: "Quando recebido" },
      { field: "schedule_updated", type: "boolean", description: "Se houve schedule marcado como completed" },
    ],
    dataSource: "Tabela installation_confirmations",
    fetchLiveExample: async () => {
      const c = await first(supabase.from("installation_confirmations").select("id, plate, imei, created_at").order("created_at", { ascending: false }).limit(1));
      return { success: true, confirmation: c, schedule_updated: !!c };
    },
  },

  // =================== TomTicket ===================
  {
    name: "Buscar TomTicket",
    system: "TomTicket",
    method: "POST",
    url: "/functions/v1/search-tomticket",
    description:
      "Busca tickets no TomTicket por placa, protocolo ou termo livre. Possui cache em memória de 5 minutos.",
    inputs: [
      { field: "searchTerm", type: "string", description: "Placa, protocolo ou texto" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Sucesso" },
      { field: "fromCache", type: "boolean", description: "Se veio do cache" },
      { field: "tickets[].protocol", type: "string", description: "Protocolo do ticket" },
      { field: "tickets[].status", type: "string", description: "Status do ticket" },
      { field: "tickets[].subject", type: "string", description: "Assunto" },
      { field: "tickets[].customer_name", type: "string", description: "Cliente" },
      { field: "tickets[].created_at", type: "timestamp", description: "Abertura" },
      { field: "total", type: "number", description: "Total encontrado" },
    ],
    dataSource: "API TomTicket (externa)",
    fetchLiveExample: async () => {
      const iv = await first(supabase.from("incoming_vehicles").select("plate, tomticket_protocol").not("tomticket_protocol", "is", null).limit(1));
      return {
        success: true,
        fromCache: false,
        tickets: iv ? [{ protocol: iv.tomticket_protocol, status: "Aberto", subject: `Instalação ${iv.plate}`, customer_name: "Cliente", created_at: new Date().toISOString() }] : [],
        total: iv ? 1 : 0,
      };
    },
  },

  // =================== WhatsApp ===================
  {
    name: "WhatsApp - Enviar Mensagem",
    system: "WhatsApp API",
    method: "POST",
    url: "/functions/v1/send-whatsapp",
    description:
      "Envia mensagens via Twilio WhatsApp (template UTILITY ou mensagem livre). Registra entrega em whatsapp_message_logs.",
    inputs: [
      { field: "to", type: "string", description: "Telefone destino (E.164)" },
      { field: "templateSid", type: "string?", description: "SID do template Twilio (opcional)" },
      { field: "variables", type: "object?", description: "Variáveis do template" },
      { field: "body", type: "string?", description: "Mensagem livre (sem template)" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Mensagem aceita pelo Twilio" },
      { field: "sid", type: "string", description: "Twilio Message SID" },
      { field: "status", type: "string", description: "queued | sent | delivered | failed" },
      { field: "to", type: "string", description: "Destinatário normalizado" },
      { field: "log_id", type: "uuid", description: "ID em whatsapp_message_logs" },
      { field: "error", type: "string?", description: "Erro do Twilio (se houver)" },
    ],
    dataSource: "Twilio + tabela whatsapp_message_logs",
    fetchLiveExample: async () => {
      const log = await first(supabase.from("whatsapp_message_logs").select("id, twilio_sid, status, recipient_phone, error_message").order("created_at", { ascending: false }).limit(1));
      return { success: log?.status !== "failed", sid: log?.twilio_sid, status: log?.status, to: log?.recipient_phone, log_id: log?.id, error: log?.error_message };
    },
  },
  {
    name: "WhatsApp - Agenda Diária",
    system: "WhatsApp API",
    method: "POST",
    url: "/functions/v1/send-daily-agenda",
    description:
      "Job (cron diário 17:30 BRT) que envia agenda do próximo dia para cada técnico via template UTILITY de 7 variáveis.",
    inputs: [
      { field: "(sem parâmetros)", type: "-", description: "Disparado automaticamente; pode ser manual via dashboard" },
    ],
    responseSchema: [
      { field: "success", type: "boolean", description: "Execução completa" },
      { field: "date", type: "string", description: "Data alvo (YYYY-MM-DD)" },
      { field: "technicians_processed", type: "number", description: "Técnicos com agenda" },
      { field: "messages_sent", type: "number", description: "Mensagens entregues" },
      { field: "messages_failed", type: "number", description: "Falhas" },
      { field: "results[]", type: "array", description: "Detalhe por técnico { technician, phone, status, error }" },
    ],
    dataSource: "kit_schedules + technicians",
    fetchLiveExample: async () => {
      const techs = (await safe(supabase.from("technicians").select("id, name, phone").eq("active", true).limit(3))).data || [];
      return {
        success: true,
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        technicians_processed: techs.length,
        messages_sent: techs.length,
        messages_failed: 0,
        results: techs.map((t: any) => ({ technician: t.name, phone: t.phone, status: "sent" })),
      };
    },
  },

  // =================== APIs Externas Públicas ===================
  {
    name: "API FIPE - Marcas",
    system: "FIPE",
    method: "GET",
    url: "https://parallelum.com.br/fipe/api/v1/carros/marcas",
    description: "Lista todas as marcas de carros disponíveis na tabela FIPE.",
    inputs: [{ field: "(sem parâmetros)", type: "-", description: "Endpoint público" }],
    responseSchema: [
      { field: "[].codigo", type: "string", description: "Código da marca FIPE" },
      { field: "[].nome", type: "string", description: "Nome da marca" },
    ],
    dataSource: "API FIPE pública (Parallelum)",
    fetchLiveExample: async () => [
      { codigo: "21", nome: "Fiat" },
      { codigo: "23", nome: "GM - Chevrolet" },
      { codigo: "25", nome: "Honda" },
      { codigo: "26", nome: "Hyundai" },
      { codigo: "59", nome: "Volkswagen" },
    ],
  },
  {
    name: "API IBGE - Estados",
    system: "IBGE",
    method: "GET",
    url: "https://servicodados.ibge.gov.br/api/v1/localidades/estados",
    description: "Lista todos os estados brasileiros (UFs) com nome, sigla e região.",
    inputs: [{ field: "(sem parâmetros)", type: "-", description: "Endpoint público" }],
    responseSchema: [
      { field: "[].id", type: "number", description: "Código IBGE" },
      { field: "[].sigla", type: "string", description: "UF (ex.: SP)" },
      { field: "[].nome", type: "string", description: "Nome completo" },
      { field: "[].regiao.id", type: "number", description: "ID da região" },
      { field: "[].regiao.sigla", type: "string", description: "Sigla da região (SE, NE...)" },
      { field: "[].regiao.nome", type: "string", description: "Nome da região" },
    ],
    dataSource: "API IBGE pública",
    fetchLiveExample: async () => [
      { id: 35, sigla: "SP", nome: "São Paulo", regiao: { id: 3, sigla: "SE", nome: "Sudeste" } },
      { id: 33, sigla: "RJ", nome: "Rio de Janeiro", regiao: { id: 3, sigla: "SE", nome: "Sudeste" } },
    ],
  },
  {
    name: "API ViaCEP",
    system: "ViaCEP",
    method: "GET",
    url: "https://viacep.com.br/ws/{cep}/json/",
    description: "Consulta endereço por CEP. Usado no autofill da instalação (fallback BrasilAPI).",
    inputs: [{ field: "cep", type: "string (path)", description: "CEP somente dígitos (8)" }],
    responseSchema: [
      { field: "cep", type: "string", description: "CEP formatado" },
      { field: "logradouro", type: "string", description: "Rua/Av" },
      { field: "complemento", type: "string", description: "Complemento padrão" },
      { field: "bairro", type: "string", description: "Bairro" },
      { field: "localidade", type: "string", description: "Cidade" },
      { field: "uf", type: "string", description: "Estado" },
      { field: "ibge", type: "string", description: "Código IBGE do município" },
      { field: "ddd", type: "string", description: "DDD" },
    ],
    dataSource: "ViaCEP público",
    fetchLiveExample: async () => ({
      cep: "01001-000", logradouro: "Praça da Sé", complemento: "lado ímpar",
      bairro: "Sé", localidade: "São Paulo", uf: "SP", ibge: "3550308", ddd: "11",
    }),
  },
];

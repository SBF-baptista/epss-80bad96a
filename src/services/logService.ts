import { supabase } from "@/integrations/supabase/client";

export interface LogAction {
  action: string;
  module: string;
  details?: string;
  ip_address?: string;
}

/**
 * Registra uma ação no sistema usando RPC (server-side function)
 * @param logData - Dados do log a ser registrado
 */
export const logAction = async (logData: LogAction): Promise<void> => {
  try {
    // Usar função RPC server-side para garantir que o log seja registrado
    const { error } = await supabase.rpc("log_action", {
      p_action: logData.action,
      p_module: logData.module,
      p_details: logData.details || null,
      p_ip_address: logData.ip_address || null,
    });

    if (error) {
      console.error("Erro ao registrar log via RPC:", error);
      
      // Fallback: tentar inserir diretamente
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("app_logs").insert({
        user_id: user?.id || null,
        action: logData.action,
        module: logData.module,
        details: logData.details || null,
        ip_address: logData.ip_address || null,
      });
      
      if (insertError) {
        console.error("Erro ao registrar log (fallback):", insertError);
      }
    }
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
};

/**
 * Obtém o IP do cliente (melhor esforço)
 */
export const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};

/**
 * Helper para registrar login
 */
export const logLogin = async () => {
  const ip = await getClientIP();
  await logAction({
    action: "Login realizado",
    module: "Autenticação",
    details: "Usuário fez login no sistema",
    ip_address: ip || undefined,
  });
};

/**
 * Helper para registrar logout
 */
export const logLogout = async () => {
  const ip = await getClientIP();
  await logAction({
    action: "Logout realizado",
    module: "Autenticação",
    details: "Usuário fez logout do sistema",
    ip_address: ip || undefined,
  });
};

/**
 * Helper para registrar criação de registro
 */
export const logCreate = async (module: string, recordType: string, recordId?: string) => {
  await logAction({
    action: "Criou registro",
    module,
    details: `Criou ${recordType}${recordId ? ` (ID: ${recordId})` : ""}`,
  });
};

/**
 * Helper para registrar edição de registro
 */
export const logUpdate = async (
  module: string,
  recordType: string,
  recordId: string,
  changes?: string
) => {
  await logAction({
    action: "Editou registro",
    module,
    details: `Editou ${recordType} (ID: ${recordId})${changes ? `. Alterações: ${changes}` : ""}`,
  });
};

/**
 * Helper para registrar exclusão de registro
 */
export const logDelete = async (module: string, recordType: string, recordId: string) => {
  await logAction({
    action: "Excluiu registro",
    module,
    details: `Excluiu ${recordType} (ID: ${recordId})`,
  });
};

/**
 * Helper para registrar mudança de status no Kanban
 */
export const logKanbanMove = async (
  module: string,
  cardId: string,
  fromStatus: string,
  toStatus: string,
  cardTitle?: string
) => {
  await logAction({
    action: "Moveu card no Kanban",
    module,
    details: `Moveu card${cardTitle ? ` "${cardTitle}"` : ""} (ID: ${cardId}) de "${fromStatus}" para "${toStatus}"`,
  });
};

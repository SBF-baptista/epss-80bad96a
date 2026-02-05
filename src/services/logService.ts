import { supabase } from "@/integrations/supabase/client";

// Tipos para o sistema de logging aprimorado
export type LogActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'approval' 
  | 'rejection' 
  | 'cancellation' 
  | 'integration' 
  | 'system' 
  | 'error'
  | 'access';

export type LogOrigin = 'web' | 'api' | 'integration' | 'system' | 'mobile' | 'job' | 'webhook';

export type LogImpactLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type LogStatus = 'success' | 'error' | 'partial' | 'pending';

export interface ExtendedLogAction {
  action: string;
  module: string;
  details?: string;
  ip_address?: string;
  action_type?: LogActionType;
  origin?: LogOrigin;
  impact_level?: LogImpactLevel;
  status?: LogStatus;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  changed_fields?: string[];
  error_code?: string;
  error_message?: string;
  device_info?: string;
  browser_info?: string;
  is_lgpd_sensitive?: boolean;
  is_critical?: boolean;
  is_reversible?: boolean;
  duration_ms?: number;
}

export interface LogAction {
  action: string;
  module: string;
  details?: string;
  ip_address?: string;
}

/**
 * Detecta informações do navegador
 */
const getBrowserInfo = (): string => {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
};

/**
 * Detecta informações do dispositivo
 */
const getDeviceInfo = (): string => {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

/**
 * Registra uma ação completa no sistema usando a função RPC estendida
 */
export const logActionExtended = async (logData: ExtendedLogAction): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc("log_action_extended", {
      p_action: logData.action,
      p_module: logData.module,
      p_details: logData.details || null,
      p_ip_address: logData.ip_address || null,
      p_action_type: logData.action_type || 'system',
      p_origin: logData.origin || 'web',
      p_impact_level: logData.impact_level || 'low',
      p_status: logData.status || 'success',
      p_entity_type: logData.entity_type || null,
      p_entity_id: logData.entity_id || null,
      p_entity_name: logData.entity_name || null,
      p_previous_state: logData.previous_state ? JSON.stringify(logData.previous_state) : null,
      p_new_state: logData.new_state ? JSON.stringify(logData.new_state) : null,
      p_changed_fields: logData.changed_fields || null,
      p_error_code: logData.error_code || null,
      p_error_message: logData.error_message || null,
      p_device_info: logData.device_info || getDeviceInfo(),
      p_browser_info: logData.browser_info || getBrowserInfo(),
      p_is_lgpd_sensitive: logData.is_lgpd_sensitive || false,
      p_is_critical: logData.is_critical || false,
      p_is_reversible: logData.is_reversible !== false,
      p_duration_ms: logData.duration_ms || null,
    });

    if (error) {
      console.error("Erro ao registrar log estendido via RPC:", error);
      // Fallback para log simples
      await logAction({
        action: logData.action,
        module: logData.module,
        details: logData.details,
        ip_address: logData.ip_address,
      });
      return null;
    }

    return data as string;
  } catch (error) {
    console.error("Erro ao registrar log estendido:", error);
    return null;
  }
};

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
  await logActionExtended({
    action: "Login realizado",
    module: "Autenticação",
    details: "Usuário fez login no sistema",
    ip_address: ip || undefined,
    action_type: 'login',
    origin: 'web',
    impact_level: 'info',
    is_reversible: false,
    device_info: getDeviceInfo(),
    browser_info: getBrowserInfo(),
  });
};

/**
 * Helper para registrar logout
 */
export const logLogout = async () => {
  const ip = await getClientIP();
  await logActionExtended({
    action: "Logout realizado",
    module: "Autenticação",
    details: "Usuário fez logout do sistema",
    ip_address: ip || undefined,
    action_type: 'logout',
    origin: 'web',
    impact_level: 'info',
    is_reversible: false,
  });
};

/**
 * Helper para registrar criação de registro
 */
export const logCreate = async (
  module: string, 
  recordType: string, 
  recordId?: string,
  recordName?: string,
  newState?: Record<string, unknown>,
  options?: { isLgpdSensitive?: boolean; isCritical?: boolean }
) => {
  await logActionExtended({
    action: "Criou registro",
    module,
    details: `Criou ${recordType}${recordId ? ` (ID: ${recordId})` : ""}${recordName ? ` - ${recordName}` : ""}`,
    action_type: 'create',
    origin: 'web',
    impact_level: 'medium',
    entity_type: recordType,
    entity_id: recordId,
    entity_name: recordName,
    new_state: newState,
    is_reversible: true,
    is_lgpd_sensitive: options?.isLgpdSensitive,
    is_critical: options?.isCritical,
  });
};

/**
 * Helper para registrar edição de registro
 */
export const logUpdate = async (
  module: string,
  recordType: string,
  recordId: string,
  changes?: string,
  options?: {
    recordName?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    changedFields?: string[];
    isLgpdSensitive?: boolean;
    isCritical?: boolean;
  }
) => {
  await logActionExtended({
    action: "Editou registro",
    module,
    details: `Editou ${recordType} (ID: ${recordId})${changes ? `. Alterações: ${changes}` : ""}`,
    action_type: 'update',
    origin: 'web',
    impact_level: 'high',
    entity_type: recordType,
    entity_id: recordId,
    entity_name: options?.recordName,
    previous_state: options?.previousState,
    new_state: options?.newState,
    changed_fields: options?.changedFields,
    is_reversible: true,
    is_lgpd_sensitive: options?.isLgpdSensitive,
    is_critical: options?.isCritical,
  });
};

/**
 * Helper para registrar exclusão de registro
 */
export const logDelete = async (
  module: string, 
  recordType: string, 
  recordId: string,
  recordName?: string,
  previousState?: Record<string, unknown>,
  options?: { isLgpdSensitive?: boolean }
) => {
  await logActionExtended({
    action: "Excluiu registro",
    module,
    details: `Excluiu ${recordType} (ID: ${recordId})${recordName ? ` - ${recordName}` : ""}`,
    action_type: 'delete',
    origin: 'web',
    impact_level: 'critical',
    entity_type: recordType,
    entity_id: recordId,
    entity_name: recordName,
    previous_state: previousState,
    is_reversible: false,
    is_critical: true,
    is_lgpd_sensitive: options?.isLgpdSensitive,
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
  await logActionExtended({
    action: "Moveu card no Kanban",
    module,
    details: `Moveu card${cardTitle ? ` "${cardTitle}"` : ""} (ID: ${cardId}) de "${fromStatus}" para "${toStatus}"`,
    action_type: 'update',
    origin: 'web',
    impact_level: 'medium',
    entity_type: 'Card Kanban',
    entity_id: cardId,
    entity_name: cardTitle,
    previous_state: { status: fromStatus },
    new_state: { status: toStatus },
    changed_fields: ['status'],
    is_reversible: true,
  });
};

/**
 * Helper para registrar aprovação
 */
export const logApproval = async (
  module: string,
  recordType: string,
  recordId: string,
  recordName?: string,
  details?: string
) => {
  await logActionExtended({
    action: "Aprovou registro",
    module,
    details: details || `Aprovou ${recordType} (ID: ${recordId})${recordName ? ` - ${recordName}` : ""}`,
    action_type: 'approval',
    origin: 'web',
    impact_level: 'high',
    entity_type: recordType,
    entity_id: recordId,
    entity_name: recordName,
    is_reversible: true,
    is_critical: true,
  });
};

/**
 * Helper para registrar rejeição
 */
export const logRejection = async (
  module: string,
  recordType: string,
  recordId: string,
  reason?: string,
  recordName?: string
) => {
  await logActionExtended({
    action: "Rejeitou registro",
    module,
    details: `Rejeitou ${recordType} (ID: ${recordId})${recordName ? ` - ${recordName}` : ""}${reason ? `. Motivo: ${reason}` : ""}`,
    action_type: 'rejection',
    origin: 'web',
    impact_level: 'high',
    entity_type: recordType,
    entity_id: recordId,
    entity_name: recordName,
    is_reversible: true,
    is_critical: true,
  });
};

/**
 * Helper para registrar erro
 */
export const logError = async (
  module: string,
  action: string,
  errorCode: string,
  errorMessage: string,
  details?: string
) => {
  await logActionExtended({
    action: action,
    module,
    details: details || `Erro: ${errorMessage}`,
    action_type: 'error',
    origin: 'web',
    impact_level: 'critical',
    status: 'error',
    error_code: errorCode,
    error_message: errorMessage,
    is_reversible: false,
    is_critical: true,
  });
};

/**
 * Helper para registrar ação de integração
 */
export const logIntegration = async (
  module: string,
  action: string,
  details: string,
  status: LogStatus = 'success',
  options?: {
    entityType?: string;
    entityId?: string;
    errorCode?: string;
    errorMessage?: string;
    durationMs?: number;
  }
) => {
  await logActionExtended({
    action,
    module,
    details,
    action_type: 'integration',
    origin: 'integration',
    impact_level: status === 'error' ? 'critical' : 'medium',
    status,
    entity_type: options?.entityType,
    entity_id: options?.entityId,
    error_code: options?.errorCode,
    error_message: options?.errorMessage,
    duration_ms: options?.durationMs,
    is_reversible: false,
  });
};

/**
 * Helper para registrar acesso a dados sensíveis (LGPD)
 */
export const logSensitiveAccess = async (
  module: string,
  dataType: string,
  recordId?: string,
  recordName?: string
) => {
  await logActionExtended({
    action: "Acessou dados sensíveis",
    module,
    details: `Acessou ${dataType}${recordId ? ` (ID: ${recordId})` : ""}${recordName ? ` - ${recordName}` : ""}`,
    action_type: 'access',
    origin: 'web',
    impact_level: 'high',
    entity_type: dataType,
    entity_id: recordId,
    entity_name: recordName,
    is_lgpd_sensitive: true,
    is_reversible: false,
  });
};

/**
 * Helper para registrar ação do sistema (automática)
 */
export const logSystemAction = async (
  module: string,
  action: string,
  details: string,
  options?: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
    impactLevel?: LogImpactLevel;
    status?: LogStatus;
  }
) => {
  await logActionExtended({
    action,
    module,
    details,
    action_type: 'system',
    origin: 'system',
    impact_level: options?.impactLevel || 'info',
    status: options?.status || 'success',
    entity_type: options?.entityType,
    entity_id: options?.entityId,
    entity_name: options?.entityName,
    is_reversible: false,
  });
};

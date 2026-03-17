import { supabase } from "@/integrations/supabase/client";

export interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  system_origin: string;
  headers: Record<string, string>;
  default_body: any;
  is_active: boolean;
  expected_response_time_ms: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiExecutionLog {
  id: string;
  endpoint_id: string;
  status_code: number | null;
  response_time_ms: number | null;
  request_headers: Record<string, string>;
  request_body: any;
  response_body: string | null;
  error_message: string | null;
  executed_by: string | null;
  executed_at: string;
}

export interface EndpointWithStats extends ApiEndpoint {
  last_execution?: ApiExecutionLog | null;
  success_rate: number;
  avg_response_time: number;
  error_count_4xx: number;
  error_count_5xx: number;
  total_executions: number;
  consecutive_errors: number;
  status_indicator: 'ok' | 'warning' | 'error' | 'unknown';
}

export const fetchEndpoints = async (): Promise<ApiEndpoint[]> => {
  const { data, error } = await supabase
    .from('api_endpoints')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []) as unknown as ApiEndpoint[];
};

export const fetchEndpointWithStats = async (): Promise<EndpointWithStats[]> => {
  const endpoints = await fetchEndpoints();

  // Fetch recent logs for all endpoints (last 50 per endpoint)
  const { data: logs, error: logsError } = await supabase
    .from('api_execution_logs')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(500);

  if (logsError) throw logsError;

  const typedLogs = (logs || []) as unknown as ApiExecutionLog[];

  return endpoints.map(endpoint => {
    const endpointLogs = typedLogs.filter(l => l.endpoint_id === endpoint.id);
    const last_execution = endpointLogs[0] || null;
    const total_executions = endpointLogs.length;

    const successLogs = endpointLogs.filter(l => l.status_code && l.status_code >= 200 && l.status_code < 400);
    const success_rate = total_executions > 0 ? (successLogs.length / total_executions) * 100 : 0;

    const responseTimes = endpointLogs.filter(l => l.response_time_ms).map(l => l.response_time_ms!);
    const avg_response_time = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const error_count_4xx = endpointLogs.filter(l => l.status_code && l.status_code >= 400 && l.status_code < 500).length;
    const error_count_5xx = endpointLogs.filter(l => l.status_code && l.status_code >= 500).length;

    // Count consecutive errors from most recent
    let consecutive_errors = 0;
    for (const log of endpointLogs) {
      if (log.status_code && log.status_code >= 400) {
        consecutive_errors++;
      } else {
        break;
      }
    }

    let status_indicator: 'ok' | 'warning' | 'error' | 'unknown' = 'unknown';
    if (total_executions === 0) {
      status_indicator = 'unknown';
    } else if (consecutive_errors >= 3 || (last_execution?.status_code && last_execution.status_code >= 500)) {
      status_indicator = 'error';
    } else if (
      success_rate < 90 ||
      (last_execution?.response_time_ms && last_execution.response_time_ms > endpoint.expected_response_time_ms) ||
      consecutive_errors > 0
    ) {
      status_indicator = 'warning';
    } else {
      status_indicator = 'ok';
    }

    return {
      ...endpoint,
      last_execution,
      success_rate,
      avg_response_time,
      error_count_4xx,
      error_count_5xx,
      total_executions,
      consecutive_errors,
      status_indicator,
    };
  });
};

export const createEndpoint = async (endpoint: Omit<ApiEndpoint, 'id' | 'created_at' | 'updated_at'>): Promise<ApiEndpoint> => {
  const { data, error } = await supabase
    .from('api_endpoints')
    .insert(endpoint as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ApiEndpoint;
};

export const updateEndpoint = async (id: string, updates: Partial<ApiEndpoint>): Promise<ApiEndpoint> => {
  const { data, error } = await supabase
    .from('api_endpoints')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ApiEndpoint;
};

export const deleteEndpoint = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('api_endpoints')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const fetchExecutionLogs = async (endpointId: string, limit = 50): Promise<ApiExecutionLog[]> => {
  const { data, error } = await supabase
    .from('api_execution_logs')
    .select('*')
    .eq('endpoint_id', endpointId)
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as ApiExecutionLog[];
};

export const executeEndpointTest = async (
  endpointId: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: any
): Promise<ApiExecutionLog> => {
  const startTime = Date.now();

  try {
    // Call edge function to proxy the request (avoids CORS)
    const { data, error } = await supabase.functions.invoke('test-api-endpoint', {
      body: { method, url, headers, body },
    });

    if (error) throw error;

    const responseTimeMs = Date.now() - startTime;

    // Save log
    const { data: log, error: logError } = await supabase
      .from('api_execution_logs')
      .insert({
        endpoint_id: endpointId,
        status_code: data.status_code,
        response_time_ms: responseTimeMs,
        request_headers: headers,
        request_body: body,
        response_body: typeof data.response_body === 'string'
          ? data.response_body.substring(0, 10000)
          : JSON.stringify(data.response_body)?.substring(0, 10000),
        error_message: data.error_message || null,
      } as any)
      .select()
      .single();

    if (logError) throw logError;
    return log as unknown as ApiExecutionLog;
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;

    const { data: log, error: logError } = await supabase
      .from('api_execution_logs')
      .insert({
        endpoint_id: endpointId,
        status_code: 0,
        response_time_ms: responseTimeMs,
        request_headers: headers,
        request_body: body,
        response_body: null,
        error_message: err.message || 'Erro desconhecido',
      } as any)
      .select()
      .single();

    if (logError) console.error('Error saving log:', logError);
    return (log || {
      id: '',
      endpoint_id: endpointId,
      status_code: 0,
      response_time_ms: responseTimeMs,
      request_headers: headers,
      request_body: body,
      response_body: null,
      error_message: err.message,
      executed_by: null,
      executed_at: new Date().toISOString(),
    }) as ApiExecutionLog;
  }
};

export const maskSensitiveValue = (key: string, value: string): string => {
  const sensitiveKeys = ['authorization', 'token', 'api-key', 'apikey', 'secret', 'password', 'bearer'];
  if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
    if (value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
  }
  return value;
};

import { supabase } from "@/integrations/supabase/client";

interface HomologationErrorLog {
  user_id: string;
  action: string;
  error_message: string;
  error_stack?: string;
  component: string;
  card_id?: string;
  browser_info: string;
  timestamp: string;
  additional_context?: Record<string, any>;
}

export const logHomologationError = async (
  action: string,
  error: Error | string,
  component: string,
  cardId?: string,
  additionalContext?: Record<string, any>
) => {
  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    
    const errorLog: HomologationErrorLog = {
      user_id: (await supabase.auth.getUser()).data.user?.id || 'unknown',
      action,
      error_message: errorMessage,
      error_stack: errorStack,
      component,
      card_id: cardId,
      browser_info: navigator.userAgent,
      timestamp: new Date().toISOString(),
      additional_context: additionalContext
    };

    console.error('Homologation Error:', errorLog);
    
    // Store in localStorage as backup if database fails
    try {
      const existingLogs = JSON.parse(localStorage.getItem('homologation_error_logs') || '[]');
      existingLogs.push(errorLog);
      // Keep only last 50 logs
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      localStorage.setItem('homologation_error_logs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.warn('Failed to store error log in localStorage:', storageError);
    }
    
  } catch (logError) {
    console.error('Failed to log homologation error:', logError);
  }
};

export const getStoredErrorLogs = (): HomologationErrorLog[] => {
  try {
    return JSON.parse(localStorage.getItem('homologation_error_logs') || '[]');
  } catch {
    return [];
  }
};

export const clearStoredErrorLogs = () => {
  localStorage.removeItem('homologation_error_logs');
};

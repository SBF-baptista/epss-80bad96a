
import { useToast } from "@/hooks/use-toast";
import { logHomologationError } from "@/services/homologationErrorLogger";

interface HomologationErrorOptions {
  action: string;
  component: string;
  cardId?: string;
  additionalContext?: Record<string, any>;
}

export const useHomologationToast = () => {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default"
    });
  };

  const showError = (
    error: Error | string, 
    options: HomologationErrorOptions,
    userFriendlyMessage?: string
  ) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Log the detailed error
    logHomologationError(
      options.action,
      error,
      options.component,
      options.cardId,
      options.additionalContext
    );

    // Categorize the error and provide appropriate user feedback
    let title = "Erro no Sistema";
    let description = userFriendlyMessage || "Ocorreu um erro inesperado.";
    let suggestions: string[] = [];

    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('connection')) {
      title = "Erro de Conexão";
      description = "Problema de conectividade detectado.";
      suggestions = [
        "Verifique sua conexão com a internet",
        "Tente novamente em alguns segundos"
      ];
    } else if (errorMessage.toLowerCase().includes('permission') ||
               errorMessage.toLowerCase().includes('unauthorized') ||
               errorMessage.toLowerCase().includes('forbidden')) {
      title = "Erro de Permissão";
      description = "Você não tem permissão para realizar esta ação.";
      suggestions = [
        "Verifique se você está logado",
        "Entre em contato com o administrador"
      ];
    } else if (errorMessage.toLowerCase().includes('validation') ||
               errorMessage.toLowerCase().includes('invalid')) {
      title = "Erro de Validação";
      description = "Os dados fornecidos são inválidos.";
      suggestions = [
        "Verifique se todos os campos estão preenchidos corretamente",
        "Tente novamente com dados válidos"
      ];
    } else if (errorMessage.toLowerCase().includes('timeout')) {
      title = "Timeout da Operação";
      description = "A operação demorou mais que o esperado.";
      suggestions = [
        "Tente novamente",
        "Verifique sua conexão com a internet"
      ];
    }

    const fullDescription = suggestions.length > 0 
      ? `${description}\n\nSugestões:\n${suggestions.map(s => `• ${s}`).join('\n')}`
      : description;

    toast({
      title,
      description: fullDescription,
      variant: "destructive"
    });
  };

  const showWarning = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default" // Since there's no warning variant, use default with appropriate styling
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default"
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

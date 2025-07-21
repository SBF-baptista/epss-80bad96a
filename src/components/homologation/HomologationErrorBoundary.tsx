
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logHomologationError } from '@/services/homologationErrorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class HomologationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    logHomologationError(
      'component_error',
      error,
      'HomologationErrorBoundary',
      undefined,
      {
        errorInfo: errorInfo.componentStack,
        props: this.props
      }
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReportBug = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      component: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.log('Bug report details:', errorDetails);
    
    // You could integrate with a bug tracking service here
    alert('Detalhes do erro foram registrados no console. Por favor, entre em contato com o suporte técnico.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-2xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erro no Sistema de Homologação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Ocorreu um erro inesperado no sistema de homologação. 
                {this.state.error?.message && (
                  <div className="mt-2 font-mono text-sm">
                    {this.state.error.message}
                  </div>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Você pode tentar as seguintes ações:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Recarregar a página (F5)</li>
                <li>Limpar o cache do navegador</li>
                <li>Verificar sua conexão com a internet</li>
                <li>Tentar novamente em alguns minutos</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={this.handleRetry} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button onClick={this.handleReportBug} variant="outline" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Reportar Problema
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Recarregar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default HomologationErrorBoundary;

import { Navigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { FullScreenLoader } from '@/components/ui/loading'

const SmartRedirect = () => {
  const { role, loading } = useUserRole()

  if (loading) {
    return <FullScreenLoader message="Carregando..." />
  }

  // User has no role assigned - show access denied
  if (role === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-destructive text-lg font-medium mb-4">
            Acesso Negado
          </div>
          <p className="text-muted-foreground mb-4">
            Seu usuário não possui permissões para acessar o sistema.
          </p>
          <p className="text-muted-foreground text-sm">
            Entre em contato com o administrador para obter acesso.
          </p>
        </div>
      </div>
    )
  }

  // Redirect to module selection page (which has Layout wrapper)
  return <Navigate to="/modules" replace />
}

export default SmartRedirect

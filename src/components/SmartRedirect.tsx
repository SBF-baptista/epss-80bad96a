import { Navigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import ModuleSelection from '@/pages/ModuleSelection'

const SmartRedirect = () => {
  const { role, loading } = useUserRole()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
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

  // Show module selection page for all authenticated users with a role
  return <ModuleSelection />
}

export default SmartRedirect
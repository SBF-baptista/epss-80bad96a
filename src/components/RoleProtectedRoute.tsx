import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserRole, UserRole } from '@/hooks/useUserRole'
import { AppModule } from '@/types/permissions'
import { ROUTE_TO_MODULE } from '@/services/permissionsService'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]  // Legacy support
  requiredModule?: AppModule // New module-based access
  redirectTo?: string
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requiredModule,
  redirectTo = '/modules' 
}: RoleProtectedRouteProps) => {
  const { role, canViewModule, loading } = useUserRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && role) {
      // Admin always has access
      if (role === 'admin') return

      let hasAccess = false

      // Check module-based access first
      if (requiredModule) {
        hasAccess = canViewModule(requiredModule)
      } else if (allowedRoles.length > 0) {
        // Legacy role-based check (admin and gestor have full access)
        hasAccess = allowedRoles.includes(role)
      } else {
        // No restrictions
        hasAccess = true
      }

      if (!hasAccess) {
        console.log(`Access denied. User role: ${role}, Required module: ${requiredModule}`)
        navigate(redirectTo)
      }
    }
  }, [role, loading, allowedRoles, requiredModule, navigate, redirectTo, canViewModule])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Admin always has access
  if (role === 'admin') {
    return <>{children}</>
  }

  let hasAccess = false
  
  if (requiredModule) {
    hasAccess = canViewModule(requiredModule)
  } else if (allowedRoles.length > 0) {
    hasAccess = role !== null && allowedRoles.includes(role)
  } else {
    hasAccess = role !== null
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default RoleProtectedRoute

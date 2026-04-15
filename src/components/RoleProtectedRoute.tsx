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
  const { role, canViewModule, loading, isImpersonating, realRole } = useUserRole()
  const navigate = useNavigate()

  // Real admin (even when impersonating) should never be locked out of routes
  const isRealAdmin = realRole === 'admin' || (!isImpersonating && role === 'admin')

  useEffect(() => {
    if (!loading && role) {
      if (isRealAdmin && !isImpersonating) return

      let hasAccess = false

      if (isImpersonating) {
        // When impersonating, check simulated permissions
        if (requiredModule) {
          hasAccess = canViewModule(requiredModule)
        } else if (allowedRoles.length > 0) {
          hasAccess = allowedRoles.includes(role)
        } else {
          hasAccess = true
        }
        // Real admin always has escape hatch - don't redirect, just show content
        if (!hasAccess && isRealAdmin) hasAccess = true
      } else {
        if (requiredModule) {
          hasAccess = canViewModule(requiredModule)
        } else if (allowedRoles.length > 0) {
          hasAccess = allowedRoles.includes(role)
        } else {
          hasAccess = true
        }
      }

      if (!hasAccess) {
        console.log(`Access denied. User role: ${role}, Required module: ${requiredModule}`)
        navigate(redirectTo)
      }
    }
  }, [role, loading, allowedRoles, requiredModule, navigate, redirectTo, canViewModule, isImpersonating, isRealAdmin])

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

  // Real admin always sees content
  if (isRealAdmin && !isImpersonating) {
    return <>{children}</>
  }

  let hasAccess = false
  
  if (isImpersonating && isRealAdmin) {
    // Real admin impersonating - always allow but show simulated view
    hasAccess = true
  } else if (requiredModule) {
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

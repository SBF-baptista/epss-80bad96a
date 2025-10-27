import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserRole, UserRole } from '@/hooks/useUserRole'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
}

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/' 
}: RoleProtectedRouteProps) => {
  const { role, loading } = useUserRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && role) {
      // Admin e Gestor têm acesso a tudo
      const hasAccess = role === 'admin' || role === 'gestor' || allowedRoles.includes(role)
      
      if (!hasAccess) {
        console.log(`Access denied. User role: ${role}, Required roles:`, allowedRoles)
        navigate(redirectTo)
      }
    }
  }, [role, loading, allowedRoles, navigate, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Admin e Gestor têm acesso a tudo
  const hasAccess = role === 'admin' || role === 'gestor' || (role && allowedRoles.includes(role))
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default RoleProtectedRoute
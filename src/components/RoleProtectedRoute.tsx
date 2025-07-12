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
  redirectTo = '/homologation' 
}: RoleProtectedRouteProps) => {
  const { role, loading } = useUserRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && role) {
      if (!allowedRoles.includes(role)) {
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

  if (!role || !allowedRoles.includes(role)) {
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
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'

const SmartRedirect = () => {
  const { role, loading } = useUserRole()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Redirect based on user role
  if (role === 'installer') {
    return <Navigate to="/homologation" replace />
  } else if (role === 'admin') {
    return <Navigate to="/homologation" replace />
  } else if (role === null) {
    // User is authenticated but has no role assigned
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-4">
            Acesso Negado
          </div>
          <p className="text-gray-600 mb-4">
            Seu usuário não possui permissões para acessar o sistema.
          </p>
          <p className="text-gray-500 text-sm">
            Entre em contato com o administrador para obter acesso.
          </p>
        </div>
      </div>
    )
  }

  // Fallback (should not reach here)
  return <Navigate to="/auth" replace />
}

export default SmartRedirect
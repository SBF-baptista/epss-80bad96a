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
  }

  // Default redirect if no role found
  return <Navigate to="/auth" replace />
}

export default SmartRedirect
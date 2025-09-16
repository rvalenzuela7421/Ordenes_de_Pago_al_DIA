"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserProfile, hasRole } from '@/lib/auth'
import { UserRole, UserProfile } from '@/lib/database.types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  allowedRoles = ['AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionBSEG'],
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndPermissions()
  }, [])

  const checkAuthAndPermissions = async () => {
    try {
      const userProfile = await getCurrentUserProfile()
      
      if (!userProfile) {
        router.push(redirectTo)
        return
      }

      setUser(userProfile)

      // Verificar si el usuario necesita cambiar contraseña
      if (userProfile.must_change_password) {
        router.push('/auth/update-password?required=true')
        return
      }

      // Verificar permisos de rol
      if (!hasRole(userProfile.role, allowedRoles)) {
        router.push('/unauthorized')
        return
      }

      setAuthorized(true)
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      router.push(redirectTo)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!authorized || !user) {
    return null
  }

  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Verificando permisos</h2>
        <p className="text-sm text-gray-500">Un momento por favor...</p>
      </div>
    </div>
  )
}

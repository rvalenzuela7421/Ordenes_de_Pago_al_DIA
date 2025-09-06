'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UserProfile } from '@/lib/database.types'
import { getCurrentUserProfile } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import UserAvatar from '@/components/UserAvatar'

// Rutas que no requieren el layout del dashboard
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/callback', '/auth/reset-password', '/auth/update-password', '/auth/verify-otp', '/unauthorized']

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route))

  const [sidebarExpanded, setSidebarExpanded] = useState(true) // Expandido por defecto
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  // Obtener el usuario autenticado real solo si no es ruta de auth
  useEffect(() => {
    if (isAuthRoute) {
      setUserLoading(false)
      return
    }

    const loadUserProfile = async () => {
      try {
        setUserLoading(true)
        const userProfile = await getCurrentUserProfile()
        setCurrentUser(userProfile)
      } catch (error) {
        console.error('Error obteniendo perfil del usuario:', error)
      } finally {
        setUserLoading(false)
      }
    }

    loadUserProfile()
  }, [isAuthRoute])

  // Si es una ruta de autenticación, renderizar sin el layout del dashboard
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Para todas las demás rutas, usar el layout completo del dashboard
  return (
    <ProtectedRoute allowedRoles={['AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionTRIB']}>
      {/* Dashboard accesible para TODOS los perfiles del sistema */}
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar expandible */}
        <Sidebar 
          isExpanded={sidebarExpanded}
          onToggleExpand={() => setSidebarExpanded(!sidebarExpanded)}
        />

        {/* Main content optimizado con padding adaptativo */}
        <div className={`transition-all duration-300 ${sidebarExpanded ? 'lg:pl-60' : 'lg:pl-16'}`}>

          {/* Top bar minimalista - solo perfil de usuario */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200/80">
            <div className="flex items-center justify-between h-12 px-3 lg:px-6">
              {/* Lado izquierdo - Título del sistema */}
              <div className="flex items-center">
                <span className="text-2xl font-bold text-bolivar-green">
                  Centro de Órdenes de Pago
                </span>
              </div>

              {/* Lado derecho - Solo información del usuario */}
              <div className="flex items-center">
                {userLoading ? (
                  // Estado de carga
                  <div className="hidden md:flex md:flex-col md:items-end mr-3">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : currentUser ? (
                  // Información del usuario real
                  <div className="hidden md:flex md:flex-col md:items-end mr-3">
                    <span className="text-sm font-medium text-gray-900">
                      {currentUser.nombre_completo || currentUser.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-gray-500">{currentUser.role}</span>
                  </div>
                ) : (
                  // Fallback si no hay usuario
                  <div className="hidden md:flex md:flex-col md:items-end mr-3">
                    <span className="text-sm font-medium text-gray-900">Usuario</span>
                    <span className="text-xs text-gray-500">--</span>
                  </div>
                )}
                
                {/* Avatar del usuario */}
                {currentUser && <UserAvatar user={currentUser} />}
              </div>
            </div>
          </div>

          {/* Main content area optimizado */}
          <main className="p-2 lg:p-3">
            <div className="max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

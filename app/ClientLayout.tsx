'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { UserProfile } from '@/lib/database.types'
import { getCurrentUserProfile } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
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

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Items del menú de navegación
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
          />
        </svg>
      )
    },
    {
      name: 'Nueva Solicitud',
      href: '/solicitudes/nueva',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      name: 'Nueva OP',
      href: '/ordenes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      name: 'Reportes',
      href: '/reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ]

  const isActive = (href: string) => pathname === href

  // Función para recargar el perfil del usuario
  const reloadUserProfile = async () => {
    if (isAuthRoute) return
    
    try {
      const userProfile = await getCurrentUserProfile()
      setCurrentUser(userProfile)
    } catch (error) {
      console.error('Error recargando perfil del usuario:', error)
    }
  }

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

  // Escuchar cambios de ruta para recargar el perfil si viene de /profile
  useEffect(() => {
    // Si el usuario viene de la página de perfil, recargar el perfil
    const previousPath = sessionStorage.getItem('previousPath')
    if (previousPath === '/profile' && pathname !== '/profile') {
      reloadUserProfile()
      sessionStorage.removeItem('previousPath')
    }
    
    // Guardar la ruta actual para la próxima navegación
    sessionStorage.setItem('previousPath', pathname)
  }, [pathname, isAuthRoute])

  // También escuchar eventos de focus de la ventana (cuando el usuario regresa)
  useEffect(() => {
    if (isAuthRoute) return

    const handleFocus = () => {
      // Recargar perfil cuando el usuario regresa a la ventana
      reloadUserProfile()
    }

    // Escuchar evento personalizado de actualización del perfil
    const handleProfileUpdate = () => {
      console.log('👤 Perfil actualizado - recargando...')
      reloadUserProfile()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('userProfileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('userProfileUpdated', handleProfileUpdate)
    }
  }, [isAuthRoute])

  // Si es una ruta de autenticación, renderizar sin el layout del dashboard
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Para todas las demás rutas, usar el layout completo del dashboard
  return (
    <ProtectedRoute allowedRoles={['AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionTRIB']}>
      {/* Dashboard con navegación horizontal */}
      <div className="min-h-screen bg-gray-50">
        
        {/* Header con navegación horizontal */}
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo y título */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <img 
                    src="https://automas.com.co/wp-content/uploads/2023/09/Logo-Bolivar-horizontal.png" 
                    alt="Seguros Bolívar" 
                    className="h-8 w-auto object-contain max-w-[120px]"
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  {/* Fallback logo */}
                  <div className="hidden flex items-center space-x-2">
                    <div className="w-6 h-6 bg-bolivar-green rounded flex items-center justify-center">
                      <span className="text-white font-black text-xs">SB</span>
                    </div>
                    <span className="text-sm font-bold text-bolivar-green">SEGUROS BOLÍVAR</span>
                  </div>
                </div>
                
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-bolivar-green">
                    Mis Pagos{' '}
                    <span className="font-bold text-black">ALD</span>
                    <span className="font-bold text-bolivar-yellow">IA</span>
                  </span>
                </div>
              </div>

              {/* Navegación principal - Desktop */}
              <nav className="hidden md:flex space-x-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive(item.href) 
                        ? 'bg-bolivar-green text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-bolivar-green'
                      }
                    `}
                  >
                    <span className={`
                      mr-2 transition-colors duration-200
                      ${isActive(item.href) ? 'text-white' : 'text-gray-400'}
                    `}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Información del usuario y menú móvil */}
              <div className="flex items-center space-x-4">
                {/* Información del usuario - Desktop */}
                <div className="hidden lg:flex items-center space-x-3">
                  {userLoading ? (
                    // Estado de carga
                    <div className="flex flex-col items-end">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ) : currentUser ? (
                    // Información del usuario real
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900">
                        {currentUser.nombre_completo || currentUser.email.split('@')[0]}
                      </span>
                      <span className="text-xs text-gray-500">{currentUser.role}</span>
                    </div>
                  ) : (
                    // Fallback si no hay usuario
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900">Usuario</span>
                      <span className="text-xs text-gray-500">--</span>
                    </div>
                  )}
                  
                  {/* Avatar del usuario */}
                  {currentUser && <UserAvatar user={currentUser} />}
                </div>

                {/* Botón menú móvil */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-bolivar-green"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Menú móvil */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-base font-medium transition-all duration-200
                      ${isActive(item.href) 
                        ? 'bg-bolivar-green text-white' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-bolivar-green'
                      }
                    `}
                  >
                    <span className={`
                      mr-3 transition-colors duration-200
                      ${isActive(item.href) ? 'text-white' : 'text-gray-400'}
                    `}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                ))}
              </div>
              
              {/* Info del usuario en móvil */}
              {currentUser && (
                <div className="border-t border-gray-200 px-4 py-3">
                  <div className="flex items-center">
                    <UserAvatar user={currentUser} />
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {currentUser.nombre_completo || currentUser.email.split('@')[0]}
                      </div>
                      <div className="text-sm font-medium text-gray-500">{currentUser.role}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Main content area - usa todo el ancho de pantalla */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}

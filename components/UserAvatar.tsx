"use client"

import { useState, useRef, useEffect } from 'react'
import { signOut } from '@/lib/auth'
import { UserProfile } from '@/lib/database.types'
import { getInitials } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UserAvatarProps {
  user: UserProfile
}

export default function UserAvatar({ user }: UserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      setLoading(true)
      
      // En modo demo, simular logout exitoso
      console.log('🎭 MODO DEMO: Simulando cierre de sesión...', { user: user.email })
      
      // Simular delay realista
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Limpiar estado local
      localStorage.removeItem('demo_user')
      sessionStorage.removeItem('demo_login_active')
      sessionStorage.removeItem('demo_user_email')
      sessionStorage.clear()
      
      console.log('🎭 MODO DEMO: Sesión cerrada exitosamente')
      
      // Redirigir al login
      router.push('/auth/login')
      
    } catch (error) {
      console.error('Error inesperado al cerrar sesión:', error)
      // En caso de error, redirigir igualmente
      router.push('/auth/login')
    } finally {
      setLoading(false)
      setIsOpen(false)
    }
  }

  const handleProfile = () => {
    setIsOpen(false)
    router.push('/profile')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 text-sm font-medium text-white bg-primary-600 rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors overflow-hidden"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>
            {user.nombre_completo ? getInitials(user.nombre_completo) : user.email.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {/* Información del usuario */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user.nombre_completo || 'Usuario'}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-2">
              {user.role}
            </span>
          </div>

          {/* Opciones del menú */}
          <div className="py-1">
            <button
              onClick={handleProfile}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg 
                className="w-4 h-4 mr-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              Mi Perfil
            </button>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                    Cerrando sesión...
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-3" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                      />
                    </svg>
                    Cerrar Sesión
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error en callback de autenticación:', error)
        router.push('/auth/login?error=auth_error')
        return
      }

      if (data.session) {
        // Usuario autenticado exitosamente
        const user = data.session.user
        
        // Verificar si debe cambiar contraseña
        if (user.user_metadata?.must_change_password) {
          router.push('/auth/update-password?required=true')
          return
        }
        
        // Redirigir al dashboard
        router.push('/dashboard')
      } else {
        // No hay sesión, redirigir al login
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error procesando callback:', error)
      router.push('/auth/login?error=callback_error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Completando autenticación</h2>
        <p className="text-sm text-gray-500">Un momento por favor...</p>
      </div>
    </div>
  )
}

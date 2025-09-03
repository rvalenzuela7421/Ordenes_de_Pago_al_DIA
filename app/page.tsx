"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      const user = await getCurrentUserProfile()
      
      if (user) {
        // Si el usuario debe cambiar contraseña, redirigir
        if (user.must_change_password) {
          router.push('/auth/update-password?required=true')
          return
        }
        
        // Usuario autenticado, ir al dashboard
        router.push('/dashboard')
      } else {
        // No autenticado, ir al login
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Centro de Órdenes de Pago</h1>
        <p className="text-gray-500">Cargando aplicación...</p>
      </div>
    </div>
  )
}

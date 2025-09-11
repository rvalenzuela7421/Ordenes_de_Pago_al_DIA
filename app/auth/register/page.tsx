"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

export default function RegisterPage() {
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSuccess = () => {
    // No mostrar mensaje aquí ya que AuthForm maneja los mensajes
    // En modo demo, AuthForm ya muestra el mensaje apropiado
    setTimeout(() => {
      // Solo redirigir si no estamos en modo demo
      if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://demo.supabase.co') {
        router.push('/auth/login')
      }
    }, 3000)
  }

  const handleError = (error: string) => {
    setMessage('')
    console.error('Error de registro:', error)
    // Los errores ya vienen traducidos desde AuthForm
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-16 bg-bolivar-green rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg relative">
            <span className="text-white font-black text-xl tracking-wider">SB</span>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-bolivar-yellow rounded-full"></div>
          </div>
          <h2 className="text-3xl font-bold text-bolivar-black">
            <span className="text-bolivar-green">Seguros Bolívar</span>
          </h2>
          <h3 className="text-xl font-semibold text-gray-900 mt-1">
            Crear Cuenta
          </h3>
          <p className="mt-2 text-sm text-bolivar-gray">
            Regístrate en el Centro de Órdenes de Pago{' '}
            <span className="font-bold text-black">ALD</span><span className="font-bold text-bolivar-yellow">IA</span>
          </p>
        </div>

        {/* Mensaje de éxito */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-center text-sm">
            {message}
          </div>
        )}

        {/* Formulario de registro */}
        <div className="card p-8">
          <AuthForm 
            mode="register" 
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {/* Enlaces adicionales */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Ya tienes cuenta?</span>
              </div>
            </div>

            <div className="text-center mt-4">
              <Link 
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-700 hover:text-primary-500 transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>

        {/* Términos y condiciones */}
        <div className="text-center text-xs text-gray-500 space-y-2">
          <p>
            Al registrarte, aceptas nuestros términos de servicio y políticas de privacidad.
          </p>
          <p>
            Tu información estará protegida y solo será usada para los procesos del COP.
          </p>
        </div>
      </div>
    </div>
  )
}

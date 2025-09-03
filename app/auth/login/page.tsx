"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

export default function LoginPage() {
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSuccess = () => {
    setMessage('¡Bienvenido! Redirigiendo al sistema...')
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  }

  const handleError = (error: string) => {
    setMessage('')
    console.error('Error de autenticación:', error)
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
            Iniciar Sesión
          </h3>
          <p className="mt-2 text-sm text-bolivar-gray">
            Centro de Órdenes de Pago
          </p>
        </div>

        {/* Mensaje de éxito */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-center">
            {message}
          </div>
        )}

        {/* Formulario de login */}
        <div className="card p-8">
          <AuthForm 
            mode="login" 
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {/* Enlaces adicionales */}
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Link 
                href="/auth/reset-password"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Nuevo usuario?</span>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/auth/register"
                className="inline-flex items-center px-4 py-2 border border-primary-300 text-sm font-medium rounded-lg text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Crear nueva cuenta
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            Sistema seguro protegido con autenticación de dos factores
          </p>
        </div>
      </div>
    </div>
  )
}

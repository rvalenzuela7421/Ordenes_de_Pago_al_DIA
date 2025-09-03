"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPasswordWithEmail } from '@/lib/auth'
import { isValidEmail } from '@/lib/utils'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'options' | 'success'>('email')
  const [userMetadata, setUserMetadata] = useState<{
    email: string
    telefono?: string
  } | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidEmail(email)) {
      setError('Ingresa un email válido')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Simular obtención de metadata del usuario desde Supabase
      // En la implementación real, harías una consulta a la tabla de usuarios
      const mockUserData = {
        email: email,
        telefono: '300-123-4567' // Este vendría de user_metadata
      }
      
      setUserMetadata(mockUserData)
      setStep('options')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailReset = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await resetPasswordWithEmail(email)
      
      if (error) {
        throw new Error(error.message)
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar email de recuperación')
    } finally {
      setLoading(false)
    }
  }

  const handleSMSReset = async () => {
    setLoading(true)
    setError('')

    try {
      // Llamar a la API para enviar OTP por SMS
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          method: 'sms'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar SMS')
      }

      // Redirigir a verificación OTP
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&method=sms`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar SMS')
    } finally {
      setLoading(false)
    }
  }

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Recuperar Contraseña</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ingresa tu email para recuperar el acceso a tu cuenta
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico
          </label>
          <input
            type="email"
            id="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!email || loading}
          className="w-full btn-primary"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Verificando...</span>
            </div>
          ) : (
            'Continuar'
          )}
        </button>
      </form>
    </div>
  )

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Método de Recuperación</h2>
        <p className="mt-2 text-sm text-gray-600">
          Elige cómo quieres recibir las instrucciones para recuperar tu contraseña
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Opción Email */}
        <button
          onClick={handleEmailReset}
          disabled={loading}
          className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Por Correo Electrónico</p>
              <p className="text-sm text-gray-500">{userMetadata?.email}</p>
            </div>
          </div>
        </button>

        {/* Opción SMS */}
        {userMetadata?.telefono && (
          <button
            onClick={handleSMSReset}
            disabled={loading}
            className="w-full p-4 text-left border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Por SMS</p>
                <p className="text-sm text-gray-500">Código a {userMetadata.telefono}</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
          <span>Procesando...</span>
        </div>
      )}
    </div>
  )

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Email Enviado</h2>
        <p className="mt-2 text-sm text-gray-600">
          Hemos enviado un enlace de recuperación a tu correo electrónico.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Revisa tu bandeja de entrada y sigue las instrucciones.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>¿No ves el email?</strong> Revisa tu carpeta de spam o correos no deseados.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">COP</span>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="card p-8">
          {step === 'email' && renderEmailStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'success' && renderSuccessStep()}

          {/* Volver al login */}
          <div className="mt-6 text-center">
            <Link 
              href="/auth/login"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

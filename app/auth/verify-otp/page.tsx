"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import OTPInput from '@/components/OTPInput'

export default function VerifyOTPPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const methodParam = searchParams.get('method') as 'email' | 'sms'
    
    if (!emailParam) {
      router.push('/auth/reset-password')
      return
    }
    
    setEmail(emailParam)
    setMethod(methodParam || 'email')
  }, [searchParams, router])

  const handleOTPComplete = async (otp: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          code: otp,
          method
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Código OTP inválido')
      }

      // Si la verificación es exitosa, redirigir a cambio de contraseña
      router.push(`/auth/update-password?token=${data.token}&email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar código')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          method
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar código')
      }

      // Mostrar mensaje de éxito temporal
      setError('')
      alert('Código reenviado exitosamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar código')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">COP</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Verificar Código
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa el código de 6 dígitos que enviamos a tu{' '}
            {method === 'email' ? 'correo electrónico' : 'teléfono'}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {method === 'email' ? email : '***-***-' + email.slice(-4)}
          </p>
        </div>

        {/* Formulario OTP */}
        <div className="card p-8">
          <OTPInput
            length={6}
            onComplete={handleOTPComplete}
            loading={loading}
            error={error}
          />

          {/* Opciones adicionales */}
          <div className="mt-8 space-y-4">
            {/* Reenviar código */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                ¿No recibiste el código?
              </p>
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm text-primary-600 hover:text-primary-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </div>

            {/* Cambiar método */}
            <div className="text-center border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-2">
                ¿Prefieres otro método?
              </p>
              <Link
                href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                Cambiar método de verificación
              </Link>
            </div>
          </div>
        </div>

        {/* Volver */}
        <div className="text-center">
          <Link 
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>

        {/* Información de seguridad */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Por seguridad, el código expira en 10 minutos</p>
          <p>Si no solicitaste este código, ignora este mensaje</p>
        </div>
      </div>
    </div>
  )
}

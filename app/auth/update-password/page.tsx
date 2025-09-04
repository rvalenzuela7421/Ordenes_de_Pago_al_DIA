"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { validatePassword } from '@/lib/utils'

export default function UpdatePasswordPage() {
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRequired, setIsRequired] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const required = searchParams?.get('required') === 'true'
    setIsRequired(required)
  }, [searchParams])

  const validatePasswords = () => {
    const newErrors: Record<string, string> = {}

    // Usar validación estricta
    const passwordCheck = validatePassword(passwords.password)
    if (!passwordCheck.isValid) {
      newErrors.password = passwordCheck.errors[0] // Mostrar el primer error
    }

    if (passwords.password !== passwords.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswords()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.password
      })

      if (error) {
        throw new Error(error.message)
      }

      // Si era un cambio obligatorio, actualizar metadata
      if (isRequired) {
        await supabase.auth.updateUser({
          data: { must_change_password: false }
        })
      }

      // Mostrar mensaje de éxito y redirigir
      alert('Contraseña actualizada exitosamente')
      
      if (isRequired) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar contraseña'
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const passwordCheck = validatePassword(passwords.password)
    return passwordCheck.isValid && passwords.password === passwords.confirmPassword
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
            {isRequired ? 'Cambio Obligatorio' : 'Nueva Contraseña'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRequired 
              ? 'Debes cambiar tu contraseña temporal antes de continuar'
              : 'Ingresa tu nueva contraseña para completar la recuperación'
            }
          </p>
        </div>

        {/* Alerta para cambio obligatorio */}
        {isRequired && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Cambio de contraseña requerido
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Por seguridad, debes establecer una nueva contraseña permanente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {errors.general}
              </div>
            )}

            {/* Nueva contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                id="password"
                className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                value={passwords.password}
                onChange={(e) => setPasswords(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              
              {/* Indicador de fortaleza */}
              {passwords.password && (
                <div className="mt-2 space-y-2">
                  {(() => {
                    const validation = validatePassword(passwords.password)
                    return (
                      <>
                        {/* Barra de fortaleza */}
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                validation.strength === 'weak' ? 'bg-red-500 w-1/3' :
                                validation.strength === 'medium' ? 'bg-yellow-500 w-2/3' :
                                'bg-green-500 w-full'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            validation.strength === 'weak' ? 'text-red-600' :
                            validation.strength === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {validation.strength === 'weak' ? 'Débil' :
                             validation.strength === 'medium' ? 'Media' : 'Fuerte'}
                          </span>
                        </div>
                        
                        {/* Lista de criterios */}
                        <div className="space-y-1">
                          {[
                            { test: passwords.password.length >= 6 && passwords.password.length <= 12, text: '6-12 caracteres' },
                            { test: /[A-Z]/.test(passwords.password), text: 'Una mayúscula' },
                            { test: /[0-9]/.test(passwords.password), text: 'Un número' },
                            { test: /[!@#$%^&*(),.?":{}|<>]/.test(passwords.password), text: 'Un caracter especial' },
                            { test: !validation.errors.includes('No puede contener números secuenciales (ej: 123, 456)'), text: 'Sin números secuenciales' },
                          ].map((criterion, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs">
                              <div className={`w-3 h-3 rounded-full ${criterion.test ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={criterion.test ? 'text-green-600' : 'text-gray-500'}>
                                {criterion.text}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Errores específicos */}
                        {validation.errors.length > 0 && (
                          <div className="bg-red-50 border border-red-200 p-2 rounded text-xs">
                            <ul className="space-y-1 text-red-700">
                              {validation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                id="confirmPassword"
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repite tu contraseña"
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              
              {/* Indicador de coincidencia */}
              {passwords.confirmPassword && (
                <div className="mt-1">
                  {passwords.password === passwords.confirmPassword ? (
                    <p className="text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" 
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                              clipRule="evenodd" />
                      </svg>
                      Las contraseñas coinciden
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
                  )}
                </div>
              )}
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="w-full btn-primary"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Actualizando...</span>
                </div>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>
          </form>
        </div>

        {/* Enlaces */}
        {!isRequired && (
          <div className="text-center">
            <Link 
              href="/auth/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        )}

        {/* Información de seguridad */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Tu nueva contraseña debe ser única y segura</p>
          <p>No compartas tu contraseña con nadie</p>
        </div>
      </div>
    </div>
  )
}

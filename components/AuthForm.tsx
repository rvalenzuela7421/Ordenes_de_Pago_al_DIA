"use client"

import { useState } from 'react'
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/auth'
import { UserRole } from '@/lib/database.types'
import { isValidEmail, isValidPhone, validatePassword } from '@/lib/utils'

interface AuthFormProps {
  mode: 'login' | 'register'
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function AuthForm({ mode, onSuccess, onError }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    telefono: '',
    role: 'ConsultaCOP' as UserRole
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean
    errors: string[]
    strength: 'weak' | 'medium' | 'strong'
  } | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar email (obligatorio y formato)
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)'
    }

    if (mode === 'login') {
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria'
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
      }
    } else {
      // Validaciones para registro
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria'
      } else {
        // Validación estricta para registro
        const passwordCheck = validatePassword(formData.password)
        if (!passwordCheck.isValid) {
          newErrors.password = passwordCheck.errors[0] // Mostrar el primer error
        }
      }

      // Validar confirmación de contraseña
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmar contraseña es obligatorio'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden'
      }

      // Validar nombre completo
      if (!formData.nombre_completo.trim()) {
        newErrors.nombre_completo = 'El nombre completo es obligatorio'
      } else if (formData.nombre_completo.trim().length < 2) {
        newErrors.nombre_completo = 'El nombre debe tener al menos 2 caracteres'
      }

      // Validar teléfono
      if (!formData.telefono.trim()) {
        newErrors.telefono = 'El teléfono es obligatorio'
      } else if (!isValidPhone(formData.telefono)) {
        newErrors.telefono = 'Ingresa un número de teléfono válido (10 dígitos, ej: 3001234567)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Validación en tiempo real para email
  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }))
    
    // Limpiar mensajes cuando se empiece a escribir
    if (message) setMessage('')
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }))
    if (errors.email && value.length > 0) {
      setErrors(prev => ({ ...prev, email: '' }))
    }
  }

  // Validación en tiempo real para confirmación de contraseña
  const handleConfirmPasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, confirmPassword: value }))
    
    // Limpiar mensajes cuando se empiece a escribir
    if (message) setMessage('')
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }))
    
    // Validar coincidencia inmediatamente
    if (formData.password && value) {
      if (formData.password !== value) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }))
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }))
      }
    }
  }

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }))
    
    // Limpiar mensajes cuando se empiece a escribir
    if (message) setMessage('')
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }))
    
    // Validar en tiempo real solo en modo registro
    if (mode === 'register') {
      const validation = validatePassword(value)
      setPasswordValidation(validation)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      let result
      
      if (mode === 'login') {
        result = await signInWithEmail(formData.email, formData.password)
      } else {
        result = await signUpWithEmail(formData.email, formData.password, {
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono,
          role: formData.role
        })
      }

      if (result.error) {
        // Traducir errores comunes de Supabase al español
        const spanishError = translateError(result.error.message)
        throw new Error(spanishError)
      }

      // Manejar éxito según el modo
      if (mode === 'login') {
        // Detectar si el resultado viene de modo demo para login
        const isDemo = result.data?.user?.id?.startsWith('demo-user-login-') || 
                      result.data?.session?.access_token === 'demo-access-token'
        
        if (isDemo) {
          // Establecer sesión demo activa
          sessionStorage.setItem('demo_login_active', 'true')
          sessionStorage.setItem('demo_user_email', formData.email)
          
          setErrors({ general: '' })
          setMessage('🎭 ¡Login simulado exitoso! Redirigiendo al dashboard...')
          
          console.log('🎭 MODO DEMO: Sesión demo establecida, redirigiendo al dashboard')
          
          setTimeout(() => {
            setMessage('')
            onSuccess?.()
          }, 2000)
          return
        } else {
          // Modo producción - login real
          setMessage('¡Bienvenido! Redirigiendo al sistema...')
        }
        
      } else if (mode === 'register') {
        // Detectar si el resultado viene de modo demo para registro
        const isDemo = result.data?.user?.id?.startsWith('demo-user-')
        
        if (isDemo) {
          setErrors({ 
            general: '' 
          })
          // Mostrar mensaje de éxito temporal para modo demo
          setMessage('🎭 ¡Registro simulado exitoso! En modo demo, el usuario se crearía en la base de datos real.')
          setTimeout(() => {
            setMessage('')
            onSuccess?.()
          }, 3000)
          return
        } else {
          // Modo producción - mensaje permanente hasta que el usuario haga clic
          setMessage('¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.')
          
          // En modo producción para registro, no redirigir automáticamente
          // Para registro, el mensaje permanece hasta acción del usuario
          return
        }
      }

      // Solo llamar onSuccess para login, no para registro en producción
      if (mode === 'login') {
        onSuccess?.()
      }
    } catch (error) {
      let errorMessage = 'Error inesperado'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Si es un error de red, usar mensaje en español
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet o contacta al administrador.'
      }
      
      setErrors({ general: errorMessage })
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Función para traducir errores comunes al español
  const translateError = (error: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Invalid login credentials': 'Credenciales incorrectas o el usuario no existe. Verifica tu email y contraseña, o regístrate si aún no tienes cuenta.',
      'User not found': 'Usuario no encontrado. Verifica el email ingresado o regístrate si aún no tienes cuenta.',
      'Email not found': 'Email no encontrado en el sistema. Verifica el email ingresado o regístrate.',
      'Email not confirmed': 'Email no confirmado. Revisa tu bandeja de entrada para confirmar tu cuenta.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'User already registered': 'El usuario ya está registrado. Intenta iniciar sesión.',
      'Invalid email': 'El formato del email es inválido.',
      'Signup requires a valid password': 'El registro requiere una contraseña válida.',
      'Failed to fetch': 'Error de conexión. Verifica tu conexión a internet.',
      'Network request failed': 'Error de red. Verifica tu conexión a internet.',
      'Unable to validate email address: invalid format': 'Formato de email inválido.',
      'Password is too weak': 'La contraseña es muy débil. Debe cumplir los criterios de seguridad.',
      'Rate limit exceeded': 'Demasiados intentos. Espera un momento antes de intentar nuevamente.',
      'Email link is invalid or has expired': 'El enlace del email es inválido o ha expirado.',
      'Token has expired or is invalid': 'La sesión ha expirado. Inicia sesión nuevamente.',
    }

    for (const [englishError, spanishError] of Object.entries(errorTranslations)) {
      if (error.toLowerCase().includes(englishError.toLowerCase())) {
        return spanishError
      }
    }

    return error // Si no hay traducción, devolver el error original
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result.error) {
        const spanishError = translateError(result.error.message)
        throw new Error(spanishError)
      }

      // Si la respuesta indica modo demo (no hay URL de redirect), simular éxito
      if (result.data && !result.data.url) {
        alert('🎭 ¡Inicio de sesión con Google simulado! En modo demo, se autenticaría con Google.')
        return
      }
    } catch (error) {
      let errorMessage = 'Error al iniciar sesión con Google'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Traducir errores específicos de Google
      if (errorMessage.includes('popup_closed_by_user') || errorMessage.includes('popup closed')) {
        errorMessage = 'Inicio de sesión cancelado. Intenta nuevamente.'
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión con Google. Verifica tu conexión a internet.'
      }
      
      setErrors({ general: errorMessage })
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    if (mode === 'login') {
      return isValidEmail(formData.email.trim()) && formData.password.length >= 6
    }
    
    // Para registro, validar todos los campos obligatorios estrictamente
    const passwordCheck = validatePassword(formData.password)
    return (
      // Email válido
      isValidEmail(formData.email.trim()) &&
      // Contraseña válida según criterios estrictos
      passwordCheck.isValid &&
      // Contraseñas coinciden
      formData.password === formData.confirmPassword &&
      // Nombre completo válido (al menos 2 caracteres)
      formData.nombre_completo.trim().length >= 2 &&
      // Teléfono válido
      isValidPhone(formData.telefono) &&
      // Rol seleccionado (siempre tiene valor por defecto)
      formData.role.length > 0
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mensaje de éxito */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-green-800 text-sm font-medium mb-2">{message}</p>
                
                {/* Botones de acción para registro exitoso */}
                {mode === 'register' && !message.includes('🎭') && (
                  <div className="flex flex-col space-y-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage('')
                        onSuccess?.()
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Ir al Iniciar Sesión</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setMessage('')}
                      className="w-full bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cerrar mensaje</span>
                    </button>
                  </div>
                )}

                {/* Información adicional para registro */}
                {mode === 'register' && !message.includes('🎭') && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <div className="text-green-700 text-xs">
                        <p className="font-medium mb-1">¿Qué sigue?</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Revisa tu bandeja de entrada de correo</li>
                          <li>Confirma tu cuenta haciendo clic en el enlace</li>
                          <li>Luego podrás iniciar sesión normalmente</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 text-sm mb-2">{errors.general}</p>
                {/* Mensaje adicional de ayuda para errores de login */}
                {mode === 'login' && (errors.general.toLowerCase().includes('credenciales') || 
                  errors.general.toLowerCase().includes('usuario no') || 
                  errors.general.toLowerCase().includes('email no')) && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                    <div className="flex items-start space-x-1">
                      <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <div className="text-green-700 text-xs">
                        <p className="font-medium mb-1">¿Necesitas ayuda?</p>
                        <p>• Si no tienes cuenta, <a href="/auth/register" className="text-green-600 underline hover:text-green-800">regístrate aquí</a></p>
                        <p>• Si olvidaste tu contraseña, <a href="/auth/reset-password" className="text-green-600 underline hover:text-green-800">recupérala aquí</a></p>
                        <p>• Contacta al administrador si el problema persiste</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            className={`input-field ${errors.email ? 'border-red-500 bg-red-50' : formData.email && isValidEmail(formData.email) ? 'border-green-500 bg-green-50' : ''}`}
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          {formData.email && !errors.email && isValidEmail(formData.email) && (
            <p className="mt-1 text-sm text-green-600">✓ Correo electrónico válido</p>
          )}
        </div>

        {/* Contraseña */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            className={`input-field ${errors.password ? 'border-red-500 bg-red-50' : ''}`}
            value={formData.password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="••••••••"
            required
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          
          {/* Indicador de fortaleza y validaciones para registro */}
          {mode === 'register' && formData.password && passwordValidation && (
            <div className="mt-2 space-y-2">
              {/* Barra de fortaleza */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      passwordValidation.strength === 'weak' ? 'bg-red-500 w-1/3' :
                      passwordValidation.strength === 'medium' ? 'bg-yellow-500 w-2/3' :
                      'bg-green-500 w-full'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordValidation.strength === 'weak' ? 'text-red-600' :
                  passwordValidation.strength === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {passwordValidation.strength === 'weak' ? 'Débil' :
                   passwordValidation.strength === 'medium' ? 'Media' : 'Fuerte'}
                </span>
              </div>
              
              {/* Lista de criterios */}
              <div className="space-y-1">
                {[
                  { test: formData.password.length >= 6 && formData.password.length <= 12, text: '6-12 caracteres' },
                  { test: /[A-Z]/.test(formData.password), text: 'Una mayúscula' },
                  { test: /[0-9]/.test(formData.password), text: 'Un número' },
                  { test: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password), text: 'Un caracter especial' },
                  { test: !passwordValidation.errors.includes('No puede contener números secuenciales (ej: 123, 456)'), text: 'Sin números secuenciales' },
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
              {passwordValidation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-2 rounded text-xs">
                  <ul className="space-y-1 text-red-700">
                    {passwordValidation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Campos adicionales para registro */}
        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                className={`input-field ${
                  errors.confirmPassword ? 'border-red-500 bg-red-50' : 
                  formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-500 bg-green-50' : ''
                }`}
                value={formData.confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder="••••••••"
                required
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                <p className="mt-1 text-sm text-green-600">✓ Las contraseñas coinciden</p>
              )}
            </div>

            <div>
              <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre_completo"
                className={`input-field ${
                  errors.nombre_completo ? 'border-red-500 bg-red-50' : 
                  formData.nombre_completo.trim().length >= 2 ? 'border-green-500 bg-green-50' : ''
                }`}
                value={formData.nombre_completo}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))
                  // Limpiar error cuando empiece a escribir
                  if (errors.nombre_completo && e.target.value.trim().length > 0) {
                    setErrors(prev => ({ ...prev, nombre_completo: '' }))
                  }
                }}
                placeholder="Juan Pérez González"
                required
              />
              {errors.nombre_completo && <p className="mt-1 text-sm text-red-600">{errors.nombre_completo}</p>}
              {formData.nombre_completo.trim().length >= 2 && !errors.nombre_completo && (
                <p className="mt-1 text-sm text-green-600">✓ Nombre válido</p>
              )}
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="telefono"
                className={`input-field ${
                  errors.telefono ? 'border-red-500 bg-red-50' : 
                  formData.telefono && isValidPhone(formData.telefono) ? 'border-green-500 bg-green-50' : ''
                }`}
                value={formData.telefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '') // Solo números
                  setFormData(prev => ({ ...prev, telefono: value }))
                  // Limpiar error cuando empiece a escribir
                  if (errors.telefono && value.length > 0) {
                    setErrors(prev => ({ ...prev, telefono: '' }))
                  }
                }}
                placeholder="3001234567"
                maxLength={10}
                required
              />
              {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
              {formData.telefono && isValidPhone(formData.telefono) && !errors.telefono && (
                <p className="mt-1 text-sm text-green-600">✓ Teléfono válido</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Solo números, 10 dígitos (ej: 3001234567)</p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Perfil <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                className="input-field border-gray-300"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                required
              >
                <option value="ConsultaCOP">Consulta COP</option>
                <option value="OperacionCOP">Operación COP</option>
                <option value="OperacionBSEG">Operación BSEG</option>
                <option value="AdminCOP">Admin COP</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Selecciona tu rol en el sistema</p>
            </div>
          </>
        )}

        {/* Información de campos obligatorios */}
        {mode === 'register' && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Nota:</strong> Todos los campos marcados con <span className="text-red-500">*</span> son obligatorios.
                  El botón "Registrarse" se habilitará cuando todos los campos estén correctamente diligenciados.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de validación para login */}
        {mode === 'login' && !isFormValid() && (formData.email || formData.password) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <svg className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-green-700">
                <p className="font-medium mb-1">Para habilitar el botón de login:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {!isValidEmail(formData.email.trim()) && (
                    <li>✅ Email válido (ejemplo: usuario@dominio.com)</li>
                  )}
                  {formData.password.length < 6 && (
                    <li>✅ Contraseña de al menos 6 caracteres</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!isFormValid() || loading}
          className={`w-full btn-primary transition-all duration-200 ${
            !isFormValid() && !loading 
              ? 'opacity-50 cursor-not-allowed transform-none' 
              : 'hover:scale-[1.02] hover:shadow-lg'
          }`}
          title={
            mode === 'login' && !isFormValid() 
              ? 'Complete los campos requeridos para habilitar el login'
              : mode === 'register' && !isFormValid() 
                ? 'Complete todos los campos obligatorios para habilitar el registro'
                : ''
          }
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>
                {mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}
              </span>
            </div>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              {mode === 'login' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Iniciar Sesión</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Registrarse</span>
                </>
              )}
            </span>
          )}
        </button>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">o</span>
          </div>
        </div>

        {/* Botón de Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full btn-secondary flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continuar con Google</span>
        </button>
      </form>
    </div>
  )
}

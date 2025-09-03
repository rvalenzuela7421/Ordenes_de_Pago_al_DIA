"use client"

import { useState, useEffect } from 'react'
import { getCurrentUserProfile } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/database.types'
import { isValidPhone, validatePassword } from '@/lib/utils'

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const userProfile = await getCurrentUserProfile()
      
      if (userProfile) {
        setUser(userProfile)
        setFormData(prev => ({
          ...prev,
          nombre_completo: userProfile.nombre_completo || '',
          telefono: userProfile.telefono || ''
        }))
      }
    } catch (error) {
      console.error('Error cargando perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateInfoForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre completo es requerido'
    }

    if (formData.telefono && !isValidPhone(formData.telefono)) {
      newErrors.telefono = 'Ingresa un número de teléfono válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.current_password) {
      newErrors.current_password = 'La contraseña actual es requerida'
    }

    // Usar validación estricta para la nueva contraseña
    const passwordCheck = validatePassword(formData.new_password)
    if (!passwordCheck.isValid) {
      newErrors.new_password = passwordCheck.errors[0] // Mostrar el primer error
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateInfoForm()) return

    setSaving(true)
    setErrors({})
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      setMessage('Información actualizada exitosamente')
      await loadUserProfile() // Recargar datos
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar perfil'
      setErrors({ general: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) return

    setSaving(true)
    setErrors({})
    setMessage('')

    try {
      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: formData.current_password
      })

      if (signInError) {
        throw new Error('Contraseña actual incorrecta')
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({
        password: formData.new_password
      })

      if (error) {
        throw new Error(error.message)
      }

      setMessage('Contraseña actualizada exitosamente')
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar contraseña'
      setErrors({ general: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu información personal y configuración de seguridad
        </p>
      </div>

      {/* Mensajes */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {message}
        </div>
      )}

      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {errors.general}
        </div>
      )}

      <div className="card">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 pt-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Información Personal
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cambiar Contraseña
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-6">
          {activeTab === 'info' && (
            <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Email (read-only) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    El correo electrónico no se puede cambiar
                  </p>
                </div>

                {/* Nombre Completo */}
                <div className="sm:col-span-2">
                  <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="nombre_completo"
                    className={`input-field ${errors.nombre_completo ? 'border-red-500' : ''}`}
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))}
                    placeholder="Ingresa tu nombre completo"
                  />
                  {errors.nombre_completo && (
                    <p className="mt-1 text-sm text-red-600">{errors.nombre_completo}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    className={`input-field ${errors.telefono ? 'border-red-500' : ''}`}
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="3001234567"
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                  )}
                </div>

                {/* Rol (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil
                  </label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    El perfil es asignado por el administrador
                  </p>
                </div>
              </div>

              {/* Botón de guardar */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="max-w-md space-y-4">
                {/* Contraseña actual */}
                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    id="current_password"
                    className={`input-field ${errors.current_password ? 'border-red-500' : ''}`}
                    value={formData.current_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {errors.current_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
                  )}
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="new_password"
                    className={`input-field ${errors.new_password ? 'border-red-500' : ''}`}
                    value={formData.new_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {errors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
                  )}
                  
                  {/* Indicador de fortaleza */}
                  {formData.new_password && (
                    <div className="mt-2 space-y-2">
                      {(() => {
                        const validation = validatePassword(formData.new_password)
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
                                { test: formData.new_password.length >= 6 && formData.new_password.length <= 12, text: '6-12 caracteres' },
                                { test: /[A-Z]/.test(formData.new_password), text: 'Una mayúscula' },
                                { test: /[0-9]/.test(formData.new_password), text: 'Un número' },
                                { test: /[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password), text: 'Un caracter especial' },
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
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Confirmar nueva contraseña */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    className={`input-field ${errors.confirm_password ? 'border-red-500' : ''}`}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                  )}
                  
                  {/* Indicador de coincidencia */}
                  {formData.confirm_password && (
                    <div className="mt-1">
                      {formData.new_password === formData.confirm_password ? (
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
              </div>

              {/* Botón de cambiar contraseña */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !formData.current_password || !validatePassword(formData.new_password).isValid || formData.new_password !== formData.confirm_password}
                  className="btn-primary"
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Cambiando...</span>
                    </div>
                  ) : (
                    'Cambiar Contraseña'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/database.types'
import { isValidPhone, isValidEmail, validatePassword, getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
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
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

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
          email: userProfile.email || '',
          telefono: userProfile.telefono || ''
        }))
        setAvatarPreview(userProfile.avatar_url || null)
      }
    } catch (error) {
      console.error('Error cargando perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, avatar: 'Solo se permiten archivos JPG, PNG o WebP' })
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5242880) {
      setErrors({ ...errors, avatar: 'El archivo es demasiado grande. Máximo 5MB permitido' })
      return
    }

    // Crear preview
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Subir avatar
    uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true)
    setErrors({ ...errors, avatar: '' })

    try {
      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrors({ ...errors, avatar: 'Sesión no válida' })
        return
      }

      // Convertir archivo a base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        const fileData = base64Data.split(',')[1] // Remover el prefijo data:image/...;base64,

        try {
          const response = await fetch('/api/upload-avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              fileData,
              fileName: file.name,
              mimeType: file.type
            })
          })

          const result = await response.json()

          if (!response.ok) {
            setErrors({ ...errors, avatar: result.error || 'Error subiendo avatar' })
            return
          }

          // Actualizar usuario local
          if (user) {
            setUser({ ...user, avatar_url: result.avatar_url })
          }
          
          setMessage('Avatar actualizado exitosamente')
          
          // Disparar evento personalizado para actualizar el avatar en toda la app
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
            detail: { avatar_url: result.avatar_url } 
          }))
          
          // Limpiar mensaje después de 3 segundos
          setTimeout(() => setMessage(''), 3000)

        } catch (error) {
          console.error('Error subiendo avatar:', error)
          setErrors({ ...errors, avatar: 'Error de conexión al subir avatar' })
        }
      }
      reader.readAsDataURL(file)

    } catch (error) {
      console.error('Error en uploadAvatar:', error)
      setErrors({ ...errors, avatar: 'Error inesperado al subir avatar' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const removeAvatar = async () => {
    if (!user) return

    try {
      // Actualizar en la base de datos
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (error) {
        setErrors({ ...errors, avatar: 'Error eliminando avatar' })
        return
      }

      // Actualizar estado local
      setUser({ ...user, avatar_url: undefined })
      setAvatarPreview(null)
      setMessage('Avatar eliminado exitosamente')
      
      // Disparar evento personalizado para actualizar el avatar en toda la app
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
        detail: { avatar_url: null } 
      }))
      
      setTimeout(() => setMessage(''), 3000)

    } catch (error) {
      console.error('Error eliminando avatar:', error)
      setErrors({ ...errors, avatar: 'Error inesperado al eliminar avatar' })
    }
  }

  const validateInfoForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar email (obligatorio y formato) - igual que AuthForm
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)'
    }

    // Validar nombre completo - igual que AuthForm
    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre completo es obligatorio'
    } else if (formData.nombre_completo.trim().length < 2) {
      newErrors.nombre_completo = 'El nombre debe tener al menos 2 caracteres'
    }

    // Validar teléfono - igual que AuthForm (obligatorio)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    } else if (!isValidPhone(formData.telefono)) {
      newErrors.telefono = 'Ingresa un número de teléfono válido (10 dígitos, ej: 3001234567)'
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

  // Función para validar si el formulario está completo - igual que AuthForm
  const isInfoFormValid = () => {
    return (
      // Email válido
      isValidEmail(formData.email.trim()) &&
      // Nombre completo válido (al menos 2 caracteres)
      formData.nombre_completo.trim().length >= 2 &&
      // Teléfono válido
      isValidPhone(formData.telefono)
    )
  }

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateInfoForm()) return

    setSaving(true)
    setErrors({})
    setMessage('')

    try {
      // Actualizar email en auth
      const { error } = await supabase.auth.updateUser({
        email: formData.email,
        data: {
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      // También actualizar la tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre_completo: formData.nombre_completo,
          telefono: formData.telefono
        })
        .eq('id', user?.id)

      if (profileError) {
        throw new Error(profileError.message)
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
        {/* Avatar Section */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center space-x-6">
            {/* Avatar Display */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {avatarPreview || user?.avatar_url ? (
                  <img
                    src={avatarPreview || user?.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.nombre_completo ? getInitials(user.nombre_completo) : user?.email.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Avatar Controls */}
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Foto de perfil</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sube una imagen para personalizar tu perfil. Se permiten archivos JPG, PNG o WebP de hasta 5MB.
              </p>
              
              <div className="flex items-center space-x-3">
                {/* Upload Button */}
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                    className="sr-only"
                  />
                  <span className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${avatarUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {avatarUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Subir foto
                      </>
                    )}
                  </span>
                </label>

                {/* Remove Button */}
                {(avatarPreview || user?.avatar_url) && !avatarUploading && (
                  <button
                    onClick={removeAvatar}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                )}
              </div>

              {/* Avatar Error */}
              {errors.avatar && (
                <p className="mt-2 text-sm text-red-600">{errors.avatar}</p>
              )}
            </div>
          </div>
        </div>

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
            <>
              {/* Información de campos obligatorios */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Todos los campos marcados con <span className="text-red-500">*</span> son obligatorios.
                  El botón "Guardar Cambios" se habilitará cuando todos los campos estén correctamente diligenciados.
                </p>
              </div>

              <form onSubmit={handleInfoSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Email (editable) */}
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={`input-field ${
                      errors.email ? 'border-red-500 bg-red-50' : 
                      formData.email && isValidEmail(formData.email) ? 'border-green-500 bg-green-50' : ''
                    }`}
                    value={formData.email}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({ ...prev, email: value }))
                      // Limpiar error cuando empiece a escribir
                      if (errors.email && value.length > 0) {
                        setErrors(prev => ({ ...prev, email: '' }))
                      }
                    }}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  {formData.email && !errors.email && isValidEmail(formData.email) && (
                    <p className="mt-1 text-sm text-green-600">✓ Correo electrónico válido</p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div className="sm:col-span-2">
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
                      const value = e.target.value
                      setFormData(prev => ({ ...prev, nombre_completo: value }))
                      // Limpiar error cuando empiece a escribir
                      if (errors.nombre_completo && value.trim().length > 0) {
                        setErrors(prev => ({ ...prev, nombre_completo: '' }))
                      }
                    }}
                    placeholder="Juan Pérez González"
                  />
                  {errors.nombre_completo && <p className="mt-1 text-sm text-red-600">{errors.nombre_completo}</p>}
                  {formData.nombre_completo.trim().length >= 2 && !errors.nombre_completo && (
                    <p className="mt-1 text-sm text-green-600">✓ Nombre válido</p>
                  )}
                </div>

                {/* Teléfono / Celular */}
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono / Celular <span className="text-red-500">*</span>
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
                  />
                  {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
                  {formData.telefono && isValidPhone(formData.telefono) && !errors.telefono && (
                    <p className="mt-1 text-sm text-green-600">✓ Teléfono válido</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Solo números, 10 dígitos (ej: 3001234567)</p>
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

              {/* Botones de acción */}
              <div className="flex justify-end items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={saving || !isInfoFormValid()}
                  className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !isInfoFormValid() 
                      ? 'Complete todos los campos obligatorios para habilitar el guardado'
                      : ''
                  }
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
            </>
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

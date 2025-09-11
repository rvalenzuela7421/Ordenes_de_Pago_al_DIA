import { supabase } from './supabase'
import { UserRole, UserProfile } from './database.types'
import { isDemoMode } from './utils'

// Obtener el perfil del usuario actual
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  // Si estamos en modo demo, devolver usuario demo
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Obteniendo perfil de usuario demo...')
    
    // Verificar si hay un "login activo" simulado en sessionStorage
    const demoLogin = sessionStorage.getItem('demo_login_active')
    
    if (demoLogin) {
      const demoUser: UserProfile = {
        id: 'demo-user-current-session',
        email: 'usuario.demo@cop.com',
        role: 'OperacionTRIB',
        nombre_completo: 'Usuario Demo Tributaria',
        telefono: '3001234567',
        must_change_password: false,
        avatar_url: undefined
      }
      
      console.log('🎭 MODO DEMO: Usuario demo encontrado:', demoUser.email)
      return demoUser
    }
    
    console.log('🎭 MODO DEMO: No hay sesión demo activa')
    return null
  }

  // Modo producción: obtener usuario real de Supabase
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Obtener datos adicionales del perfil desde la tabla profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url, telefono, nombre_completo')
      .eq('id', user.id)
      .single()

    // Si hay error obteniendo el perfil, usar solo datos del user_metadata
    let avatarUrl: string | undefined
    let telefono: string | undefined
    let nombreCompleto: string | undefined

    if (!profileError && profileData) {
      avatarUrl = profileData.avatar_url || undefined
      telefono = profileData.telefono || user.user_metadata?.telefono
      nombreCompleto = profileData.nombre_completo || user.user_metadata?.nombre_completo
    } else {
      telefono = user.user_metadata?.telefono
      nombreCompleto = user.user_metadata?.nombre_completo
    }

    return {
      id: user.id,
      email: user.email || '',
      role: (user.user_metadata?.role as UserRole) || 'ConsultaCOP',
      telefono,
      nombre_completo: nombreCompleto,
      must_change_password: user.user_metadata?.must_change_password || false,
      avatar_url: avatarUrl
    }
  } catch (error) {
    console.error('Error al obtener perfil:', error)
    return null
  }
}

// Verificar si el usuario tiene un rol específico
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

// Verificar permisos por rol
export function checkPermissions(userRole: UserRole) {
  const permissions = {
    AdminCOP: {
      canViewAll: true,
      canApprove: true,
      canCreate: true,
      canEdit: true,
      canDelete: true
    },
    OperacionCOP: {
      canViewAll: true,
      canApprove: true,
      canCreate: true,
      canEdit: true,
      canDelete: false
    },
    ConsultaCOP: {
      canViewAll: true,
      canApprove: false,
      canCreate: false,
      canEdit: false,
      canDelete: false
    },
    OperacionTRIB: {
      canViewAll: false,
      canApprove: false,
      canCreate: true,
      canEdit: false,
      canDelete: false
    }
  }

  return permissions[userRole] || permissions.ConsultaCOP
}

// Validar credenciales para login
export async function signInWithEmail(email: string, password: string) {
  // Si estamos en modo demo, simular login exitoso
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Simulando login con email...', { email })
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simular usuario demo logueado
    return {
      data: {
        user: {
          id: 'demo-user-login-' + Date.now(),
          email: email,
          user_metadata: {
            nombre_completo: 'Usuario Demo',
            telefono: '3001234567',
            role: 'ConsultaCOP'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString()
        },
        session: {
          access_token: 'demo-access-token',
          refresh_token: 'demo-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'demo-user-login-' + Date.now(),
            email: email
          }
        }
      },
      error: null
    }
  }

  // Modo producción: login real con Supabase
  try {
    return await supabase.auth.signInWithPassword({ email, password })
  } catch (error) {
    console.error('Error en signInWithEmail:', error)
    return {
      data: { user: null, session: null },
      error: { message: 'Error de conexión con el servidor de autenticación' }
    }
  }
}

// Registrar nuevo usuario
export async function signUpWithEmail(
  email: string, 
  password: string, 
  metadata: {
    nombre_completo: string
    telefono: string
    role: UserRole
  }
) {
  // Si estamos en modo demo, simular respuesta exitosa
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Simulando registro de usuario...', { email, metadata })
    
    // Simular delay de red realista
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simular respuesta exitosa de Supabase
    return {
      data: {
        user: {
          id: 'demo-user-' + Date.now(),
          email: email,
          user_metadata: metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: null // En demo, el email no está confirmado
        },
        session: null // En demo no crear sesión real
      },
      error: null
    }
  }

  // Modo producción: llamada real a Supabase
  try {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  } catch (error) {
    console.error('Error en signUpWithEmail:', error)
    return {
      data: { user: null, session: null },
      error: { message: 'Error de conexión con el servidor de autenticación' }
    }
  }
}

// Login con Google
export async function signInWithGoogle() {
  // Si estamos en modo demo, simular respuesta
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Simulando login con Google...')
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      data: {
        user: null,
        session: null,
        url: null
      },
      error: null
    }
  }

  // Modo producción: OAuth real con Google
  try {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  } catch (error) {
    console.error('Error en signInWithGoogle:', error)
    return {
      data: { user: null, session: null, url: null },
      error: { message: 'Error de conexión con Google OAuth' }
    }
  }
}

// Cerrar sesión
export async function signOut() {
  // Si estamos en modo demo, limpiar sesión demo
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Cerrando sesión demo...')
    
    // Limpiar sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('demo_login_active')
      sessionStorage.removeItem('demo_user_email')
      localStorage.removeItem('demo_user')
    }
    
    return { error: null }
  }

  // Modo producción: cerrar sesión real
  return await supabase.auth.signOut()
}

// Restablecer contraseña por email
export async function resetPasswordWithEmail(email: string) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`
  })
}

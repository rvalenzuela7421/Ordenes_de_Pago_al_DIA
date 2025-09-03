import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utilidad para combinar clases CSS con Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generar código OTP de 6 dígitos
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generar contraseña temporal
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Formatear moneda en COP
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Formatear fecha
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validar contraseña con criterios estrictos
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const errors: string[] = []

  // 1. Longitud entre 6 y 12 caracteres
  if (password.length < 6 || password.length > 12) {
    errors.push('Debe tener entre 6 y 12 caracteres')
  }

  // 2. Al menos una letra mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula')
  }

  // 3. Al menos un número
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número')
  }

  // 4. Al menos un caracter especial
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Debe contener al menos un caracter especial (!@#$%^&*(),.?":{}|<>)')
  }

  // 5. No números secuenciales (3 o más seguidos)
  if (hasSequentialNumbers(password)) {
    errors.push('No puede contener números secuenciales (ej: 123, 456)')
  }

  // Calcular fortaleza
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
    !hasSequentialNumbers(password)
  ]

  const passedCriteria = criteria.filter(Boolean).length
  if (passedCriteria >= 5) strength = 'strong'
  else if (passedCriteria >= 3) strength = 'medium'

  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

// Detectar números secuenciales
function hasSequentialNumbers(password: string): boolean {
  const sequences = ['123', '234', '345', '456', '567', '678', '789', '890']
  return sequences.some(seq => password.includes(seq))
}

// Validar teléfono colombiano
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+57|57)?[0-9]{10}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Detectar si estamos en modo demo
export function isDemoMode(): boolean {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isDemo = url === 'https://demo.supabase.co' || url?.includes('demo.supabase.co') || false
    if (typeof window !== 'undefined') {
      console.log('🔍 isDemoMode check:', { url, isDemo })
    }
    return isDemo
  } catch (error) {
    console.warn('Error checking demo mode:', error)
    return true // Por defecto asumir demo si hay error
  }
}

// Obtener iniciales del nombre
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

// Reglas automáticas para aprobar órdenes de pago
export function evaluateAutoApprovalRules(monto: number, proveedor: string): {
  shouldAutoApprove: boolean
  reason: string
} {
  // Regla 1: Montos menores a $1,000,000 se aprueban automáticamente
  if (monto < 1000000) {
    return {
      shouldAutoApprove: true,
      reason: 'Monto menor a $1,000,000 COP - Aprobación automática'
    }
  }

  // Regla 2: Proveedores en lista blanca se aprueban hasta $5,000,000
  const whitelistedProviders = ['EMPRESA ABC', 'SERVICIOS XYZ', 'PROVEEDOR 123']
  if (whitelistedProviders.includes(proveedor.toUpperCase()) && monto < 5000000) {
    return {
      shouldAutoApprove: true,
      reason: 'Proveedor en lista blanca con monto menor a $5,000,000 COP'
    }
  }

  // Por defecto, requiere aprobación manual
  return {
    shouldAutoApprove: false,
    reason: 'Requiere aprobación manual por monto o proveedor'
  }
}

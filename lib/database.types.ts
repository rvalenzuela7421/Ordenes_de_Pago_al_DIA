export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ordenes_pago: {
        Row: {
          id: string
          numero_orden: string
          proveedor: string
          concepto: string
          monto: number
          estado: 'pendiente' | 'aprobada' | 'rechazada'
          fecha_creacion: string
          fecha_aprobacion?: string
          user_id: string
          metadata?: Json
        }
        Insert: {
          id?: string
          numero_orden: string
          proveedor: string
          concepto: string
          monto: number
          estado?: 'pendiente' | 'aprobada' | 'rechazada'
          fecha_creacion?: string
          fecha_aprobacion?: string
          user_id: string
          metadata?: Json
        }
        Update: {
          id?: string
          numero_orden?: string
          proveedor?: string
          concepto?: string
          monto?: number
          estado?: 'pendiente' | 'aprobada' | 'rechazada'
          fecha_creacion?: string
          fecha_aprobacion?: string
          user_id?: string
          metadata?: Json
        }
      }
      otp_codes: {
        Row: {
          id: string
          user_id: string
          code: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          created_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos de perfiles de usuario
export type UserRole = 'AdminCOP' | 'ConsultaCOP' | 'OperacionCOP' | 'OperacionTRIB'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  telefono?: string
  nombre_completo?: string
  must_change_password?: boolean
  avatar_url?: string
}

export interface OrdenPago {
  id: string
  numero_orden: string
  proveedor: string
  concepto: string
  monto: number
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  fecha_creacion: string
  fecha_aprobacion?: string
  user_id: string
  metadata?: Record<string, any>
}

export interface OTPCode {
  id: string
  user_id: string
  code: string
  created_at: string
  expires_at: string
}

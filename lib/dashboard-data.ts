import { supabase } from './supabase'

export interface OrdenPago {
  id: string
  fecha_solicitud: string
  numero_solicitud: string
  proveedor: string
  concepto: string
  monto_solicitud: number
  iva: number
  total_solicitud: number
  fecha_op?: string
  numero_op?: string
  estado: 'solicitada' | 'devuelta' | 'generada' | 'aprobada' | 'pagada'
}

export interface DashboardStats {
  totalOrdenes: number
  montoTotal: number
  estadisticas: {
    [key: string]: {
      cantidad: number
      monto: number
      porcentaje: number
    }
  }
}

export interface FilterState {
  dateRange: {
    from: string
    to: string
  }
  proveedores: string[]
  estados: string[]
}

// Función para obtener todas las órdenes con filtros
export async function getOrdenesPago(filters?: FilterState): Promise<OrdenPago[]> {
  try {
    let query = supabase
      .from('ordenes_pago')
      .select('*')
      .order('fecha_solicitud', { ascending: false })

    // Aplicar filtros si existen
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        query = query.gte('fecha_solicitud', `${filters.dateRange.from}T00:00:00`)
      }
      if (filters.dateRange.to) {
        query = query.lte('fecha_solicitud', `${filters.dateRange.to}T23:59:59`)
      }
      
      // Filtro por proveedores (selección múltiple)
      if (filters.proveedores.length > 0) {
        query = query.in('proveedor', filters.proveedores)
      }
      
      // Filtro por estados (selección múltiple)
      if (filters.estados.length > 0) {
        query = query.in('estado', filters.estados)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error obteniendo órdenes:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error en getOrdenesPago:', error)
    return []
  }
}

// Función para obtener estadísticas del dashboard
export async function getDashboardStats(filters?: FilterState): Promise<DashboardStats> {
  try {
    const ordenes = await getOrdenesPago(filters)
    
    const totalOrdenes = ordenes.length
    const montoTotal = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
    
    // Calcular estadísticas por estado
    const estadisticas: { [key: string]: { cantidad: number; monto: number; porcentaje: number } } = {}
    
    // Inicializar todos los estados posibles
    const estadosPosibles = ['solicitada', 'devuelta', 'generada', 'aprobada', 'pagada']
    
    estadosPosibles.forEach(estado => {
      estadisticas[estado] = {
        cantidad: 0,
        monto: 0,
        porcentaje: 0
      }
    })
    
    // Calcular estadísticas reales
    ordenes.forEach(orden => {
      const estado = orden.estado
      if (estadisticas[estado]) {
        estadisticas[estado].cantidad += 1
        estadisticas[estado].monto += orden.total_solicitud
      }
    })
    
    // Calcular porcentajes
    Object.keys(estadisticas).forEach(estado => {
      estadisticas[estado].porcentaje = totalOrdenes > 0 
        ? Math.round((estadisticas[estado].cantidad / totalOrdenes) * 100) 
        : 0
    })
    
    return {
      totalOrdenes,
      montoTotal,
      estadisticas
    }
  } catch (error) {
    console.error('Error en getDashboardStats:', error)
    return {
      totalOrdenes: 0,
      montoTotal: 0,
      estadisticas: {}
    }
  }
}

// Función para obtener proveedores únicos
export async function getProveedoresUnicos(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('ordenes_pago')
      .select('proveedor')
      .not('proveedor', 'is', null)

    if (error) {
      console.error('Error obteniendo proveedores:', error)
      return []
    }

    // Extraer nombres únicos y ordenar
    const proveedores = Array.from(new Set(data?.map((item: any) => item.proveedor).filter(Boolean)))
    return proveedores.sort() as string[]
  } catch (error) {
    console.error('Error en getProveedoresUnicos:', error)
    return []
  }
}

// Función para obtener estados únicos
export async function getEstadosUnicos(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('ordenes_pago')
      .select('estado')
      .not('estado', 'is', null)

    if (error) {
      console.error('Error obteniendo estados:', error)
      return ['solicitada', 'devuelta', 'generada', 'aprobada', 'pagada']
    }

    // Extraer estados únicos
    const estados = Array.from(new Set(data?.map((item: any) => item.estado).filter(Boolean)))
    return estados.sort() as string[]
  } catch (error) {
    console.error('Error en getEstadosUnicos:', error)
    return ['solicitada', 'devuelta', 'generada', 'aprobada', 'pagada']
  }
}

// Función para obtener órdenes recientes para la tabla
export async function getOrdenesRecientes(limit: number = 10, filters?: FilterState): Promise<OrdenPago[]> {
  try {
    const ordenes = await getOrdenesPago(filters)
    return ordenes.slice(0, limit)
  } catch (error) {
    console.error('Error en getOrdenesRecientes:', error)
    return []
  }
}

// Función para formatear moneda colombiana
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Función para formatear fecha en español (dd/mm/yyyy)
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Función para obtener el color del estado
export function getEstadoColor(estado: string): { bg: string; text: string; border: string } {
  const colores = {
    'solicitada': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200'
    },
    'devuelta': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200'
    },
    'generada': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200'
    },
    'aprobada': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200'
    },
    'pagada': {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200'
    }
  }
  
  return colores[estado as keyof typeof colores] || colores['solicitada']
}

// Función para obtener el nombre legible del estado
export function getEstadoLabel(estado: string): string {
  const labels = {
    'solicitada': 'Solicitada',
    'devuelta': 'Devuelta',
    'generada': 'Generada',
    'aprobada': 'Aprobada',
    'pagada': 'Pagada'
  }
  
  return labels[estado as keyof typeof labels] || estado
}

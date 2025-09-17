import { supabase } from './supabase'

export interface OrdenPago {
  id: string
  fecha_solicitud: string
  numero_solicitud: string
  fecha_cuenta_cobro?: string
  compania_receptora: string
  proveedor: string
  concepto: string
  descripcion?: string
  monto_solicitud: number
  iva: number
  total_solicitud: number
  ind_distribuciones: 'S' | 'N'
  fecha_op?: string
  numero_op?: string
  fecha_aprobada?: string
  fecha_pago?: string
  archivo_pdf_url?: string
  archivo_xlsx_url?: string
  estado: 'Solicitada' | 'Devuelta' | 'Generada' | 'Aprobada' | 'Pagada'
}

export interface DashboardStats {
  totalOrdenes: number
  montoTotal: number
  montoBase: number
  totalIva: number
  estadisticas: {
    [key: string]: {
      cantidad: number
      monto: number
      montoBase: number
      iva: number
      porcentaje: number
    }
  }
}

type DateFilterType = 'fecha_solicitud' | 'fecha_op' | 'fecha_aprobada' | 'fecha_pago'

export interface FilterState {
  dateRange: {
    from: string
    to: string
    tipo: DateFilterType
  }
  proveedores: string[]
  estados: string[]
  companiasReceptoras: string[]
  conceptos: string[]
  montoRange: {
    min: number | null
    max: number | null
  }
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
      // Filtro por rango de fechas - AJUSTADO PARA COLOMBIA (UTC-5)
      // Usar el tipo de fecha seleccionado dinámicamente
      const campoFecha = filters.dateRange.tipo || 'fecha_solicitud'
      console.log(`🔍 Filtrado por campo de fecha: ${campoFecha}`)
      
      if (filters.dateRange.from) {
        // Crear fecha en zona horaria de Colombia
        const fechaInicio = new Date(filters.dateRange.from + 'T00:00:00-05:00')
        const fechaDesde = fechaInicio.toISOString()
        console.log(`📅 Fecha DESDE: ${filters.dateRange.from} (${fechaDesde})`)
        query = query.gte(campoFecha, fechaDesde)
      }
      if (filters.dateRange.to) {
        // Crear fecha en zona horaria de Colombia (fin del día)
        const fechaFin = new Date(filters.dateRange.to + 'T23:59:59-05:00')
        const fechaHasta = fechaFin.toISOString()
        console.log(`📅 Fecha HASTA: ${filters.dateRange.to} (${fechaHasta})`)
        query = query.lte(campoFecha, fechaHasta)
      }
      
      // Filtro por proveedores (selección múltiple)
      if (filters.proveedores.length > 0) {
        query = query.in('proveedor', filters.proveedores)
      }
      
      // Filtro por estados (selección múltiple)
      if (filters.estados.length > 0) {
        query = query.in('estado', filters.estados)
      }
      
      // Filtro por compañías receptoras (selección múltiple)
      if (filters.companiasReceptoras && filters.companiasReceptoras.length > 0) {
        query = query.in('compania_receptora', filters.companiasReceptoras)
      }
      
      // Filtro por conceptos (selección múltiple)
      if (filters.conceptos && filters.conceptos.length > 0) {
        query = query.in('concepto', filters.conceptos)
      }
      
      // Filtro por rango de montos
      if (filters.montoRange) {
        if (filters.montoRange.min !== null) {
          query = query.gte('monto_solicitud', filters.montoRange.min)
        }
        if (filters.montoRange.max !== null) {
          query = query.lte('monto_solicitud', filters.montoRange.max)
        }
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
    const montoBase = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
    const totalIva = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
    
    // Calcular estadísticas por estado
    const estadisticas: { [key: string]: { cantidad: number; monto: number; montoBase: number; iva: number; porcentaje: number } } = {}
    
    // Inicializar todos los estados posibles
    const estadosPosibles = ['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
    
    estadosPosibles.forEach(estado => {
      estadisticas[estado] = {
        cantidad: 0,
        monto: 0,
        montoBase: 0,
        iva: 0,
        porcentaje: 0
      }
    })
    
    // Calcular estadísticas reales
    ordenes.forEach(orden => {
      const estado = orden.estado
      if (estadisticas[estado]) {
        estadisticas[estado].cantidad += 1
        estadisticas[estado].monto += orden.total_solicitud
        estadisticas[estado].montoBase += orden.monto_solicitud
        estadisticas[estado].iva += orden.iva
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
      montoBase,
      totalIva,
      estadisticas
    }
  } catch (error) {
    console.error('Error en getDashboardStats:', error)
    return {
      totalOrdenes: 0,
      montoTotal: 0,
      montoBase: 0,
      totalIva: 0,
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
      return ['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
    }

    // Extraer estados únicos
    const estados = Array.from(new Set(data?.map((item: any) => item.estado).filter(Boolean)))
    return estados.sort() as string[]
  } catch (error) {
    console.error('Error en getEstadosUnicos:', error)
    return ['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
  }
}

// Función para obtener órdenes recientes para la tabla
export async function getOrdenesRecientes(limit?: number, filters?: FilterState): Promise<OrdenPago[]> {
  try {
    const ordenes = await getOrdenesPago(filters)
    // Si no se especifica límite o es 0, devolver todas las órdenes
    if (!limit || limit === 0) {
      return ordenes
    }
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
    'Solicitada': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200'
    },
    'Devuelta': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200'
    },
    'Generada': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200'
    },
    'Aprobada': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200'
    },
    'Pagada': {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200'
    }
  }
  
  return colores[estado as keyof typeof colores] || colores['Solicitada']
}

// Función para obtener el nombre legible del estado
export function getEstadoLabel(estado: string): string {
  const labels = {
    'Solicitada': 'Solicitada',
    'Devuelta': 'Devuelta',
    'Generada': 'Generada',
    'Aprobada': 'Aprobada',
    'Pagada': 'Pagada'
  }
  
  return labels[estado as keyof typeof labels] || estado
}

// FUNCIONES PARA REPORTES

// Interfaz para reporte por estados
export interface ReporteEstados {
  estados: {
    estado: string
    cantidad: number
    monto: number
    iva: number
    montoBase: number
    porcentaje: number
    ordenes: OrdenPago[]
  }[]
  totales: {
    totalOrdenes: number
    montoTotal: number
    totalIva: number
    totalBase: number
  }
}

// Interfaz para reporte por proveedores
export interface ReporteProveedores {
  proveedores: {
    proveedor: string
    cantidad: number
    monto: number
    porcentaje: number
    ordenes: OrdenPago[]
    estados: { [key: string]: number }
  }[]
  totales: {
    totalProveedores: number
    totalOrdenes: number
    montoTotal: number
  }
}

// Interfaz para reporte financiero
export interface ReporteFinanciero {
  resumenGeneral: {
    totalOrdenes: number
    montoBase: number
    totalIva: number
    montoTotal: number
    promedioOrden: number
  }
  porEstado: {
    [key: string]: {
      cantidad: number
      montoBase: number
      iva: number
      total: number
    }
  }
  distribucionIva: {
    sinIva: { cantidad: number, monto: number }
    con19: { cantidad: number, monto: number }
    con5: { cantidad: number, monto: number }
    con0: { cantidad: number, monto: number }
  }
  tendenciaMensual: {
    mes: string
    cantidad: number
    monto: number
  }[]
}

// Interfaz para reporte de eficiencia
export interface ReporteEficiencia {
  tiemposPromedio: {
    solicitudAGenerada: number
    generadaAAprobada: number
    aprobadaAPagada: number
    totalProceso: number
  }
  eficienciaPorEstado: {
    [key: string]: {
      cantidadProcesadas: number
      tiempoPromedio: number
      masRapida: number
      masLenta: number
    }
  }
  ordenesAtrasadas: OrdenPago[]
  alertas: string[]
}

// Función para generar reporte por estados
export async function getReporteEstados(filters?: FilterState): Promise<ReporteEstados> {
  try {
    const ordenes = await getOrdenesPago(filters)
    const stats = await getDashboardStats(filters)
    
    // Calcular totales generales
    const totalIva = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
    const totalBase = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
    
    // Orden lógico de los estados según el flujo del proceso
    const ordenEstados = ['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
    
    const estados = ordenEstados.map(estado => {
      const data = stats.estadisticas[estado]
      if (!data || data.cantidad === 0) return null
      
      const ordenesEstado = ordenes.filter(orden => orden.estado === estado)
      const ivaEstado = ordenesEstado.reduce((sum, orden) => sum + orden.iva, 0)
      const montoBaseEstado = ordenesEstado.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
      
      return {
        estado,
        cantidad: data.cantidad,
        monto: data.monto,
        iva: ivaEstado,
        montoBase: montoBaseEstado,
        porcentaje: data.porcentaje,
        ordenes: ordenesEstado
      }
    }).filter(item => item !== null)
    
    return {
      estados,
      totales: {
        totalOrdenes: stats.totalOrdenes,
        montoTotal: stats.montoTotal,
        totalIva,
        totalBase
      }
    }
  } catch (error) {
    console.error('Error generando reporte por estados:', error)
    return {
      estados: [],
      totales: { 
        totalOrdenes: 0, 
        montoTotal: 0,
        totalIva: 0,
        totalBase: 0
      }
    }
  }
}

// Función para generar reporte por proveedores
export async function getReporteProveedores(filters?: FilterState): Promise<ReporteProveedores> {
  try {
    const ordenes = await getOrdenesPago(filters)
    
    // Agrupar por proveedor
    const proveedoresMap: { [key: string]: OrdenPago[] } = {}
    ordenes.forEach(orden => {
      if (!proveedoresMap[orden.proveedor]) {
        proveedoresMap[orden.proveedor] = []
      }
      proveedoresMap[orden.proveedor].push(orden)
    })
    
    const totalOrdenes = ordenes.length
    const montoTotal = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
    
    const proveedores = Object.entries(proveedoresMap).map(([proveedor, ordenesProveedor]) => {
      const cantidad = ordenesProveedor.length
      const monto = ordenesProveedor.reduce((sum, orden) => sum + orden.total_solicitud, 0)
      const porcentaje = totalOrdenes > 0 ? Math.round((cantidad / totalOrdenes) * 100) : 0
      
      // Contar por estados
      const estados: { [key: string]: number } = {}
      ordenesProveedor.forEach(orden => {
        estados[orden.estado] = (estados[orden.estado] || 0) + 1
      })
      
      return {
        proveedor,
        cantidad,
        monto,
        porcentaje,
        ordenes: ordenesProveedor,
        estados
      }
    }).sort((a, b) => b.monto - a.monto) // Ordenar por monto descendente
    
    return {
      proveedores,
      totales: {
        totalProveedores: proveedores.length,
        totalOrdenes,
        montoTotal
      }
    }
  } catch (error) {
    console.error('Error generando reporte por proveedores:', error)
    return {
      proveedores: [],
      totales: { totalProveedores: 0, totalOrdenes: 0, montoTotal: 0 }
    }
  }
}

// Función para generar reporte financiero
export async function getReporteFinanciero(filters?: FilterState): Promise<ReporteFinanciero> {
  try {
    const ordenes = await getOrdenesPago(filters)
    
    const totalOrdenes = ordenes.length
    const montoBase = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
    const totalIva = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
    const montoTotal = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
    const promedioOrden = totalOrdenes > 0 ? montoTotal / totalOrdenes : 0
    
    // Agrupación por estado
    const porEstado: { [key: string]: any } = {}
    ordenes.forEach(orden => {
      if (!porEstado[orden.estado]) {
        porEstado[orden.estado] = {
          cantidad: 0,
          montoBase: 0,
          iva: 0,
          total: 0
        }
      }
      porEstado[orden.estado].cantidad += 1
      porEstado[orden.estado].montoBase += orden.monto_solicitud
      porEstado[orden.estado].iva += orden.iva
      porEstado[orden.estado].total += orden.total_solicitud
    })
    
    // Distribución de IVA
    const distribucionIva = {
      sinIva: { cantidad: 0, monto: 0 },
      con19: { cantidad: 0, monto: 0 },
      con5: { cantidad: 0, monto: 0 },
      con0: { cantidad: 0, monto: 0 }
    }
    
    ordenes.forEach(orden => {
      if (orden.iva === 0) {
        distribucionIva.sinIva.cantidad += 1
        distribucionIva.sinIva.monto += orden.total_solicitud
      } else {
        const porcentajeIva = Math.round((orden.iva / orden.monto_solicitud) * 100)
        if (porcentajeIva === 19) {
          distribucionIva.con19.cantidad += 1
          distribucionIva.con19.monto += orden.total_solicitud
        } else if (porcentajeIva === 5) {
          distribucionIva.con5.cantidad += 1
          distribucionIva.con5.monto += orden.total_solicitud
        } else {
          distribucionIva.con0.cantidad += 1
          distribucionIva.con0.monto += orden.total_solicitud
        }
      }
    })
    
    // Tendencia mensual
    const tendenciaMap: { [key: string]: { cantidad: number, monto: number } } = {}
    ordenes.forEach(orden => {
      const fecha = new Date(orden.fecha_solicitud)
      const mes = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (!tendenciaMap[mes]) {
        tendenciaMap[mes] = { cantidad: 0, monto: 0 }
      }
      tendenciaMap[mes].cantidad += 1
      tendenciaMap[mes].monto += orden.total_solicitud
    })
    
    const tendenciaMensual = Object.entries(tendenciaMap)
      .map(([mes, data]) => ({ mes, ...data }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
    
    return {
      resumenGeneral: {
        totalOrdenes,
        montoBase,
        totalIva,
        montoTotal,
        promedioOrden
      },
      porEstado,
      distribucionIva,
      tendenciaMensual
    }
  } catch (error) {
    console.error('Error generando reporte financiero:', error)
    return {
      resumenGeneral: {
        totalOrdenes: 0,
        montoBase: 0,
        totalIva: 0,
        montoTotal: 0,
        promedioOrden: 0
      },
      porEstado: {},
      distribucionIva: {
        sinIva: { cantidad: 0, monto: 0 },
        con19: { cantidad: 0, monto: 0 },
        con5: { cantidad: 0, monto: 0 },
        con0: { cantidad: 0, monto: 0 }
      },
      tendenciaMensual: []
    }
  }
}

// Función para generar reporte de eficiencia
export async function getReporteEficiencia(filters?: FilterState): Promise<ReporteEficiencia> {
  try {
    const ordenes = await getOrdenesPago(filters)
    
    // Calcular tiempos promedio
    const tiemposPromedio = {
      solicitudAGenerada: 0,
      generadaAAprobada: 0,
      aprobadaAPagada: 0,
      totalProceso: 0
    }
    
    const eficienciaPorEstado: { [key: string]: any } = {}
    const ordenesAtrasadas: OrdenPago[] = []
    const alertas: string[] = []
    
    // Procesamiento básico de tiempos
    let contadorGeneradas = 0
    let contadorAprobadas = 0
    let contadorPagadas = 0
    
    // Agrupar por estado para eficiencia
    const estadosContadores: { [key: string]: { cantidad: number, tiempos: number[] } } = {}
    
    ordenes.forEach(orden => {
      const fechaSolicitud = new Date(orden.fecha_solicitud)
      const ahora = new Date()
      
      // Calcular días desde solicitud
      const diasDesdeSolicitud = Math.floor((ahora.getTime() - fechaSolicitud.getTime()) / (1000 * 60 * 60 * 24))
      
      // Identificar órdenes atrasadas (más de 30 días en estado no final)
      if (['Solicitada', 'Devuelta', 'Generada'].includes(orden.estado) && diasDesdeSolicitud > 30) {
        ordenesAtrasadas.push(orden)
      }
      
      // Contar por estado
      if (!estadosContadores[orden.estado]) {
        estadosContadores[orden.estado] = { cantidad: 0, tiempos: [] }
      }
      estadosContadores[orden.estado].cantidad += 1
      estadosContadores[orden.estado].tiempos.push(diasDesdeSolicitud)
      
      // Calcular tiempos entre estados
      if (orden.fecha_op && orden.estado !== 'Solicitada') {
        const fechaGenerada = new Date(orden.fecha_op)
        const tiempoGeneracion = Math.floor((fechaGenerada.getTime() - fechaSolicitud.getTime()) / (1000 * 60 * 60 * 24))
        tiemposPromedio.solicitudAGenerada += tiempoGeneracion
        contadorGeneradas++
      }
      
      if (orden.fecha_aprobada && orden.estado !== 'Solicitada' && orden.estado !== 'Generada') {
        const fechaAprobada = new Date(orden.fecha_aprobada)
        if (orden.fecha_op) {
          const fechaGenerada = new Date(orden.fecha_op)
          const tiempoAprobacion = Math.floor((fechaAprobada.getTime() - fechaGenerada.getTime()) / (1000 * 60 * 60 * 24))
          tiemposPromedio.generadaAAprobada += tiempoAprobacion
          contadorAprobadas++
        }
      }
      
      if (orden.fecha_pago && orden.estado === 'Pagada') {
        const fechaPago = new Date(orden.fecha_pago)
        if (orden.fecha_aprobada) {
          const fechaAprobada = new Date(orden.fecha_aprobada)
          const tiempoPago = Math.floor((fechaPago.getTime() - fechaAprobada.getTime()) / (1000 * 60 * 60 * 24))
          tiemposPromedio.aprobadaAPagada += tiempoPago
          contadorPagadas++
        }
        
        // Tiempo total del proceso
        const tiempoTotal = Math.floor((fechaPago.getTime() - fechaSolicitud.getTime()) / (1000 * 60 * 60 * 24))
        tiemposPromedio.totalProceso += tiempoTotal
      }
    })
    
    // Calcular promedios
    if (contadorGeneradas > 0) tiemposPromedio.solicitudAGenerada = Math.round(tiemposPromedio.solicitudAGenerada / contadorGeneradas)
    if (contadorAprobadas > 0) tiemposPromedio.generadaAAprobada = Math.round(tiemposPromedio.generadaAAprobada / contadorAprobadas)
    if (contadorPagadas > 0) {
      tiemposPromedio.aprobadaAPagada = Math.round(tiemposPromedio.aprobadaAPagada / contadorPagadas)
      tiemposPromedio.totalProceso = Math.round(tiemposPromedio.totalProceso / contadorPagadas)
    }
    
    // Procesar eficiencia por estado
    Object.keys(estadosContadores).forEach(estado => {
      const datos = estadosContadores[estado]
      const tiempos = datos.tiempos.filter(t => t > 0)
      eficienciaPorEstado[estado] = {
        cantidadProcesadas: datos.cantidad,
        tiempoPromedio: tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0,
        masRapida: tiempos.length > 0 ? Math.min(...tiempos) : 0,
        masLenta: tiempos.length > 0 ? Math.max(...tiempos) : 0
      }
    })
    
    // Generar alertas
    if (ordenesAtrasadas.length > 0) {
      alertas.push(`${ordenesAtrasadas.length} órdenes llevan más de 30 días sin completarse`)
    }
    
    const ordenesDevueltas = ordenes.filter(orden => orden.estado === 'Devuelta').length
    if (ordenesDevueltas > 0) {
      const porcentajeDevueltas = Math.round((ordenesDevueltas / ordenes.length) * 100)
      if (porcentajeDevueltas > 10) {
        alertas.push(`Alto porcentaje de órdenes devueltas: ${porcentajeDevueltas}%`)
      }
    }
    
    // Calcular estadísticas básicas
    const totalOrdenes = ordenes.length
    const montoTotal = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
    const totalIva = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
    const montoBase = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
    
    return {
      tiemposPromedio,
      eficienciaPorEstado,
      ordenesAtrasadas,
      alertas,
      totalOrdenes,
      montoTotal,
      totalIva,
      montoBase
    }
  } catch (error) {
    console.error('Error generando reporte de eficiencia:', error)
    return {
      tiemposPromedio: {
        solicitudAGenerada: 0,
        generadaAAprobada: 0,
        aprobadaAPagada: 0,
        totalProceso: 0
      },
      eficienciaPorEstado: {},
      ordenesAtrasadas: [],
      alertas: [],
      totalOrdenes: 0,
      montoTotal: 0,
      totalIva: 0,
      montoBase: 0
    }
  }
}

// Función para obtener el rango de fechas de la tabla ordenes_pago
export async function getRangoFechasOrdenes(): Promise<{
  fechaMasAntigua: string | null
  fechaMasActual: string | null
  totalRegistros: number
}> {
  try {
    // Obtener fecha más antigua
    const { data: fechaMinima, error: errorMin } = await supabase
      .from('ordenes_pago')
      .select('fecha_solicitud')
      .order('fecha_solicitud', { ascending: true })
      .limit(1)

    // Obtener fecha más actual
    const { data: fechaMaxima, error: errorMax } = await supabase
      .from('ordenes_pago')
      .select('fecha_solicitud')
      .order('fecha_solicitud', { ascending: false })
      .limit(1)

    // Obtener total de registros
    const { count, error: errorCount } = await supabase
      .from('ordenes_pago')
      .select('*', { count: 'exact', head: true })

    if (errorMin || errorMax || errorCount) {
      console.error('Error obteniendo rango de fechas:', errorMin || errorMax || errorCount)
      return {
        fechaMasAntigua: null,
        fechaMasActual: null,
        totalRegistros: 0
      }
    }

    return {
      fechaMasAntigua: fechaMinima && fechaMinima.length > 0 ? fechaMinima[0].fecha_solicitud : null,
      fechaMasActual: fechaMaxima && fechaMaxima.length > 0 ? fechaMaxima[0].fecha_solicitud : null,
      totalRegistros: count || 0
    }
  } catch (error) {
    console.error('Error obteniendo rango de fechas:', error)
    return {
      fechaMasAntigua: null,
      fechaMasActual: null,
      totalRegistros: 0
    }
  }
}

// Función para exportar datos a CSV
export function exportToCSV(ordenes: OrdenPago[], filename: string = 'ordenes_pago.csv') {
  const headers = [
    'ID',
    'Fecha Solicitud',
    'Número Solicitud',
    'Proveedor',
    'Concepto',
    'Descripción',
    'Monto Solicitud',
    'IVA',
    'Total Solicitud',
    'Distribuciones',
    'Fecha OP',
    'Número OP',
    'Fecha Aprobada',
    'Fecha Pago',
    'Estado'
  ]
  
  const csvContent = [
    headers.join(','),
    ...ordenes.map(orden => [
      orden.id,
      formatDate(orden.fecha_solicitud),
      orden.numero_solicitud,
      `"${orden.proveedor}"`,
      `"${orden.concepto}"`,
      `"${orden.descripcion || ''}"`,
      orden.monto_solicitud,
      orden.iva,
      orden.total_solicitud,
      orden.ind_distribuciones,
      orden.fecha_op ? formatDate(orden.fecha_op) : '',
      orden.numero_op || '',
      orden.fecha_aprobada ? formatDate(orden.fecha_aprobada) : '',
      orden.fecha_pago ? formatDate(orden.fecha_pago) : '',
      orden.estado
    ].join(','))
  ].join('\n')
  
  // Crear y descargar archivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

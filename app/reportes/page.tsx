'use client'

import { useState, useEffect } from 'react'
import { 
  getOrdenesPago, 
  getReporteEstados, 
  getReporteProveedores, 
  getReporteFinanciero, 
  getReporteEficiencia,
  exportToCSV,
  formatDate, 
  formatCurrency, 
  getEstadoColor,
  getRangoFechasOrdenes 
} from '@/lib/dashboard-data'
import type { 
  OrdenPago, 
  FilterState,
  ReporteEstados, 
  ReporteProveedores, 
  ReporteFinanciero, 
  ReporteEficiencia 
} from '@/lib/dashboard-data'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type TipoReporte = 'estados' | 'periodos' | 'proveedores' | 'financiero' | 'eficiencia' | null

// Colores para las gráficas
const COLORES_ESTADOS = {
  'Solicitada': '#3B82F6',   // azul
  'Devuelta': '#EF4444',     // rojo
  'Generada': '#F59E0B',     // amarillo
  'Aprobada': '#10B981',     // verde
  'Pagada': '#059669'        // verde esmeralda
}

const COLORES_GRAFICAS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function ReportesPage() {
  const [loading, setLoading] = useState(false)
  const [reporteActivo, setReporteActivo] = useState<TipoReporte>(null)
  const [datosReporte, setDatosReporte] = useState<any>(null)
  const [filtros, setFiltros] = useState<FilterState>({
    dateRange: { from: '', to: '' },
    proveedores: [],
    estados: []
  })
  
  // Modal states
  const [modalAbierto, setModalAbierto] = useState(false)

  // Función utilitaria para formatear fechas correctamente (evitando problema de timezone)
  const formatearFechaUtil = (fechaISO: string | null) => {
    if (!fechaISO || fechaISO === 'null' || fechaISO === 'undefined') {
      return 'Sin fecha'
    }
    
    try {
      let fecha: Date
      const fechaStr = String(fechaISO).trim()
      
      // Manejo robusto de diferentes formatos de fecha
      if (fechaStr.includes('T')) {
        // Formato completo con tiempo: "2022-12-31T00:00:00.000Z" 
        fecha = new Date(fechaStr)
      } else if (fechaStr.includes(' ')) {
        // Formato con espacio: "2022-12-31 00:00:00"
        fecha = new Date(fechaStr)
      } else if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Solo fecha ISO: "2022-12-31"
        fecha = new Date(fechaStr + 'T12:00:00.000Z')
      } else {
        // Intento crear fecha directamente
        fecha = new Date(fechaStr)
      }
      
      // Validar que la fecha es válida
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida'
      }
      
      return fecha.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      
    } catch (error) {
      return 'Error de fecha'
    }
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setReporteActivo(null)
    setDatosReporte(null)
  }

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      dateRange: { from: '', to: '' },
      proveedores: [],
      estados: []
    })
  }

  // Función para formatear números en las gráficas
  const formatearNumero = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(value)
  }

  // Tooltip personalizado para las gráficas
  const TooltipPersonalizado = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name.includes('Monto') || entry.name.includes('Total') ? 
                formatCurrency(entry.value) : entry.value}
              {entry.name === 'Porcentaje' && '%'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Tooltip específico para reporte de períodos y proveedores
  const TooltipPeriodos = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      // Usar proveedorCompleto si está disponible, si no usar label
      const titulo = data.proveedorCompleto || label
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{titulo}</p>
          <div className="space-y-1">
            <div className="text-sm flex">
              <span className="font-medium text-blue-600 w-44">Cantidad</span>
              <span className="font-medium text-blue-600">:</span>
              <span className="text-right ml-2 flex-1">{data.Cantidad} órdenes</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-green-600 w-44">Monto Solicitado</span>
              <span className="font-medium text-green-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data['Monto Base'] || 0)}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-orange-600 w-44">IVA</span>
              <span className="font-medium text-orange-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data['IVA'] || 0)}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-purple-600 w-44">Total Monto Solicitado</span>
              <span className="font-medium text-purple-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data['Monto Total'])}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-indigo-600 w-44">Porcentaje</span>
              <span className="font-medium text-indigo-600">:</span>
              <span className="text-right ml-2 flex-1">{data.porcentaje}% del Total</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }


  // Tooltip específico para reporte de estados
  const TooltipEstados = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1">
            <div className="text-sm flex">
              <span className="font-medium text-blue-600 w-44">Cantidad</span>
              <span className="font-medium text-blue-600">:</span>
              <span className="text-right ml-2 flex-1">{data.value} órdenes</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-green-600 w-44">Monto Solicitado</span>
              <span className="font-medium text-green-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data.montoBase)}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-orange-600 w-44">IVA</span>
              <span className="font-medium text-orange-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data.iva)}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-purple-600 w-44">Total Monto Solicitado</span>
              <span className="font-medium text-purple-600">:</span>
              <span className="text-right ml-2 flex-1">{formatCurrency(data.monto)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const generarReporteEstados = async () => {
    setLoading(true)
    try {
      const datos = await getReporteEstados(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      
      // Obtener órdenes para calcular período
      let ordenes: OrdenPago[]
      let fechaInicio: string
      let fechaFin: string

      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        ordenes = await getOrdenesPago() // Sin filtros = todas las órdenes
        if (ordenes.length > 0) {
          const fechas = ordenes.map(o => o.fecha_solicitud).sort()
          fechaInicio = fechas[0]
          fechaFin = fechas[fechas.length - 1]
        } else {
          fechaInicio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          fechaFin = new Date().toISOString().split('T')[0]
        }
      } else {
        fechaInicio = filtros.dateRange.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        fechaFin = filtros.dateRange.to || new Date().toISOString().split('T')[0]
        const filtrosPeriodo = {
          ...filtros,
          dateRange: { from: fechaInicio, to: fechaFin }
        }
        ordenes = await getOrdenesPago(filtrosPeriodo)
      }

      // Determinar el título del período
      let tituloPeriodo: string
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)} (Período completo)`
      } else {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)}`
      }

      setDatosReporte({
        ...datos,
        periodo: tituloPeriodo
      })
      setReporteActivo('estados')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte por estados:', error)
    }
    setLoading(false)
  }

  const generarReportePeriodos = async () => {
    setLoading(true)
    try {
      let ordenes: OrdenPago[]
      let fechaInicio: string
      let fechaFin: string
      
      // Si no hay filtros de fecha seleccionados, traer TODAS las órdenes
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        console.log('🔍 Sin filtros de fecha - obteniendo todas las órdenes')
        ordenes = await getOrdenesPago() // Sin filtros = todas las órdenes
        
        // Obtener el rango real de las órdenes encontradas
        if (ordenes.length > 0) {
          const fechas = ordenes.map(o => o.fecha_solicitud).sort()
          fechaInicio = fechas[0]
          fechaFin = fechas[fechas.length - 1]
        } else {
          // Si no hay órdenes, usar rango por defecto
          fechaInicio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          fechaFin = new Date().toISOString().split('T')[0]
        }
      } else {
        // Si hay filtros de fecha seleccionados, usarlos
        fechaInicio = filtros.dateRange.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        fechaFin = filtros.dateRange.to || new Date().toISOString().split('T')[0]
        
        const filtrosPeriodo = {
          ...filtros,
          dateRange: { from: fechaInicio, to: fechaFin }
        }
        
        ordenes = await getOrdenesPago(filtrosPeriodo)
      }
      
      console.log('📊 Órdenes encontradas:', ordenes.length)
      
      // Calcular totales primero
      const totalOrdenesCount = ordenes.length
      const montoTotalSum = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
      const totalIvaSum = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
      const montoBaseSum = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
      
      // Análisis por períodos
      const analisisPorMes: { [key: string]: { cantidad: number, monto: number, montoBase: number, iva: number } } = {}
      ordenes.forEach(orden => {
        const fecha = new Date(orden.fecha_solicitud)
        const clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`
        
        if (!analisisPorMes[clave]) {
          analisisPorMes[clave] = { cantidad: 0, monto: 0, montoBase: 0, iva: 0 }
        }
        analisisPorMes[clave].cantidad += 1
        analisisPorMes[clave].monto += orden.total_solicitud
        analisisPorMes[clave].montoBase += orden.monto_solicitud
        analisisPorMes[clave].iva += orden.iva
      })

      const tendencia = Object.entries(analisisPorMes)
        .map(([mes, datos]) => ({ 
          mes, 
          Cantidad: datos.cantidad, 
          'Monto Total': datos.monto,
          'Monto Base': datos.montoBase,
          'IVA': datos.iva,
          porcentaje: totalOrdenesCount > 0 ? Math.round((datos.cantidad / totalOrdenesCount) * 100) : 0,
          mesFormateado: new Date(mes + '-01').toLocaleDateString('es-CO', { 
            month: 'short', 
            year: 'numeric' 
          })
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes))

      // Determinar el título del período
      let tituloPeriodo: string
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)} (Período completo)`
      } else {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)}`
      }

      setDatosReporte({
        periodo: tituloPeriodo,
        tendenciaMensual: tendencia,
        totalOrdenes: totalOrdenesCount,
        montoTotal: montoTotalSum,
        totalIva: totalIvaSum,
        montoBase: montoBaseSum
      })
      setReporteActivo('periodos')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte por períodos:', error)
    }
    setLoading(false)
  }

  const generarReporteProveedores = async () => {
    setLoading(true)
    try {
      const datos = await getReporteProveedores(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      
      // Obtener órdenes para calcular período
      let ordenes: OrdenPago[]
      let fechaInicio: string
      let fechaFin: string

      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        ordenes = await getOrdenesPago() // Sin filtros = todas las órdenes
        if (ordenes.length > 0) {
          const fechas = ordenes.map(o => o.fecha_solicitud).sort()
          fechaInicio = fechas[0]
          fechaFin = fechas[fechas.length - 1]
        } else {
          fechaInicio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          fechaFin = new Date().toISOString().split('T')[0]
        }
      } else {
        fechaInicio = filtros.dateRange.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        fechaFin = filtros.dateRange.to || new Date().toISOString().split('T')[0]
        const filtrosPeriodo = {
          ...filtros,
          dateRange: { from: fechaInicio, to: fechaFin }
        }
        ordenes = await getOrdenesPago(filtrosPeriodo)
      }

      // Determinar el título del período
      let tituloPeriodo: string
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)} (Período completo)`
      } else {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)}`
      }
      
      // Ordenar proveedores por cantidad de mayor a menor
      const proveedoresOrdenados = [...datos.proveedores].sort((a, b) => b.cantidad - a.cantidad)
      
      // Calcular estadísticas básicas
      const totalOrdenes = datos.totales.totalOrdenes
      const montoTotalSum = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
      const totalIvaSum = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
      const montoBaseSum = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
      
      // Preparar datos para la gráfica (top 10)
      const datosGrafica = proveedoresOrdenados.slice(0, 10).map(proveedor => {
        // Calcular valores reales basados en las órdenes del proveedor
        const ordenesProveedor = proveedor.ordenes || []
        const montoBaseReal = ordenesProveedor.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
        const ivaReal = ordenesProveedor.reduce((sum, orden) => sum + orden.iva, 0)
        const montoTotalReal = ordenesProveedor.reduce((sum, orden) => sum + orden.total_solicitud, 0)
        
        return {
          proveedor: proveedor.proveedor.length > 30 ? 
            proveedor.proveedor.substring(0, 27) + '...' : 
            proveedor.proveedor,
          proveedorCompleto: proveedor.proveedor,
          Cantidad: proveedor.cantidad,
          'Monto Total': montoTotalReal || proveedor.monto,
          'Monto Base': montoBaseReal || (proveedor.monto * 0.81), // Fallback aproximado
          'IVA': ivaReal || (proveedor.monto * 0.19), // Fallback aproximado
          porcentaje: datos.totales.totalOrdenes > 0 ? Math.round((proveedor.cantidad / datos.totales.totalOrdenes) * 100) : 0
        }
      })
      

      setDatosReporte({
        ...datos,
        proveedores: proveedoresOrdenados,
        datosGrafica,
        totalOrdenes,
        montoBase: montoBaseSum,
        totalIva: totalIvaSum,
        montoTotal: montoTotalSum,
        periodo: tituloPeriodo
      })
      setReporteActivo('proveedores')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte por proveedores:', error)
    }
    setLoading(false)
  }

  const generarReporteFinanciero = async () => {
    setLoading(true)
    try {
      const datos = await getReporteFinanciero(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      
      // Obtener órdenes para calcular período
      let ordenes: OrdenPago[]
      let fechaInicio: string
      let fechaFin: string

      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        ordenes = await getOrdenesPago() // Sin filtros = todas las órdenes
        if (ordenes.length > 0) {
          const fechas = ordenes.map(o => o.fecha_solicitud).sort()
          fechaInicio = fechas[0]
          fechaFin = fechas[fechas.length - 1]
        } else {
          fechaInicio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          fechaFin = new Date().toISOString().split('T')[0]
        }
      } else {
        fechaInicio = filtros.dateRange.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        fechaFin = filtros.dateRange.to || new Date().toISOString().split('T')[0]
        const filtrosPeriodo = {
          ...filtros,
          dateRange: { from: fechaInicio, to: fechaFin }
        }
        ordenes = await getOrdenesPago(filtrosPeriodo)
      }

      // Determinar el título del período
      let tituloPeriodo: string
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)} (Período completo)`
      } else {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)}`
      }
      
      // Calcular estadísticas básicas
      const totalOrdenes = datos.totalOrdenes
      const montoBase = datos.montoBase || 0
      const totalIva = datos.totalIva || 0
      const montoTotal = datos.montoTotal || 0
      
      // Preparar datos para gráfica de distribución IVA
      const datosIvaGrafica = [
        { 
          name: 'Sin IVA', 
          value: datos.distribucionIva.sinIva.monto,
          cantidad: datos.distribucionIva.sinIva.cantidad,
          color: COLORES_GRAFICAS[0]
        },
        { 
          name: 'IVA 19%', 
          value: datos.distribucionIva.con19.monto,
          cantidad: datos.distribucionIva.con19.cantidad,
          color: COLORES_GRAFICAS[1]
        },
        { 
          name: 'IVA 5%', 
          value: datos.distribucionIva.con5.monto,
          cantidad: datos.distribucionIva.con5.cantidad,
          color: COLORES_GRAFICAS[2]
        },
        { 
          name: 'IVA 0%', 
          value: datos.distribucionIva.con0.monto,
          cantidad: datos.distribucionIva.con0.cantidad,
          color: COLORES_GRAFICAS[3]
        }
      ].filter(item => item.value > 0)
      
      // Datos para gráfica por estado
      const datosEstadoGrafica = Object.entries(datos.porEstado).map(([estado, datos]: [string, any]) => ({
        estado,
        'Monto Base': datos.montoBase,
        'IVA': datos.iva,
        'Total': datos.total,
        cantidad: datos.cantidad
      }))
      
      setDatosReporte({
        ...datos,
        datosIvaGrafica,
        datosEstadoGrafica,
        totalOrdenes,
        montoBase,
        totalIva,
        montoTotal,
        periodo: tituloPeriodo
      })
      setReporteActivo('financiero')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte financiero:', error)
    }
    setLoading(false)
  }

  const generarReporteEficiencia = async () => {
    setLoading(true)
    try {
      // ✅ CORRECCIÓN: Usar la misma lógica que Reporte por Estados (que SÍ funciona)
      const datos = await getReporteEficiencia(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      
      // Obtener órdenes para calcular período
      let ordenes: OrdenPago[]
      let fechaInicio: string
      let fechaFin: string

      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        ordenes = await getOrdenesPago() // Sin filtros = todas las órdenes
        if (ordenes.length > 0) {
          const fechas = ordenes.map(o => o.fecha_solicitud).sort()
          fechaInicio = fechas[0]
          fechaFin = fechas[fechas.length - 1]
        } else {
          fechaInicio = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          fechaFin = new Date().toISOString().split('T')[0]
        }
      } else {
        fechaInicio = filtros.dateRange.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        fechaFin = filtros.dateRange.to || new Date().toISOString().split('T')[0]
        const filtrosPeriodo = {
          ...filtros,
          dateRange: { from: fechaInicio, to: fechaFin }
        }
        ordenes = await getOrdenesPago(filtrosPeriodo)
      }

      // Determinar el título del período
      let tituloPeriodo: string
      if (!filtros.dateRange.from && !filtros.dateRange.to) {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)} (Período completo)`
      } else {
        tituloPeriodo = `${formatearFechaUtil(fechaInicio)} al ${formatearFechaUtil(fechaFin)}`
      }
      
      // Calcular estadísticas básicas
      const totalOrdenes = datos.totalOrdenes || 0
      const montoBase = datos.montoBase || 0
      const totalIva = datos.totalIva || 0
      const montoTotal = datos.montoTotal || 0
      
      // Preparar datos para gráfica de tiempos (LineChart)
      const datosFlujoTiempo = [
        { 
          paso: 1,
          etapa: 'Solicitud',
          etapaCompleta: 'Solicitada',
          dias: 0,
          acumulado: 0
        },
        { 
          paso: 2,
          etapa: 'Generación',
          etapaCompleta: 'Solicitud → Generada',
          dias: datos.tiemposPromedio?.solicitudAGenerada || 0,
          acumulado: datos.tiemposPromedio?.solicitudAGenerada || 0
        },
        { 
          paso: 3,
          etapa: 'Aprobación',
          etapaCompleta: 'Generada → Aprobada',
          dias: datos.tiemposPromedio?.generadaAAprobada || 0,
          acumulado: (datos.tiemposPromedio?.solicitudAGenerada || 0) + (datos.tiemposPromedio?.generadaAAprobada || 0)
        },
        { 
          paso: 4,
          etapa: 'Pago',
          etapaCompleta: 'Aprobada → Pagada',
          dias: datos.tiemposPromedio?.aprobadaAPagada || 0,
          acumulado: (datos.tiemposPromedio?.solicitudAGenerada || 0) + (datos.tiemposPromedio?.generadaAAprobada || 0) + (datos.tiemposPromedio?.aprobadaAPagada || 0)
        }
      ]
      
      setDatosReporte({
        ...datos,
        datosFlujoTiempo,
        totalOrdenes,
        montoBase,
        totalIva,
        montoTotal,
        periodo: tituloPeriodo
      })
      setReporteActivo('eficiencia')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte de eficiencia:', error)
    }
    setLoading(false)
  }

  const exportarDatos = async () => {
    setLoading(true)
    try {
      const ordenes = await getOrdenesPago(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      const fecha = new Date().toISOString().split('T')[0]
      exportToCSV(ordenes, `ordenes_pago_${fecha}.csv`)
    } catch (error) {
      console.error('Error exportando datos:', error)
    }
    setLoading(false)
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg className="w-6 h-6 text-bolivar-green mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Reportes y Análisis
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Genera reportes detallados con gráficas interactivas sobre el estado de las órdenes de pago
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Filtros (Opcionales)</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filtros.dateRange.from}
                onChange={(e) => setFiltros(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filtros.dateRange.to}
                onChange={(e) => setFiltros(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, to: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
              />
            </div>
            <div className="md:w-24 w-full">
              <button
                onClick={limpiarFiltros}
                className="w-full py-2 bg-yellow-400 text-gray-800 px-3 rounded-md text-sm font-medium hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Reportes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Reporte por Estados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte por Estados</h3>
            <p className="text-gray-600 text-sm mb-4">
              Análisis detallado con gráfica de distribución por estados
            </p>
            <button 
              onClick={generarReporteEstados}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'estados' ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {/* Reporte por Fechas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte por Períodos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Tendencias temporales con gráficas de líneas y barras
            </p>
            <button 
              onClick={generarReportePeriodos}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'periodos' ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {/* Reporte por Proveedores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte por Proveedores</h3>
            <p className="text-gray-600 text-sm mb-4">
              Ranking visual con gráficas de barras horizontales
            </p>
            <button 
              onClick={generarReporteProveedores}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'proveedores' ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {/* Reporte Financiero */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte Financiero</h3>
            <p className="text-gray-600 text-sm mb-4">
              Análisis financiero con gráficas de distribución de IVA
            </p>
            <button 
              onClick={generarReporteFinanciero}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'financiero' ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {/* Reporte de Eficiencia */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte de Eficiencia</h3>
            <p className="text-gray-600 text-sm mb-4">
              Tiempos de procesamiento con gráficas de barras comparativas
            </p>
            <button 
              onClick={generarReporteEficiencia}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'eficiencia' ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>

          {/* Exportar Todo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exportación Completa</h3>
            <p className="text-gray-600 text-sm mb-4">
              Exportar todos los datos en formato CSV
            </p>
            <button 
              onClick={exportarDatos}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && !reporteActivo ? 'Exportando...' : 'Exportar Datos'}
            </button>
          </div>
        </div>

        {/* Modal para mostrar resultados */}
        {modalAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {reporteActivo === 'estados' && '📊 Reporte por Estados'}
                  {reporteActivo === 'periodos' && '📈 Reporte por Períodos'}
                  {reporteActivo === 'proveedores' && '👥 Reporte por Proveedores'}
                  {reporteActivo === 'financiero' && '💰 Reporte Financiero'}
                  {reporteActivo === 'eficiencia' && '⚡ Reporte de Eficiencia'}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {/* Contenido del Reporte por Estados */}
                {reporteActivo === 'estados' && datosReporte && (
                  <div className="space-y-6">
                    {/* Tarjetas de Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
                        <p className="text-2xl font-bold text-blue-900">{datosReporte.totales.totalOrdenes}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(datosReporte.totales.totalBase)}</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(datosReporte.totales.totalIva)}</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(datosReporte.totales.montoTotal)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        Período Analizado: <span className="text-gray-700">{datosReporte.periodo}</span>
                      </h3>
                    </div>

                    {/* Gráfica de Dona 3D para Estados */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Estados - Gráfica 3D</h3>
                      <div className="h-80 relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg"></div>
                        <div className="relative z-10 h-full" style={{ 
                          filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.15)) drop-shadow(0 6px 10px rgba(0,0,0,0.1))',
                          transform: 'perspective(800px) rotateX(5deg)'
                        }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                {datosReporte.estados.map((estado: any, index: number) => {
                                  const baseColor = COLORES_ESTADOS[estado.estado as keyof typeof COLORES_ESTADOS] || COLORES_GRAFICAS[index % COLORES_GRAFICAS.length]
                                  return (
                                    <linearGradient key={`gradient-${index}`} id={`gradient-${estado.estado}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                                      <stop offset="50%" stopColor={baseColor} stopOpacity={0.8} />
                                      <stop offset="100%" stopColor={baseColor} stopOpacity={0.6} />
                                    </linearGradient>
                                  )
                                })}
                              </defs>
                              <Pie
                                data={datosReporte.estados.map((estado: any) => ({
                                  name: estado.estado,
                                  value: estado.cantidad,
                                  monto: estado.monto,
                                  montoBase: estado.montoBase,
                                  iva: estado.iva,
                                  porcentaje: estado.porcentaje
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, porcentaje }) => `${name} (${porcentaje}%)`}
                                outerRadius={120}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                stroke="#fff"
                                strokeWidth={3}
                                startAngle={90}
                                endAngle={450}
                              >
                                {datosReporte.estados.map((estado: any, index: number) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={`url(#gradient-${estado.estado})`}
                                    style={{
                                      filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))'
                                    }}
                                  />
                                ))}
                              </Pie>
                              <Tooltip 
                                content={<TooltipEstados />}
                                wrapperStyle={{
                                  backgroundColor: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #ccc',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                        
                      {/* Leyenda personalizada ordenada */}
                      <div className="flex flex-wrap justify-center gap-4 px-2 py-3 bg-gray-50 rounded-lg border border-gray-100">
                        {['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
                          .filter(estado => datosReporte.estados.find((e: any) => e.estado === estado))
                          .map(estado => {
                            const estadoData = datosReporte.estados.find((e: any) => e.estado === estado)
                            if (!estadoData) return null
                            return (
                              <div key={estado} className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: COLORES_ESTADOS[estado as keyof typeof COLORES_ESTADOS] || '#8884d8' }}
                                ></div>
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                  {estado} ({estadoData.porcentaje}%)
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Detalle por Estado</h3>
                      {datosReporte.estados.map((estadoData: any) => {
                        const colores = getEstadoColor(estadoData.estado)
                        return (
                          <div key={estadoData.estado} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colores.bg} ${colores.text}`}>
                                {estadoData.estado}
                              </span>
                              <span className="text-sm text-gray-500">{estadoData.porcentaje}% del total</span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Cantidad</p>
                                <p className="font-semibold">{estadoData.cantidad} órdenes</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Monto Solicitado</p>
                                <p className="font-semibold">{formatCurrency(estadoData.montoBase)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">IVA</p>
                                <p className="font-semibold">{formatCurrency(estadoData.iva)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Monto Solicitado</p>
                                <p className="font-semibold">{formatCurrency(estadoData.monto)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Contenido del Reporte por Períodos */}
                {reporteActivo === 'periodos' && datosReporte && (
                  <div className="space-y-6">
                    {/* Tarjetas de Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
                        <p className="text-2xl font-bold text-blue-900">{datosReporte.totalOrdenes}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(datosReporte.montoBase || 0)}</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(datosReporte.totalIva || 0)}</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(datosReporte.montoTotal)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        Período Analizado: <span className="text-gray-700">{datosReporte.periodo}</span>
                      </h3>
                    </div>

                    {/* Gráfica de Línea - Evolución Mensual de Solicitudes */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución Mensual de Solicitudes</h3>

                      {datosReporte.tendenciaMensual && datosReporte.tendenciaMensual.length > 0 ? (
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={datosReporte.tendenciaMensual}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="mesFormateado" 
                                stroke="#6b7280"
                                fontSize={12}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                stroke={COLORES_GRAFICAS[0]}
                                fontSize={12}
                                label={{ value: 'Cantidad de Solicitudes', angle: -90, position: 'insideLeft' }}
                              />
                              <Tooltip content={<TooltipPeriodos />} />
                              <Line 
                                type="monotone" 
                                dataKey="Cantidad" 
                                stroke={COLORES_GRAFICAS[0]} 
                                strokeWidth={4}
                                dot={{ 
                                  fill: COLORES_GRAFICAS[0], 
                                  strokeWidth: 3, 
                                  r: 6,
                                  stroke: '#ffffff'
                                }}
                                activeDot={{ 
                                  r: 8, 
                                  fill: COLORES_GRAFICAS[0],
                                  stroke: '#ffffff',
                                  strokeWidth: 3
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                          <div className="text-center text-gray-500">
                            <div className="text-4xl mb-4">📈</div>
                            <h4 className="text-lg font-medium mb-2">No hay datos para mostrar</h4>
                            <p className="text-sm">
                              No se encontraron órdenes de pago para el período seleccionado.<br/>
                              Intenta seleccionar un rango de fechas diferente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detalle Mensual */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Detalle Mensual</h3>
                      <div className="space-y-3">
                        {datosReporte.tendenciaMensual.map((mes: any) => (
                          <div key={mes.mes} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="bg-blue-100 px-3 py-1 rounded-full">
                                <span className="text-sm font-medium text-blue-700">{mes.mesFormateado}</span>
                              </div>
                              <span className="text-sm text-gray-500">{mes.porcentaje}% del total</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Cantidad</p>
                                <p className="font-semibold">{mes.Cantidad} solicitudes</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Monto Total</p>
                                <p className="font-semibold">{formatCurrency(mes['Monto Total'])}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenido del Reporte por Proveedores */}
                {reporteActivo === 'proveedores' && datosReporte && (
                  <div className="space-y-6">
                    {/* Tarjetas de Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
                        <p className="text-2xl font-bold text-blue-900">{datosReporte.totalOrdenes || 0}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(datosReporte.montoBase || 0)}</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(datosReporte.totalIva || 0)}</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(datosReporte.montoTotal || 0)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        Período Analizado: <span className="text-gray-700">{datosReporte.periodo}</span>
                      </h3>
                    </div>

                    {/* Gráfica de Barras Horizontales para Proveedores */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Proveedores - Top 10</h3>
                      
                      <div className="h-96 mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="horizontal"
                            data={[
                              { name: "SCOTIABANK", value: 8 },
                              { name: "BANCO AV VILLA", value: 6 },
                              { name: "CITIBANK", value: 4 },
                              { name: "BANCO CAJA SOC", value: 3 },
                              { name: "BANCO POPULAR", value: 2 },
                              { name: "BBVA COLOMBIA", value: 1 }
                            ]}
                            margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={140} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Tabla de Detalles */}
                      <div className="mt-6 border-t pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Detalle de Proveedores</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Solicitado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IVA</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Monto Solicitado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {datosReporte.proveedores?.map((proveedor: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{proveedor.proveedor}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{proveedor.cantidad}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(proveedor.monto * 0.81)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(proveedor.monto * 0.19)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(proveedor.monto)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{proveedor.porcentaje}%</td>
                                </tr>
                              )) || <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay datos disponibles</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenido del Reporte Financiero */}
                {reporteActivo === 'financiero' && datosReporte && (
                  <div className="space-y-6">
                    {/* Tarjetas de Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
                        <p className="text-2xl font-bold text-blue-900">{datosReporte.totalOrdenes || 0}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(datosReporte.montoBase || 0)}</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(datosReporte.totalIva || 0)}</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(datosReporte.montoTotal || 0)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        Período Analizado: <span className="text-gray-700">{datosReporte.periodo}</span>
                      </h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis Financiero</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Distribución por Rangos de Monto</h4>
                          <div className="space-y-2">
                            {datosReporte.rangosFinancieros?.map((rango: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">{rango.rango}</span>
                                <div className="text-right">
                                  <span className="font-medium">{rango.cantidad}</span>
                                  <span className="text-sm text-gray-500 ml-2">({rango.porcentaje}%)</span>
                                </div>
                              </div>
                            )) || <p className="text-gray-600">No hay datos disponibles</p>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Resumen de IVA</h4>
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="text-center">
                              <p className="text-sm text-gray-600 mb-1">Total IVA Calculado</p>
                              <p className="text-2xl font-bold text-orange-700">{formatCurrency(datosReporte.totalIva || 0)}</p>
                              <p className="text-sm text-gray-600 mt-2">Promedio por orden: {formatCurrency((datosReporte.totalIva || 0) / Math.max(datosReporte.totalOrdenes || 1, 1))}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contenido del Reporte de Eficiencia */}
                {reporteActivo === 'eficiencia' && datosReporte && (
                  <div className="space-y-6">
                    {/* Tarjetas de Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
                        <p className="text-2xl font-bold text-blue-900">{datosReporte.totalOrdenes || 0}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(datosReporte.montoBase || 0)}</p>
                      </div>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
                        <p className="text-2xl font-bold text-orange-900">{formatCurrency(datosReporte.totalIva || 0)}</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                        <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(datosReporte.montoTotal || 0)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        Período Analizado: <span className="text-gray-700">{datosReporte.periodo}</span>
                      </h3>
                    </div>

                    {/* Timeline Horizontal de Flujo de Tiempo */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">📈 Flujo de Tiempo por Etapas</h3>
                      
                      {/* Timeline Horizontal */}
                      <div className="relative py-8 px-4">
                        <div className="flex justify-between items-center relative">
                          
                          {/* Línea base horizontal */}
                          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2 z-0"></div>
                          
                          {/* Solicitada */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-lg mb-2"></div>
                            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Solicitada</span>
                          </div>
                          
                          {/* Días Solicitud → Generada */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="text-lg font-bold text-blue-600 mb-6">
                              {datosReporte.tiemposPromedio?.solicitudAGenerada || 0} días
                            </div>
                            <div className="w-5 h-5 bg-green-500 rounded-full border-4 border-white shadow-lg mb-2"></div>
                            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Generada</span>
                          </div>
                          
                          {/* Días Generada → Aprobada */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="text-lg font-bold text-green-600 mb-6">
                              {datosReporte.tiemposPromedio?.generadaAAprobada || 0} días
                            </div>
                            <div className="w-5 h-5 bg-orange-500 rounded-full border-4 border-white shadow-lg mb-2"></div>
                            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Aprobada</span>
                          </div>
                          
                          {/* Días Aprobada → Pagada */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="text-lg font-bold text-orange-600 mb-6">
                              {datosReporte.tiemposPromedio?.aprobadaAPagada || 0} días
                            </div>
                            <div className="w-5 h-5 bg-purple-500 rounded-full border-4 border-white shadow-lg mb-2"></div>
                            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Pagada</span>
                          </div>
                          
                        </div>
                      </div>
                      
                      {/* Información adicional */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Tiempo Total</p>
                          <p className="text-xl font-bold text-blue-700">
                            {(() => {
                              const solicitud = datosReporte.tiemposPromedio?.solicitudAGenerada || 0
                              const generada = datosReporte.tiemposPromedio?.generadaAAprobada || 0
                              const aprobada = datosReporte.tiemposPromedio?.aprobadaAPagada || 0
                              return solicitud + generada + aprobada
                            })()} días
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Etapa Más Rápida</p>
                          <p className="text-xl font-bold text-green-700">
                            {(() => {
                              const solicitud = datosReporte.tiemposPromedio?.solicitudAGenerada || 0
                              const generada = datosReporte.tiemposPromedio?.generadaAAprobada || 0
                              const aprobada = datosReporte.tiemposPromedio?.aprobadaAPagada || 0
                              const tiempos = [solicitud, generada, aprobada].filter(t => t > 0)
                              return tiempos.length > 0 ? Math.min(...tiempos) : 0
                            })()} días
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">Etapa Más Lenta</p>
                          <p className="text-xl font-bold text-orange-700">
                            {(() => {
                              const solicitud = datosReporte.tiemposPromedio?.solicitudAGenerada || 0
                              const generada = datosReporte.tiemposPromedio?.generadaAAprobada || 0
                              const aprobada = datosReporte.tiemposPromedio?.aprobadaAPagada || 0
                              const tiempos = [solicitud, generada, aprobada].filter(t => t > 0)
                              return tiempos.length > 0 ? Math.max(...tiempos) : 0
                            })()} días
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 text-center mt-4">
                        <p>Timeline horizontal que muestra el tiempo promedio entre cada etapa del proceso de órdenes de pago.</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Eficiencia</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Tiempos de Procesamiento por Estado</h4>
                          <div className="space-y-3">
                            {datosReporte.eficienciaPorEstado && Object.keys(datosReporte.eficienciaPorEstado).length > 0 ? 
                              Object.entries(datosReporte.eficienciaPorEstado).map(([estado, datos]: [string, any], index: number) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-900">{estado}</span>
                                    <span className="text-sm text-gray-600">{datos.cantidadProcesadas} órdenes</span>
                                  </div>
                                  <div className="mt-1 flex justify-between text-sm text-gray-600">
                                    <span>Tiempo promedio: {datos.tiempoPromedio || 0} días</span>
                                    <span>Rango: {datos.masRapida}-{datos.masLenta} días</span>
                                  </div>
                                </div>
                              )) : <p className="text-gray-600">No hay datos disponibles</p>
                            }
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Métricas de Rendimiento</h4>
                          <div className="space-y-3">
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">Tiempo Solicitud → Generada</p>
                              <p className="text-lg font-bold text-green-700">{datosReporte.tiemposPromedio?.solicitudAGenerada || 0} días</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">Tiempo Generada → Aprobada</p>
                              <p className="text-lg font-bold text-blue-700">{datosReporte.tiemposPromedio?.generadaAAprobada || 0} días</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">Tiempo Aprobada → Pagada</p>
                              <p className="text-lg font-bold text-purple-700">{datosReporte.tiemposPromedio?.aprobadaAPagada || 0} días</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">Tiempo Total del Proceso</p>
                              <p className="text-lg font-bold text-red-700">{datosReporte.tiemposPromedio?.totalProceso || 0} días</p>
                            </div>
                            {datosReporte.ordenesAtrasadas && datosReporte.ordenesAtrasadas.length > 0 && (
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">Órdenes Atrasadas</p>
                                <p className="text-lg font-bold text-orange-700">{datosReporte.ordenesAtrasadas.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Más de 30 días sin completar</p>
                              </div>
                            )}
                            {datosReporte.alertas && datosReporte.alertas.length > 0 && (
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">Alertas</p>
                                <div className="mt-1 space-y-1">
                                  {datosReporte.alertas.map((alerta: string, index: number) => (
                                    <p key={index} className="text-xs text-yellow-700">{alerta}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                📊 Reportes con Gráficas Interactivas
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Los reportes ahora incluyen gráficas interactivas que se generan en tiempo real. 
                  Puedes hacer hover sobre los elementos para ver detalles adicionales. 
                  Los filtros de fecha se aplicarán tanto a las tablas como a las gráficas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
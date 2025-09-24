'use client'

import { useState, useEffect } from 'react'
import { 
  getOrdenesPago, 
  getReporteEstados, 
  getReporteTipoServicio, 
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
  ReporteTipoServicio, 
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

type TipoReporte = 'estados' | 'periodos' | 'tipoServicio' | 'financiero' | 'eficiencia' | null

// Colores para las gráficas
const COLORES_ESTADOS = {
  'Solicitada': '#3B82F6',   // azul
  'Devuelta': '#EF4444',     // rojo
  'Generada': '#F59E0B',     // amarillo
  'Aprobada': '#10B981',     // verde
  'Pagada': '#059669'        // verde esmeralda
}

const COLORES_TIPOS_SERVICIO = {
  'Pago de Comisiones Bancarias': '#3B82F6',   // azul
  'Pago de Servicios Públicos': '#10B981',     // verde
  'Sin especificar': '#6B7280'                 // gris
}

const COLORES_GRAFICAS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Componente personalizado para etiquetas de pie chart con cantidad dentro y porcentaje fuera
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index, name, data, porcentaje }: any) => {
  const RADIAN = Math.PI / 180
  
  // Posición para la cantidad (dentro de la sección)
  const innerRadiusPos = innerRadius + (outerRadius - innerRadius) * 0.5
  const xInner = cx + innerRadiusPos * Math.cos(-midAngle * RADIAN)
  const yInner = cy + innerRadiusPos * Math.sin(-midAngle * RADIAN)
  
  // Posición para el porcentaje (fuera del pie)
  const outerRadiusPos = outerRadius + 25 // 25px fuera del borde
  const xOuter = cx + outerRadiusPos * Math.cos(-midAngle * RADIAN)
  const yOuter = cy + outerRadiusPos * Math.sin(-midAngle * RADIAN)
  
  // Calcular tamaño de fuente basado en el porcentaje de la sección
  const percentage = data && data.length > 0 ? (value / data.reduce((sum: number, entry: any) => sum + entry.value, 0)) * 100 : 0
  let fontSize = 12
  
  // Ajustar tamaño de fuente según el porcentaje de la sección
  if (percentage > 20) {
    fontSize = 14
  } else if (percentage > 10) {
    fontSize = 12
  } else if (percentage > 5) {
    fontSize = 10
  } else {
    fontSize = 9
  }
  
  // No mostrar texto si la sección es muy pequeña
  if (percentage < 3) {
    return null
  }

  const displayPercentage = porcentaje || Math.round(percentage * 10) / 10

  return (
    <g>
      {/* Cantidad dentro de la sección */}
      <text 
        x={xInner} 
        y={yInner} 
        fill="#fff" 
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        style={{
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.9))'
        }}
      >
        {value}
      </text>
      
      {/* Línea de conexión del porcentaje (opcional) */}
      <line
        x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
        y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
        x2={xOuter - (xOuter > cx ? 8 : -8)}
        y2={yOuter}
        stroke="#666"
        strokeWidth={1}
        opacity={0.5}
      />
      
      {/* Porcentaje fuera del pie */}
      <text 
        x={xOuter} 
        y={yOuter} 
        fill="#374151" 
        textAnchor={xOuter > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight="600"
        style={{
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
        }}
      >
        {displayPercentage}%
      </text>
    </g>
  )
}

export default function ReportesPage() {
  const [loading, setLoading] = useState(false)
  const [reporteActivo, setReporteActivo] = useState<TipoReporte>(null)
  const [datosReporte, setDatosReporte] = useState<any>(null)
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<{
    tipoServicio: string
    estado: string
    solicitudes: any[]
  } | null>(null)
  
  // Estados para ordenamiento, filtros y paginación de la tabla de detalles
  const [sortState, setSortState] = useState<{
    field: string
    direction: 'asc' | 'desc'
  }>({ field: 'fecha_solicitud', direction: 'desc' })
  
  const [filtrosTabla, setFiltrosTabla] = useState({
    companiaReceptora: [] as string[],
    concepto: [] as string[]
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Estado para el modal de detalles de solicitud
  const [solicitudModal, setSolicitudModal] = useState<{
    isOpen: boolean
    solicitud: any | null
  }>({ isOpen: false, solicitud: null })
  const [filtros, setFiltros] = useState<FilterState>({
    dateRange: { from: '', to: '' },
    proveedores: [],
    estados: []
  })
  
  // Modal states
  const [modalAbierto, setModalAbierto] = useState(false)

  // Manejar tecla ESC para cerrar modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalAbierto) {
        cerrarModal()
      }
    }

    if (modalAbierto) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [modalAbierto])

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

  const generarReporteTipoServicio = async () => {
    setLoading(true)
    try {
      const datos = await getReporteTipoServicio(filtros.dateRange.from || filtros.dateRange.to ? filtros : undefined)
      
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
      
      // Ordenar tipos de servicio por cantidad de mayor a menor
      const tiposOrdenados = [...datos.tiposServicio].sort((a, b) => b.cantidad - a.cantidad)
      
      // Calcular estadísticas básicas
      const totalOrdenes = datos.totales.totalOrdenes
      const montoTotalSum = ordenes.reduce((sum, orden) => sum + orden.total_solicitud, 0)
      const totalIvaSum = ordenes.reduce((sum, orden) => sum + orden.iva, 0)
      const montoBaseSum = ordenes.reduce((sum, orden) => sum + orden.monto_solicitud, 0)
      
      // Preparar datos para la gráfica
      const datosGrafica = tiposOrdenados.map(tipo => {
        return {
          tipoServicio: tipo.tipoServicio.length > 30 ? 
            tipo.tipoServicio.substring(0, 27) + '...' : 
            tipo.tipoServicio,
          tipoServicioCompleto: tipo.tipoServicio,
          Cantidad: tipo.cantidad,
          'Monto Total': tipo.monto,
          'Monto Base': tipo.montoBase,
          'IVA': tipo.iva,
          porcentaje: datos.totales.totalOrdenes > 0 ? Math.round((tipo.cantidad / datos.totales.totalOrdenes) * 100) : 0
        }
      })
      

      setDatosReporte({
        ...datos,
        tiposServicio: tiposOrdenados,
        datosGrafica,
        totalOrdenes,
        montoBase: montoBaseSum,
        totalIva: totalIvaSum,
        montoTotal: montoTotalSum,
        periodo: tituloPeriodo
      })
      setReporteActivo('tipoServicio')
      setModalAbierto(true)
    } catch (error) {
      console.error('Error generando reporte por tipo de servicio:', error)
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

  // Funciones para ordenamiento y filtros de tabla de detalles
  const handleSort = (field: string) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getSortIcon = (field: string) => {
    if (sortState.field !== field) {
      return <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    }
    
    return sortState.direction === 'desc' ? (
      <svg className="w-3 h-3 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  // Componente de filtro multi-selección estilo dashboard
  const MultiSelectFilter = ({ 
    options, 
    selectedValues, 
    onChange, 
    placeholder,
    maxDisplay = 2 
  }: {
    options: string[]
    selectedValues: string[]
    onChange: (values: string[]) => void
    placeholder: string
    maxDisplay?: number
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    
    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
      const handleClickOutside = () => {
        setIsOpen(false)
      }
      
      if (isOpen) {
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
      }
    }, [isOpen])
    
    const handleToggle = (value: string) => {
      const newValues = selectedValues.includes(value) 
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value]
      onChange(newValues)
    }

    const displayText = selectedValues.length === 0 
      ? placeholder
      : selectedValues.length <= maxDisplay
        ? selectedValues.join(', ')
        : `${selectedValues.slice(0, maxDisplay).join(', ')} +${selectedValues.length - maxDisplay}`

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-gray-600 min-w-[100px] max-w-[150px]"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          <span className="truncate">{displayText}</span>
          <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px] max-h-[200px] overflow-y-auto">
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Filtrar por:</span>
                {selectedValues.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange([])
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {options.map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={() => handleToggle(option)}
                      className="rounded border-gray-300 text-bolivar-green focus:ring-bolivar-green"
                    />
                    <span className="text-xs text-gray-700 truncate">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Función para obtener opciones únicas de filtros
  const getFilterOptions = (field: string) => {
    if (!seccionSeleccionada) return []
    
    const uniqueValues = Array.from(new Set(
      seccionSeleccionada.solicitudes
        .map(s => s[field])
        .filter(val => val && val.trim() !== '')
    )).sort()
    
    return uniqueValues
  }

  // Función para aplicar ordenamiento y filtros a las solicitudes (sin paginación para contar totales)
  const getAllFilteredSolicitudes = () => {
    if (!seccionSeleccionada) return []
    
    let solicitudes = [...seccionSeleccionada.solicitudes]

    // Aplicar filtros
    if (filtrosTabla.companiaReceptora.length > 0) {
      solicitudes = solicitudes.filter(s => 
        filtrosTabla.companiaReceptora.includes(s.compania_receptora)
      )
    }
    
    if (filtrosTabla.concepto.length > 0) {
      solicitudes = solicitudes.filter(s => 
        filtrosTabla.concepto.includes(s.concepto)
      )
    }

    // Aplicar ordenamiento
    solicitudes.sort((a, b) => {
      let aVal = a[sortState.field]
      let bVal = b[sortState.field]
      
      // Manejar fechas
      if (sortState.field.includes('fecha')) {
        aVal = aVal ? new Date(aVal) : null
        bVal = bVal ? new Date(bVal) : null
      }
      
      // Manejar valores null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortState.direction === 'asc' ? -1 : 1
      if (bVal == null) return sortState.direction === 'asc' ? 1 : -1
      
      // Comparación normal
      if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1
      return 0
    })

    return solicitudes
  }

  // Función para aplicar paginación a las solicitudes filtradas
  const getSolicitudesFiltradas = () => {
    const allFiltered = getAllFilteredSolicitudes()
    
    if (pageSize === 0) return allFiltered // Mostrar todos
    
    const startIndex = (currentPage - 1) * pageSize
    return allFiltered.slice(startIndex, startIndex + pageSize)
  }

  // Calcular datos de paginación
  const allFilteredSolicitudes = getAllFilteredSolicitudes()
  const totalPages = pageSize === 0 ? 1 : Math.ceil(allFilteredSolicitudes.length / pageSize)
  const startRecord = allFilteredSolicitudes.length > 0 ? 
    (pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1) : 0
  const endRecord = allFilteredSolicitudes.length > 0 ? 
    (pageSize === 0 ? allFilteredSolicitudes.length : Math.min(currentPage * pageSize, allFilteredSolicitudes.length)) : 0

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filtrosTabla, sortState])

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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reporte por Tipo de Solicitud</h3>
            <p className="text-gray-600 text-sm mb-4">
              Análisis detallado por tipo de solicitud con gráficas de barras horizontales
            </p>
            <button 
              onClick={generarReporteTipoServicio}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading && reporteActivo === 'tipoServicio' ? 'Generando...' : 'Generar Reporte'}
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
                  {reporteActivo === 'tipoServicio' && '🏢 Reporte por Tipo de Solicitud'}
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
                                label={(props) => {
                                  const estadoData = datosReporte.estados[props.index]
                                  return <CustomPieLabel {...props} data={datosReporte.estados.map((estado: any) => ({ value: estado.cantidad }))} porcentaje={estadoData?.porcentaje} />
                                }}
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

                {/* Contenido del Reporte por Tipo de Solicitud */}
                {reporteActivo === 'tipoServicio' && datosReporte && (
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

                    {/* Gráfica de Barras Horizontales por Tipo de Solicitud */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      
                      <div className="mb-3" style={{ minHeight: `${Math.max(200, (datosReporte.tiposServicio?.length || 2) * 80 + 160)}px` }}>
                        {/* Barras horizontales apiladas por estado */}
                        <div className="space-y-6">
                          {/* Definir colores por estado */}
                          {(() => {
                            const coloresEstados = {
                              'Solicitada': { bg: 'bg-gray-400', color: '#9CA3AF' },
                              'Devuelta': { bg: 'bg-red-500', color: '#EF4444' },
                              'Generada': { bg: 'bg-yellow-400', color: '#FBBF24' },
                              'Aprobada': { bg: 'bg-sky-400', color: '#38BDF8' },
                              'Pagada': { bg: 'bg-green-700', color: '#15803D' }
                            }
                            
                            const maxValue = Math.max(...(datosReporte.tiposServicio?.map((t: any) => Number(t.cantidad)) || [1]))
                            const roundedMax = Math.ceil(maxValue / 100) * 100
                            const steps = [0, Math.round(roundedMax * 0.25), Math.round(roundedMax * 0.5), Math.round(roundedMax * 0.75), roundedMax]
                            
                            return (
                              <div>
                                {/* Leyenda de estados en orden lógico */}
                                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium text-gray-700">Estados (orden del proceso):</span>
                                  {['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada'].map((estado) => {
                                    const config = coloresEstados[estado as keyof typeof coloresEstados]
                                    return (
                                      <div key={estado} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded ${config.bg}`}></div>
                                        <span className="text-xs font-medium text-gray-600">{estado}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                                
                                {/* Eje superior con valores de referencia */}
                                <div className="flex items-center mb-2">
                                  <div className="w-48"></div>
                                  <div className="flex-1 flex justify-between text-xs text-gray-500 px-1">
                                    {steps.map((step, index) => (
                                      <span key={index} className="font-medium">{step}</span>
                                    ))}
                                  </div>
                                  <div className="w-16"></div>
                                </div>
                                
                                {/* Líneas de grid vertical */}
                                <div className="flex items-center mb-4">
                                  <div className="w-48"></div>
                                  <div className="flex-1 relative">
                                    <div className="absolute inset-0 flex justify-between">
                                      {steps.map((_, index) => (
                                        <div key={index} className="w-px bg-gray-300 h-full opacity-60"></div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="w-16"></div>
                                </div>
                                
                                {/* Barras apiladas */}
                                <div className="space-y-3">
                                  {datosReporte.tiposServicio
                                    ?.sort((a: any, b: any) => b.cantidad - a.cantidad)
                                    .map((tipo: any, index: number) => {
                                      const totalPercentage = (Number(tipo.cantidad) / roundedMax) * 100
                                      
                                      return (
                                        <div key={index} className="flex items-center">
                                          <div className="w-48 text-sm font-medium text-gray-700 text-right pr-4">
                                            {tipo.tipoServicio}
                                          </div>
                                          <div className="flex-1 relative">
                                            {/* Grid de fondo */}
                                            <div className="absolute inset-0 flex justify-between opacity-30">
                                              {steps.map((_, gridIndex) => (
                                                <div key={gridIndex} className="w-px bg-gray-300 h-full"></div>
                                              ))}
                                            </div>
                                            
                                            {/* Barra apilada */}
                                            <div className="bg-gray-100 rounded h-10 relative overflow-hidden border border-gray-200">
                                              <div 
                                                className="flex h-full"
                                                style={{ width: `${totalPercentage}%`, minWidth: totalPercentage > 0 ? '50px' : '0px' }}
                                              >
                                                {(() => {
                                                  // Orden lógico de los estados según el flujo del proceso
                                                  const ordenEstados = ['Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada']
                                                  
                                                  return ordenEstados
                                                    .filter(estado => (tipo.estados || {})[estado] > 0)
                                                    .map((estado, segIndex) => {
                                                      const cantidad = tipo.estados[estado]
                                                      const segmentPercentage = (Number(cantidad) / tipo.cantidad) * 100
                                                      const config = coloresEstados[estado as keyof typeof coloresEstados]
                                                      
                                                      return (
                                                        <div
                                                          key={segIndex}
                                                          className="flex items-center justify-center text-white text-xs font-semibold relative group cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                                            width: `${segmentPercentage}%`,
                                                            backgroundColor: config?.color || '#6B7280',
                                                            minWidth: segmentPercentage > 10 ? 'auto' : '20px'
                                                          }}
                                                          title={`${estado}: ${cantidad} solicitudes - Clic para ver detalles`}
                                onClick={() => {
                                  // Filtrar solicitudes por tipo y estado
                                  const solicitudesFiltradas = tipo.ordenes.filter((orden: any) => orden.estado === estado)
                                  setSeccionSeleccionada({
                                    tipoServicio: tipo.tipoServicio,
                                    estado: estado,
                                    solicitudes: solicitudesFiltradas
                                  })
                                  // Limpiar filtros al cambiar de sección
                                  setFiltrosTabla({ companiaReceptora: [], concepto: [] })
                                  setSortState({ field: 'fecha_solicitud', direction: 'desc' })
                                  setCurrentPage(1)
                                }}
                                                        >
                                                          {segmentPercentage > 10 && (
                                                            <span className="text-white text-xs font-semibold">
                                                              {cantidad}
                                                            </span>
                                                          )}
                                                          
                                                          {/* Tooltip */}
                                                          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                                            {estado}: {cantidad} solicitudes
                                      </div>
                                    </div>
                                  )
                                                    })
                                                })()}
                      </div>

                                              {/* Total en el extremo derecho */}
                                              <div className="absolute right-2 top-0 h-full flex items-center">
                                                <span className="text-gray-700 text-sm font-semibold bg-white bg-opacity-90 px-1 rounded">
                                                  {tipo.cantidad}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="w-16 text-sm text-gray-600 font-medium text-center">
                                            {tipo.porcentaje}%
                                          </div>
                                        </div>
                                      )
                                    }) || []}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Tabla de Detalles Interactiva */}
                      <div className="mt-3 border-t pt-4">
                        {seccionSeleccionada ? (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-md font-medium text-gray-900">
                                Detalles: {seccionSeleccionada.tipoServicio} - Estado "{seccionSeleccionada.estado}"
                                <span className="ml-2 text-sm text-gray-600">
                                  ({allFilteredSolicitudes.length} solicitudes)
                                </span>
                              </h4>
                              <button
                                onClick={() => {
                                  setSeccionSeleccionada(null)
                                  setFiltrosTabla({ companiaReceptora: [], concepto: [] })
                                  setSortState({ field: 'fecha_solicitud', direction: 'desc' })
                                  setCurrentPage(1)
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-800 bg-yellow-400 hover:bg-yellow-500 rounded-md transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cerrar detalles
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-[60px]">
                                      <div 
                                        onClick={() => handleSort('fecha_solicitud')}
                                        className="flex items-start justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                                      >
                                        <div>
                                          <div>Fecha de</div>
                                          <div>Solicitud</div>
                                        </div>
                                        {getSortIcon('fecha_solicitud')}
                                      </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-[80px]">
                                      <div 
                                        onClick={() => handleSort('numero_solicitud')}
                                        className="flex items-start justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                                      >
                                        <div>
                                          <div>Número de</div>
                                          <div>Solicitud</div>
                                        </div>
                                        {getSortIcon('numero_solicitud')}
                                      </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-[180px]">
                                      <div className="space-y-2">
                                        <div 
                                          onClick={() => handleSort('compania_receptora')}
                                          className="flex items-start justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                                        >
                                          <div>
                                            <div>Compañía</div>
                                            <div>Receptora</div>
                                          </div>
                                          {getSortIcon('compania_receptora')}
                                        </div>
                                        <MultiSelectFilter
                                          options={getFilterOptions('compania_receptora')}
                                          selectedValues={filtrosTabla.companiaReceptora}
                                          onChange={(values) => setFiltrosTabla(prev => ({ ...prev, companiaReceptora: values }))}
                                          placeholder="Filtrar..."
                                          maxDisplay={1}
                                        />
                                      </div>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-[200px]">
                                      <div className="space-y-2">
                                        <div 
                                          onClick={() => handleSort('concepto')}
                                          className="flex items-start justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                                        >
                                          <div>
                                            <div>Concepto</div>
                                          </div>
                                          {getSortIcon('concepto')}
                                        </div>
                                        <MultiSelectFilter
                                          options={getFilterOptions('concepto')}
                                          selectedValues={filtrosTabla.concepto}
                                          onChange={(values) => setFiltrosTabla(prev => ({ ...prev, concepto: values }))}
                                          placeholder="Filtrar..."
                                          maxDisplay={1}
                                        />
                      </div>
                                    </th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 w-[150px]">
                                      <div 
                                        onClick={() => handleSort('total_solicitud')}
                                        className="flex items-start justify-end cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                                      >
                                        <div className="flex items-start gap-2">
                                          <div className="text-right">
                                            <div>Total Monto</div>
                                            <div>Solicitado</div>
                                          </div>
                                          {getSortIcon('total_solicitud')}
                                        </div>
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {getSolicitudesFiltradas().map((solicitud: any, index: number) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CO')}
                                      </td>
                                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                          <div className="relative group">
                                            <button
                                              onClick={() => {
                                                setSolicitudModal({ isOpen: true, solicitud: solicitud })
                                              }}
                                              className="group flex items-center justify-center w-5 h-5 transition-colors"
                                            >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                                              {/* Borde de la hoja - Verde institucional en hover */}
                                              <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                stroke="currentColor"
                                                className="text-gray-400 group-hover:text-green-700 transition-colors"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                                              />
                                              {/* Lápiz - Amarillo institucional en hover */}
                                              <path 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round" 
                                                strokeWidth={2} 
                                                stroke="currentColor"
                                                className="text-gray-400 group-hover:text-yellow-400 transition-colors"
                                                d="M17.586 3.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                              />
                                            </svg>
                                            </button>
                                            {/* Tooltip personalizado - aparece inmediatamente */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none whitespace-nowrap z-10">
                                              Ver solicitud
                                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-gray-800"></div>
                                            </div>
                                          </div>
                                          <span>{solicitud.numero_solicitud}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-[160px]">
                                        <div title={solicitud.compania_receptora}>
                                          {solicitud.compania_receptora}
                                        </div>
                                      </td>
                                      <td className="px-3 py-4 text-sm text-gray-900 truncate max-w-[140px]">
                                        <div title={solicitud.concepto}>
                                          {solicitud.concepto}
                                        </div>
                                      </td>
                                      <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {formatCurrency(solicitud.total_solicitud)}
                                      </td>
                                    </tr>
                                  ))}
                                  {getSolicitudesFiltradas().length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No se encontraron solicitudes con los filtros aplicados
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                      </div>

                            {/* Controles de paginación */}
                            {allFilteredSolicitudes.length > 0 && totalPages > 1 && pageSize > 0 && (
                              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                  <div className="text-sm text-gray-700">
                                    Página <span className="font-medium">{currentPage}</span> de{' '}
                                    <span className="font-medium">{totalPages}</span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    {/* Indicador de registros mostrados */}
                                    <div className="text-sm text-gray-600 mr-4">
                                      Mostrando {startRecord} a {endRecord} registros de {allFilteredSolicitudes.length}
                                    </div>
                                    
                                    <button
                                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                      disabled={currentPage === 1}
                                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Anterior
                                    </button>
                                    
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                                      if (pageNum > totalPages) return null
                                      
                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => setCurrentPage(pageNum)}
                                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            currentPage === pageNum
                                              ? 'bg-bolivar-green text-white'
                                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                          }`}
                                        >
                                          {pageNum}
                                        </button>
                                      )
                                    })}
                                    
                                    <button
                                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                      disabled={currentPage === totalPages}
                                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      Siguiente
                                    </button>
                                    
                                    {/* Controles de paginación */}
                                    <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                                      <select
                                        value={pageSize}
                                        onChange={(e) => {
                                          setPageSize(Number(e.target.value))
                                          setCurrentPage(1) // Reset a la primera página al cambiar tamaño
                                        }}
                                        className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green"
                                      >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={0}>Todos</option>
                                      </select>
                                      <span className="text-sm text-gray-600 whitespace-nowrap">
                                        por página
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-md font-medium text-gray-900 mb-4">
                              Detalle por Tipo de Solicitud
                              <span className="block text-sm font-normal text-gray-600 mt-1">
                                Haz clic en cualquier sección de las barras para ver detalles específicos
                              </span>
                            </h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 tracking-wider">Tipo de Solicitud</th>
                                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 tracking-wider">Cantidad</th>
                                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 tracking-wider">Monto Solicitado</th>
                                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 tracking-wider">IVA</th>
                                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500 tracking-wider">Total Monto Solicitado</th>
                                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 tracking-wider">Porcentaje</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {datosReporte.tiposServicio?.map((tipo: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tipo.tipoServicio}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{tipo.cantidad}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(tipo.montoBase)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(tipo.iva)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(tipo.monto)}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{tipo.porcentaje}%</td>
                                </tr>
                              )) || <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay datos disponibles</td></tr>}
                            </tbody>
                          </table>
                        </div>
                          </div>
                        )}
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

      {/* Modal de Detalles de Solicitud */}
      {solicitudModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-bolivar-green px-8 py-6 rounded-t-2xl">
              <h1 className="text-2xl font-bold text-white text-center">Detalles de la Solicitud</h1>
              <p className="text-sm text-green-100 text-center mt-2">Información completa de la solicitud seleccionada</p>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              
              {/* Información Básica - Número y Fecha de Solicitud */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Información Básica
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📄 Número de Solicitud
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-lg">
                      {solicitudModal.solicitud?.numero_solicitud || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Fecha de Solicitud
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.fecha_solicitud ? 
                        new Date(solicitudModal.solicitud.fecha_solicitud).toLocaleDateString('es-CO') : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado Actual
                    </label>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                      solicitudModal.solicitud?.estado === 'Solicitada' ? 'bg-gray-100 text-gray-800' :
                      solicitudModal.solicitud?.estado === 'Devuelta' ? 'bg-red-100 text-red-800' :
                      solicitudModal.solicitud?.estado === 'Generada' ? 'bg-yellow-100 text-yellow-800' :
                      solicitudModal.solicitud?.estado === 'Aprobada' ? 'bg-blue-100 text-blue-800' :
                      solicitudModal.solicitud?.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {solicitudModal.solicitud?.estado || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Solicitud
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.tipo_solicitud || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de la Solicitud */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Información de la Solicitud
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Fecha Documento de Cobro
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.fecha_cuenta_cobro ? 
                        new Date(solicitudModal.solicitud.fecha_cuenta_cobro).toLocaleDateString('es-CO') : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Concepto
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.concepto || 'N/A'}
                    </div>
                  </div>
                </div>

                {solicitudModal.solicitud?.descripcion && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 min-h-[100px] whitespace-pre-line">
                      {solicitudModal.solicitud.descripcion}
                    </div>
                  </div>
                )}
              </div>

              {/* Información de Empresa */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Información de Empresa
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🏢 Compañía Receptora
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.compania_receptora || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Proveedor/Acreedor
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitudModal.solicitud?.proveedor || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores Financieros */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Valores Financieros
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vr. Solicitud
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">$</span>
                      </div>
                      <div className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-semibold text-green-700">
                        {(solicitudModal.solicitud?.valor_solicitud || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IVA ({(((solicitudModal.solicitud?.iva || 0) / (solicitudModal.solicitud?.valor_solicitud || 1)) * 100).toFixed(1)}%)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">$</span>
                      </div>
                      <div className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-semibold text-blue-700">
                        {(solicitudModal.solicitud?.iva || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Solicitud
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">$</span>
                      </div>
                      <div className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-yellow-50 border-yellow-300 text-gray-900 font-bold text-lg">
                        {(solicitudModal.solicitud?.total_solicitud || 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      (solicitudModal.solicitud?.iva || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(solicitudModal.solicitud?.iva || 0) > 0 ? '✅ Tiene IVA' : 'Sin IVA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentos Anexos */}
              {(solicitudModal.solicitud?.archivo_pdf_url || solicitudModal.solicitud?.archivo_xlsx_url) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Documentos Anexos
                  </h2>
                  
                  <div className="space-y-4">
                    {solicitudModal.solicitud?.archivo_pdf_url && (
                      <div className="flex items-center gap-3 bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">Documento PDF</p>
                          <p className="text-xs text-red-700">
                            {solicitudModal.solicitud?.tipo_solicitud === 'Pago de Servicios Públicos' ? 
                              'Soportes de la solicitud' : 'Cuenta de cobro'
                            }
                          </p>
                        </div>
                        <a
                          href={solicitudModal.solicitud.archivo_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Ver PDF
                        </a>
                      </div>
                    )}

                    {solicitudModal.solicitud?.archivo_xlsx_url && (
                      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Archivo Excel</p>
                          <p className="text-xs text-green-700">
                            {solicitudModal.solicitud?.tipo_solicitud === 'Pago de Servicios Públicos' ? 
                              'Soportes adicionales' : 'Archivo de distribuciones'
                            }
                          </p>
                        </div>
                        <a
                          href={solicitudModal.solicitud.archivo_xlsx_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Ver Excel
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-white px-8 py-6 rounded-b-2xl border-t border-gray-200">
              <div className="flex justify-center">
                <button
                  onClick={() => setSolicitudModal({ isOpen: false, solicitud: null })}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
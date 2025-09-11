'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { OrdenPago, getDashboardStats, getOrdenesRecientes, formatDate, formatCurrency, getEstadoColor, getEstadoLabel } from '@/lib/dashboard-data'
import { getCurrentUserProfile } from '@/lib/auth'
import { UserProfile } from '@/lib/database.types'
import '@/styles/table-scroll.css'

type SortField = keyof OrdenPago
type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField
  direction: SortDirection
}

type DateFilterType = 'fecha_solicitud' | 'fecha_op' | 'fecha_pago'

interface FilterState {
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

export default function Dashboard() {
  const [allOrdenes, setAllOrdenes] = useState<OrdenPago[]>([])
  const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenPago[]>([])
  const [ordenesRecientes, setOrdenesRecientes] = useState<OrdenPago[]>([])
  const [stats, setStats] = useState({
    totalOrdenes: 0,
    montoTotal: 0,
    montoBase: 0,
    totalIva: 0,
    estadisticas: {} as any
  })
  const [loading, setLoading] = useState(true)
  const [availableProveedores, setAvailableProveedores] = useState<string[]>([])
  const [availableEstados, setAvailableEstados] = useState<string[]>([])
  const [availableCompanias, setAvailableCompanias] = useState<string[]>([])
  const [availableConceptos, setAvailableConceptos] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  
  // Estados para funcionalidades avanzadas
  const [sortState, setSortState] = useState<SortState>({ field: 'fecha_solicitud', direction: 'desc' })
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: '', to: '', tipo: 'fecha_solicitud' },
    proveedores: [],
    estados: [],
    companiasReceptoras: [],
    conceptos: [],
    montoRange: { min: null, max: null }
  })

  // Función para detectar scroll horizontal
  const checkHorizontalScroll = useCallback(() => {
    const container = document.querySelector('.table-scroll-container')
    if (container) {
      const hasScroll = container.scrollWidth > container.clientWidth
      if (hasScroll) {
        container.classList.add('has-scroll')
      } else {
        container.classList.remove('has-scroll')
      }
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const [ordenesData, statsData, userProfile] = await Promise.all([
        getOrdenesRecientes(),
        getDashboardStats(),
        getCurrentUserProfile()
      ])
      
      setAllOrdenes(ordenesData)
      setStats(statsData)
      setCurrentUser(userProfile)
      
      // Extraer valores únicos para filtros
      const uniqueProveedores = Array.from(new Set(ordenesData.map((orden: OrdenPago) => orden.proveedor))).sort()
      const uniqueEstados = Array.from(new Set(ordenesData.map((orden: OrdenPago) => orden.estado))).sort()
      const uniqueCompanias = Array.from(new Set(ordenesData.map((orden: OrdenPago) => orden.compania_receptora).filter(Boolean))).sort()
      const uniqueConceptos = Array.from(new Set(ordenesData.map((orden: OrdenPago) => orden.concepto))).sort()
      
      setAvailableProveedores(uniqueProveedores as string[])
      setAvailableEstados(uniqueEstados as string[])
      setAvailableCompanias(uniqueCompanias as string[])
      setAvailableConceptos(uniqueConceptos as string[])
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar estadísticas con filtros
  const updateStatsWithFilters = useCallback(async (currentFilters: FilterState) => {
    try {
      // Solo actualizar si hay filtros aplicados
      const hasFilters = currentFilters.dateRange.from || 
                        currentFilters.dateRange.to || 
                        currentFilters.proveedores.length > 0 || 
                        currentFilters.estados.length > 0 ||
                        currentFilters.companiasReceptoras.length > 0 ||
                        currentFilters.conceptos.length > 0 ||
                        currentFilters.montoRange.min !== null ||
                        currentFilters.montoRange.max !== null ||
                        currentFilters.dateRange.tipo !== 'fecha_solicitud' // Considerar cambio de tipo como filtro

      if (hasFilters) {
        const filteredStats = await getDashboardStats(currentFilters)
        setStats(filteredStats)
      } else {
        // Sin filtros, cargar estadísticas completas
        const allStats = await getDashboardStats()
        setStats(allStats)
      }
    } catch (error) {
      console.error('Error actualizando estadísticas:', error)
    }
  }, [])

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Verificar scroll horizontal cuando cambie la data o el tamaño de ventana
  useEffect(() => {
    checkHorizontalScroll()
    
    // Agregar listener para resize
    const handleResize = () => {
      checkHorizontalScroll()
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [checkHorizontalScroll, ordenesRecientes, loading])

  // También verificar scroll después de que la tabla se renderice
  useEffect(() => {
    const timer = setTimeout(() => {
      checkHorizontalScroll()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [checkHorizontalScroll, ordenesRecientes])

  // Aplicar filtros, búsqueda, ordenamiento y paginación
  useEffect(() => {
    let filtered = [...allOrdenes]

    // Aplicar filtros de fecha - AJUSTADO PARA COLOMBIA (UTC-5)
    if (filters.dateRange.from || filters.dateRange.to) {
      console.log(`🔍 Frontend: Filtrando por campo '${filters.dateRange.tipo}' con rango: ${filters.dateRange.from} - ${filters.dateRange.to}`)
    }
    
    if (filters.dateRange.from) {
      const fechaDesde = new Date(filters.dateRange.from + 'T00:00:00-05:00')
      filtered = filtered.filter(orden => {
        const fechaOrden = new Date(orden[filters.dateRange.tipo])
        return fechaOrden >= fechaDesde
      })
    }
    if (filters.dateRange.to) {
      const fechaHasta = new Date(filters.dateRange.to + 'T23:59:59-05:00')
      filtered = filtered.filter(orden => {
        const fechaOrden = new Date(orden[filters.dateRange.tipo])
        return fechaOrden <= fechaHasta
      })
    }

    // Aplicar filtros de proveedores
    if (filters.proveedores.length > 0) {
      filtered = filtered.filter(orden => 
        filters.proveedores.includes(orden.proveedor)
      )
    }

    // Aplicar filtros de estados
    if (filters.estados.length > 0) {
      filtered = filtered.filter(orden => 
        filters.estados.includes(orden.estado)
      )
    }

    // Aplicar filtros de compañías receptoras
    if (filters.companiasReceptoras.length > 0) {
      filtered = filtered.filter(orden => 
        orden.compania_receptora && filters.companiasReceptoras.includes(orden.compania_receptora)
      )
    }

    // Aplicar filtros de conceptos
    if (filters.conceptos.length > 0) {
      filtered = filtered.filter(orden => 
        filters.conceptos.includes(orden.concepto)
      )
    }

    // Aplicar filtros de rango de montos
    if (filters.montoRange.min !== null || filters.montoRange.max !== null) {
      filtered = filtered.filter(orden => {
        const monto = orden.monto_solicitud
        const minOk = filters.montoRange.min === null || monto >= filters.montoRange.min
        const maxOk = filters.montoRange.max === null || monto <= filters.montoRange.max
        return minOk && maxOk
      })
    }

    // Aplicar búsqueda
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(orden => 
        orden.numero_solicitud.toLowerCase().includes(searchLower) ||
        orden.proveedor.toLowerCase().includes(searchLower) ||
        orden.concepto.toLowerCase().includes(searchLower) ||
        orden.estado.toLowerCase().includes(searchLower) ||
        (orden.compania_receptora && orden.compania_receptora.toLowerCase().includes(searchLower)) ||
        (orden.numero_op && orden.numero_op.toLowerCase().includes(searchLower))
      )
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let aVal = a[sortState.field]
      let bVal = b[sortState.field]
      
      // Manejar valores null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortState.direction === 'asc' ? -1 : 1
      if (bVal == null) return sortState.direction === 'asc' ? 1 : -1
      
      // Comparación normal
      if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1
      return 0
    })

    // Aplicar orden secundario por numero_solicitud si no es el campo principal
    if (sortState.field !== 'numero_solicitud') {
      filtered.sort((a, b) => {
        // Mantener el orden principal
        let aVal = a[sortState.field]
        let bVal = b[sortState.field]
        
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortState.direction === 'asc' ? -1 : 1
        if (bVal == null) return sortState.direction === 'asc' ? 1 : -1
        
        if (aVal !== bVal) {
          if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1
          if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1
        }
        
        // Orden secundario por numero_solicitud desc
        return b.numero_solicitud.localeCompare(a.numero_solicitud)
      })
    }

    setFilteredOrdenes(filtered)

    // Aplicar paginación (si pageSize es 0, mostrar todos)
    if (pageSize === 0) {
      setOrdenesRecientes(filtered)
      } else {
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = startIndex + pageSize
      setOrdenesRecientes(filtered.slice(startIndex, endIndex))
    }

    // Actualizar estadísticas cuando cambien los filtros
    updateStatsWithFilters(filters)

  }, [allOrdenes, searchText, sortState, currentPage, pageSize, filters, updateStatsWithFilters])

  // Resetear página al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, sortState, pageSize, filters])

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getSortIcon = (field: SortField) => {
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

  // Componente de filtro multiselección
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

  // Cálculos de paginación
  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredOrdenes.length / pageSize)
  const startRecord = filteredOrdenes.length > 0 ? 
    (pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1) : 0
  const endRecord = pageSize === 0 ? 
    filteredOrdenes.length : Math.min(currentPage * pageSize, filteredOrdenes.length)

  const getEstadoBadge = (estado: OrdenPago['estado']) => {
    const colors = getEstadoColor(estado)
    const label = getEstadoLabel(estado)
    
    return {
      style: `${colors.bg} ${colors.text} ${colors.border}`,
      label: label
    }
  }

  return (
    <div className="bg-gray-50">
      {/* Stats principales - Total y Monto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-medium text-blue-700 mb-1">Total solicitudes</h3>
          <p className="text-2xl font-bold text-blue-900">{loading ? '...' : stats.totalOrdenes}</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-medium text-green-700 mb-1">Monto Solicitado</h3>
          <p className="text-2xl font-bold text-green-900">{loading ? '...' : formatCurrency(stats.montoBase)}</p>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-medium text-orange-700 mb-1">IVA</h3>
          <p className="text-2xl font-bold text-orange-900">{loading ? '...' : formatCurrency(stats.totalIva)}</p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <h3 className="text-sm font-medium text-purple-700 mb-1">Total Monto Solicitado</h3>
          <p className="text-2xl font-bold text-purple-900">{loading ? '...' : formatCurrency(stats.montoTotal)}</p>
        </div>
      </div>

      {/* Cards compactas de estadísticas por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
          {/* Card Solicitadas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-md">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {loading ? '...' : (stats.estadisticas.Solicitada?.cantidad || 0)}
                  </h3>
                  <p className="text-gray-600 text-xs">Solicitadas</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">
                  {loading ? '...' : `${stats.estadisticas.Solicitada?.porcentaje || 0}%`}
                </span>
                <p className="text-gray-600 text-xs">Del total</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">Monto Solicitado:</span>
                <span className="text-gray-600 text-xs">
                  {loading ? '...' : formatCurrency(stats.estadisticas.Solicitada?.montoBase || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">IVA:</span>
                <span className="text-gray-600 text-xs">
                  {loading ? '...' : formatCurrency(stats.estadisticas.Solicitada?.iva || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">Total Monto Solicitado:</span>
                <span className="text-gray-600 text-xs font-medium">
                  {loading ? '...' : formatCurrency(stats.estadisticas.Solicitada?.monto || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Card Devueltas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-red-100 p-2 rounded-md">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {loading ? '...' : `${stats.estadisticas.Devuelta?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.Devuelta?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Devueltas</p>
            <p className="text-red-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.Devuelta?.monto || 0)}
            </p>
          </div>

          {/* Card Generadas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-yellow-100 p-2 rounded-md">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {loading ? '...' : `${stats.estadisticas.Generada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.Generada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Generadas</p>
            <p className="text-yellow-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.Generada?.monto || 0)}
            </p>
          </div>

          {/* Card Aprobadas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 p-2 rounded-md">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {loading ? '...' : `${stats.estadisticas.Aprobada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.Aprobada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Aprobadas</p>
            <p className="text-green-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.Aprobada?.monto || 0)}
            </p>
          </div>

          {/* Card Pagadas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-emerald-100 p-2 rounded-md">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {loading ? '...' : `${stats.estadisticas.Pagada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.Pagada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Pagadas</p>
            <p className="text-emerald-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.Pagada?.monto || 0)}
            </p>
          </div>
      </div>


      {/* Tabla optimizada con controles integrados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          {/* Controles organizados: Filtros izquierda, Búsqueda y paginación derecha */}
          <div className="flex justify-between items-start gap-6">
            {/* Panel izquierdo: Solo filtros de período */}
            <div className="flex items-center gap-4">
              {/* Período de consulta */}
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Período de consulta
              </label>
              
              {/* Option Group para tipo de fecha - Estilo Radio Buttons */}
              <div className="flex items-center gap-4">
                {[
                  { value: 'fecha_solicitud', label: 'Fecha Solicitud' },
                  { value: 'fecha_op', label: 'Fecha OP' },
                  { value: 'fecha_pago', label: 'Fecha Pago' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="radio"
                        name="dateFilterType"
                        value={option.value}
                        checked={filters.dateRange.tipo === option.value}
                        onChange={() => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, tipo: option.value as DateFilterType } 
                        }))}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        filters.dateRange.tipo === option.value
                          ? 'border-bolivar-green bg-bolivar-green'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {filters.dateRange.tipo === option.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              
              {/* Campos de fecha Desde y Hasta */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-600 whitespace-nowrap">Desde</label>
                  <input
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, from: e.target.value } 
                    }))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green w-36"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-sm text-gray-600 whitespace-nowrap">Hasta</label>
                  <input
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, to: e.target.value } 
                    }))}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green w-36"
                  />
                </div>
                {/* Botón limpiar fechas */}
                {(filters.dateRange.from || filters.dateRange.to) && (
                  <button
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, from: '', to: '' } 
                    }))}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                    title="Limpiar fechas"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            {/* Panel derecho: Búsqueda y controles de paginación */}
            <div className="flex items-center gap-4">
              {/* Campo de búsqueda */}
              <div className="flex items-center gap-3">
                <label htmlFor="search-field" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Buscar
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="search-field"
                    type="text"
                    placeholder="Busque cualquier información dentro de la tabla de datos"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green w-[336px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-scroll-container relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolivar-green"></div>
              <span className="ml-3 text-gray-600">Cargando órdenes...</span>
            </div>
          ) : ordenesRecientes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">No se encontraron órdenes con los filtros aplicados</p>
              <p className="text-gray-400 text-sm mt-1">Intenta ajustar los filtros o crear una nueva orden</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('fecha_solicitud')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-[120px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Fecha</div>
                        <div>Solicitud</div>
                      </div>
                      {getSortIcon('fecha_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('numero_solicitud')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">No.Solicitud</div>
                      {getSortIcon('numero_solicitud')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-[200px]"
                  >
                    <div className="space-y-2">
                      <div 
                        onClick={() => handleSort('compania_receptora')}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                      >
                        <div className="capitalize">
                          <div>Compañía</div>
                          <div>Receptora</div>
                        </div>
                        {getSortIcon('compania_receptora')}
                      </div>
                      <MultiSelectFilter
                        options={availableCompanias}
                        selectedValues={filters.companiasReceptoras}
                        onChange={(values) => setFilters(prev => ({ ...prev, companiasReceptoras: values }))}
                        placeholder="Filtrar..."
                        maxDisplay={1}
                      />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-[180px]"
                  >
                    <div className="space-y-2">
                      <div 
                        onClick={() => handleSort('proveedor')}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                      >
                        <div className="capitalize">Proveedor</div>
                        {getSortIcon('proveedor')}
                      </div>
                      <MultiSelectFilter
                        options={availableProveedores}
                        selectedValues={filters.proveedores}
                        onChange={(values) => setFilters(prev => ({ ...prev, proveedores: values }))}
                        placeholder="Filtrar..."
                        maxDisplay={1}
                      />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-[220px]"
                  >
                    <div className="space-y-2">
                      <div 
                        onClick={() => handleSort('concepto')}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                      >
                        <div className="capitalize">Concepto</div>
                        {getSortIcon('concepto')}
                      </div>
                      <MultiSelectFilter
                        options={availableConceptos}
                        selectedValues={filters.conceptos}
                        onChange={(values) => setFilters(prev => ({ ...prev, conceptos: values }))}
                        placeholder="Filtrar..."
                        maxDisplay={1}
                      />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('monto_solicitud')}
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors w-[140px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Monto</div>
                        <div>Solicitud</div>
                      </div>
                      {getSortIcon('monto_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('iva')}
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">Iva</div>
                      {getSortIcon('iva')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total_solicitud')}
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[100px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Total</div>
                        <div>Solicitud</div>
                      </div>
                      {getSortIcon('total_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_op')}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Fecha</div>
                        <div>Op</div>
                      </div>
                      {getSortIcon('fecha_op')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('numero_op')}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[100px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">No.Op</div>
                      {getSortIcon('numero_op')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_aprobada')}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Fecha</div>
                        <div>Aprobada</div>
                      </div>
                      {getSortIcon('fecha_aprobada')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_pago')}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="capitalize">
                        <div>Fecha</div>
                        <div>Pago</div>
                      </div>
                      {getSortIcon('fecha_pago')}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 min-w-[130px]"
                  >
                    <div className="space-y-2">
                      <div 
                        onClick={() => handleSort('estado')}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors p-1 rounded"
                      >
                        <div className="capitalize">Estado</div>
                        {getSortIcon('estado')}
                      </div>
                      <MultiSelectFilter
                        options={availableEstados}
                        selectedValues={filters.estados}
                        onChange={(values) => setFilters(prev => ({ ...prev, estados: values }))}
                        placeholder="Filtrar..."
                        maxDisplay={1}
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 min-w-[90px]">
                    Anexos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordenesRecientes.map((orden) => {
                  const badge = getEstadoBadge(orden.estado)
                  return (
                    <tr key={orden.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(orden.fecha_solicitud)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900">{orden.numero_solicitud}</div>
                      </td>
                      <td className="px-3 py-3 max-w-[140px]">
                        <div className="text-xs text-gray-900 truncate" title={orden.compania_receptora || 'No especificado'}>
                          {orden.compania_receptora?.replace('NT-', '').split('-')[1] || 'No especificado'}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[130px]">
                        <div className="text-xs text-gray-900 truncate" title={orden.proveedor}>
                          {orden.proveedor}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <div className="text-xs text-gray-900 truncate" title={orden.concepto}>
                          {orden.concepto}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900 text-right">
                        {formatCurrency(orden.monto_solicitud).replace('$ ', '$')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 text-right">
                        {orden.iva ? formatCurrency(orden.iva).replace('$ ', '$') : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="text-xs font-medium text-gray-900">
                          {formatCurrency(orden.total_solicitud).replace('$ ', '$')}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {orden.fecha_op ? formatDate(orden.fecha_op) : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">
                        {orden.numero_op || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {orden.fecha_aprobada ? formatDate(orden.fecha_aprobada) : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {orden.fecha_pago ? formatDate(orden.fecha_pago) : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-start space-x-2 min-w-[60px]">
                          {/* Icono PDF siempre a la izquierda */}
                          <div className="flex-shrink-0">
                            {orden.archivo_pdf_url ? (
                              <div className="relative group">
                                <a
                                  href={orden.archivo_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-6 h-6 text-red-600 hover:text-red-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    <path d="M9.5,12.5C9.5,13.3 10.2,14 11,14H12V15.5H9.5V17H12A1.5,1.5 0 0,0 13.5,15.5V14A1.5,1.5 0 0,0 12,12.5H11V11H13.5V9.5H11A1.5,1.5 0 0,0 9.5,11V12.5Z" />
                                    <rect x="15" y="10" width="1" height="7" />
                                    <rect x="6.5" y="10" width="1.5" height="7" />
                                  </svg>
                                </a>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Cuenta de Cobro
                                </div>
                              </div>
                            ) : (
                              <div className="w-6 h-6">{/* Espacio reservado para mantener alineación */}</div>
                            )}
                          </div>
                          
                          {/* Icono Excel a la derecha del PDF */}
                          <div className="flex-shrink-0">
                            {orden.ind_distribuciones === 'S' && orden.archivo_xlsx_url && (
                              <div className="relative group">
                                <a
                                  href={orden.archivo_xlsx_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center w-6 h-6 text-green-600 hover:text-green-700 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    <path d="M11.5,16L10.75,14.5H9.25L8.5,16H7.25L9.5,11H10.5L12.75,16H11.5M10.13,13H9.88L9.25,14.25H10.75L10.13,13Z" />
                                    <rect x="15.5" y="11.5" width="2" height="0.5" />
                                    <rect x="15.5" y="12.5" width="2" height="0.5" />
                                    <rect x="15.5" y="13.5" width="2" height="0.5" />
                                    <rect x="15.5" y="14.5" width="2" height="0.5" />
                                  </svg>
                                </a>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Distribuciones
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Mostrar guión centrado si no hay ningún anexo */}
                          {!orden.archivo_pdf_url && !(orden.ind_distribuciones === 'S' && orden.archivo_xlsx_url) && (
                            <div className="w-full text-center">
                              <span className="text-xs text-gray-400">-</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          
          {/* Controles de paginación */}
          {filteredOrdenes.length > 0 && totalPages > 1 && pageSize > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Indicador de registros mostrados */}
                  <div className="text-sm text-gray-600 mr-4">
                    Mostrando {startRecord} a {endRecord} registros de {filteredOrdenes.length}
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
                  
                  {/* Controles de paginación movidos desde la parte superior */}
                  <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green"
                    >
                      <option value={10}>10</option>
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
      </div>
    </div>
  )
}

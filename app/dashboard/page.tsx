'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { OrdenPago, getDashboardStats, getOrdenesRecientes, formatDate, formatCurrency, getEstadoColor, getEstadoLabel } from '@/lib/dashboard-data'
import DashboardFilters from '@/components/DashboardFilters'
import { getCurrentUserProfile } from '@/lib/auth'
import { UserProfile } from '@/lib/database.types'

type SortField = keyof OrdenPago
type SortDirection = 'asc' | 'desc'

interface SortState {
  field: SortField
  direction: SortDirection
}

interface FilterState {
  dateRange: {
    from: string
    to: string
  }
  proveedores: string[]
  estados: string[]
}

export default function Dashboard() {
  const [allOrdenes, setAllOrdenes] = useState<OrdenPago[]>([])
  const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenPago[]>([])
  const [ordenesRecientes, setOrdenesRecientes] = useState<OrdenPago[]>([])
  const [stats, setStats] = useState({
    totalOrdenes: 0,
    montoTotal: 0,
    estadisticas: {} as any
  })
  const [loading, setLoading] = useState(true)
  const [availableProveedores, setAvailableProveedores] = useState<string[]>([])
  const [availableEstados, setAvailableEstados] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  
  // Estados para funcionalidades avanzadas
  const [sortState, setSortState] = useState<SortState>({ field: 'fecha_solicitud', direction: 'desc' })
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { from: '', to: '' },
    proveedores: [],
    estados: []
  })

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
      
      setAvailableProveedores(uniqueProveedores as string[])
      setAvailableEstados(uniqueEstados as string[])
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData()
  }, [])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    loadDashboardData()
  }, [filters])

  // Aplicar búsqueda, ordenamiento y paginación
  useEffect(() => {
    let filtered = [...allOrdenes]

    // Aplicar búsqueda
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(orden => 
        orden.numero_solicitud.toLowerCase().includes(searchLower) ||
        orden.proveedor.toLowerCase().includes(searchLower) ||
        orden.concepto.toLowerCase().includes(searchLower) ||
        orden.estado.toLowerCase().includes(searchLower) ||
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

    // Aplicar paginación
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setOrdenesRecientes(filtered.slice(startIndex, endIndex))

  }, [allOrdenes, searchText, sortState, currentPage, pageSize])

  // Resetear página al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, sortState, pageSize])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

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

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredOrdenes.length / pageSize)
  const startRecord = filteredOrdenes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endRecord = Math.min(currentPage * pageSize, filteredOrdenes.length)

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
      {/* Filtros compactos */}
      <DashboardFilters
        onFiltersChange={handleFiltersChange}
        availableProveedores={availableProveedores}
        availableEstados={availableEstados}
      />

      {/* Cards compactas de estadísticas por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
          {/* Card Solicitadas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-blue-100 p-2 rounded-md">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {loading ? '...' : `${stats.estadisticas.solicitada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.solicitada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Solicitadas</p>
            <p className="text-blue-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.solicitada?.monto || 0)}
            </p>
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
                {loading ? '...' : `${stats.estadisticas.devuelta?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.devuelta?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Devueltas</p>
            <p className="text-red-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.devuelta?.monto || 0)}
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
                {loading ? '...' : `${stats.estadisticas.generada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.generada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Generadas</p>
            <p className="text-yellow-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.generada?.monto || 0)}
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
                {loading ? '...' : `${stats.estadisticas.aprobada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.aprobada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Aprobadas</p>
            <p className="text-green-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.aprobada?.monto || 0)}
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
                {loading ? '...' : `${stats.estadisticas.pagada?.porcentaje || 0}%`}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {loading ? '...' : (stats.estadisticas.pagada?.cantidad || 0)}
            </h3>
            <p className="text-gray-600 text-xs mb-1">Pagadas</p>
            <p className="text-emerald-600 text-xs font-medium">
              {loading ? '...' : formatCurrency(stats.estadisticas.pagada?.monto || 0)}
            </p>
          </div>
      </div>

      {/* Stats principales en línea */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <div className="text-bolivar-green text-xl font-bold">
            {loading ? '...' : stats.totalOrdenes}
          </div>
          <div className="text-gray-600 text-xs">Total Órdenes</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <div className="text-bolivar-green text-lg font-bold">
            {loading ? '...' : formatCurrency(stats.montoTotal)}
          </div>
          <div className="text-gray-600 text-xs">Monto Total</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <div className="text-gray-700 text-sm font-medium">
            {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="text-gray-600 text-xs">
            {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Tabla optimizada con controles integrados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            {/* Título y acciones rápidas */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Listado de Solicitudes
                {filters.dateRange.from || filters.dateRange.to || filters.proveedores.length > 0 || filters.estados.length > 0 ? ' (Filtradas)' : ''}
              </h2>
              
              {/* Acciones rápidas integradas */}
              <div className="flex gap-2">
                {/* Botón Nueva Solicitud - Solo visible para perfil OperacionTRIB */}
                {currentUser?.role === 'OperacionTRIB' && (
                  <Link href="/dashboard/ordenes/nueva" className="inline-flex items-center px-3 py-1.5 bg-bolivar-green text-white rounded-md text-sm hover:bg-bolivar-green-700 transition-colors">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nueva Solicitud de OP
                  </Link>
                )}
                <Link href="/dashboard/reportes" className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Reportes
                </Link>
              </div>
            </div>
            
            {/* Controles de búsqueda y paginación */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Campo de búsqueda */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green w-48"
                />
              </div>
              
              {/* Selector de registros por página y contador */}
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {filteredOrdenes.length > 0 ? (
                    `${startRecord}-${endRecord} de ${filteredOrdenes.length}`
                  ) : (
                    'Sin resultados'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div>Fecha</div>
                        <div>Sol.</div>
                      </div>
                      {getSortIcon('fecha_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('numero_solicitud')}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[100px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div>No.</div>
                        <div>Sol.</div>
                      </div>
                      {getSortIcon('numero_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('proveedor')}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[120px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>Proveedor</div>
                      {getSortIcon('proveedor')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('concepto')}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>Concepto</div>
                      {getSortIcon('concepto')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('monto_solicitud')}
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div>Monto</div>
                        <div>Sol.</div>
                      </div>
                      {getSortIcon('monto_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('iva')}
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[70px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>IVA</div>
                      {getSortIcon('iva')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total_solicitud')}
                    className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>Total</div>
                      {getSortIcon('total_solicitud')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fecha_op')}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[80px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div>Fecha</div>
                        <div>OP</div>
                      </div>
                      {getSortIcon('fecha_op')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('numero_op')}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div>No.</div>
                        <div>OP</div>
                      </div>
                      {getSortIcon('numero_op')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('estado')}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors min-w-[90px]"
                  >
                    <div className="flex items-center justify-between">
                      <div>Estado</div>
                      {getSortIcon('estado')}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase min-w-[60px]">
                    <div>Anexos</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordenesRecientes.map((orden) => {
                  const badge = getEstadoBadge(orden.estado)
                  return (
                    <tr key={orden.id} className="hover:bg-gray-50 transition-colors">
                      {/* 1. Fecha Solicitud */}
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(orden.fecha_solicitud)}
                      </td>
                      {/* 2. Número Solicitud */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs font-medium text-gray-900">{orden.numero_solicitud}</div>
                      </td>
                      {/* 3. Proveedor */}
                      <td className="px-2 py-2 max-w-[120px]">
                        <div className="text-xs text-gray-900 truncate" title={orden.proveedor}>
                          {orden.proveedor}
                        </div>
                      </td>
                      {/* 4. Concepto */}
                      <td className="px-2 py-2 max-w-[150px]">
                        <div className="text-xs text-gray-900 truncate" title={orden.concepto}>
                          {orden.concepto}
                        </div>
                      </td>
                      {/* 5. Monto Solicitud */}
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 text-right">
                        {formatCurrency(orden.monto_solicitud).replace('$ ', '$')}
                      </td>
                      {/* 6. IVA */}
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                        {formatCurrency(orden.iva).replace('$ ', '$')}
                      </td>
                      {/* 7. Total Solicitud */}
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <div className="text-xs font-medium text-gray-900">
                          {formatCurrency(orden.total_solicitud).replace('$ ', '$')}
                        </div>
                      </td>
                      {/* 8. Fecha OP */}
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                        {orden.fecha_op ? formatDate(orden.fecha_op) : '-'}
                      </td>
                      {/* 9. Número OP */}
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-600">
                        {orden.numero_op || '-'}
                      </td>
                      {/* 10. Estado */}
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded border ${badge.style}`}>
                          {badge.label}
                        </span>
                      </td>
                      {/* 11. Anexos */}
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <button className="text-bolivar-green hover:text-bolivar-green-700 p-0.5 rounded hover:bg-gray-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          
          {/* Controles de paginación */}
          {filteredOrdenes.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Información de paginación */}
                <div className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </div>
                
                {/* Controles de navegación */}
                <div className="flex items-center space-x-2">
                  {/* Botón Anterior */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  
                  {/* Números de página */}
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
                  
                  {/* Botón Siguiente */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
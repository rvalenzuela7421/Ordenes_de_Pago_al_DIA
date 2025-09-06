'use client'

import { useState } from 'react'

interface FilterState {
  dateRange: {
    from: string
    to: string
  }
  proveedores: string[]
  estados: string[]
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  availableProveedores: string[]
  availableEstados: string[]
}

const ESTADOS_LABELS = {
  'Solicitada': 'Solicitada',
  'Devuelta': 'Devuelta', 
  'Generada': 'Generada',
  'Aprobada': 'Aprobada',
  'Pagada': 'Pagada'
}

export default function DashboardFilters({ 
  onFiltersChange, 
  availableProveedores, 
  availableEstados 
}: DashboardFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: '',
      to: ''
    },
    proveedores: [],
    estados: []
  })

  const [showProveedoresDropdown, setShowProveedoresDropdown] = useState(false)
  const [showEstadosDropdown, setShowEstadosDropdown] = useState(false)

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleProveedorToggle = (proveedor: string) => {
    const newProveedores = filters.proveedores.includes(proveedor)
      ? filters.proveedores.filter(p => p !== proveedor)
      : [...filters.proveedores, proveedor]
    
    const newFilters = {
      ...filters,
      proveedores: newProveedores
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleEstadoToggle = (estado: string) => {
    const newEstados = filters.estados.includes(estado)
      ? filters.estados.filter(e => e !== estado)
      : [...filters.estados, estado]
    
    const newFilters = {
      ...filters,
      estados: newEstados
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters = {
      dateRange: { from: '', to: '' },
      proveedores: [],
      estados: []
    }
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    setShowProveedoresDropdown(false)
    setShowEstadosDropdown(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2">
      <div className="flex flex-wrap items-center gap-3">
        {/* Fechas compactas en línea */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Desde:</label>
          <input
            type="date"
            value={filters.dateRange.from}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs w-28 focus:ring-1 focus:ring-bolivar-green focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Hasta:</label>
          <input
            type="date"
            value={filters.dateRange.to}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs w-28 focus:ring-1 focus:ring-bolivar-green focus:border-transparent"
          />
        </div>

        {/* Separador visual */}
        <div className="h-6 w-px bg-gray-300"></div>

        {/* Proveedores compacto */}
        <div className="relative">
          <button
            onClick={() => setShowProveedoresDropdown(!showProveedoresDropdown)}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:ring-1 focus:ring-bolivar-green focus:border-transparent min-w-[360px] text-left"
          >
            <span>
              {filters.proveedores.length === 0 
                ? 'Proveedores...' 
                : filters.proveedores.length === 1
                ? filters.proveedores[0].substring(0, 12) + '...'
                : `${filters.proveedores.length} proveedores`
              }
            </span>
            <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showProveedoresDropdown && (
            <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
              <div className="p-1">
                {availableProveedores.map((proveedor) => (
                  <label key={proveedor} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded text-xs">
                    <input
                      type="checkbox"
                      checked={filters.proveedores.includes(proveedor)}
                      onChange={() => handleProveedorToggle(proveedor)}
                      className="rounded border-gray-300 text-bolivar-green focus:ring-bolivar-green"
                    />
                    <span className="text-gray-700">{proveedor}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estados compacto */}
        <div className="relative">
          <button
            onClick={() => setShowEstadosDropdown(!showEstadosDropdown)}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:ring-1 focus:ring-bolivar-green focus:border-transparent min-w-[280px] text-left"
          >
            <span>
              {filters.estados.length === 0 
                ? 'Estados...' 
                : filters.estados.length === 1
                ? ESTADOS_LABELS[filters.estados[0] as keyof typeof ESTADOS_LABELS]
                : `${filters.estados.length} estados`
              }
            </span>
            <svg className="inline ml-1 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showEstadosDropdown && (
            <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
              <div className="p-1">
                {availableEstados.map((estado) => (
                  <label key={estado} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded text-xs">
                    <input
                      type="checkbox"
                      checked={filters.estados.includes(estado)}
                      onChange={() => handleEstadoToggle(estado)}
                      className="rounded border-gray-300 text-bolivar-green focus:ring-bolivar-green"
                    />
                    <span className="text-gray-700">{ESTADOS_LABELS[estado as keyof typeof ESTADOS_LABELS]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Spacer para empujar botón limpiar a la derecha */}
        <div className="flex-1"></div>

        {/* Botón limpiar filtros */}
        <button
          onClick={clearFilters}
          className="px-3 py-1 text-xs text-gray-600 hover:text-bolivar-green border border-gray-300 rounded hover:border-bolivar-green transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}

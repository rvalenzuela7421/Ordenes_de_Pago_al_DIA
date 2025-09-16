'use client'

import { useState, useEffect } from 'react'
import { getTodosLosParametros, getEstadisticasParametros } from '../../lib/parametros-data'
import type { Parametro } from '../../lib/parametros-data'

interface EstadisticasParametros {
  totalParametros: number
  parametrosVigentes: number
  parametrosNoVigentes: number
  totalGrupos: number
  gruposPorEstadistica: { grupo: string, total: number, vigentes: number }[]
  error?: string
}

export default function AdministracionPage() {
  // Estados para datos
  const [parametros, setParametros] = useState<Parametro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadisticas, setEstadisticas] = useState<EstadisticasParametros | null>(null)

  // Estados para filtros y paginación
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [incluirNoVigentes, setIncluirNoVigentes] = useState(true)

  // Estados para el modal de nuevo parámetro
  const [showNuevoParametroModal, setShowNuevoParametroModal] = useState(false)
  const [creandoParametro, setCreandoParametro] = useState(false)
  const [nuevoParametro, setNuevoParametro] = useState({
    nombre_grupo: '',
    descripcion_grupo: '',
    valor_dominio: '',
    regla: '',
    orden: ''
  })

  // Cargar parámetros
  const loadParametros = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Ejecutando búsqueda con:', {
        searchText,
        incluirNoVigentes,
        currentPage,
        pageSize
      })

      const result = await getTodosLosParametros(
        incluirNoVigentes,
        debouncedSearchText,
        currentPage,
        pageSize
      )

      console.log('📊 Resultado de búsqueda:', {
        encontrados: result.parametros.length,
        total: result.totalCount,
        searchText: debouncedSearchText,
        grupos: result.grupos
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setParametros(result.parametros)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)

    } catch (err) {
      console.error('Error cargando parámetros:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setParametros([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar estadísticas
  const loadEstadisticas = async () => {
    try {
      const stats = await getEstadisticasParametros()
      setEstadisticas(stats)
    } catch (err) {
      console.error('Error cargando estadísticas:', err)
    }
  }

  // Debounce para el texto de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText)
    }, 500) // Espera 500ms después de que el usuario pare de escribir

    return () => clearTimeout(timer)
  }, [searchText])

  // Cargar datos al montar y cuando cambien filtros
  useEffect(() => {
    loadParametros()
  }, [debouncedSearchText, currentPage, pageSize, incluirNoVigentes])

  // Cargar estadísticas al montar
  useEffect(() => {
    loadEstadisticas()
  }, [])

  // Reset a primera página cuando cambie el texto de búsqueda
  useEffect(() => {
    if (debouncedSearchText !== '') {
      setCurrentPage(1)
    }
  }, [debouncedSearchText])

  // Limpiar filtros
  const handleLimpiar = () => {
    setSearchText('')
    setDebouncedSearchText('')
    setCurrentPage(1)
    setIncluirNoVigentes(true)
    // loadParametros se ejecutará automáticamente por el useEffect
  }

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // Manejar cambios en el formulario de nuevo parámetro
  const handleNuevoParametroChange = (field: string, value: string) => {
    setNuevoParametro(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Limpiar formulario de nuevo parámetro
  const limpiarFormularioParametro = () => {
    setNuevoParametro({
      nombre_grupo: '',
      descripcion_grupo: '',
      valor_dominio: '',
      regla: '',
      orden: ''
    })
  }

  // Función para verificar si todos los campos obligatorios están completos
  const isParametroFormComplete = () => {
    // Verificar campos obligatorios
    if (!nuevoParametro.nombre_grupo.trim()) return false
    if (!nuevoParametro.valor_dominio.trim()) return false
    
    return true
  }

  // Crear nuevo parámetro
  const handleCrearParametro = async () => {
    try {
      setCreandoParametro(true)
      
      // Validaciones básicas
      if (!nuevoParametro.nombre_grupo.trim()) {
        throw new Error('El nombre del grupo es obligatorio')
      }
      if (!nuevoParametro.valor_dominio.trim()) {
        throw new Error('El valor dominio es obligatorio')
      }

      // Preparar datos para envío
      const parametroData = {
        ...nuevoParametro,
        orden: nuevoParametro.orden ? parseInt(nuevoParametro.orden) : 0,
        nombre_grupo: nuevoParametro.nombre_grupo.trim(),
        descripcion_grupo: nuevoParametro.descripcion_grupo.trim() || null,
        valor_dominio: nuevoParametro.valor_dominio.trim(),
        regla: nuevoParametro.regla.trim() || null,
        vigente: 'S' // Siempre crear como Vigente
      }

      console.log('🆕 Creando parámetro:', parametroData)

      const response = await fetch('/api/parametros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parametroData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const resultado = await response.json()
      console.log('✅ Parámetro creado exitosamente:', resultado)

      // Limpiar formulario y cerrar modal
      limpiarFormularioParametro()
      setShowNuevoParametroModal(false)
      
      // Recargar parámetros para mostrar el nuevo
      loadParametros()
      
    } catch (error) {
      console.error('❌ Error creando parámetro:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido al crear parámetro')
    } finally {
      setCreandoParametro(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-3 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Administración
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestión de parámetros del sistema - Solo para administradores
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Parámetros</p>
                  <p className="text-2xl font-semibold text-gray-900">{estadisticas.totalParametros}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Vigentes</p>
                  <p className="text-2xl font-semibold text-green-600">{estadisticas.parametrosVigentes}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">No Vigentes</p>
                  <p className="text-2xl font-semibold text-gray-500">{estadisticas.parametrosNoVigentes}</p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Grupos</p>
                  <p className="text-2xl font-semibold text-bolivar-green">{estadisticas.totalGrupos}</p>
                </div>
                <div className="w-8 h-8 bg-bolivar-green bg-opacity-10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-bolivar-green" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Búsqueda */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <label htmlFor="search" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Buscar
              </label>
              <div className="relative flex-1">
                <input
                  id="search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Busque cualquier información dentro de la tabla de datos"
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                />
                {/* Indicador de búsqueda activa */}
                {searchText !== debouncedSearchText && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-bolivar-green"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtro de vigencia */}
            <div className="flex items-center">
              <label className="flex items-center text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={incluirNoVigentes}
                  onChange={(e) => setIncluirNoVigentes(e.target.checked)}
                  className="rounded border-gray-300 text-bolivar-green focus:ring-bolivar-green"
                />
                <span className="ml-2 text-gray-700">Incluir no vigentes</span>
              </label>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLimpiar}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setShowNuevoParametroModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nuevo Parámetro
              </button>
            </div>
          </div>
          
          {/* Mostrar qué se está buscando - debajo de los controles */}
          {debouncedSearchText && (
            <div className="text-xs text-gray-500 mt-3 pl-0">
              Buscando: "{debouncedSearchText}" ({parametros.length} resultados)
            </div>
          )}
        </div>

        {/* Tabla de parámetros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bolivar-green mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando parámetros...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar parámetros</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadParametros}
                className="px-4 py-2 bg-bolivar-green text-white rounded-md hover:bg-bolivar-green-dark transition-colors duration-200"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : parametros.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron parámetros</h3>
              <p className="text-gray-600">Intente ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grupo
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orden
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Dominio
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Regla
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parametros.map((parametro) => (
                      <tr key={parametro.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {parametro.nombre_grupo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {parametro.orden || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={parametro.valor_dominio}>
                          {parametro.valor_dominio}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`
                            inline-flex px-2 py-1 text-xs font-semibold rounded-full
                            ${parametro.vigente === 'S' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}>
                            {parametro.vigente === 'S' ? 'Vigente' : 'No vigente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                          {new Date(parametro.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }).replace(/-/g, '/')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate" title={parametro.regla || ''}>
                          {parametro.regla || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Mostrando {((currentPage - 1) * pageSize) + 1} a{' '}
                      {Math.min(currentPage * pageSize, totalCount)} de {totalCount} registros
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Anterior
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Siguiente
                    </button>

                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="ml-4 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bolivar-green"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de Nuevo Parámetro */}
        {showNuevoParametroModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Header del modal */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Nuevo Parámetro
                  </h3>
                  <button
                    onClick={() => {
                      setShowNuevoParametroModal(false)
                      limpiarFormularioParametro()
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mensaje informativo */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-blue-700">
                    <strong>Nota:</strong> Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios.
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={(e) => { e.preventDefault(); handleCrearParametro() }} className="space-y-4">
                  {/* Nombre del Grupo */}
                  <div>
                    <label htmlFor="nombre_grupo" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Grupo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="nombre_grupo"
                      value={nuevoParametro.nombre_grupo}
                      onChange={(e) => handleNuevoParametroChange('nombre_grupo', e.target.value)}
                      placeholder="ej: ESTADOS_SOLICITUD"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Descripción del Grupo */}
                  <div>
                    <label htmlFor="descripcion_grupo" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción del Grupo
                    </label>
                    <input
                      type="text"
                      id="descripcion_grupo"
                      value={nuevoParametro.descripcion_grupo}
                      onChange={(e) => handleNuevoParametroChange('descripcion_grupo', e.target.value)}
                      placeholder="ej: Estados permitidos para las solicitudes de pago"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                    />
                  </div>

                  {/* Fila con Nombre del Dominio y Orden */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nombre del Dominio */}
                    <div className="md:col-span-2">
                      <label htmlFor="valor_dominio" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Dominio <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="valor_dominio"
                        value={nuevoParametro.valor_dominio}
                        onChange={(e) => handleNuevoParametroChange('valor_dominio', e.target.value)}
                        placeholder="ej: Solicitada, Aprobada, etc."
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Orden */}
                    <div className="md:col-span-1">
                      <label htmlFor="orden" className="block text-sm font-medium text-gray-700 mb-1">
                        Orden
                      </label>
                      <input
                        type="number"
                        id="orden"
                        value={nuevoParametro.orden}
                        onChange={(e) => handleNuevoParametroChange('orden', e.target.value)}
                        placeholder="1, 2, 3..."
                        min="0"
                        step="1"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Regla */}
                  <div>
                    <label htmlFor="regla" className="block text-sm font-medium text-gray-700 mb-1">
                      Regla
                    </label>
                    <textarea
                      id="regla"
                      value={nuevoParametro.regla}
                      onChange={(e) => handleNuevoParametroChange('regla', e.target.value)}
                      placeholder="ej: Validar documentos antes de aprobar. SLA: 2 horas..."
                      rows={3}
                      maxLength={500}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bolivar-green focus:border-transparent resize-none"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {nuevoParametro.regla.length}/500 caracteres
                    </div>
                  </div>


                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNuevoParametroModal(false)
                        limpiarFormularioParametro()
                      }}
                      disabled={creandoParametro}
                      className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creandoParametro || !isParametroFormComplete()}
                      className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creandoParametro ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creando parámetro...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Crear Parámetro
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

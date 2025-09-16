"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getParametrosPorGrupo, type Parametro } from '@/lib/parametros-data'

interface TipoSolicitud extends Parametro {
  // Hereda todas las propiedades de Parametro
}

export default function TipoSolicitudPage() {
  const router = useRouter()
  const [tiposSolicitud, setTiposSolicitud] = useState<TipoSolicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTiposSolicitud()
  }, [])

  const loadTiposSolicitud = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Cargando tipos de solicitud...')
      
      const { parametros, count, error } = await getParametrosPorGrupo('TIPO_SOLICITUD_PAGO')
      console.log('✅ Tipos de solicitud cargados:', { parametros, count })
      
      if (error) {
        throw new Error(error)
      }
      
      // Asegurar que parametros es un array
      const tiposArray = Array.isArray(parametros) ? parametros : []
      setTiposSolicitud(tiposArray)
      
      if (tiposArray.length === 0) {
        setError('No se encontraron tipos de solicitud. Por favor, ejecute el script SQL para crearlos.')
      }
    } catch (error) {
      console.error('❌ Error cargando tipos de solicitud:', error)
      setError('Error al cargar los tipos de solicitud. Por favor, intente nuevamente.')
      setTiposSolicitud([]) // Asegurar que siempre sea un array
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = () => {
    router.back()
  }

  const handleAceptar = () => {
    // Validaciones de respaldo (el botón ya debería estar deshabilitado)
    if (!tipoSeleccionado || tipoSeleccionado !== 'Pago de Comisiones Bancarias') {
      return
    }
    
    // Limpiar errores previos
    setError(null)
    
    // Buscar el tipo completo para pasar toda la información
    const tipoCompleto = Array.isArray(tiposSolicitud) 
      ? tiposSolicitud.find(t => t.valor_dominio === tipoSeleccionado)
      : null
    
    // Navegar a Nueva Solicitud con el tipo seleccionado como parámetro
    const params = new URLSearchParams({
      tipo: tipoSeleccionado,
      tipoId: tipoCompleto?.id?.toString() || '',
      descripcionGrupo: tipoCompleto?.descripcion_grupo || ''
    })
    
    router.push(`/solicitudes/nueva?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4 -mt-24">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-bolivar-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando tipos de solicitud...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 -mt-24">
        <div className="bg-white rounded-lg shadow-md p-8 w-full">
          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tipo de Solicitud
            </h2>
            <p className="text-gray-600 text-sm">
              Seleccione el tipo de solicitud que desea crear
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Dropdown de Tipo de Solicitud */}
          <div className="mb-8">
            <label htmlFor="tipoSolicitud" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Solicitud <span className="text-red-500">*</span>
            </label>
            <select
              id="tipoSolicitud"
              value={tipoSeleccionado}
              onChange={(e) => {
                setTipoSeleccionado(e.target.value)
                setError(null) // Limpiar error al seleccionar
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-bolivar-green focus:border-bolivar-green"
            >
              <option value="">
                {Array.isArray(tiposSolicitud) && tiposSolicitud.length > 0 
                  ? "Seleccione un tipo de solicitud..." 
                  : "No hay tipos disponibles - Ejecute el script SQL"
                }
              </option>
              {Array.isArray(tiposSolicitud) && tiposSolicitud.map((tipo) => (
                <option key={tipo.id} value={tipo.valor_dominio}>
                  {tipo.valor_dominio === 'Pago de Comisiones Bancarias' 
                    ? `✅ ${tipo.valor_dominio}` 
                    : `🚧 ${tipo.valor_dominio} (En construcción)`
                  }
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              ✅ = Disponible • 🚧 = En construcción (próximamente)
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleCancelar}
              className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={handleAceptar}
              disabled={!tipoSeleccionado || tipoSeleccionado !== 'Pago de Comisiones Bancarias'}
              className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !tipoSeleccionado 
                  ? 'Seleccione un tipo de solicitud para continuar' 
                  : tipoSeleccionado !== 'Pago de Comisiones Bancarias'
                  ? 'Esta funcionalidad está en proceso de construcción'
                  : 'Continuar al formulario de solicitud'
              }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Continuar
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

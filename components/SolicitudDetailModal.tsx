'use client'

import { useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/dashboard-data'
import type { OrdenPago } from '@/lib/dashboard-data'

interface SolicitudDetailModalProps {
  isOpen: boolean
  solicitud: OrdenPago | null
  onClose: () => void
}


export default function SolicitudDetailModal({ isOpen, solicitud, onClose }: SolicitudDetailModalProps) {
  // Manejar tecla ESCAPE para cerrar modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  if (!isOpen || !solicitud) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="bg-bolivar-green px-8 py-6 rounded-t-2xl relative">
          <h1 className="text-2xl font-bold text-white text-center">Detalles de la Solicitud</h1>
          <p className="text-sm text-green-100 text-center mt-2">Información completa de la solicitud seleccionada</p>
          
          {/* Botón X para cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors duration-200 p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
            title="Cerrar modal (ESC)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 space-y-6">
          
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
                  📅 Fecha de Solicitud
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.fecha_solicitud ? formatDate(solicitud.fecha_solicitud) : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 Número de Solicitud
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono text-lg">
                  {solicitud?.numero_solicitud || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Solicitud
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.tipo_solicitud || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Actual
                </label>
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                  solicitud?.estado === 'Solicitada' ? 'bg-blue-100 text-blue-800' :
                  solicitud?.estado === 'Devuelta' ? 'bg-red-100 text-red-800' :
                  solicitud?.estado === 'Generada' ? 'bg-yellow-100 text-yellow-800' :
                  solicitud?.estado === 'Aprobada' ? 'bg-purple-100 text-purple-800' :
                  solicitud?.estado === 'Pagada' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {solicitud?.estado || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Información del Documento de Cobro */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Información del Documento de Cobro
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Fecha Documento de Cobro
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.fecha_cuenta_cobro ? formatDate(solicitud.fecha_cuenta_cobro) : 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concepto
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.concepto || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Compañía Receptora
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.compania_receptora || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👤 Proveedor/Acreedor
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {solicitud?.proveedor || 'N/A'}
                </div>
              </div>

              {/* Campos específicos para Pago de Servicios Públicos */}
              {solicitud?.tipo_solicitud === 'Pago de Servicios Públicos' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🏢 Area Solicitante
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitud?.area_solicitante || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ✅ Autorizador
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                      {solicitud?.autorizador || 'N/A'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {solicitud?.descripcion && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 min-h-[100px] whitespace-pre-line">
                  {solicitud.descripcion}
                </div>
              </div>
            )}
          </div>

          {/* Valores Financieros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Valores Financieros
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  💰 Monto Solicitado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-green-500 text-sm font-medium">$</span>
                  </div>
                  <div className="w-full pl-8 pr-3 py-3 border border-green-200 rounded-lg bg-green-50 text-green-900 font-bold text-lg">
                    {formatCurrency(solicitud?.monto_solicitud || 0).replace('$ ', '')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-700 mb-2">
                  🧾 IVA ({(((solicitud?.iva || 0) / (solicitud?.monto_solicitud || 1)) * 100).toFixed(1)}%)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-orange-500 text-sm font-medium">$</span>
                  </div>
                  <div className="w-full pl-8 pr-3 py-3 border border-orange-200 rounded-lg bg-orange-50 text-orange-900 font-bold text-lg">
                    {formatCurrency(solicitud?.iva || 0).replace('$ ', '')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  💎 Total Monto Solicitado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-purple-500 text-sm font-medium">$</span>
                  </div>
                  <div className="w-full pl-8 pr-3 py-3 border border-purple-200 rounded-lg bg-purple-50 text-purple-900 font-bold text-xl">
                    {formatCurrency(solicitud?.total_solicitud || 0).replace('$ ', '')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos Anexos */}
          {(solicitud?.archivo_pdf_url || solicitud?.archivo_xlsx_url) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Documentos Anexos
              </h2>
              
              <div className="space-y-4">
                {solicitud?.archivo_pdf_url && (
                  <div className="flex items-center gap-3 bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Documento PDF</p>
                      <p className="text-xs text-red-700">
                        {solicitud?.tipo_solicitud === 'Pago de Servicios Públicos' ? 
                          'Soportes de la solicitud' : 'Cuenta de cobro'
                        }
                      </p>
                    </div>
                    <a
                      href={solicitud.archivo_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Ver PDF
                    </a>
                  </div>
                )}

                {solicitud?.archivo_xlsx_url && (
                  <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Archivo Excel</p>
                      <p className="text-xs text-green-700">
                        {solicitud?.tipo_solicitud === 'Pago de Servicios Públicos' ? 
                          'Soportes adicionales' : 'Archivo de distribuciones'
                        }
                      </p>
                    </div>
                    <a
                      href={solicitud.archivo_xlsx_url}
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
              onClick={onClose}
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
  )
}

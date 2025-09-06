'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function OrdenesPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carga
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <svg className="w-6 h-6 text-bolivar-green mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Gestión de Órdenes de Pago
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Administra y gestiona todas las órdenes de pago del sistema
          </p>
        </div>
        
        <Link 
          href="/ordenes/nueva"
          className="bg-bolivar-green text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-bolivar-green-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Orden de Pago
        </Link>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Órdenes Pendientes</h3>
          <p className="text-gray-600 text-sm mb-4">
            Revisar órdenes que requieren atención
          </p>
          <Link 
            href="/?filter=pendientes" 
            className="text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            Ver Pendientes →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">En Proceso</h3>
          <p className="text-gray-600 text-sm mb-4">
            Órdenes actualmente en procesamiento
          </p>
          <Link 
            href="/?filter=proceso" 
            className="text-yellow-600 text-sm font-medium hover:text-yellow-700"
          >
            Ver En Proceso →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aprobadas</h3>
          <p className="text-gray-600 text-sm mb-4">
            Órdenes aprobadas listas para pago
          </p>
          <Link 
            href="/?filter=aprobadas" 
            className="text-green-600 text-sm font-medium hover:text-green-700"
          >
            Ver Aprobadas →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Rechazadas</h3>
          <p className="text-gray-600 text-sm mb-4">
            Órdenes que requieren revisión
          </p>
          <Link 
            href="/?filter=rechazadas" 
            className="text-red-600 text-sm font-medium hover:text-red-700"
          >
            Ver Rechazadas →
          </Link>
        </div>
      </div>

      {/* Herramientas de Gestión */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Herramientas de Gestión</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="bg-bolivar-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-8 h-8 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Importar Órdenes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Importa múltiples órdenes desde archivo Excel
              </p>
              <button className="text-bolivar-green text-sm font-medium hover:text-bolivar-green-700">
                Importar →
              </button>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Generar Reportes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Crea reportes personalizados de órdenes
              </p>
              <Link 
                href="/reportes" 
                className="text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                Ver Reportes →
              </Link>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Configuración</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configura parámetros del sistema
              </p>
              <button className="text-purple-600 text-sm font-medium hover:text-purple-700">
                Configurar →
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bolivar-green"></div>
            <span className="text-gray-700">Cargando órdenes...</span>
          </div>
        </div>
      )}
    </div>
  )
}

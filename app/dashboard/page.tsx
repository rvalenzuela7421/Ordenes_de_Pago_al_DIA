'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const [currentTime] = useState(new Date().toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }))

  // Datos demo para las estadísticas
  const demoStats = {
    totalOrdenes: 24,
    pendientes: 8,
    aprobadas: 14,
    rechazadas: 2,
    montoTotal: 45750000
  }

  // Órdenes demo recientes
  const ordenesDemo = [
    {
      id: 1,
      numero: 'COP-2024-001',
      proveedor: 'Suministros Oficina Ltda.',
      monto: 1250000,
      estado: 'pendiente',
      fecha: '2024-01-15'
    },
    {
      id: 2,
      numero: 'COP-2024-002', 
      proveedor: 'Tecnología Avanzada S.A.S.',
      monto: 8500000,
      estado: 'aprobada',
      fecha: '2024-01-14'
    },
    {
      id: 3,
      numero: 'COP-2024-003',
      proveedor: 'Servicios Generales COP',
      monto: 750000,
      estado: 'pendiente',
      fecha: '2024-01-14'
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'aprobada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rechazada':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header de Bienvenida - Colores oficiales Seguros Bolívar */}
      <div className="bg-gradient-to-r from-bolivar-green to-bolivar-green-dark rounded-lg p-8 text-white shadow-xl relative overflow-hidden">
        {/* Detalle decorativo amarillo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-bolivar-yellow opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-10 bg-white rounded flex items-center justify-center shadow-md">
                <span className="text-bolivar-green font-black text-sm tracking-wider">SB</span>
              </div>
              <div className="w-3 h-3 bg-bolivar-yellow rounded-full"></div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  SEGUROS BOLÍVAR
                </h1>
                <p className="text-green-100 text-sm">
                  Sistema COP
                </p>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">
              ¡Bienvenido al Centro de Órdenes de Pago! 🎭
            </h2>
            <p className="text-green-100 text-base mb-4">
              Modo Demo Activo - Plataforma de Gestión Financiera
            </p>
            <p className="text-green-200 text-sm">
              {currentTime}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{demoStats.totalOrdenes}</div>
              <div className="text-green-200 text-sm">Órdenes Totales</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{formatCurrency(demoStats.montoTotal)}</div>
              <div className="text-green-200 text-sm">Monto Total</div>
            </div>
          </div>
        </div>
        
        {/* Banner de modo demo */}
        <div className="bg-green-900/40 rounded-lg p-4 mt-6 border border-bolivar-yellow/30">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-bolivar-yellow rounded-full flex items-center justify-center">
              <span className="text-yellow-800 text-sm">⚠</span>
            </div>
            <div>
              <p className="text-white font-medium">Modo Demostración Activo</p>
              <p className="text-green-200 text-sm">
                Todos los datos mostrados son simulados. Para usar con datos reales de Seguros Bolívar, configura la base de datos en modo producción.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Órdenes</p>
              <p className="text-2xl font-bold text-gray-900">{demoStats.totalOrdenes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{demoStats.pendientes}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Aprobadas</p>
              <p className="text-2xl font-bold text-green-600">{demoStats.aprobadas}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Rechazadas</p>
              <p className="text-2xl font-bold text-red-600">{demoStats.rechazadas}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Órdenes Recientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Órdenes de Pago Recientes
            </h2>
            <Link 
              href="/dashboard/ordenes/nueva"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-bolivar-green hover:bg-bolivar-green-dark transition-colors shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nueva Orden
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordenesDemo.map((orden) => (
                <tr key={orden.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {orden.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {orden.proveedor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(orden.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getEstadoColor(orden.estado)}`}>
                      {orden.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(orden.fecha).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link 
          href="/dashboard/ordenes/nueva"
          className="group bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-bolivar-green accent-bolivar"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-bolivar-green-bg group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-bolivar-green-dark">
                Crear Nueva Orden
              </h3>
              <p className="text-sm text-gray-500">
                Generar orden de pago
              </p>
            </div>
          </div>
        </Link>

        <Link 
          href="/dashboard/ordenes"
          className="group bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-bolivar-green"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-bolivar-green-bg group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors relative">
              <svg className="w-6 h-6 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-bolivar-green-dark">
                Ver Todas las Órdenes
              </h3>
              <p className="text-sm text-gray-500">
                Consultar listado completo
              </p>
            </div>
          </div>
        </Link>

        <Link 
          href="/dashboard/profile"
          className="group bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-bolivar-green"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-bolivar-green-bg group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-bolivar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 group-hover:text-bolivar-green-dark">
                Mi Perfil
              </h3>
              <p className="text-sm text-gray-500">
                Configurar cuenta
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
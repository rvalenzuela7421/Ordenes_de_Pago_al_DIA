"use client"

import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Acceso No Autorizado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes los permisos necesarios para acceder a esta sección
          </p>
        </div>

        <div className="card p-8">
          <div className="text-center space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Permisos Insuficientes
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Tu perfil actual no tiene acceso a esta funcionalidad del sistema COP.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>Posibles causas:</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Tu perfil no incluye los permisos requeridos</li>
                <li>Intentaste acceder a una sección administrativa</li>
                <li>Tu sesión puede haber expirado</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    ¿Necesitas más acceso?
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Contacta al administrador del sistema para solicitar permisos adicionales.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 justify-center pt-4">
              <Link
                href="/dashboard"
                className="btn-primary"
              >
                Ir al Dashboard
              </Link>
              <Link
                href="/auth/login"
                className="btn-secondary"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="text-center text-xs text-gray-500 space-y-2">
          <p>
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
          <div className="border-t border-gray-200 pt-4">
            <p className="font-medium">Centro de Órdenes de Pago - COP</p>
            <p>Sistema de Automatización de Procesos</p>
          </div>
        </div>
      </div>
    </div>
  )
}

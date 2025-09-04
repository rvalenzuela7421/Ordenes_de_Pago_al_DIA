"use client"

import { useState } from 'react'
import { UserProfile } from '@/lib/database.types'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import UserAvatar from '@/components/UserAvatar'

// Usuario demo para el dashboard  
const demoUser: UserProfile = {
  id: 'demo-user-dashboard',
  email: 'usuario.demo@cop.com',
  role: 'OperacionTRIB',
  nombre_completo: 'Usuario Demo Tributaria',
  telefono: '3001234567',
  must_change_password: false
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute allowedRoles={['AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionTRIB']}>
      {/* Dashboard accesible para TODOS los perfiles del sistema */}
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content optimizado */}
        <div className="lg:pl-60">
          {/* Título principal del dashboard */}
          <div className="bg-white border-b border-gray-200/80 px-3 lg:px-6 py-2">
            <h1 className="text-2xl font-bold text-bolivar-green">
              Centro de Órdenes de Pago
            </h1>
          </div>

          {/* Top bar minimalista - solo perfil de usuario */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200/80">
            <div className="flex items-center justify-between h-12 px-3 lg:px-6">
              {/* Botón hamburguesa (solo móviles) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Abrir menú"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Espaciador */}
              <div className="flex-1"></div>

              {/* Avatar del usuario */}
              <div className="flex items-center">
                <div className="hidden md:flex md:flex-col md:items-end mr-3">
                  <span className="text-sm font-medium text-gray-900">
                    {demoUser.nombre_completo}
                  </span>
                  <span className="text-xs text-gray-500">{demoUser.role}</span>
                </div>
                <UserAvatar user={demoUser} />
              </div>
            </div>
          </div>

          {/* Main content area optimizado */}
          <main className="p-2 lg:p-3">
            <div className="max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

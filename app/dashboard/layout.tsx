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
  role: 'ConsultaCOP',
  nombre_completo: 'Usuario Demo COP',
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              {/* Botón hamburguesa (solo visible en móviles) */}
              <div className="flex items-center lg:hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
                  aria-label="Abrir menú"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Título de la página (desktop) */}
              <div className="hidden lg:block">
                <h1 className="text-xl font-semibold text-bolivar-black">
                  <span className="text-bolivar-green font-bold">Seguros Bolívar</span> - Dashboard COP
                </h1>
                <p className="text-sm text-bolivar-gray mt-0.5">
                  Centro de Órdenes de Pago - Modo Demo
                </p>
              </div>

              {/* Logo en móviles */}
              <div className="flex items-center space-x-2 lg:hidden">
                <div className="w-8 h-6 bg-bolivar-green rounded flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-xs tracking-wider">SB</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-bolivar-green leading-none">SEGUROS</span>
                  <span className="text-xs text-bolivar-gray-dark leading-none">BOLÍVAR</span>
                </div>
              </div>

              {/* Avatar del usuario */}
              <div className="flex items-center">
                {/* Información del usuario (desktop) */}
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

          {/* Main content area */}
          <main className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

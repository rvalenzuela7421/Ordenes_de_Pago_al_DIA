'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Inicio',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
          />
        </svg>
      )
    }
    // Aquí se pueden agregar más elementos del menú en el futuro
    // {
    //   name: 'Órdenes de Pago',
    //   href: '/dashboard/ordenes',
    //   icon: (...)
    // }
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Logo Seguros Bolívar - Colores oficiales */}
            <div className="flex items-center">
              <div className="w-10 h-8 bg-bolivar-green rounded flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-xs tracking-wider">SB</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-bolivar-green leading-tight">
                SEGUROS BOLÍVAR
              </span>
              <span className="text-xs text-bolivar-gray-dark leading-tight">
                Centro de Órdenes
              </span>
            </div>
          </div>
          
          {/* Botón cerrar en móviles */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose} // Cerrar sidebar en móviles al navegar
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150
                  ${isActive(item.href) 
                    ? 'bg-primary-100 border-r-2 border-primary-600 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className={`
                  mr-3 flex-shrink-0
                  ${isActive(item.href) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                `}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer del Sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p className="text-bolivar-green font-semibold">Seguros Bolívar</p>
            <p>Sistema COP v1.0</p>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-bolivar-yellow rounded-full"></div>
              <p className="text-bolivar-gray">Modo Demo</p>
              <div className="w-2 h-2 bg-bolivar-yellow rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

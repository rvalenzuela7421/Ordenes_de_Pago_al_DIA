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
      
      {/* Sidebar compacto */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Header del Sidebar con logo real */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-gray-200">
          <div className="flex items-center justify-center w-full">
            {/* Logo oficial horizontal de Seguros Bolívar */}
            <img 
              src="https://automas.com.co/wp-content/uploads/2023/09/Logo-Bolivar-horizontal.png" 
              alt="Seguros Bolívar" 
              className="h-14 w-auto object-contain max-w-[180px]"
              onError={(e) => {
                // Fallback si la imagen no carga
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
            {/* Fallback logo */}
            <div className="hidden flex items-center space-x-2">
              <div className="w-8 h-6 bg-bolivar-green rounded flex items-center justify-center">
                <span className="text-white font-black text-xs">SB</span>
              </div>
              <span className="text-sm font-bold text-bolivar-green">SEGUROS BOLÍVAR</span>
            </div>
          </div>
          
          {/* Botón cerrar en móviles */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 absolute right-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navegación compacta */}
        <nav className="mt-4 px-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150
                  ${isActive(item.href) 
                    ? 'bg-bolivar-green text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-bolivar-green'
                  }
                `}
              >
                <span className={`
                  mr-3 flex-shrink-0
                  ${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-bolivar-green'}
                `}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

      </div>
    </>
  )
}

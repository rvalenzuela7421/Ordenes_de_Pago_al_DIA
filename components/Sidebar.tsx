'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  isExpanded: boolean
  onToggleExpand: () => void
}

export default function Sidebar({ isExpanded, onToggleExpand }: SidebarProps) {
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
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
    },
    {
      name: 'Órdenes de Pago',
      href: '/ordenes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: 'Nueva Solicitud',
      href: '/solicitudes/nueva',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      name: 'Reportes',
      href: '/reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-60' : 'w-16'}
    `}>
        {/* Header del Sidebar con logo adaptativo */}
        <div className="flex items-center justify-between h-16 px-2 border-b border-gray-200 relative">
          <div className="flex items-center justify-center w-full">
            {isExpanded ? (
              // Logo completo cuando está expandido
              <>
                <img 
                  src="https://automas.com.co/wp-content/uploads/2023/09/Logo-Bolivar-horizontal.png" 
                  alt="Seguros Bolívar" 
                  className="h-12 w-auto object-contain max-w-[140px] transition-opacity duration-300"
                  onError={(e) => {
                    // Fallback si la imagen no carga
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                {/* Fallback logo expandido */}
                <div className="hidden flex items-center space-x-1">
                  <div className="w-6 h-6 bg-bolivar-green rounded flex items-center justify-center">
                    <span className="text-white font-black text-xs">SB</span>
                  </div>
                  <span className="text-xs font-bold text-bolivar-green">SEGUROS BOLÍVAR</span>
                </div>
              </>
            ) : (
              // Solo icono cuando está contraído
              <div className="w-8 h-8 bg-bolivar-green rounded-lg flex items-center justify-center transition-all duration-300">
                <span className="text-white font-black text-sm">SB</span>
              </div>
            )}
          </div>
          
          {/* Botón toggle para desktop */}
          <button
            onClick={onToggleExpand}
            className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 border-gray-200 rounded-full text-gray-500 hover:text-bolivar-green hover:border-bolivar-green transition-colors z-10 flex items-center justify-center"
            title={isExpanded ? 'Contraer menú' : 'Expandir menú'}
          >
            <svg 
              className={`w-3 h-3 transition-transform duration-300 ${!isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navegación adaptativa */}
        <nav className="mt-4 px-1">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={`
                    flex items-center rounded-lg transition-all duration-200
                    ${isExpanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'}
                    text-sm font-medium
                    ${isActive(item.href) 
                      ? 'bg-bolivar-green text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-bolivar-green'
                    }
                  `}
                >
                  <span className={`
                    flex-shrink-0 transition-colors duration-200
                    ${isExpanded ? 'mr-3' : 'mr-0'}
                    ${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-bolivar-green'}
                  `}>
                    {item.icon}
                  </span>
                  
                  {/* Texto que aparece/desaparece con animación */}
                  <span className={`
                    transition-all duration-300 whitespace-nowrap
                    ${isExpanded 
                      ? 'opacity-100 translate-x-0 overflow-visible' 
                      : 'opacity-0 translate-x-2 overflow-hidden w-0'
                    }
                  `}>
                    {item.name}
                  </span>
                </Link>
                
                {/* Tooltip para estado contraído */}
                {!isExpanded && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.name}
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

    </div>
  )
}

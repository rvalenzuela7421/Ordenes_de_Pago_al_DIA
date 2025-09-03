"use client"

import Link from 'next/link'
import { UserProfile } from '@/lib/database.types'
import { checkPermissions } from '@/lib/auth'
import UserAvatar from './UserAvatar'

interface NavbarProps {
  user: UserProfile
}

export default function Navbar({ user }: NavbarProps) {
  const permissions = checkPermissions(user.role)

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
      show: true
    },
    {
      name: 'Órdenes de Pago',
      href: '/dashboard/ordenes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      show: permissions.canViewAll
    },
    {
      name: 'Nueva Orden',
      href: '/dashboard/ordenes/nueva',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      show: permissions.canCreate
    },
    {
      name: 'Reportes',
      href: '/dashboard/reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      show: permissions.canViewAll
    }
  ].filter(item => item.show)

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y navegación principal */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">COP</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">
                Centro de Órdenes de Pago
              </span>
            </Link>

            {/* Navegación principal - Desktop */}
            <div className="hidden md:ml-8 md:flex md:space-x-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Avatar del usuario y menú */}
          <div className="flex items-center space-x-4">
            {/* Información del usuario */}
            <div className="hidden md:flex md:flex-col md:items-end">
              <span className="text-sm font-medium text-gray-900">
                {user.nombre_completo || user.email.split('@')[0]}
              </span>
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>

            <UserAvatar user={user} />
          </div>
        </div>
      </div>

      {/* Navegación móvil */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 py-2 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

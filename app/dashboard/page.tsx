'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Página de redirección - el dashboard principal ahora está en "/"
export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente al dashboard principal
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-bolivar-green-200 border-t-bolivar-green rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirigiendo al Dashboard</h1>
        <p className="text-gray-500">Un momento por favor...</p>
      </div>
    </div>
  )
}
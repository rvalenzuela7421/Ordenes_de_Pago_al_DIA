import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/utils'

// Interface para la estructura de proveedor
export interface Proveedor {
  id: string
  tipo_documento: string
  numero_identificacion: number
  nombre_razon_social: string
  tipo_persona: string
}

// Datos de demo para cuando no hay conexión a BD
const demoProveedores: Proveedor[] = [
  {
    id: 'demo-1',
    tipo_documento: 'NT',
    numero_identificacion: 830025448,
    nombre_razon_social: 'GRUPO BOLÍVAR S.A.',
    tipo_persona: 'J'
  },
  {
    id: 'demo-2',
    tipo_documento: 'NT',
    numero_identificacion: 860006359,
    nombre_razon_social: 'CAPITALIZADORA BOLÍVAR S.A.',
    tipo_persona: 'J'
  },
  {
    id: 'demo-3',
    tipo_documento: 'NT',
    numero_identificacion: 860002503,
    nombre_razon_social: 'COMPAÑÍA DE SEGUROS BOLÍVAR S.A.',
    tipo_persona: 'J'
  }
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Verificar si estamos en modo demo
    if (isDemoMode()) {
      console.log('🎭 MODO DEMO: Retornando proveedores de demo')
      return res.status(200).json({
        success: true,
        proveedores: demoProveedores,
        count: demoProveedores.length
      })
    }

    // Obtener proveedores únicos directamente de ordenes_pago
    const { data: ordenesData, error } = await supabase
      .from('ordenes_pago')
      .select('proveedor')
      .not('proveedor', 'is', null)
      .neq('proveedor', '')

    if (error) {
      console.error('Error al obtener proveedores de ordenes_pago:', error)
      
      // Fallback a datos demo si hay error en BD
      console.log('📋 Usando datos demo por error en BD')
      return res.status(200).json({
        success: true,
        proveedores: demoProveedores,
        count: demoProveedores.length,
        warning: 'Error en BD, usando datos demo'
      })
    }

    if (!ordenesData || ordenesData.length === 0) {
      console.warn('⚠️ No se encontraron proveedores en ordenes_pago')
      
      // Usar datos demo si no hay órdenes
      return res.status(200).json({
        success: true,
        proveedores: demoProveedores,
        count: demoProveedores.length,
        warning: 'Sin órdenes en BD, usando datos demo'
      })
    }

    // Extraer proveedores únicos y convertir al formato esperado
    const proveedoresUnicos = Array.from(new Set(ordenesData.map(o => o.proveedor)))
      .filter(p => p && p.trim())
      .sort()
      .map((proveedor, index) => ({
        id: `real-${index + 1}`,
        tipo_documento: 'NT', // Valor por defecto
        numero_identificacion: index + 1, // Valor incremental 
        nombre_razon_social: proveedor,
        tipo_persona: 'J' // Valor por defecto para jurídica
      }))

    console.log('✅ Proveedores extraídos de ordenes_pago:', proveedoresUnicos.length)
    
    return res.status(200).json({
      success: true,
      proveedores: proveedoresUnicos,
      count: proveedoresUnicos.length
    })

  } catch (error) {
    console.error('Error inesperado al obtener proveedores:', error)
    
    // Fallback a datos demo en caso de error inesperado
    return res.status(200).json({
      success: true,
      proveedores: demoProveedores,
      count: demoProveedores.length,
      warning: 'Error en servidor, usando datos de respaldo'
    })
  }
}

import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

// Función para verificar si estamos en modo demo
function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || 
         !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

// Interface para parámetros
export interface Parametro {
  id: string
  nombre_grupo: string
  descripcion_grupo: string
  valor_dominio: string
  orden: number | null
  vigente: string
  created_at: string
  updated_at: string
}

// Sin datos fallback - la aplicación debe usar solo datos reales de la BD

/**
 * API ESTÁNDAR REUTILIZABLE PARA OBTENER PARÁMETROS
 * 
 * Endpoint: GET /api/parametros
 * Query Parameters:
 *   - grupo: string (opcional) - Filtra por nombre_grupo
 *   - vigente: string (opcional) - Filtra por vigente ('S' o 'N')
 *   - orden: boolean (opcional) - Si ordena por campo orden
 * 
 * Ejemplos de uso:
 *   GET /api/parametros?grupo=GRUPO_BOLIVAR
 *   GET /api/parametros?grupo=ESTADOS_SOLICITUD&vigente=S
 *   GET /api/parametros?grupo=PRIORIDADES&orden=true
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  // Obtener parámetros de query
  const { grupo, vigente, orden } = req.query
  const ordenarPorOrden = orden === 'true'

  // Solo usar datos reales de la base de datos - sin modo demo

  try {
    // Construir query base
    let query = supabase
      .from('parametros')
      .select('*')

    // Aplicar filtros
    if (grupo && typeof grupo === 'string') {
      query = query.eq('nombre_grupo', grupo.toUpperCase())
    }

    if (vigente && typeof vigente === 'string') {
      query = query.eq('vigente', vigente.toUpperCase())
    }

    // Aplicar ordenamiento
    if (ordenarPorOrden) {
      query = query.order('orden', { ascending: true })
    } else {
      query = query.order('valor_dominio', { ascending: true })
    }

    const { data: parametrosData, error } = await query

    if (error) {
      console.error('❌ Error al obtener parámetros:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Error al conectar con la base de datos',
        parametros: [], 
        count: 0,
        grupo: grupo || 'TODOS'
      })
    }

    if (!parametrosData || parametrosData.length === 0) {
      console.warn('⚠️ No se encontraron parámetros para el grupo:', grupo || 'TODOS')
      
      return res.status(200).json({ 
        success: true, 
        parametros: [], 
        count: 0,
        warning: `No se encontraron parámetros para el grupo: ${grupo || 'TODOS'}`,
        grupo: grupo || 'TODOS'
      })
    }

    console.log(`✅ Parámetros obtenidos (grupo: ${grupo || 'TODOS'}):`, parametrosData.length)
    
    return res.status(200).json({ 
      success: true, 
      parametros: parametrosData, 
      count: parametrosData.length,
      grupo: grupo || 'TODOS'
    })

  } catch (error) {
    console.error('💥 Error inesperado al obtener parámetros:', error)
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      parametros: [], 
      count: 0,
      grupo: grupo || 'TODOS'
    })
  }
}

/**
 * FUNCIÓN HELPER ESTÁNDAR PARA USO EN EL FRONTEND
 * 
 * Ejemplo de uso:
 * import { getParametrosPorGrupo } from '../../../lib/parametros-data'
 * 
 * const empresas = await getParametrosPorGrupo('GRUPO_BOLIVAR', true, true)
 * const estados = await getParametrosPorGrupo('ESTADOS_SOLICITUD', true, true) 
 */
export async function getParametrosPorGrupo(
  nombreGrupo: string, 
  soloVigentes: boolean = true, 
  ordenarPorOrden: boolean = true
): Promise<{ parametros: Parametro[], count: number, error?: string }> {
  try {
    const queryParams = new URLSearchParams()
    queryParams.append('grupo', nombreGrupo)
    
    if (soloVigentes) {
      queryParams.append('vigente', 'S')
    }
    
    if (ordenarPorOrden) {
      queryParams.append('orden', 'true')
    }

    const response = await fetch(`/api/parametros?${queryParams}`)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener parámetros')
    }

    return {
      parametros: data.parametros,
      count: data.count
    }

  } catch (error) {
    console.error(`Error al obtener parámetros del grupo ${nombreGrupo}:`, error)
    return {
      parametros: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

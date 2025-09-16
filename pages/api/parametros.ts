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
  regla?: string  // Nuevo campo opcional de 500 caracteres para reglas
  orden: number | null
  vigente: string
  created_at: string
  updated_at: string
}

// Sin datos fallback - la aplicación debe usar solo datos reales de la BD

/**
 * API ESTÁNDAR REUTILIZABLE PARA GESTIONAR PARÁMETROS
 * 
 * Endpoints: 
 * - GET /api/parametros: Obtener parámetros
 * - POST /api/parametros: Crear nuevo parámetro
 * - PUT /api/parametros: Actualizar parámetro existente
 * 
 * GET Query Parameters:
 *   - grupo: string (opcional) - Filtra por nombre_grupo
 *   - vigente: string (opcional) - Filtra por vigente ('S' o 'N')
 *   - orden: boolean (opcional) - Si ordena por campo orden
 *   - orderBy: string (opcional) - Tipo de ordenamiento ('admin' para módulo administración)
 *   - page: number (opcional) - Página para paginación
 *   - pageSize: number (opcional) - Tamaño de página
 *   - search: string (opcional) - Búsqueda en nombre_grupo o valor_dominio
 *   - stats: boolean (opcional) - Solo obtener datos para estadísticas
 * 
 * Ejemplos de uso GET:
 *   GET /api/parametros?grupo=GRUPO_BOLIVAR
 *   GET /api/parametros?grupo=ESTADOS_SOLICITUD&vigente=S
 *   GET /api/parametros?orderBy=admin&page=1&pageSize=50
 *   GET /api/parametros?stats=true
 * 
 * POST Body (crear parámetro):
 *   {
 *     "nombre_grupo": "ESTADOS_SOLICITUD",        // OBLIGATORIO
 *     "descripcion_grupo": "Estados permitidos para solicitudes",  // OBLIGATORIO
 *     "valor_dominio": "En Proceso",              // OBLIGATORIO
 *     "regla": "Validar documentos antes de aprobar",              // Opcional
 *     "orden": 3,                                 // Opcional
 *     "vigente": "S"                              // Opcional (default: S)
 *   }
 * 
 * PUT Body (actualizar parámetro):
 *   {
 *     "id": "123e4567-e89b-12d3-a456-426614174000", // OBLIGATORIO
 *     "nombre_grupo": "ESTADOS_SOLICITUD",        // Opcional - solo si cambia
 *     "descripcion_grupo": "Estados permitidos",  // Opcional - solo si cambia
 *     "valor_dominio": "En Proceso",              // Opcional - solo si cambia
 *     "regla": "Nueva regla de validación",      // Opcional - solo si cambia
 *     "orden": 5,                                 // Opcional - solo si cambia
 *     "vigente": "N"                              // Opcional - solo si cambia
 *   }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetParametros(req, res)
  } else if (req.method === 'POST') {
    return handleCreateParametro(req, res)
  } else if (req.method === 'PUT') {
    return handleUpdateParametro(req, res)
  } else {
    return res.status(405).json({ error: 'Método no permitido' })
  }
}

// Función para manejar GET (lógica existente)
async function handleGetParametros(req: NextApiRequest, res: NextApiResponse) {

  // Obtener parámetros de query
  const { 
    grupo, 
    vigente, 
    orden, 
    orderBy, 
    page, 
    pageSize, 
    search, 
    stats 
  } = req.query
  
  const ordenarPorOrden = orden === 'true'
  const modoAdministracion = orderBy === 'admin'
  const obtenerEstadisticas = stats === 'true'
  const paginaActual = parseInt(page as string) || 1
  const tamañoPagina = parseInt(pageSize as string) || 50
  const textoBusqueda = search as string || ''

  // Solo usar datos reales de la base de datos - sin modo demo

  try {
    // Para estadísticas, obtener todos los datos sin filtros adicionales
    if (obtenerEstadisticas) {
      const { data: parametrosData, error } = await supabase
        .from('parametros')
        .select('*')
        .order('nombre_grupo', { ascending: true })

      if (error) {
        console.error('❌ Error al obtener estadísticas:', error)
        return res.status(500).json({ 
          success: false, 
          error: 'Error al conectar con la base de datos',
          parametros: [], 
          count: 0
        })
      }

      return res.status(200).json({ 
        success: true, 
        parametros: parametrosData, 
        count: parametrosData.length
      })
    }

    // Construir query base con conteo para paginación
    let query = supabase
      .from('parametros')
      .select('*', { count: 'exact' })

    // Aplicar filtros
    if (grupo && typeof grupo === 'string') {
      query = query.eq('nombre_grupo', grupo.toUpperCase())
    }

    if (vigente && typeof vigente === 'string') {
      query = query.eq('vigente', vigente.toUpperCase())
    }

    // Aplicar búsqueda por texto (en nombre_grupo y valor_dominio)
    if (textoBusqueda) {
      // Log para debugging
      console.log('🔍 API: Aplicando búsqueda para:', textoBusqueda)
      
      // Limpiar el texto de búsqueda
      const searchTerm = textoBusqueda.trim().toUpperCase()
      
      // Búsqueda más flexible: busca en nombre_grupo y valor_dominio
      query = query.or(`nombre_grupo.ilike.%${searchTerm}%,valor_dominio.ilike.%${searchTerm}%`)
      
      console.log('🔍 API: Patrón de búsqueda aplicado:', `%${searchTerm}%`)
    }

    // Aplicar ordenamiento específico
    if (modoAdministracion) {
      // Ordenamiento para módulo de administración: grupo, orden, valor_dominio
      query = query
        .order('nombre_grupo', { ascending: true })
        .order('orden', { ascending: true })
        .order('valor_dominio', { ascending: true })
    } else if (ordenarPorOrden) {
      query = query.order('orden', { ascending: true })
    } else {
      query = query.order('valor_dominio', { ascending: true })
    }

    // Aplicar paginación
    if (paginaActual > 1) {
      const offsetValue = (paginaActual - 1) * tamañoPagina
      query = query.range(offsetValue, offsetValue + tamañoPagina - 1)
    } else {
      query = query.range(0, tamañoPagina - 1)
    }

    const { data: parametrosData, error, count } = await query

    if (error) {
      console.error('❌ Error al obtener parámetros:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Error al conectar con la base de datos',
        parametros: [], 
        count: 0,
        totalCount: 0,
        currentPage: paginaActual,
        totalPages: 0,
        grupo: grupo || 'TODOS'
      })
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / tamañoPagina)

    if (!parametrosData || parametrosData.length === 0) {
      const filtrosAplicados = []
      if (grupo) filtrosAplicados.push(`grupo: ${grupo}`)
      if (vigente) filtrosAplicados.push(`vigente: ${vigente}`)
      if (textoBusqueda) filtrosAplicados.push(`búsqueda: "${textoBusqueda}"`)
      
      const mensajeFiltros = filtrosAplicados.length > 0 
        ? ` con filtros [${filtrosAplicados.join(', ')}]`
        : ''
      
      console.warn(`⚠️ No se encontraron parámetros${mensajeFiltros}`)
      
      return res.status(200).json({ 
        success: true, 
        parametros: [], 
        count: 0,
        totalCount: 0,
        currentPage: paginaActual,
        totalPages: 0,
        warning: `No se encontraron parámetros${mensajeFiltros}`,
        grupo: grupo || 'TODOS'
      })
    }

    // Log con información de paginación y filtros
    const infoConsulta = []
    if (grupo) infoConsulta.push(`grupo: ${grupo}`)
    if (modoAdministracion) infoConsulta.push('modo: administración')
    if (textoBusqueda) infoConsulta.push(`búsqueda: "${textoBusqueda}"`)
    if (paginaActual > 1) infoConsulta.push(`página: ${paginaActual}/${totalPages}`)
    
    const infoAdicional = infoConsulta.length > 0 ? ` (${infoConsulta.join(', ')})` : ''
    console.log(`✅ Parámetros obtenidos${infoAdicional}:`, parametrosData.length, 'de', totalCount, 'total')
    
    return res.status(200).json({ 
      success: true, 
      parametros: parametrosData, 
      count: parametrosData.length,
      totalCount: totalCount,
      currentPage: paginaActual,
      totalPages: totalPages,
      grupo: grupo || 'TODOS',
      // Información adicional para debug
      hasNextPage: paginaActual < totalPages,
      hasPreviousPage: paginaActual > 1,
      searchTerm: textoBusqueda || null,
      orderBy: modoAdministracion ? 'administración' : (ordenarPorOrden ? 'orden' : 'valor_dominio')
    })

  } catch (error) {
    console.error('💥 Error inesperado al obtener parámetros:', error)
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      parametros: [], 
      count: 0,
      totalCount: 0,
      currentPage: paginaActual,
      totalPages: 0,
      grupo: grupo || 'TODOS'
    })
  }
}

// Función para manejar POST (crear nuevo parámetro)
async function handleCreateParametro(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      nombre_grupo,
      descripcion_grupo,
      valor_dominio,
      regla,
      orden,
      vigente
    } = req.body

    // Validaciones básicas
    if (!nombre_grupo?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre del grupo es obligatorio' 
      })
    }

    if (!descripcion_grupo?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'La descripción del grupo es obligatoria' 
      })
    }

    if (!valor_dominio?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'El valor dominio es obligatorio' 
      })
    }

    // Preparar datos para inserción
    const parametroData = {
      nombre_grupo: nombre_grupo.trim(),
      descripcion_grupo: descripcion_grupo.trim(),
      valor_dominio: valor_dominio.trim(),
      regla: regla?.trim() || null,
      orden: orden ? parseInt(orden.toString()) : 0,
      vigente: vigente === 'N' ? 'N' : 'S' // Default a 'S'
    }

    console.log('🆕 Creando parámetro:', parametroData)

    // Verificar si ya existe el parámetro
    const existingCheck = await supabase
      .from('parametros')
      .select('id')
      .eq('nombre_grupo', parametroData.nombre_grupo)
      .eq('valor_dominio', parametroData.valor_dominio)
      .single()

    if (existingCheck.data) {
      return res.status(409).json({ 
        success: false, 
        error: `Ya existe un parámetro con el grupo "${parametroData.nombre_grupo}" y valor "${parametroData.valor_dominio}"` 
      })
    }

    // Insertar nuevo parámetro
    const { data, error } = await supabase
      .from('parametros')
      .insert([parametroData])
      .select()
      .single()

    if (error) {
      console.error('❌ Error insertando parámetro:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Error al crear el parámetro en la base de datos',
        details: error.message
      })
    }

    console.log('✅ Parámetro creado exitosamente:', data)

    return res.status(201).json({ 
      success: true, 
      message: 'Parámetro creado exitosamente',
      parametro: data
    })

  } catch (error) {
    console.error('💥 Error inesperado al crear parámetro:', error)
    
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

// Función para manejar PUT (actualizar parámetro existente)
async function handleUpdateParametro(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      id,
      nombre_grupo,
      descripcion_grupo,
      valor_dominio,
      regla,
      orden,
      vigente
    } = req.body

    // Validaciones básicas
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'El ID del parámetro es obligatorio' 
      })
    }

    // Verificar que el parámetro existe
    const { data: existingParam, error: existingError } = await supabase
      .from('parametros')
      .select('*')
      .eq('id', id)
      .single()

    if (existingError || !existingParam) {
      return res.status(404).json({ 
        success: false, 
        error: 'Parámetro no encontrado' 
      })
    }

    // Preparar datos para actualización - solo incluir campos que han cambiado
    const updateData: any = {}

    // El nombre del grupo no se puede actualizar
    if (nombre_grupo !== undefined && nombre_grupo?.trim() !== existingParam.nombre_grupo) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre del grupo no se puede modificar' 
      })
    }

    if (descripcion_grupo !== undefined && descripcion_grupo?.trim() !== existingParam.descripcion_grupo) {
      if (!descripcion_grupo?.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: 'La descripción del grupo no puede estar vacía' 
        })
      }
      updateData.descripcion_grupo = descripcion_grupo.trim()
    }

    if (valor_dominio !== undefined && valor_dominio?.trim() !== existingParam.valor_dominio) {
      if (!valor_dominio?.trim()) {
        return res.status(400).json({ 
          success: false, 
          error: 'El nombre del dominio no puede estar vacío' 
        })
      }
      updateData.valor_dominio = valor_dominio.trim()
    }

    if (regla !== undefined && (regla?.trim() || '') !== (existingParam.regla || '')) {
      updateData.regla = regla?.trim() || null
    }

    if (orden !== undefined) {
      const newOrden = orden ? parseInt(orden.toString()) : 0
      if (newOrden !== existingParam.orden) {
        updateData.orden = newOrden
      }
    }

    if (vigente !== undefined && vigente !== existingParam.vigente) {
      updateData.vigente = vigente === 'N' ? 'N' : 'S'
    }

    // Si no hay cambios, devolver éxito sin hacer nada
    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No hay cambios que guardar',
        parametro: existingParam 
      })
    }

    // Verificar unicidad si se está cambiando valor_dominio
    if (updateData.valor_dominio) {
      const checkGrupo = existingParam.nombre_grupo
      const checkDominio = updateData.valor_dominio

      const { data: duplicateCheck } = await supabase
        .from('parametros')
        .select('id')
        .eq('nombre_grupo', checkGrupo)
        .eq('valor_dominio', checkDominio)
        .neq('id', id)
        .single()

      if (duplicateCheck) {
        return res.status(409).json({ 
          success: false, 
          error: `Ya existe un parámetro con el grupo "${checkGrupo}" y dominio "${checkDominio}"` 
        })
      }
    }

    console.log(`📝 Actualizando parámetro ${id}:`, updateData)

    // Realizar la actualización
    const { data: updatedData, error: updateError } = await supabase
      .from('parametros')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error al actualizar parámetro:', updateError)
      return res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar el parámetro en la base de datos',
        details: updateError.message 
      })
    }

    console.log('✅ Parámetro actualizado exitosamente:', updatedData)

    return res.status(200).json({ 
      success: true, 
      message: 'Parámetro actualizado exitosamente',
      parametro: updatedData 
    })

  } catch (error) {
    console.error('❌ Error interno al actualizar parámetro:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido' 
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

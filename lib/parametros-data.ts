import { supabase } from './supabase'

// Interface para parámetros (reutilizable)
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

// Interface específica para empresas del Grupo Bolívar
export interface EmpresaGrupoBolivar {
  id: string
  codigo: string // NT-830025448
  nit: string // 830025448
  nombre: string // GRUPO BOLÍVAR S.A.
  valorCompleto: string // NT-830025448-GRUPO BOLÍVAR S.A.
  orden: number | null
  vigente: boolean
}

// Interface para acreedores
export interface Acreedor {
  id: string
  valor: string // NT-860034313-7-DAVIVIENDA S.A.
  label: string // NT-860034313-7-DAVIVIENDA S.A.
  orden: number | null
  vigente: boolean
}

// Interface para conceptos
export interface Concepto {
  id: string
  valor: string // Convenio de uso de red
  label: string // Convenio de uso de red
  orden: number | null
  vigente: boolean
}

/**
 * FUNCIÓN ESTÁNDAR REUTILIZABLE PARA OBTENER PARÁMETROS POR GRUPO
 * 
 * @param nombreGrupo - Nombre del grupo de parámetros (ej: 'GRUPO_BOLIVAR', 'ESTADOS_SOLICITUD')
 * @param soloVigentes - Si solo incluir parámetros vigentes (vigente = 'S')
 * @param ordenarPorOrden - Si ordenar por el campo 'orden'
 * @returns Promise con array de parámetros y metadatos
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

/**
 * FUNCIÓN ESPECÍFICA: OBTENER ACREEDORES AUTORIZADOS
 * Carga acreedores desde la tabla parametros grupo ACREEDORES
 */
export async function getAcreedoresAutorizados(soloVigentes: boolean = true): Promise<{
  acreedores: Acreedor[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('ACREEDORES', soloVigentes, true)
    
    if (error) {
      return { acreedores: [], count: 0, error }
    }

    // Convertir parámetros a formato de acreedor
    const acreedores: Acreedor[] = parametros.map((param) => ({
      id: param.id,
      valor: param.valor_dominio,
      label: param.valor_dominio,
      orden: param.orden,
      vigente: param.vigente === 'S'
    }))

    return { acreedores, count, error: undefined }
  } catch (error) {
    console.error('Error al obtener acreedores:', error)
    return { acreedores: [], count: 0, error: `Error al obtener acreedores: ${error}` }
  }
}

/**
 * FUNCIÓN ESPECÍFICA: OBTENER CONCEPTOS VÁLIDOS
 * Carga conceptos desde la tabla parametros grupo CONCEPTOS
 */
export async function getConceptosValidos(soloVigentes: boolean = true): Promise<{
  conceptos: Concepto[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('CONCEPTOS', soloVigentes, true)
    
    if (error) {
      return { conceptos: [], count: 0, error }
    }

    // Convertir parámetros a formato de concepto
    const conceptos: Concepto[] = parametros.map((param) => ({
      id: param.id,
      valor: param.valor_dominio,
      label: param.valor_dominio,
      orden: param.orden,
      vigente: param.vigente === 'S'
    }))

    return { conceptos, count, error: undefined }
  } catch (error) {
    console.error('Error al obtener conceptos:', error)
    return { conceptos: [], count: 0, error: `Error al obtener conceptos: ${error}` }
  }
}

/**
 * FUNCIÓN ESPECÍFICA PARA OBTENER EMPRESAS DEL GRUPO BOLÍVAR
 * Procesa los parámetros y los convierte al formato específico de empresas
 */
export async function getEmpresasGrupoBolivar(soloVigentes: boolean = true): Promise<{
  empresas: EmpresaGrupoBolivar[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('GRUPO_BOLIVAR', soloVigentes, true)
    
    if (error) {
      return { empresas: [], count: 0, error }
    }

    // Convertir parámetros a formato de empresa
    const empresas: EmpresaGrupoBolivar[] = parametros.map((param) => {
      // Parsear el valor_dominio formato: "NT-830025448-GRUPO BOLÍVAR S.A."
      const partes = param.valor_dominio.split('-')
      const codigo = partes[0] // NT
      const nit = partes[1] // 830025448
      const nombre = partes.slice(2).join('-') // GRUPO BOLÍVAR S.A.

      return {
        id: param.id,
        codigo: codigo,
        nit: nit,
        nombre: nombre,
        valorCompleto: param.valor_dominio,
        orden: param.orden,
        vigente: param.vigente === 'S'
      }
    })

    return {
      empresas,
      count: empresas.length
    }

  } catch (error) {
    console.error('Error al obtener empresas del Grupo Bolívar:', error)
    return {
      empresas: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * FUNCIÓN GENÉRICA PARA OBTENER ESTADOS DE SOLICITUD
 */
export async function getEstadosSolicitud(): Promise<{
  estados: { valor: string, descripcion: string, orden: number }[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('ESTADOS_SOLICITUD', true, true)
    
    if (error) {
      return { estados: [], count: 0, error }
    }

    const estados = parametros.map(param => ({
      valor: param.valor_dominio,
      descripcion: param.descripcion_grupo || `Estado ${param.valor_dominio}`,
      orden: param.orden || 0
    }))

    return { estados, count }

  } catch (error) {
    console.error('Error al obtener estados de solicitud:', error)
    return {
      estados: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * FUNCIÓN GENÉRICA PARA OBTENER PRIORIDADES
 */
export async function getPrioridades(): Promise<{
  prioridades: { valor: string, descripcion: string, orden: number }[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('PRIORIDADES', true, true)
    
    if (error) {
      return { prioridades: [], count: 0, error }
    }

    const prioridades = parametros.map(param => ({
      valor: param.valor_dominio,
      descripcion: param.descripcion_grupo || `Prioridad ${param.valor_dominio}`,
      orden: param.orden || 0
    }))

    return { prioridades, count }

  } catch (error) {
    console.error('Error al obtener prioridades:', error)
    return {
      prioridades: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * FUNCIÓN PARA OBTENER CONFIGURACIÓN DEL SISTEMA
 */
export async function getConfiguracionSistema(clave?: string): Promise<{
  configuracion: { clave: string, valor: string, descripcion: string }[], 
  count: number, 
  error?: string
}> {
  try {
    const { parametros, count, error } = await getParametrosPorGrupo('CONFIGURACION_SISTEMA', true, true)
    
    if (error) {
      return { configuracion: [], count: 0, error }
    }

    let configuracion = parametros.map(param => ({
      clave: param.valor_dominio,
      valor: param.valor_dominio, // En este caso el valor es el dominio mismo
      descripcion: param.descripcion_grupo || `Config ${param.valor_dominio}`
    }))

    // Si se especifica una clave específica, filtrar
    if (clave) {
      configuracion = configuracion.filter(config => config.clave === clave)
    }

    return { configuracion, count: configuracion.length }

  } catch (error) {
    console.error('Error al obtener configuración del sistema:', error)
    return {
      configuracion: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * FUNCIÓN PARA OBTENER EL PORCENTAJE DE IVA VIGENTE
 */
export async function getIVAVigente(): Promise<{ iva: number, error?: string }> {
  try {
    const { parametros, error } = await getParametrosPorGrupo('CONFIGURACION_IVA', true, true)
    
    if (error || parametros.length === 0) {
      console.warn('⚠️ No se encontró IVA en parámetros, usando 19% por defecto')
      return { iva: 19 }
    }

    const ivaParam = parametros[0]
    const ivaValue = parseFloat(ivaParam.valor_dominio)
    
    if (isNaN(ivaValue)) {
      console.warn('⚠️ Valor de IVA inválido en parámetros, usando 19% por defecto')
      return { iva: 19 }
    }

    return { iva: ivaValue }

  } catch (error) {
    console.error('Error al obtener IVA vigente:', error)
    return { 
      iva: 19, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * FUNCIÓN PARA MÓDULO DE ADMINISTRACIÓN: OBTENER TODOS LOS PARÁMETROS
 * Para la gestión completa de parámetros del sistema
 * Ordenamiento: nombre_grupo, orden, valor_dominio
 */
export async function getTodosLosParametros(
  incluirNoVigentes: boolean = true,
  searchText: string = '',
  page: number = 1,
  pageSize: number = 50
): Promise<{
  parametros: Parametro[], 
  totalCount: number,
  currentPage: number,
  totalPages: number,
  grupos: string[],
  error?: string
}> {
  try {
    // Construir parámetros de query
    const queryParams = new URLSearchParams()
    
    // Sin filtro de grupo específico para obtener todos
    if (!incluirNoVigentes) {
      queryParams.append('vigente', 'S')
    }
    
    // Agregar parámetros de paginación y búsqueda
    queryParams.append('page', page.toString())
    queryParams.append('pageSize', pageSize.toString())
    queryParams.append('orderBy', 'admin') // Indicador especial para ordenamiento de administración
    
    if (searchText.trim()) {
      queryParams.append('search', searchText.trim())
    }

    const response = await fetch(`/api/parametros?${queryParams}`)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener parámetros')
    }

    // Obtener lista única de grupos para filtros
    const gruposUnicos = [...new Set(data.parametros.map((p: Parametro) => p.nombre_grupo))].sort()

    return {
      parametros: data.parametros,
      totalCount: data.totalCount || data.count,
      currentPage: page,
      totalPages: Math.ceil((data.totalCount || data.count) / pageSize),
      grupos: gruposUnicos,
      error: undefined
    }

  } catch (error) {
    console.error('Error al obtener todos los parámetros:', error)
    return {
      parametros: [],
      totalCount: 0,
      currentPage: page,
      totalPages: 0,
      grupos: [],
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * FUNCIÓN AUXILIAR: OBTENER ESTADÍSTICAS DE PARÁMETROS
 * Para mostrar resumen en el módulo de administración
 */
export async function getEstadisticasParametros(): Promise<{
  totalParametros: number,
  parametrosVigentes: number,
  parametrosNoVigentes: number,
  totalGrupos: number,
  gruposPorEstadistica: { grupo: string, total: number, vigentes: number }[],
  error?: string
}> {
  try {
    // Obtener todos los parámetros sin paginación para estadísticas
    const queryParams = new URLSearchParams()
    queryParams.append('stats', 'true') // Indicador para obtener estadísticas

    const response = await fetch(`/api/parametros?${queryParams}`)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener estadísticas')
    }

    const parametros: Parametro[] = data.parametros
    
    // Calcular estadísticas
    const totalParametros = parametros.length
    const parametrosVigentes = parametros.filter(p => p.vigente === 'S').length
    const parametrosNoVigentes = totalParametros - parametrosVigentes
    
    // Agrupar por nombre_grupo
    const grupoStats = parametros.reduce((acc, param) => {
      if (!acc[param.nombre_grupo]) {
        acc[param.nombre_grupo] = { total: 0, vigentes: 0 }
      }
      acc[param.nombre_grupo].total++
      if (param.vigente === 'S') {
        acc[param.nombre_grupo].vigentes++
      }
      return acc
    }, {} as Record<string, { total: number, vigentes: number }>)

    const gruposPorEstadistica = Object.entries(grupoStats)
      .map(([grupo, stats]) => ({
        grupo,
        total: stats.total,
        vigentes: stats.vigentes
      }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo))

    return {
      totalParametros,
      parametrosVigentes,
      parametrosNoVigentes,
      totalGrupos: gruposPorEstadistica.length,
      gruposPorEstadistica,
      error: undefined
    }

  } catch (error) {
    console.error('Error al obtener estadísticas de parámetros:', error)
    return {
      totalParametros: 0,
      parametrosVigentes: 0,
      parametrosNoVigentes: 0,
      totalGrupos: 0,
      gruposPorEstadistica: [],
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Exportar tipos para uso en otros archivos
export type { Parametro, EmpresaGrupoBolivar }


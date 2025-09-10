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

// Exportar tipos para uso en otros archivos
export type { Parametro, EmpresaGrupoBolivar }


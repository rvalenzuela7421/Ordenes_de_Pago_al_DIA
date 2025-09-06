import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/utils'

// Tipos para conceptos de impuestos
interface ConceptoImpuesto {
  id: string
  concepto_impuesto: string
  porcentaje_aplicacion: number
  descripcion?: string
  tipo_impuesto: string
  activo: boolean
}

// Función para obtener IVA vigente actual (modo demo)
const getIVAVigenteDemo = () => {
  const fechaActual = new Date()
  
  // Simular lógica de vigencia - siempre usar 19% actual
  return {
    id: 'demo-iva-actual',
    concepto_impuesto: 'IVA',
    porcentaje_aplicacion: 0.19,
    descripcion: 'IVA 19% - Tarifa actual vigente',
    tipo_impuesto: 'IVA',
    activo: true,
    vigencia_desde: '2023-01-01',
    vigencia_hasta: null,
    observaciones: 'Tarifa actual vigente desde enero 2023'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { tipo = 'IVA' } = req.query

    if (isDemoMode()) {
      // Modo demo: devolver IVA vigente actual
      console.log('🎭 MODO DEMO: Obteniendo IVA vigente actual...', { tipo })

      if (tipo === 'IVA') {
        const ivaVigente = getIVAVigenteDemo()
        
        return res.status(200).json({
          success: true,
          iva_vigente: {
            concepto: ivaVigente.concepto_impuesto,
            porcentaje: ivaVigente.porcentaje_aplicacion,
            descripcion: ivaVigente.descripcion,
            vigencia_desde: ivaVigente.vigencia_desde,
            vigencia_hasta: ivaVigente.vigencia_hasta,
            observaciones: ivaVigente.observaciones
          },
          porcentaje_actual: ivaVigente.porcentaje_aplicacion
        })
      }

      return res.status(200).json({
        success: true,
        iva_vigente: null,
        porcentaje_actual: 0
      })

    } else {
      // Modo producción: obtener IVA vigente desde Supabase
      if (tipo === 'IVA') {
        // Intentar consulta directa a tabla de impuestos (no usar función SQL que puede no existir)
        try {
          const fechaActual = new Date().toISOString().split('T')[0]
          
          const { data, error } = await supabase
            .from('conceptos_impuestos')
            .select('concepto_impuesto, porcentaje_aplicacion, descripcion, vigencia_desde, vigencia_hasta, observaciones')
            .eq('concepto_impuesto', 'IVA')
            .eq('tipo_impuesto', 'IVA')
            .eq('activo', true)
            .lte('vigencia_desde', fechaActual)
            .or(`vigencia_hasta.is.null,vigencia_hasta.gte.${fechaActual}`)
            .order('vigencia_desde', { ascending: false })
            .limit(1)

          if (!error && data && data.length > 0) {
            const ivaVigente = data[0] as any
            console.log('✅ IVA vigente encontrado en base de datos:', ivaVigente)
            return res.status(200).json({
              success: true,
              iva_vigente: {
                concepto: 'IVA',
                porcentaje: ivaVigente.porcentaje_aplicacion,
                descripcion: ivaVigente.descripcion,
                vigencia_desde: ivaVigente.vigencia_desde,
                vigencia_hasta: ivaVigente.vigencia_hasta,
                observaciones: ivaVigente.observaciones
              },
              porcentaje_actual: ivaVigente.porcentaje_aplicacion
            })
          } else {
            console.log('⚠️ No se encontró IVA vigente en base de datos:', error)
          }
        } catch (error) {
          console.error('❌ Error al consultar tabla de impuestos:', error)
        }

        // Fallback: usar IVA por defecto 19% si no hay tabla configurada
        console.log('📋 Usando IVA por defecto 19% - tabla de impuestos no configurada')
        const ivaDefault = {
          concepto: 'IVA',
          porcentaje: 0.19,
          descripcion: 'IVA 19% - Tarifa estándar Colombia',
          vigencia_desde: '2023-01-01',
          vigencia_hasta: null,
          observaciones: 'Tarifa estándar de IVA en Colombia'
        }
        
        return res.status(200).json({
          success: true,
          iva_vigente: ivaDefault,
          porcentaje_actual: ivaDefault.porcentaje,
          info: 'Usando IVA por defecto - configura la tabla conceptos_impuestos para personalizar'
        })
      }

      // Para otros tipos de impuestos (futuro)
      return res.status(200).json({
        success: true,
        iva_vigente: null,
        porcentaje_actual: 0
      })
    }

  } catch (error) {
    console.error('Error en API de conceptos de impuestos:', error)
    
    // Fallback en caso de error total
    const ivaFallback = getIVAVigenteDemo()
    return res.status(500).json({
      success: false,
      iva_vigente: {
        concepto: ivaFallback.concepto_impuesto,
        porcentaje: ivaFallback.porcentaje_aplicacion,
        descripcion: ivaFallback.descripcion,
        vigencia_desde: ivaFallback.vigencia_desde,
        vigencia_hasta: ivaFallback.vigencia_hasta,
        observaciones: 'Error del servidor - usando datos por defecto'
      },
      porcentaje_actual: ivaFallback.porcentaje_aplicacion,
      error: 'Error del servidor'
    })
  }
}

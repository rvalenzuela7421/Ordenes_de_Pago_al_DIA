import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import { enviarNotificacionNuevaSolicitud } from '@/lib/email'

// Tipos para la solicitud de OP
interface SolicitudOPData {
  companiaReceptora: string
  acreedor: string
  concepto: string
  valorSolicitud: number
  tieneIVA: boolean
  conceptoIVA?: string
  iva: number
  totalSolicitud: number
  tieneDistribuciones: boolean
  archivoPDF?: File
  archivoXLSX?: File
}

// Función para obtener fecha actual en zona horaria de Colombia (UTC-5)
function getColombiaDateTime(): string {
  const now = new Date()
  // Colombia está en UTC-5
  const colombiaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000))
  return colombiaTime.toISOString()
}

// Función para generar número de solicitud único usando fecha de Colombia
function generateSolicitudNumber(): string {
  const colombiaTime = new Date(new Date().getTime() - (5 * 60 * 60 * 1000))
  const year = colombiaTime.getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `SOL-${year}-${timestamp}`
}

// Simulación de datos para modo demo
const demoSolicitudes: any[] = []

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const {
      companiaReceptora,
      acreedor,
      concepto,
      descripcion,
      valorSolicitud,
      tieneIVA,
      conceptoIVA,
      porcentajeIVA,
      iva,
      totalSolicitud,
      tieneDistribuciones,
      archivos,
      metadata
    } = req.body

    // Validaciones básicas
    if (!companiaReceptora || !acreedor || !concepto || !valorSolicitud) {
      return res.status(400).json({ 
        error: 'Datos incompletos. Compañía receptora, acreedor, concepto y valor son requeridos.' 
      })
    }

    // Validar que compañía receptora sea de GRUPO_BOLIVAR
    if (!companiaReceptora.startsWith('NT-')) {
      return res.status(400).json({ 
        error: 'Compañía receptora debe ser una empresa válida del Grupo Bolívar.' 
      })
    }

    if (valorSolicitud <= 0) {
      return res.status(400).json({ 
        error: 'El valor de la solicitud debe ser mayor a cero.' 
      })
    }

    // Generar número de solicitud único
    const numeroSolicitud = generateSolicitudNumber()

    // Validar y usar IVA enviado desde frontend
    const valorBase = parseFloat(valorSolicitud)
    const tieneIVABool = tieneIVA === true || tieneIVA === 'true'
    const porcentajeIVANum = parseFloat(porcentajeIVA) || 0
    const ivaCalculado = parseFloat(iva) || 0
    const totalCalculado = parseFloat(totalSolicitud)

    // Crear objeto de solicitud usando nombres de campos de ordenes_pago
    const nuevaSolicitud = {
      numero_solicitud: numeroSolicitud,
      compania_receptora: companiaReceptora, // Nuevo campo compañía receptora
      proveedor: acreedor, // Mapear acreedor -> proveedor
      concepto,
      descripcion: descripcion || null, // Nuevo campo descripcion
      monto_solicitud: valorBase, // Mapear valor_solicitud -> monto_solicitud  
      iva: tieneIVABool ? Math.round(ivaCalculado * 100) / 100 : 0,
      total_solicitud: Math.round(totalCalculado * 100) / 100,
      ind_distribuciones: tieneDistribuciones ? 'S' : 'N', // Mapear boolean a S/N
      estado: 'Solicitada',
      fecha_solicitud: getColombiaDateTime(),
      // URLs de archivos subidos
      archivo_pdf_url: archivos?.pdf_url || null,
      archivo_xlsx_url: archivos?.xlsx_url || null
    }

    if (isDemoMode()) {
      // Modo demo: simular guardado
      console.log('🎭 MODO DEMO: Simulando guardado de solicitud OP...', {
        numero: numeroSolicitud,
        proveedor: acreedor,
        total: totalCalculado,
        estado: 'Solicitada'
      })

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Agregar a array de demo
      demoSolicitudes.push(nuevaSolicitud)

      // Enviar notificación por email en modo demo
      try {
        const fechaFormateada = new Date(nuevaSolicitud.fecha_solicitud)
          .toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

        const resultadoEmail = await enviarNotificacionNuevaSolicitud(
          'usuario.demo@cop.com',
          'Usuario Demo Tributaria',
          {
            numeroSolicitud: numeroSolicitud,
            companiaReceptora: nuevaSolicitud.compania_receptora,
            proveedor: nuevaSolicitud.proveedor,
            concepto: nuevaSolicitud.concepto,
            montoSolicitud: nuevaSolicitud.monto_solicitud,
            totalSolicitud: nuevaSolicitud.total_solicitud,
            fechaSolicitud: fechaFormateada
          }
        )

        if (resultadoEmail.success) {
          console.log('🎭 MODO DEMO: Email simulado enviado exitosamente')
        }
      } catch (emailError) {
        console.error('🎭 MODO DEMO: Error al simular email:', emailError)
      }

      return res.status(200).json({
        success: true,
        solicitud: nuevaSolicitud,
        numero_solicitud: numeroSolicitud,
        message: `Solicitud ${numeroSolicitud} creada exitosamente`
      })

    } else {
      // Modo producción: guardar en Supabase
      
      // Crear cliente Supabase con acceso a las cookies de la request
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: req.headers.authorization || ''
            }
          }
        }
      )

      // Obtener el usuario actual usando el cliente con headers
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser()
      
      if (userError || !user) {
        console.error('Error de autenticación:', userError)
        return res.status(401).json({ 
          error: 'Usuario no autenticado',
          details: 'Por favor, cierre sesión e ingrese nuevamente'
        })
      }

      // Insertar en la tabla de ordenes_pago usando el cliente admin
      const { data, error } = await supabaseAdmin
        .from('ordenes_pago')
        .insert({
          ...nuevaSolicitud,
          creado_por: user.id, // Campo requerido por políticas RLS
          created_at: getColombiaDateTime(),
          updated_at: getColombiaDateTime()
        })
        .select()
        .single()

      if (error) {
        console.error('Error al guardar solicitud:', error)
        return res.status(500).json({ 
          error: 'Error interno del servidor al guardar la solicitud' 
        })
      }

      // También insertar en audit log (si la tabla existe)
      try {
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            accion: 'crear_solicitud_op',
            tabla_afectada: 'ordenes_pago',
            registro_id: data.id,
            datos_nuevos: {
              numero_solicitud: nuevaSolicitud.numero_solicitud,
              proveedor: nuevaSolicitud.proveedor,
              concepto: nuevaSolicitud.concepto,
              monto_solicitud: nuevaSolicitud.monto_solicitud,
              total_solicitud: nuevaSolicitud.total_solicitud,
              estado: nuevaSolicitud.estado,
              tiene_iva: tieneIVABool,
              porcentaje_iva: tieneIVABool ? porcentajeIVANum : 0
            },
            created_at: getColombiaDateTime()
          })
      } catch (auditError) {
        console.warn('No se pudo insertar en audit log (tabla opcional):', auditError)
        // No fallar por esto, es opcional
      }

      // Enviar notificación por email al usuario
      try {
        // Obtener perfil del usuario para el email y nombre
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('email, nombre_completo')
          .eq('id', user.id)
          .single()

        if (!profileError && userProfile) {
          // Formatear fecha para el email
          const fechaFormateada = new Date(nuevaSolicitud.fecha_solicitud)
            .toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

          // Enviar notificación por email
          const resultadoEmail = await enviarNotificacionNuevaSolicitud(
            userProfile.email,
            userProfile.nombre_completo || userProfile.email,
            {
              numeroSolicitud: numeroSolicitud,
              companiaReceptora: nuevaSolicitud.compania_receptora,
              proveedor: nuevaSolicitud.proveedor,
              concepto: nuevaSolicitud.concepto,
              montoSolicitud: nuevaSolicitud.monto_solicitud,
              totalSolicitud: nuevaSolicitud.total_solicitud,
              fechaSolicitud: fechaFormateada
            }
          )

          if (resultadoEmail.success) {
            console.log('✅ Email de notificación enviado:', {
              to: userProfile.email,
              solicitud: numeroSolicitud,
              messageId: resultadoEmail.messageId
            })
          } else {
            console.warn('⚠️ No se pudo enviar email de notificación:', resultadoEmail.error)
          }
        } else {
          console.warn('⚠️ No se pudo obtener perfil del usuario para enviar email')
        }
      } catch (emailError) {
        console.error('❌ Error al enviar email de notificación:', emailError)
        // No fallar la creación de solicitud por error en email
      }

      return res.status(200).json({
        success: true,
        solicitud: data,
        numero_solicitud: numeroSolicitud,
        message: `Solicitud ${numeroSolicitud} creada exitosamente`
      })
    }

  } catch (error) {
    console.error('Error en API de solicitudes:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor' 
    })
  }
}

// Configuración para subida de archivos
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Límite de 10MB para los archivos
    },
  },
}

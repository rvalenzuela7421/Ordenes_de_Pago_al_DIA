import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient, supabase } from '@/lib/supabase'
import { OrdenPago } from '@/lib/database.types'
import { evaluateAutoApprovalRules } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return await handleGetOrdenes(req, res)
    case 'POST':
      return await handleCreateOrden(req, res)
    case 'PUT':
      return await handleUpdateOrden(req, res)
    case 'DELETE':
      return await handleDeleteOrden(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
      res.status(405).json({ error: 'Method not allowed' })
  }
}

// Obtener órdenes de pago
async function handleGetOrdenes(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const supabaseAdmin = createAdminClient()
    
    // Obtener órdenes según el rol del usuario
    const userRole = user.user_metadata?.role
    let query = supabaseAdmin
      .from('ordenes_pago')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    // Filtrar por usuario si no es admin o operador COP
    if (userRole === 'OperacionTRIB') {
      query = query.eq('user_id', user.id)
    }

    const { data: ordenes, error } = await query

    if (error) {
      console.error('Error obteniendo órdenes:', error)
      return res.status(500).json({ error: 'Error obteniendo órdenes' })
    }

    return res.status(200).json({
      ordenes: ordenes || [],
      total: ordenes?.length || 0
    })

  } catch (error) {
    console.error('Error en handleGetOrdenes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear nueva orden de pago
async function handleCreateOrden(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const {
      numero_orden,
      proveedor,
      concepto,
      monto,
      metadata = {}
    } = req.body

    // Validaciones
    if (!numero_orden || !proveedor || !concepto || !monto) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: numero_orden, proveedor, concepto, monto' 
      })
    }

    if (monto <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' })
    }

    // Verificar que no existe una orden con el mismo número
    const supabaseAdmin = createAdminClient()
    
    const { data: existingOrden } = await supabaseAdmin
      .from('ordenes_pago')
      .select('numero_orden')
      .eq('numero_orden', numero_orden)
      .single()

    if (existingOrden) {
      return res.status(400).json({ error: 'Ya existe una orden con ese número' })
    }

    // Evaluar reglas automáticas
    const autoApproval = evaluateAutoApprovalRules(monto, proveedor)
    
    const nuevaOrden: Omit<OrdenPago, 'id'> = {
      numero_orden,
      proveedor: proveedor.toUpperCase(),
      concepto,
      monto,
      estado: autoApproval.shouldAutoApprove ? 'aprobada' : 'pendiente',
      fecha_creacion: new Date().toISOString(),
      fecha_aprobacion: autoApproval.shouldAutoApprove ? new Date().toISOString() : undefined,
      user_id: user.id,
      metadata: {
        ...metadata,
        auto_approval_reason: autoApproval.reason,
        created_by_role: user.user_metadata?.role
      }
    }

    const { data, error } = await supabaseAdmin
      .from('ordenes_pago')
      .insert(nuevaOrden)
      .select()
      .single()

    if (error) {
      console.error('Error creando orden:', error)
      return res.status(500).json({ error: 'Error creando orden de pago' })
    }

    // Log de auditoría
    console.log(`Orden creada: ${numero_orden} por ${user.email} - Estado: ${data.estado}`)
    
    if (autoApproval.shouldAutoApprove) {
      console.log(`Orden ${numero_orden} aprobada automáticamente: ${autoApproval.reason}`)
    }

    return res.status(201).json({
      orden: data,
      auto_approved: autoApproval.shouldAutoApprove,
      approval_reason: autoApproval.reason
    })

  } catch (error) {
    console.error('Error en handleCreateOrden:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Actualizar orden de pago
async function handleUpdateOrden(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { id, estado, metadata } = req.body
    
    if (!id) {
      return res.status(400).json({ error: 'ID de orden es requerido' })
    }

    // Verificar permisos
    const userRole = user.user_metadata?.role
    const canApprove = ['AdminCOP', 'OperacionCOP'].includes(userRole)
    
    if (estado && !canApprove) {
      return res.status(403).json({ error: 'No tienes permisos para cambiar el estado' })
    }

    const supabaseAdmin = createAdminClient()
    
    // Obtener orden actual
    const { data: currentOrden, error: fetchError } = await supabaseAdmin
      .from('ordenes_pago')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrden) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    // Preparar actualización
    const updates: Partial<OrdenPago> = {}
    
    if (estado && ['pendiente', 'aprobada', 'rechazada'].includes(estado)) {
      updates.estado = estado
      
      if (estado === 'aprobada') {
        updates.fecha_aprobacion = new Date().toISOString()
      }
      
      // Actualizar metadata con información de quien aprobó/rechazó
      updates.metadata = {
        ...currentOrden.metadata,
        ...metadata,
        [`${estado}_by`]: user.id,
        [`${estado}_by_email`]: user.email,
        [`${estado}_at`]: new Date().toISOString()
      }
    } else if (metadata) {
      updates.metadata = { ...currentOrden.metadata, ...metadata }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay cambios para aplicar' })
    }

    const { data, error } = await supabaseAdmin
      .from('ordenes_pago')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando orden:', error)
      return res.status(500).json({ error: 'Error actualizando orden' })
    }

    // Log de auditoría
    console.log(`Orden ${currentOrden.numero_orden} actualizada por ${user.email}:`, updates)

    return res.status(200).json({ orden: data })

  } catch (error) {
    console.error('Error en handleUpdateOrden:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Eliminar orden de pago
async function handleDeleteOrden(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { id } = req.body
    
    if (!id) {
      return res.status(400).json({ error: 'ID de orden es requerido' })
    }

    // Solo AdminCOP puede eliminar órdenes
    const userRole = user.user_metadata?.role
    if (userRole !== 'AdminCOP') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar órdenes' })
    }

    const supabaseAdmin = createAdminClient()
    
    // Verificar que la orden existe
    const { data: orden, error: fetchError } = await supabaseAdmin
      .from('ordenes_pago')
      .select('numero_orden')
      .eq('id', id)
      .single()

    if (fetchError || !orden) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    const { error } = await supabaseAdmin
      .from('ordenes_pago')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando orden:', error)
      return res.status(500).json({ error: 'Error eliminando orden' })
    }

    // Log de auditoría
    console.log(`Orden ${orden.numero_orden} eliminada por ${user.email}`)

    return res.status(200).json({ success: true, message: 'Orden eliminada exitosamente' })

  } catch (error) {
    console.error('Error en handleDeleteOrden:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

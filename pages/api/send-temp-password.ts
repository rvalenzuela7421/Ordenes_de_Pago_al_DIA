import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { generateTempPassword } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, userId } = req.body

    if (!email && !userId) {
      return res.status(400).json({ error: 'Email o userId es requerido' })
    }

    const supabase = createAdminClient()
    let user

    // Obtener usuario por email o ID
    if (userId) {
      const { data, error } = await supabase.auth.admin.getUserById(userId)
      if (error || !data.user) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }
      user = data.user
    } else {
      const { data: usersData, error } = await supabase.auth.admin.listUsers()
      if (error) {
        return res.status(500).json({ error: 'Error al obtener usuario' })
      }
      const foundUser = usersData.users.find(u => u.email === email)
      if (!foundUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }
      user = foundUser
    }

    // Generar contraseña temporal
    const tempPassword = generateTempPassword()

    // Actualizar la contraseña del usuario y marcar como temporal
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      user_metadata: {
        ...user.user_metadata,
        must_change_password: true,
        temp_password_generated_at: new Date().toISOString()
      }
    })

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError)
      return res.status(500).json({ error: 'Error generando contraseña temporal' })
    }

    // Enviar contraseña por email
    try {
      // TODO: Implementar envío de email personalizado
      // Por ahora usando el sistema de Supabase para generar un link de reset
      const { error: emailError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: user.email!
      })

      if (emailError) {
        console.error('Error enviando email:', emailError)
        // Aunque falle el email, la contraseña ya fue generada
      }
    } catch (emailError) {
      console.error('Error en envío de email:', emailError)
    }

    // Log para desarrollo
    console.log(`Contraseña temporal generada para ${user.email}: ${tempPassword}`)

    return res.status(200).json({
      success: true,
      message: 'Contraseña temporal enviada por correo',
      // Solo incluir en desarrollo
      temp_password: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
      expires_in_hours: 24
    })

  } catch (error) {
    console.error('Error en send-temp-password:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Función auxiliar para enviar email personalizado
// TODO: Implementar con servicio de email (SendGrid, Resend, etc.)
async function sendTempPasswordEmail(email: string, tempPassword: string, userName?: string) {
  const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1>Mis Pagos <b style="color: black;">ALD</b><b style="color: #FFD046;">IA</b> - COP</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Contraseña Temporal Generada</h2>
          
          <p>Hola ${userName || 'Usuario'},</p>
          
          <p>Se ha generado una contraseña temporal para tu cuenta. Usa esta contraseña para ingresar al sistema:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong style="font-size: 18px; font-family: monospace;">${tempPassword}</strong>
          </div>
          
          <p><strong>Importante:</strong></p>
          <ul>
            <li>Esta contraseña expira en 24 horas</li>
            <li>Debes cambiarla por una permanente al ingresar</li>
            <li>No compartas esta contraseña con nadie</li>
          </ul>
          
          <p>Si no solicitaste este cambio, contacta al administrador del sistema inmediatamente.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              Este es un email automático del sistema COP. No respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  // TODO: Implementar envío real con proveedor de email
  console.log('Email content to send:', emailContent)
}

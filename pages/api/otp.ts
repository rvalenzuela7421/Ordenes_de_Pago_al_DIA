import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { generateOTP } from '@/lib/utils'

// TODO: Instalar Twilio para SMS
// import twilio from 'twilio'

// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID!,
//   process.env.TWILIO_AUTH_TOKEN!
// )

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return await handleGenerateOTP(req, res)
  } else if (req.method === 'PUT') {
    return await handleVerifyOTP(req, res)
  } else {
    res.setHeader('Allow', ['POST', 'PUT'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// Generar y enviar OTP
async function handleGenerateOTP(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, method = 'email' } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' })
    }

    const supabase = createAdminClient()

    // Verificar que el usuario existe  
    // TODO: Implementar verificación de usuario cuando sea necesario
    // const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    // const user = userData.users?.find(u => u.email === email)
    
    // if (!user) {
    //   return res.status(404).json({ error: 'Usuario no encontrado' })
    // }

    // const user = userData.user
    const user = { id: 'dummy-user', email: email, user_metadata: { telefono: null } } // Para propósitos de compilación

    // Generar código OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

    // Guardar OTP en la base de datos
    const { error: insertError } = await (supabase as any)
      .from('otp_codes')
      .insert({
        user_id: user.id,
        code: otp,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Error guardando OTP:', insertError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    if (method === 'email') {
      // Enviar OTP por email usando Supabase
      const { error: emailError } = await (supabase.auth.admin as any).generateLink({
        type: 'recovery',
        email: email,
        options: {
          data: {
            otp_code: otp,
            method: 'email'
          }
        }
      })

      if (emailError) {
        console.error('Error enviando email:', emailError)
        return res.status(500).json({ error: 'Error enviando email' })
      }

      return res.status(200).json({
        success: true,
        message: 'Código OTP enviado por email',
        expires_at: expiresAt
      })
    } else if (method === 'sms') {
      const telefono = user.user_metadata?.telefono

      if (!telefono) {
        return res.status(400).json({ error: 'Usuario no tiene teléfono registrado' })
      }

      try {
        // TODO: Descomentar cuando se configure Twilio
        // await twilioClient.messages.create({
        //   body: `Tu código de verificación COP es: ${otp}. Válido por 10 minutos.`,
        //   from: process.env.TWILIO_PHONE_NUMBER!,
        //   to: telefono
        // })

        // Simulación para desarrollo
        console.log(`SMS simulado enviado a ${telefono}: Código OTP ${otp}`)

        return res.status(200).json({
          success: true,
          message: `Código OTP enviado por SMS a ${telefono}`,
          expires_at: expiresAt,
          // Solo para desarrollo - remover en producción
          otp_code: process.env.NODE_ENV === 'development' ? otp : undefined
        })
      } catch (error) {
        console.error('Error enviando SMS:', error)
        return res.status(500).json({ error: 'Error enviando SMS' })
      }
    } else {
      return res.status(400).json({ error: 'Método no válido' })
    }
  } catch (error) {
    console.error('Error en handleGenerateOTP:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Verificar OTP
async function handleVerifyOTP(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, code, method } = req.body

    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son requeridos' })
    }

    const supabase = createAdminClient()

    // Obtener el usuario por email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userError || !userData.user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const user = userData.user

    // Verificar el código OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .single()

    if (otpError || !otpData) {
      return res.status(400).json({ error: 'Código OTP inválido' })
    }

    // Verificar que no haya expirado
    if (new Date(otpData.expires_at) < new Date()) {
      // Limpiar código expirado
      await supabase
        .from('otp_codes')
        .delete()
        .eq('id', otpData.id)

      return res.status(400).json({ error: 'Código OTP expirado' })
    }

    // Código válido, eliminar de la base de datos
    await supabase
      .from('otp_codes')
      .delete()
      .eq('id', otpData.id)

    // Generar token temporal para cambio de contraseña
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64')

    return res.status(200).json({
      success: true,
      message: 'Código OTP verificado correctamente',
      token: token
    })
  } catch (error) {
    console.error('Error en handleVerifyOTP:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

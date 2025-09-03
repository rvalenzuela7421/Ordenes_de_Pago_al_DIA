import { NextApiRequest, NextApiResponse } from 'next'

// TODO: Descomentar cuando se configure Twilio
// import twilio from 'twilio'

// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID!,
//   process.env.TWILIO_AUTH_TOKEN!
// )

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, message, type = 'otp' } = req.body

    if (!to || !message) {
      return res.status(400).json({ 
        error: 'Número de teléfono y mensaje son requeridos' 
      })
    }

    // Validar formato de teléfono colombiano
    const phoneRegex = /^(\+57|57)?[0-9]{10}$/
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido. Use formato colombiano: +573001234567' 
      })
    }

    // Formatear número de teléfono
    let formattedPhone = to.replace(/\s/g, '')
    if (!formattedPhone.startsWith('+57')) {
      if (formattedPhone.startsWith('57')) {
        formattedPhone = '+' + formattedPhone
      } else {
        formattedPhone = '+57' + formattedPhone
      }
    }

    /* TODO: Descomentar cuando se configure Twilio
    
    try {
      const messageResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: formattedPhone
      })

      console.log(`SMS enviado exitosamente. SID: ${messageResponse.sid}`)
      
      return res.status(200).json({
        success: true,
        message: 'SMS enviado exitosamente',
        sid: messageResponse.sid,
        to: formattedPhone
      })
    } catch (twilioError) {
      console.error('Error de Twilio:', twilioError)
      
      return res.status(500).json({
        error: 'Error enviando SMS',
        details: twilioError.message
      })
    }
    
    */

    // Simulación para desarrollo (remover en producción)
    console.log(`[SIMULACIÓN SMS] Enviado a: ${formattedPhone}`)
    console.log(`[SIMULACIÓN SMS] Mensaje: ${message}`)
    console.log(`[SIMULACIÓN SMS] Tipo: ${type}`)

    return res.status(200).json({
      success: true,
      message: 'SMS simulado enviado exitosamente (modo desarrollo)',
      to: formattedPhone,
      simulated: true
    })

  } catch (error) {
    console.error('Error en API de Twilio:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Funciones auxiliares para diferentes tipos de SMS

export function createOTPMessage(otp: string, appName: string = 'COP'): string {
  return `Tu código de verificación ${appName} es: ${otp}. Válido por 10 minutos. No compartas este código.`
}

export function createTempPasswordMessage(tempPassword: string, appName: string = 'COP'): string {
  return `Tu contraseña temporal ${appName} es: ${tempPassword}. Debes cambiarla al ingresar. Válida por 24 horas.`
}

export function createApprovalNotification(ordenNumero: string, monto: number): string {
  return `Orden de pago ${ordenNumero} por $${monto.toLocaleString('es-CO')} ha sido aprobada. Sistema COP.`
}

export function createRejectionNotification(ordenNumero: string): string {
  return `Orden de pago ${ordenNumero} ha sido rechazada. Revisa el sistema COP para más detalles.`
}

/* 
CONFIGURACIÓN REQUERIDA PARA TWILIO:

1. Variables de entorno (.env.local):
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

2. Instalar dependencia:
   npm install twilio

3. Configurar webhook para respuestas (opcional):
   POST /api/twilio/webhook

4. Verificar número de teléfono en Twilio Console (modo sandbox)

5. Configurar límites de envío y políticas de spam

Ejemplo de uso:
const response = await fetch('/api/twilio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+573001234567',
    message: createOTPMessage('123456'),
    type: 'otp'
  })
})
*/

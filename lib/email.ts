import nodemailer from 'nodemailer'
import { isDemoMode } from './utils'

// Configuración del servicio de email
const emailConfig = {
  from: 'centrodepagosbolivar@segurosbolivar.com',
  fromName: 'Centro de Pagos Bolívar'
}

// Crear transporter de Nodemailer
function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Template HTML para el email de notificación
function getEmailTemplate(
  nombreUsuario: string,
  numeroSolicitud: string,
  companiaReceptora: string,
  proveedor: string,
  concepto: string,
  montoSolicitud: number,
  totalSolicitud: number,
  fechaSolicitud: string
): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Solicitud de Orden de Pago</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e74c3c;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 10px;
        }
        .title {
            color: #2c3e50;
            font-size: 20px;
            margin-bottom: 10px;
        }
        .solicitud-info {
            background-color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #bdc3c7;
        }
        .info-row:last-child {
            border-bottom: none;
            font-weight: bold;
            background-color: #d5dbdb;
            padding: 12px;
            border-radius: 5px;
        }
        .label {
            font-weight: bold;
            color: #34495e;
        }
        .value {
            color: #2c3e50;
        }
        .success-badge {
            background-color: #27ae60;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #bdc3c7;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
        }
        .note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏢 Grupo Bolívar</div>
            <div class="title">Centro de Pagos</div>
        </div>
        
        <h2 style="color: #27ae60; text-align: center;">
            ✅ Solicitud Creada Exitosamente
        </h2>
        
        <p>Hola <strong>${nombreUsuario}</strong>,</p>
        
        <p>Te confirmamos que tu solicitud de orden de pago ha sido creada exitosamente en el sistema.</p>
        
        <div class="success-badge">
            📋 Solicitud #${numeroSolicitud}
        </div>
        
        <div class="solicitud-info">
            <h3 style="margin-top: 0; color: #2c3e50;">📋 Detalles de la Solicitud</h3>
            
            <div class="info-row">
                <span class="label">📅 Fecha de Solicitud:</span>
                <span class="value">${fechaSolicitud}</span>
            </div>
            
            <div class="info-row">
                <span class="label">🏢 Compañía Receptora:</span>
                <span class="value">${companiaReceptora}</span>
            </div>
            
            <div class="info-row">
                <span class="label">👤 Proveedor:</span>
                <span class="value">${proveedor}</span>
            </div>
            
            <div class="info-row">
                <span class="label">📝 Concepto:</span>
                <span class="value">${concepto}</span>
            </div>
            
            <div class="info-row">
                <span class="label">💰 Monto Solicitado:</span>
                <span class="value">$${montoSolicitud.toLocaleString('es-CO')}</span>
            </div>
            
            <div class="info-row">
                <span class="label">💵 Total Solicitud:</span>
                <span class="value">$${totalSolicitud.toLocaleString('es-CO')}</span>
            </div>
        </div>
        
        <div class="note">
            <strong>📌 Próximos pasos:</strong><br>
            • Tu solicitud será revisada por el equipo de operaciones<br>
            • Recibirás notificaciones sobre cualquier cambio de estado<br>
            • Puedes consultar el estado en el sistema en cualquier momento
        </div>
        
        <p>Si tienes alguna pregunta o necesitas realizar algún cambio, no dudes en contactar al equipo de Centro de Pagos.</p>
        
        <div class="footer">
            <p>
                <strong>Centro de Pagos Bolívar</strong><br>
                ${emailConfig.from}<br>
                Este es un mensaje automático, por favor no responder a este correo.
            </p>
        </div>
    </div>
</body>
</html>
  `
}

// Función principal para enviar notificación de nueva solicitud
export async function enviarNotificacionNuevaSolicitud(
  emailUsuario: string,
  nombreUsuario: string,
  datosSolicitud: {
    numeroSolicitud: string
    companiaReceptora: string
    proveedor: string
    concepto: string
    montoSolicitud: number
    totalSolicitud: number
    fechaSolicitud: string
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  
  // En modo demo, simular envío
  if (isDemoMode()) {
    console.log('🎭 MODO DEMO: Simulando envío de email...')
    console.log('📧 Para:', emailUsuario)
    console.log('📋 Solicitud:', datosSolicitud.numeroSolicitud)
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      success: true,
      messageId: `demo-${Date.now()}`,
    }
  }

  try {
    // Verificar configuración de email
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('⚠️ Configuración de email incompleta')
      return {
        success: false,
        error: 'Configuración de email no disponible'
      }
    }

    // Crear transporter
    const transporter = createTransporter()

    // Generar el HTML del email
    const htmlContent = getEmailTemplate(
      nombreUsuario,
      datosSolicitud.numeroSolicitud,
      datosSolicitud.companiaReceptora,
      datosSolicitud.proveedor,
      datosSolicitud.concepto,
      datosSolicitud.montoSolicitud,
      datosSolicitud.totalSolicitud,
      datosSolicitud.fechaSolicitud
    )

    // Configurar el email
    const mailOptions = {
      from: `${emailConfig.fromName} <${emailConfig.from}>`,
      to: emailUsuario,
      subject: `✅ Solicitud ${datosSolicitud.numeroSolicitud} creada exitosamente`,
      html: htmlContent,
      text: `Hola ${nombreUsuario},

Tu solicitud de orden de pago #${datosSolicitud.numeroSolicitud} ha sido creada exitosamente.

Detalles:
- Fecha: ${datosSolicitud.fechaSolicitud}
- Compañía Receptora: ${datosSolicitud.companiaReceptora}
- Proveedor: ${datosSolicitud.proveedor}
- Concepto: ${datosSolicitud.concepto}
- Monto Solicitado: $${datosSolicitud.montoSolicitud.toLocaleString('es-CO')}
- Total Solicitud: $${datosSolicitud.totalSolicitud.toLocaleString('es-CO')}

Centro de Pagos Bolívar
${emailConfig.from}`
    }

    // Enviar el email
    const result = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email enviado exitosamente:', {
      messageId: result.messageId,
      to: emailUsuario,
      solicitud: datosSolicitud.numeroSolicitud
    })

    return {
      success: true,
      messageId: result.messageId
    }

  } catch (error) {
    console.error('❌ Error al enviar email:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Función para verificar configuración de email
export function verificarConfiguracionEmail(): boolean {
  if (isDemoMode()) {
    return true // En demo mode siempre está "configurado"
  }

  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}


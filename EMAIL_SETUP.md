# 📧 CONFIGURACIÓN DE NOTIFICACIONES POR EMAIL

## 🎯 Variables de Entorno Requeridas

Para habilitar las notificaciones por email cuando se crean nuevas solicitudes, agrega estas variables a tu archivo `.env.local`:

```bash
# ============================================================================
# CONFIGURACIÓN DE EMAIL SMTP
# Para el envío de notificaciones por email
# ============================================================================

# Host del servidor SMTP
SMTP_HOST=smtp.gmail.com

# Puerto del servidor SMTP (587 para TLS, 465 para SSL)
SMTP_PORT=587

# Usar conexión segura (true para SSL en puerto 465, false para TLS en puerto 587)  
SMTP_SECURE=false

# Usuario para autenticación SMTP (email del remitente)
SMTP_USER=centrodepagosbolivar@segurosbolivar.com

# Contraseña para autenticación SMTP (password de aplicación si es Gmail)
SMTP_PASS=your_smtp_password
```

## 🔧 Configuración para Gmail

Si usas Gmail como servidor SMTP:

1. **Habilitar verificación en 2 pasos** en tu cuenta de Gmail
2. **Generar contraseña de aplicación**:
   - Ve a Configuración > Seguridad > Verificación en 2 pasos
   - Selecciona "Contraseñas de aplicaciones"
   - Genera una contraseña específica para esta aplicación
   - Usa esta contraseña en `SMTP_PASS`

3. **Configuración recomendada**:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_password_de_aplicacion
   ```

## 🏢 Configuración para Servidor Corporativo

Para usar el servidor SMTP de Seguros Bolívar:

```bash
# Ajusta estos valores según tu configuración corporativa
SMTP_HOST=mail.segurosbolivar.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=centrodepagosbolivar@segurosbolivar.com
SMTP_PASS=password_corporativo
```

## ✅ Funcionamiento

Una vez configurado:

1. **Email de Origen**: `centrodepagosbolivar@segurosbolivar.com`
2. **Email de Destino**: Email del usuario que crea la solicitud (desde su perfil)
3. **Contenido**: 
   - Confirmación de creación de solicitud
   - Número de solicitud
   - Detalles completos (proveedor, concepto, montos, etc.)
   - Información sobre próximos pasos

## 🎭 Modo Demo

En modo demo (sin configuración SMTP):
- Se simula el envío del email
- Se muestran logs en consola
- No se envían emails reales
- La funcionalidad continúa normalmente

## 🐛 Troubleshooting

### Error: "Configuración de email no disponible"
- Verifica que `SMTP_USER` y `SMTP_PASS` estén configurados
- Reinicia el servidor Next.js después de agregar variables

### Error: "Authentication failed"
- Para Gmail: usa contraseña de aplicación, no tu contraseña normal
- Para servidores corporativos: verifica credenciales

### Error: "Connection timeout"
- Verifica `SMTP_HOST` y `SMTP_PORT`
- Revisa configuración de firewall/proxy corporativo

## 📋 Template del Email

El email incluye:
- 🏢 Header con logo del Grupo Bolívar
- ✅ Confirmación visual de creación exitosa
- 📋 Detalles completos de la solicitud
- 📌 Información sobre próximos pasos
- 📧 Footer con información de contacto

## 🔒 Seguridad

- Las credenciales SMTP están protegidas en variables de entorno
- Solo se envían emails a usuarios autenticados en el sistema
- El sistema valida la configuración antes de intentar envíos


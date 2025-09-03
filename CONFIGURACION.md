# 🛠️ Guía de Configuración - COP

## 📋 Configuración de Supabase

### 1. Crear Proyecto
1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva organización y proyecto
3. Espera a que termine la configuración inicial

### 2. Obtener Credenciales
Ve a Settings → API y copia:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Mantener secreta)

### 3. Ejecutar SQL en Supabase

Ve a SQL Editor y ejecuta:

```sql
-- 1. Crear tabla para códigos OTP
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 2. Crear tabla para órdenes de pago
CREATE TABLE ordenes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden TEXT UNIQUE NOT NULL,
  proveedor TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  estado TEXT CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')) DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB
);

-- 3. Crear índices
CREATE INDEX idx_ordenes_pago_estado ON ordenes_pago(estado);
CREATE INDEX idx_ordenes_pago_fecha ON ordenes_pago(fecha_creacion);
CREATE INDEX idx_ordenes_pago_usuario ON ordenes_pago(user_id);
CREATE INDEX idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE ordenes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de seguridad para ordenes_pago
CREATE POLICY "Users can view their own orders or all if admin/operator"
ON ordenes_pago FOR SELECT
USING (
  user_id = auth.uid() OR
  (auth.jwt() ->> 'user_metadata' ->> 'role') IN ('AdminCOP', 'OperacionCOP', 'ConsultaCOP')
);

CREATE POLICY "Users can create orders"
ON ordenes_pago FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admin/operators can update orders"
ON ordenes_pago FOR UPDATE
USING ((auth.jwt() ->> 'user_metadata' ->> 'role') IN ('AdminCOP', 'OperacionCOP'));

CREATE POLICY "Only AdminCOP can delete orders"
ON ordenes_pago FOR DELETE
USING ((auth.jwt() ->> 'user_metadata' ->> 'role') = 'AdminCOP');

-- 6. Crear políticas para otp_codes
CREATE POLICY "Users can manage their own OTP codes"
ON otp_codes FOR ALL
USING (user_id = auth.uid());
```

### 4. Configurar OAuth con Google

1. **En Google Cloud Console:**
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita Google+ API
   - Ve a Credentials → Create Credentials → OAuth 2.0 Client ID
   - Configura Authorized redirect URIs:
     - `https://tu-proyecto.supabase.co/auth/v1/callback`
   - Copia Client ID y Client Secret

2. **En Supabase:**
   - Ve a Authentication → Providers
   - Habilita Google
   - Pega Client ID y Client Secret
   - Guarda los cambios

### 5. Configurar Email Templates (Opcional)
Ve a Authentication → Email Templates y personaliza:
- Confirm signup
- Reset password
- Magic Link

---

## 📱 Configuración de Twilio (SMS)

### 1. Crear Cuenta Twilio
1. Ve a [twilio.com](https://twilio.com)
2. Crea una cuenta gratuita (incluye créditos de prueba)
3. Verifica tu teléfono personal

### 2. Obtener Credenciales
En Twilio Console:
- **Account SID** → `TWILIO_ACCOUNT_SID`
- **Auth Token** → `TWILIO_AUTH_TOKEN`
- **Phone Number** → `TWILIO_PHONE_NUMBER` (formato: +1234567890)

### 3. Configurar Número de Teléfono
1. Ve a Phone Numbers → Manage → Buy a number
2. Selecciona un número con capacidades SMS
3. Configura el webhook (opcional): `https://tu-dominio.com/api/twilio/webhook`

### 4. Habilitar en el Código
Descomenta las líneas de Twilio en:
- `/pages/api/otp.ts`
- `/pages/api/twilio.ts`

---

## 🔧 Variables de Entorno

Crea `.env.local` en la raíz del proyecto:

```env
# 🔐 Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 📱 Twilio (OPCIONAL)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# 🌐 Entorno
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

⚠️ **IMPORTANTE**: 
- Nunca commits archivos `.env*` al repositorio
- Usa `.env.local` para desarrollo local
- Configura las variables en tu plataforma de deployment

---

## 🚀 Comandos de Instalación Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# 3. Ejecutar en modo desarrollo
npm run dev

# 4. Abrir en navegador
open http://localhost:3000
```

---

## 👤 Crear Usuario de Prueba

### Opción 1: Desde la Aplicación
1. Ve a `/auth/register`
2. Llena el formulario
3. Verifica el email en tu bandeja de entrada
4. Cambia el rol en Supabase Dashboard → Authentication → Users

### Opción 2: Desde Supabase Dashboard
1. Ve a Authentication → Users
2. Click en "Add user"
3. Llena email, password
4. En Raw user meta data:
```json
{
  "role": "AdminCOP",
  "nombre_completo": "Admin Principal",
  "telefono": "+573001234567"
}
```

---

## ✅ Verificar Instalación

### Checklist de Funcionalidad:
- [ ] La aplicación abre en http://localhost:3000
- [ ] Puedes registrar un nuevo usuario
- [ ] El login con email/password funciona
- [ ] El dashboard se carga correctamente
- [ ] Puedes crear una nueva orden de pago
- [ ] Las reglas automáticas se aplican correctamente
- [ ] El cambio de contraseña funciona
- [ ] OAuth con Google funciona (si configurado)
- [ ] SMS funciona (si Twilio configurado)

### Solución de Problemas Comunes:

**Error: "supabase url is required"**
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` esté en `.env.local`

**Error de base de datos**  
- Ejecuta los scripts SQL en Supabase SQL Editor
- Verifica que las tablas se crearon correctamente

**Error OAuth Google**
- Verifica que el redirect URI esté correctamente configurado
- Revisa que el dominio esté autorizado

**Error SMS**
- Verifica credenciales de Twilio
- Asegúrate de tener créditos en tu cuenta
- Confirma que el número de teléfono esté verificado

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs de consola del navegador
2. Verifica los logs de Supabase Dashboard
3. Consulta la documentación de Supabase/Twilio
4. Abre un issue en el repositorio

**¡Listo! Tu sistema COP está configurado y funcionando 🎉**

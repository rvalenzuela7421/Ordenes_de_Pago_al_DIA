# 🚀 Guía: Configurar Supabase Real para Sistema COP

## 📋 **Paso a Paso para Base de Datos Real**

### **🔧 Paso 1: Crear Cuenta en Supabase**
1. Ve a: **https://supabase.com**
2. Crea una cuenta **gratuita**
3. Confirma tu email

### **📊 Paso 2: Crear Proyecto**
1. Click en **"New Project"**
2. **Nombre**: `cop-ordenes-pago`
3. **Contraseña de BD**: (Guarda esta contraseña, la necesitarás)
4. **Región**: Elige la más cercana (ej: South America)
5. Click **"Create new project"**
6. **Espera 2-3 minutos** mientras se crea

---

## 🗄️ **Paso 3: Crear Tablas Necesarias**

### **En el Dashboard de Supabase:**
1. Ve a **"Table Editor"** (menú izquierdo)
2. Click **"Create a new table"**

### **📝 Tabla 1: `user_profiles`**
```sql
-- Ejecutar en SQL Editor
CREATE TABLE user_profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  nombre_completo text,
  telefono text,
  role text CHECK (role IN ('AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionBSEG')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Habilitar Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
```

### **📝 Tabla 2: `ordenes_pago`**
```sql
-- Tabla para órdenes de pago
CREATE TABLE ordenes_pago (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_orden text UNIQUE NOT NULL,
  proveedor text NOT NULL,
  concepto text NOT NULL,
  valor numeric(15,2) NOT NULL,
  estado text CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')) DEFAULT 'pendiente',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE ordenes_pago ENABLE ROW LEVEL SECURITY;

-- Políticas según roles
CREATE POLICY "All users can view orders" 
ON ordenes_pago FOR SELECT 
USING (true);

CREATE POLICY "OperacionCOP can create orders" 
ON ordenes_pago FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('OperacionCOP', 'AdminCOP')
  )
);
```

### **📝 Tabla 3: `otp_codes`** (para recuperación de contraseña)
```sql
CREATE TABLE otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

-- RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own OTP" 
ON otp_codes FOR ALL 
USING (auth.uid() = user_id);
```

---

## 🔑 **Paso 4: Configurar Autenticación**

### **En Supabase Dashboard:**
1. Ve a **"Authentication"** → **"Settings"**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: 
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/dashboard`

### **🔧 Para Google OAuth (Opcional):**
1. Ve a **"Authentication"** → **"Providers"**
2. Habilita **"Google"**
3. Necesitarás crear credenciales en **Google Cloud Console**

---

## 🔐 **Paso 5: Obtener Credenciales**

### **En Supabase Dashboard:**
1. Ve a **"Settings"** → **"API"**
2. Copia:
   - **Project URL**: `https://tuproyecto.supabase.co`
   - **Project API Key (anon, public)**: `eyJ0eXAiOiJKV1Q...`

---

## ⚙️ **Paso 6: Actualizar Variables de Entorno**

### **Actualizar `.env.local`:**
```env
# Reemplazar con tus credenciales REALES
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Para producción también agregar:
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

---

## 🧪 **Paso 7: Probar el Registro Real**

### **Una vez configurado:**
1. **Reinicia el servidor**: `npm run dev`
2. Ve a: `http://localhost:3000/auth/register`
3. **Completa el formulario** correctamente
4. **Presiona "Registrarse"**
5. **Ahora SÍ se creará** el usuario en Supabase real

### **📧 Verificación por Email:**
- Supabase enviará **email de confirmación**
- El usuario debe **confirmar** su email
- Solo después podrá **iniciar sesión**

---

## ✅ **Diferencias: Demo vs Real**

### **🎭 Modo Demo (Actual):**
- ❌ No se crea usuario real
- ✅ Mensaje: "¡Registro simulado exitoso!"
- ❌ No hay persistencia

### **🚀 Modo Real (Después de configurar):**
- ✅ Usuario se crea en Supabase
- ✅ Mensaje: "¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta."
- ✅ Email de confirmación enviado
- ✅ Persistencia en base de datos
- ✅ Login real funcionando

---

## 🚨 **Importante:**

### **📝 Antes de cambiar a modo real:**
1. **Guarda todas las credenciales** en lugar seguro
2. **Confirma que las tablas** estén creadas correctamente
3. **Prueba la conexión** primero
4. **Ten backup** del `.env.local` actual

### **🔒 Seguridad:**
- **NUNCA** subas `.env.local` a GitHub
- **Usa** diferentes credenciales para desarrollo y producción
- **Habilita** Row Level Security (RLS) en todas las tablas

---

## 📞 **¿Necesitas Ayuda?**

Si tienes problemas en cualquier paso:
1. **Comparte** pantallazos del error
2. **Verifica** las credenciales copiadas
3. **Revisa** que las tablas estén creadas
4. **Confirma** que el servidor esté reiniciado

---

**🎯 Una vez completados estos pasos, el registro será 100% real y funcional.**

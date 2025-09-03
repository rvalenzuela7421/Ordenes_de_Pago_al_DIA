-- 🗄️ CONFIGURACIÓN SUPABASE REAL - Sistema COP
-- Ejecutar estos comandos en el SQL Editor de Supabase

-- ============================================
-- 1. TABLA DE PERFILES DE USUARIO
-- ============================================
CREATE TABLE user_profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  nombre_completo text NOT NULL,
  telefono text,
  role text CHECK (role IN ('AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionTRIB')) DEFAULT 'ConsultaCOP',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Habilitar Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. TABLA DE ÓRDENES DE PAGO
-- ============================================
CREATE TABLE ordenes_pago (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_orden text UNIQUE NOT NULL,
  proveedor text NOT NULL,
  concepto text NOT NULL,
  valor numeric(15,2) NOT NULL,
  estado text CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')) DEFAULT 'pendiente',
  fecha_creacion date DEFAULT CURRENT_DATE,
  observaciones text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE ordenes_pago ENABLE ROW LEVEL SECURITY;

-- Políticas según roles
CREATE POLICY "All authenticated users can view orders" 
ON ordenes_pago FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "OperacionCOP and AdminCOP can create orders" 
ON ordenes_pago FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('OperacionCOP', 'AdminCOP')
  )
);

CREATE POLICY "AdminCOP can update any order" 
ON ordenes_pago FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'AdminCOP'
  )
);

-- ============================================
-- 3. TABLA DE CÓDIGOS OTP
-- ============================================
CREATE TABLE otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  tipo text CHECK (tipo IN ('email', 'sms')) DEFAULT 'email',
  usado boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

-- RLS para OTP
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own OTP codes" 
ON otp_codes FOR ALL 
USING (auth.uid() = user_id);

-- ============================================
-- 4. FUNCIÓN PARA AUTO-CREAR PERFIL
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nombre_completo, telefono, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', ''),
    COALESCE(new.raw_user_meta_data->>'telefono', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'ConsultaCOP')
  );
  RETURN new;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 5. FUNCIÓN PARA GENERAR NÚMERO DE ORDEN
-- ============================================
CREATE OR REPLACE FUNCTION generate_orden_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_number integer;
    orden_number text;
BEGIN
    -- Obtener el próximo número secuencial
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_orden FROM 4) AS integer)), 0) + 1
    INTO next_number
    FROM ordenes_pago
    WHERE numero_orden LIKE 'COP%';
    
    -- Formatear como COP001, COP002, etc.
    orden_number := 'COP' || LPAD(next_number::text, 3, '0');
    
    RETURN orden_number;
END;
$$;

-- ============================================
-- 6. DATOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Insertar algunos datos de prueba para verificar
-- (Ejecutar SOLO después de tener usuarios registrados)

/*
INSERT INTO ordenes_pago (numero_orden, proveedor, concepto, valor)
VALUES 
  ('COP001', 'Proveedor Demo 1', 'Servicios de prueba', 500000.00),
  ('COP002', 'Proveedor Demo 2', 'Material de oficina', 250000.00);
*/

-- ============================================
-- ✅ VERIFICACIÓN
-- ============================================
-- Para verificar que todo esté creado correctamente:

SELECT 'user_profiles' as tabla, count(*) as registros FROM user_profiles
UNION ALL
SELECT 'ordenes_pago' as tabla, count(*) as registros FROM ordenes_pago
UNION ALL
SELECT 'otp_codes' as tabla, count(*) as registros FROM otp_codes;

-- ============================================
-- 📝 NOTAS IMPORTANTES:
-- ============================================
-- 1. Ejecutar estos comandos EN ORDEN en el SQL Editor de Supabase
-- 2. Verificar que no haya errores en cada paso
-- 3. Las políticas RLS protegen los datos según roles
-- 4. La función handle_new_user() creará automáticamente el perfil
-- 5. Los números de orden se generan automáticamente

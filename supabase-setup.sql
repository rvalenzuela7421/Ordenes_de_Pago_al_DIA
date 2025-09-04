-- ====================================================================
-- SCRIPT DE CONFIGURACIÓN SUPABASE - SISTEMA COP
-- ====================================================================

-- 1. EXTENSIONES NECESARIAS
-- ====================================================================
-- Habilitar RLS (Row Level Security) y otras extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: profiles (extender usuarios de auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT,
    telefono TEXT,
    role TEXT NOT NULL DEFAULT 'ConsultaCOP' CHECK (role IN ('AdminCOP', 'OperacionCOP', 'ConsultaCOP', 'OperacionTRIB')),
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. TABLA: ordenes_pago
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.ordenes_pago (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_orden TEXT UNIQUE NOT NULL,
    proveedor_nombre TEXT NOT NULL,
    proveedor_nit TEXT NOT NULL,
    concepto TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL CHECK (valor > 0),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'pagada')),
    observaciones TEXT,
    
    -- Auditoría
    creado_por UUID REFERENCES public.profiles(id),
    aprobado_por UUID REFERENCES public.profiles(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    fecha_pago TIMESTAMP WITH TIME ZONE,
    
    -- Campos adicionales para el flujo COP
    area_solicitante TEXT DEFAULT 'TRIBUTARIO',
    centro_costos TEXT,
    cuenta_contable TEXT,
    forma_pago TEXT DEFAULT 'TRANSFERENCIA' CHECK (forma_pago IN ('TRANSFERENCIA', 'CHEQUE', 'EFECTIVO')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_ordenes_pago_updated_at 
    BEFORE UPDATE ON ordenes_pago 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. TABLA: otp_codes (para recuperación de contraseñas)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'password_reset' CHECK (tipo IN ('password_reset', 'phone_verification')),
    enviado_por TEXT NOT NULL DEFAULT 'email' CHECK (enviado_por IN ('email', 'sms')),
    usado BOOLEAN DEFAULT FALSE,
    intentos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 5. TABLA: audit_logs (historial de acciones)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    accion TEXT NOT NULL,
    tabla_afectada TEXT,
    registro_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FUNCIÓN: Crear perfil automáticamente cuando se registra un usuario
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre_completo, telefono, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
        NEW.raw_user_meta_data->>'telefono',
        COALESCE(NEW.raw_user_meta_data->>'role', 'ConsultaCOP')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. CONFIGURACIÓN RLS (Row Level Security)
-- ====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS para profiles
-- Los usuarios pueden ver y actualizar su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Solo AdminCOP puede ver todos los perfiles
CREATE POLICY "AdminCOP puede ver todos los perfiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'AdminCOP'
        )
    );

-- POLÍTICAS RLS para ordenes_pago
-- Todos los usuarios autenticados pueden ver órdenes (según su rol)
CREATE POLICY "Ver órdenes según rol" ON public.ordenes_pago
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND (
                p.role IN ('AdminCOP', 'OperacionCOP', 'ConsultaCOP') -- COP puede ver todas
                OR (p.role = 'OperacionTRIB' AND creado_por = auth.uid()) -- TRIB solo las suyas
            )
        )
    );

-- Solo ciertos roles pueden crear órdenes
CREATE POLICY "Crear órdenes según rol" ON public.ordenes_pago
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('AdminCOP', 'OperacionCOP', 'OperacionTRIB')
        )
    );

-- Solo AdminCOP y OperacionCOP pueden aprobar
CREATE POLICY "Aprobar órdenes" ON public.ordenes_pago
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('AdminCOP', 'OperacionCOP')
        )
    );

-- POLÍTICAS RLS para otp_codes
-- Solo el usuario propietario puede ver sus OTP
CREATE POLICY "Ver propios OTP" ON public.otp_codes
    FOR ALL USING (auth.uid() = user_id);

-- POLÍTICAS RLS para audit_logs
-- Solo AdminCOP puede ver logs de auditoría
CREATE POLICY "AdminCOP ve logs de auditoría" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'AdminCOP'
        )
    );

-- 8. INSERTAR DATOS DE PRUEBA
-- ====================================================================

-- Insertar algunas órdenes de prueba (se pueden eliminar después)
INSERT INTO public.ordenes_pago (
    numero_orden, proveedor_nombre, proveedor_nit, concepto, valor, estado, area_solicitante
) VALUES 
    ('COP-2024-001', 'Proveedor Demo S.A.S', '900123456-7', 'Servicios de consultoría', 2500000.00, 'pendiente', 'TRIBUTARIO'),
    ('COP-2024-002', 'Tecnología Avanzada Ltda', '800456789-3', 'Licencias de software', 1800000.00, 'aprobada', 'TRIBUTARIO'),
    ('COP-2024-003', 'Suministros Oficina', '700789123-1', 'Material de oficina', 450000.00, 'pagada', 'TRIBUTARIO')
ON CONFLICT (numero_orden) DO NOTHING;

-- ====================================================================
-- FIN DEL SCRIPT
-- ====================================================================

-- Verificar que todo se creó correctamente
SELECT 
    'profiles' as tabla, COUNT(*) as registros FROM public.profiles
UNION ALL
SELECT 
    'ordenes_pago' as tabla, COUNT(*) as registros FROM public.ordenes_pago
UNION ALL
SELECT 
    'otp_codes' as tabla, COUNT(*) as registros FROM public.otp_codes
UNION ALL
SELECT 
    'audit_logs' as tabla, COUNT(*) as registros FROM public.audit_logs;

-- Mostrar las políticas RLS creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

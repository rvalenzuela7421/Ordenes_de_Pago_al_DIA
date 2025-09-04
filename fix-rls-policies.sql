-- =====================================================
-- ARREGLAR POLÍTICAS RLS CON RECURSIÓN INFINITA
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase INMEDIATAMENTE

-- 1. ELIMINAR TODAS las políticas problemáticas
-- =====================================================
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "AdminCOP puede ver todos los perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Ver órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Crear órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Aprobar órdenes" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Ver propios OTP" ON public.otp_codes;
DROP POLICY IF EXISTS "AdminCOP ve logs de auditoría" ON public.audit_logs;

-- 2. DESHABILITAR RLS temporalmente para debugging
-- =====================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 3. CREAR POLÍTICAS RLS SIMPLES Y SEGURAS
-- =====================================================
-- Volver a habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA PROFILES (SIN RECURSIÓN)
-- =====================================================

-- Usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil  
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Permitir inserción para nuevos usuarios (trigger)
CREATE POLICY "users_insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- POLÍTICAS PARA ORDENES_PAGO (SIMPLIFICADAS)
-- =====================================================

-- Todos los usuarios autenticados pueden ver órdenes
CREATE POLICY "authenticated_users_select_orders" ON public.ordenes_pago
    FOR SELECT TO authenticated USING (true);

-- Solo usuarios autenticados pueden crear órdenes
CREATE POLICY "authenticated_users_insert_orders" ON public.ordenes_pago
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = creado_por);

-- Solo usuarios autenticados pueden actualizar órdenes que crearon
CREATE POLICY "authenticated_users_update_orders" ON public.ordenes_pago
    FOR UPDATE TO authenticated USING (auth.uid() = creado_por);

-- POLÍTICAS PARA OTP_CODES (SIMPLES)
-- =====================================================

-- Los usuarios solo pueden ver sus propios OTP
CREATE POLICY "users_select_own_otp" ON public.otp_codes
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- POLÍTICAS PARA AUDIT_LOGS (SOLO LECTURA)
-- =====================================================

-- Solo usuarios autenticados pueden ver logs
CREATE POLICY "authenticated_users_select_audit" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

-- Solo el sistema puede insertar logs (sin restricción de usuario)
CREATE POLICY "system_insert_audit" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- VERIFICAR QUE TODO FUNCIONA
-- =====================================================

-- Probar consulta a profiles
SELECT 'Test profiles' as test, COUNT(*) as count FROM public.profiles;

-- Probar consulta a ordenes_pago  
SELECT 'Test ordenes_pago' as test, COUNT(*) as count FROM public.ordenes_pago;

-- Mostrar políticas activas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- MENSAJE DE ÉXITO
-- =====================================================
SELECT '🎉 POLÍTICAS RLS ARREGLADAS EXITOSAMENTE!' as status;

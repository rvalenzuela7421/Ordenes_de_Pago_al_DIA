-- ============================================================================
-- DIAGNÓSTICO DEL PROBLEMA RLS EN ORDENES_PAGO
-- ============================================================================
-- Ejecutar este script en Supabase SQL Editor para diagnosticar el problema
-- ============================================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL DE LA TABLA
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SI RLS ESTÁ HABILITADO
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'ordenes_pago';

-- 3. VER POLÍTICAS RLS ACTUALES
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ordenes_pago';

-- 4. VERIFICAR USUARIO ACTUAL Y PERFILES
-- ============================================================================
SELECT 
    'Usuario actual:' as info,
    auth.uid() as user_id,
    auth.role() as role;

-- 5. VERIFICAR SI EXISTE PERFIL PARA EL USUARIO
-- ============================================================================
SELECT 
    'Perfil encontrado:' as info,
    id,
    nombre_completo,
    role
FROM public.profiles 
WHERE id = auth.uid();

-- 6. VERIFICAR PERMISOS PARA INSERCIÓN
-- ============================================================================
-- Intentar una inserción de prueba (no se ejecutará realmente)
EXPLAIN (COSTS OFF, VERBOSE ON)
INSERT INTO public.ordenes_pago (
    numero_solicitud,
    proveedor,
    concepto,
    monto_solicitud,
    iva,
    total_solicitud,
    estado,
    fecha_solicitud
) VALUES (
    'TEST-001',
    'Test Provider',
    'Test Concept',
    100000,
    19000,
    119000,
    'Solicitada',
    NOW()
);

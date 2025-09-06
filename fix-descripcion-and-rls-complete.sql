-- ============================================================================
-- SOLUCIÓN COMPLETA: CAMPO DESCRIPCIÓN + POLÍTICAS RLS
-- ============================================================================
-- Este script soluciona tanto el campo descripción faltante como los problemas RLS
-- Ejecutar COMPLETO en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR CAMPO DESCRIPCIÓN (si no existe)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 2. AGREGAR CAMPO CREADO_POR (para compatibilidad con políticas RLS)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id);

-- 3. ELIMINAR POLÍTICAS RLS PROBLEMÁTICAS
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_users_insert_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Crear órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_select_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Ver órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_update_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Aprobar órdenes" ON public.ordenes_pago;
DROP POLICY IF EXISTS "usuarios_autenticados_ver_ordenes" ON public.ordenes_pago;
DROP POLICY IF EXISTS "usuarios_autenticados_crear_solicitudes" ON public.ordenes_pago;
DROP POLICY IF EXISTS "usuarios_pueden_actualizar_ordenes" ON public.ordenes_pago;

-- 4. CREAR POLÍTICAS RLS SIMPLIFICADAS Y FUNCIONALES
-- ============================================================================

-- Permitir a todos los usuarios autenticados VER órdenes
CREATE POLICY "ver_todas_las_ordenes" ON public.ordenes_pago
    FOR SELECT TO authenticated USING (true);

-- Permitir a todos los usuarios autenticados CREAR solicitudes
CREATE POLICY "crear_nuevas_solicitudes" ON public.ordenes_pago
    FOR INSERT TO authenticated WITH CHECK (
        -- Verificar que el usuario esté autenticado
        auth.uid() IS NOT NULL
    );

-- Permitir ACTUALIZAR solo a los creadores o administradores
CREATE POLICY "actualizar_ordenes_propias" ON public.ordenes_pago
    FOR UPDATE TO authenticated USING (
        -- El creador puede actualizar (si existe el campo)
        (creado_por IS NULL OR creado_por = auth.uid()) 
        OR 
        -- O usuarios con roles específicos (si existe tabla profiles)
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('AdminCOP', 'OperacionCOP')
        )
    );

-- 5. VERIFICAR ESTRUCTURA ACTUAL
-- ============================================================================
SELECT 
    'Campos actuales de ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. VERIFICAR POLÍTICAS RLS
-- ============================================================================
SELECT 
    'Políticas RLS actuales:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'ordenes_pago';

-- 7. INSERTAR DATOS DE PRUEBA (OPCIONAL - PARA VERIFICAR QUE FUNCIONA)
-- ============================================================================
/*
-- Descomentar para probar que la inserción funciona:
INSERT INTO public.ordenes_pago (
    numero_solicitud,
    proveedor,
    concepto,
    descripcion,
    monto_solicitud,
    iva,
    total_solicitud,
    estado,
    fecha_solicitud,
    creado_por,
    created_at,
    updated_at
) VALUES (
    'TEST-2024-' || EXTRACT(epoch FROM NOW())::bigint,
    'Proveedor de Prueba',
    'Concepto de Prueba',
    'Esta es una descripción de prueba',
    100000,
    19000,
    119000,
    'Solicitada',
    NOW(),
    auth.uid(),
    NOW(),
    NOW()
);
*/

-- 8. MENSAJE FINAL
-- ============================================================================
SELECT 
    '✅ Script ejecutado correctamente' as resultado,
    'Campo descripcion agregado y políticas RLS corregidas' as detalle;
